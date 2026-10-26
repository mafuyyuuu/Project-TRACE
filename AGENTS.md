# Repository Guidelines

## Structure and responsibilities

- `frontend/src/`: React UI organized into role-specific `features/`, shared `components/`, `hooks/`, `layouts/`, `pages/`, `services/`, and `utils/`. Assets live in `frontend/src/assets/` or `frontend/public/`.
- `backend/src/`: Express API with `routes/`, `controllers/`, `services/`, `models/`, `middlewares/`, `config/`, and `realtime/`. SQL schema, seeds, and migrations live in `backend/database/`. Uploads use `backend/uploads/` locally and the uploads volume in Docker.
- `ai-engine/`: Flask OCR and analytics service; install its own `requirements.txt`.
- `n8n/routing-workflow.json`: importable routing workflow. Re-import and verify assignment after changing it.
- `deploy/`: Caddy, one-off security, recovery, and infrastructure inspection tools.
- `docs/SYSTEM_HANDBOOK.md`: consolidated operational guide. Update it when configuration, setup, policy, or deployment behavior changes; avoid overlapping guides and rollout logs.

## Development commands

Run from the repository root:

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend run dev
npm --prefix frontend run dev
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

The backend uses port 3300, Vite 5273, and AI 5005. Configure environments first; follow the [System Handbook](docs/SYSTEM_HANDBOOK.md). Runtime images omit package managers. Run migrations with `node database/<script>.js`, not `npm` inside the backend container.

## Implementation conventions

Match surrounding formatting: typically two-space JavaScript and four-space Python indentation. Frontend uses ES imports, PascalCase components, `use*` hooks, and `@/` imports. Backend uses CommonJS and filenames such as `documents.service.js`.

Keep HTTP handling in controllers, business rules in services, and SQL in models. Frontend API calls belong in services, hooks manage data, and components receive props. Use Tailwind and shared UI primitives. Verify shared changes across all five account types, narrow screens, long names, and enlarged text. Use the project Figma file for visual changes.

Preserve the evaluate-first, pay-later workflow. College Secretaries set evaluated pages and pricing; Finance verifies payments; Window 1 releases documents. Keep pricing helpers and status presentation consistent across frontend/backend without moving authorization into the browser. Use configured rates and saved pricing snapshots; protect finalized bills. Do not change approved release policies, recalculate historical dates, or invent rates during unrelated work.

n8n orchestrates assignment; the API emits the event and validates the authenticated callback. Routing failure must be observable without losing submitted requests. AI assists human review and must label synthetic or unavailable evidence accurately. Never insert demonstration data into a real database to improve analytics.

## Security and data

Never commit secrets, production exports, student records, or uploads. Keep `.env.example` current and document variables in the handbook. Preserve existing JWT, MFA, webhook, and provider keys during routine deployments. Use restricted runtime database accounts; schema changes need separate reviewed DBA access.

Enforce authentication, roles, resource ownership, and college scope on the backend for REST and Socket.IO. Private attachments and avatars use authenticated file routes. Require machine secrets for AI and webhook callers; never embed them in `VITE_*` variables. Validate inputs/uploads at the boundary. Avoid logging evidence, credentials, full phone numbers, or reset/MFA tokens.

Use explicit, preserving migrations for existing installations. Review catalog/data changes separately and test against a restored database. Preserve uploads and Docker volumes. Do not rerun broad historical migrations, provisioning, or seed imports blindly. Deployment and ClickUp completion need acceptance review; unit tests alone do not prove production acceptance or live notification delivery.

## Tests and review

Vitest tests live beside source in `__tests__/`. Backend tests use `*.test.cjs`, CommonJS, and mocked models unless explicitly running SQL integration checks. Frontend tests use `*.test.js` or `*.test.jsx`, jsdom, and React Testing Library. Add meaningful regression tests for behavioral/security changes. No numeric coverage threshold is configured.

Run relevant checks and required CI gates. Test resource isolation, failure paths, and actual totals when changing ownership, billing, or analytics. Use synthetic accounts/evidence locally; do not send student notifications without authorization.

Use focused commits with imperative descriptions and prefixes such as `fix:` or `chore:`. PRs explain resulting behavior, related tasks, validation, and migration/configuration requirements. Include screenshots for UI changes. Keep generated output, caches, duplicate backups, and historical review artifacts out of Git; history retains earlier versions.
