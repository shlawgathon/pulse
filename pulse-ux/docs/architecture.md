# Pulse UX Optimizer - Architecture Diagrams

This document provides comprehensive UML diagrams visualizing the architecture of the Pulse UX Optimizer platform.

---

## 1. System Overview - Component Diagram

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Next.js 16)"]
        Dashboard["Dashboard UI"]
        ExperimentList["Experiment List"]
        ExperimentDetail["Experiment Detail"]
        CompareView["Compare Variants"]
        VariantPreview["Variant Preview (iframe)"]
    end

    subgraph Backend["Backend (FastAPI)"]
        subgraph Routers["API Routers"]
            AuthRouter["/auth"]
            ExperimentRouter["/experiments"]
            SiteRouter["/sites"]
            ActuatorRouter["/actuator"]
            PRRouter["/pull-requests"]
        end

        subgraph Services["Service Layer"]
            AuthService["AuthService"]
            ExperimentService["ExperimentService"]
            SiteService["SiteService"]
            LLMService["LLMService"]
            PRService["PRService"]
            ActuatorService["ActuatorService"]
        end

        subgraph Workers["Background Workers"]
            LLMWorker["LLM Worker"]
            ScraperWorker["Scraper Worker"]
            PRWorker["PR Worker"]
        end
    end

    subgraph External["External Services"]
        MongoDB[(MongoDB Atlas)]
        Redis[(Redis Cache)]
        OpenRouter["OpenRouter API\n(Claude/Kimi)"]
        Firecrawl["Firecrawl API"]
        GitHub["GitHub API"]
        Resend["Resend Email"]
    end

    subgraph ClientSite["Target Website"]
        ActuatorScript["Actuator Script"]
        UserBrowser["User Browser"]
    end

    %% Frontend connections
    Dashboard --> ExperimentRouter
    Dashboard --> SiteRouter
    Dashboard --> AuthRouter
    ExperimentDetail --> ExperimentRouter
    CompareView --> ExperimentRouter

    %% Router to Service
    AuthRouter --> AuthService
    ExperimentRouter --> ExperimentService
    SiteRouter --> SiteService
    ActuatorRouter --> ActuatorService
    PRRouter --> PRService

    %% Service to Workers
    ExperimentService --> LLMWorker
    ExperimentService --> ScraperWorker
    PRService --> PRWorker

    %% Workers to External
    LLMWorker --> OpenRouter
    ScraperWorker --> Firecrawl
    PRWorker --> GitHub
    LLMWorker --> Resend

    %% Service to External
    AuthService --> MongoDB
    ExperimentService --> MongoDB
    SiteService --> MongoDB
    PRService --> MongoDB

    %% Actuator flow
    ActuatorScript --> ActuatorRouter
    UserBrowser --> ActuatorScript
```

---

## 2. Data Model - Class Diagram

```mermaid
classDiagram
    class User {
        +ObjectId id
        +EmailStr email
        +str password_hash
        +str name
        +str avatar_url
        +str organization_name
        +bool is_active
        +bool is_verified
        +datetime created_at
        +datetime updated_at
        +datetime last_login_at
    }

    class RefreshToken {
        +ObjectId id
        +str user_id
        +str token_hash
        +datetime expires_at
        +datetime created_at
        +datetime revoked_at
    }

    class Site {
        +ObjectId id
        +str name
        +str domain
        +str owner_id
        +str public_key
        +list~str~ allowed_origins
        +str github_repo
        +str github_pat
        +datetime created_at
        +datetime updated_at
        +bool is_active
    }

    class Experiment {
        +ObjectId id
        +str site_id
        +str name
        +str description
        +str url_pattern
        +str target_url
        +ExperimentStatus status
        +int traffic_allocation
        +str created_by
        +datetime created_at
        +datetime updated_at
        +datetime started_at
        +datetime ended_at
        +str winner_variant_id
        +str base_html_snapshot
        +str base_screenshot_url
    }

    class ExperimentStatus {
        <<enumeration>>
        DRAFT
        PENDING
        ACTIVE
        PAUSED
        COMPLETED
        ARCHIVED
    }

    class Variant {
        +ObjectId id
        +str experiment_id
        +str name
        +str description
        +bool is_control
        +list~DOMPatch~ patches
        +str screenshot_url
        +str rendered_html
        +int impressions
        +int conversions
        +datetime created_at
    }

    class DOMPatch {
        +PatchAction action
        +str selector
        +str value
        +str property_name
    }

    class PatchAction {
        <<enumeration>>
        STYLE
        CLASS_ADD
        CLASS_REMOVE
        ATTRIBUTE
        TEXT
        HTML
        HIDE
        SHOW
    }

    class PullRequest {
        +ObjectId id
        +str experiment_id
        +str variant_id
        +str site_id
        +str branch_name
        +PRStatus status
        +str github_pr_url
        +str github_pr_number
        +str error_message
        +datetime created_at
        +datetime updated_at
    }

    class PRStatus {
        <<enumeration>>
        PENDING
        CREATED
        MERGED
        CLOSED
        FAILED
    }

    %% Relationships
    User "1" --> "*" Site : owns
    User "1" --> "*" RefreshToken : has
    User "1" --> "*" Experiment : creates
    Site "1" --> "*" Experiment : contains
    Experiment "1" --> "*" Variant : has
    Experiment "1" --> "0..1" PullRequest : generates
    Experiment --> ExperimentStatus : has
    Variant "1" --> "*" DOMPatch : contains
    DOMPatch --> PatchAction : uses
    PullRequest --> PRStatus : has
```

---

## 3. Service Layer - Component Diagram

```mermaid
flowchart LR
    subgraph Services["Service Layer"]
        direction TB

        subgraph Auth["Authentication"]
            AuthService["AuthService"]
        end

        subgraph Core["Core Services"]
            ExperimentService["ExperimentService"]
            SiteService["SiteService"]
            LLMService["LLMService"]
            PRService["PRService"]
            ActuatorService["ActuatorService"]
        end
    end

    subgraph Integrations["External Integrations"]
        OpenRouterClient["openrouter_client"]
        FirecrawlClient["firecrawl_client"]
        GitHubClient["github_client"]
        ResendClient["resend_client"]
    end

    subgraph Models["Data Models"]
        UserModel["User"]
        SiteModel["Site"]
        ExperimentModel["Experiment"]
        VariantModel["Variant"]
        PRModel["PullRequest"]
    end

    %% Service Dependencies
    AuthService --> UserModel
    SiteService --> SiteModel
    ExperimentService --> ExperimentModel
    ExperimentService --> VariantModel
    ExperimentService --> SiteModel
    PRService --> PRModel
    PRService --> ExperimentModel
    ActuatorService --> ExperimentModel
    ActuatorService --> VariantModel

    %% Integration Dependencies
    LLMService --> OpenRouterClient
    ExperimentService --> LLMService
    ExperimentService --> FirecrawlClient
    PRService --> GitHubClient
    PRService --> LLMService
```

---

## 4. Experiment Lifecycle - Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Dashboard
    participant API as FastAPI
    participant ExpSvc as ExperimentService
    participant Scraper as ScraperWorker
    participant LLM as LLMWorker
    participant DB as MongoDB
    participant FC as Firecrawl
    participant OR as OpenRouter

    User->>UI: Create Experiment
    UI->>API: POST /experiments
    API->>ExpSvc: create_experiment()
    ExpSvc->>DB: Save Experiment (DRAFT)
    ExpSvc->>DB: Create Control Variant

    Note over ExpSvc: Async Background Task
    ExpSvc-->>Scraper: scrape_url()
    Scraper->>FC: Scrape HTML + Screenshot
    FC-->>Scraper: HTML, Screenshot URL
    Scraper->>DB: Update base_html_snapshot

    Scraper-->>LLM: generate_variants()
    LLM->>OR: Vision + DOM Analysis
    OR-->>LLM: Generated Variants
    LLM->>DB: Save Variants with patches
    LLM->>DB: Update Status -> PENDING
    LLM-->>User: Email Notification

    ExpSvc-->>API: Return Experiment
    API-->>UI: Experiment Created

    User->>UI: Compare Variants
    UI->>API: GET /experiments/{id}/comparison
    API->>ExpSvc: get_comparison()
    ExpSvc->>DB: Fetch Variants
    ExpSvc->>LLM: generate_comparison_analysis()
    LLM->>OR: Analyze Variants
    OR-->>LLM: AI Analysis
    ExpSvc-->>API: Experiment + Variants + Analysis
    API-->>UI: Comparison Data

    User->>UI: Select Winner
    UI->>API: POST /experiments/{id}/complete
    API->>ExpSvc: complete_experiment()
    ExpSvc->>DB: Update Status -> COMPLETED
    ExpSvc->>DB: Set winner_variant_id
    Note over ExpSvc: Auto-trigger PR Generation
    ExpSvc-->>API: Experiment Updated
    API-->>UI: Winner Selected
```

---

## 5. Variant Regeneration - Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Dashboard
    participant API as FastAPI
    participant ExpSvc as ExperimentService
    participant LLM as LLMWorker
    participant DB as MongoDB
    participant OR as OpenRouter

    User->>UI: Click "Regenerate Variants"
    UI->>API: POST /experiments/{id}/regenerate
    API->>ExpSvc: regenerate_variants()

    ExpSvc->>DB: Find non-control variants
    ExpSvc->>DB: Delete non-control variants
    ExpSvc->>DB: Update Status -> DRAFT

    Note over ExpSvc: Async Background Task
    ExpSvc-->>LLM: generate_variants()
    LLM->>DB: Fetch base_html_snapshot
    LLM->>OR: Vision + DOM Analysis
    Note over OR: Fresh AI seeds
    OR-->>LLM: New Variants
    LLM->>DB: Save New Variants
    LLM->>DB: Update Status -> PENDING

    ExpSvc-->>API: Experiment Updated
    API-->>UI: Regeneration Started
    UI->>UI: Query Invalidation
    UI->>API: GET /experiments/{id}
    API-->>UI: Updated Experiment Data
```

---

## 6. PR Generation - Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Dashboard
    participant API as FastAPI
    participant PRSvc as PRService
    participant PRWorker as PRWorker
    participant LLM as LLMService
    participant GH as GitHub
    participant DB as MongoDB
    participant OR as OpenRouter

    Note over User,OR: Triggered automatically on winner selection

    API->>PRSvc: generate_pr()
    PRSvc->>DB: Verify Experiment COMPLETED
    PRSvc->>DB: Get Variant + Site
    PRSvc->>DB: Create PullRequest (PENDING)

    Note over PRSvc: Async Background Task
    PRSvc-->>PRWorker: generate_pr_async()

    PRWorker->>DB: Fetch PR, Experiment, Variant, Site
    PRWorker->>LLM: transform_patches_to_code()
    LLM->>OR: Convert DOM patches to code
    OR-->>LLM: Code Changes

    PRWorker->>GH: Create Branch
    PRWorker->>GH: Commit Changes
    PRWorker->>GH: Create Pull Request
    GH-->>PRWorker: PR URL + Number

    PRWorker->>DB: Update PR (CREATED)
    PRWorker-->>User: Email with PR Link
```

---

## 7. Actuator Script Flow - Sequence Diagram

```mermaid
sequenceDiagram
    participant Browser as User Browser
    participant Script as Actuator Script
    participant API as Actuator API
    participant DB as MongoDB

    Browser->>Script: Page Load
    Script->>API: GET /actuator/config/{public_key}
    API->>DB: Find Site by public_key
    API->>DB: Find Active Experiments
    API->>DB: Get Variants for Experiments
    API-->>Script: Config (experiments, variants, allocation)

    Script->>Script: Assign User to Variant
    Script->>Script: Apply DOM Patches

    Note over Script: Track Metrics
    Script->>API: POST /actuator/impression
    API->>DB: Increment variant.impressions

    Browser->>Browser: User Converts
    Script->>API: POST /actuator/conversion
    API->>DB: Increment variant.conversions
```

---

## 8. Technology Stack

| Layer                | Technology                                                                 |
| -------------------- | -------------------------------------------------------------------------- |
| **Frontend**         | Next.js 16, React 19, Tailwind CSS 4.x, shadcn/ui, Zustand, TanStack Query |
| **Backend**          | FastAPI 0.115.x, Python 3.13.x, Beanie 2.x (MongoDB ODM)                   |
| **Database**         | MongoDB Atlas                                                              |
| **Cache/Queue**      | Redis + ARQ                                                                |
| **LLM**              | Claude Opus 4.5 / Moonshot Kimi-k2.5 via OpenRouter                        |
| **Scraping**         | Firecrawl API                                                              |
| **Email**            | Resend                                                                     |
| **Version Control**  | GitHub API                                                                 |
| **Package Managers** | Bun (frontend), uv (backend)                                               |

---

## 9. Directory Structure

```
pulse-ux/
├── apps/
│   ├── api/                     # FastAPI Backend
│   │   └── src/
│   │       ├── config.py        # Settings & Environment
│   │       ├── database.py      # MongoDB Connection
│   │       ├── dependencies.py  # FastAPI Dependencies
│   │       ├── main.py          # Application Entry
│   │       ├── integrations/    # External API Clients
│   │       │   ├── firecrawl.py
│   │       │   ├── github.py
│   │       │   ├── openrouter.py
│   │       │   └── resend.py
│   │       ├── models/          # Beanie Documents
│   │       │   ├── experiment.py
│   │       │   ├── site.py
│   │       │   ├── user.py
│   │       │   ├── variant.py
│   │       │   └── pull_request.py
│   │       ├── routers/         # API Endpoints
│   │       │   ├── auth.py
│   │       │   ├── experiments.py
│   │       │   ├── sites.py
│   │       │   ├── actuator.py
│   │       │   └── pull_requests.py
│   │       ├── services/        # Business Logic
│   │       │   ├── auth_service.py
│   │       │   ├── experiment_service.py
│   │       │   ├── llm_service.py
│   │       │   ├── pr_service.py
│   │       │   └── site_service.py
│   │       └── workers/         # Background Tasks
│   │           ├── llm_worker.py
│   │           ├── pr_worker.py
│   │           └── scraper_worker.py
│   │
│   └── web/                     # Next.js Frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/      # Login/Register
│           │   ├── (dashboard)/ # Main Dashboard
│           │   │   └── experiments/
│           │   │       └── [experimentId]/
│           │   │           ├── page.tsx      # Detail View
│           │   │           └── compare/
│           │   │               └── page.tsx  # Comparison View
│           │   └── (marketing)/ # Landing Pages
│           ├── components/      # Reusable Components
│           └── types/           # TypeScript Interfaces
```

---

## 10. Key Features Summary

1. **LLM-Powered Variant Generation** - Uses multimodal vision (screenshot + DOM) to generate intelligent UX improvements
2. **Interactive Component Protection** - LLM instructions explicitly preserve dropdowns, accordions, and interactive elements
3. **Regenerate Variants** - Ability to regenerate unsatisfactory variants with fresh AI seeds
4. **Rendered HTML Persistence** - Cached HTML snapshots stored in MongoDB for fast preview loading
5. **Auto-PR on Winner Selection** - Automatically triggers GitHub PR creation when experiment completes
6. **Actuator Script** - Lightweight JS for runtime DOM patching without code deployment
7. **Email Notifications** - Automated emails when variants are ready via Resend
