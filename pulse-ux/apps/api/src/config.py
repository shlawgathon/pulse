"""
Application configuration using Pydantic Settings.

All configuration is loaded from environment variables with sensible defaults
for development. Production deployments should set all required variables.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Attributes:
        APP_NAME: Application name for logging and headers
        APP_URL: Public URL of the application (used in emails, OAuth callbacks)
        DEBUG: Enable debug mode (more verbose logging, development features)

        DATABASE_URL: MongoDB Atlas connection string
        REDIS_URL: Redis connection string for caching and job queues

        JWT_SECRET: Secret key for signing JWT tokens (must be kept secret)
        JWT_ALGORITHM: Algorithm for JWT encoding (default: HS256)
        ACCESS_TOKEN_EXPIRE_MINUTES: Access token lifetime in minutes
        REFRESH_TOKEN_EXPIRE_DAYS: Refresh token lifetime in days

        FIRECRAWL_API_KEY: Firecrawl API key for DOM scraping
        OPENROUTER_API_KEY: OpenRouter API key for Claude Opus 4.5
        RESEND_API_KEY: Resend API key for email notifications

        CORS_ORIGINS: Comma-separated list of allowed CORS origins
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra env vars not defined in the model
    )

    # Application
    APP_NAME: str = "Pulse UX Optimizer"
    APP_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "mongodb://localhost:27017/pulse"
    REDIS_URL: str = "redis://localhost:6379"

    # Authentication
    JWT_SECRET: str = "change-me-in-production-use-a-secure-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # External Services
    FIRECRAWL_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    RESEND_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Uses lru_cache to ensure settings are only loaded once per process.
    """
    return Settings()


# Global settings instance for convenience
settings = get_settings()
