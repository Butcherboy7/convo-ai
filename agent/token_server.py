"""
Token Server — AI Voice Language Tutor
Sole responsibility: sign LiveKit room access tokens for the frontend.
DEV ONLY: /token endpoint has no authentication.
Add Google OAuth or similar before any public deployment.
"""

import os
import logging
import uuid
import time
import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
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

# Add CORS middleware to allow the frontend to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ROOM_TTL_SECONDS = 3600
_active_room = None

@app.get("/token")
async def get_token(request: Request):
    try:
        global _active_room
        if not _active_room or _active_room.get("expires_at", 0) < time.time() + 60:
            room_name = f"language-session-{uuid.uuid4().hex[:6]}"
            _active_room = {
                "name": room_name,
                "expires_at": time.time() + _ROOM_TTL_SECONDS
            }
        else:
            room_name = _active_room["name"]

        # Accept identity from frontend (sessionStorage-based) for stable reconnects.
        # Falls back to a new UUID if not provided.
        identity = request.query_params.get("identity")
        if not identity or not identity.strip():
            identity = f"learner-{uuid.uuid4().hex[:8]}"

        api_key = os.environ.get("LIVEKIT_API_KEY")
        api_secret = os.environ.get("LIVEKIT_API_SECRET")
        livekit_url = os.environ["LIVEKIT_URL"]

        token = livekit_api.AccessToken(api_key, api_secret)
        token.with_identity(identity)
        token.with_name(identity)
        token.with_grants(livekit_api.VideoGrants(
            room=room_name,
            room_join=True,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        ))
        token.with_ttl(datetime.timedelta(seconds=_ROOM_TTL_SECONDS))
        jwt_string = token.to_jwt()

        logger.info(f"Token issued — identity: {identity}, room: {room_name}")

        # ── Explicit agent dispatch (only if no agent is already in the room) ──
        # With agent_name set on the worker, LiveKit will NOT auto-dispatch.
        # We must explicitly request dispatch here.
        try:
            lk = livekit_api.LiveKitAPI(
                url=livekit_url,
                api_key=api_key,
                api_secret=api_secret,
            )
            try:
                # Trigger dispatch immediately — LiveKit handles duplicates automatically.
                await lk.agent_dispatch.create_dispatch(
                    livekit_api.CreateAgentDispatchRequest(
                        agent_name="maya-tutor",
                        room=room_name,
                    )
                )
                logger.info(f"Agent dispatch triggered for room: {room_name}")
            except Exception as e:
                logger.warning(f"Agent dispatch failed: {e}")
            finally:
                await lk.aclose()
        except Exception as e:
            logger.warning(f"LiveKit API client creation failed: {e}")

        return {
            "token": jwt_string,
            "url": livekit_url,
            "room": room_name,
            "identity": identity
        }
    except Exception as e:
        logger.exception("Token generation failed")
        raise HTTPException(status_code=500, detail="Token generation failed")


@app.post("/new-session")
async def new_session():
    """Explicitly invalidate the current room so the next /token creates a fresh one."""
    global _active_room
    old = _active_room
    _active_room = None
    logger.info(f"Session cleared — old room: {old['name'] if old else 'none'}")
    return {"status": "cleared"}


# Mount the frontend static files (if they exist)
import os
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    @app.get("/")
    async def root_health_check():
        return {"status": "alive", "service": "maya-tutor-backend (frontend not built)"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "language-tutor-token-server"}

if __name__ == "__main__":
    import uvicorn
    # reload=True is fine for dev — remove for production
    uvicorn.run("token_server:app", host="0.0.0.0", port=8000, reload=True)
