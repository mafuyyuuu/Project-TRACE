# Project TRACE
Tracking, Routing, and Analytics Computing Engine for the PLP Registrar.

This repository contains the complete end-to-end system for tracking, auto-routing, and analyzing document flows.

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v18+ recommended)
- **Python** (v3.9+)
- **MySQL** (v8+)
- **Tesseract OCR** (`brew install tesseract`)

### 1. Database Setup
First, ensure your MySQL server is running. Then, log in to MySQL and initialize the database using the provided scripts:

```bash
# Log into MySQL (you may need to add -p if your root user has a password)
mysql -u root

# Inside the MySQL shell, run:
source backend/database/schema.sql;
source backend/database/seed.sql;
exit;
```
*Note: The seed script creates an Admin (`ADMIN001`) and two Clerks (`CLERK001`, `CLERK002`). The password for all is `trace2024`.*

### 2. Backend (Node.js API)
Open a new terminal window:
```bash
cd backend
npm install
npm run dev
```
*The backend will run on `http://localhost:3000`.*

### 3. Frontend (React UI)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`.*

### 🔐 Test Accounts / Credentials
If you've run the `seed.sql` script, the following accounts are available to log in to the frontend. 
**The password for ALL accounts is: `trace2024`**

| Role | Employee / Student ID | Name | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `ADMIN001` | Registrar Admin | Has access to all documents and analytics. |
| **Clerk 1** | `CLERK001` | Receiving Clerk | Receives documents like Clearances. |
| **Clerk 2** | `CLERK002` | Records Clerk | Receives documents like TORs. |
| **Student** | `STU2024001` | Juan Dela Cruz | Sample student account. |

### 4. AI Engine (Python OCR)
Open a new terminal window:
```bash
cd ai-engine
# Activate the virtual environment
source venv/bin/activate
# Install dependencies (only needed the first time)
pip install -r requirements.txt
# Run the Flask API
python app.py
```
*The AI engine will run on `http://localhost:5001`.*

### 5. Routing Engine (n8n)
Open a new terminal window:
```bash
npx n8n
```
*n8n will open in your browser at `http://localhost:5678`.*
- Import the `n8n/routing-workflow.json` file.
- Make sure the workflow toggle is set to **Active**.

---

## 🗄️ Database Management (Using a Workbench)

Since you don't have a database UI yet, managing MySQL entirely through the terminal can be difficult. You can download a visual Database Workbench (like **DBeaver**, **MySQL Workbench**, or **TablePlus** — *TablePlus* is highly recommended for Mac users).

### How to Connect your downloaded Workbench:
Once you download and open your chosen Workbench, you need to "Create a New Connection". Select **MySQL** as the database type, and enter these exact details:

- **Host / Server:** `localhost` (or `127.0.0.1`)
- **Port:** `3306`
- **Username:** `root`
- **Password:** *(Leave this blank if you haven't set a password for your root user. If you have, enter it here).*
- **Database:** `trace_db`

Click **Test Connection**. If it succeeds, save it. You can now click on `trace_db` to view your `users`, `documents`, and `step_logs` tables in a nice visual spreadsheet view!
