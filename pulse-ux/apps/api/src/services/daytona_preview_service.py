"""
Daytona Preview Service for Live Variant Previews.

This service integrates with Daytona (https://daytona.io) to provide live,
interactive previews of A/B test variants. Unlike static iframe previews,
Daytona sandboxes offer:

- Full JavaScript execution context
- Real network requests and API calls
- Interactive form submissions
- Accurate representation of user experience

ARCHITECTURE:
    Frontend (DaytonaVariantPreview component)
         |
         v
    API Endpoint (POST /experiments/{id}/variants/{variant_id}/preview)
         |
         v
    DaytonaPreviewService.create_preview()
         |
         v
    Daytona Cloud (creates sandbox, starts HTTP server)
         |
         v
    Returns signed preview URL (valid for TTL)

CONFIGURATION:
    Set these environment variables to enable:
    - DAYTONA_API_KEY: Your Daytona API key (required)
    - DAYTONA_API_URL: Daytona API URL (default: https://app.daytona.io/api)

GRACEFUL DEGRADATION:
    When Daytona is not configured or unavailable:
    - is_available() returns False
    - Frontend falls back to static srcdoc iframe preview
    - No errors thrown, feature simply not available

USAGE:
    from src.services.daytona_preview_service import daytona_preview_service

    # Check availability
    if daytona_preview_service.is_available():
        session = await daytona_preview_service.create_preview(
            experiment_id="exp123",
            variant_id="var456",
            base_html="<html>...</html>",
            patches=[{"action": "text", "selector": "h1", "value": "New Title"}],
        )
        if session:
            print(f"Preview URL: {session.preview_url}")
"""

import asyncio
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any

from pydantic import BaseModel, Field

from src.config import settings

logger = logging.getLogger(__name__)


class PreviewSession(BaseModel):
    """Represents an active preview session."""

    id: str
    variant_id: str
    experiment_id: str
    preview_url: str
    sandbox_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime


class DaytonaPreviewService:
    """Service for managing Daytona-based variant previews."""

    def __init__(self):
        self._sessions: dict[str, PreviewSession] = {}
        self._daytona = None

    async def _get_daytona_client(self):
        """Lazily initialize Daytona client."""
        if self._daytona is None:
            try:
                # Dynamic import to avoid issues if SDK not installed
                from daytona_sdk import Daytona

                api_key = getattr(settings, "DAYTONA_API_KEY", None)
                api_url = getattr(settings, "DAYTONA_API_URL", "https://app.daytona.io/api")

                if not api_key:
                    logger.warning("DAYTONA_API_KEY not configured")
                    return None

                self._daytona = Daytona(
                    api_key=api_key,
                    api_url=api_url,
                    target="us",
                )
            except ImportError:
                logger.warning("Daytona SDK not installed")
                return None
            except Exception as e:
                logger.error(f"Failed to initialize Daytona client: {e}")
                return None

        return self._daytona

    def _generate_session_id(self, experiment_id: str, variant_id: str) -> str:
        """Generate a unique session ID."""
        content = f"{experiment_id}:{variant_id}:{datetime.utcnow().isoformat()}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _apply_patches_to_html(self, base_html: str, patches: list[dict]) -> str:
        """
        Generate HTML with patches pre-applied via JavaScript.

        Instead of modifying the HTML directly, we inject a script that
        applies the patches on DOMContentLoaded.
        """
        if not patches:
            return base_html

        patch_scripts = []
        for i, patch in enumerate(patches):
            action = patch.get("action", "")
            selector = patch.get("selector", "").replace("'", "\\'")
            value = (patch.get("value") or "").replace("'", "\\'").replace("\n", "\\n")
            property_name = (patch.get("property_name") or "").replace("'", "\\'")

            if action == "style":
                patch_scripts.append(f"""
                    (function() {{
                        var el = document.querySelector('{selector}');
                        if (el) el.style['{property_name}'] = '{value}';
                    }})();
                """)
            elif action == "class_add":
                patch_scripts.append(f"""
                    (function() {{
                        var el = document.querySelector('{selector}');
                        if (el) '{value}'.split(' ').forEach(function(c) {{ if(c) el.classList.add(c); }});
                    }})();
                """)
            elif action == "class_remove":
                patch_scripts.append(f"""
                    (function() {{
                        var el = document.querySelector('{selector}');
                        if (el) '{value}'.split(' ').forEach(function(c) {{ if(c) el.classList.remove(c); }});
                    }})();
                """)
            elif action == "attribute":
                patch_scripts.append(f"""
                    (function() {{
                        var el = document.querySelector('{selector}');
                        if (el) el.setAttribute('{property_name}', '{value}');
                    }})();
                """)
            elif action == "text":
                patch_scripts.append(f"""
                    (function() {{
                        var el = document.querySelector('{selector}');
                        if (el) el.textContent = '{value}';
                    }})();
                """)
            elif action == "html":
                patch_scripts.append(f"""
                    (function() {{
                        var el = document.querySelector('{selector}');
                        if (el) el.innerHTML = '{value}';
                    }})();
                """)
            elif action == "hide":
                patch_scripts.append(f"""
                    (function() {{
                        var el = document.querySelector('{selector}');
                        if (el) el.style.display = 'none';
                    }})();
                """)
            elif action == "show":
                patch_scripts.append(f"""
                    (function() {{
                        var el = document.querySelector('{selector}');
                        if (el) el.style.display = '';
                    }})();
                """)

        script_content = "\n".join(patch_scripts)
        patch_script = f"""
        <script>
            document.addEventListener('DOMContentLoaded', function() {{
                console.log('[Pulse UX Preview] Applying {len(patches)} patches');
                {script_content}
                console.log('[Pulse UX Preview] Patches applied');
            }});
        </script>
        """

        # Inject before </body> or </html> or append
        if "</body>" in base_html:
            return base_html.replace("</body>", f"{patch_script}</body>")
        elif "</html>" in base_html:
            return base_html.replace("</html>", f"{patch_script}</html>")
        else:
            return base_html + patch_script

    async def create_preview(
        self,
        experiment_id: str,
        variant_id: str,
        base_html: str,
        patches: list[dict],
        ttl_seconds: int = 3600,
    ) -> PreviewSession | None:
        """
        Create a live preview for a variant.

        Args:
            experiment_id: ID of the experiment
            variant_id: ID of the variant to preview
            base_html: Base HTML content
            patches: DOM patches to apply
            ttl_seconds: Time-to-live for the preview (default 1 hour)

        Returns:
            PreviewSession with preview URL, or None if unavailable
        """
        daytona = await self._get_daytona_client()
        if not daytona:
            logger.info("Daytona not available, cannot create live preview")
            return None

        try:
            # Generate patched HTML
            patched_html = self._apply_patches_to_html(base_html, patches)

            # Create sandbox
            logger.info(f"Creating Daytona sandbox for variant {variant_id}")
            sandbox = await asyncio.to_thread(
                daytona.create,
                language="python",
            )

            # Upload the HTML file
            html_path = "/home/daytona/preview/index.html"
            await asyncio.to_thread(
                sandbox.fs.upload_file,
                patched_html.encode(),
                html_path,
            )

            # Start a simple HTTP server
            await asyncio.to_thread(
                sandbox.process.create_session,
                "preview-server",
            )
            await asyncio.to_thread(
                sandbox.process.execute_session_command,
                "preview-server",
                {
                    "command": "cd /home/daytona/preview && python3 -m http.server 8080",
                    "runAsync": True,
                },
            )

            # Wait for server to start
            await asyncio.sleep(2)

            # Get preview URL
            preview_result = await asyncio.to_thread(
                sandbox.get_signed_preview_url,
                8080,
                ttl_seconds,
            )

            session_id = self._generate_session_id(experiment_id, variant_id)
            session = PreviewSession(
                id=session_id,
                variant_id=variant_id,
                experiment_id=experiment_id,
                preview_url=preview_result.url,
                sandbox_id=sandbox.id,
                expires_at=datetime.utcnow() + timedelta(seconds=ttl_seconds),
            )

            self._sessions[session_id] = session
            logger.info(f"Created preview session {session_id} for variant {variant_id}")

            return session

        except Exception as e:
            logger.error(f"Failed to create Daytona preview: {e}")
            return None

    async def get_preview(self, session_id: str) -> PreviewSession | None:
        """Get an existing preview session."""
        session = self._sessions.get(session_id)
        if session and session.expires_at > datetime.utcnow():
            return session
        return None

    async def delete_preview(self, session_id: str) -> bool:
        """Delete a preview session and clean up sandbox."""
        session = self._sessions.pop(session_id, None)
        if not session:
            return False

        daytona = await self._get_daytona_client()
        if daytona:
            try:
                sandbox = await asyncio.to_thread(daytona.get, session.sandbox_id)
                await asyncio.to_thread(sandbox.delete)
                logger.info(f"Deleted sandbox {session.sandbox_id}")
            except Exception as e:
                logger.warning(f"Failed to delete sandbox {session.sandbox_id}: {e}")

        return True

    async def cleanup_expired_sessions(self):
        """Clean up expired preview sessions."""
        now = datetime.utcnow()
        expired = [sid for sid, s in self._sessions.items() if s.expires_at <= now]

        for session_id in expired:
            await self.delete_preview(session_id)

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired preview sessions")

    def is_available(self) -> bool:
        """Check if Daytona preview service is configured."""
        api_key = getattr(settings, "DAYTONA_API_KEY", None)
        return bool(api_key)


# Singleton instance
daytona_preview_service = DaytonaPreviewService()
