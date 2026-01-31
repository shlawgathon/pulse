"""
Resend API integration for email notifications.

This module provides email sending functionality for notifications
about experiment completion, PR creation, and other events.
"""

import httpx

from src.config import settings


class ResendClient:
    """
    Async client for Resend email API.

    Provides methods for sending transactional emails.
    """

    BASE_URL = "https://api.resend.com"

    def __init__(self, api_key: str | None = None):
        """
        Initialize the Resend client.

        Args:
            api_key: Resend API key. If not provided, uses settings.
        """
        self.api_key = api_key or settings.RESEND_API_KEY
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def send_email(
        self,
        to: str | list[str],
        subject: str,
        html: str,
        *,
        from_email: str = "Pulse UX <onboarding@resend.dev>",
        text: str | None = None,
        reply_to: str | None = None,
    ) -> dict:
        """
        Send an email via Resend.

        Args:
            to: Recipient email address(es)
            subject: Email subject line
            html: HTML content of the email
            from_email: Sender email address
            text: Plain text version (optional)
            reply_to: Reply-to address (optional)

        Returns:
            API response with email ID
        """
        client = await self._get_client()

        payload = {
            "from": from_email,
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "html": html,
        }

        if text:
            payload["text"] = text
        if reply_to:
            payload["reply_to"] = reply_to

        response = await client.post("/emails", json=payload)
        response.raise_for_status()

        return response.json()

    async def send_experiment_ready(
        self,
        to: str,
        experiment_name: str,
        experiment_url: str,
    ) -> dict:
        """
        Send notification that an experiment is ready for review.

        Args:
            to: Recipient email address
            experiment_name: Name of the experiment
            experiment_url: URL to view the experiment

        Returns:
            API response
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #000; color: #fff; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .button {{ display: inline-block; background: #84cc16; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Pulse UX Optimizer</h1>
                </div>
                <div class="content">
                    <h2>Your experiment is ready!</h2>
                    <p>Great news! The variants for <strong>{experiment_name}</strong> have been generated and are ready for your review.</p>
                    <p>Click the button below to compare variants and select a winner.</p>
                    <a href="{experiment_url}" class="button">View Experiment</a>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(
            to=to,
            subject=f"Experiment Ready: {experiment_name}",
            html=html,
        )

    async def send_pr_created(
        self,
        to: str,
        experiment_name: str,
        pr_url: str,
        pr_number: int,
    ) -> dict:
        """
        Send notification that a PR has been created.

        Args:
            to: Recipient email address
            experiment_name: Name of the experiment
            pr_url: URL to the GitHub PR
            pr_number: PR number

        Returns:
            API response
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #000; color: #fff; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .button {{ display: inline-block; background: #84cc16; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Pulse UX Optimizer</h1>
                </div>
                <div class="content">
                    <h2>Pull Request Created!</h2>
                    <p>A Pull Request has been created for <strong>{experiment_name}</strong>.</p>
                    <p>PR #{pr_number} is ready for review. The changes from your winning variant have been converted to code.</p>
                    <a href="{pr_url}" class="button">View Pull Request</a>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(
            to=to,
            subject=f"PR Created: {experiment_name} (#{pr_number})",
            html=html,
        )

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
resend_client = ResendClient()
