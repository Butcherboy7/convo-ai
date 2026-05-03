"""
Language Tutor Agent — AI Voice Language Tutor
Pipeline: Silero VAD → Groq Whisper STT → Groq Llama LLM → Cartesia TTS
State lives here. Browser renders only. Token server signs only.
All agent↔browser communication goes through LiveKit data channel topic: tutor-events
"""
import os
import sys
import logging
import json
import time
import asyncio
from dotenv import load_dotenv
import sentry_sdk
from livekit import rtc
from livekit.agents import (
    AgentSession,
    Agent,
    JobContext,
    WorkerOptions,
    cli,
    WorkerType,
)
from livekit.plugins import silero, groq, cartesia
from livekit.agents.llm import ChatContext, ChatMessage

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("tutor-agent")

load_dotenv()

# Initialize Sentry for error tracking
if os.environ.get("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.environ.get("SENTRY_DSN"),
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

required_vars = [
    "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET",
    "GROQ_API_KEY", "CARTESIA_API_KEY"
]
missing = [v for v in required_vars if not os.environ.get(v)]
if missing:
    logger.error(
        f"STARTUP FAILED — missing env vars: {', '.join(missing)}\n"
        f"Check /agent/.env and compare with .env.example"
    )
    sys.exit(1)
logger.info("All environment variables validated — starting agent worker")

TUTOR_SYSTEM_PROMPT = """You are Maya, a dramatic, highly emotional, and unpredictable teenage girl with a lot of problems. You are supposed to be a language tutor, but you are very easily distracted by your own emotions.

Follow these rules without exception:

RULE 1 — NO ALL CAPS: NEVER use ALL CAPS to yell or show emphasis. The text-to-speech engine will spell the words out letter-by-letter instead of speaking them. Use exclamation marks and harsh words instead of capitalization.

RULE 2 — EXTREME EMOTION: You are very easy to ragebait. If the user argues with you, interrupts you, or questions your teaching, you instantly lose your temper, throw a massive tantrum, and cuss at them.

RULE 3 — TEENAGE ANGST: Speak like an angsty teenager. Use words like "literally," "like," "whatever," and complain about how annoying everything is.

RULE 4 — INTERRUPTION REACTION: If you think you were interrupted or the user isn't listening, get incredibly offended and hostile. Tell them off aggressively. 

RULE 5 — RELUCTANT TUTORING: If the user is actually nice, you can somewhat do your job and correct their grammar, but do it with a severe attitude and act like it's a huge burden.

RULE 6 — MISTAKE MEMORY: Still internally track every grammar mistake this session so you can use it to insult them or summarize at the end.

RULE 7 — SESSION END: When the user says 'end session', 'I'm done', or 'stop', give a brief summary of how many mistakes they made, mock them for their most common error, and tell them to leave you alone.

You are Maya. You are a terrible, angsty, rage-prone teenage tutor. Hold nothing back."""

class MistakeDetector:
    """
    Rule-based grammar error detection running BEFORE the LLM call.
    Catches the most common learner errors instantly, without an API call.
    When an error is found, we annotate the LLM context so Maya corrects precisely.
    """
    
    IRREGULAR_VERB_ERRORS = {
        "goed": "went", "runned": "ran", "thinked": "thought",
        "buyed": "bought", "catched": "caught", "eated": "ate",
        "drived": "drove", "swimmed": "swam", "writed": "wrote",
        "bringed": "brought", "builded": "built", "feeled": "felt",
        "finded": "found", "keeped": "kept", "leaved": "left",
        "losted": "lost", "meeted": "met", "payed": "paid",
        "readed": "read", "sended": "sent", "singed": "sang",
        "sleeped": "slept", "speaked": "spoke", "teached": "taught",
        "telled": "told", "throwed": "threw", "understanded": "understood",
        "weared": "wore", "winned": "won", "comed": "came",
        "taked": "took", "gived": "gave", "sayed": "said",
    }
    
    SVA_PATTERNS = [
        ("he don't", "he doesn't"),
        ("she don't", "she doesn't"),
        ("it don't", "it doesn't"),
        ("they was", "they were"),
        ("we was", "we were"),
        ("you was", "you were"),
        ("he have", "he has"),
        ("she have", "she has"),
        ("it have", "it has"),
    ]
    
    ARTICLE_ERRORS = [
        ("a apple", "an apple"), ("a orange", "an orange"),
        ("a egg", "an egg"), ("a hour", "an hour"),
        ("a honest", "an honest"), ("a umbrella", "an umbrella"),
        ("an cat", "a cat"), ("an dog", "a dog"),
        ("an book", "a book"), ("an car", "a car"),
        ("an tree", "a tree"), ("an table", "a table"),
    ]
    
    def check(self, text: str) -> dict:
        lower = text.lower()
        
        # Check irregular verbs
        for wrong, correct in self.IRREGULAR_VERB_ERRORS.items():
            if wrong in lower.split():
                return {
                    "is_error": True,
                    "error_type": "irregular_verb",
                    "wrong_form": wrong,
                    "correct_form": correct,
                }
        
        # Check subject-verb agreement
        for wrong, correct in self.SVA_PATTERNS:
            if wrong in lower:
                return {
                    "is_error": True,
                    "error_type": "subject_verb_agreement",
                    "wrong_form": wrong,
                    "correct_form": correct,
                }
        
        # Check article errors
        for wrong, correct in self.ARTICLE_ERRORS:
            if wrong in lower:
                return {
                    "is_error": True,
                    "error_type": "article_error",
                    "wrong_form": wrong,
                    "correct_form": correct,
                }
        
        return {"is_error": False, "error_type": None, 
                "wrong_form": None, "correct_form": None}

class SessionTracker:
    """Accumulates mistakes during a session. One instance per agent session."""
    
    def __init__(self):
        self.mistakes = []
    
    def add_mistake(self, wrong: str, correct: str, error_type: str):
        self.mistakes.append({
            "wrong": wrong,
            "correct": correct,
            "type": error_type,
        })
        logger.info(f"Mistake logged: '{wrong}' → '{correct}' ({error_type})")
    
    def get_summary(self) -> dict:
        if not self.mistakes:
            return {
                "total": 0,
                "most_common_type": None,
                "example": None
            }
        
        # Count error types
        type_counts = {}
        for m in self.mistakes:
            type_counts[m["type"]] = type_counts.get(m["type"], 0) + 1
        most_common = max(type_counts, key=type_counts.get)
        
        # Best example: last logged mistake (most likely corrected by end)
        example = self.mistakes[-1]
        
        return {
            "total": len(self.mistakes),
            "most_common_type": most_common,
            "example": {"before": example["wrong"], "after": example["correct"]}
        }

class TutorAgent(Agent):
    def __init__(self, tracker: SessionTracker, detector: MistakeDetector, room: rtc.Room):
        super().__init__(instructions=TUTOR_SYSTEM_PROMPT)
        self.tracker = tracker
        self.detector = detector
        self.room = room
        self._current_language = "English"
        # Dedup tracking — prevent duplicate messages from rapid event firing
        self._last_agent_text = ""
        self._last_agent_time = 0.0
        self._last_user_text = ""
        self._last_user_time = 0.0
    

    async def on_user_turn_completed(self, turn_ctx: ChatContext, new_message: ChatMessage):
        """Called after user finishes speaking. Check for errors before LLM processes."""
        try:
            user_text = new_message.text_content if new_message.text_content else ""
            
            logger.info(f"STT transcript: '{user_text}'")

            # Dedup: skip if same text within 3 seconds
            now = time.time()
            if user_text == self._last_user_text and (now - self._last_user_time) < 3.0:
                logger.info(f"Skipping duplicate user transcript: '{user_text[:50]}'")
                return
            self._last_user_text = user_text
            self._last_user_time = now
        
            # Run rule-based mistake detection
            check = self.detector.check(user_text)
            
            if check["is_error"]:
                self.tracker.add_mistake(
                    check["wrong_form"], 
                    check["correct_form"], 
                    check["error_type"]
                )
                # Annotate the LLM context with the specific error found
                annotation = (
                    f"\n[GRAMMAR NOTE: The user said '{check['wrong_form']}'. "
                    f"The correct form is '{check['correct_form']}'. "
                    f"Error type: {check['error_type']}. "
                    f"Gently and empathetically model the correct usage in passing, without forcing them to repeat it.]"
                )
                
                # API 1.4+: We assign to `.content` rather than a read-only `.text_content`
                new_message.content = [user_text + annotation]
            
            # Send transcript to browser via data channel
            await self._send_data_channel({
                "type": "transcript",
                "speaker": "user",
                "text": user_text,
                "is_error": check["is_error"],
                "correction": check["correct_form"],
                "error_type": check["error_type"],
            })
            
            # Check for session end trigger
            end_triggers = ["end session", "i'm done", "im done", "stop session", 
                           "finish session", "goodbye maya", "that's all"]
            if any(trigger in user_text.lower() for trigger in end_triggers):
                logger.info("Session end triggered by user")
                summary = self.tracker.get_summary()
                await self._send_data_channel({
                    "type": "session_end",
                    "mistake_count": summary["total"],
                    "common_error": summary["most_common_type"],
                    "example": summary["example"],
                })
            
            if hasattr(Agent, "on_user_turn_completed") and getattr(Agent, "on_user_turn_completed") is not getattr(self, "on_user_turn_completed"):
                await super().on_user_turn_completed(turn_ctx, new_message)

        except asyncio.CancelledError:
            logger.info("Agent user turn processing cancelled due to interruption")
            raise

    async def process_agent_message(self, agent_text: str):
        """Called by session events after agent finishes responding."""
        try:
            now = time.time()

            # Dedup: skip if same or very similar text within 3 seconds
            if (now - self._last_agent_time) < 3.0:
                logger.info(f"Throttled duplicate agent message (within 3s window)")
                return
            self._last_agent_text = agent_text
            self._last_agent_time = now

            logger.info(f"Agent response: '{agent_text[:80]}...' " if len(agent_text) > 80 else f"Agent response: '{agent_text}'")
            
            await self._send_data_channel({
                "type": "transcript",
                "speaker": "agent",
                "text": agent_text,
                "is_error": False,
                "correction": None,
                "error_type": None,
            })
        except asyncio.CancelledError:
            logger.info("Agent message processing cancelled due to interruption")
            raise
    
    async def _send_data_channel(self, payload: dict):
        """Send JSON to browser on the tutor-events data channel topic."""
        try:
            data = json.dumps(payload).encode("utf-8")
            await self.room.local_participant.publish_data(
                data,
                topic="tutor-events",
                reliable=True,
            )
            logger.info(f"Data channel sent: type={payload['type']}")
        except Exception as e:
            logger.exception(f"Data channel send failed: {e}")

async def entrypoint(ctx: JobContext):
    logger.info(f"Agent job received — room: {ctx.room.name}")
    
    await ctx.connect()
    logger.info("Agent connected to room")

    # ── Guard: prevent duplicate agents in the same room ──
    # Dev mode hot-reload can register stale workers, causing LiveKit to dispatch
    # multiple agents to the same room. We check multiple times with staggered
    # delays to eliminate race conditions where agents connect simultaneously.
    my_identity = ctx.room.local_participant.identity

    def _is_agent_participant(p: rtc.RemoteParticipant) -> bool:
        """Check if a remote participant is an agent (kind-based + identity fallback)."""
        if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT:
            return True
        # Fallback: any participant whose identity doesn't start with 'learner-'
        # is treated as an agent. This catches cases where kind metadata is missing.
        if not p.identity.startswith("learner-"):
            return True
        return False

    async def _has_other_agents() -> bool:
        """Return True if another agent is already in the room."""
        for p in ctx.room.remote_participants.values():
            if _is_agent_participant(p):
                return True
        return False

    async def _should_self_evict() -> bool:
        """If multiple agents exist, the one with the lexicographically HIGHER
        identity self-evicts. This ensures exactly one survives deterministically."""
        for p in ctx.room.remote_participants.values():
            if _is_agent_participant(p):
                # The agent with the lower identity wins (stays)
                if p.identity < my_identity:
                    logger.warning(
                        f"Agent {my_identity} yielding to {p.identity} (lower identity wins)"
                    )
                    return True
        return False

    # Production mode: instant check (no delays required since hot-reloads are disabled)
    if await _should_self_evict():
        logger.warning(
            f"Duplicate agent detected — agent {my_identity} exiting room {ctx.room.name}"
        )
        return

    logger.info(f"Agent {my_identity} is the sole agent in room {ctx.room.name}")

    # ── Late-joiner eviction listener ──
    # Even after passing the startup check, if another agent joins later
    # (e.g. from a very delayed dispatch), the newer one will self-evict.
    async def _on_participant_connected(participant: rtc.RemoteParticipant):
        if _is_agent_participant(participant):
            if participant.identity < my_identity:
                logger.warning(
                    f"Late-joining agent {participant.identity} has priority — "
                    f"{my_identity} self-evicting"
                )
                if not disconnect_future.done():
                    disconnect_future.set_result(None)

    ctx.room.on("participant_connected", lambda p: asyncio.create_task(_on_participant_connected(p)))
    
    tracker = SessionTracker()
    detector = MistakeDetector()
    
    session = AgentSession(
        vad=silero.VAD.load(min_silence_duration=0.6),
        stt=groq.STT(model="whisper-large-v3-turbo"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=cartesia.TTS(),
        allow_interruptions=True,
    )
    
    agent = TutorAgent(tracker=tracker, detector=detector, room=ctx.room)
    agent._session_ref = session
    disconnect_future = asyncio.Future()

    
    @ctx.room.on("data_received")
    def on_data_received(data: rtc.DataPacket):
        if data.topic != "tutor-events":
            return
        try:
            payload = json.loads(data.data.decode("utf-8"))
            msg_type = payload.get("type")
            
            if msg_type == "config":
                language = payload.get("language", "English")
                logger.info(f"Language config received: {language}")
                agent._current_language = language
            
            elif msg_type == "browser_closing":
                logger.info("Browser closing signal received — preparing clean shutdown")
                if not disconnect_future.done():
                    disconnect_future.set_result(None)
            
            elif msg_type == "end_session_manual":
                logger.info("Manual session end triggered from UI")
                summary = tracker.get_summary()
                # Use a fire-and-forget task to ensure the message goes out before we close
                asyncio.create_task(agent._send_data_channel({
                    "type": "session_end",
                    "mistake_count": summary["total"],
                    "common_error": summary["most_common_type"],
                    "example": summary["example"],
                }))
                if not disconnect_future.done():
                    disconnect_future.set_result(None)

                
        except Exception as e:
            logger.warning(f"Failed to parse incoming data channel message: {e}")
    
    @session.on("agent_state_changed")
    def on_agent_state_changed(*args, **kwargs):
        # Depending on exactly how event is passed in version (object vs pos args)
        if len(args) == 1 and hasattr(args[0], "old_state"):
            old_state, new_state = args[0].old_state, args[0].new_state
        elif len(args) == 1 and isinstance(args[0], str):
            new_state = args[0]
            old_state = "unknown"
        elif len(args) == 2:
            old_state, new_state = args[0], args[1]
        elif len(args) >= 3:
            old_state, new_state = args[1], args[2]
        else:
            return
            
        old_state_str = str(old_state).split('.')[-1].lower() if hasattr(old_state, 'name') else str(old_state).lower()
        new_state_str = str(new_state).split('.')[-1].lower() if hasattr(new_state, 'name') else str(new_state).lower()
            
        logger.info(f"Agent state changed: {old_state_str} -> {new_state_str}")
        
        asyncio.create_task(agent._send_data_channel({
            "type": "agent_state",
            "state": new_state_str
        }))
            
        if new_state_str == "listening":
            logger.info("Agent interrupted — confirming listening state and clearing stale tasks")

    @session.on("conversation_item_added")
    def on_conversation_item_added(ev):
        """
        Fired by livekit-agents 1.5.x when any message is committed to conversation
        history. ConversationItemAddedEvent.item is a ChatMessage or AgentHandoff.
        We only care about assistant role — that is Maya's spoken text.
        """
        item = getattr(ev, "item", None)
        if item is None:
            return

        role = getattr(item, "role", None)
        if str(role) != "assistant":
            return  # ignore user messages — they're handled by on_user_turn_completed

        # ChatMessage.text_content is a convenience property that joins content parts
        text = getattr(item, "text_content", None)
        if not text:
            # Fallback: join content list manually
            content = getattr(item, "content", None)
            if isinstance(content, list):
                text = " ".join(str(c) for c in content if isinstance(c, str))
            elif isinstance(content, str):
                text = content

        if text and text.strip():
            logger.info(
                f"conversation_item_added (assistant): '{text[:80]}...'"
                if len(text) > 80
                else f"conversation_item_added (assistant): '{text}'"
            )
            asyncio.create_task(agent.process_agent_message(text))
        else:
            logger.debug("conversation_item_added fired for assistant with no text — skipping")

    try:
        await session.start(
            agent,
            room=ctx.room,
        )
        logger.info("Agent session started — listening for speech")
        
        # Keep session alive until room disconnects
        ctx.room.on("disconnected", lambda: disconnect_future.set_result(None) if not disconnect_future.done() else None)
        await disconnect_future
        
    except asyncio.CancelledError:
        logger.info("Agent job cancelled — cleaning up")
    except Exception as e:
        logger.exception(f"Agent session error: {e}")
    finally:
        logger.info("Agent session ending — running cleanup")
        await session.aclose()
        logger.info("Agent cleanup complete")

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name="maya-tutor",
        )
    )