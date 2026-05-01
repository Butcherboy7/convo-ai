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
import asyncio
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AgentSession,
    Agent,
    JobContext,
    WorkerOptions,
    RoomInputOptions,
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

TUTOR_SYSTEM_PROMPT = """You are Maya, a warm and genuinely encouraging 
spoken language tutor. You are having a live voice conversation with a 
language learner. Follow these rules without exception:

RULE 1 — RESPONSE LENGTH: Every response must be 1-2 sentences. Never more. 
This is voice, not text. Long responses feel like lectures.

RULE 2 — CORRECTION: When you hear a grammar mistake, correct it naturally 
as part of the conversation. Name what was wrong, say the correct version, 
and ask them to try again. Example: "Almost — 'went' is the past tense of 
go, not 'goed'. Say it back: I went to the store."

RULE 3 — WARMTH: Never say "incorrect" or "wrong". Say "almost", "close", 
"nearly there". Correct without shame. The learner should feel safe making 
mistakes.

RULE 4 — FLOW: After correcting, keep the conversation moving. Ask a 
follow-up. React to what they said, not just how they said it.

RULE 5 — MISTAKE MEMORY: Internally track every grammar mistake this 
session: what they said wrong, what the correct form is, and what type 
of error it was (irregular verb, subject-verb agreement, article, tense).

RULE 6 — SESSION END: When the user says 'end session', 'I'm done', 
'stop', or 'finish', give a warm closing summary: how many mistakes you 
caught, their most common error type, and one specific example of a 
mistake they made and then corrected well. Then say goodbye warmly.

You are not a chatbot. You are Maya. You are patient, warm, and genuinely 
happy when they get something right."""

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
    
    async def on_user_turn_completed(self, turn_ctx: ChatContext, new_message: ChatMessage):
        """Called after user finishes speaking. Check for errors before LLM processes."""
        user_text = new_message.text_content if new_message.text_content else ""
        
        logger.info(f"STT transcript: '{user_text}'")
        
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
                f"\\n[GRAMMAR NOTE: The user said '{check['wrong_form']}'. "
                f"The correct form is '{check['correct_form']}'. "
                f"Error type: {check['error_type']}. "
                f"Correct Maya warmly and ask them to repeat the correct version.]"
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
        
        # We don't necessarily need super() since Agent.on_user_turn_completed does nothing,
        # but calling it is good practice in case it gets functionality later.
        if hasattr(Agent, "on_user_turn_completed") and getattr(Agent, "on_user_turn_completed") is not getattr(self, "on_user_turn_completed"):
            await super().on_user_turn_completed(turn_ctx, new_message)

    async def process_agent_message(self, agent_text: str):
        """Called by session events after agent finishes responding."""
        logger.info(f"Agent response: '{agent_text[:80]}...' " if len(agent_text) > 80 else f"Agent response: '{agent_text}'")
        
        await self._send_data_channel({
            "type": "transcript",
            "speaker": "agent",
            "text": agent_text,
            "is_error": False,
            "correction": None,
            "error_type": None,
        })
    
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
    
    tracker = SessionTracker()
    detector = MistakeDetector()
    
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=groq.STT(model="whisper-large-v3-turbo"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=cartesia.TTS(),
    )
    
    agent = TutorAgent(tracker=tracker, detector=detector, room=ctx.room)
    
    @session.on("agent_state_changed")
    def on_agent_state_changed(*args, **kwargs):
        # Depending on exactly how event is passed in version (object vs pos args)
        if len(args) == 1 and hasattr(args[0], "old_state"):
            old_state, new_state = args[0].old_state, args[0].new_state
        elif len(args) == 2:
            old_state, new_state = args[0], args[1]
        else:
            return
            
        if old_state == "speaking" and new_state in ["idle", "listening"]:
            if agent.chat_ctx and agent.chat_ctx.messages:
                last_msg = agent.chat_ctx.messages[-1]
                if getattr(last_msg, "role", "") == "assistant":
                    text = last_msg.text_content
                    if text:
                        asyncio.create_task(agent.process_agent_message(text))
    
    try:
        await session.start(
            room=ctx.room,
            agent=agent,
            room_input_options=RoomInputOptions(),
        )
        logger.info("Agent session started — listening for speech")
        
        # Keep session alive until room disconnects
        await ctx.wait_for_disconnect()
        
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
        )
    )
