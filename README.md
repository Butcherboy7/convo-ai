# Convo AI: Your Personal AI Language Tutor 🎙️✨

Convo AI is a real-time, voice-first language tutoring system powered by **LiveKit**, **Groq**, and **Cartesia**. It features **Maya**, a passionate and empathetic AI tutor designed to help you practice languages through natural conversation.

---

## 🚀 Quick Start (Local Setup)

Follow these exact steps to get Maya running on your computer in less than 5 minutes.

### 1. Clone & Install
Open your terminal and run:
```bash
# Clone the project
git clone https://github.com/Butcherboy7/convo-ai.git
cd convo-ai

# Install everything
cd agent && pip install -r requirements.txt
cd ../frontend && npm install
cd ..
```

### 2. Set Up API Keys
1. Create a file named `.env` inside the `agent/` folder.
2. Paste the following and add your keys:
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
GROQ_API_KEY=your-groq-key
CARTESIA_API_KEY=your-cartesia-key
```

### 3. Run It (3 Terminals)

**Terminal 1: Security Server**
```bash
cd agent
python token_server.py
```

**Terminal 2: Maya's Brain (The Agent)**
```bash
cd agent
python agent.py dev
```

**Terminal 3: The Website**
```bash
cd frontend
npm run dev
```

**Done!** Open **[http://localhost:5173](http://localhost:5173)** and start talking!

---

## 🌍 Cloud Deployment

If you want to host this for others to use:

### Option A: AWS (Recommended with Credits)
1.  **Backend**: Use **AWS App Runner**. Point it to your repo, use the `Dockerfile`, and set port `8000`.
2.  **Frontend**: Use **AWS Amplify**. Set `VITE_TOKEN_SERVER_URL` to your App Runner link + `/token`.

### Option B: Render (Easiest Free Tier)
1.  Click **New +** > **Blueprint** on Render.
2.  Connect this repo and enter your API keys.
3.  Update the frontend `VITE_TOKEN_SERVER_URL` in the Render dashboard once live.

---

## 📖 Architecture
1. **Agent**: Handles voice, logic, and grammar (Python/LiveKit).
2. **Frontend**: The beautiful interface (React/Vite).
3. **Token Server**: Issues secure access keys (FastAPI).

See [HANDOFF.md](HANDOFF.md) for full technical details.
