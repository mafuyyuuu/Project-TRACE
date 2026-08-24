# Project TRACE
Tracking, Routing, and Automated Credential Engine for the PLP Registrar.

This repository contains the complete end-to-end system for tracking and auto-routing document flows, featuring a **manual GCash receipt payment verification pipeline** to comply with school accounting requirements.

> **Current Phase:** 🟢 Panel Feedback — Categories 1–3 Complete (Phase 14: Production Rollout Pending). The frontend is fully wired to live AI APIs, machine learning forecasts, and SMS notifications, and the codebase now follows the layered structure documented in [`docs/CODING_PREFERENCES.md`](docs/CODING_PREFERENCES.md).

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
The backend will not connect to MySQL without this step. Copy the template and fill in your local values:
```bash
cd backend
cp .env.example .env
```
At minimum set `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to match your MySQL install, and generate a `JWT_SECRET` (the server will not start without one):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Do **not** reuse the old `trace-jwt-secret-change-in-production` value — it is public in this repo's git history, and anyone who knows it can forge a login for any account. The SMS (`UNISMS_*`) and email (`SMTP_*`) variables can be left blank — those notifications will simply fail soft and log a warning, without breaking any document workflow.

*(`.env` is gitignored and never committed. Ask a teammate for the shared service credentials.)*

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
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

**Step 3: Initial Account Setup**
1. Open your browser and go to `http://localhost:5678`.
2. You will be prompted to create an owner account. Enter your email and a password.
3. Complete the brief onboarding survey (you can skip most of it).

**Step 4: Import the Workflow**
1. Once inside the n8n dashboard, click **"Add Workflow"** (or "+ New workflow").
2. In the top right corner, click the **three dots (...)** and select **"Import from File"**.
3. Navigate to the cloned `project-trace/n8n` directory and select `routing-workflow.json`.
4. The workflow nodes will appear on the screen. **Make sure to toggle it to "Active" (top right switch).**
5. **Add the webhook secret.** The node that calls back into `POST /api/documents/assign` must send a header `x-webhook-secret` whose value matches `WEBHOOK_SECRET` in `backend/.env`. Without it the call is rejected with 401 (documents still flow through the desks normally — only the auto-assignment step is skipped).

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
