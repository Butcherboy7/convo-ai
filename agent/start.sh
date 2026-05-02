#!/bin/bash

# Start the Token Server in the background
echo "Starting Token Server..."
python token_server.py &

# Start the AI Agent in the foreground with no prewarming (better for Render Free)
echo "Starting AI Agent..."
python agent.py start --prewarm 0
