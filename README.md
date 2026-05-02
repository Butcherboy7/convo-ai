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
- **Premium UI/UX**: Minimalist, intentional design with responsive layouts and subtle micro-animations that communicate state effectively.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, @livekit/components-react
- **Backend**: Python 3.12, FastAPI (Token Server)
- **AI Agent**: LiveKit Agents SDK
- **STT & LLM**: Groq (Whisper-large-v3-turbo, Llama-3.3-70b-versatile)
- **TTS**: Cartesia (Sonic-english)
- **VAD**: Silero VAD (Local)

---

## 🚀 Getting Started (Spoon-fed)

Follow these steps exactly to get Maya running on your own machine.

### 1. Prerequisites
- **Python 3.12+**: [Download here](https://www.python.org/downloads/)
- **Node.js 18+**: [Download here](https://nodejs.org/)
- **API Keys**: You need accounts and keys for:
  - [LiveKit Cloud](https://cloud.livekit.io) (Project URL, API Key, API Secret)
  - [Groq](https://console.groq.com) (API Key)
  - [Cartesia](https://play.cartesia.ai) (API Key)

### 2. Setup the Backend (Agent & Token Server)
1. Open a terminal and navigate to the project folder.
2. Go into the agent folder: `cd agent`
3. Create a virtual environment: `python -m venv venv`
4. Activate it:
   - **Windows**: `venv\Scripts\activate`
   - **Mac/Linux**: `source venv/bin/activate`
5. Install dependencies: `pip install -r requirements.txt`
6. Create your environment file: `cp .env.example .env` (or just rename `.env.example` to `.env`)
7. **Open `.env` in a text editor** and paste your API keys from step 1.
8. Verify everything is correct: `python verify_env.py`

### 3. Setup the Frontend
1. Open a **new** terminal (keep the first one open).
2. Go into the frontend folder: `cd frontend`
3. Install dependencies: `npm install`

### 4. How to Run (3 Steps)
You need to have 3 terminals running at the same time:

- **Terminal 1 (Token Server)**: 
  `cd agent && python token_server.py`
  *(This handles security and room access)*

- **Terminal 2 (AI Agent)**: 
  `cd agent && python agent.py dev`
  *(This is Maya's brain. Keep this running!)*

- **Terminal 3 (Frontend)**: 
  `cd frontend && npm run dev`
  *(This starts the website)*

Once all three are running, open **[http://localhost:5173](http://localhost:5173)** in your browser and start talking!


---

## 📖 Architecture

The project follows a "Thin Client, Thick Agent" philosophy:
1. **Agent**: Holds all conversation state, handles VAD/STT/LLM/TTS, and performs grammar analysis.
2. **Frontend**: A pure rendering layer that connects to LiveKit and listens for `tutor-events` via data channels.
3. **Token Server**: Signs JWTs for secure room access.

See [HANDOFF.md](HANDOFF.md) for detailed technical specifications and the current development roadmap.

