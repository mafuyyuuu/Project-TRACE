# Coding Preferences & Standards

This document outlines the coding preferences and conventions for Project TRACE.

## 📁 Folder Structure (Strict)

These are mandatory. **Do not create folders outside this schema without explicit approval.**

### Frontend (`frontend/src/`)
```
assets/        # Static files (images, icons, global CSS)
components/    # Reusable UI only (Buttons, Inputs, Modals — NO business logic here)
features/      # Grouped by domain (e.g. /features/student, /features/finance)
hooks/         # Global custom React hooks (e.g. useAuth, useDashboard)
layouts/       # Page wrappers (e.g. Layout.jsx)
pages/         # Top-level route components that stitch features together
services/      # Axios calls to the backend API (api.js, authService.js, documentsService.js)
store/         # Global state management (Zustand/Redux) — intentionally empty, see below
utils/         # Helper functions (formatters.js, documentStatus.js, env.js)
```

### Backend (`backend/src/`)
```
config/        # Environment variables, database connection setup
controllers/   # Handles incoming HTTP requests and sends responses
middlewares/   # Express middlewares (auth, upload, errorHandler)
models/        # Database queries (raw SQL, one function per query)
routes/        # Maps URL endpoints to specific controllers
services/      # Heavy business logic (document pipeline, notifications, AI engine calls)
utils/         # Backend helper functions (AppError)
```

## 🚦 The Three Rules

1. **Separation of concerns:** UI components in `/components` must NEVER make direct API calls. All API calls belong in `/services` and reach components via hooks or props.
2. **Backend logic:** Controllers only handle HTTP `req`/`res`. Complex logic lives in `/services` and is called by the controller.
3. **Environment variables:** Never hardcode API keys or secrets — not even as a `||` fallback default. Reference `.env`, and add every new variable to `backend/.env.example`.
   - A `||` fallback on a *secret* is the dangerous case: it makes a compromised value look like working configuration. `JWT_SECRET` has no default — `src/config/env.js` throws on startup if it is missing, because silently signing tokens with a string committed to the repo means anyone can forge an admin login. Non-secret settings (ports, URLs, sender IDs) may keep sensible defaults.

## 🎨 Frontend (React + Tailwind)

- **Framework:** React (via Vite) for all UI portals.
- **Styling:** Tailwind CSS exclusively. No inline styles. Leverage Tailwind for glassmorphism and modern, clean layouts.
- **Imports:** Use the `@/` alias for `src/` (configured in `vite.config.js` + `jsconfig.json`) — e.g. `import useAuth from '@/hooks/useAuth'`. Avoid `../../..` chains.
- **Components:** Keep components modular and reusable. Separate the fetching logic (hooks) from the presentational components.
- **State Management:** Use standard React hooks (`useState`, `useEffect`, `useMemo`). Keep complex global state minimal, relying on backend fetches when possible.
  - `store/` exists to satisfy the schema but is **deliberately empty** — no Zustand/Redux is installed. State is already centralized in `useAuth` and `useDashboard` rather than prop-drilled, so a store would add a dependency without solving a real problem. Only introduce one if a genuine cross-component state problem appears.
- **Feature components:** Each role's command center lives in `features/<role>/` and owns its own modals under `features/<role>/components/`. Only genuinely cross-role UI (e.g. the image lightbox) belongs in top-level `components/`.

## ⚙️ Backend (Node.js + Express)

- **Architecture:** Strict route → controller → service → model flow. A route never contains logic; a controller never contains SQL; a model never contains business rules.
- **Config:** Read environment variables through `src/config/env.js` rather than touching `process.env` directly, so defaults live in exactly one place.
- **Errors:** Services signal failures with the helpers in `src/utils/AppError.js` (`badRequest`, `unauthorized`, `forbidden`, `notFound`) so they never need to import `res`. Controllers translate those into status codes.
- **File Uploads:** Use `multer` (`src/middlewares/upload.middleware.js`) for `multipart/form-data`. Do not store images permanently in memory; write them to disk, send them to the Python OCR service, and then clean them up or store them securely.
- **Database Access:** Use raw SQL in `src/models/*.model.js`. Ensure all inputs are parameterized to prevent SQL Injection. Every model function accepts an optional `executor` argument so callers can enlist the query in a transaction.
- **Transactions:** Any multi-write desk action (payment verification, evaluation, release, cancellation) must run inside `beginTransaction`/`commit`/`rollback` with a `FOR UPDATE` row lock on the document.
- **Notifications:** Dispatch through `src/services/notification.service.js`. Every channel fails soft — a failed SMS or email must never roll back the document action that triggered it.
- **Webhooks:** All webhook endpoints (e.g. from n8n or payment gateways) must handle errors gracefully and respond quickly (200 OK) to avoid timeouts, and must be guarded by `verifyWebhookSecret` — they have no user session, so without it they are open to the world.
- **Authorization, not just authentication:** a valid JWT proves *who* the caller is, never *what they may touch*. Any endpoint taking a resource id must verify ownership or role before acting — students may only affect their own documents and files. `submitPayment` and `cancelDocument` in `documents.service.js` are the reference pattern.

## 🧠 AI Engine (Python)

- **Framework:** Flask for exposing the EasyOCR functionality via a simple HTTP REST API.
- **Virtual Environments:** Always run Python inside a virtual environment (`.venv`).
- **Dependencies:** Keep `requirements.txt` strictly updated with only the necessary OCR and web packages.
- **Availability:** The Node backend must treat the AI engine as optional — every call goes through `src/services/aiEngine.service.js`, which returns `null` on failure so the caller can fall back.

## 🛣️ Orchestration (n8n)

- **Logic Separation:** Hardcoded institutional routing rules should be avoided in Node.js. If a document path depends on the document type, Node.js should emit an event to n8n (via `src/services/n8n.service.js`), which visually handles the routing logic.
- **Idempotency:** Workflows should be designed to handle duplicate triggers safely.

## 💳 Payments

- **Integration:** The system uses a manual GCash Verification pipeline. Students upload receipt screenshots and Reference Numbers.
- **Verification:** All payments must pass through the `Finance Clerk` desk (`pending_payment_verification`) for manual visual cross-referencing. Never process a document to the Secretary without the Finance Clerk changing the `payment_status` to `PAID` — `verifyPayment()` in `documents.service.js` is the only place that sets `PAID`.
