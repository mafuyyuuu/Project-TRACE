# Project TRACE
Tracking, Routing, and Automated Credential Engine for the PLP Registrar.

This repository contains the complete end-to-end system for tracking and auto-routing document flows, featuring a **manual GCash receipt payment verification pipeline** to comply with school accounting requirements.

## Project walkthrough — no account needed

**[Open the live TRACE site](https://project-trace-two.vercel.app) — login required.** The authenticated portals use role-specific accounts; the walkthrough below lets you evaluate the project without signing in. This is a group capstone project, and the descriptions reflect implemented repository workflows rather than a promise that every external service is currently online.

TRACE gives students a document request and tracking portal, while Window 1, College Secretaries, Finance and the Registrar Admin each receive a desk-specific workspace. The stack is React/Vite and Tailwind, Express/Node, MySQL, Socket.IO, a Flask AI engine and an n8n routing workflow.

### Main workflows

| Workflow | What the user sees | What the system does |
| --- | --- | --- |
| Registration and profile | Students/alumni register, submit identity evidence, complete their profile and verify email. Staff use Admin-created accounts. | OCR assists with evidence checks; inconclusive accounts go to staff review. Profile completion and identity/email verification are separate checks. |
| Student request | Choose one or more document types, copies and required attachments; receive individual tracking numbers and follow progress. | Creates a request group, sends it to Window 1 intake and keeps document routing independent within the group. |
| Intake and college processing | Window 1 reviews an online or walk-in submission; the College Secretary evaluates, prepares and prices the document. | Records desk decisions and assignment, supports OCR-assisted intake and calculates applicable final charges from the configured fee rules. |
| Payment and release | The student submits payment proof or pays at the counter. Finance verifies payment; Secretary checks the OR paperwork and hands the document to Window 1 for release. | Grouped payment covers the priced request; authorized desk transitions and audit history record each step through completion. |
| Support | Students open a support ticket, consult approved FAQs and request staff assistance. Staff work within their authorized ticket/case scope. | Maintains ticket conversations, attachments and service-hour/queue state. Support analytics measure ticket service separately from document turnaround. |
| Staff coordination | Authorized desk staff select a colleague and converse; Admin monitors read-only. | Reuses scoped pair conversations, enforces recipient eligibility and protects accepted-message retries. |
| Internal assistance | Window 1, Finance and Secretary staff submit private categorized concerns; Admin claims and resolves them. | Separate ticket/message/audit storage, creator-only staff access, assigned Admin replies and retained resolution/reopen history. Admin monitors operational support read-only. |
| Administration and reports | Admin reviews accounts, maintains catalogs/templates, inspects analytics and exports records. Authorized staff also use scoped reports. | Keeps role/college access rules, configured fees and report filters in the existing service/model layers. |

**A typical request, in about one minute:** imagine a student requesting a TOR and a Diploma. The student submits both in one request; Window 1 reviews the submission and routes it. The Secretary evaluates and prepares each document, then records the final charges. Once the group is fully priced, one verified payment covers it. The Secretary checks the receipt paperwork, Window 1 receives the documents, and the request reaches Completed when the student collects them. The student can inspect tracking throughout and open a support ticket if assistance is needed.

### Screenshots and navigation — synthetic records

These screenshots use synthetic records from the actual React components with mocked API responses. No account is needed to view them. They show repository UI, rather than confirming that the live site has been updated.

| Workflow | Where to navigate | Screenshots |
| --- | --- | --- |
| Alumni without proof | Registration → Alumni → Records / proof unavailable → enter a reason → review and confirm. Account stays pending until Admin records checked identity evidence and a decision. Current students still upload proof. | [Phone signup](docs/alumni-missing-proof-signup.png) · [Confirmation](docs/alumni-missing-proof-review.png) |
| Student request | Student dashboard → New Request → choose documents and attachments → review confirmation. Alumni reuse saved Year Started; requests have no Year Ended field. | [Request form](docs/batch7-request-light.png) · [Confirmation](docs/batch7-confirmation-light.png) · [Phone / dark mode](docs/batch7-request-mobile-dark.png) |
| Intake and clearance | Window 1 → Intake → open a request → review requirements before routing. Blocking clearance must be accepted before routing. | [Queue](docs/batch8-window1-queue-light.png) · [Clearance review](docs/batch8-intake-clearance-light.png) |
| Assignment and college scope | Admin tracker → Assign Staff → review eligible staff and confirm with a reason. Secretary queues show requests within the authorized college. | [Assignment](docs/batch8-staff-assignment-light.png) · [Secretary on mobile](docs/batch8-secretary-mobile-dark.png) |
| Reports and CSV | Reports & Export → edit the visible Student ID / Name, college and document filters → Apply Filters → Export → Export CSV. Finance exports preserve payment groups. | [Visible filters](docs/admin-review-reports.png) · [Phone / dark mode](docs/admin-review-reports-mobile.png) · [Sample CSV](docs/batch9-report-sample.csv) |
| Support and discussion | Open Support → select a ticket to read its conversation. In Digital Request Evaluation, open the separate discussion panel. | [Support workspace](docs/batch10-support-workspace-light.png) · [Empty state](docs/batch10-widget-empty-light.png) · [Phone chat](docs/batch10-widget-mobile-dark.png) · [Evaluation discussion](docs/batch10-evaluation-light.png) |
| Staff coordination | Support → Staff coordination → New conversation → select an eligible colleague → review first message and confirm. | [Desktop](docs/staff-coordination-workspace.png) · [Phone / dark mode](docs/staff-coordination-mobile.png) |
| Internal assistance | Staff → Support → Internal assistance → New concern → review and confirm. Admin → Support → Internal assistance → select and claim → reply or resolve with a note. | [Admin workspace](docs/internal-assistance-workspace.png) · [Staff on mobile / dark mode](docs/internal-assistance-mobile.png) |
| Admin workload and logs | Dashboard → AI Insights → inspect all-stage counts and snapshot time → Refresh insights. Activity Logs → scroll inside the table; full document/tracking/action values wrap separately. Pending count alone does not prove a delay. | [Workload snapshot](docs/admin-workload-insights.png) · [Audit table](docs/admin-audit-wrapping.png) · [Phone / dark mode](docs/admin-audit-mobile.png) |
| Support Analytics | Admin → Efficiency Analytics → Support Analytics → select the measured period → inspect KPI cards and duration tables. Missing samples display as unavailable, rather than zero. | [Analytics views](docs/admin-review-analytics.png) · [Phone / dark mode](docs/batch11-support-analytics-mobile-dark.png) · [Empty period](docs/batch11-support-analytics-empty.png) |

For hands-on local testing, use the [seed accounts below](#-test-accounts--credentials) after completing setup. Required migrations are tracked in the [consolidated deployment checklist](docs/DEPLOYMENT_CHECKLIST.md).

### Finance receipt walkthrough

Finance dashboard → **Official Receipts / History**, beside Verification. The Transactions sidebar route opens the same workspace.

1. Select **Input Issuance Number**, enter the complete first paper serial, and choose its numeric segment when necessary. Review the first three and 50th numbers, then confirm activation. For example, `2026-00001` with its second segment selected ends at `2026-00050`.
2. In **Verification Queue → Review**, inspect the payment, read-only next number and payor name. Confirm approval to issue one receipt; choose **Later** to clear payment with issuance pending. Counter payment logging defaults to pending issuance; its separate verification consumes the number.
3. For an already-cleared payment with no OR, select **Issue Official Receipt** in the history workspace and confirm its reviewed name/number. **Upload OR copy** attaches a JPEG, PNG or PDF (at most 5 MB) to that exact receipt; upload progress and retry preserve the selected file without issuing another receipt.
4. Select **Print / View** beside the issued serial. Full layout supports the defense walkthrough; **Data only** targets preprinted paper. Reprinting uses the same saved details and number. **Printer calibration** saves paper size, margins and global offsets; test on blank paper first. Physical printer success is not confirmed by the app.
5. After 50 issues, use **Change Issuance Number** for the next pack. Early replacement needs a reason; unused/voided numbers are never recycled. Expand receipt/pack history to inspect snapshots or request an audited void before Secretary OR verification and handoff. Voiding preserves the paid payment; a replacement consumes a new serial.

[Receipt history](docs/finance-receipt-history.png) · [Mobile issuance / dark mode](docs/finance-receipt-issue-mobile.png) · [Receipt print preview](docs/finance-receipt-print-preview.png). These are synthetic screenshots, not physical-printer validation or a live deployment. The [migration ledger](docs/DEPLOYMENT_CHECKLIST.md) records `migrate_receipt_packs.js`; the user’s 2026-10-12 SSH output confirms its cloud application, while this screenshot does not establish a matching frontend deployment.

### Internal assistance walkthrough

1. Sign in as Window 1, Finance or a College Secretary, then open **Support → Internal assistance → New concern**. Choose a category, describe the concern and review/confirm submission. The ticket is private to its creator and Admin.
2. Admin opens **Support → Internal assistance**, filters the queue by state/category, selects the concern and confirms **Claim ticket**. The assigned Admin can reply; other Admins can monitor. Staff can add details before and after the claim.
3. Admin can confirm **Await staff reply** while retaining assignment. When the creator replies, handling resumes. **Resolve concern** requires a resolution note and confirmation; the conversation and resolution stay readable.
4. Creator or assigned Admin can confirm **Reopen concern** to return it to the queue. A different Admin may take over an open ticket only if its assigned Admin is inactive or no longer an Admin.

Student Support remains separate and is read-only for Admin; settings and analytics retain administrative controls. No student messages or identity files are imported into internal concerns. Staff-to-staff connections are now available in **Support → Staff coordination**; the [implemented permission matrix](docs/SYSTEM_WORKFLOWS.md#implemented-operational-chat-connections--trace-78-follow-up) describes their scope. The [migration ledger](docs/DEPLOYMENT_CHECKLIST.md) records `migrate_internal_assistance.js`, confirmed cloud-applied by the user’s 2026-10-12 SSH output. Use the local seed accounts below for testing; these screenshots do not establish live deployment or notification delivery.

Support notification links also select another ticket while the workspace is open, preserving new-ticket form drafts. Linked case conversations follow the request’s saved routing college; the Receiving Desk label uses Window 1’s existing intake/release rules and assignment protections.

### Staff coordination walkthrough

1. Sign in with a local Window 1, Finance or Secretary test account and open **Support → Staff coordination**.
2. Choose **New conversation**, search the authorized staff directory by name/desk, select a colleague and enter the first message. Review and confirm. Existing conversations with the same pair/college scope are reused.
3. Select the conversation and use **Send** or Enter for subsequent messages. A failed send keeps the draft for retry. **Staff conversations** opens the list on a phone; Load older messages retrieves retained history.
4. Switch between support, staff coordination and internal assistance without discarding category drafts. Student support stays ticket-based. Secretary peers are restricted to the same college; students, Admin and self are excluded from ordinary recipients.
5. Admin opens the same Staff coordination category to monitor history, with no composer or creation controls. Staff concerns needing an Admin reply use **Internal assistance**.

[Desktop](docs/staff-coordination-workspace.png) and [mobile dark mode](docs/staff-coordination-mobile.png) are synthetic actual-component screenshots. Local seed credentials remain below; matching API/frontend versions must be deployed before live use. The preserving `migrate_staff_conversations.js` is confirmed cloud-applied by the user’s 2026-10-12 SSH output and tracked in the consolidated ledger.

### Contribution highlighted in this update

The current UI consistency work extends the shared Tailwind control system across the five role portals: reusable field/button states, aligned section headings, responsive form grids and shared modal chrome. It fixes omitted button base styles and a profile retry action that could submit its surrounding form, while preserving the existing desk permissions and processing logic. The visual foundations follow the main [TRACE Figma design](https://www.figma.com/design/78A3HTREQ86GIN9ZxvDBSv/TRACE-Draft?node-id=0-1), with accessible mobile, dark-mode and reduced-motion adaptations. This describes this update's concrete contribution; it does not attribute the whole group project's work to one author.

The Revision 2 Batch 7 contribution also adds one-time alumni study years, server-authoritative request reuse, audited Admin corrections, pending alumni registration when proof is unavailable, concise attachment labels and independent password visibility icons. The production follow-up permits alumni-only missing-proof applications with a reason, always pending an audited Admin identity decision; current students still upload proof. It follows the Figma form/confirmation references while retaining the existing pricing and desk workflow. The existing additive migration must precede the paired API/frontend rollout; the follow-up adds no new migration or environment setting.

Revision 2 Batch 8 adds case-specific intake clearance gates, saved college routing scope, audited Admin-only backup assignment and shared accessible queue tabs with visible context motion. It preserves desk/payment/OR prerequisites and adds security regressions for cross-college access, stale assignments and public tracking. These contributions are documented with screenshots and migration limits in the walkthrough above.

Revision 2 Batch 9 adds shared report filtering and export configuration, draft/applied filter state, authoritative identity/college/type filtering and one consistent authorized document CSV contract. The Admin follow-up restores visible filters with combined Student ID / Name search and a separate Export action; CSV shows readable fee/purpose details and exact Manila date/time. It also detects oversized exports and keeps Finance payment totals intact. The [consolidated deployment checklist](docs/DEPLOYMENT_CHECKLIST.md) records every new batch’s migrations and prerequisites for the final rollout.

Revision 2 Batch 11 aligns Support Analytics with TRACE’s Admin card hierarchy and pine-green context strips, replaces boxed statistical rows with spacious semantic tables, and preserves recorded metric definitions, FAQ denominators and historical cutoff states. It adds responsive and report-retry regressions without changing backend calculations or adding a migration.

Revision 2 Batch 13 adds isolated staff-to-Admin assistance with creator privacy, atomic Admin claims, stale-action protection, retry-safe sends, mandatory resolution notes and retained history. It closes Admin intervention paths in operational support and records the ordinary-chat permission matrix, subsequently implemented in the follow-up below. The README walkthrough and consolidated migration ledger replace per-batch acceptance files.

The additional chat contribution implements TRACE-78 recipient connections with active role/college authorization, isolated staff messages/audit storage, retry-safe pair reuse and a Figma-aligned workspace. It preserves student tickets, case processing and Admin internal-ticket authority.

The Admin functional review consolidates Internal assistance under Support, preserves legacy notification links, separates Document Efficiency and Support Analytics, and enables confirmed, audited student/alumni deactivation and reactivation without deleting history. Scan Field Detection describes the OCR parser’s expected-field coverage, rather than model accuracy. Shared report search and human-readable CSV retain college restrictions, payment-group totals and spreadsheet escaping. No new migration is required; cosmetic redesign awaits the forthcoming Figma.

The Admin insights follow-up replaces unsupported optimal-performance claims with observed counts across every active document stage. Random Forest remains a clearly labelled, unvalidated four-example prototype; full queue facts and advisory thresholds work without it. Snapshot times, manual refresh and honest failure states prevent stale advice from appearing current. Admin audit, verification and tracker tables preserve full values with stable columns, wrapping and keyboard-accessible horizontal scrolling. No database migration is added; deploy matching backend/frontend and rebuild the AI image for its updated aggregate contract.

For code review, start with [UI conventions](docs/UI_CONVENTIONS.md), [shared Tailwind styles](frontend/src/index.css), [ModalShell](frontend/src/components/ModalShell.jsx) and the [profile retry regression check](frontend/src/components/__tests__/AcademicProfileFields.test.jsx). For the full desk sequence and user actions, see [System workflows](docs/SYSTEM_WORKFLOWS.md) and [User manual](docs/USER_MANUAL.md).

Deployment setup and rollout checkpoints are documented in [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) and [`docs/PROGRESS.md`](docs/PROGRESS.md). The latest UI work also implements the main TRACE Figma support workspace, compact chat and separate evaluation discussion, preserving existing ticket authorization and retry-safe messaging. The live site and the latest `dev` changes can differ; review and validate branch changes before promoting them. Code follows the layered structure in [`docs/CODING_PREFERENCES.md`](docs/CODING_PREFERENCES.md).

---

## 👥 Groupmates / First-Time Installation (Cloning the Repo)

If you just cloned this repo, you need to install dependencies for **three separate parts** of the project: the Backend, the Frontend, and the AI Engine. 

*(Note: Node.js packages use `package.json` while Python packages use `requirements.txt`. There is no single file to install everything, but the steps below are all you need).*

### Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (v3.9+)
- **MySQL** (v8+)
- **Docker** (Required for running n8n reliably)

### 1. Database Setup
Ensure your MySQL server is running. Log in to MySQL and initialize the database:
```bash
mysql -u root -p
# Inside the MySQL shell:
CREATE DATABASE trace_db;
USE trace_db;
source backend/database/schema.sql;
source backend/database/seed.sql;
exit;
```
*Note: After this, run `node backend/database/migration.js` to execute the database schema upgrades for GCash payments and clerk accounts.*

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2.5. Configure Backend Environment Variables
The backend will not start without this step. Copy the template and fill it in:
```bash
cd backend
cp .env.example .env
```

**👉 Every variable — what it does, where its value comes from, and how to verify it — is documented
in [`docs/ENV_SETUP_GUIDE.md`](docs/ENV_SETUP_GUIDE.md).** For local development you need
`DB_USER`/`DB_PASSWORD`/`DB_NAME` matching your MySQL install, plus a generated `JWT_SECRET` and
`WEBHOOK_SECRET`; SMS and email can stay blank and fail soft.

*(`.env` is gitignored and never committed.)*

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. Install AI Engine Dependencies
```bash
cd ai-engine
# Create a virtual environment
python -m venv .venv
# Activate the virtual environment
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
# Install requirements
pip install -r requirements.txt
```

### 5. Docker & n8n Setup (Orchestrator)
n8n handles the automated routing between desks. It runs locally via Docker.

**Step 1: Install Docker Desktop**
1. Download and install Docker Desktop for your OS from [docker.com](https://www.docker.com/products/docker-desktop).
2. Open Docker Desktop and ensure the engine is running (the icon in your tray should be green).

**Step 2: Create the n8n Container**
Open a terminal and run the following command to pull the n8n image and create the container:
```bash
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n \
  -e TRACE_API_URL="http://host.docker.internal:3300" \
  -e TRACE_WEBHOOK_SECRET="<paste WEBHOOK_SECRET from backend/.env>" \
  -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
  docker.n8n.io/n8nio/n8n
```

The workflow reads its callback target and auth header from these two variables rather than
hardcoding them — see [`docs/ENV_SETUP_GUIDE.md` §6.4](docs/ENV_SETUP_GUIDE.md#64-n8n-standalone-container)
for why, and what to do if you created the container before setting them.

**Step 3: Initial Account Setup**
1. Open your browser and go to `http://localhost:5678`.
2. You will be prompted to create an owner account. Enter your email and a password.
3. Complete the brief onboarding survey (you can skip most of it).

**Step 4: Import the Workflow**
1. Once inside the n8n dashboard, click **"Add Workflow"** (or "+ New workflow").
2. In the top right corner, click the **three dots (...)** and select **"Import from File"**.
3. Navigate to the cloned `project-trace/n8n` directory and select `routing-workflow.json`.
4. The workflow nodes will appear on the screen. **Make sure to toggle it to "Active" (top right switch).**
5. **Check the two environment variables are set** (Step 2). The three HTTP nodes call
   `POST /api/documents/assign` with an `x-webhook-secret` header taken from `TRACE_WEBHOOK_SECRET`;
   it must match `WEBHOOK_SECRET` in `backend/.env` or the call is rejected with 401.
6. **Re-import after pulling changes to the workflow.** n8n stores an imported copy in its own
   database, so editing `n8n/routing-workflow.json` in the repo does nothing until you import it
   again.

**What routing actually does:** the workflow reads `college_code` from the webhook payload and
assigns the document to that college's secretary (`SEC-CCS001`, `SEC-CON001`, …); a student with no
college on file falls back to the Registrar. The assignment is visible in the Secretary's queue —
a routed document appears for the secretary it was routed to and not for the others. If n8n is
stopped the document is simply left unassigned and every secretary sees it under the normal
college filter, so the pipeline never stalls on the orchestrator being down.

---

## 🏃 Daily Startup Guide (How to run the system)

Every time you open your laptop to work on this project, you need to start these four services. Open 4 separate terminal tabs:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
*(Runs on http://localhost:3300)*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*(Runs on http://localhost:5273)*

**Terminal 3 (AI Engine):**
```bash
cd ai-engine
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
python app.py
```
*(Runs on http://localhost:5005 — **not** 5000, which macOS Control Center/AirPlay already occupies)*

**Terminal 4 (n8n Router):**
Ensure Docker Desktop is running.
```bash
docker start n8n
```
*(Opens in browser at http://localhost:5678)*

---

## 🧪 Running the Tests

```bash
cd backend && npm test      # service, authorization and pricing tests
cd frontend && npm test     # utils, hooks and dashboard render tests
```
Neither suite needs a database or a running server — models are mocked.

For a live end-to-end check against real servers (start the backend first):
```bash
node backend/audit.js       # walks a document through all five desks
```

---

## 🔐 Test Accounts / Credentials
These are **local fresh-install seed accounts** from `backend/database/seed.sql`. Their seed password is **`trace2024`**; this is not a verified password for the live site. Do not import the seed into an existing database to obtain these accounts.

Staff login still requires its configured authentication factor. For email OTP, configure a test mailbox and delivery settings for the local account; the seeded `@trace.edu` addresses are examples. Complete required profile, identity and email checks before exercising student request workflows. Authentication requirements remain in place.

| Role | ID | Name | College / Description |
| :--- | :--- | :--- | :--- |
| **Registrar Admin** | `ADMIN001` | Registrar Admin | Accesses ML volume forecasts, AI recommendations, and manually approves student registrations. |
| **Finance Clerk** | `FINANCE001` | Finance Officer | Reviews and manually verifies uploaded GCash screenshots/reference codes. |
| **Window 1 Clerk** | `WINDOW1001` | Window 1 Clerk | Uploads scanned physical forms to OCR dropzone and dispatches ready documents. |
| **Secretary (CCS)** | `SEC-CCS001` | CCS Secretary | College of Computer Studies |
| **Secretary (CON)** | `SEC-CON001` | CON Secretary | College of Nursing |
| **Secretary (CIHM)** | `SEC-CIHM001` | CIHM Secretary | College of International Hospitality Management |
| **Secretary (COE)** | `SEC-COE001` | COE Secretary | College of Engineering |
| **Secretary (CED)** | `SEC-CED001` | CED Secretary | College of Education |
| **Secretary (CAS)** | `SEC-CAS001` | CAS Secretary | College of Arts and Sciences |
| **Secretary (CBA)** | `SEC-CBA001` | CBA Secretary | College of Business and Accountancy |
| **Student** | `STU2024001` | Ana Reyes | BS Information Technology (Sample student account) |

---

## 🚀 Deployment

**Full step-by-step runbook: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).** The summary
below is enough to run the stack locally in Docker; follow the guide to take it live.

Frontend on **Vercel** (free), everything else as containers on one VM. n8n cannot run on Vercel —
it is a stateful container with its own database — so a container host is needed regardless, and the
backend lives beside it. That also keeps Socket.IO on a real process and uploads on a real disk.

### Run the whole stack locally with Docker

```bash
cp .env.example .env          # then fill in JWT_SECRET, WEBHOOK_SECRET and DB_PASSWORD
docker compose up -d --build
docker compose exec backend node database/check_schema.js
```

See [`docs/ENV_SETUP_GUIDE.md` §7](docs/ENV_SETUP_GUIDE.md#7-the-docker-stack-locally) for what goes
in that `.env`. `schema.sql` and `seed.sql` apply automatically the first time the MySQL volume is
created on an empty local database; the read-only preflight checks the required schema. Use these
demo seeds only for local evaluation. Existing installations must follow the
[consolidated migration ledger](docs/DEPLOYMENT_CHECKLIST.md) and
[preserving rollout guide](docs/MIGRATION_ROLLOUT.md), without importing the schema/seed or
running the broad historical migration as an upgrade shortcut. Compose **refuses to start** without `JWT_SECRET` and
`WEBHOOK_SECRET` rather than falling back to a default.

If you already run the standalone `n8n` container from the setup above, it holds port 5678 and the
compose one will not start. Stop it first (`docker stop n8n`) or drop the `n8n` service from your
compose file.

Add `--profile local-frontend` to also serve the built SPA (port 8080) — only needed for a
single-box deployment; with Vercel hosting the frontend, leave it out. Keep the profile's
`VITE_API_URL` blank to use its Nginx proxy for `/api` and `/socket.io`, including authenticated
uploads and WebSocket upgrades. SPA refresh/reset links and hashed-asset caching remain available.

### Deploying

1. **Provision the VM** and install Docker. On an ARM host (e.g. Oracle Cloud Ampere) images build
   for `linux/arm64` — verified working: PyTorch ships aarch64 wheels and Prophet's Stan binary
   compiles.
2. **Bring up MySQL and the backend**, following the preserving rollout guide for an existing
   database and applying only reviewed missing migrations before restarting writers. Run the
   read-only schema preflight. Confirm `GET /api/health` returns
   200 — it runs a real `SELECT 1` and answers **503** if the database is unreachable.
3. **Put HTTPS in front of it.** This is not optional: a browser on `https://…vercel.app` refuses to
   call an `http://` backend (mixed content). Caddy with automatic Let's Encrypt is the least work,
   and it needs a hostname — a bare IP cannot get a certificate.
4. **Deploy the frontend to Vercel.** Import the repo; `vercel.json` already sets the build command,
   output directory and the SPA rewrite. Set **`VITE_API_URL`** to the backend's HTTPS origin as a
   **build** environment variable — Vite inlines `VITE_*` at build time, so changing it later needs
   a redeploy, not a restart.
5. **Point the backend back at it:** set `FRONTEND_URL` to the Vercel domain and restart. That is
   both the CORS allowlist and the base of password-reset links. Set `TRUST_PROXY=1` so the rate
   limiters see real client IPs.
6. **Walk the pipeline live**: register → request → pay → Finance verify → Secretary → Window 1.
7. **Then** the AI engine and n8n.

### Deployment environment variables

**👉 [`docs/ENV_SETUP_GUIDE.md`](docs/ENV_SETUP_GUIDE.md) is the complete reference** — every
variable, where to obtain each credential (DuckDNS hostname, Gmail App Password, UniSMS key, managed
database), the order to fill them in, and a verification command for each.

**Persistence:** the uploads volume is the only state outside MySQL. The database stores *filenames*
only, so without a mounted volume the rows survive a redeploy and the files do not.

---

## 🚚 How to Transfer Database to Another Computer

If you need to move Project TRACE to a different computer (like a deployment server or a colleague's laptop), you must export your MySQL database.

### Step 1: Export (On Old Computer)
```bash
mysqldump -u root -p trace_db > trace_db_backup.sql
```
*Move this `trace_db_backup.sql` file into your project folder and transfer the whole project folder.*

### Step 2: Import (On New Computer)
Make sure the new computer has MySQL installed. Inside the transferred folder:
```bash
mysql -u root -p -e "CREATE DATABASE trace_db;"
mysql -u root -p trace_db < trace_db_backup.sql
```
*(Then follow the **First-Time Installation** steps to install dependencies on the new computer).*
