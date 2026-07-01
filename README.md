# Project TRACE
Tracking, Routing, and Analytics Computing Engine for the PLP Registrar.

This repository contains the complete end-to-end system for tracking, auto-routing, and analyzing document flows, now including an **automated GCash/QRPh payment gateway**.

---

## 🏃 Daily Startup (How to run the system)

Every time you open your laptop to work on this project, you need to start these four services. Open 4 separate terminal tabs:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

**Terminal 3 (AI Engine):**
```bash
# Activate the virtual environment
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
cd ai-engine
python app.py
```

**Terminal 4 (n8n Router):**
```bash
npx n8n
```

---

## ⚙️ First-Time Installation & Setup

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v18+ recommended)
- **Python** (v3.9+)
- **MySQL** (v8+)

### 1. Database Setup
Ensure your MySQL server is running. Log in to MySQL and initialize the database:
```bash
mysql -u root -p
# Inside the MySQL shell:
source backend/database/schema.sql;
source backend/database/seed.sql;
exit;
```

### 2. Backend (Node.js API)
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

### 3. Frontend (React UI)
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:5173`)*

### 4. AI Engine (Python OCR)
```bash
cd ai-engine
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run the Flask API
python app.py
```
*(Runs on `http://localhost:5000`)*

### 5. Routing Engine (n8n)
```bash
npx n8n
```
*(Opens in browser at `http://localhost:5678`)*. Import the `n8n/routing-workflow.json` file to activate the routing rules.

---

## 🔐 Test Accounts / Credentials
**The password for ALL accounts is: `trace2024`**

| Role | Employee / Student ID | Name | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `ADMIN001` | Registrar Admin | Access to all documents and analytics. |
| **Clerk 1** | `CLERK001` | Receiving Clerk | Receives documents (Window 1). |
| **Clerk 2** | `CLERK002` | Records Clerk | Receives documents (Secretary). |
| **Student** | `STU2024001` | Juan Dela Cruz | Sample student account. |

---

## 🚚 How to Transfer & Run on Another Computer

If you need to move Project TRACE to a different computer (like a deployment server or a colleague's laptop), follow these exact steps:

### Step 1: Export the Database (On the Old Computer)
You need to package your current MySQL database so you don't lose any data. Run this in your terminal:
```bash
mysqldump -u root -p trace_db > trace_db_backup.sql
```
*Move this `trace_db_backup.sql` file into your `project-trace` folder.*

### Step 2: Zip the Source Code
Compress the `project-trace` folder into a `.zip` file. 
**Important:** You do not need to copy the massive hidden folders (`node_modules` or `.venv`). The new computer will rebuild them cleanly.

### Step 3: Transfer
Send the `.zip` file to the new computer via a flash drive, Google Drive, or GitHub. Extract the folder on the new computer.

### Step 4: Import the Database (On the New Computer)
Make sure the new computer has MySQL installed. Open the terminal inside the extracted folder:
```bash
# Log into MySQL and create a fresh database
mysql -u root -p -e "CREATE DATABASE trace_db;"

# Import the backup file
mysql -u root -p trace_db < trace_db_backup.sql
```

### Step 5: Install Dependencies (On the New Computer)
The new computer must download all the packages specific to its operating system.

**For the Backend:**
```bash
cd backend
npm install
```

**For the Frontend:**
```bash
cd ../frontend
npm install
```

**For the AI Engine:**
```bash
cd ../ai-engine
python -m venv .venv
source .venv/bin/activate   # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Once installed, simply follow the **Daily Startup** guide at the top of this file to turn all four services back on!
