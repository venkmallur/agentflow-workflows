# AgentFlow Workflows â€” AI Agent Workflow Builder

A mini n8n purpose-built for chaining AI agent steps, with two-layer permissions, live subscriptions, and cross-org isolation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-nhost%20%2B%20Hasura%20%2B%20PostgreSQL-purple.svg)

## Tech Stack

- **Backend**: PostgreSQL + Hasura GraphQL Engine + Hasura Auth
- **Functions**: Node.js/TypeScript serverless handlers (Express)
- **Frontend**: Next.js 14 (App Router) + Apollo Client + Framer Motion
- **Auth**: nhost Auth (JWT-based)
- **LLM**: Google Gemini 2.0 Flash (free tier) â€” stubbed if no API key
- **Real-time**: GraphQL Subscriptions via WebSocket

## Features

- ðŸ¢ **Multi-org support** with owner/editor/viewer roles
- ðŸ”’ **Two-layer permissions**: org+role scoping (Hasura) + step-level gating (Action handlers)
- ðŸ¤– **6 step types**: LLM Call, HTTP Request, DB Write, Notify, Conditional Branch, Approval Gate
- ðŸš€ **4 trigger types**: Manual, Webhook, Scheduled (cron), Database Event
- ðŸ“¡ **Live run monitoring** via GraphQL subscriptions
- â¸ï¸ **Approval gates** that pause workflows until authorized approval
- ðŸ“Š **Usage quotas** per organization with real-time tracking
- ðŸ”„ **Retry logic** for failed external calls (LLM, HTTP)
- ðŸŽ¨ **Premium dark UI** with glassmorphism and micro-animations

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
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    Frontend (Next.js)                 â”‚
â”‚  Auth â”‚ Workflow Builder â”‚ Run Monitor â”‚ Approval UI  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
               â”‚ GraphQL      â”‚ Subscriptions (WS)
               â–¼              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              Hasura GraphQL Engine                    â”‚
â”‚  Row-Level Permissions â”‚ Actions â”‚ Event Triggers     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚              â”‚            â”‚
           â–¼              â–¼            â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PostgreSQL  â”‚  â”‚  Functions   â”‚  â”‚  Hasura Auth  â”‚
â”‚  (Data)      â”‚  â”‚  (Handlers)  â”‚  â”‚  (JWT)        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
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
â”œâ”€â”€ docker-compose.yaml          # Full dev stack
â”œâ”€â”€ nhost/
â”‚   â”œâ”€â”€ migrations/              # PostgreSQL schema
â”‚   â”œâ”€â”€ metadata/                # Hasura config (tables, permissions, actions)
â”‚   â””â”€â”€ seeds/                   # Seed data
â”œâ”€â”€ functions/                   # Serverless handlers
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ server.ts            # Express server
â”‚       â”œâ”€â”€ handlers/            # Action & trigger handlers
â”‚       â””â”€â”€ utils/               # Shared utilities
â”œâ”€â”€ frontend/                    # Next.js app
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ app/                 # Pages (App Router)
â”‚       â”œâ”€â”€ components/          # UI components
â”‚       â”œâ”€â”€ graphql/             # Operations
â”‚       â””â”€â”€ lib/                 # Config
â”œâ”€â”€ WRITEUP.md                   # Technical write-up
â””â”€â”€ README.md                    # This file
```

## API Keys

| Service | How to Get | Required? |
|---------|-----------|-----------|
| Gemini API | [Google AI Studio](https://aistudio.google.com/apikey) | Optional (stubbed if missing) |

## License

MIT
