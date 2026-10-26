# Project TRACE

Student Document Request and Tracking System for the Pamantasan ng Lungsod ng Pasig Registrar.

TRACE supports document requests, desk routing, evaluation, billing, payment verification, release tracking, support conversations, and administrative reports. Accounts are provided for Students, Window 1, College Secretaries, Finance, and Admin.

## Start here

The **[System Handbook](docs/SYSTEM_HANDBOOK.md)** is the single operational guide for university maintainers. It covers first setup, configuration, the frontend and backend, AI, n8n, Docker, database migrations, deployment, backups, and troubleshooting.

| Task | Handbook section |
| --- | --- |
| Set up development | [Local setup](docs/SYSTEM_HANDBOOK.md#local-setup) |
| Configure credentials and integrations | [Configuration](docs/SYSTEM_HANDBOOK.md#configuration) |
| Run Docker, AI, and routing | [Docker](docs/SYSTEM_HANDBOOK.md#docker-setup) · [AI engine](docs/SYSTEM_HANDBOOK.md#ai-engine) · [n8n](docs/SYSTEM_HANDBOOK.md#n8n) |
| Install or update the database | [Database setup](docs/SYSTEM_HANDBOOK.md#database-setup) · [Migrations](docs/SYSTEM_HANDBOOK.md#migrations) |
| Deploy or maintain an installation | [Deployment](docs/SYSTEM_HANDBOOK.md#deployment) · [Backups and recovery](docs/SYSTEM_HANDBOOK.md#backups-and-recovery) |

## Repository

| Directory | Purpose |
| --- | --- |
| `frontend/` | React, Vite, Tailwind CSS, and role-specific screens |
| `backend/` | Express API, Socket.IO, SQL schema, migrations, and tests |
| `ai-engine/` | Flask service for OCR assistance, forecasting, and experimental stage risk |
| `n8n/` | Importable document-routing workflow |
| `deploy/` | HTTPS configuration, security tools, and recovery tools |
| `docs/` | Consolidated System Handbook |

Production uses MySQL and persistent upload storage. Environment files, credentials, database contents, and uploaded student records stay outside version control. AI outputs assist staff; they do not authorize payments, release documents, or replace evidence review.

## Development checks

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Configure services using the handbook before starting them. Developer conventions are in [AGENTS.md](AGENTS.md). Changes are verified on `dev`; merging into `main` and production rollout require release review.
