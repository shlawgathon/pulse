"""
Scraper worker for async URL scraping via Firecrawl.

This worker handles:
- Scraping target URLs for experiment creation
- Capturing screenshots for variants
"""

import logging

from src.integrations.firecrawl import firecrawl_client

logger = logging.getLogger(__name__)


async def scrape_url(url: str, include_screenshot: bool = True) -> dict:
    """
    Scrape a URL and optionally capture a screenshot.

    Args:
        url: URL to scrape
        include_screenshot: Whether to capture a screenshot

    Returns:
        Dict with 'html' and optionally 'screenshot' keys
    """
    logger.info(f"Scraping URL: {url}")

    try:
        result = await firecrawl_client.scrape(
            url,
            formats=["html", "rawHtml"],
            include_screenshot=include_screenshot,
            full_page_screenshot=True,
            wait_for=2000,
        )

        return {
            "html": result.raw_html or result.html or "",
            "screenshot": result.screenshot,
            "metadata": result.metadata,
        }
    except Exception as e:
        logger.error(f"Failed to scrape {url}: {e}")
        raise


async def capture_screenshot(url: str) -> str | None:
    """
    Capture a screenshot of a URL.

    Args:
        url: URL to capture

    Returns:
        Screenshot URL or base64 data, or None on failure
    """
    logger.info(f"Capturing screenshot: {url}")

    try:
        result = await firecrawl_client.scrape(
            url,
            formats=["screenshot"],
            include_screenshot=True,
            full_page_screenshot=True,
            wait_for=2000,
        )

        return result.screenshot
    except Exception as e:
        logger.error(f"Failed to capture screenshot for {url}: {e}")
        return None
