# Use Python 3.12 slim image
FROM python:3.12-slim

# Install system dependencies for audio/LiveKit
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the agent code
COPY . .

# Expose port (only needed for Token Server, but harmless for Agent)
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Default command (will be overridden by render.yaml)
CMD ["python", "token_server.py"]
