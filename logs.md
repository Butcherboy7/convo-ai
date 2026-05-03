# Project Log & Deep Insights — Convo AI

## Daily Log: May 3rd, 2026

### 1. Agent Runtime Stabilization
- **Fixed `livekit-agents` API Crash**: The `AgentSession` was crashing upon initialization due to deprecated parameters (`interrupt_speech_duration` and `interrupt_min_words`) being passed. These were removed to align with LiveKit Agents v1.5.x, restoring the agent's ability to join rooms.

### 2. Infrastructure & Deployment (EC2 Automation)
- **EC2 Port Conflicts**: Resolved an issue where the agent failed to start due to port `8081` being locked by a ghost process. Introduced robust kill commands (`sudo lsof -i :8081 -t | xargs -r sudo kill -9`) to the deployment flow.
- **Continuous Deployment (CI/CD)**: Established a GitHub Actions workflow (`.github/workflows/deploy.yml`) utilizing `appleboy/ssh-action`. This allows seamless pushing of code to the `main` branch which automatically updates the EC2 instance, rebuilds the Vite frontend, and restarts the backend via a single background command (`nohup bash start.sh > server.log 2>&1 &`).

### 3. User Experience (UX) Enhancements
- **Auto-Scrolling Transcripts**: Implemented a `messagesEndRef` combined with a `scrollIntoView` effect in `Transcript.jsx` to ensure the chat window automatically follows the conversation.
- **Typography & Readability**: Swapped the default sans-serif font for Google's `Inter`, increased font sizes, and adjusted line height and padding in both `index.css` and `Transcript.jsx` to significantly reduce eye strain.
- **Micro-Animations**: Replaced the static active microphone state with a custom `mic-pulse-glow` CSS keyframe animation in `VoiceSession.jsx` to make the application feel more premium and dynamic.

### 4. Persona Engineering (Maya's Teen Angst)
- **Personality Overhaul**: Completely rewrote the `TUTOR_SYSTEM_PROMPT` in `agent.py`. Maya transitioned from a hyper-positive cheerleader to a highly dramatic, easily rage-baited, angsty teenager who reluctantly tutors and throws tantrums when interrupted.
- **Cartesia TTS "All-Caps" Bug**: Discovered a critical edge case where the Cartesia Text-to-Speech engine misinterprets ALL CAPS text as acronyms (spelling out words letter-by-letter). Implemented a strict rule in the system prompt explicitly forbidding the use of uppercase for emphasis, forcing the LLM to rely on exclamation marks and harsh vocabulary instead.

---

## Deep Insights & Project Reflections

### The Fragility of Voice Pipelines
The "All-Caps" TTS bug highlighted a significant challenge in Voice AI: **Prompt engineering is no longer just about generating the right words; it is about generating the right phonetic structure for the downstream TTS engine.** Standard text-based LLM behaviors (like yelling in ALL CAPS) can completely break the illusion of a human-like voice. We must heavily constrain the LLM's raw output formatting.

### Single-Source of Truth Architecture
The decision to route all state and communication through LiveKit's Data Channel (`tutor-events` topic) has proven extremely robust. Because the React frontend only renders state pushed by the agent, we eliminated complex client-side state synchronization. The frontend is essentially a "dumb" terminal reflecting the agent's internal state.

### Deployment Friction Solved
Moving from manual SSH interventions to a single command pipeline via GitHub Actions fundamentally changed the iteration speed of this project. By ensuring the token server and agent run gracefully in the background (`nohup`), we can safely iterate on both UI and Python backend logic without dropping the server.

### The Power of Persona
Changing the agent's personality to a "dramatic teenager" dramatically alters the educational dynamic. This proves that educational tools do not need to be sterile or purely academic. Introducing friction, personality, and even "ragebait" creates a highly engaging (and entertaining) environment that might ironically motivate users to practice their language skills more than a standard robotic tutor would.
