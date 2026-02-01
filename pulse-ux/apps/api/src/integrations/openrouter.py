"""
OpenRouter API integration for Claude Opus 4.5 LLM calls.

This module provides structured output generation for UX patches
and code transformations using OpenRouter's OpenAI-compatible API.
"""

import asyncio
import json
import logging
from typing import TypeVar

import httpx
from pydantic import BaseModel

from src.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class OpenRouterClient:
    """
    Async client for OpenRouter API using Claude Opus 4.5.

    Provides methods for chat completions with structured output
    enforcement using JSON schemas.
    """

    BASE_URL = "https://openrouter.ai/api/v1"
    PRIMARY_MODEL = "moonshotai/kimi-k2.5"  # Multimodal model with vision support
    FALLBACK_MODEL = "anthropic/claude-sonnet-4"  # Fallback for empty responses
    MODEL = PRIMARY_MODEL  # Current model (for compatibility)
    
    # Preferred providers for Kimi model (more reliable than Novita)
    PREFERRED_PROVIDERS = ["Fireworks", "Moonshot", "Together"]

    def __init__(self, api_key: str | None = None):
        """
        Initialize the OpenRouter client.

        Args:
            api_key: OpenRouter API key. If not provided, uses settings.
        """
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client with proper headers."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": settings.APP_URL,
                    "X-Title": "Pulse UX Optimizer",
                },
                timeout=120.0,
            )
        return self._client

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """
        Send a chat completion request and return the response text.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response

        Returns:
            The assistant's response text
        """
        client = await self._get_client()

        payload = {
            "model": self.MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "provider": {
                "order": self.PREFERRED_PROVIDERS,
                "allow_fallbacks": True,
            },
        }

        response = await client.post("/chat/completions", json=payload)
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def chat_completion_structured(
        self,
        messages: list[dict],
        response_model: type[T],
        *,
        temperature: float = 0.3,
        max_tokens: int = 8192,
        image_url: str | None = None,
    ) -> T:
        """
        Send a chat completion request with structured output enforcement.

        Args:
            messages: List of message dicts with 'role' and 'content'
            response_model: Pydantic model class for response validation
            temperature: Sampling temperature (lower for more deterministic)
            max_tokens: Maximum tokens in response
            image_url: Optional URL of an image to include for vision models

        Returns:
            Instance of response_model populated with LLM response

        Raises:
            ValueError: If LLM response doesn't match schema
        """
        client = await self._get_client()

        schema = response_model.model_json_schema()

        system_instruction = (
            "You must respond with valid JSON matching this schema:\n"
            f"```json\n{json.dumps(schema, indent=2)}\n```\n"
            "Respond ONLY with the JSON object, no additional text or markdown."
        )

        # Build enhanced messages with optional image support
        enhanced_messages = [
            {"role": "system", "content": system_instruction},
        ]

        # Process messages, adding image to user messages if provided
        for msg in messages:
            if image_url and msg.get("role") == "user":
                # Use vision format: content as array with text and image
                enhanced_messages.append({
                    "role": "user",
                    "content": [
                        {"type": "text", "text": msg["content"]},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                })
            else:
                enhanced_messages.append(msg)

        # Try with primary model first, then fallback
        models_to_try = [
            (self.PRIMARY_MODEL, 2),  # (model, max_retries)
            (self.FALLBACK_MODEL, 1),
        ]

        last_error = None
        empty_response_count = 0
        models_tried = []

        for model, max_retries in models_to_try:
            models_tried.append(model)
            for attempt in range(max_retries):
                try:
                    content = await self._try_completion(
                        client, model, enhanced_messages, temperature, max_tokens
                    )
                    
                    if content:
                        # Parse and return the response
                        return self._parse_structured_response(content, response_model)
                    
                    # Empty content - retry or fallback
                    empty_response_count += 1
                    logger.warning(f"Empty response from {model} (attempt {attempt + 1}/{max_retries}), total empty: {empty_response_count}")
                    
                    if attempt < max_retries - 1:
                        # Wait before retry with exponential backoff
                        await asyncio.sleep(2 ** attempt)
                        
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error from {model}: {e}")
                    last_error = str(e)
                    break  # Move to fallback model on HTTP errors
                except ValueError as e:
                    # Schema validation error - don't retry, it won't help
                    raise

            # Log fallback
            if model == self.PRIMARY_MODEL:
                logger.warning(f"⚠️ Primary model {self.PRIMARY_MODEL} exhausted, trying fallback {self.FALLBACK_MODEL}")

        error_msg = f"All models failed. Tried: {models_tried}. Empty responses: {empty_response_count}. Last HTTP error: {last_error}"
        logger.error(f"❌ {error_msg}")
        raise ValueError(error_msg)

    async def _try_completion(
        self,
        client: httpx.AsyncClient,
        model: str,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
    ) -> str | None:
        """
        Attempt a single completion call to a specific model.
        
        Returns the content string or None if empty.
        """
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "provider": {
                "order": self.PREFERRED_PROVIDERS,
                "allow_fallbacks": True,
            },
        }

        logger.info(f"🤖 Calling {model}...")
        response = await client.post("/chat/completions", json=payload)
        response.raise_for_status()

        data = response.json()
        
        # Handle different response structures
        try:
            choices = data.get("choices", [])
            if not choices:
                logger.warning(f"⚠️ {model} returned no choices: {data}")
                return None
            
            message = choices[0].get("message", {})
            content = message.get("content")
            
            # Sometimes content can be None or an empty string
            if content is None:
                logger.warning(f"⚠️ {model} returned None content, message: {message}")
                return None
                
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"❌ Unexpected response structure from {model}: {e}, data: {str(data)[:500]}")
            return None
        
        logger.info(f"📥 {model} response: {len(content) if content else 0} chars")
        
        if not content:
            logger.warning(f"⚠️ {model} returned empty content")
            return None
            
        return content

    def _parse_structured_response(self, content: str, response_model: type[T]) -> T:
        """
        Parse and validate the structured response from LLM content.
        """
        # Clean up any markdown code blocks
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        logger.debug(f"📋 Parsing content ({len(content)} chars)")

        try:
            result = response_model.model_validate_json(content)
            logger.info(f"✅ Parsed response successfully")
            return result
        except Exception as e:
            logger.error(f"❌ Schema validation failed: {e}")
            logger.error(f"❌ Content was: {content[:1000]}")
            raise ValueError(f"LLM response failed schema validation: {e}\nResponse: {content}")


    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
openrouter_client = OpenRouterClient()
