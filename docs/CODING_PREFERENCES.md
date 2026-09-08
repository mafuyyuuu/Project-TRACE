# Coding Preferences & Standards

This document outlines the coding preferences and conventions for Project TRACE.

## 📁 Folder Structure (Strict)

These are mandatory. **Do not create folders outside this schema without explicit approval.**

### Frontend (`frontend/src/`)
```
assets/        # Static files (images, icons, global CSS)
components/    # Reusable UI only (Buttons, Inputs, Modals — NO business logic here)
features/      # Grouped by domain (e.g. /features/student, /features/finance)
hooks/         # Global custom React hooks (useAuth, useDashboardCore, useAuthedFile)
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
  - `store/` exists to satisfy the schema but is **deliberately empty** — no Zustand/Redux is installed. State is already centralized in `useAuth` and the per-role feature hooks rather than prop-drilled, so a store would add a dependency without solving a real problem. Only introduce one if a genuine cross-component state problem appears.
- **Feature components:** Each role's command center lives in `features/<role>/` and owns its own modals under `features/<role>/components/`. Only genuinely cross-role UI (the image lightbox, alerts, loading spinner, sparkline, the modal shell, the confirm dialog, the user card, the queue tab bar) belongs in top-level `components/`.
- **Modals build on `components/ModalShell.jsx`, not their own `createPortal`.** It owns the portal, the backdrop, Esc-to-close, backdrop-click-to-close, a Tab focus trap, and — the reason it exists — a scrollable body with a footer pinned to the bottom regardless of content length, so a long form can never scroll its own action buttons out of reach. Its class-override props (`panelClassName`, `backdropClassName`, `closeButtonClassName`/`Icon`/`AriaLabel`, `footerClassName`, `bodyClassName`, `bare`) exist for genuine outliers — a lightbox with no white panel, a print-only slip, a split-screen layout that needs two independently-scrolling columns — not as a first reach; a normal modal only needs `title`, `children` and `footer`. Every override prop defaults to the shell's own prior hardcoded output, so adding one never changes an existing consumer.
- **State-changing actions get a confirmation; view-only ones don't.** `components/ConfirmDialog.jsx` (built on `ModalShell`) replaces `window.confirm()` — approve, reject, deactivate, cancel, release, hand over, log a payment. Never wrap pure navigation or a view-only button (Refresh, View, Live Tracking) in one. The pattern: the handler that used to act immediately now only *stages* its target into local state; a sibling `confirm*`/`cancel*` pair does the real `runAction(...)` call and clears state only on success, so a failed action leaves the dialog open with its error already showing as a toast rather than being silently dismissed. Existing `onClick={() => handleX(...)}` call sites never need to change — only the handler's own body does.
- **One hook per feature:** each command center calls its own `features/<role>/use<Role>Dashboard.js`, which builds on the shared `hooks/useDashboardCore.js`. A component should receive a handful of props, never a spread bag of everything a hook returns. If a component needs more than ~5 props, its state probably belongs in its own hook.
- **Never duplicate a helper between a hook and `utils/`.** Pure presentation helpers live in `utils/` and are imported directly by the components that need them — not defined in a hook and passed down as props.
- **Protected files:** uploads are authenticated, so `<img src>` cannot load them directly. Use `useAuthedFile` / `<AuthedFilePreview>` / `<UserAvatar>`, which fetch the bytes with the caller's token and render from a blob URL. `useAuthedFile` passes a fully-qualified `http(s)` URL straight through, so a protected upload and a public fallback can share one call.
- **Mobile first, always.** Every page must be usable at 375 px. The sidebar rail is `hidden md:flex`, so anything reachable only from it also needs a route through the mobile drawer — render both from one definition (`layouts/SidebarNav.jsx` + `utils/navigation.js`) so they cannot drift. Page titles, card padding and multi-column grids take an `sm:` step up rather than a single fixed size; prefer `min-h-*` over `h-*` on cards whose text can wrap.
- **Tables scroll inside their card, never down the page.** Wrap every queue table in `<div className="max-h-[60vh] overflow-y-auto overflow-x-auto">` and mark its `<thead>` `sticky top-0 bg-white z-10`. The opaque background is not optional — a transparent header lets rows show through as they scroll underneath.
- **No `alert()` for feedback.** Success and failure render as inline banners driven by hook state, so the message is visible next to what produced it and does not block the page.

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

## 🌐 CORS & Health Checks

- **One CORS policy, one place.** `src/config/cors.js` is shared by the REST API and the Socket.IO handshake so the two cannot drift. Never give Socket.IO `origin: true` together with `credentials: true` — that lets any website open an authenticated socket.
- **A health check must check something.** `/api/health` runs a real `SELECT 1` and returns 503 when the database is unreachable. The server deliberately boots without a database, so a liveness-only check reports a completely unusable container as healthy.
- **Mount health above the rate limiter**, or an orchestrator's own probes eventually throttle it.

## 🚢 Deployment

- **Never hardcode an origin in the frontend.** `services/api.js` and `services/realtimeService.js` are the only two places a URL is built; both read `VITE_API_URL`, which is **inlined at build time** — a change needs a rebuild, not a restart. Unset means relative, which is what the Vite dev proxy expects, so development must keep working with it empty.
- **A static host needs an SPA rewrite.** Every non-asset path must fall back to `index.html`, or deep links 404 — `/reset-password?token=…` arrives from an email and is the one that matters.
- **Treat the uploads directory as state.** It is the only state outside MySQL; the database stores filenames only, so an unmounted volume loses every file while the rows survive. Create the directory at boot — never assume it exists.
- **Serve Python under a WSGI server.** `app.run()` is the Werkzeug dev server; debug mode must be strictly opt-in, since the interactive debugger is remote code execution behind any traceback.
- **Bake model weights into the image.** Downloading them on first import blocks the port opening and fails outright in a network with restricted egress.

## 🗂️ Reference Data Over Hardcoding

- **Never hardcode a list the Registrar might change.** Document types, colleges, fees and form fields live in database tables (`document_types`, `colleges`, `grad_form_fields`) and are served through `/api/reference` and `/api/grad-applications/form-fields`. A new document type or a fee change must not require a deploy.
- **Fees are computed server-side, always.** `backend/src/utils/pricing.js` is the authority; the frontend's `utils/pricing.js` mirrors it purely to preview a total, and a client-supplied `amount` is ignored on the server.
- **Validation follows the data.** Where a form is admin-configurable, generate its validation from the field definitions rather than writing per-field rules — see `gradApplication.service.js`.

## 🗑️ Deletion & Destructive Actions

- **Prefer deactivation over deletion for anything referenced by history.** This is a registrar's system of record: documents store their document type by name and users store their college by name. Set `is_active = false` so the entry disappears from dropdowns while existing records keep working — and can be restored. Reserve hard deletes for rows nothing points at (e.g. a student cancelling their own unpaid request).
- **Say what actually happened.** If an action is a deactivation, the button says "Deactivate" and the response says so. Never label something "Delete" when it isn't.
- **Report the blast radius.** Before hiding shared reference data, tell the admin how many records reference it.
- **Block edits that would strand history** — such as renaming a document type that existing documents point to.

## 🔐 Credentials

- **Admin-set passwords are single-use.** Creating or resetting a staff account sets `must_change_password`, so an admin-chosen secret can never become a long-lived credential. The flag clears only when the user sets their own.
- **Never return or log a password**, even one the caller just supplied. Hash with bcrypt at the service layer.
- **Never store a usable token.** A password-reset token is stored as `sha256(token)` only, so a database dump yields no working links. The same reasoning applies to any future token: store what lets you *verify* a presented secret, never the secret.
- **Time-limited is not the same as single-use.** A signed token (a JWT, say) stays replayable until it expires, even after the password it reset has already changed. `password_resets.used_at` is what makes it one-shot — and a successful reset retires the user's other outstanding tokens too.
- **Compare expiry in SQL, not in Node.** A wrong clock on the app server must not be able to extend a token's life.
- **Auth endpoints must not leak which accounts exist.** `forgot-password` returns the same response whether the account is real, missing, or has no email on file. Resist the temptation to be more "helpful" here — a distinguishable response turns the endpoint into an account-enumeration oracle.
- **Throttle anything that sends mail on an unauthenticated request.** `passwordResetLimiter` exists because the caller never had to prove they control the address.

## 📤 Data Export

- **Escape by hand, deliberately.** `backend/src/utils/csv.js` covers commas, quotes and newlines, and neutralises spreadsheet formula injection (`=`, `+`, `-`, `@`) — user-supplied names and purposes end up in these files.
- **Emit a UTF-8 BOM** on CSV downloads or Excel mangles accented characters.
- **Cap exports.** An export endpoint must never try to serialise an unbounded table.
- **Export what the user is looking at** — the on-screen filters and the export must share one filter object.

## 🧪 Testing (Vitest)

- **Run:** `cd backend && npm test` and `cd frontend && npm test`. Tests live in `__tests__/` folders beside the code they cover.
- **Backend tests must use the `.cjs` extension and `require()`.** The backend source is CommonJS; only a CJS test shares Node's require cache with it, which is what lets `vi.spyOn(model, 'fn')` intercept the call the service actually makes. An ESM test silently receives a different module instance and will hit the real database.
- **Mock the model layer, not the database.** `vi.spyOn(documentModel, '...')` keeps tests fast and DB-free. `test/setup.js` supplies dummy secrets so config modules import cleanly.
- **Every security fix gets a regression test.** Authorization rules are the highest-value thing to cover — verify a fix bites by breaking it deliberately and watching the test fail.
- **Frontend:** pure helpers in `utils/` are tested directly; hooks via `renderHook`; each dashboard has a render smoke test that would catch a prop lost during refactoring.

## 🧠 AI Engine (Python)

- **Framework:** Flask for exposing the EasyOCR functionality via a simple HTTP REST API.
- **Virtual Environments:** Always run Python inside a virtual environment (`.venv`).
- **Dependencies:** Keep `requirements.txt` strictly updated with only the necessary OCR and web packages.
- **Availability:** The Node backend must treat the AI engine as optional — every call goes through `src/services/aiEngine.service.js`, which returns `null` on failure so the caller can fall back.

## 🔀 The document state machine

- **Never write a bare status string.** The vocabulary, the legal transitions and the desk labels all
  live in `backend/src/utils/documentStatus.js`, mirrored by `frontend/src/utils/documentStatus.js`
  the same way `utils/pricing.js` is. Import the constant.
- **Guard every desk action with `assertTransition(from, to)`** before writing. `step_logs` is
  append-only, so an illegal move cannot be tidied away afterwards — it has to be refused up front,
  as a 400 the clerk can understand rather than a silent UPDATE.
- **`current_status` is a `VARCHAR`, not a database ENUM, on purpose.** An ENUM would not cover the
  Python engine's raw SQL or the React queues, and `migration.js` deliberately widened this column
  years ago. The constants module is what enforces the vocabulary.
- **The Python AI engine queries `current_status` directly** (`ai-engine/app.py`), and there is no
  shared module across the language split. Any change to the vocabulary has to be applied there by
  hand, or the Random Forest silently trains on zeroes.
- **Rejection moves a document exactly one step back**, with the reason in `step_logs.notes`. Two
  gaps are intentional and documented in the module: the first status has no backward edge, and
  nothing reverses past payment.

## 🛣️ Orchestration (n8n)

- **Logic Separation:** Hardcoded institutional routing rules should be avoided in Node.js. If a document path depends on the document type, Node.js should emit an event to n8n (via `src/services/n8n.service.js`), which visually handles the routing logic.
- **Idempotency:** Workflows should be designed to handle duplicate triggers safely.
- **Never hardcode the callback URL or the secret inside the workflow JSON.** Read them from n8n environment variables (`TRACE_API_URL`, `TRACE_WEBHOOK_SECRET`). The workflow once had `localhost:3000` baked into three nodes and kept pointing there for a month after the backend moved to 3300 — the client swallows errors by design, so nothing surfaced.
- **A failing orchestrator must degrade, never block.** Routing metadata is resolved best-effort and a stopped n8n simply leaves the document unassigned; every queue therefore needs a sensible fallback for `assigned_clerk_id IS NULL`, or records that predate routing vanish.
- **Scope an assignment to the desk that owns it.** The Secretary queue honours an assignment to a secretary and ignores one to any other desk — the workflow also routes TOR/Diploma to Window 1 at intake, and treating that as authoritative would delete those documents from the secretary step they still have to pass through.
- **Re-import after editing.** n8n keeps its own copy; changing `n8n/routing-workflow.json` in the repo does nothing until it is imported again.

## 💳 Payments

- **Integration:** Payment is collected manually against the Finance Office's own records — no
  third-party gateway. Students either upload proof online, or pay at the counter and have Finance
  log the Official Receipt.
- **Pricing and payment are separate authorities, and must stay that way.** The College Secretary
  sets the **amount** (`priceDocument()`), because only they know the page count once the document is
  printed. The Finance Clerk confirms the **money** (`verifyPayment()`), which is the only place in
  the entire system that writes `payment_status = 'PAID'`. Never let one endpoint do both: separating
  who decides the charge from who confirms it received is what makes the money trail auditable, and
  it is the first thing a panel will ask about.
- **Every amount is written with its justification.** `priceDocument()` records the clerk id, the
  page count and a free-text reason in the same statement as the amount. An amount whose origin is
  unknown cannot be defended when a student disputes it.
- **Billing is per request, pricing is per document.** Page counts differ, so each document is priced
  on its own; the request only becomes payable when the last one has a price. Billing earlier would
  send a student to Finance once per document in a single request.
- **Logging a counter payment is not clearing it.** `logWalkInPayment()` records the claim and moves
  the request into the verification queue — a walk-in is held to exactly the same standard as an
  online payment.
- **The Secretary's OR check stays procedural.** `verifyOfficialReceipt()` sits between Finance's
  approval and physical handoff — the Secretary confirms the Official Receipt is present and its
  number looks right before releasing the document. It is a deliberate, narrow exception that sits
  close to the authority split above, so it is held to the same rule by never writing
  `payment_status` itself: that stays exclusively `verifyPayment()`'s. Approving `verifyPayment()`
  now also requires an `or_number` — typed in for a digital payment, already on file for a walk-in.
- **OCR never records a payment on its own.** `/ocr/receipt` fills the walk-in form's fields; the
  clerk confirms them before saving. A misread amount here is a money error, which is precisely where
  a human check earns its cost.
