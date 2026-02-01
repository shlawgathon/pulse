"""
Pulse UX Optimizer API - FastAPI Application Entry Point.

This module configures the FastAPI application with:
- CORS middleware for frontend communication
- Database lifecycle management
- API router registration
- Health check endpoint
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import init_db, close_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.

    Handles startup and shutdown events:
    - Startup: Initialize database connection
    - Shutdown: Close database connection
    """
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered UX optimization platform with automated A/B testing",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Configure CORS
# Note: For actuator endpoints (public API called from customer websites),
# we need to allow all origins. For dashboard endpoints, we use the configured list.
# Using allow_origins=["*"] with allow_credentials=True is not allowed by CORS spec,
# so we use a permissive policy here. In production, you may want to implement
# a custom CORS middleware that validates against registered site domains.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for actuator script to work from any site
    allow_credentials=False,  # Cannot use credentials with wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """
    Health check endpoint for load balancers and monitoring.

    Returns:
        Simple status object indicating the API is running.
    """
    return {"status": "healthy", "service": "pulse-api"}


# Import and register routers
from src.routers import auth, sites, experiments, actuator, pull_requests

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(sites.router, prefix="/api/v1/sites", tags=["Sites"])
app.include_router(experiments.router, prefix="/api/v1/experiments", tags=["Experiments"])
app.include_router(actuator.router, prefix="/api/v1/actuator", tags=["Actuator"])
app.include_router(pull_requests.router, prefix="/api/v1/pull-requests", tags=["Pull Requests"])


# Root endpoint
@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """
    Root endpoint with API information.

    Returns:
        Welcome message and documentation link.
    """
    return {
        "message": "Welcome to Pulse UX Optimizer API",
        "docs": "/docs" if settings.DEBUG else "Documentation disabled in production",
        "version": "0.1.0",
    }
