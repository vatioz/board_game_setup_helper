# Board Game Setup Helper

Upload a board-game rulebook PDF, extract setup instructions via AI,
curate a quick-reference checklist, and save it for game night.

## Architecture

```
┌──────────────────────────────────────────────┐
│  Docker container  (Azure App Service)       │
│                                              │
│  ┌──────────┐   ┌─────────────────────────┐  │
│  │ React SPA│   │  FastAPI (Python)        │  │
│  │ (static) │──▶│  /api/extract            │  │
│  │          │   │  /api/sessions/*          │  │
│  └──────────┘   └────┬──────────┬──────────┘  │
│                      │          │             │
│          ┌───────────┘          └──────────┐  │
│          ▼                                ▼  │
│  Azure Doc Intelligence           Azure OpenAI│
│  (prebuilt-read)                  (GPT-5.2)  │
│                                              │
│          ▼                                   │
│  Azure Cosmos DB (serverless)                │
└──────────────────────────────────────────────┘
```

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (optional, for containerised run)
- Azure resources:
  - Azure AI Document Intelligence
  - Azure OpenAI (GPT-5.2 deployment)
  - Azure Cosmos DB for NoSQL (serverless)

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
# Fill in your Azure keys and endpoints
```

### 2a. Run locally (dev mode)

**Backend** (terminal 1):

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `localhost:8000`.

To run the frontend browser tests, install Playwright's Chromium once, then run:

```bash
cd frontend
npx playwright install chromium
npm test
```

Set `PLAYWRIGHT_BROWSER_CHANNEL` to a supported installed browser channel (for example, `msedge`) to use that browser instead.

### 2b. Run with Docker

```bash
docker compose up --build
```

Open [http://localhost:8000](http://localhost:8000).

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point + SPA serving
│   │   ├── config.py            # Settings from .env
│   │   ├── models.py            # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── extract.py       # POST /api/extract
│   │   │   └── sessions.py      # CRUD /api/sessions
│   │   └── services/
│   │       ├── document_intelligence.py
│   │       ├── llm.py
│   │       └── cosmos_db.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app component
│   │   ├── components/          # React components
│   │   ├── services/api.ts      # Backend API client
│   │   ├── types/index.ts       # TypeScript interfaces
│   │   └── styles/App.css       # Stylesheet
│   ├── package.json
│   └── vite.config.ts
├── specs/
│   └── basic_specs.md           # Requirements & tech stack
├── Dockerfile                   # Multi-stage build
├── docker-compose.yml
├── .env.example
└── README.md
```

## Deploying to Azure App Service

1. Build & push the Docker image to Azure Container Registry (ACR).
2. Create / update an App Service (or use an existing Linux plan).
3. Point the App Service to the ACR image.
4. Set the `.env` values as **Application Settings** in the App Service Configuration blade.

With GitHub Actions these steps run automatically on push to `main`.
