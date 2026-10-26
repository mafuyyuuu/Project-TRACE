# Project TRACE — System Handbook

This is the operational reference for university staff installing, deploying, updating, and maintaining TRACE. Commands use Bash and run from the repository root unless stated otherwise. Replace example domains, account names, and absolute paths with university values.

This handbook describes the checked-in implementation. It does not certify the state of a VM, migration, backup schedule, or acceptance test. Keep the installed commit, university owners, and release results in private operations records.

## Contents

1. [System overview](#system-overview)
2. [Configuration](#configuration)
3. [Local setup](#local-setup)
4. [Database setup](#database-setup)
5. [Docker setup](#docker-setup)
6. [AI engine](#ai-engine)
7. [n8n](#n8n)
8. [Migrations](#migrations)
9. [Security setup](#security-setup)
10. [Deployment](#deployment)
11. [Backups and recovery](#backups-and-recovery)
12. [Application rules](#application-rules)
13. [Verification](#verification)
14. [Troubleshooting](#troubleshooting)
15. [University handover](#university-handover)

## System overview

| Component | Implementation | Address inside Docker |
| --- | --- | --- |
| Frontend | React/Vite/Tailwind; Vercel or optional nginx container | `frontend:80` when enabled |
| Backend | Express, Socket.IO, authenticated file access | `backend:3300` |
| Database | MySQL 8 | `mysql:3306` |
| AI engine | Flask, EasyOCR, Prophet, scikit-learn | `ai-engine:5005` |
| Routing | n8n workflow | `n8n:5678` |
| HTTPS gateway | Caddy | Public ports 80 and 443 |

The API enforces account permissions and owns application changes. n8n assigns requests through a secret-protected callback. AI provides advisory OCR and analytics with its own gateway secret and restricted database reader.

The deployment supports a VM backend with a Vercel frontend. The existing frontend configuration references `https://trace-plp-api.duckdns.org`. A hostname change requires coordinated updates to the frontend build variable, Vercel rewrite/CSP, DNS, Caddy, and allowed frontend origins.

| State | Location to preserve |
| --- | --- |
| MySQL data | Docker `mysql-data` volume |
| Evidence, receipts, avatars, generated files | `backend/uploads/` locally or Docker `uploads` volume |
| Workflow state and credentials | Docker `n8n-data` volume |
| TLS/Caddy state | Docker `caddy-data` and `caddy-config` volumes |
| Secrets and integration access | Private environment files and provider accounts |

Docker prefixes volume names with the Compose project name. Keep the deployment directory/project identity during updates or explicitly reconcile existing volumes. A new empty volume is not an upgrade of an old installation.

## Configuration

### Environment locations

| Location | Used by |
| --- | --- |
| Root `.env`, copied from [root example](../.env.example) | Compose interpolation/container environment |
| `backend/.env`, copied from [backend example](../backend/.env.example) | Standalone API and database scripts |
| `frontend/.env`, copied from [frontend example](../frontend/.env.example) | Vite development/build |
| `ai-engine/.env` | Standalone Flask; use AI/database settings below |
| Vercel environment settings | Deployed frontend build |

These are independent. Editing `backend/.env` does not update Compose. Vite embeds `VITE_*` values in public JavaScript at build time; never put credentials there. Protect private environment files with mode `0600` and keep them outside Git and support messages.

### Keys and settings

Generate a separate random value for each new signing, webhook, and AI secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Generate the MFA encryption key separately:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate credentials privately and store them securely. **Preserve existing installation keys during an update.** Losing `MFA_ENCRYPTION_KEY` prevents decryption of enrolled authenticator secrets. JWT/webhook rotation affects sessions/integrations and needs a planned procedure.

| Variable | Use |
| --- | --- |
| `JWT_SECRET` | Independent signing secret; never a public placeholder |
| `WEBHOOK_SECRET` | Machine callbacks, including n8n's `x-webhook-secret` |
| `AI_ENGINE_SECRET` | Separate random secret, at least 32 characters in production; identical in API and AI environments |
| `MFA_ENCRYPTION_KEY` | Exactly 64 hexadecimal characters; preserve and back up |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Bundled stack: `mysql`, `3306`, `trace_db`; host-installed local database: `127.0.0.1` |
| `DB_USER`, `DB_PASSWORD` | Restricted API runtime account after provisioning; DBA access only for setup/migrations |
| `MYSQL_ROOT_PASSWORD` | Separate bundled MySQL DBA password; preserve actual existing value |
| `TRACE_API_DB_USER`, `TRACE_API_DB_PASSWORD` | Candidate API account for one-off provisioning |
| `AI_DB_USER`, `AI_DB_PASSWORD` | Separate AI reader account in Compose |
| `DB_SSL`, `DB_SSL_CA` | TLS for external databases; the API accepts CA PEM content. The AI connector expects a CA file path, so a private CA needs separate AI configuration/mounting. Bundled private MySQL uses `false` |
| `DB_POOL_LIMIT`, `DB_POOL_QUEUE_LIMIT` | API connection ceiling (default 10), pending queue (default 200, range 1–1000) |
| `FRONTEND_URL` | Explicit origins, comma-separated. First production origin must be HTTPS and is used for recovery links; no path/query/fragment/credentials |
| `TRUST_PROXY` | `0` for direct local API; `1` for documented Caddy hop. Assess the actual proxy path before changing |
| `RATE_LIMIT_STORE` | `mysql` for shared production counters |
| `HTTP_ACCESS_LOG` | Sanitized API logging; normally `true` in production |
| `AI_ENGINE_URL`, `N8N_URL` | Standalone API connections; Compose supplies service addresses |
| `API_DOMAIN`, `ACME_EMAIL` | API hostname and certificate contact for Caddy |
| `VITE_API_URL` | Blank for local proxy; HTTPS API origin for Vercel, without trailing slash |
| `VITE_AUTH_PROXY` | Enabled by root `vercel.json`; enable elsewhere only with an actual `/api/auth` proxy |
| `UNISMS_SECRET_KEY`, `UNISMS_SENDER_ID` | UniSMS key and approved sender. Previously confirmed sender: `UNISOFT`; override the examples' `TRACE` default with the approved value |
| `TEST_PHONE_NUMBER` | Keep blank in production; this is a fallback recipient, not a safe testing switch |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | University email provider and credentials; normally port 587 |

SMTP is needed for email verification, recovery, and relevant staff authentication workflows. UniSMS is needed for SMS. A skipped/unconfigured channel is not verified by API health. Provider acceptance is not confirmed handset delivery.

In standalone AI, use `DB_USER`/`DB_PASSWORD` for the **AI reader**. Compose maps root `AI_DB_*` into those AI container variables. `APP_ENV=production` enables production AI security checks.

## Local setup

Use Node.js 22/npm, MySQL 8, Git, and Python 3.12 for standalone AI. Docker Engine with the Compose plugin can provide database/AI/n8n instead. Allow disk, memory, and download time for native AI dependencies and OCR models.

```bash
git clone https://github.com/mafuyyuuu/Project-TRACE.git
cd Project-TRACE
git switch dev
npm --prefix backend ci
npm --prefix frontend ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
chmod 600 backend/.env frontend/.env
```

Fill `backend/.env` using [Configuration](#configuration). For host development use `DB_HOST=127.0.0.1`, port 3306, a disposable database, `PORT=3300`, `TRUST_PROXY=0`, and `FRONTEND_URL=http://localhost:5273`. Leave `VITE_API_URL` blank: Vite proxies `/api` and `/socket.io` to port 3300. Set matching AI/routing secrets before testing those integrations.

Complete [Database setup](#database-setup), then start these in separate terminals:

```bash
npm --prefix backend run dev
```

```bash
npm --prefix frontend run dev
```

Open `http://localhost:5273`. Check `http://localhost:3300/api/health`; it tests database connectivity and returns failure when unavailable. Start [AI](#ai-engine) and [n8n](#n8n) for full workflows. API health alone does not establish routing, OCR, email, or SMS operation.

## Database setup

### New development database only

[schema.sql](../backend/database/schema.sql) creates/selects `trace_db`. [seed.sql](../backend/database/seed.sql) adds known demonstration users; it is not a production account policy.

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
```

For this **new, disposable database**, the historical baseline migration populates the initial college/document/payment catalog and performs legacy setup. It can change catalog data, statuses, and accounts. Review it first; do not use it as a routine upgrade:

```bash
node backend/database/migration.js
node backend/database/check_schema.js
```

Demo identifiers/password are in `seed.sql`. Never expose those accounts publicly. Schema presence does not populate university-specific programs or prove catalog/pricing/college assignments are correct. Review Admin settings before acceptance requests.

### New university installation

Keep installation private. Compose initializes an empty MySQL volume with **both schema and demo seed**. It does not rerun them on an existing volume. The default stack is not a public-ready university installation.

Rehearse on a private installation, initialize/review its baseline catalog, and complete [Security setup](#security-setup). Replace the initial Admin's demo credentials and recovery email through controlled bootstrap, enroll the required authenticator, create actual staff accounts, and deactivate other seeded accounts before allowing public access. If a DBA uses schema-only initialization instead, arrange a reviewed first-Admin bootstrap; there is no dedicated production bootstrap command in this repository. Do not create an Admin with a shared demo password.

Review colleges, programs, student categories, document types, page rates and extra fee bases, payment methods, receipt packs, staff desk/college assignments, required evidence, templates, and support availability. Record approved settings. Reconcile n8n's employee-ID mapping with actual staff accounts.

### Existing installation

Preserve database, uploads, accounts, receipt history, configuration, and keys. **Do not import schema or seed over an existing database.** Follow [Migrations](#migrations). Check required columns and the release diff rather than assuming table existence proves compatibility.

## Docker setup

Use [docker-compose.yml](../docker-compose.yml) and a root `.env`. Copy only on a new installation; preserve any existing file:

```bash
cp .env.example .env
chmod 600 .env
```

Set required secrets, separate strong MySQL root password, explicit origins, and integrations. Example database passwords and sender ID are placeholders. During the initial private bootstrap, `DB_USER=root` requires `DB_PASSWORD` to match `MYSQL_ROOT_PASSWORD`; after provisioning, activation switches the API to its separate runtime password. Provision restricted API/AI users before public service.

Validate without printing resolved secrets, then start the private stack:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Backend, AI, and n8n bind to loopback ports 3300, 5005, and 5678. MySQL has no host port mapping. The optional frontend serves the SPA on host port 8080 and proxies API/Socket.IO through nginx:

```bash
docker compose --profile local-frontend up -d --build
```

Port 8080 is host-published: keep it private with the actual firewall during bootstrap. Omit this service when Vercel hosts the frontend. Production HTTPS uses the `tls` profile under [Deployment](#deployment).

Backend UID is 1000; AI UID is 10001. Root filesystems are read-only with dropped capabilities and temporary scratch space. `/app/uploads` must remain writable by the backend. Retain named volumes when recreating containers. Backend runtime omits npm/npx/yarn and AI omits pip; install dependencies during image builds.

## AI engine

### Standalone development

```bash
cd ai-engine
python3.12 -m venv .venv
source .venv/bin/activate
```

On Linux x86-64 install CPU wheels as in the [Dockerfile](../ai-engine/Dockerfile):

```bash
python -m pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu 'torch==2.14.1+cpu' 'torchvision==0.29.1+cpu'
```

On other supported platforms use `python -m pip install -r requirements.txt` with compatible native libraries/wheels. Docker is the preferred reproducible production path; it installs system dependencies, checks packages, and bakes OCR models into the image.

Create private `ai-engine/.env` with matching `AI_ENGINE_SECRET`, AI reader's `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, optional TLS settings, and `PORT=5005`. Use `APP_ENV=production` for production checks. Start Flask development:

```bash
python app.py
```

Check `http://localhost:5005/health`. Business endpoints require `X-Trace-AI-Secret`; call through the backend, never public frontend code. Production uses Docker's Gunicorn command. Expensive work is bounded per worker; busy/unavailable AI may return 503 and the API must expose fallback/review requirements.

### Output meaning and limits

- **OCR:** EasyOCR extracts evidence text. Staff inspect evidence and decide; registration/receipt checks are advisory. Preserve errors and unsupported-scan warnings.
- **Forecast:** Prophet uses dated request history. Compare held-out MAE/RMSE/WAPE with the weekday baseline and read source/warnings. Fallback or insufficient data does not prove trained production accuracy.
- **Stage risk:** Random Forest is experimental. Training can use synthetic simulation and eligible history, discloses provenance, and does not insert simulated requests into MySQL. It does not change dates, prices, statuses, or account decisions.
- **Operational analytics:** dashboards/exports use recorded requests, transitions, feedback, and assignments. Existing legacy synthetic records require disclosure/review, not silent presentation as real university activity.

Retain AI tests and `runtime_smoke.py`. Offline synthetic OCR/forecast smoke tests verify operation; real-document acceptance/model quality still need review.

## n8n

Import [n8n/routing-workflow.json](../n8n/routing-workflow.json). Compose persists editor state in `n8n-data` and supplies:

```text
TRACE_API_URL=http://backend:3300
TRACE_WEBHOOK_SECRET=<same value as backend WEBHOOK_SECRET>
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

The JSON expressions read these names. Keep editor access private: workflows can read environment variables, and Compose uses non-secure cookies for loopback access. For a VM, use a tunnel with the actual SSH host:

```bash
ssh -N -L 5678:127.0.0.1:5678 USER@VM
```

Open `http://localhost:5678`, complete owner setup, import the JSON, inspect HTTP Request nodes, and activate it. The API calls the active **production** `/webhook/route-document`, not the editor's temporary test URL.

Callbacks POST to `/api/documents/assign` with `x-webhook-secret`. Current mapping uses `SEC-<college_code>001` or fallback `ADMIN001`. Reconcile changed university staff IDs, re-import, activate, then verify the actual assigned clerk. A successful n8n execution can still contain a failed callback because nodes continue on errors.

For standalone local n8n, persist `/home/node/.n8n`, publish only `127.0.0.1:5678`, and set the three variables. Use `TRACE_API_URL=http://host.docker.internal:3300` for a host API; Linux Docker also needs `--add-host host.docker.internal:host-gateway`. Standalone backend uses `N8N_URL=http://localhost:5678`. Prefer Compose when both services are containerized.

## Migrations

### Select from the actual schema

1. Record installed/proposed commits; identify schema, catalog, and configuration changes separately.
2. Take an encrypted consistent backup and rehearse against an isolated restored database.
3. Run read-only [check_schema.js](../backend/database/check_schema.js). Missing fields include the relevant script name.
4. Read each selected script and prerequisites; apply only missing, reviewed changes using DBA access. MySQL DDL can partially commit on failure.
5. Rerun preflight, compare data/receipt counts, verify workflows, and record results before live service recreation.

Standalone:

```bash
node backend/database/check_schema.js
```

Container using current runtime credentials:

```bash
docker compose exec -T backend node database/check_schema.js
```

The source's `requirements` array is the full field-to-migration index. Passing proves presence, not indexes, SQL/data compatibility, catalog correctness, or acceptance.

### Dependencies to review

| Area | Scripts/ordering |
| --- | --- |
| Student profiles | `migrate_student_profiles.js` before name-parts, current-student, graduation-year, and alumni-study-year extensions |
| Programs | `migrate_program.js`, then `migrate_program_catalog.js`; `migrate_signup_programs.js` changes catalog data and needs separate review |
| Fees/catalog | `migrate_fee_schedules.js` before `migrate_request_catalog.js`; the latter changes live catalog once under its ledger |
| Receipts | `migrate_finance_receipts.js` before `migrate_receipt_packs.js` |
| Attachments/support | Existing users/documents/message tables before attachment, ticket, support-requirement, and intake-scope extensions; inspect selected scripts' table references |
| Staff support | `migrate_staff_conversations.js` and `migrate_internal_assistance.js` against existing users |
| Authentication | Batch-8 fields, then explicit password reset/history, email verification, trusted browser, authenticator, staff setup, and session changes as reported |
| Recent additions | `migrate_rate_limits.js`, `migrate_release_policy.js`, `migrate_manual_faq_feedback.js`, `migrate_pickup_sms_reminders.js` when needed |

Keep [database scripts](../backend/database) for older installations. Historical `migration.js`, `migration_phase3.js`, and `retroactive_purpose.js` have broad setup/data behavior and are not generic update commands. Do not execute every file: this directory also contains provisioning and disposable integration checks.

### One reviewed migration

The [DBA overlay](../deploy/compose.migrations.yml) uses `MYSQL_ROOT_PASSWORD` and requires candidate API/AI variables. Confirm them privately. It runs a one-off administrative container as root; **never use this overlay with `up`**.

Example only if the field is missing and the release-policy migration is approved:

```bash
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps backend node database/migrate_release_policy.js
```

Use this shape for each explicitly selected filename in reviewed order. Do not expose passwords in CLI arguments. External/managed MySQL needs its own DBA/TLS procedure; bundled-root tools are not general managed-database provisioning tools.

Release-policy migration adds storage; it does not authorize historical date recalculation. Preserve pricing/receipt snapshots. Do not backfill or alter approved rates/policies without a separate decision.

## Security setup

### Bundled MySQL

[configure_security.py](../deploy/configure_security.py) locates this deployment directory's containers and supports the bundled `mysql` service. Default is a plan:

```bash
python3 deploy/configure_security.py
```

For a first security rollout, inspect current configuration privately, back up, then prepare:

```bash
python3 deploy/configure_security.py --prepare
```

Preparation preserves running JWT/MFA/webhook keys and actual MySQL root password, adds missing candidate credentials to private `.env`, and does not recreate services. Stop on unidentified deployment/external DB rather than bypassing checks. Provisioning is not an ordinary every-release step.

Review the grant plan:

```bash
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps backend node database/provision_runtime_users.js
```

On approved first provisioning, create/verify new accounts and activate:

```bash
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps backend node database/provision_runtime_users.js --apply
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps backend node database/provision_runtime_users.js --verify
python3 deploy/configure_security.py --activate-runtime
```

API grants are CRUD without schema administration; AI can SELECT `documents` and `step_logs`. `CREATE USER` fails for existing names and DDL may partially succeed. Inspect failures rather than rerun blindly or overwrite accounts. Activation checks candidate connectivity before switching API credentials. Recreate backend/AI, then check:

```bash
docker compose exec -T backend node database/security_preflight.js
```

All checks must pass: production mode, non-root process/database user, explicit origins, shared rate counters, independent AI key, valid MFA key, writable uploads, restricted grants. This complements permission/firewall tests; it is not a complete security audit.

For a fresh private stack, generate keys/candidate credentials before initialization, complete schema/catalog setup, then provision/verify/activate. Inspect legacy uploads ownership if writes fail. Repairs must target only the actual `/app/uploads` volume with UID/GID 1000, never a recursive host-wide ownership change.

### Network and authentication

Expose only the intended frontend and Caddy ports. Keep MySQL, backend 3300, AI 5005, n8n 5678, temporary frontends, and administration private. Verify host/cloud firewalls, IPv4/IPv6 bindings, and SSH access before changing rules. Preserve working SSH access. [gcp_inventory.py](../deploy/gcp_inventory.py) performs read-only inventory with Google Cloud credentials.

Vercel's first-party `/api/auth` rewrite supports authentication cookies. Other API/Socket.IO traffic still uses `VITE_API_URL`. Preserve HttpOnly/Secure protections and server trusted-browser proof. Test login/logout, MFA, recovery, and browser trust in supported browsers. Do not raise proxy trust or weaken limits merely to bypass shared-edge-IP symptoms.

## Deployment

### Prepare an approved release

Verify on `dev`, then merge the approved release into `main`. CI does not itself deploy the backend. On the VM use the existing installation directory, preserve local configuration, and stop on unexplained working-tree edits:

```bash
git status --short
git fetch origin
git log -5 --oneline origin/main
```

Record approved commit/current images privately, take a verified backup, review migrations/config, and arrange a maintenance window. On a clean checkout tracking approved production:

```bash
git switch main
git pull --ff-only origin main
docker compose config --quiet
docker compose build backend ai-engine
```

Build only affected images when known. Never overwrite real environment with examples. Apply reviewed missing migrations, provision only genuinely missing accounts, and verify schema/keys/upload access before recreation.

### VM and HTTPS

Point API DNS at the VM, configure `API_DOMAIN`/`ACME_EMAIL`, and permit 80/443 through intended firewalls. [Caddyfile](../deploy/Caddyfile) forwards API and WebSockets. Recreate affected services, for example:

```bash
docker compose --profile tls up -d --no-deps backend ai-engine n8n caddy
docker compose ps
docker compose exec -T backend node database/check_schema.js
docker compose exec -T backend node database/security_preflight.js
curl -fsS http://127.0.0.1:3300/api/health
curl -fsS http://127.0.0.1:5005/health
```

This assumes MySQL is already running; fresh private installation starts under [Docker setup](#docker-setup). Select affected services only. n8n JSON changes require import/activation; recreating a container does not replace persisted workflow state.

Check `https://YOUR_API_HOST/api/health` externally, certificate, actual service function/logs, and browser workflows. n8n/Caddy may lack Docker healthchecks. Never use `docker compose down -v`, volume pruning, or broad cleanup during an update.

### Vercel

Set repository root as project root so [vercel.json](../vercel.json) applies. It installs/builds `frontend/`, serves `frontend/dist`, enables `VITE_AUTH_PROXY=true`, and rewrites `/api/auth/:path*` to the API. Set `VITE_API_URL` to the HTTPS API origin in each intended environment.

A hostname change also requires the auth rewrite and CSP `connect-src` for HTTPS/WebSockets, backend `FRONTEND_URL`, DNS/Caddy, and redeployment. Build-time values require rebuilding. Preserve SPA fallback and test hard refresh on nested routes, authentication, and service-worker/cache updates.

### Acceptance and rollback

Complete [Verification](#verification). Record installed SHA, actual health/migration results, test accounts, and unresolved problems. Keep task completion/release approval separate from CI.

Code rollback after additive migration requires checking previous code/images against the new schema; do not automatically reverse schema/data. If data restoration is needed, use rehearsed recovery and an explicit cutover plan. Retain original volumes/backups until accepted.

## Backups and recovery

[recovery.py](../deploy/recovery.py) supports bundled MySQL and named volumes. Managed databases need provider-specific consistent backups plus uploads/n8n/config backups. Default commands show a plan.

### Encrypted backup

Install `age`. Generate the decryption identity on a separate trusted recovery machine; keep it off the production VM. Supply only public `age1...` recipients to the backup job, with private absolute paths outside the repository:

```bash
python3 deploy/recovery.py backup
```

After reviewing disk capacity and maintenance impact:

```bash
python3 deploy/recovery.py backup --run --recipients /absolute/private-config/public-recipients.txt --output /absolute/private-backups
```

The tool briefly stops running backend/AI/n8n writers, dumps MySQL with table counts, archives uploads/n8n, captures private configuration/checksums, encrypts, and resumes writers in a `finally` block. Plan for interruption and verify restart after failure; this is not a zero-downtime backup.

Copy archive/checksum to protected off-host storage. A VM-local file is insufficient disaster recovery. University operations must establish actual scheduling, retention, alerting, access, and owners. Keep provider/DNS/SSH access and certificate recovery details in a separate private inventory.

### Restore drill

Use an isolated trusted Docker host with sufficient capacity. Private `age` identity permissions must be `0600` or stricter:

```bash
python3 deploy/recovery.py drill
python3 deploy/recovery.py drill --run --archive /absolute/private-backups/trace-backup.tar.age --identity /absolute/private-config/age-identity.txt
```

The drill uses separate network/temporary volumes, restores into MySQL 8.4 with events disabled, checks tables/exact baseline row counts, and compares restored file bytes. It never starts restored API/n8n workflows or replaces production volumes. Disable outbound notifications in any broader staging rehearsal.

**A drill is not production cutover.** Actual recovery needs a reviewed DBA plan: restore to separate targets, reconcile private keys/endpoints, validate ownership/data/workflows, and switch traffic deliberately. No automatic production promotion command is provided. Retain original volumes and record measured recovery time/data-loss window.

## Application rules

### Roles and workflow

| Account | Responsibility |
| --- | --- |
| Student | Own profile/evidence/requests, tracking, payment proofs, support |
| Window 1 | Intake, routing support, tracking, release/pickup |
| College Secretary | Assigned college evaluation, pages/pricing, preparation, official-receipt review |
| Finance | Payment verification, receipt packs/issuance, payment records |
| Admin | Accounts/catalogs/configuration, institution-wide tracking, support/analytics |

Backend enforces ownership, desk permissions, and college scope; these are application permissions, not native MySQL row-level security. Guessing an ID or sharing a URL must not expose another student's records/files.

Normal flow: intake/routing → Secretary evaluation/page counts → finalized bill → payment/Finance → required receipt/preparation checks → ready for release → completed pickup. Follow per-document rules/current UI; avoid old payment-before-evaluation sequences. In-app Help provides role-specific instructions.

### Pricing and release policy

Use configured catalogs/fee schedules. Page charges use evaluated pages, copies, and saved request pricing; extras follow configured bases. Eligible page edits may recalculate a bill; finalized billing/receipt snapshots must remain protected. Do not invent missing fees or change approved rates while troubleshooting.

Normal preparation counts **Monday through Thursday only**, based on original submission. Friday/Saturday/Sunday are excluded. No additional holiday-exclusion rule has been approved.

| Document/category | Working days |
| --- | --- |
| BSN RLE; Nursing Hours; BSN Course Description; BSN Course Syllabus; BSN International Form; BSN Accreditation | 15 |
| Transcript of Records — undergraduates; Honorable Dismissal — undergraduates; Copy of Grades; Permanent Record | 10 |
| Transcript of Records — graduates; Honorable Dismissal — graduates | 5 |

Check actual policies for other types/configured same-day exceptions; do not infer a default here. Preserve historical dates during migration. Test per-document dates/totals on multi-document requests, graduate/undergraduate cases, and month/year boundaries.

### Analytics, feedback, notifications

Review real records for long desk waits, requests exceeding 15 working days, and requests past estimated release. Separate prepared documents awaiting pickup from preparation delay. Dashboard/export filters, timestamps, and source records must agree; never fabricate missing figures.

FAQ feedback/suggestions persist separately from support-ticket resolution metrics. Check persistence and visible confirmation independently. Ticket creation, reply visibility, refresh, archive, and student isolation also need acceptance.

Release SMS must use the correct student number, wording, and duplicate/retry controls. Inspect provider errors without exposing numbers/secrets. Send real tests only to an authorized recipient; provider acceptance does not prove delivery.

## Verification

### Automated checks

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
python3 -m unittest discover -s deploy -p 'test_*.py'
```

For isolated AI tests use a separate environment:

```bash
cd ai-engine
python3.12 -m venv .venv-test
source .venv-test/bin/activate
python -m pip install -r requirements-test.txt
python -m unittest test_stage_risk test_analytics test_document_insights test_forecast_evaluation test_support_insights test_security test_registration_verification test_proof_ocr test_ocr_completion
```

[CI](../.github/workflows/security-ci.yml) defines five gates: backend tests/audit, frontend tests/lint/build/audit, isolated AI tests, container/SQL acceptance, and AI runtime/dependency audit. It checks non-root images, disposable SQL, offline OCR/forecast, dependencies, and secrets. `security_integration.js` and `registrar_integration.js` are disposable-database tools, not production smoke commands.

Docker/`age` recovery tests are enabled by CI with `TRACE_RUN_DOCKER_TESTS=1`. A host run without it can skip integration checks; report skips explicitly.

### Acceptance

Use synthetic staging accounts/evidence and record expected/actual results:

1. Login/logout, password recovery, MFA, browser trust, role boundaries, and cross-account file/ticket isolation.
2. Multiple document types, colleges/categories, required evidence, live tracking, page edits, price components, finalized bills, and Finance receipts.
3. Every configured release policy across excluded days and month/year boundaries; original submission and historical dates.
4. Actual n8n assignment, support/FAQ persistence, message refresh, feedback analytics, and failure handling.
5. Dashboard/export totals against source records; extreme cases and preparation versus pickup delay.
6. Shared UI across all five accounts at 320/375/768/1440 pixels, long names, and 200% text. Compare affected screens with [Figma](https://www.figma.com/design/eQNaLBPXQSojI6lOK60Api).
7. HTTPS, private ports, health, upload persistence after recreation, email, and an authorized SMS workflow including retry/rejection/duplicate checks.
8. Off-host restore drill and university-operator setup/recovery rehearsal. Record blockers before task completion/release approval.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API health fails | MySQL/container health, DB host/password/TLS, pool, schema, sanitized logs |
| Missing fields | `check_schema.js` and selected migrations; never reimport schema/seed |
| Uploads fail | Exact mount, free space, UID/GID 1000 ownership, read-only boundaries |
| CORS/auth fails | Exact frontend origins, HTTPS, auth rewrite, built API URL, cookies/trust state, proxy path |
| Login 429 | Shared counters and actual client/proxy path; do not disable limits blindly |
| Unassigned requests | Active n8n production webhook, callback status/header, API URL, employee mapping, actual assignment |
| AI unavailable/busy | Health, matching key, reader grants, memory/workers, OCR models, fallback labels |
| Missing avatar/file | Authenticated file route, ownership, filename/mount, local fallback; do not make uploads public |
| Wrong price/date | Saved pricing, pages/copies, catalog, category, submission date, finalized state |
| SMS/email missing | Provider/sender, recipient, rejection/retry state, duplicate guards; acceptance is not delivery |
| Old frontend | Deployed SHA, build environment/output, service-worker/cache |
| Full VM disk | Inspect disk, backup staging, logs, image/build cache; review exact cleanup targets and preserve volumes |

Read-only diagnostics:

```bash
docker compose ps
docker compose logs --tail=100 backend ai-engine caddy
df -h
docker system df
```

Inspect logs privately and redact unexpected personal data before sharing. Review n8n through its protected editor. Never post fully resolved Compose/container environments: they contain secrets.

## University handover

Transfer ownership through university-controlled accounts and secure channels, separately from this repository:

- GitHub/Vercel ownership, branch/release process, installed SHA, open acceptance tasks, maintainer contacts.
- Cloud/VM billing, SSH, DNS/TLS, firewall inventory, monitoring owners.
- Database/runtime credentials, JWT/webhook/AI/MFA keys, SMTP/UniSMS, approved sender, authenticator/recovery custody.
- Approved programs/catalogs/prices/policies, staff scope, receipt controls, evidence rules, templates.
- Protected off-host backups, retention/schedule, separate decryption identity, last drill, measured recovery objectives.

Have a university operator repeat staging setup, reviewed migration, deployment rehearsal, request/payment/release workflow, and recovery. Keep credentials/student records outside Git. Maintain this handbook and environment examples as behavior changes; Git history retains retired documentation and review artifacts.
