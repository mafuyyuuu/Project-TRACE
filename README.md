# Project TRACE

**Tracking, Routing, and Automated Credential Engine** is a document-request system for the Pamantasan ng Lungsod ng Pasig Registrar's Office. Students and alumni submit requests, provide requirements, follow processing progress and contact support. Window 1, College Secretaries and Finance handle intake, evaluation, payment verification and release. Administrators manage accounts, reference catalogs, reports and analytics.

The system uses React/Vite and Tailwind CSS, an Express API, MySQL, Socket.IO, a Flask AI service and n8n routing. EasyOCR assists with reading uploaded evidence, Prophet forecasts document demand, and an experimental Random Forest estimates stage-wait risk. Staff review remains required; model data, evaluation and limitations are documented in [AI & Model Evaluation](docs/AI_MODEL_EVALUATION.md).

## Requirements

- Git, Node.js 22 and npm.
- MySQL 8 with a running local server and access to create the development database.
- Python 3.12 for the AI service.
- Docker with the Compose plugin for n8n or the container deployment path.

The steps below use a Bash-compatible terminal and a **new local development database**. For an existing installation, follow the [migration guide](docs/MIGRATION_ROLLOUT.md) and [current security rollout](docs/SECURITY_ROLLOUT.md).

## 1. Clone and install

```bash
git clone https://github.com/mafuyyuuu/Project-TRACE.git
cd Project-TRACE
npm --prefix backend ci
npm --prefix frontend ci
cp backend/.env.example backend/.env
```

Run the remaining setup commands from this repository root unless a step says otherwise.

## 2. Configure the backend

Edit `backend/.env` with your local MySQL connection:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_local_mysql_user
DB_PASSWORD=your_local_mysql_password
DB_NAME=trace_db
DB_SSL=false
PORT=3300
FRONTEND_URL=http://localhost:5273
TRUST_PROXY=0
AI_ENGINE_URL=http://127.0.0.1:5005
N8N_URL=http://localhost:5678
RATE_LIMIT_STORE=mysql
```

Replace the example database username/password with your actual local credentials. The account must have schema-creation privileges for installation; production uses separate restricted runtime accounts as described in the security rollout.

Generate independent values for `JWT_SECRET`, `WEBHOOK_SECRET` and `AI_ENGINE_SECRET`. Run this command once for each key and copy each result into its matching entry in `backend/.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Generate `MFA_ENCRYPTION_KEY` separately and save its 64-character result in the same file:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep these keys private and preserve them across restarts. Configure `SMTP_*` for email verification, password recovery and email OTP. Staff authentication requires its configured factor; blank SMTP settings do not provide a working email-OTP login. SMS delivery additionally needs `UNISMS_*`.

The [environment guide](docs/ENV_SETUP_GUIDE.md) explains every setting and provider credential. Environment files stay out of version control.

## 3. Initialize the local database

Import the fresh schema and local demonstration accounts **once**, into an empty installation:

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
node backend/database/check_schema.js
```

Use your MySQL installation account if it differs from `root`. Both SQL files select `trace_db`; `backend/.env` must point to that database. The schema check reads the credentials from `backend/.env`.

The seed password is `trace2024`. Example IDs are `ADMIN001`, `WINDOW1001`, `FINANCE001`, `SEC-CCS001` and `STU2024001`. These accounts are for local development. Their `@trace.edu` email addresses are examples: configure a mailbox you control before testing email OTP or verification. Student workflows also require the applicable profile, identity and email checks.

If the schema check reports missing fields, apply the reviewed prerequisites from the [migration guide](docs/MIGRATION_ROLLOUT.md), then rerun it. Existing databases use preserving migrations rather than fresh schema/seed imports or the broad historical `migration.js` script.

## 4. Start the API and frontend

Open two terminals, each at the repository root.

**API:**

```bash
npm --prefix backend run dev
```

**Frontend:**

```bash
npm --prefix frontend run dev
```

Open **http://localhost:5273**. Vite proxies `/api` and `/socket.io` to the API on port **3300**, so local development needs no separate `VITE_API_URL`.

Check database-backed readiness:

```bash
curl -fsS http://localhost:3300/api/health
```

## 5. Enable AI features and routing

For OCR, forecasts and model-assisted Insights, create a Python environment:

```bash
python3.12 -m venv ai-engine/.venv
source ai-engine/.venv/bin/activate
python -m pip install -r ai-engine/requirements.txt
```

For Linux x86-64 CPU installations, replace the last command with the following to avoid downloading CUDA libraries. It uses the same wheel versions as the [AI Dockerfile](ai-engine/Dockerfile):

```bash
python -m pip install -r ai-engine/requirements.txt \
  --extra-index-url https://download.pytorch.org/whl/cpu \
  'torch==2.14.1+cpu' 'torchvision==0.29.1+cpu'
```

Create a private `ai-engine/.env` containing the same `AI_ENGINE_SECRET` as the backend and the local `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME`. The AI connection needs read access to the forecast/stage-history tables. Start the service in a third terminal:

```bash
cd ai-engine
source .venv/bin/activate
python app.py
```

The service listens on port **5005**. Check it at `http://localhost:5005/health`. The API and AI service must use the same dedicated AI key.

For automatic desk assignment, follow [n8n setup](docs/ENV_SETUP_GUIDE.md#64-n8n-standalone-container), import `n8n/routing-workflow.json` and activate it. Configure its API callback URL and `TRACE_WEBHOOK_SECRET` to match the backend's `WEBHOOK_SECRET`. Keep the editor on localhost. Re-import the workflow when its repository JSON changes.

## Further guides

| Topic | Guide |
| --- | --- |
| Environment settings and external services | [Environment setup](docs/ENV_SETUP_GUIDE.md) |
| Hosting, HTTPS and frontend deployment | [Deployment guide](docs/DEPLOYMENT_GUIDE.md) |
| Updating an existing database | [Migration rollout](docs/MIGRATION_ROLLOUT.md) |
| Current security and recovery setup | [Security rollout](docs/SECURITY_ROLLOUT.md) |
| Student and staff actions | [User manual](docs/USER_MANUAL.md) · [System workflows](docs/SYSTEM_WORKFLOWS.md) |
| Backend architecture and developer checks | [Backend guide](docs/BACKEND_GUIDE.md) · [Coding conventions](docs/CODING_PREFERENCES.md) |
