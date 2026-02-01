"""
Recording service for session replay operations.

This service manages:
- Saving rrweb recording events
- Retrieving recordings for experiments
"""

import logging
from datetime import datetime
from typing import Any

from src.models.session_recording import SessionRecording

logger = logging.getLogger(__name__)


class RecordingService:
    """Service for session recording operations."""

    async def save_recording_events(
        self,
        session_id: str,
        visitor_id: str,
        experiment_id: str,
        variant_id: str,
        site_id: str,
        url: str,
        events: list[dict[str, Any]],
        is_final: bool = False,
        user_agent: str | None = None,
    ) -> bool:
        """
        Save or append recording events for a session.

        Uses upsert pattern to create new recording or append events to existing.

        Args:
            session_id: Unique session identifier.
            visitor_id: Visitor's identifier.
            experiment_id: Experiment ID.
            variant_id: Variant ID.
            site_id: Site ID.
            url: Page URL being recorded.
            events: List of rrweb events.
            is_final: Whether this is the final batch (page unload).
            user_agent: Visitor's user agent.

        Returns:
            True if saved successfully, False otherwise.
        """
        try:
            # Try to find existing recording for this session
            recording = await SessionRecording.find_one(
                SessionRecording.session_id == session_id
            )
        except Exception as e:
            logger.error(f"Failed to find recording: {e}")
            return False

        if recording:
            # Append events to existing recording
            recording.events.extend(events)
            recording.events_count = len(recording.events)

            # Calculate duration from first and last event timestamps
            if recording.events:
                first_ts = recording.events[0].get("timestamp", 0)
                last_ts = recording.events[-1].get("timestamp", 0)
                recording.duration_ms = last_ts - first_ts

            if is_final:
                recording.is_complete = True
                recording.ended_at = datetime.utcnow()

            try:
                await recording.save()
            except Exception as e:
                logger.error(f"Failed to save recording: {e}")
                return False
        else:
            # Create new recording
            duration_ms = 0
            if len(events) > 1:
                first_ts = events[0].get("timestamp", 0)
                last_ts = events[-1].get("timestamp", 0)
                duration_ms = last_ts - first_ts

            recording = SessionRecording(
                session_id=session_id,
                visitor_id=visitor_id,
                experiment_id=experiment_id,
                variant_id=variant_id,
                site_id=site_id,
                url=url,
                user_agent=user_agent,
                events=events,
                events_count=len(events),
                duration_ms=duration_ms,
                is_complete=is_final,
                ended_at=datetime.utcnow() if is_final else None,
            )
            try:
                await recording.insert()
            except Exception as e:
                logger.error(f"Failed to insert recording: {e}")
                return False

        return True

    async def get_recordings_for_experiment(
        self,
        experiment_id: str,
        skip: int = 0,
        limit: int = 20,
        variant_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get recordings for an experiment with pagination.

        Args:
            experiment_id: Experiment ID.
            skip: Number of records to skip.
            limit: Maximum records to return.
            variant_id: Optional filter by variant.

        Returns:
            List of recording summaries (without events).
        """
        query = {"experiment_id": experiment_id}
        if variant_id:
            query["variant_id"] = variant_id

        recordings = (
            await SessionRecording.find(query)
            .sort([("started_at", -1)])
            .skip(skip)
            .limit(limit)
            .to_list()
        )

        return [
            {
                "id": str(r.id),
                "session_id": r.session_id,
                "visitor_id": r.visitor_id,
                "variant_id": r.variant_id,
                "url": r.url,
                "duration_ms": r.duration_ms,
                "events_count": r.events_count,
                "started_at": r.started_at,
                "is_complete": r.is_complete,
            }
            for r in recordings
        ]

    async def get_recording_by_id(
        self,
        recording_id: str,
        experiment_id: str,
    ) -> dict[str, Any] | None:
        """
        Get full recording with events.

        Args:
            recording_id: Recording document ID.
            experiment_id: Experiment ID (for access validation).

        Returns:
            Full recording data with events, or None if not found.
        """
        recording = await SessionRecording.get(recording_id)

        if not recording or recording.experiment_id != experiment_id:
            return None

        return {
            "id": str(recording.id),
            "session_id": recording.session_id,
            "visitor_id": recording.visitor_id,
            "variant_id": recording.variant_id,
            "url": recording.url,
            "events": recording.events,
            "duration_ms": recording.duration_ms,
            "events_count": recording.events_count,
            "started_at": recording.started_at,
            "ended_at": recording.ended_at,
            "is_complete": recording.is_complete,
        }


# Singleton instance
recording_service = RecordingService()
