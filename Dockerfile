# Use Python 3.11 as the base image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (for building the frontend)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy the entire project
COPY . .

# Build the Frontend
WORKDIR /app/frontend
RUN npm install
# Set the token server URL to relative path for the all-in-one setup
ENV VITE_TOKEN_SERVER_URL=/token
RUN npm run build

# Set up the Backend
WORKDIR /app/agent
RUN pip install --no-cache-dir -r requirements.txt

# Create the start script
WORKDIR /app
RUN echo '#!/bin/bash\ncd /app/agent\npython token_server.py &\npython agent.py start' > start.sh
RUN chmod +x start.sh

# Expose the port (FastAPI will run on 8000)
EXPOSE 8000

# Start the combined services
CMD ["./start.sh"]
