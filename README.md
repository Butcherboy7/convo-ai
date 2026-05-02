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

Follow these steps exactly to get your own AI Tutor running.

### 1. Prerequisites
Before you start, make sure you have these installed:
- **Python 3.12+**: [Download here](https://www.python.org/downloads/)
- **Node.js 18+**: [Download here](https://nodejs.org/)

You also need to grab your API keys from:
- [LiveKit Cloud](https://cloud.livekit.io) (Project URL, API Key, API Secret)
- [Groq](https://console.groq.com) (API Key)
- [Cartesia](https://play.cartesia.ai) (API Key)

---

### 2. Installation (Step-by-Step)

#### Step A: Clone the Project
Open your terminal/command prompt and run:
```bash
git clone https://github.com/Butcherboy7/convo-ai.git
cd convo-ai
```

#### Step B: Setup the Backend
In the same terminal, run these commands one by one:
```bash
cd agent
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```
**Now, open the `agent/.env` file** in your favorite text editor (Notepad, VS Code, etc.) and paste your API keys into the quotes.

#### Step C: Setup the Frontend
Open a **new terminal window**, navigate to the project folder, and run:
```bash
cd frontend
npm install
```

---

### 3. How to Run (Keep all 3 terminals open!)

To start the tutor, you need to have **3 terminals** running at the same time:

**Terminal 1: Token Server**
```bash
cd agent
# (Make sure venv is active)
python token_server.py
```

**Terminal 2: AI Agent (Maya's Brain)**
```bash
cd agent
# (Make sure venv is active)
python agent.py dev
```

**Terminal 3: Frontend (The Website)**
```bash
cd frontend
npm run dev
```

**Done!** Now open **[http://localhost:5173](http://localhost:5173)** in your browser and click "Start Session".



---

## 📖 Architecture

The project follows a "Thin Client, Thick Agent" philosophy:
1. **Agent**: Holds all conversation state, handles VAD/STT/LLM/TTS, and performs grammar analysis.
2. **Frontend**: A pure rendering layer that connects to LiveKit and listens for `tutor-events` via data channels.
3. **Token Server**: Signs JWTs for secure room access.

See [HANDOFF.md](HANDOFF.md) for detailed technical specifications and the current development roadmap.

---

## 🌍 Deployment (All-on-Render)

You can deploy the entire project (Website + Agent + API) to Render in one go.

### 1. Push to GitHub
Ensure your latest changes are on GitHub:
```bash
git add .
git commit -m "All-on-Render deployment"
git push origin main
```

### 2. One-Click Deploy
1. Log in to [Render](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will find the `render.yaml` file. Click **Apply**.
5. Enter your **API Keys** into the "tutor-secrets" group when prompted.

### 3. Final Connection
Once the services are created:
1. Copy the URL of your **tutor-api** service (e.g., `https://tutor-api.onrender.com`).
2. Go to your **tutor-frontend** settings on Render.
3. Find **Environment Variables** and update `VITE_TOKEN_SERVER_URL` to: `https://YOUR-URL.onrender.com/token`.
4. Render will re-deploy your site, and you'll be live!

