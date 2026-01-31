"""
Firecrawl API integration for DOM scraping and screenshots.

This module provides a typed async client for interacting with Firecrawl's
scrape endpoint, supporting HTML extraction and screenshot capture.
"""

from typing import Any

import httpx
from pydantic import BaseModel, Field

from src.config import settings


class FirecrawlScrapeResult(BaseModel):
    """
    Result from a Firecrawl scrape operation.

    Attributes:
        html: Cleaned HTML content with only main content
        raw_html: Complete unmodified HTML
        markdown: Content converted to Markdown format
        screenshot: Base64-encoded screenshot or URL
        links: List of links found on the page
        metadata: Page metadata (title, description, etc.)
    """

    html: str | None = None
    raw_html: str | None = None
    markdown: str | None = None
    screenshot: str | None = None
    links: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class FirecrawlClient:
    """
    Async client for Firecrawl API v1.

    Provides methods for scraping URLs and capturing screenshots
    with proper error handling and retry logic.
    """

    BASE_URL = "https://api.firecrawl.dev/v1"

    def __init__(self, api_key: str | None = None):
        """
        Initialize the Firecrawl client.

        Args:
            api_key: Firecrawl API key. If not provided, uses settings.
        """
        self.api_key = api_key or settings.FIRECRAWL_API_KEY
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client with proper headers."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=60.0,
            )
        return self._client

    async def scrape(
        self,
        url: str,
        *,
        formats: list[str] | None = None,
        only_main_content: bool = True,
        wait_for: int = 0,
        include_screenshot: bool = False,
        full_page_screenshot: bool = False,
    ) -> FirecrawlScrapeResult:
        """
        Scrape a URL and return content in specified formats.

        Args:
            url: The URL to scrape
            formats: Output formats (html, rawHtml, markdown, links, screenshot)
            only_main_content: Whether to extract only main content
            wait_for: Milliseconds to wait for page load
            include_screenshot: Whether to capture a screenshot
            full_page_screenshot: Whether screenshot should be full page

        Returns:
            FirecrawlScrapeResult with requested content

        Raises:
            httpx.HTTPStatusError: If the API request fails
        """
        client = await self._get_client()

        if formats is None:
            formats = ["html", "markdown"]

        if include_screenshot:
            if full_page_screenshot:
                formats.append("screenshot@fullPage")
            else:
                formats.append("screenshot")

        payload = {
            "url": url,
            "formats": formats,
            "onlyMainContent": only_main_content,
            "waitFor": wait_for,
            "timeout": 30000,
        }

        response = await client.post("/scrape", json=payload)
        response.raise_for_status()

        data = response.json()

        if not data.get("success"):
            raise ValueError(f"Firecrawl scrape failed: {data.get('error', 'Unknown error')}")

        result_data = data.get("data", {})

        return FirecrawlScrapeResult(
            html=result_data.get("html"),
            raw_html=result_data.get("rawHtml"),
            markdown=result_data.get("markdown"),
            screenshot=result_data.get("screenshot"),
            links=result_data.get("links", []),
            metadata=result_data.get("metadata", {}),
        )

    async def scrape_with_screenshot(
        self,
        url: str,
        *,
        wait_for: int = 2000,
    ) -> tuple[str, str | None]:
        """
        Scrape a URL and capture a screenshot.

        Convenience method for experiment creation.

        Args:
            url: The URL to scrape
            wait_for: Milliseconds to wait for page load

        Returns:
            Tuple of (html_content, screenshot_url_or_base64)
        """
        result = await self.scrape(
            url,
            formats=["html", "rawHtml"],
            include_screenshot=True,
            full_page_screenshot=True,
            wait_for=wait_for,
        )
        return result.raw_html or result.html or "", result.screenshot

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
firecrawl_client = FirecrawlClient()
