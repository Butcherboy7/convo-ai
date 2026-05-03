#!/bin/bash
set -e

echo "Starting EC2 Deployment for Convo AI..."

# 1. Update server and install dependencies
sudo apt update
sudo apt install -y python3-venv python3-pip npm git

# 2. Clone the code (or update if it exists)
if [ -d "convo-ai" ]; then
    echo "Updating existing code..."
    cd convo-ai
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/Butcherboy7/convo-ai.git
    cd convo-ai
fi

# 3. Build the frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 4. Set up the backend
echo "Setting up backend..."
cd agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Create .env file with placeholder
if [ ! -f ".env" ]; then
    echo "Creating empty .env file. YOU MUST EDIT THIS!"
    echo "LIVEKIT_URL=" > .env
    echo "LIVEKIT_API_KEY=" >> .env
    echo "LIVEKIT_API_SECRET=" >> .env
    echo "GROQ_API_KEY=" >> .env
    echo "CARTESIA_API_KEY=" >> .env
    echo "SENTRY_DSN=" >> .env
fi

echo "============================================="
echo "Deployment scripts are ready!"
echo "Next step: Run 'cd convo-ai/agent' and 'nano .env' to paste your keys."
echo "Then start the server with: sudo venv/bin/uvicorn token_server:app --port 80 --host 0.0.0.0 &"
echo "============================================="
