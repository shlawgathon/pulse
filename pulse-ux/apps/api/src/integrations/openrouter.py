"""
OpenRouter API integration for Claude Opus 4.5 LLM calls.

This module provides structured output generation for UX patches
and code transformations using OpenRouter's OpenAI-compatible API.
"""

import json
from typing import TypeVar

import httpx
from pydantic import BaseModel

from src.config import settings

T = TypeVar("T", bound=BaseModel)


class OpenRouterClient:
    """
    Async client for OpenRouter API using Claude Opus 4.5.

    Provides methods for chat completions with structured output
    enforcement using JSON schemas.
    """

    BASE_URL = "https://openrouter.ai/api/v1"
    MODEL = "moonshotai/kimi-k2.5"  # Multimodal model with vision support

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

        payload = {
            "model": self.MODEL,
            "messages": enhanced_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            # Note: reasoning disabled as some providers don't support it
        }

        response = await client.post("/chat/completions", json=payload)
        response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"].get("content")
        
        # Debug: print raw response
        print(f"📥 LLM raw content type: {type(content)}, length: {len(content) if content else 0}")
        if not content:
            print(f"⚠️ LLM response has no content! Full message: {data['choices'][0]['message']}")
            raise ValueError(f"LLM returned empty content. Full response: {data}")

        # Clean up any markdown code blocks
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        print(f"📋 Cleaned content (first 500 chars): {content[:500]}")

        try:
            result = response_model.model_validate_json(content)
            print(f"✅ Parsed response successfully")
            return result
        except Exception as e:
            print(f"❌ Schema validation failed: {e}")
            print(f"❌ Content was: {content[:1000]}")
            raise ValueError(f"LLM response failed schema validation: {e}\nResponse: {content}")

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
openrouter_client = OpenRouterClient()
