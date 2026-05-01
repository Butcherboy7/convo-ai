# 🎙️ Convo AI — Voice Language Tutor

**Convo AI** is a real-time, AI-powered spoken language tutor. It listens to you speak, catches grammar mistakes instantly, corrects you warmly, and maintains a natural conversation flow.

Built with **LiveKit Components**, **Groq (Llama 3 & Whisper)**, and **Cartesia**, this project demonstrates high-performance AI voice interaction with ultra-low latency.

---

## ✨ Features

- **Real-time Voice Interaction**: Zero-button interface. Just speak naturally.
- **Instant Grammar Correction**: Maya (the AI tutor) catches irregular verb errors, subject-verb agreement issues, and article mistakes using a high-speed rule-based pre-processor.
- **Deep Contextual Learning**: LLM-driven feedback ensures corrections are explained naturally within the conversation.
- **Session Summaries**: Get a full report of your mistakes and progress when you finish the session.
- **Ultra-low Latency**: Powered by LiveKit Cloud and Groq's high-speed inference.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, @livekit/components-react
- **Backend**: Python 3.12, FastAPI (Token Server)
- **AI Agent**: LiveKit Agents SDK
- **STT & LLM**: Groq (Whisper-large-v3-turbo, Llama-3.3-70b-versatile)
- **TTS**: Cartesia (Sonic-english)
- **VAD**: Silero VAD (Local)

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.12+
- Node.js 18+
- Accounts for [LiveKit Cloud](https://cloud.livekit.io), [Groq](https://console.groq.com), and [Cartesia](https://play.cartesia.ai).

### 2. Backend Setup (Agent & Token Server)
```bash
cd agent
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
python verify_env.py # Runs a health check on all credentials
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Running the Project (3 Terminals)
- **Terminal 1 (Token Server)**: `cd agent && python token_server.py`
- **Terminal 2 (AI Agent)**: `cd agent && python agent.py dev`
- **Terminal 3 (Frontend)**: `cd frontend && npm run dev`

Open [http://localhost:5173](http://localhost:5173) to start your session.

---

## 📖 Architecture

The project follows a "Thin Client, Thick Agent" philosophy:
1. **Agent**: Holds all conversation state, handles VAD/STT/LLM/TTS, and performs grammar analysis.
2. **Frontend**: A pure rendering layer that connects to LiveKit and listens for `tutor-events` via data channels.
3. **Token Server**: Signs JWTs for secure room access.

See [HANDOFF.md](HANDOFF.md) for detailed technical specifications and the current development roadmap.

