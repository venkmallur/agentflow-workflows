# AgentFlow Workflows — AI Agent Workflow Builder

A mini n8n purpose-built for chaining AI agent steps, with two-layer permissions, live subscriptions, and cross-org isolation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-nhost%20%2B%20Hasura%20%2B%20PostgreSQL-purple.svg)

## Tech Stack

- **Backend**: PostgreSQL + Hasura GraphQL Engine + Hasura Auth
- **Functions**: Node.js/TypeScript serverless handlers (Express)
- **Frontend**: Next.js 14 (App Router) + Apollo Client + Framer Motion
- **Auth**: nhost Auth (JWT-based)
- **LLM**: Google Gemini 2.0 Flash (free tier) — stubbed if no API key
- **Real-time**: GraphQL Subscriptions via WebSocket

## Features

- 🏢 **Multi-org support** with owner/editor/viewer roles
- 🔒 **Two-layer permissions**: org+role scoping (Hasura) + step-level gating (Action handlers)
- 🤖 **6 step types**: LLM Call, HTTP Request, DB Write, Notify, Conditional Branch, Approval Gate
- 🚀 **4 trigger types**: Manual, Webhook, Scheduled (cron), Database Event
- 📡 **Live run monitoring** via GraphQL subscriptions
- ⏸️ **Approval gates** that pause workflows until authorized approval
- 📊 **Usage quotas** per organization with real-time tracking
- 🔄 **Retry logic** for failed external calls (LLM, HTTP)
- 🎨 **Premium dark UI** with glassmorphism and micro-animations

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- [Node.js](https://nodejs.org/) v18+ 
- [Git](https://git-scm.com/)

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/YOUR_USERNAME/agentflow-workflows.git
cd agentflow-workflows
cp .env.example .env
```

Edit `.env` if you have a Gemini API key:
```
GEMINI_API_KEY=your-gemini-api-key-here
```
If left empty, LLM calls will use a stubbed response with a 2-second delay.

### 2. Start the Backend

```bash
docker compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Hasura GraphQL Engine (port 8080)
- Hasura Auth (port 4000)
- Functions server (port 3000)

Wait for all services to be healthy, then apply migrations:

```bash
# Hasura Console is available at http://localhost:8080/console
# Migrations are auto-applied via Hasura on startup
```

### 3. Install & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3001**

### 4. Create Test Users

Open the Hasura Console at http://localhost:8080/console and use the Auth service or run the seed script:

```bash
# Create users via the Auth API
curl -X POST http://localhost:4000/signup/email-password \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@acme.ai","password":"password123","options":{"displayName":"Alice (Owner)"}}'

curl -X POST http://localhost:4000/signup/email-password \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@acme.ai","password":"password123","options":{"displayName":"Bob (Editor)"}}'

curl -X POST http://localhost:4000/signup/email-password \
  -H "Content-Type: application/json" \
  -d '{"email":"dave@beta.corp","password":"password123","options":{"displayName":"Dave (Owner)"}}'
```

Then run the seed SQL to set up organizations and memberships (update the user UUIDs first).

### 5. Access the App

- **Frontend**: http://localhost:3001
- **Hasura Console**: http://localhost:8080/console
- **GraphQL Endpoint**: http://localhost:8080/v1/graphql
- **Functions**: http://localhost:3000

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                 │
│  Auth │ Workflow Builder │ Run Monitor │ Approval UI  │
└──────────────┬──────────────┬───────────────────────┘
               │ GraphQL      │ Subscriptions (WS)
               ▼              ▼
┌─────────────────────────────────────────────────────┐
│              Hasura GraphQL Engine                    │
│  Row-Level Permissions │ Actions │ Event Triggers     │
└──────────┬──────────────┬────────────┬──────────────┘
           │              │            │
           ▼              ▼            ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │  Functions   │  │  Hasura Auth  │
│  (Data)      │  │  (Handlers)  │  │  (JWT)        │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Permission Model

### Layer 1: Org + Role Scoping (Hasura)
Every query is automatically filtered by org membership. A user in Org B cannot see Org A's data even with a direct ID.

| Role | Workflows | Runs | Members |
|------|-----------|------|---------|
| Owner | Full CRUD | Trigger & view | Manage |
| Editor | Create & edit | Trigger & view | View only |
| Viewer | Read only | View only | View only |

### Layer 2: Step-Level Gating (Action Handlers)
| Resource | Required Role |
|----------|---------------|
| `db_write` step | Owner only |
| `notify` step | Owner only |
| `webhook` trigger | Owner only |
| Approval gate clearance | Owner or Editor |

## Webhook Trigger

Trigger a workflow via webhook:
```bash
curl -X POST http://localhost:3000/api/webhook-trigger/<workflow-id> \
  -H "Content-Type: application/json" \
  -d '{"data": "your payload"}'
```

## Project Structure

```
agentflow-workflows/
├── docker-compose.yaml          # Full dev stack
├── nhost/
│   ├── migrations/              # PostgreSQL schema
│   ├── metadata/                # Hasura config (tables, permissions, actions)
│   └── seeds/                   # Seed data
├── functions/                   # Serverless handlers
│   └── src/
│       ├── server.ts            # Express server
│       ├── handlers/            # Action & trigger handlers
│       └── utils/               # Shared utilities
├── frontend/                    # Next.js app
│   └── src/
│       ├── app/                 # Pages (App Router)
│       ├── components/          # UI components
│       ├── graphql/             # Operations
│       └── lib/                 # Config
├── WRITEUP.md                   # Technical write-up
└── README.md                    # This file
```

## API Keys

| Service | How to Get | Required? |
|---------|-----------|-----------|
| Gemini API | [Google AI Studio](https://aistudio.google.com/apikey) | Optional (stubbed if missing) |

## License

MIT
