"""
Scraper worker for async URL scraping via Firecrawl.

This worker handles:
- Scraping target URLs for experiment creation
- Capturing screenshots for variants
- Extracting CSS stylesheets for theme understanding
"""

import logging
import re
from urllib.parse import urljoin

import httpx

from src.integrations.firecrawl import firecrawl_client

logger = logging.getLogger(__name__)


async def extract_css_from_html(html: str, base_url: str) -> str:
    """
    Extract CSS from HTML - both inline styles and external stylesheets.
    
    Args:
        html: HTML content
        base_url: Base URL for resolving relative stylesheet links
        
    Returns:
        Combined CSS content (truncated to reasonable size)
    """
    css_parts = []
    
    # Extract inline <style> blocks
    style_pattern = r'<style[^>]*>(.*?)</style>'
    inline_styles = re.findall(style_pattern, html, re.DOTALL | re.IGNORECASE)
    for style in inline_styles:
        css_parts.append(f"/* Inline style */\n{style.strip()}")
    
    # Extract external stylesheet links
    link_pattern = r'<link[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']stylesheet["\']|<link[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)["\']'
    links = re.findall(link_pattern, html, re.IGNORECASE)
    
    # Flatten and filter valid links
    stylesheet_urls = []
    for match in links:
        url = match[0] or match[1]
        if url:
            # Resolve relative URLs
            full_url = urljoin(base_url, url)
            stylesheet_urls.append(full_url)
    
    # Fetch external stylesheets (limit to first 3 to avoid timeout)
    async with httpx.AsyncClient(timeout=10.0) as client:
        for css_url in stylesheet_urls[:3]:
            try:
                logger.info(f"Fetching CSS: {css_url}")
                response = await client.get(css_url)
                if response.status_code == 200:
                    css_content = response.text
                    # Truncate individual CSS files if too large
                    if len(css_content) > 20000:
                        css_content = css_content[:20000] + "\n/* CSS truncated... */"
                    css_parts.append(f"/* External: {css_url} */\n{css_content}")
            except Exception as e:
                logger.warning(f"Failed to fetch CSS {css_url}: {e}")
    
    # Combine all CSS
    combined_css = "\n\n".join(css_parts)
    
    # Truncate if too large (keep to ~30KB)
    max_css_length = 30000
    if len(combined_css) > max_css_length:
        combined_css = combined_css[:max_css_length] + "\n/* CSS truncated for context window... */"
    
    return combined_css


async def scrape_url(url: str, include_screenshot: bool = True) -> dict:
    """
    Scrape a URL and optionally capture a screenshot.

    Args:
        url: URL to scrape
        include_screenshot: Whether to capture a screenshot

    Returns:
        Dict with 'html', 'css', 'screenshot' and 'metadata' keys
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

        html = result.raw_html or result.html or ""
        html_len = len(html)
        
        # Extract CSS from the HTML
        css = await extract_css_from_html(html, url)
        css_len = len(css)
        
        logger.info(f"✅ Firecrawl scrape SUCCESS: {url} - HTML: {html_len} chars, CSS: {css_len} chars, screenshot: {'yes' if result.screenshot else 'no'}")

        return {
            "html": html,
            "css": css,
            "screenshot": result.screenshot,
            "metadata": result.metadata,
        }
    except Exception as e:
        logger.error(f"❌ Firecrawl scrape FAILED for {url}: {e}")
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
