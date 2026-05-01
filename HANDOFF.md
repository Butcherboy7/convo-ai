# HANDOFF — AI Voice Language Tutor
**Status:** Phase 3 — UI Polish & Feature Expansion

## Stack
- Backend: Python 3.12, FastAPI, LiveKit Agents 1.4
- AI Plugins: silero (VAD, local), groq (STT + LLM), cartesia (TTS)
- Frontend: React 19, Vite 5, TailwindCSS, @livekit/components-react

## Architecture (The One Rule)
State lives ONLY in the agent process. Browser renders only.
Token server signs JWTs only. LiveKit routes audio only.

## Vite Proxy
Frontend calls /api/token → Vite proxies to http://localhost:8000/token
This eliminates ALL CORS issues. Never call port 8000 directly from browser.

## Data Channel
Topic: "tutor-events" for all agent↔browser JSON messaging
Schema: { type, speaker, text, is_error, correction, error_type }

## Env Vars
Agent: /agent/.env (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, GROQ_API_KEY, CARTESIA_API_KEY)
Frontend: /frontend/.env.local (VITE_TOKEN_SERVER_URL=http://localhost:5173/api)

## Recent Achievements
- **Mistake Detector**: Implemented rule-based instant grammar correction (Irregular verbs, SVA, Articles).
- **Session Tracker**: Agent tracks mistakes and provides a summary when the user ends the session.
- **Frontend Integration**: Real-time transcriptions and mistake highlighting wired through LiveKit data channels.

## Phase Status
- [x] Phase 0: Credentials verified
- [x] Phase 1a: Project scaffold
- [x] Phase 1b: Token server + agent core built
- [x] Phase 1c: Frontend connected — audio pipeline smoke tested
- [x] Phase 2: Tutor behavior + mistake detection + transcript UI
- [ ] Phase 3: Full polish — animations, session summary modal, language selector
- [ ] Phase 4: Persistence — save session summaries to a database

