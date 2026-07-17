# Project TRACE
Tracking, Routing, and Automated Credential Engine for the PLP Registrar.

This repository contains the complete end-to-end system for tracking and auto-routing document flows, featuring a **manual GCash receipt payment verification pipeline** to comply with school accounting requirements.

> **Current Phase:** 🟢 100% Core System Completed (Phase 7: Production Rollout Pending). The frontend is fully wired to live AI APIs, machine learning forecasts, and SMS notifications.

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

---

## 🏃 Daily Startup Guide (How to run the system)

Every time you open your laptop to work on this project, you need to start these four services. Open 4 separate terminal tabs:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
*(Runs on http://localhost:3000)*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*(Runs on http://localhost:5173)*

**Terminal 3 (AI Engine):**
```bash
cd ai-engine
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
python app.py
```
*(Runs on http://localhost:5000)*

**Terminal 4 (n8n Router):**
Ensure Docker Desktop is running.
```bash
docker start n8n
```
*(Opens in browser at http://localhost:5678)*

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
