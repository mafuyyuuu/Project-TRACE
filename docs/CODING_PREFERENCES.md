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
- **Shared presentation:** use the explicit `trace-*` Tailwind component classes in `frontend/src/index.css` for ordinary controls, page sections and modal chrome. See [UI_CONVENTIONS.md](UI_CONVENTIONS.md) for variants and examples. Add layout utilities only; avoid repeating local font/padding/color/focus recipes. Keep icon buttons, tabs, file/choice controls, inverse authentication forms and print/template output as deliberate variants. Use unitless line height so 200% text remains readable with the stable spacing token.
- **Imports:** Use the `@/` alias for `src/` (configured in `vite.config.js` + `jsconfig.json`) — e.g. `import useAuth from '@/hooks/useAuth'`. Avoid `../../..` chains.
- **Components:** Keep components modular and reusable. Separate the fetching logic (hooks) from the presentational components.
- **State Management:** Use standard React hooks (`useState`, `useEffect`, `useMemo`). Keep complex global state minimal, relying on backend fetches when possible.
  - `store/` exists to satisfy the schema but is **deliberately empty** — no Zustand/Redux is installed. State is already centralized in `useAuth` and the per-role feature hooks rather than prop-drilled, so a store would add a dependency without solving a real problem. Only introduce one if a genuine cross-component state problem appears.
- **Feature components:** Each role's command center lives in `features/<role>/` and owns its own modals under `features/<role>/components/`. Only genuinely cross-role UI (the image lightbox, alerts, loading spinner, sparkline, the modal shell, the confirm dialog, the user card, the queue tab bar) belongs in top-level `components/`.
- **Modals build on `components/ModalShell.jsx`, not their own `createPortal`.** It owns the portal, the backdrop, Esc-to-close, backdrop-click-to-close, a Tab focus trap, and — the reason it exists — a scrollable body with a footer pinned to the bottom regardless of content length, so a long form can never scroll its own action buttons out of reach. Its class-override props (`panelClassName`, `backdropClassName`, `closeButtonClassName`/`Icon`/`AriaLabel`, `footerClassName`, `bodyClassName`, `bare`) exist for genuine outliers — a lightbox with no white panel, a print-only slip, a split-screen layout that needs two independently-scrolling columns — not as a first reach; a normal modal only needs `title`, `children` and `footer`. Every override prop defaults to the shell's own prior hardcoded output, so adding one never changes an existing consumer.
- **Confirm every save and submission (D-05).** Use `components/ConfirmDialog.jsx` (built on `ModalShell`) for desk decisions, release/handoff, requests/payments, manual/scanned submissions, Graduate applications, profile/password changes, account forms, and Admin creation/edit/template saves. Existing logout/deactivation confirmations remain. Pure navigation, Refresh, View, Live Tracking, printing, and read-only OCR extraction need no additional confirmation. Validate before staging; snapshot the intended payload, send it only on confirmation, and clear it only on success. Cancelling preserves the underlying draft and files. A failed action keeps its confirmation open under acknowledgment feedback, or displays its inline error inside the confirmation. Keep custom labels, loading protections, and Cancel-first focus.
- **Message-send exception to D-05:** The user explicitly approved direct Send/Enter in DocumentChat. Guard duplicate submissions synchronously, disable pending controls, retain the draft on send failure and show errors inline. Clear the draft only after the server accepts it. A subsequent refresh failure must not restore an already sent draft or invite duplicate submission.
- **Sign-in exception to D-05:** Login and login-OTP verification submit directly, without an extra confirmation dialog, as explicitly requested after rollout testing. Keep required staff OTP, inline accessible errors, an announced loading indicator, disabled pending controls and a synchronous duplicate-submit guard. Respect reduced motion. This exception does not remove confirmations from registration, password changes or other saves/submissions.
- **Resend login OTP:** reuse the existing password-validated login call to replace the challenge; retain credentials locally only while the form is mounted. Clear the entered code on a successful fresh challenge, show inline failures, and allow one resend after each 60-second cooldown. The existing server login limiter remains authoritative.
- **Shared API activity:** `services/api.js` counts pending requests and publishes changes through `hooks/useApiActivity.js`. `App` renders a compact, non-blocking `DashboardLoading` indicator until all requests finish, fail or cancel. Keep headers, credentials and authentication handling unchanged. Respect reduced motion; empty data alone does not mean a request is loading. Socket events and third-party image loads are outside this indicator.
- **One hook per feature:** each command center calls its own `features/<role>/use<Role>Dashboard.js`, which builds on the shared `hooks/useDashboardCore.js`. A component should receive a handful of props, never a spread bag of everything a hook returns. If a component needs more than ~5 props, its state probably belongs in its own hook.
- **Never duplicate a helper between a hook and `utils/`.** Pure presentation helpers live in `utils/` and are imported directly by the components that need them — not defined in a hook and passed down as props.
- **Protected files:** uploads are authenticated, so `<img src>` cannot load them directly. Use `useAuthedFile` / `<AuthedFilePreview>` / `<UserAvatar>`, which fetch the bytes with the caller's token and render from a blob URL. `useAuthedFile` passes a fully-qualified `http(s)` URL straight through, so a protected upload and a public fallback can share one call.
- **Mobile first, always.** Every page must be usable at 320 px. Check 320, 375, 768 and desktop widths in both themes. The sidebar rail is `hidden md:flex`, so anything reachable only from it also needs a route through the mobile drawer — render both from one definition (`layouts/SidebarNav.jsx` + `utils/navigation.js`) so they cannot drift. Page titles, card padding and multi-column grids take an `sm:` step up rather than a single fixed size; prefer `min-h-*` over `h-*` on cards whose text can wrap. Wrap queue tabs and action groups; contain horizontal scrolling within tables. Responsive emulation does not replace physical phone acceptance testing.
- **Copyable values:** the shell and controls disable selection. Add `select-text` to rendered names, IDs, tracking numbers, notes and messages outside table cells; inputs and table cells already allow selection. Apply it to the value rather than the surrounding control or label.
- **Button feedback:** use `components/Button.jsx` with shared semantic button classes. Keep the native hit target fixed; only visual content and decorative elevation lift. Preserve disabled/busy guards, form associations, refs and color meaning. Custom boxed geometry can use `trace-button-lift`; tabs/text links remain stationary and navigation keeps its specialized icon feedback. Do not add page-local hover transforms or durations.
- **Motion:** follow [UI_MOTION.md](UI_MOTION.md) and the shared motion tokens: feedback 150 ms, context/continuity 180 ms, drill entry 220 ms and exit 160 ms. Use useMotion, useDrillMotion, MotionDetails and ProgressFill rather than local durations or layout transitions. Imperative transform/transform-origin and measured exit coordinates are runtime geometry only. State, focus and important messages stay immediate; never remount forms to replay motion. CSS reduced motion disables animation/transition and JavaScript cancels active movement/exits. No transition-all, animated blur or decorative floating loops.
- **Themes:** use Tailwind `dark:` variants under the root `.dark` class. `main.jsx` applies the saved `trace_theme` preference before React renders; otherwise it reads the system preference. The shell switch updates that class, including portaled modals. Use the chart variables in `index.css` for SVG strokes and tooltip styles. Printable slips and template previews remain light.
- **System Throughput card:** retain the reporting API's end-to-end average and duration unit. Label its separate daily completion-count chart, let the chart use the card's full content width, and show it only when completed requests and a measured daily series exist. Do not pass an empty measured series into a decorative sparkline fallback. Keep the explicit **No completed requests yet** state and keyboard/mouse access to date/count tooltips.
- **Card feedback:** distinguish whole-card actions from informational panels before applying shared `trace-card-*` classes (see UI_CONVENTIONS.md). User detail cards use native buttons and a restrained 2 px lift; metrics use stationary shadow-only decoration. Cards with nested controls and clipped image/choice previews stay stationary. Never add navigation, pointer cursors or tab stops to informational cards, stack nested lifts, zoom preview images independently, or animate grid spacing. Keep fine-pointer and reduced-motion guards, focus outlines and immediate loading/error behavior.
- **Keyboard access:** retain native buttons and links, visible focus outlines, modal focus containment/restoration and Escape dismissal. The mobile drawer yields keyboard handling while a shared dialog is open. Queue tabs use arrow keys plus Home/End. Each navigation destination needs a distinct icon within its role's menu.
- **Tables scroll inside their card, never down the page.** Wrap every queue table in `<div className="max-h-[60vh] overflow-y-auto overflow-x-auto">` and mark its `<thead>` `sticky top-0 bg-white z-10`. The opaque background is not optional — a transparent header lets rows show through as they scroll underneath.
- **Student progress rows:** use consistent horizontal cell padding and middle alignment. Give the progress bar flexible width, reserve space for the percentage, and render wrapping status text inside an inline-flex chip. Keep date/time on distinct lines and contain narrow-screen scrolling within the table card.
- **Dashboard feedback uses acknowledgment dialogs.** Render `DashboardAlerts` with hook-owned `success`/`error` and an `onDismiss` callback that clears both. Messages dismiss on OK, Escape, backdrop, navigation, internal queue/security/maintenance tab changes, or leaving the browser tab; do not restore timed toasts or native `alert()`. The shell's `feedback` layer sits above forms and confirmations, with its own pinned OK footer. Only the topmost dialog handles focus and Escape; dismissal restores focus and preserves the underlying draft. Existing field validation and profile-save/authentication feedback stay inline.

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
  enters the **actual pages per copy** (`priceDocument()`), because only they know the page count once the document is
  printed. Admin controls rates; the server calculates the final amount from saved request rates. The Finance Clerk confirms the **money** (`verifyPayment()`), which is the only place in
  the entire system that writes `payment_status = 'PAID'`. Never let one endpoint do both: separating
  who decides the charge from who confirms it received is what makes the money trail auditable, and
  it is the first thing a panel will ask about.
- **Every amount is written with its justification.** `priceDocument()` records the clerk id, the
  page count and a free-text reason in the same statement as the amount. An amount whose origin is
  unknown cannot be defended when a student disputes it.
- **Billing is per request, pricing is per document.** Page counts differ, so each document is priced
  on its own; the request only becomes payable when the last one has a price. Billing earlier would
  send a student to Finance once per document in a single request.
- **One student Pay action per payable request group.** Its label includes the total and document count, for example `Pay ₱200.00 (2 documents)`. List document amounts beneath it and show the same group/count/breakdown in checkout. Document rows retain tracking and eligible cancellation. Separate request groups retain separate payments; individual-document partial payment and cross-request aggregation require an explicit workflow/API decision.
- **Logging a counter payment is not clearing it.** `logWalkInPayment()` records the claim and moves
  the request into the verification queue — a walk-in is held to exactly the same standard as an
  online payment.
- **The Secretary's OR check stays procedural.** `verifyOfficialReceipt()` sits between Finance's
  approval and physical handoff — the Secretary confirms the Official Receipt is present and its
  number looks right before releasing the document. It is a deliberate, narrow exception that sits
  close to the authority split above, so it is held to the same rule by never writing
  `payment_status` itself: that stays exclusively `verifyPayment()`'s. Approving `verifyPayment()`
  now also requires an `or_number` — typed in for a digital payment, already on file for a walk-in.
- **Physical OR now, digital copy later.** Finance hands the original Official Receipt to the Secretary and may upload its retained copy later from **Transactions & OR Copies**. Missing `official_receipt_path` must not block payment verification, handoff, or release. Secretary verification requires the recorded OR number and either an uploaded copy to inspect or explicit physical-inspection acknowledgment; record that inspection through the existing `notes` payload. A later upload updates the existing receipt-copy fields without re-verifying payment or changing the pipeline. These inspection prerequisites are currently UI guards, not new server enforcement.
- **OCR never records a payment on its own.** `/ocr/receipt` fills the walk-in form's fields; the
  clerk confirms them before saving. A misread amount here is a money error, which is precisely where
  a human check earns its cost.


## Batch 8 Presentation and Account Conventions

- Use `utils/inputLimits.js` for text-entry limits. Do not truncate stored values or apply new-password caps to login/current-password inputs. Numeric/date controls keep type/range validation rather than `maxLength`.
- Approved limits: names/schools/birthplaces/emails/short answers/references 255; IDs 50; phones 20; program 100; college/document-type/payment-method names 150; suffix/short codes 20; OR number 100; notes/chat/long answers 2000; home address 500; new passwords 64; OTP 6; templates 100000. Payment-method reference labels use 150 to respect their existing SQL column. Existing shared schema/business validation remains authoritative.
- `FileUploadField` owns local object URLs and revokes them on replacement/unmount. Parent hooks own drafts, uploads, confirmations, and authorized replacement. Selection must never automatically save or run OCR; Finance explicitly chooses Read Receipt. Frontend general file allowance is 10 MB, Finance's existing receipt-review/walk-in allowance 5 MB, avatar 2 MB. Signup proof and temporary identity OCR now enforce the same 10 MB image/PDF allowance on the server. Temporary OCR also has its own rate limit and finally cleanup.
- Measure existing paginated table rows with `useViewportPagination`; preserve the first-row position and use the largest observed height to prevent resize/page oscillation. Do not add pagination to currently unpaginated queues/card grids. Keep stable table columns when record content changes between pages.
- Derive tracker nodes/order from `PIPELINE`. Its mobile layout uses three columns with alternating directions, desktop uses the full pipeline width, and SVG connectors measure actual node centers. Numeric layout styles carry computed geometry; they do not create a second theme. No pipeline vocabulary/order change occurred in this batch.
- Derive shared closed-status treatments with `getStatusTone`/`isLegacyClosed`, format display dates with `formatDateTime`, and reuse `formatPeso` from pricing instead of duplicating currency logic. Forecast views share `forecastCeiling` from the unfiltered data; filters do not rescale the same forecast.
- User Manual/FAQ copy is maintained in `docs/USER_MANUAL.md` and the role-aware `HelpPage`. Update both when changing those workflows.


## Batch 8b Account and Policy Conventions

- **Preferences** opens appearance only; the avatar opens **Edit Profile**. Keep HelpPage/manual labels synchronized. Shared notification-dismissal handles route/browser/internal-tab changes without cancelling drafts or decisions.
- Signup **Read ID** is read-only and explicit. Autofill only empty fields, abort/discard stale results, and keep manual fallback. New alumni use Alumni ID in the existing login identifier; preserve existing accounts. Never return raw OCR text or leave temporary scans behind.
- Registration proofs already persist; surface them through existing protected preview/download. Full-profile lookup selects safe fields and requires an authorized staff desk. Do not add generic upload replacement rights.
- Document policies belong to `document_types` and `document_type_colleges`. Save settings/junction rows atomically, enforce against the target student on the server, and lock the user during repeat checks. Exact college matches only; unknown mappings require Admin review.
- Honorable Dismissal stays one copy and one active/completed request. Cancellation/terminal legacy rejection permits retry; a Secretary return to Intake stays active. Repeatable quantities multiply the base charge; filing displays rates only, and Secretary enters actual pages for the server-calculated final amount.
- Counter fee drafts remain inactive until Admin reviews fees and activates. Registrar clarification (2026-10-01): the four same-day walk-in types require original and photocopy presentation. Case-specific attachment requirements now live on request conversations; do not impose a universal list or add automatic holds/pipeline stages without a further policy.


## Batch 10 Fee Schedule Conventions

- Admin controls default rates, named fee items and complete college overrides. A college override replaces the entire schedule, including explicit zero extras and an empty named-item list; it does not inherit missing extras from the default.
- The student filing form shows informational rates (for example TOR ₱100 per printed page), never an estimated total. Full calculation and summary appear on the dashboard after final pricing. TOR captures Year Started/Year Ended in existing purpose JSON; study years do not imply pages. Old semester-bearing records remain readable.
- Final page-based base charge = actual pages per copy × copies × base rate. Flat base charge = copies × base rate. Rental, Special Fee and each named item apply once per document type in the request. Reject duplicate type selections. Keep integer-centavo arithmetic and input checks synchronized in backend/frontend pricing utilities.
- Snapshot the trusted student's college schedule inside the filing transaction; ignore client rates, college and amount. Save final breakdown, amount, printed pages, full basis and clerk identity atomically. Admin changes affect later requests only. Finance alone clears payment; bill a group only after all documents are priced.
- `per_semester_block` remains the stored compatibility key for page-based types. Semester calculations are legacy provisional metadata only; neither semesters nor study years determine the final charge.
- Preserve already priced historical amounts. Do not reconstruct old bills from today's rates. Older unpriced requests without a snapshot require explicit Secretary review of the current schedule before server pricing.

## Batch 10 Text Size and Profile Completion

- Persist 100/125/150/200 text-size preferences per browser and apply them before React renders. Scale typography in rem, including legacy tiny-text utilities and chart labels. Keep the Tailwind spacing token stable so increasing text does not inflate sidebar/icon geometry. Paper output uses 100% root size.
- Use wrapping flex groups and width-based content/dialog container queries to stack narrow grids. Profile content has one scroll area with its action footer reachable; tables and dense charts retain their own horizontal scrollers. Do not hide overflowing page content to mask clipping. Expanded FAQ answers use the available width and natural height.
- The profile camera is the only photo picker. Preserve local validation/preview and confirmed saving; selection never uploads automatically.
- Keep `utils/profileCompletion.js` in backend/frontend synchronized. Completion is derived from saved required fields, including conditional alumni/transfer/maiden-name requirements, with explicit string/number boolean normalization. Student role determines eligibility; a legacy staff user_type must not gate staff.
- Refresh authoritative `getMe` data after successful non-password profile writes before updating completion caches. Preserve dirty drafts during background refresh; report refresh failures separately from failed saves. The API must independently enforce completion under the filing transaction before writes.
