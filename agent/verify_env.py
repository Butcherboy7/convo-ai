import os
import sys
import requests
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

required_vars = [
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "GROQ_API_KEY",
    "CARTESIA_API_KEY"
]

missing = []
for var in required_vars:
    val = os.environ.get(var)
    if not val:
        missing.append(var)

if missing:
    print(f"Missing required environment variables: {', '.join(missing)}")
    sys.exit(1)

all_passed = True

# 3. Test Groq LLM
try:
    groq_api_key = os.environ.get("GROQ_API_KEY")
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": "say ok"}],
            "max_tokens": 5
        },
        timeout=10
    )
    if response.status_code == 200:
        print("✓ Groq LLM: working")
    else:
        print(f"✗ Groq LLM: error {response.status_code} {response.text}")
        all_passed = False
except Exception as e:
    print(f"✗ Groq LLM: {str(e)}")
    all_passed = False

# 4. Test Groq STT access
try:
    response = requests.get(
        "https://api.groq.com/openai/v1/models",
        headers={
            "Authorization": f"Bearer {groq_api_key}"
        },
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        models = [m.get("id") for m in data.get("data", [])]
        if "whisper-large-v3-turbo" in models:
            print("✓ Groq STT: whisper-large-v3-turbo available")
        else:
            print("✗ Groq STT: whisper-large-v3-turbo not found in models list")
            all_passed = False
    else:
        print(f"✗ Groq STT: error {response.status_code} {response.text}")
        all_passed = False
except Exception as e:
    print(f"✗ Groq STT: {str(e)}")
    all_passed = False

# 5. Test Cartesia
try:
    cartesia_api_key = os.environ.get("CARTESIA_API_KEY")
    response = requests.get(
        "https://api.cartesia.ai/voices",
        headers={
            "X-API-Key": cartesia_api_key,
            "Cartesia-Version": "2024-06-10"
        },
        timeout=10
    )
    if response.status_code == 200:
        voices = response.json()
        n = len(voices)
        print(f"✓ Cartesia: working, {n} voices available")
    else:
        print(f"✗ Cartesia: error {response.status_code} {response.text}")
        all_passed = False
except Exception as e:
    print(f"✗ Cartesia: {str(e)}")
    all_passed = False

# 6. Test LiveKit token signing
try:
    from livekit import api
    
    # We will just try to create an access token using LiveKit library
    livekit_api_key = os.environ.get("LIVEKIT_API_KEY")
    livekit_api_secret = os.environ.get("LIVEKIT_API_SECRET")
    
    token = api.AccessToken(livekit_api_key, livekit_api_secret)
    token.with_identity("test")
    token.with_grants(api.VideoGrants(room_join=True, room="test_room"))
    jwt = token.to_jwt()
    if jwt:
        print("✓ LiveKit token signing: working")
    else:
        print("✗ LiveKit: Failed to generate token")
        all_passed = False
except Exception as e:
    print(f"✗ LiveKit: {str(e)}")
    all_passed = False

if all_passed:
    print("ALL CREDENTIALS VALID — ready to build")
else:
    print("Some tests failed.")
    sys.exit(1)
