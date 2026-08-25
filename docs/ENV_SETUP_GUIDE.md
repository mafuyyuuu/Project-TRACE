# Project TRACE — Configuration & Credentials Guide

**This is the single source of truth for every environment variable in TRACE** — what it does, where
its value comes from, and how to prove it's right. The other docs link here rather than repeating it.

If you are deploying, read this *before* [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md): that guide
walks the deployment steps in order and assumes you already hold the values below.

---

## 1. Where configuration lives

There are **four** places, and they are independent of each other. Setting a value in one does not
set it in the others — this is the single most common source of "it works locally but not deployed".

| File / place | Read by | When to fill it |
| --- | --- | --- |
| **`.env`** (repo root) | `docker-compose.yml` → injected into the containers | Running the Docker stack, locally or on the VM |
| **`backend/.env`** | `cd backend && npm run dev`, and `node database/migration.js` | Local development without Docker |
| **`frontend/.env`** | `cd frontend && npm run dev` / `npm run build` | Local development without Docker |
| **Vercel → Settings → Environment Variables** | `vite build` on Vercel | Deploying the frontend |

Each has a committed `.env.example` beside it. Copy, don't edit the example:

```bash
cp .env.example .env                    # root — Docker stack
cp backend/.env.example backend/.env    # local backend
cp frontend/.env.example frontend/.env  # local frontend
```

> **`.env` files are gitignored and must stay that way.** `.env.example` files are committed and must
> never contain a real value.

**Why the root and `backend/` files are separate.** In Docker, compose reads the root `.env` and
passes the values into the container as process environment variables; the backend container has no
`.env` file inside it at all. Outside Docker, `src/config/env.js` loads `backend/.env` directly.
Nothing bridges the two, so when you run both ways you maintain both files.

**Every backend variable is read through `src/config/env.js`.** Nothing in the codebase touches
`process.env` directly, so that file is the authoritative list of what the backend understands.

---

## 2. Pick your path

Three ways to run TRACE. Jump to the section you need.

| I want to… | Fill in | Section |
| --- | --- | --- |
| Develop on my laptop, services started by hand | `backend/.env` + `frontend/.env` | [§6](#6-local-development-no-docker) |
| Run the whole stack locally in Docker | root `.env` (3 values) | [§7](#7-the-docker-stack-locally) |
| Deploy to production (Vercel + VM) | root `.env` on the VM + Vercel | [§8](#8-production-vercel--vm) |

---

## 3. Values you generate yourself

These are not obtained from anyone. You create them, and they exist nowhere else.

### `JWT_SECRET` — required, the server refuses to boot without it

Signs every login token. Anyone who knows it can forge a token for **any** account, including
`ADMIN001`.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the 96-character hex string. Generate a **different** one for production than the one you use
locally.

> ⚠️ **Never reuse `trace-jwt-secret-change-in-production`.** That string shipped as a hardcoded
> fallback and is still readable in this repo's git history. `env.js` warns loudly at startup if it
> detects it.

### `WEBHOOK_SECRET` — required, same

The shared secret for machine-to-machine callers — currently the n8n router calling
`POST /api/documents/assign`. That endpoint has **no user session**, so this secret is the only thing
between it and the public internet. It is compared in constant time in
`middlewares/webhookAuth.middleware.js`.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The same value must reach n8n as `TRACE_WEBHOOK_SECRET`, which n8n sends as the `x-webhook-secret`
header. In the Docker stack compose wires this automatically. Running n8n standalone, you pass it on
the `docker run` line — see [§6.4](#64-n8n-standalone-container).

### `DB_PASSWORD` — the MySQL root password

For the compose-managed MySQL this is a password **you invent**; the container is created with it.
Any long random string works:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

> ⚠️ **It is fixed the first time the MySQL volume is created.** Changing `DB_PASSWORD` in `.env`
> later does *not* change the password stored in the volume — the backend then fails to connect and
> `/api/health` returns 503. The only reset is `docker compose down -v`, which **destroys all data**.
> Decide this value before your first `docker compose up`.

For a local non-Docker MySQL, this is simply the password you set when you installed MySQL.

---

## 4. Values you get from a service

Each of these requires signing up somewhere. None are required for the app's core pipeline to
work — the document workflow runs fine with SMS and email unconfigured.

### 4.1 `API_DOMAIN` — a hostname for the backend (DuckDNS)

**Needed for:** production only. **Cost:** free.

Caddy obtains a Let's Encrypt certificate for this hostname. **A bare IP address can never be issued
a certificate**, so a hostname is mandatory, not cosmetic — without HTTPS the Vercel-hosted frontend
(served over `https`) is blocked by the browser from calling the API at all.

1. Go to [duckdns.org](https://www.duckdns.org) and sign in with Google/GitHub.
2. Type a subdomain name, e.g. `trace-api`, and click **add domain**. You now own
   `trace-api.duckdns.org`.
3. Paste your VM's **public IP** into the `current ip` box and click **update ip**.
4. Wait, then confirm DNS resolves *before* starting Caddy — Let's Encrypt validates over the public
   internet:

```bash
dig +short trace-api.duckdns.org     # must print your VM's public IP
```

```ini
API_DOMAIN=trace-api.duckdns.org     # no https://, no trailing slash — hostname only
```

Any domain you already own works the same way: point an A record at the VM's IP.

### 4.2 `ACME_EMAIL` — where Let's Encrypt sends expiry warnings

**Needed for:** production only. Just your own email address. Not published anywhere.

```ini
ACME_EMAIL=you@example.com
```

### 4.3 `VITE_API_URL` — set in Vercel, not in a file

**Needed for:** production only. This is the **backend's** origin, given to the **frontend**.

Its value is `https://` + your `API_DOMAIN`:

```
https://trace-api.duckdns.org
```

Set it in **Vercel → your project → Settings → Environment Variables**, applied to Production,
Preview and Development. **No trailing slash.**

> ⚠️ **Baked in at build time, not read at runtime.** Vite inlines every `VITE_*` variable into the
> JavaScript bundle during `npm run build`. Setting or changing it requires a **redeploy** — a
> restart picks up nothing. Set it *before* your first deploy, or the build succeeds and every API
> call silently 404s against Vercel's static host.

Left blank, the frontend uses relative URLs (`/api`, `/socket.io`) — correct for local development,
where the Vite dev proxy forwards them to `localhost:3300`, and wrong everywhere else.
`services/api.js` and `services/realtimeService.js` are the only two files that build a URL from it.

### 4.4 `FRONTEND_URL` — the Vercel domain, given to the backend

**Needed for:** production. The mirror image of `VITE_API_URL`, and it does **two** jobs:

1. The CORS allowlist for both the REST API *and* the Socket.IO handshake.
2. The base of the link in password-reset emails.

You only learn this value **after** your first Vercel deploy. Vercel shows it on the project page,
e.g. `project-trace.vercel.app`:

```ini
FRONTEND_URL=https://project-trace.vercel.app
```

Include the scheme, omit the trailing slash — it is compared as an exact string. Comma-separate to
allow more than one origin (staging plus production):

```ini
FRONTEND_URL=https://project-trace.vercel.app,https://trace-staging.vercel.app
```

Blank means development: any origin is reflected. **A deployment must set it.**

### 4.5 `SMTP_*` — email, via a Gmail App Password

**Needed for:** password-reset emails and email notifications. Optional — but while it's unset,
**password-reset links are only printed to the server console**, so students cannot actually recover
their own accounts.

A Google **App Password** is required. Your normal account password will not work, and Google will
reject it.

1. The Google account must have **2-Step Verification enabled** — App Passwords do not exist without
   it. Turn it on at [myaccount.google.com/security](https://myaccount.google.com/security).
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Type a name (e.g. `TRACE`) and click **Create**.
4. Google shows a **16-character** password in four groups, e.g. `abcd efgh ijkl mnop`. **Copy it
   now — it is shown once.** Remove the spaces when pasting.

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.address@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=your.address@gmail.com
```

- `SMTP_PORT=587` uses STARTTLS. Port `465` is also supported — the transport switches to implicit
  TLS automatically when the port is exactly 465.
- `SMTP_FROM` is optional; it defaults to `SMTP_USER`. Set it only if the From address differs.
- **All three of `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` must be set** or the channel counts as
  unconfigured and is skipped.

> The literal strings `mock_user` and `mock_pass` are explicitly treated as *unconfigured*. Fake
> credentials used to be the default here, which made every email fail at send time with an opaque
> SMTP error that looked like a bug. Don't reintroduce placeholders — leave the fields blank instead.

The backend prints channel health at startup, so you get a straight answer:

```
✅ [EMAIL] Connected to smtp.gmail.com.
⚠️  [EMAIL] SMTP_HOST / SMTP_USER / SMTP_PASS are not set — email alerts are disabled.
```

### 4.6 `UNISMS_*` — SMS notifications

**Needed for:** SMS alerts. Optional; unconfigured means SMS is skipped with a stated reason.

1. Sign in at [unisms.io](https://unisms.io) (the account behind the `@taliffsss/unisms` client).
2. Open the **API keys / credentials** section of the dashboard.
3. Create a key and copy the **secret key**.

```ini
UNISMS_SECRET_KEY=<the secret key>
UNISMS_SENDER_ID=TRACE
TEST_PHONE_NUMBER=+639171234567
```

- `UNISMS_SENDER_ID` is the name recipients see. Default `TRACE`. Some routes require a
  pre-registered sender ID.
- `TEST_PHONE_NUMBER` is the fallback recipient used when a student has no phone number on file.
  Leave blank in production.

> 🔴 **Outstanding action: rotate this key.** The old UniSMS key was committed as a hardcoded
> fallback and **is still readable in this repo's git history**. Revoke it in the UniSMS dashboard
> and issue a new one before deploying. Rotating in the dashboard is the only fix — the old value
> cannot be removed from history retroactively.

### 4.7 Managed database credentials

Only if you're not using the bundled MySQL container. See [§9](#9-using-a-managed-database).

---

## 5. Values you derive from your topology

Nobody issues these. They follow from how you're running things.

### `TRUST_PROXY` — a hop count, never `true`

The number of reverse proxies in front of Express.

| Setup | Value |
| --- | --- |
| Local, backend reached directly | `0` |
| Docker stack with the `tls` profile (Caddy in front) | `1` |

Get it wrong low and every request appears to come from the proxy's IP, so all users share one
rate-limit bucket and one person's failed logins lock out everybody. It is deliberately a **count**
and not `true`: trusting `X-Forwarded-For` unconditionally would let any client spoof its own address
and walk straight past `loginLimiter`.

### `AI_ENGINE_URL` and `N8N_URL`

Where the backend finds the Flask engine and the orchestrator.

| Setup | `AI_ENGINE_URL` | `N8N_URL` |
| --- | --- | --- |
| Local, all by hand | `http://127.0.0.1:5005` | `http://localhost:5678` |
| Docker stack | `http://ai-engine:5005` | `http://n8n:5678` |

In Docker these are set by compose — you do not put them in `.env`. Both clients return `null` and
log rather than throwing, so the app runs with either service down.

> Port **5005**, not 5000: macOS Control Center (AirPlay Receiver) already listens on 5000.

### `PORT`

Backend `3300`, AI engine `5005`, frontend dev server `5273`. Changing the backend port means
changing the Vite dev proxy in `frontend/vite.config.js` too.

### `DB_POOL_LIMIT`

Connections opened **per instance**, default `10`. Only worth touching against a managed database
with a low connection cap — N replicas each open this many.

### `FLASK_DEBUG`

Read by `ai-engine/app.py`; defaults to off. **Leave it unset in production** — Werkzeug's debugger
is remote code execution behind any traceback. It is not in any `.env.example` on purpose.

---

## 6. Local development (no Docker)

### 6.1 `backend/.env`

```bash
cp backend/.env.example backend/.env
```

Minimum viable file:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<your local MySQL password>
DB_NAME=trace_db
DB_SSL=false

PORT=3300
JWT_SECRET=<generated, see §3>
WEBHOOK_SECRET=<generated, see §3>

FRONTEND_URL=
TRUST_PROXY=0

AI_ENGINE_URL=http://127.0.0.1:5005
N8N_URL=http://localhost:5678
```

Leave `FRONTEND_URL` **blank** locally — blank reflects any origin, which is what the Vite dev proxy
and a teammate hitting your machine both need.

`UNISMS_*` and `SMTP_*` can stay blank. Notifications fail soft: the document workflow is unaffected
and the startup log tells you which channels are off.

### 6.2 `frontend/.env`

```bash
cp frontend/.env.example frontend/.env
```

```ini
VITE_API_URL=
```

**Blank is correct locally.** Requests stay relative and `vite.config.js` proxies `/api` and
`/socket.io` (with `ws: true`) to `localhost:3300`. Setting it locally is how you break the dev proxy.

### 6.3 Database

```bash
mysql -u root -p -e "CREATE DATABASE trace_db;"
mysql -u root -p trace_db < backend/database/schema.sql
mysql -u root -p trace_db < backend/database/seed.sql
node backend/database/migration.js
```

`migration.js` reads `backend/.env` through the same `env.js`, so it must be filled in first. Run it
**after** the seed — the seven per-college secretaries (`SEC-CCS001` … `SEC-CBA001`) are created by
the migration, not by `seed.sql`.

### 6.4 n8n (standalone container)

The workflow reads its target and auth header from environment variables, so they must be set on the
container:

```bash
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n \
  -e TRACE_API_URL="http://host.docker.internal:3300" \
  -e TRACE_WEBHOOK_SECRET="<the same WEBHOOK_SECRET from backend/.env>" \
  docker.n8n.io/n8nio/n8n
```

- `host.docker.internal` is how a container reaches your host's backend. Not `localhost` — that would
  be the container itself.
- `TRACE_WEBHOOK_SECRET` must match `WEBHOOK_SECRET` **exactly**, or every routing call is rejected
  with 401 and documents are silently left unassigned.
- Already created the container without them? `docker rm -f n8n` and re-run, or set them in the n8n
  UI under **Settings → Environments**.

> Never hardcode the URL into the workflow JSON. It previously had `localhost:3000` baked into three
> nodes and kept pointing there for a month after the backend moved to 3300 — failing silently the
> entire time.

### 6.5 Verify

```bash
cd backend && npm run dev
```

A correct configuration prints the database connection, then the channel-health summary. Then:

```bash
curl -s localhost:3300/api/health     # {"status":"ok", ... "database":"ok"}
```

---

## 7. The Docker stack locally

Only the root `.env` matters. `backend/.env` is not used by the containers.

```bash
cp .env.example .env
```

Three values are enough:

```ini
JWT_SECRET=<generated>
WEBHOOK_SECRET=<generated>
DB_PASSWORD=<invented — decide now, see §3>
```

Everything else has a working default. `FRONTEND_URL` stays blank, `TRUST_PROXY` can stay `1` or drop
to `0` (nothing proxies you locally), and `API_DOMAIN`/`ACME_EMAIL` are unused unless you start the
`tls` profile.

```bash
docker compose config --quiet        # silent = valid; complains = a required secret is missing
docker compose up -d --build
docker compose exec backend node database/migration.js
```

`schema.sql` and `seed.sql` run automatically the first time the MySQL volume is created (via
`/docker-entrypoint-initdb.d`, which only fires on an empty data directory, so it never re-runs
against real data). The migration adds everything since.

> Running the standalone n8n container from §6.4? It holds port 5678 and the compose one won't start.
> `docker stop n8n` first.

---

## 8. Production (Vercel + VM)

### 8.1 Fill-in order

Two variables reference each other's host, so they cannot both be filled in first. This order
resolves it:

```
1. Generate JWT_SECRET, WEBHOOK_SECRET, DB_PASSWORD          (§3)
2. Claim the DuckDNS hostname, point it at the VM's IP        → API_DOMAIN
3. Write the VM's .env — everything except FRONTEND_URL
4. docker compose up -d --build,  then --profile tls          → HTTPS live
5. Vercel: set VITE_API_URL = https://<API_DOMAIN>            (BEFORE the first deploy)
6. Deploy on Vercel → it hands you the domain
7. Back on the VM: set FRONTEND_URL = that domain, then `docker compose up -d`
```

Step 5 before step 6 is not optional: `VITE_API_URL` is inlined at build time, so a deploy that
happens before it's set produces a bundle that talks to the wrong host.

### 8.2 The VM's `.env`

```ini
# Secrets — compose refuses to start without the first two
JWT_SECRET=<96-char hex, production-only>
WEBHOOK_SECRET=<96-char hex, production-only>
DB_PASSWORD=<strong, fixed at first volume creation>
DB_NAME=trace_db
DB_SSL=false                                   # bundled MySQL is on a private network

# Filled in at step 7, after Vercel gives you the domain
FRONTEND_URL=https://project-trace.vercel.app

# Caddy is exactly one proxy hop
TRUST_PROXY=1

# HTTPS
API_DOMAIN=trace-api.duckdns.org
ACME_EMAIL=you@example.com

# Not used — Vercel serves the frontend
VITE_API_URL=

# Notifications
UNISMS_SECRET_KEY=<rotated key>
UNISMS_SENDER_ID=TRACE
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.address@gmail.com
SMTP_PASS=<16-char app password, no spaces>
SMTP_FROM=your.address@gmail.com
```

`VITE_API_URL` in this file applies **only** to the optional `local-frontend` compose profile (a
single-box deployment where nginx also serves the SPA). With Vercel hosting the frontend it stays
blank — the Vercel dashboard value is the one that counts.

### 8.3 In Vercel

| Name | Value | Environments |
| --- | --- | --- |
| `VITE_API_URL` | `https://trace-api.duckdns.org` | Production, Preview, Development |

Nothing else. `vercel.json` already sets the build command, output directory and the SPA rewrite —
that rewrite is what stops `/reset-password?token=…` from 404-ing on a static host.

---

## 9. Using a managed database

Instead of the bundled MySQL container (Aiven, TiDB Cloud, RDS, PlanetScale…). Set these in the root
`.env` — compose passes all of them through, and the bundled `mysql` service simply goes unused
(`docker compose stop mysql` once the stack is up if you want it out of the way).

```ini
DB_HOST=mysql-xxxx.aivencloud.com
DB_PORT=23456
DB_USER=avnadmin
DB_PASSWORD=<from the provider's dashboard>
DB_NAME=trace_db
DB_SSL=true
DB_POOL_LIMIT=10
```

**Where to find them:** every provider shows a "connection details" or "connect" panel with host,
port, user, password and database name. Some show only a connection URI — decompose it:

```
mysql://avnadmin:PASSWORD@mysql-xxxx.aivencloud.com:23456/trace_db
        └─USER──┘ └─PASS─┘ └───────DB_HOST────────┘ └PORT┘ └DB_NAME┘
```

### `DB_SSL` is not optional here

**A managed provider will refuse a plaintext connection outright** — the first query fails, and
`/api/health` returns 503. `DB_SSL=true` is the fix. `rejectUnauthorized` is always true and cannot be
disabled: accepting any certificate would defeat the point of using TLS.

### `DB_SSL_CA` — only when the provider issues its own CA

Leave it **blank** if the provider uses a publicly trusted CA (most do) — the system trust store
covers it. Aiven and some others hand you a `ca.pem` to download; that is when you need this.

It takes the **PEM contents themselves, not a file path**. In a `.env` file, wrap it in double quotes
and let it span lines:

```ini
DB_SSL_CA="-----BEGIN CERTIFICATE-----
MIIEQTCCAqmgAwIBAgIUE...
...
-----END CERTIFICATE-----"
```

Then confirm compose actually parsed the newlines before you rely on it:

```bash
docker compose config | grep -A3 DB_SSL_CA
```

### Schema on a managed database

The `/docker-entrypoint-initdb.d` auto-seed only applies to the bundled container. On a managed
database you load the schema yourself, then migrate:

```bash
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p --ssl-mode=REQUIRED trace_db < backend/database/schema.sql
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p --ssl-mode=REQUIRED trace_db < backend/database/seed.sql
docker compose exec backend node database/migration.js
```

---

## 10. Complete variable reference

**Root `.env`** (Docker stack). ✅ = required.

| Variable | ✅ | Default | Purpose / what breaks without it |
| --- | :-: | --- | --- |
| `JWT_SECRET` | ✅ | — | Signs auth tokens. Compose refuses to start; server refuses to boot. |
| `WEBHOOK_SECRET` | ✅ | — | Guards `POST /api/documents/assign`. Also injected into n8n. |
| `DB_PASSWORD` | | `trace` | MySQL root password. **Fixed at first volume creation.** |
| `DB_NAME` | | `trace_db` | Database name. |
| `DB_HOST` | | `mysql` | Override only for a managed database (§9). |
| `DB_PORT` | | `3306` | Override only for a managed database. |
| `DB_USER` | | `root` | Override only for a managed database. |
| `DB_SSL` | | `false` | `true` for a managed database, which refuses plaintext. |
| `DB_SSL_CA` | | — | PEM contents, only when the provider issues its own CA. |
| `DB_POOL_LIMIT` | | `10` | Connections per instance. Keep under the provider's cap. |
| `FRONTEND_URL` | | blank | CORS allowlist **and** password-reset link base. Blank = any origin. |
| `TRUST_PROXY` | | `1` | Proxy hop count. `1` behind Caddy, `0` direct. Never `true`. |
| `API_DOMAIN` | | `localhost` | Caddy's certificate hostname. `tls` profile only. |
| `ACME_EMAIL` | | blank | Let's Encrypt expiry warnings. `tls` profile only. |
| `VITE_API_URL` | | blank | `local-frontend` profile only. Not the Vercel value. |
| `UNISMS_SECRET_KEY` | | blank | SMS. Blank = channel skipped with a stated reason. |
| `UNISMS_SENDER_ID` | | `TRACE` | Sender name on SMS. |
| `TEST_PHONE_NUMBER` | | blank | Fallback recipient when a student has no phone on file. |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | | blank | Email. All three needed, or the channel is skipped. |
| `SMTP_PORT` | | `587` | `465` switches to implicit TLS. |
| `SMTP_FROM` | | `SMTP_USER` | From address, if different. |

**`backend/.env`** additionally understands `DB_HOST`, `DB_PORT`, `DB_USER`, `PORT`, `AI_ENGINE_URL`
and `N8N_URL` — in Docker those are set by compose instead.

**`frontend/.env`** — `VITE_API_URL` only.

**Vercel** — `VITE_API_URL` only.

**n8n** — `TRACE_API_URL` and `TRACE_WEBHOOK_SECRET`; set by compose in the Docker stack, or on the
`docker run` line standalone.

---

## 11. Verifying your configuration

Run these top to bottom. Each proves one thing.

```bash
# 1. Compose can resolve every variable (silent = pass)
docker compose config --quiet

# 2. The backend booted AND actually reached the database
curl -s localhost:3300/api/health           # {"status":"ok", ... "database":"ok"}
#    503 = process is up, database is not. That distinction is the point of this endpoint.

# 3. The AI engine is up
curl -s localhost:5005/health               # TRACE AI Engine is running

# 4. Notification channels — read the backend's startup log
docker compose logs backend | grep -E "\[(SMS|EMAIL)\]"
#    ✅ = configured and connected.  ⚠️ = skipped, with the reason stated.

# 5. HTTPS and the certificate (production)
curl -s https://trace-api.duckdns.org/api/health

# 6. CORS — the hostile origin must print NOTHING. That is the pass condition.
curl -sI -X OPTIONS https://trace-api.duckdns.org/api/auth/login \
  -H "Origin: https://project-trace.vercel.app" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin

curl -sI -X OPTIONS https://trace-api.duckdns.org/api/auth/login \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin

# 7. VITE_API_URL really was baked into the deployed bundle
#    Open the Vercel URL, log in, and watch the Network tab: requests must go to
#    your API domain. If they go to *.vercel.app/api and 404, it wasn't set at build time.

# 8. n8n routing reached the API with the right secret
docker compose exec mysql mysql -uroot -p"$DB_PASSWORD" trace_db \
  -e "SELECT d.tracking_number, u.student_id AS routed_to
      FROM documents d JOIN users u ON u.id = d.assigned_clerk_id
      ORDER BY d.id DESC LIMIT 3;"
#    Expect SEC-CCS001 for a CCS student. NULL = n8n isn't reaching the API
#    (routing fails soft, so the pipeline still works).

# 9. The uploads volume survives a restart
#    Upload a profile picture → `docker compose restart backend` → reload.
#    The avatar must still be there. The database stores filenames only.
```

---

## 12. Symptom → variable

| Symptom | Cause |
| --- | --- |
| Backend won't boot: *"JWT_SECRET is not set"* | Working as designed. `.env` missing, or not beside `docker-compose.yml`. |
| `docker compose up` errors on a required variable | The `${VAR:?}` guard. Set `JWT_SECRET` / `WEBHOOK_SECRET`. |
| Every API call fails with a CORS error | `FRONTEND_URL` doesn't exactly match the Vercel origin. Scheme required, no trailing slash. Restart after changing. |
| API calls hit `vercel.app/api/...` and 404 | `VITE_API_URL` wasn't set **at build time**. Set it and **redeploy** — a restart does nothing. |
| `/api/health` returns 503 | Backend can't reach MySQL. `DB_PASSWORD` doesn't match what the volume was *first created* with, or a managed DB needs `DB_SSL=true`. |
| Managed DB: connection refused / handshake error | `DB_SSL=false`. Providers reject plaintext. |
| Login works, notifications never arrive live | WebSocket not upgrading. Check Caddy is proxying and nothing strips `Upgrade`. Data still appears on refresh by design. |
| Password-reset emails never arrive | SMTP unconfigured — the link is in the server console. Or `SMTP_PASS` is an account password, not an App Password. |
| Reset link 404s in production | The `vercel.json` SPA rewrite. Don't remove it. |
| SMS never sends | `UNISMS_SECRET_KEY` blank. Startup log states it. |
| Documents never get assigned to a secretary | `TRACE_WEBHOOK_SECRET` ≠ `WEBHOOK_SECRET` → 401. Fails soft, so nothing looks broken. |
| One user's failed logins rate-limit everyone | `TRUST_PROXY=0` behind Caddy. Set `1`. |
| Certificate won't issue | DNS not propagated, or 80/443 blocked. **Both** Oracle's security list and the VM's iptables must allow them. |
| Avatars/receipts 404 after a redeploy | The `uploads` volume isn't mounted. Filenames are in MySQL; the bytes are only in that volume. |
| First upload fails with `ENOENT` | The `uploads` volume isn't mounted — the directory is created at boot otherwise. |

---

## 13. Security rules

- **Never commit a `.env`.** All three are gitignored. `.env.example` files are committed and must
  hold no real value.
- **Different secrets per environment.** A local `JWT_SECRET` must never be the production one.
- **Two credentials are compromised in this repo's git history** and cannot be un-published:
  - `trace-jwt-secret-change-in-production` — the old `JWT_SECRET`. **Rotated ✅**
  - The old UniSMS API key. **Still needs rotating in the UniSMS dashboard 🔴**
- **Rotating a secret has consequences.** Changing `JWT_SECRET` invalidates every issued token —
  everyone is logged out. Changing `WEBHOOK_SECRET` requires updating n8n's `TRACE_WEBHOOK_SECRET`
  in the same breath, or routing 401s.
- **Never set `FRONTEND_URL` blank in production.** Blank reflects any origin, which lets any website
  open an authenticated Socket.IO connection.
- **Never set `TRUST_PROXY=true`.** A hop count is deliberate; `true` lets a client spoof
  `X-Forwarded-For` and evade the login rate limiter.
- **Never enable `FLASK_DEBUG` in production.** Werkzeug's debugger is remote code execution behind
  any traceback.
- **Back up both** the database and the uploads volume. A database dump alone restores rows pointing
  at files that no longer exist.

---

**See also:** [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) for the deployment steps in order ·
[`../README.md`](../README.md) for local setup and test accounts ·
[`BACKEND_GUIDE.md`](BACKEND_GUIDE.md) for endpoints and schema.
