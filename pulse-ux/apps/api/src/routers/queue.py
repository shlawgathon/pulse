"""
Queue router for rrweb session recordings.

This endpoint receives rrweb events and stores them to disk
in the session_recordings folder.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

router = APIRouter()

# Session recordings directory
RECORDINGS_DIR = Path(__file__).parent.parent.parent / "session_recordings"
RECORDINGS_DIR.mkdir(exist_ok=True)


class QueueRequest(BaseModel):
    """Request for queuing rrweb events."""
    
    session_id: str = Field(..., description="Unique session identifier")
    events: list[dict[str, Any]] = Field(..., description="rrweb events array")
    timestamp: int | None = Field(None, description="Client timestamp")


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def queue_recording(request: QueueRequest) -> None:
    """
    Queue rrweb recording events.
    
    Stores events to session_recordings/{session_id}.json
    Appends events if file already exists.
    """
    session_file = RECORDINGS_DIR / f"{request.session_id}.json"
    
    # Load existing events if file exists
    existing_events = []
    if session_file.exists():
        try:
            with open(session_file, "r") as f:
                data = json.load(f)
                existing_events = data.get("events", [])
        except (json.JSONDecodeError, IOError):
            existing_events = []
    
    # Append new events
    all_events = existing_events + request.events
    
    # Write back to file
    with open(session_file, "w") as f:
        json.dump({
            "session_id": request.session_id,
            "events": all_events,
            "last_updated": datetime.utcnow().isoformat(),
            "event_count": len(all_events),
        }, f, indent=2)


@router.get("")
async def get_queue_status() -> dict:
    """
    Get queue status and worker information.
    
    Returns list of active sessions and their event counts.
    """
    sessions = []
    
    if RECORDINGS_DIR.exists():
        for session_file in RECORDINGS_DIR.glob("*.json"):
            try:
                with open(session_file, "r") as f:
                    data = json.load(f)
                    sessions.append({
                        "session_id": data.get("session_id", session_file.stem),
                        "event_count": data.get("event_count", 0),
                        "last_updated": data.get("last_updated"),
                    })
            except (json.JSONDecodeError, IOError):
                continue
    
    return {
        "status": "active",
        "workers": 1,
        "pending": 0,
        "sessions": sessions,
        "session_count": len(sessions),
    }
