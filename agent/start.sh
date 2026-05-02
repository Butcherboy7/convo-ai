#!/bin/bash

# Start the Token Server in the background
echo "Starting Token Server..."
python token_server.py &

# Start the AI Agent in the foreground
echo "Starting AI Agent..."
python agent.py start
