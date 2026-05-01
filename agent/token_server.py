"""
Token Server — AI Voice Language Tutor
Sole responsibility: sign LiveKit room access tokens for the frontend.
DEV ONLY: /token endpoint has no authentication.
Add Google OAuth or similar before any public deployment.
"""

import os
import logging
import uuid
import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from livekit import api as livekit_api

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("token_server")

load_dotenv()

required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
missing = [var for var in required if not os.environ.get(var)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}. Please check /agent/.env.")

app = FastAPI(title="Language Tutor Token Server")

# Comment: "Add production domain here before deploying"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/token")
def get_token():
    try:
        identity = f"learner-{uuid.uuid4().hex[:8]}"
        api_key = os.environ.get("LIVEKIT_API_KEY")
        api_secret = os.environ.get("LIVEKIT_API_SECRET")
        
        token = livekit_api.AccessToken(api_key, api_secret)
        token.with_identity(identity)
        token.with_name(identity)
        token.with_grants(livekit_api.VideoGrants(
            room="language-session",
            room_join=True,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        ))
        
        # Livekit AccessToken usually expects timedelta for ttl
        token.with_ttl(datetime.timedelta(seconds=7200))
        
        jwt_string = token.to_jwt()
        
        logger.info(f"Token issued — identity: {identity}")
        
        return {
            "token": jwt_string,
            "url": os.environ["LIVEKIT_URL"],
            "room": "language-session",
            "identity": identity
        }
    except Exception as e:
        logger.exception("Token generation failed")
        raise HTTPException(status_code=500, detail="Token generation failed")

@app.get("/health")
def health_check():
    return { "status": "ok", "service": "language-tutor-token-server" }

if __name__ == "__main__":
    import uvicorn
    # reload=True is fine for dev — remove for production
    uvicorn.run("token_server:app", host="0.0.0.0", port=8000, reload=True)
