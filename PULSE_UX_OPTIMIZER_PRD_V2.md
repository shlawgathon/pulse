# Pulse UX Optimizer — Technical Specification & Implementation Plan

**Document Version:** 2.0.0  
**Last Updated:** January 31, 2026  
**Authors:** Engineering Team  
**Status:** Draft for Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Architecture Overview](#3-architecture-overview)
4. [System Architecture Diagram](#4-system-architecture-diagram)
5. [Technology Stack](#5-technology-stack)
6. [Data Models](#6-data-models)
7. [API Specification](#7-api-specification)
8. [Frontend Implementation](#8-frontend-implementation)
9. [Backend Implementation](#9-backend-implementation)
10. [Injector Script ("Actuator")](#10-injector-script-actuator)
11. [AI/LLM Integration](#11-aillm-integration)
12. [Third-Party Service Integrations](#12-third-party-service-integrations)
13. [Security Considerations](#13-security-considerations)
14. [Deployment Strategy](#14-deployment-strategy)
15. [Development Milestones](#15-development-milestones)
16. [Appendix](#16-appendix)

---

## 1. Executive Summary

**Pulse UX Optimizer** is an AI-powered platform that automates A/B testing for UX improvements. The system enables developers and product teams to:

1. **Generate UX variants** using LLM via OpenRouter (currently Moonshot Kimi K2.5), informed by live DOM scraping via Firecrawl
2. **Deploy runtime experiments** without code deployments using an injected "actuator" script
3. **Record user sessions** automatically via rrweb for qualitative analysis of each variant
4. **Compare variants side-by-side** with visual diff rendering and AI-generated insights
5. **Watch session replays** to understand real user behavior per variant
6. **Choose winning variants** through an intuitive dashboard interface
7. **Generate Pull Requests** automatically to codify the winning variant into the codebase

The platform addresses the critical gap in the original Honch implementation plan: the translation layer between runtime DOM patches and actual source code changes suitable for version control.

---

## 2. Product Vision & Goals

### 2.1 Problem Statement

Traditional A/B testing requires significant engineering effort to implement, deploy, and maintain test variants. Teams often face:

1. Long iteration cycles between ideation and live testing
2. Manual work to translate successful experiments into production code
3. Lack of AI-assisted UX optimization suggestions
4. Fragmented tooling across analytics, experimentation, and deployment

### 2.2 Solution

Pulse UX Optimizer provides an end-to-end workflow that:

1. Scrapes the current live DOM using Firecrawl to understand the existing UI structure
2. Leverages LLM via OpenRouter (currently Moonshot Kimi K2.5) to generate semantically valid UX patches
3. Deploys patches at runtime via an injected script without requiring code deployments
4. Captures screenshots and session data for side-by-side comparison
5. Enables human decision-making through visual comparison UI
6. Generates production-ready PRs via GitHub integration when a variant wins

### 2.3 Key Success Metrics

1. **Time-to-experiment:** < 5 minutes from ideation to live A/B test
2. **Patch success rate:** > 95% of generated patches apply without errors
3. **PR acceptance rate:** > 80% of generated PRs pass code review
4. **User satisfaction:** NPS > 50 among beta users

---

## 3. Architecture Overview

The system consists of five primary components:

### 3.1 Frontend (Next.js 16 + React 19 + shadcn/ui)

The web dashboard deployed on Vercel providing:

1. Site registration and management
2. Experiment creation and monitoring
3. Side-by-side variant comparison UI
4. PR generation triggers and status tracking
5. User authentication and team management

**Design System:** Detail.dev-inspired aesthetic with dark mode landing page, clean light dashboard, bold typography, green accent colors, and angular/diagonal design motifs.

### 3.2 Backend (FastAPI + Python + uv)

The API server deployed on Railway providing:

1. RESTful API endpoints for all frontend operations
2. Background job orchestration (experiment execution, PR generation)
3. Webhook handlers for external services
4. WebSocket connections for real-time updates

### 3.3 Database (MongoDB Atlas)

Document store for:

1. User accounts and authentication (password-based initially)
2. Site configurations and credentials
3. Experiment definitions and patch schemas
4. Variant assignments and session data
5. Audit logs and analytics

### 3.4 Actuator Script (JavaScript)

Lightweight script injected into customer sites:

1. Fetches active experiments from the backend
2. Applies DOM patches based on variant assignment
3. Tracks interactions and sends events
4. Handles SPA navigation and hydration

### 3.5 AI Pipeline (LLM via OpenRouter)

LLM-powered services for:

1. UX improvement suggestions based on DOM analysis
2. Patch generation in strict JSON schema
3. Code transformation for PR generation
4. Natural language experiment descriptions

---

## 4. System Architecture Diagram

```mermaid
flowchart TB
    subgraph "Customer Website"
        CW[Customer Site]
        AS[Actuator Script]
        CW --> AS
    end

    subgraph "Vercel (Frontend)"
        FE[Next.js 16 App<br>+ shadcn/ui]
        subgraph "Pages"
            LAND[Landing Page<br>Dark Theme]
            DASH[Dashboard<br>Light Theme]
            EXP[Experiment Manager]
            COMP[Side-by-Side Comparison]
            PR[PR Generator]
        end
        FE --> LAND
        FE --> DASH
        FE --> EXP
        FE --> COMP
        FE --> PR
    end

    subgraph "Railway (Backend)"
        API[FastAPI Server<br>Python + uv]
        subgraph "Services"
            AUTH[Auth Service<br>MongoDB Users]
            SITE[Site Service]
            EXPS[Experiment Service]
            PATCH[Patch Service]
            PRGEN[PR Generator Service]
            NOTIFY[Notification Service]
        end
        subgraph "Workers"
            SCR[Scraper Worker]
            LLM[LLM Worker]
            SS[Screenshot Worker]
        end
        API --> AUTH
        API --> SITE
        API --> EXPS
        API --> PATCH
        API --> PRGEN
        API --> NOTIFY
        API --> SCR
        API --> LLM
        API --> SS
    end

    subgraph "MongoDB Atlas"
        DB[(MongoDB)]
        subgraph "Collections"
            USERS[users]
            SITES[sites]
            EXPER[experiments]
            VAR[variants]
            ASSIGN[assignments]
            EVENTS[events]
            PRS[pull_requests]
        end
        DB --> USERS
        DB --> SITES
        DB --> EXPER
        DB --> VAR
        DB --> ASSIGN
        DB --> EVENTS
        DB --> PRS
    end

    subgraph "External Services"
        FC[Firecrawl API]
        OR[OpenRouter API<br>Kimi K2.5]
        GH[GitHub API<br>Future: OAuth]
        RS[Resend API]
    end

    %% Connections
    AS <-->|"Fetch experiments<br>Send events"| API
    FE <-->|"REST API<br>WebSocket"| API
    API <--> DB
    SCR --> FC
    LLM --> OR
    PRGEN --> GH
    NOTIFY --> RS

    classDef frontend fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef backend fill:#10b981,stroke:#047857,color:#fff
    classDef database fill:#f59e0b,stroke:#b45309,color:#fff
    classDef external fill:#8b5cf6,stroke:#5b21b6,color:#fff
    classDef customer fill:#ef4444,stroke:#b91c1c,color:#fff

    class FE,LAND,DASH,EXP,COMP,PR frontend
    class API,AUTH,SITE,EXPS,PATCH,PRGEN,NOTIFY,SCR,LLM,SS backend
    class DB,USERS,SITES,EXPER,VAR,ASSIGN,EVENTS,PRS database
    class FC,OR,GH,RS external
    class CW,AS customer
```

### 4.1 Data Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Dashboard)
    participant FE as Frontend (Next.js)
    participant API as Backend (FastAPI)
    participant DB as MongoDB
    participant FC as Firecrawl
    participant OR as OpenRouter (Claude)
    participant AS as Actuator Script
    participant CW as Customer Website
    participant GH as GitHub

    Note over U,GH: Authentication Flow (MongoDB-based)
    U->>FE: Enter email + password
    FE->>API: POST /api/auth/login
    API->>DB: Verify credentials (bcrypt)
    DB-->>API: User document
    API-->>FE: JWT token + user data
    FE-->>U: Redirect to dashboard

    Note over U,GH: Experiment Creation Flow
    U->>FE: Create experiment for URL
    FE->>API: POST /api/experiments
    API->>DB: Save experiment (status: pending)
    API->>FC: Scrape URL (formats: html, screenshot)
    FC-->>API: Return HTML + screenshot
    API->>OR: Generate UX patches (structured output)
    OR-->>API: Return JSON patches
    API->>DB: Save variants with patches
    API-->>FE: Return experiment with variants
    FE-->>U: Show variant previews

    Note over U,GH: Runtime Experimentation Flow
    U->>FE: Activate experiment
    FE->>API: PATCH /api/experiments/{id}/activate
    API->>DB: Update status to 'active'
    
    CW->>AS: Page load
    AS->>API: GET /api/experiments/active?site_id=X
    API->>DB: Query active experiments
    DB-->>API: Return experiments + patches
    API-->>AS: Return assigned variant
    AS->>CW: Apply DOM patches
    AS->>API: POST /api/events (impression)

    Note over U,GH: Comparison & PR Generation Flow
    U->>FE: View side-by-side comparison
    FE->>API: GET /api/experiments/{id}/comparison
    API->>FC: Capture screenshots (both variants)
    FC-->>API: Return screenshot URLs
    API-->>FE: Return comparison data
    FE-->>U: Display side-by-side UI

    U->>FE: Select winning variant
    FE->>API: POST /api/experiments/{id}/winner
    API->>DB: Mark winner
    API->>OR: Generate code changes
    OR-->>API: Return AST-aware edits
    API->>GH: Create branch + PR
    GH-->>API: Return PR URL
    API->>DB: Save PR reference
    API-->>FE: Return PR URL
    FE-->>U: Show PR link
```

---

## 5. Technology Stack

### 5.1 Frontend

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| Framework | Next.js | 16.x | Latest App Router with React 19 support, server components, and Vercel optimization |
| UI Library | React | 19.x | Latest concurrent features, improved Suspense |
| Component Library | **shadcn/ui** | Latest | Beautiful, accessible, customizable components built on Radix UI |
| Styling | Tailwind CSS | 4.x | Utility-first CSS, excellent DX, shadcn/ui requirement |
| State | Zustand | 5.x | Lightweight, TypeScript-first state management |
| Forms | React Hook Form + Zod | 7.x | shadcn/ui Form component integration |
| Data Fetching | TanStack Query | 5.x | Server state management with caching |
| Charts | Recharts | 2.x | shadcn/ui Chart component integration |
| Icons | Lucide React | Latest | shadcn/ui default icon library |
| Package Manager | **Bun** | 1.x | Fast all-in-one JavaScript runtime and package manager |

### 5.2 Backend

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| Framework | FastAPI | 0.115.x | High-performance async Python framework |
| Python | Python | 3.12.x | Latest stable with performance improvements |
| Package Manager | **uv** | 0.5.x | Extremely fast Python package manager (Rust-based) |
| ASGI Server | Uvicorn | 0.34.x | Lightning-fast ASGI server |
| Validation | Pydantic | 2.x | Data validation with JSON Schema export |
| ODM | Motor + Beanie | 1.x | Async MongoDB ODM |
| Background Jobs | ARQ | 0.26.x | Redis-backed async task queue |
| Password Hashing | Passlib + bcrypt | Latest | Secure password hashing |
| JWT | python-jose | 3.x | JWT token handling |

### 5.3 Database

| Component | Technology | Justification |
|-----------|------------|---------------|
| Primary | MongoDB Atlas | Document flexibility for dynamic patch schemas, user auth storage |
| Cache | Redis | Session storage, job queue, real-time pub/sub |

### 5.4 External Services

| Service | Purpose | Documentation |
|---------|---------|---------------|
| Firecrawl | DOM scraping, screenshots | https://docs.firecrawl.dev |
| OpenRouter | LLM access (currently Kimi K2.5) | https://openrouter.ai/docs |
| Resend | Transactional email | https://resend.com/docs |
| GitHub | Repository integration, PR creation | https://docs.github.com |

---

## 6. Data Models

### 6.1 MongoDB Collections

#### 6.1.1 Users Collection (Authentication)

```python
"""
User account model for MongoDB-based authentication.

This model stores user credentials and profile information
for the initial password-based authentication system.
GitHub OAuth integration is planned for future releases.
"""
from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field, EmailStr


class User(Document):
    """
    Represents a registered user account.
    
    Attributes:
        email: User's email address (unique identifier for login)
        password_hash: bcrypt-hashed password (never store plaintext)
        name: User's display name
        avatar_url: Optional URL to user's avatar image
        organization_name: Name of user's organization (shown in sidebar)
        is_active: Whether the account is active
        is_verified: Whether email has been verified
        created_at: Timestamp when account was created
        updated_at: Timestamp of last profile update
        last_login_at: Timestamp of most recent login
    """
    email: EmailStr = Field(..., unique=True)
    password_hash: str = Field(...)
    name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(default=None)
    organization_name: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)

    class Settings:
        name = "users"
        indexes = [
            "email",
        ]


class RefreshToken(Document):
    """
    Stores refresh tokens for JWT authentication.
    
    Attributes:
        user_id: Reference to the User document
        token_hash: SHA-256 hash of the refresh token
        expires_at: When this token expires
        created_at: When this token was issued
        revoked_at: When this token was revoked (if applicable)
    """
    user_id: str = Field(...)
    token_hash: str = Field(...)
    expires_at: datetime = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked_at: Optional[datetime] = Field(default=None)

    class Settings:
        name = "refresh_tokens"
        indexes = [
            "user_id",
            "token_hash",
            {"keys": [("expires_at", 1)], "expireAfterSeconds": 0},  # Auto-delete expired
        ]
```

#### 6.1.2 Sites Collection

```python
"""
Site configuration representing a customer's registered website.

This model stores the connection details, authentication credentials,
and configuration for sites where experiments can be deployed.
"""
from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class Site(Document):
    """
    Represents a registered website where experiments can be deployed.
    
    Attributes:
        name: Human-readable site identifier (e.g., "Personal-Site")
        domain: The primary domain where the actuator script is installed
        owner_id: Reference to the user who registered this site
        public_key: Non-secret key embedded in the actuator script for identification
        allowed_origins: List of origins permitted to serve experiments (CORS)
        github_repo: Optional GitHub repository URL for PR generation
        github_pat: GitHub Personal Access Token (encrypted, for initial implementation)
        created_at: Timestamp when the site was registered
        updated_at: Timestamp of last modification
        is_active: Whether experiments can be deployed to this site
    """
    name: str = Field(..., min_length=1, max_length=100)
    domain: str = Field(..., pattern=r'^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$')
    owner_id: str = Field(...)
    public_key: str = Field(...)
    allowed_origins: list[str] = Field(default_factory=list)
    github_repo: Optional[str] = Field(default=None)
    github_pat: Optional[str] = Field(default=None)  # Encrypted PAT for initial implementation
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

    class Settings:
        name = "sites"
        indexes = [
            "owner_id",
            "domain",
            "public_key",
        ]
```

#### 6.1.3 Experiments Collection

```python
"""
Experiment definition and lifecycle management.

Experiments represent A/B tests that compare different UX variants
on a specific URL pattern within a registered site.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from beanie import Document
from pydantic import Field


class ExperimentStatus(str, Enum):
    """Lifecycle states for an experiment."""
    DRAFT = "draft"           # Initial creation, variants being generated
    PENDING = "pending"       # Variants ready, awaiting activation
    ACTIVE = "active"         # Live and collecting data
    PAUSED = "paused"         # Temporarily stopped
    COMPLETED = "completed"   # Winner selected
    ARCHIVED = "archived"     # Removed from active consideration


class Experiment(Document):
    """
    Represents an A/B test experiment targeting a specific URL pattern.
    
    Attributes:
        site_id: Reference to the parent Site document
        name: Human-readable experiment name
        description: Detailed description of the experiment's purpose
        url_pattern: Regex pattern matching URLs where this experiment applies
        target_url: The specific URL used for initial scraping and variant generation
        status: Current lifecycle state
        traffic_allocation: Percentage of traffic to include in experiment (0-100)
        created_by: User ID who created this experiment
        created_at: Timestamp of creation
        updated_at: Timestamp of last modification
        started_at: When the experiment was first activated
        ended_at: When the experiment was completed or archived
        winner_variant_id: Reference to the winning Variant document
        base_html_snapshot: Original HTML captured at experiment creation
        base_screenshot_url: Screenshot of original page state
    """
    site_id: str = Field(...)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    url_pattern: str = Field(...)
    target_url: str = Field(...)
    status: ExperimentStatus = Field(default=ExperimentStatus.DRAFT)
    traffic_allocation: int = Field(default=100, ge=0, le=100)
    created_by: str = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    ended_at: Optional[datetime] = Field(default=None)
    winner_variant_id: Optional[str] = Field(default=None)
    base_html_snapshot: Optional[str] = Field(default=None)
    base_screenshot_url: Optional[str] = Field(default=None)

    class Settings:
        name = "experiments"
        indexes = [
            "site_id",
            "status",
            ("site_id", "status"),
            "created_by",
        ]
```

#### 6.1.4 Variants Collection

```python
"""
Variant definitions containing the DOM patches to apply.

Each variant represents a specific UX modification that can be
A/B tested against the control and other variants.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from beanie import Document
from pydantic import BaseModel, Field


class PatchAction(str, Enum):
    """Allowed DOM modification actions."""
    STYLE = "style"           # Modify CSS properties
    CLASS_ADD = "class_add"   # Add CSS classes
    CLASS_REMOVE = "class_remove"  # Remove CSS classes
    ATTRIBUTE = "attribute"   # Set/modify attributes
    TEXT = "text"             # Change text content
    HTML = "html"             # Replace innerHTML (use sparingly)
    HIDE = "hide"             # Set display: none
    SHOW = "show"             # Set display: block/flex/etc


class DOMPatch(BaseModel):
    """
    A single DOM modification instruction.
    
    Attributes:
        action: The type of DOM modification to perform
        selector: CSS selector targeting the element(s) to modify
        value: The value to apply (interpretation depends on action)
        property_name: For style/attribute actions, the specific property
    """
    action: PatchAction = Field(...)
    selector: str = Field(..., min_length=1, max_length=500)
    value: str = Field(..., max_length=5000)
    property_name: Optional[str] = Field(default=None, max_length=100)


class Variant(Document):
    """
    Represents a specific UX variant within an experiment.
    
    Attributes:
        experiment_id: Reference to the parent Experiment
        name: Human-readable variant name (e.g., "Red CTA Button")
        description: AI-generated or human description of changes
        is_control: Whether this is the control variant (no changes)
        patches: List of DOM modifications to apply
        screenshot_url: Screenshot showing this variant applied
        impressions: Count of unique visitors who saw this variant
        conversions: Count of successful conversions (if tracking enabled)
        created_at: Timestamp of creation
    """
    experiment_id: str = Field(...)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    is_control: bool = Field(default=False)
    patches: list[DOMPatch] = Field(default_factory=list)
    screenshot_url: Optional[str] = Field(default=None)
    impressions: int = Field(default=0)
    conversions: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "variants"
        indexes = [
            "experiment_id",
            ("experiment_id", "is_control"),
        ]
```

#### 6.1.5 Assignments Collection

```python
"""
Visitor-to-variant assignments ensuring sticky bucketing.

This collection tracks which variant each visitor has been assigned
to ensure consistent experience across sessions.
"""
from datetime import datetime
from beanie import Document
from pydantic import Field


class Assignment(Document):
    """
    Maps a visitor to their assigned variant for sticky bucketing.
    
    Attributes:
        experiment_id: Reference to the Experiment
        visitor_key: Stable identifier for the visitor (cookie/fingerprint hash)
        variant_id: Reference to the assigned Variant
        assigned_at: Timestamp when assignment was made
        last_seen_at: Timestamp of most recent activity
    """
    experiment_id: str = Field(...)
    visitor_key: str = Field(..., min_length=1, max_length=100)
    variant_id: str = Field(...)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "assignments"
        indexes = [
            ("experiment_id", "visitor_key"),  # Unique lookup
            "variant_id",
            {"keys": [("last_seen_at", 1)], "expireAfterSeconds": 7776000},  # 90-day TTL
        ]
```

#### 6.1.6 Pull Requests Collection

```python
"""
Tracks generated Pull Requests for winning variants.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from beanie import Document
from pydantic import Field


class PRStatus(str, Enum):
    """Pull Request lifecycle states."""
    PENDING = "pending"       # PR creation in progress
    CREATED = "created"       # PR successfully created
    MERGED = "merged"         # PR has been merged
    CLOSED = "closed"         # PR was closed without merging
    FAILED = "failed"         # PR creation failed


class PullRequest(Document):
    """
    Tracks a Pull Request generated from a winning experiment variant.
    
    Attributes:
        experiment_id: Reference to the source Experiment
        variant_id: Reference to the winning Variant
        site_id: Reference to the Site (for GitHub credentials)
        github_pr_number: The PR number in GitHub
        github_pr_url: Direct URL to the PR
        branch_name: Name of the feature branch
        status: Current PR state
        code_changes: JSON representation of the changes made
        created_at: Timestamp of PR creation
        merged_at: Timestamp when PR was merged (if applicable)
        error_message: Error details if creation failed
    """
    experiment_id: str = Field(...)
    variant_id: str = Field(...)
    site_id: str = Field(...)
    github_pr_number: Optional[int] = Field(default=None)
    github_pr_url: Optional[str] = Field(default=None)
    branch_name: str = Field(...)
    status: PRStatus = Field(default=PRStatus.PENDING)
    code_changes: Optional[dict] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    merged_at: Optional[datetime] = Field(default=None)
    error_message: Optional[str] = Field(default=None)

    class Settings:
        name = "pull_requests"
        indexes = [
            "experiment_id",
            "site_id",
            "status",
        ]
```

#### 6.1.7 Session Recordings Collection

```python
"""
Session recordings captured via rrweb for experiment visitors.

This collection stores rrweb event data for replaying user sessions
during A/B testing experiments.
"""
from datetime import datetime
from typing import Any, Optional
from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING


class SessionRecording(Document):
    """
    Stores rrweb session recording data for experiment visitors.

    Attributes:
        session_id: Unique identifier for this recording session
        visitor_id: Reference to visitor (matches Assignment.visitor_id)
        experiment_id: Reference to the Experiment being recorded
        variant_id: Reference to the assigned Variant
        site_id: Reference to the parent Site
        url: Page URL where recording was captured
        user_agent: Visitor's browser user agent
        events: List of rrweb events (stored as JSON array)
        events_count: Number of events in the recording
        duration_ms: Recording duration in milliseconds
        started_at: When recording started
        ended_at: When recording ended
        is_complete: Whether recording ended normally (vs page abandon)
    """
    session_id: str = Field(...)
    visitor_id: str = Field(..., min_length=1, max_length=100)
    experiment_id: str = Field(...)
    variant_id: str = Field(...)
    site_id: str = Field(...)
    url: str = Field(..., max_length=2000)
    user_agent: Optional[str] = Field(default=None, max_length=500)

    # Recording data - stored as list of dicts (rrweb events)
    events: list[dict[str, Any]] = Field(default_factory=list)
    events_count: int = Field(default=0)
    duration_ms: int = Field(default=0)

    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = Field(default=None)

    # Metadata
    is_complete: bool = Field(default=False)

    class Settings:
        name = "session_recordings"
        indexes = [
            # Query recordings by experiment (most common query)
            IndexModel([("experiment_id", ASCENDING), ("started_at", DESCENDING)]),
            # Query by visitor for listing their sessions
            IndexModel([("visitor_id", ASCENDING), ("experiment_id", ASCENDING)]),
            # Session lookup for upserting events (unique)
            IndexModel([("session_id", ASCENDING)], unique=True),
        ]
```

---

## 7. API Specification

### 7.1 Authentication (MongoDB-based)

Initial authentication uses email/password stored in MongoDB with bcrypt hashing. JWT tokens are issued for session management. GitHub OAuth is planned for a future release.

```yaml
# Authentication Endpoints

POST /api/v1/auth/register:
  summary: Create a new user account
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [email, password, name]
          properties:
            email: { type: string, format: email }
            password: { type: string, minLength: 8 }
            name: { type: string, minLength: 1, maxLength: 100 }
            organization_name: { type: string, maxLength: 100 }
  responses:
    201:
      description: Account created
      content:
        application/json:
          schema:
            type: object
            properties:
              user: { $ref: '#/components/schemas/User' }
              access_token: { type: string }
              refresh_token: { type: string }

POST /api/v1/auth/login:
  summary: Authenticate with email and password
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [email, password]
          properties:
            email: { type: string, format: email }
            password: { type: string }
  responses:
    200:
      description: Login successful
      content:
        application/json:
          schema:
            type: object
            properties:
              user: { $ref: '#/components/schemas/User' }
              access_token: { type: string }
              refresh_token: { type: string }

POST /api/v1/auth/refresh:
  summary: Refresh access token
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [refresh_token]
          properties:
            refresh_token: { type: string }
  responses:
    200:
      description: Token refreshed
      content:
        application/json:
          schema:
            type: object
            properties:
              access_token: { type: string }

POST /api/v1/auth/logout:
  summary: Revoke refresh token
  security:
    - bearerAuth: []
```

### 7.2 Core Endpoints

#### 7.2.1 Sites

```yaml
# Site Management Endpoints

POST /api/v1/sites:
  summary: Register a new site
  security:
    - bearerAuth: []
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [name, domain]
          properties:
            name:
              type: string
              maxLength: 100
            domain:
              type: string
              pattern: "^[a-zA-Z0-9][-a-zA-Z0-9]*(\\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$"
            github_repo:
              type: string
              nullable: true
            github_pat:
              type: string
              nullable: true
              description: "Personal Access Token for GitHub API (initial implementation)"
  responses:
    201:
      description: Site created
      content:
        application/json:
          schema:
            type: object
            properties:
              id: { type: string }
              public_key: { type: string }
              script_tag: { type: string }

GET /api/v1/sites:
  summary: List user's registered sites
  security:
    - bearerAuth: []
  responses:
    200:
      description: List of sites

GET /api/v1/sites/{site_id}:
  summary: Get site details
  security:
    - bearerAuth: []
  
PATCH /api/v1/sites/{site_id}:
  summary: Update site configuration
  security:
    - bearerAuth: []

DELETE /api/v1/sites/{site_id}:
  summary: Deactivate a site
  security:
    - bearerAuth: []
```

#### 7.2.2 Experiments

```yaml
# Experiment Management Endpoints

POST /api/v1/experiments:
  summary: Create a new experiment
  description: |
    Creates an experiment, triggers DOM scraping via Firecrawl,
    and initiates variant generation via LLM (Kimi K2.5).
  security:
    - bearerAuth: []
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [site_id, name, target_url]
          properties:
            site_id: { type: string }
            name: { type: string }
            description: { type: string }
            target_url: { type: string, format: uri }
            url_pattern: { type: string }
            optimization_goal: { type: string }
            num_variants: { type: integer, default: 2, minimum: 1, maximum: 5 }
  responses:
    202:
      description: Experiment creation initiated (async)

GET /api/v1/experiments:
  summary: List experiments with filtering
  security:
    - bearerAuth: []
  parameters:
    - name: site_id
      in: query
      schema: { type: string }
    - name: status
      in: query
      schema: { type: string, enum: [draft, pending, active, paused, completed, archived] }

GET /api/v1/experiments/{experiment_id}:
  summary: Get experiment details with variants
  security:
    - bearerAuth: []

POST /api/v1/experiments/{experiment_id}/activate:
  summary: Activate an experiment
  security:
    - bearerAuth: []

POST /api/v1/experiments/{experiment_id}/pause:
  summary: Pause an active experiment
  security:
    - bearerAuth: []

POST /api/v1/experiments/{experiment_id}/complete:
  summary: Complete experiment and select winner
  security:
    - bearerAuth: []
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [winner_variant_id]
          properties:
            winner_variant_id: { type: string }

GET /api/v1/experiments/{experiment_id}/comparison:
  summary: Get side-by-side comparison data
  security:
    - bearerAuth: []
```

#### 7.2.3 Actuator Script Endpoints (Public)

```yaml
# Public endpoints for the injected script (no authentication required)
# Site identification via X-Public-Key header

POST /api/v1/actuator/assign:
  summary: Get variant assignments for a visitor
  description: |
    Called by the actuator script on page load to determine
    which experiments apply and what variant to show.
  headers:
    X-Public-Key:
      required: true
      schema: { type: string }
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [visitor_id, url]
          properties:
            visitor_id: { type: string }
            url: { type: string }
            user_agent: { type: string }
            referrer: { type: string }
  responses:
    200:
      content:
        application/json:
          schema:
            type: object
            properties:
              visitor_id: { type: string }
              assignments:
                type: array
                items:
                  type: object
                  properties:
                    experiment_id: { type: string }
                    variant_id: { type: string }
                    is_control: { type: boolean }
                    patches: { type: array }

POST /api/v1/actuator/track/impression:
  summary: Track variant impression
  description: Called when visitor sees a variant (uses sendBeacon)
  responses:
    204: { description: Tracked successfully }

POST /api/v1/actuator/track/conversion:
  summary: Track conversion event
  description: Called when visitor completes a goal
  responses:
    204: { description: Tracked successfully }

POST /api/v1/actuator/recording:
  summary: Upload session recording events
  description: |
    Called by the actuator script to upload rrweb events.
    Supports batched uploads and final flush on page unload.
    Events are appended to existing session or create new recording.
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [session_id, visitor_id, experiment_id, variant_id, url, events]
          properties:
            session_id: { type: string, maxLength: 100 }
            visitor_id: { type: string, maxLength: 100 }
            experiment_id: { type: string }
            variant_id: { type: string }
            url: { type: string, maxLength: 2000 }
            events:
              type: array
              maxItems: 1000
              description: rrweb event objects
            is_final: { type: boolean, default: false }
            user_agent: { type: string, maxLength: 500 }
  responses:
    204: { description: Recording saved successfully }
```

#### 7.2.4 Session Recordings Endpoints (Authenticated)

```yaml
GET /api/v1/experiments/{experiment_id}/recordings:
  summary: List session recordings for an experiment
  parameters:
    - name: experiment_id
      in: path
      required: true
      schema: { type: string }
    - name: skip
      in: query
      schema: { type: integer, default: 0 }
    - name: limit
      in: query
      schema: { type: integer, default: 20, maximum: 100 }
    - name: variant_id
      in: query
      schema: { type: string }
      description: Filter by variant
  responses:
    200:
      content:
        application/json:
          schema:
            type: array
            items:
              type: object
              properties:
                id: { type: string }
                session_id: { type: string }
                visitor_id: { type: string }
                variant_id: { type: string }
                url: { type: string }
                duration_ms: { type: integer }
                events_count: { type: integer }
                started_at: { type: string, format: date-time }
                is_complete: { type: boolean }

GET /api/v1/experiments/{experiment_id}/recordings/{recording_id}:
  summary: Get full recording with events for playback
  responses:
    200:
      content:
        application/json:
          schema:
            type: object
            properties:
              id: { type: string }
              session_id: { type: string }
              visitor_id: { type: string }
              variant_id: { type: string }
              url: { type: string }
              events: { type: array, description: rrweb events for playback }
              duration_ms: { type: integer }
              events_count: { type: integer }
              started_at: { type: string, format: date-time }
              ended_at: { type: string, format: date-time }
              is_complete: { type: boolean }
```

---

## 8. Frontend Implementation

### 8.1 Design System: Detail.dev-Inspired

The UI follows a Detail.dev-inspired aesthetic with these key characteristics:

**Landing Page (Dark Theme):**
- Pure black background (`#000000`)
- White text with high contrast
- Green accent color (`#84cc16` / lime-400) for CTAs
- Bold, impactful typography (48-72px headlines)
- Angular/diagonal design elements
- Monospace font for CTAs (mimicking terminal aesthetic)
- Testimonials with avatar + name + title

**Dashboard (Light Theme):**
- Clean white background
- Subtle gray sidebar (`#f8fafc`)
- Minimal visual noise
- Organization selector dropdown in sidebar
- Icon + text navigation items
- Skeleton loaders for loading states
- Card-based informational sections

### 8.2 Project Structure

```
apps/
└── web/                              # Next.js 16 application
    ├── src/
    │   ├── app/                      # App Router pages
    │   │   ├── (marketing)/          # Public marketing pages
    │   │   │   ├── page.tsx          # Landing page (dark theme)
    │   │   │   └── layout.tsx
    │   │   ├── (auth)/               # Authentication routes
    │   │   │   ├── login/
    │   │   │   │   └── page.tsx
    │   │   │   ├── register/
    │   │   │   │   └── page.tsx
    │   │   │   └── layout.tsx
    │   │   ├── (dashboard)/          # Authenticated dashboard routes
    │   │   │   ├── experiments/
    │   │   │   │   ├── page.tsx      # Experiment listing
    │   │   │   │   ├── new/
    │   │   │   │   │   └── page.tsx  # Create experiment
    │   │   │   │   └── [experimentId]/
    │   │   │   │       ├── page.tsx  # Experiment details
    │   │   │   │       └── compare/
    │   │   │   │           └── page.tsx  # Side-by-side comparison
    │   │   │   ├── sites/
    │   │   │   │   ├── page.tsx
    │   │   │   │   └── [siteId]/
    │   │   │   │       └── page.tsx
    │   │   │   ├── settings/
    │   │   │   │   └── page.tsx
    │   │   │   └── layout.tsx        # Dashboard layout with sidebar
    │   │   ├── layout.tsx            # Root layout
    │   │   └── globals.css           # Global styles + CSS variables
    │   ├── components/
    │   │   ├── ui/                   # shadcn/ui components
    │   │   │   ├── button.tsx
    │   │   │   ├── card.tsx
    │   │   │   ├── dialog.tsx
    │   │   │   ├── dropdown-menu.tsx
    │   │   │   ├── form.tsx
    │   │   │   ├── input.tsx
    │   │   │   ├── select.tsx
    │   │   │   ├── sidebar.tsx       # shadcn/ui sidebar component
    │   │   │   ├── skeleton.tsx
    │   │   │   ├── table.tsx
    │   │   │   ├── tabs.tsx
    │   │   │   ├── toast.tsx
    │   │   │   └── ...
    │   │   ├── layout/
    │   │   │   ├── app-sidebar.tsx   # Dashboard sidebar
    │   │   │   ├── nav-header.tsx    # Marketing header
    │   │   │   └── org-switcher.tsx  # Organization dropdown
    │   │   ├── experiments/
    │   │   │   ├── experiment-card.tsx
    │   │   │   ├── experiment-form.tsx
    │   │   │   ├── variant-preview.tsx
    │   │   │   └── side-by-side-viewer.tsx
    │   │   └── marketing/
    │   │       ├── hero-section.tsx
    │   │       ├── testimonial.tsx
    │   │       └── cta-button.tsx
    │   ├── lib/
    │   │   ├── api-client.ts
    │   │   ├── auth.ts
    │   │   └── utils.ts
    │   ├── hooks/
    │   │   ├── use-experiments.ts
    │   │   ├── use-sites.ts
    │   │   └── use-auth.ts
    │   └── types/
    │       └── index.ts
    ├── components.json               # shadcn/ui configuration
    ├── tailwind.config.ts
    ├── next.config.ts
    ├── tsconfig.json
    ├── bun.lockb                     # Bun lockfile
    └── package.json
```

### 8.3 shadcn/ui Configuration

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 8.4 Global CSS (Detail.dev-Inspired Theme)

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light theme (Dashboard) */
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 84 81% 44%;           /* Green accent like Detail.dev */
    --primary-foreground: 0 0% 0%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 84 81% 44%;
    --radius: 0.5rem;

    /* Sidebar specific */
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 84 81% 44%;
    --sidebar-primary-foreground: 0 0% 0%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 84 81% 44%;
  }

  .dark {
    /* Dark theme (Landing page) */
    --background: 0 0% 0%;           /* Pure black like Detail.dev */
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 84 81% 44%;           /* Green accent */
    --primary-foreground: 0 0% 0%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 84 81% 44%;
  }
}

/* Detail.dev-style monospace CTA buttons */
.cta-button {
  @apply font-mono uppercase tracking-wider text-sm;
}

/* Diagonal/angular decorative elements */
.diagonal-slice {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
}
```

### 8.5 Key Components

#### 8.5.1 Landing Page Hero (Detail.dev-Inspired)

```tsx
/**
 * HeroSection Component
 * 
 * Detail.dev-inspired hero section with bold typography,
 * dark background, and angular design elements.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Main hero section for the landing page.
 * Features bold headline, subtext, and dual CTAs.
 */
export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Angular decorative element */}
      <div 
        className="absolute right-0 top-0 w-1/3 h-full bg-white diagonal-slice"
        aria-hidden="true"
      />
      
      {/* Red accent line (like Detail.dev) */}
      <div 
        className="absolute right-[33%] top-0 w-1 h-full bg-red-500"
        aria-hidden="true"
      />

      <div className="relative z-10 container mx-auto px-6 pt-32 pb-20">
        <div className="max-w-2xl">
          {/* Bold headline */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Your UX is full of
            <br />
            missed conversions.
          </h1>
          
          {/* Subheadline */}
          <h2 className="text-2xl md:text-3xl font-semibold text-white/90 mb-6">
            Let us show you.
          </h2>
          
          {/* Description */}
          <p className="text-lg text-white/70 mb-10 max-w-xl">
            Pulse scans your site to find UX improvements. Each experiment
            spends hours testing variants with real users to uncover
            optimizations you'll be glad to ship.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button 
              asChild
              size="lg"
              className="cta-button bg-lime-400 text-black hover:bg-lime-300 px-8"
            >
              <Link href="/register">
                TRY FOR FREE
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline"
              size="lg"
              className="cta-button border-white text-white hover:bg-white/10 px-8"
            >
              <Link href="/demo">
                TALK TO AN ENGINEER
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

#### 8.5.2 Dashboard Sidebar (Detail.dev-Inspired)

```tsx
/**
 * AppSidebar Component
 * 
 * Dashboard sidebar using shadcn/ui Sidebar component.
 * Matches Detail.dev's clean, minimal dashboard aesthetic.
 */
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bug, 
  Settings, 
  Mail, 
  ChevronDown,
  FlaskConical,
  Globe
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

/** Navigation items for the sidebar */
const navItems = [
  {
    title: 'Experiments',
    icon: FlaskConical,
    href: '/experiments',
  },
  {
    title: 'Sites',
    icon: Globe,
    href: '/sites',
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/settings',
  },
];

/** Footer items */
const footerItems = [
  {
    title: 'Contact Support',
    icon: Mail,
    href: 'mailto:support@pulse-ux.com',
  },
];

/**
 * Main application sidebar for the dashboard.
 * Features organization switcher, navigation, and support link.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const orgName = user?.organization_name || `${user?.name}'s Org`;
  // Truncate long org names
  const displayOrgName = orgName.length > 12 
    ? `${orgName.slice(0, 12)}...` 
    : orgName;

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        {/* Organization Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 w-full text-left hover:bg-sidebar-accent rounded-md">
              <span className="font-medium truncate">{displayOrgName}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <span className="truncate">{orgName}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
```

#### 8.5.3 Experiments Page with Loading State

```tsx
/**
 * ExperimentsPage Component
 * 
 * Main experiments listing page with Detail.dev-inspired
 * loading states and card layout.
 */
'use client';

import { useExperiments } from '@/hooks/use-experiments';
import { useSites } from '@/hooks/use-sites';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExperimentCard } from '@/components/experiments/experiment-card';

/**
 * Loading skeleton matching Detail.dev's loading state.
 * Shows animated placeholder lines while data loads.
 */
function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12">
          {/* Skeleton lines mimicking Detail.dev */}
          <div className="space-y-3 w-full max-w-sm">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <div className="flex items-center justify-center pt-2">
              <Skeleton className="h-4 w-4/6" />
              <span className="mx-2 text-muted-foreground">✨</span>
            </div>
            <Skeleton className="h-4 w-3/6 mx-auto" />
            <Skeleton className="h-4 w-4/6 mx-auto" />
          </div>
          
          {/* Status message */}
          <div className="mt-8 text-center">
            <h3 className="text-xl font-medium text-muted-foreground">
              Scanning your experiments
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              This takes approximately <strong>a few seconds</strong>.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              We'll display the results when it's complete.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Info cards explaining the experiment process.
 * Matches Detail.dev's FAQ-style cards.
 */
function InfoCards() {
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            How does Pulse analyze my site?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pulse scrapes your site's DOM and uses AI to
            generate UX improvements, looking for conversion opportunities
            and selecting the most impactful changes.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            What types of improvements do you find?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We test all kinds of UX changes, from CTA styling to
            layout adjustments. We focus on the improvements that
            are most likely to increase conversions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main experiments page component.
 */
export default function ExperimentsPage() {
  const { data: sites, isLoading: sitesLoading } = useSites();
  const { 
    data: experiments, 
    isLoading: experimentsLoading,
    selectedSiteId,
    setSelectedSiteId,
  } = useExperiments();

  const isLoading = sitesLoading || experimentsLoading;

  return (
    <div className="p-6">
      {/* Header with site selector and view toggle */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Experiments</h1>
        
        <div className="flex items-center gap-4">
          {/* Site selector */}
          <Select 
            value={selectedSiteId} 
            onValueChange={setSelectedSiteId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <Tabs defaultValue="table">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="repo">Repo View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <>
          <LoadingSkeleton />
          <InfoCards />
        </>
      ) : experiments && experiments.length > 0 ? (
        <div className="space-y-4">
          {experiments.map((experiment) => (
            <ExperimentCard 
              key={experiment.id} 
              experiment={experiment} 
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No experiments yet. Create your first experiment to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

#### 8.5.4 Side-by-Side Comparison Viewer

```tsx
/**
 * SideBySideViewer Component
 * 
 * Renders a visual comparison of experiment variants with synchronized
 * scrolling, difference highlighting, and selection controls.
 * Uses shadcn/ui components throughout.
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useExperimentComparison } from '@/hooks/use-experiments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle, Trophy } from 'lucide-react';
import { toast } from 'sonner';

type SideBySideViewerProps = {
  experimentId: string;
  onSelectWinner: (variantId: string) => Promise<void>;
};

/**
 * Displays experiment variants side-by-side for comparison and winner selection.
 */
export function SideBySideViewer({ 
  experimentId, 
  onSelectWinner 
}: SideBySideViewerProps) {
  const { data, isLoading, error } = useExperimentComparison(experimentId);
  const [selectingVariant, setSelectingVariant] = useState<string | undefined>(undefined);
  const scrollContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isScrolling = useRef(false);

  /**
   * Synchronizes scroll position across all variant panels.
   */
  const handleScroll = useCallback((sourceIndex: number) => {
    if (isScrolling.current) return;
    isScrolling.current = true;

    const sourceContainer = scrollContainerRefs.current[sourceIndex];
    if (!sourceContainer) return;

    const { scrollTop, scrollLeft } = sourceContainer;

    scrollContainerRefs.current.forEach((container, index) => {
      if (container && index !== sourceIndex) {
        container.scrollTop = scrollTop;
        container.scrollLeft = scrollLeft;
      }
    });

    requestAnimationFrame(() => {
      isScrolling.current = false;
    });
  }, []);

  /**
   * Handles winner selection with loading state and toast feedback.
   */
  const handleSelectWinner = async (variantId: string, variantName: string) => {
    setSelectingVariant(variantId);
    try {
      await onSelectWinner(variantId);
      toast.success(`"${variantName}" selected as winner!`);
    } catch (err) {
      toast.error('Failed to select winner. Please try again.');
    } finally {
      setSelectingVariant(undefined);
    }
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">
            Failed to load comparison data. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Summary */}
      {data.ai_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{data.ai_analysis}</p>
          </CardContent>
        </Card>
      )}

      {/* Variant Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.variants.map((variantData, index) => (
          <Card 
            key={variantData.variant.id}
            className={
              variantData.variant.is_control 
                ? 'border-blue-500/50' 
                : 'border-primary/50'
            }
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {variantData.variant.name}
                </CardTitle>
                {variantData.variant.is_control && (
                  <Badge variant="secondary">Control</Badge>
                )}
              </div>
              <Button
                variant={variantData.variant.is_control ? 'outline' : 'default'}
                size="sm"
                disabled={selectingVariant !== undefined}
                onClick={() => handleSelectWinner(
                  variantData.variant.id, 
                  variantData.variant.name
                )}
                className="cta-button"
              >
                {selectingVariant === variantData.variant.id ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Selecting...
                  </>
                ) : (
                  <>
                    <Trophy className="mr-2 h-4 w-4" />
                    SELECT WINNER
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {variantData.metrics.impressions.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Impressions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {variantData.metrics.conversions.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {(variantData.metrics.conversion_rate * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Conv. Rate</p>
                </div>
              </div>

              {/* Screenshot with synchronized scroll */}
              <div
                ref={(el) => { scrollContainerRefs.current[index] = el; }}
                className="h-96 overflow-auto rounded-md border"
                onScroll={() => handleScroll(index)}
              >
                {variantData.screenshot_url ? (
                  <Image
                    src={variantData.screenshot_url}
                    alt={`Screenshot of ${variantData.variant.name}`}
                    width={800}
                    height={1200}
                    className="w-full"
                    priority={index === 0}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <p className="text-muted-foreground">No screenshot available</p>
                  </div>
                )}
              </div>

              {/* Variant Description */}
              {variantData.variant.description && (
                <p className="text-sm text-muted-foreground">
                  {variantData.variant.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 9. Backend Implementation

### 9.1 Project Structure

```
apps/
└── api/                              # FastAPI application
    ├── src/
    │   ├── __init__.py
    │   ├── main.py                   # Application entrypoint
    │   ├── config.py                 # Configuration management
    │   ├── database.py               # MongoDB connection
    │   ├── dependencies.py           # FastAPI dependencies
    │   ├── models/                   # Beanie document models
    │   │   ├── __init__.py
    │   │   ├── user.py
    │   │   ├── site.py
    │   │   ├── experiment.py
    │   │   ├── variant.py
    │   │   ├── assignment.py
    │   │   └── pull_request.py
    │   ├── schemas/                  # Pydantic request/response schemas
    │   │   ├── __init__.py
    │   │   ├── auth.py
    │   │   ├── site.py
    │   │   ├── experiment.py
    │   │   └── variant.py
    │   ├── routers/                  # API route handlers
    │   │   ├── __init__.py
    │   │   ├── auth.py
    │   │   ├── sites.py
    │   │   ├── experiments.py
    │   │   ├── actuator.py
    │   │   └── pull_requests.py
    │   ├── services/                 # Business logic services
    │   │   ├── __init__.py
    │   │   ├── auth_service.py
    │   │   ├── site_service.py
    │   │   ├── experiment_service.py
    │   │   ├── variant_service.py
    │   │   ├── assignment_service.py
    │   │   └── pr_service.py
    │   ├── workers/                  # Background job handlers
    │   │   ├── __init__.py
    │   │   ├── scraper_worker.py
    │   │   ├── llm_worker.py
    │   │   ├── screenshot_worker.py
    │   │   └── pr_worker.py
    │   ├── integrations/             # External service clients
    │   │   ├── __init__.py
    │   │   ├── firecrawl.py
    │   │   ├── openrouter.py
    │   │   ├── github.py
    │   │   └── resend.py
    │   └── utils/                    # Utility functions
    │       ├── __init__.py
    │       ├── security.py           # Password hashing, JWT
    │       └── bucketing.py
    ├── tests/
    ├── pyproject.toml                # uv configuration
    ├── uv.lock                       # uv lockfile
    └── Dockerfile
```

### 9.2 pyproject.toml (uv Configuration)

```toml
[project]
name = "pulse-api"
version = "0.1.0"
description = "Pulse UX Optimizer API"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "motor>=3.3.0",
    "beanie>=1.26.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "httpx>=0.27.0",
    "arq>=0.26.0",
    "python-multipart>=0.0.9",
    "email-validator>=2.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
    "ruff>=0.5.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
```

### 9.3 Authentication Service

```python
"""
Authentication service for MongoDB-based user management.

This module provides secure password hashing, JWT token generation,
and user authentication without external OAuth providers.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import EmailStr

from src.config import settings
from src.models.user import User, RefreshToken


# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """
    Service for handling authentication operations.
    
    Provides methods for:
    - User registration with password hashing
    - Login verification
    - JWT token generation and validation
    - Refresh token management
    """
    
    # JWT configuration
    ACCESS_TOKEN_EXPIRE_MINUTES = 15
    REFRESH_TOKEN_EXPIRE_DAYS = 30
    ALGORITHM = "HS256"
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain password against its hash.
        
        Args:
            plain_password: The password to verify
            hashed_password: The bcrypt hash to check against
            
        Returns:
            True if password matches, False otherwise
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Bcrypt hash of the password
        """
        return pwd_context.hash(password)
    
    def create_access_token(self, user_id: str) -> str:
        """
        Create a short-lived JWT access token.
        
        Args:
            user_id: The user's database ID
            
        Returns:
            Encoded JWT token string
        """
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "access",
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=self.ALGORITHM)
    
    def create_refresh_token(self) -> tuple[str, str]:
        """
        Create a refresh token and its hash for storage.
        
        Returns:
            Tuple of (raw_token, token_hash) - store only the hash
        """
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        return raw_token, token_hash
    
    def verify_access_token(self, token: str) -> Optional[str]:
        """
        Verify and decode a JWT access token.
        
        Args:
            token: The JWT token to verify
            
        Returns:
            User ID if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET, 
                algorithms=[self.ALGORITHM]
            )
            if payload.get("type") != "access":
                return None
            return payload.get("sub")
        except JWTError:
            return None
    
    async def register_user(
        self,
        email: EmailStr,
        password: str,
        name: str,
        organization_name: Optional[str] = None,
    ) -> User:
        """
        Register a new user account.
        
        Args:
            email: User's email address
            password: Plain text password (will be hashed)
            name: User's display name
            organization_name: Optional organization name
            
        Returns:
            Created User document
            
        Raises:
            ValueError: If email is already registered
        """
        # Check if email already exists
        existing = await User.find_one(User.email == email)
        if existing:
            raise ValueError("Email already registered")
        
        # Create user with hashed password
        user = User(
            email=email,
            password_hash=self.hash_password(password),
            name=name,
            organization_name=organization_name,
        )
        await user.insert()
        return user
    
    async def authenticate_user(
        self,
        email: EmailStr,
        password: str,
    ) -> Optional[User]:
        """
        Authenticate a user by email and password.
        
        Args:
            email: User's email address
            password: Plain text password to verify
            
        Returns:
            User document if authentication succeeds, None otherwise
        """
        user = await User.find_one(User.email == email)
        if not user:
            return None
        
        if not self.verify_password(password, user.password_hash):
            return None
        
        # Update last login timestamp
        user.last_login_at = datetime.utcnow()
        await user.save()
        
        return user
    
    async def create_session(
        self,
        user: User,
    ) -> tuple[str, str]:
        """
        Create a new session with access and refresh tokens.
        
        Args:
            user: The authenticated user
            
        Returns:
            Tuple of (access_token, refresh_token)
        """
        access_token = self.create_access_token(str(user.id))
        refresh_token, token_hash = self.create_refresh_token()
        
        # Store refresh token in database
        refresh_doc = RefreshToken(
            user_id=str(user.id),
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        await refresh_doc.insert()
        
        return access_token, refresh_token
    
    async def refresh_access_token(
        self,
        refresh_token: str,
    ) -> Optional[str]:
        """
        Generate a new access token using a refresh token.
        
        Args:
            refresh_token: The refresh token to validate
            
        Returns:
            New access token if refresh token is valid, None otherwise
        """
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        
        refresh_doc = await RefreshToken.find_one(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at == None,
            RefreshToken.expires_at > datetime.utcnow(),
        )
        
        if not refresh_doc:
            return None
        
        return self.create_access_token(refresh_doc.user_id)
    
    async def revoke_refresh_token(self, refresh_token: str) -> bool:
        """
        Revoke a refresh token (logout).
        
        Args:
            refresh_token: The refresh token to revoke
            
        Returns:
            True if revoked, False if not found
        """
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        
        refresh_doc = await RefreshToken.find_one(
            RefreshToken.token_hash == token_hash
        )
        
        if not refresh_doc:
            return False
        
        refresh_doc.revoked_at = datetime.utcnow()
        await refresh_doc.save()
        return True


# Singleton instance
auth_service = AuthService()
```

### 9.4 Firecrawl Integration

```python
"""
Firecrawl API integration for DOM scraping and screenshots.

This module provides a typed async client for interacting with Firecrawl's
scrape endpoint, supporting HTML extraction and screenshot capture.
"""
import httpx
from typing import Any
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
    Async client for Firecrawl API v2.
    
    Provides methods for scraping URLs and capturing screenshots
    with proper error handling and retry logic.
    """
    
    BASE_URL = "https://api.firecrawl.dev/v2"
    
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
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
firecrawl_client = FirecrawlClient()
```

### 9.5 OpenRouter Integration (LLM)

```python
"""
OpenRouter API integration for LLM calls.

This module provides structured output generation for UX patches
and code transformations using OpenRouter's OpenAI-compatible API.
"""
import json
from typing import TypeVar
from pydantic import BaseModel
import httpx

from src.config import settings


T = TypeVar("T", bound=BaseModel)


class OpenRouterClient:
    """
    Async client for OpenRouter API using Moonshot Kimi K2.5.

    Provides methods for chat completions with structured output
    enforcement using JSON schemas.
    """

    BASE_URL = "https://openrouter.ai/api/v1"
    MODEL = "moonshotai/kimi-k2.5"  # Using Moonshot Kimi K2.5
    
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
        messages: list[dict[str, str]],
        response_model: type[T],
        *,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> T:
        """
        Send a chat completion request with structured output enforcement.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            response_model: Pydantic model class for response validation
            temperature: Sampling temperature (lower for more deterministic)
            max_tokens: Maximum tokens in response
            
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
            "Respond ONLY with the JSON object, no additional text."
        )
        
        enhanced_messages = [
            {"role": "system", "content": system_instruction},
            *messages,
        ]
        
        payload = {
            "model": self.MODEL,
            "messages": enhanced_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        
        response = await client.post("/chat/completions", json=payload)
        response.raise_for_status()
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        
        try:
            return response_model.model_validate_json(content)
        except Exception as e:
            raise ValueError(f"LLM response failed schema validation: {e}\nResponse: {content}")
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
openrouter_client = OpenRouterClient()
```

---

## 10. Injector Script ("Actuator")

The actuator script (`packages/actuator/src/index.ts`) is a lightweight TypeScript bundle (~7KB) that runs on customer websites:

### Core Features:
1. **Visitor ID generation** and localStorage persistence
2. **Experiment assignment fetching** from `/api/v1/actuator/assign`
3. **DOM patch application** with all patch action types (style, class, attribute, text, html, hide, show)
4. **Impression/conversion tracking** via sendBeacon for reliability
5. **Session recording** via rrweb (dynamically loaded from CDN ~40KB only when experiments are active)

### Session Recording Implementation:
- rrweb is loaded dynamically from CDN only when visitor has active experiment assignments
- Events are batched (50 events or 10-second intervals) to reduce network overhead
- Final flush occurs on `beforeunload` using sendBeacon for reliable delivery
- Visibility change triggers interim flush to prevent data loss on tab switches
- Maximum buffer size (500 events) prevents memory issues on long sessions

### Public API:
```typescript
window.PulseUX = {
  init(config: { publicKey: string; apiUrl?: string; debug?: boolean; enableRecording?: boolean }): Promise<void>;
  refresh(): void;              // Re-apply patches (for SPAs)
  trackConversion(eventName?: string, metadata?: Record<string, unknown>): void;
  getVisitor(): string;         // Get visitor ID
  getAssignments(): VariantAssignment[];
  stopRecording(): void;        // Manually stop recording
};
```

### Usage:
```html
<script
  src="https://cdn.pulse-ux.com/actuator.js"
  data-public-key="your-site-public-key"
  data-api-url="https://api.pulse-ux.com"
  data-debug="false"
></script>
```

---

## 11. AI/LLM Integration

All LLM operations use **Moonshot Kimi K2.5** via OpenRouter at `https://openrouter.ai/api/v1` with model identifier `moonshotai/kimi-k2.5`. The model can be changed by modifying the `MODEL` constant in `src/integrations/openrouter.py`.

Key integration points:
1. **Variant Generation:** Structured output with DOM patch schema
2. **Code Transformation:** AST-aware edits for PR generation
3. **PR Descriptions:** Human-readable summaries of changes

---

## 12. Third-Party Service Integrations

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| Firecrawl | DOM scraping, screenshots | API Key (Bearer token) |
| OpenRouter | LLM access (Kimi K2.5) | API Key (Bearer token) |
| Resend | Email notifications | API Key |
| GitHub | PR creation | Personal Access Token (initial), OAuth (future) |
| rrweb | Session recording & replay | None (loaded via CDN) |
| rrweb-player | Session playback in dashboard | npm package |

---

## 13. Security Considerations

### 13.1 Authentication

1. **Password Storage:** bcrypt with work factor 12
2. **Access Tokens:** JWT with 15-minute expiration
3. **Refresh Tokens:** SHA-256 hashed, stored in MongoDB with TTL
4. **Future:** GitHub OAuth integration for seamless repo access

### 13.2 Secrets Management

1. GitHub PATs encrypted at rest in MongoDB
2. Environment variables for all API keys
3. Never log sensitive values

### 13.3 Actuator Script Security

1. Public key identification only (not authentication)
2. CORS validation for allowed origins
3. No arbitrary JavaScript execution
4. Event handler attributes blocked

---

## 14. Deployment Strategy

### 14.1 Infrastructure

```yaml
# Vercel (Frontend)
- Framework: Next.js 16
- Build: bun run build
- Region: Auto (edge deployment)

# Railway (Backend)
- Runtime: Python 3.12
- Package Manager: uv
- Build: uv sync && uvicorn src.main:app
- Region: US West
- Services:
  - api: Main FastAPI application
  - worker: Background job processor

# MongoDB Atlas
- Cluster: M10 (Shared)
- Region: AWS us-west-2
```

### 14.2 CI/CD Pipeline

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install frontend deps
        run: bun install
        working-directory: apps/web
      - name: Test frontend
        run: bun test
        working-directory: apps/web
      - uses: astral-sh/setup-uv@v4
      - name: Test backend
        run: uv run pytest
        working-directory: apps/api
  
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
  
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          service: api
          token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 15. Development Milestones

### Phase 1: Foundation (Weeks 1-2)

1. **Monorepo setup** with Bun workspaces
2. **Backend setup** with uv and FastAPI
3. **MongoDB models** and connection
4. **Authentication system** (email/password + JWT)
5. **shadcn/ui setup** and base components

### Phase 2: Core Features (Weeks 3-4)

1. **Firecrawl integration** for scraping
2. **OpenRouter integration** for variant generation
3. **Landing page** (Detail.dev-inspired dark theme)
4. **Dashboard UI** with sidebar and experiments list

### Phase 3: Experimentation (Weeks 5-6)

1. **Actuator script** implementation
2. **Variant assignment** and sticky bucketing
3. **Event tracking** (impressions, conversions)
4. **Side-by-side comparison** UI

### Phase 4: PR Generation (Weeks 7-8)

1. **GitHub PAT integration** for initial PR creation
2. **Code transformation** LLM prompts
3. **PR creation** workflow
4. **Email notifications** via Resend

### Phase 5: Polish & Launch (Weeks 9-10)

1. **Error handling** and resilience
2. **Performance optimization**
3. **Documentation** and onboarding
4. **Beta launch**

**Future:** GitHub OAuth integration for improved UX

---

## 16. Appendix

### 16.1 Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.pulse-ux.com
NEXT_PUBLIC_APP_URL=https://pulse-ux.com

# Backend (.env)
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/pulse
REDIS_URL=redis://...
JWT_SECRET=your-jwt-secret
FIRECRAWL_API_KEY=fc_...
OPENROUTER_API_KEY=sk-or-...
RESEND_API_KEY=re_...
APP_URL=https://pulse-ux.com
```

### 16.2 Monorepo Structure

```
pulse-ux/
├── apps/
│   ├── web/                    # Next.js 16 frontend
│   │   ├── src/
│   │   ├── public/
│   │   ├── components.json     # shadcn/ui config
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   ├── bun.lockb
│   │   └── tsconfig.json
│   └── api/                    # FastAPI backend
│       ├── src/
│       ├── tests/
│       ├── pyproject.toml      # uv config
│       ├── uv.lock
│       └── Dockerfile
├── packages/
│   ├── actuator/               # Injector script
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   └── shared/                 # Shared types
│       ├── src/
│       └── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml
├── package.json                # Root workspace config
├── bunfig.toml                 # Bun configuration
└── README.md
```

### 16.3 shadcn/ui Components to Install

```bash
# Run in apps/web directory
bunx shadcn@latest init

# Core components
bunx shadcn@latest add button card dialog dropdown-menu form input \
  label select sidebar skeleton table tabs toast badge separator \
  scroll-area avatar popover tooltip command spinner empty
```

### 16.4 References

1. **Next.js 16 Documentation:** https://nextjs.org/docs
2. **FastAPI Documentation:** https://fastapi.tiangolo.com
3. **MongoDB Documentation:** https://www.mongodb.com/docs
4. **shadcn/ui Documentation:** https://ui.shadcn.com/docs
5. **Firecrawl API:** https://docs.firecrawl.dev
6. **OpenRouter API:** https://openrouter.ai/docs
7. **Resend API:** https://resend.com/docs
8. **Bun Documentation:** https://bun.sh/docs
9. **uv Documentation:** https://docs.astral.sh/uv

---

**Document Status:** Ready for Engineering Review

**Key Changes from v1:**
- Package manager changed from pnpm to **Bun**
- Python package manager changed to **uv**
- Authentication simplified to **MongoDB-based** (email/password)
- UI built with **shadcn/ui** components
- Design inspired by **Detail.dev** (dark landing, light dashboard)
- GitHub OAuth marked as **future enhancement**
