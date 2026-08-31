# Project TRACE
Tracking, Routing, and Automated Credential Engine for the PLP Registrar.

This repository contains the complete end-to-end system for tracking and auto-routing document flows, featuring a **manual GCash receipt payment verification pipeline** to comply with school accounting requirements.

> **Current Phase:** 🟢 Deployment-Ready — every phase through 17 is complete; **Phase 18 (Go Live)** is outstanding and needs an account and a machine, not code. See [`docs/PROGRESS.md`](docs/PROGRESS.md). The frontend is fully wired to live AI APIs, machine learning forecasts, and SMS notifications, and the codebase follows the layered structure documented in [`docs/CODING_PREFERENCES.md`](docs/CODING_PREFERENCES.md).

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
**The password for ALL accounts is: `trace2024`**

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

> ⚠️ **Seed drift:** the seven per-college secretary accounts above are **not created by `seed.sql`** — it seeds only a single `SEC001` (College Secretary) with no college assigned. Until those rows are added, log in as `SEC001` to reach the Secretary dashboard, and note that college-based queue filtering cannot be demonstrated. Tracked in `docs/PROGRESS.md` (Phase 9).

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
docker compose exec backend node database/migration.js
```

See [`docs/ENV_SETUP_GUIDE.md` §7](docs/ENV_SETUP_GUIDE.md#7-the-docker-stack-locally) for what goes
in that `.env`. `schema.sql` and `seed.sql` apply automatically the first time the MySQL volume is
created; the migration adds the later columns. Compose **refuses to start** without `JWT_SECRET` and
`WEBHOOK_SECRET` rather than falling back to a default.

If you already run the standalone `n8n` container from the setup above, it holds port 5678 and the
compose one will not start. Stop it first (`docker stop n8n`) or drop the `n8n` service from your
compose file.

Add `--profile local-frontend` to also serve the built SPA (port 8080) — only needed for a
single-box deployment; with Vercel hosting the frontend, leave it out.

### Deploying

1. **Provision the VM** and install Docker. On an ARM host (e.g. Oracle Cloud Ampere) images build
   for `linux/arm64` — verified working: PyTorch ships aarch64 wheels and Prophet's Stan binary
   compiles.
2. **Bring up MySQL and the backend**, then run the migration. Confirm `GET /api/health` returns
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
