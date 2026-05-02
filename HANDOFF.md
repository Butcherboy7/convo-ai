# HANDOFF — AI Voice Language Tutor
**Status:** Phase 3 Complete — Audit & Bug Fixes Applied

## Stack
- Backend: Python 3.12, FastAPI, LiveKit Agents **1.5.7** (requirements.txt pins ~=1.4 but pip resolves to 1.5.7)
- AI Plugins: silero 1.5.7 (VAD), groq 1.5.7 (STT + LLM), cartesia 1.5.7 (TTS)
- Frontend: React 19, Vite 5, TailwindCSS, @livekit/components-react 2.9.20, livekit-client 2.18.8

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
- **Duplicate Agent Fix**: Eliminated multiple agents joining the same room on page refresh. Three-layer defense:
  1. **Frontend (App.jsx)**: Stable participant identity via `sessionStorage` — refreshing reuses the same LiveKit identity instead of creating a new one.
  2. **Token Server (token_server.py)**: Accepts identity from frontend query param; explicitly dispatches agent via LiveKit API only if no agent is already present in the room.
  3. **Agent (agent.py)**: Strengthened entrypoint guard with identity-based fallback — any non-`learner-` participant treated as an agent, plus lexicographic self-eviction for deterministic dedup.
- **Mistake Detector**: Implemented rule-based instant grammar correction (Irregular verbs, SVA, Articles).
- **Session Tracker**: Agent tracks mistakes and provides a summary when the user ends the session.
- **Frontend Integration**: Real-time transcriptions and mistake highlighting wired through LiveKit data channels.
- **Personality & UX Refinement**: 
  - Redefined Maya as a "passionate and vibrant" cheerleader via an enhanced system prompt.
  - Optimized VAD and interruption parameters to reduce agent overlap during user speech.
  - Implemented "no-argument" constraints to prevent confrontational or "ragebaiting" behavior.
  - Overhauled README.md with simplified, step-by-step installation instructions for self-hosting.

## Phase Status
- [x] Phase 0: Credentials verified
- [x] Phase 1a: Project scaffold
- [x] Phase 1b: Token server + agent core built
- [x] Phase 1c: Frontend connected — audio pipeline smoke tested
- [x] Phase 2: Tutor behavior + mistake detection + transcript UI
- [x] Phase 3: Full polish — animations, session summary modal, language selector, and frontend hardening
- [x] Phase 3b: Duplicate agent dispatch fix — stable identity + explicit dispatch + entrypoint guard
- [x] Phase 3c: Personality & UX optimization — passionate tone + interruption tuning
- [ ] Phase 4: Persistence — save session summaries to a database

