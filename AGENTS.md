# Repository Guidelines

## Project Structure & Module Organization

- `frontend/src/`: React UI organized into role-specific `features/`, reusable `components/`, `hooks/`, `layouts/`, `pages/`, `services/`, and `utils/`. Assets live in `frontend/src/assets/` and `frontend/public/`.
- `backend/src/`: Express API with `routes/`, `controllers/`, `services/`, `models/`, `middlewares/`, `config/`, and `realtime/`. SQL schema, seeds, and migrations live in `backend/database/`; uploaded files belong in `backend/uploads/`.
- `ai-engine/`: Flask OCR and forecasting service; Python dependencies are in its `requirements.txt`.
- `n8n/routing-workflow.json`: routing workflow. `deploy/` contains Caddy configuration; `docs/` contains architecture and setup guides.

## Build, Test, and Development Commands

Run from the repository root:

- `npm --prefix backend install` and `npm --prefix frontend install`: install each app's dependencies.
- `npm --prefix backend run dev`: start the API on port 3300.
- `npm --prefix frontend run dev`: start Vite on port 5273.
- `npm --prefix frontend run build`: produce the production frontend; `run lint` checks ESLint rules.
- `npm --prefix backend test` and `npm --prefix frontend test`: run tests; use `run test:watch` during development.
- In `ai-engine/`, activate `.venv`, run `pip install -r requirements.txt`, then `python app.py` (port 5005).
- `docker compose up -d --build`: start container services after configuring root `.env`.

## Coding Style & Naming Conventions

Follow `docs/CODING_PREFERENCES.md`. Match surrounding formatting: typically two-space JavaScript indentation and four-space Python indentation. Frontend modules use ES imports, PascalCase components, `use*` hooks, and `@/` imports. Backend modules use CommonJS and filenames such as `documents.service.js`.

Keep HTTP handling in controllers, business logic in services, and SQL in models. UI components receive data through hooks or props; API calls belong in frontend services. Use Tailwind styling. Keep pricing and document-status helpers synchronized across frontend and backend.

## Testing Guidelines

Vitest tests live beside source in `__tests__/`. Backend tests use `*.test.cjs`, `require()`, and mocked models to avoid database access. Frontend tests use `*.test.js` or `*.test.jsx`, jsdom, and React Testing Library. Add regression tests for security fixes and relevant behavior changes. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

Git history uses prefixes such as `feat:` followed by imperative descriptions. Keep commits focused. PRs should describe changed behavior, link related issues, report validation commands, and include screenshots for UI changes. Explain migration or configuration requirements.

## Security & Configuration

Never commit secrets or real uploaded records. Document new environment variables in the appropriate `.env.example`; consult `docs/ENV_SETUP_GUIDE.md`. Enforce resource ownership and role authorization. Re-import the n8n workflow after editing its JSON.
