# Project TRACE — Deployment Guide

How to take TRACE from a laptop to a live URL. Follow the parts in order; each one ends with a check
you can run before moving on.

**Time:** roughly 2–3 hours, most of it waiting on the Oracle VM to be approved and on the AI engine
image to build.

---

## The shape of it

| Piece | Where | Why there |
| --- | --- | --- |
| React SPA | **Vercel** (free) | Static build, CDN, HTTPS and preview deploys at no cost. |
| Backend API | **VM container** | Socket.IO needs a long-lived process, and uploads need a real disk. |
| AI engine | **VM container** | ~1–2 GB of RAM for PyTorch/EasyOCR. |
| n8n | **VM container** | Stateful, with its own database. |
| MySQL | **VM container** | Raw `mysql2` SQL throughout; not portable to Postgres without a rewrite. |

**Why the backend isn't on Vercel.** Not a limits problem — Vercel supports WebSockets and 5 GB
functions now. It's that **n8n cannot run on Vercel at all**, so a container host is needed
regardless. Given one, putting the backend beside it avoids three rewrites: uploads onto blob
storage, a Redis adapter for Socket.IO (notifications are emitted from HTTP handlers, so on
multi-instance they'd silently miss sockets held by another instance), and fitting PyTorch under the
function size cap.

---

## Before you start

You'll need:

- **An Oracle Cloud account** — Always Free tier. Requires a card for identity verification; it is
  not charged.
- **A GitHub account** with this repo pushed, and a **Vercel account** signed in through it.
- **A hostname for the backend.** A free [DuckDNS](https://www.duckdns.org) subdomain is fine. This
  is not optional — see Part 4.
- **Your credentials**, gathered before you start. **[`ENV_SETUP_GUIDE.md`](ENV_SETUP_GUIDE.md) is
  the reference for all of them** — what each variable does, where to obtain its value, and the
  order to fill them in. At minimum you need a freshly generated `JWT_SECRET` and `WEBHOOK_SECRET`,
  a `DB_PASSWORD`, a Gmail App Password for SMTP, and a **rotated** UniSMS key.

---

## Part 1 — Provision the VM

1. Sign in to Oracle Cloud → **Compute → Instances → Create instance**.
2. **Image:** Ubuntu 22.04 or 24.04. **Shape:** `VM.Standard.A1.Flex` (Ampere / ARM).
3. Allocate **2 OCPU and 12 GB** — the current Always Free ceiling. It was 4/24 until Oracle halved
   it in June 2026 without announcement, so older guides will tell you otherwise.
4. Save the SSH private key it offers. You cannot download it again.
5. **Networking → add ingress rules** for TCP **80** and **443** on the subnet's security list.

> **"Out of capacity" is normal.** Free ARM instances are in heavy demand. Retry, or pick a less
> busy region — the region is fixed once your account is created, so choose deliberately.

Then, on the VM:

```bash
ssh -i your-key.pem ubuntu@YOUR_VM_IP

sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker

# Ubuntu's firewall is separate from Oracle's security list — both must allow traffic.
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

**Check:** `docker run --rm hello-world` prints a success message, and `uname -m` prints `aarch64`.

---

## Part 2 — Get the code and configure it

```bash
git clone https://github.com/YOUR_USERNAME/project-trace.git
cd project-trace
cp .env.example .env
nano .env
```

**Fill it in from [`ENV_SETUP_GUIDE.md` §8.2](ENV_SETUP_GUIDE.md#82-the-vms-env)** — it has the
complete production `.env` with every value explained. Leave `FRONTEND_URL` blank for now; you fill
it in during Part 6, once Vercel has given you a domain.

**Check:** `docker compose config --quiet` exits silently. If it complains about a missing variable,
that's the guard working — compose refuses to start without the secrets rather than defaulting.

---

## Part 3 — Bring up the stack

```bash
docker compose up -d --build
```

The AI engine image is ~2.5 GB and compiles Prophet's Stan binary from source. **Expect 15–25
minutes on ARM.** It only happens once.

Then apply the schema upgrades:

```bash
docker compose exec backend node database/migration.js
```

`schema.sql` and `seed.sql` apply automatically the first time the MySQL volume is created; the
migration adds everything since. It's idempotent, so re-running is safe.

**Check:**

```bash
docker compose ps                          # mysql, backend, ai-engine, n8n all "healthy"
curl -s localhost:3300/api/health          # {"status":"ok", ... "database":"ok"}
curl -s localhost:5005/health              # TRACE AI Engine is running
```

`/api/health` runs a real `SELECT 1` and returns **503** if the database is unreachable — so a green
answer here means the backend genuinely reached MySQL, not just that the process is alive.

---

## Part 4 — HTTPS

**This part is mandatory.** The frontend will be served from Vercel over `https`, and browsers block
an `https` page from calling an `http` API. Without a certificate the deployed app cannot talk to its
backend at all.

1. Point your hostname at the VM's public IP (on DuckDNS, paste the IP and click update).
2. Confirm DNS has propagated — Let's Encrypt validates over the public internet, so this must
   resolve *before* you start Caddy:

```bash
dig +short api.yourname.duckdns.org      # should print your VM's IP
```

3. Start Caddy:

```bash
docker compose --profile tls up -d
```

Caddy obtains and renews the certificate by itself. It needs a real hostname — a bare IP can never be
issued one.

**Check:** `curl -s https://api.yourname.duckdns.org/api/health` returns the same JSON as before, over
HTTPS, with no certificate warning.

---

## Part 5 — Deploy the frontend to Vercel

1. Vercel → **Add New → Project** → import the repo.
2. Leave the build settings alone. `vercel.json` already sets the build command, the output directory
   and the SPA rewrite.
3. **Add `VITE_API_URL` before the first deploy** — value `https://api.yourname.duckdns.org`, no
   trailing slash, applied to Production, Preview and Development. See
   [`ENV_SETUP_GUIDE.md` §4.3](ENV_SETUP_GUIDE.md#43-vite_api_url--set-in-vercel-not-in-a-file).
4. **Deploy**, and copy the domain it gives you (e.g. `project-trace.vercel.app`).

> **`VITE_API_URL` is baked in at build time, not read at runtime.** Setting it before the *first*
> deploy matters: forget, and the build succeeds while every API call quietly 404s against Vercel's
> static host. Changing it later needs a **redeploy**, not a restart.

---

## Part 6 — Point the backend back at Vercel

On the VM:

```bash
nano .env      # FRONTEND_URL=https://project-trace.vercel.app
docker compose up -d
```

`FRONTEND_URL` does double duty: it's the CORS allowlist for both the REST API and the Socket.IO
handshake, **and** the base of the links in password-reset emails. Get it wrong and either the app
can't call its API, or reset links point somewhere that doesn't exist.

**Check** — from your laptop, with a hostile origin as the control:

```bash
# Allowed origin — should echo the header back
curl -sI -X OPTIONS https://api.yourname.duckdns.org/api/auth/login \
  -H "Origin: https://project-trace.vercel.app" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin

# Hostile origin — should print NOTHING
curl -sI -X OPTIONS https://api.yourname.duckdns.org/api/auth/login \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

The second command printing nothing is the pass condition, not an error.

---

## Part 7 — Verify the whole pipeline

Open the Vercel URL and walk it through, watching the browser's Network tab:

1. **Log in** as `STU2024001` / `trace2024`. Requests should go to your API domain, not to Vercel.
2. **Submit a request** with an attachment.
3. **Pay** — upload any image as a receipt.
4. **Log in as `FINANCE001`** in a private window and verify the payment. The student's tab should
   receive a notification **without a refresh** — that proves the WebSocket upgraded cross-origin.
5. **`SEC-CCS001`** evaluates → **`WINDOW1001`** releases.
6. **Refresh on `/dashboard`.** It must render, not 404 — that's the SPA rewrite working.
7. **Upload a profile picture**, then `docker compose restart backend` and reload. The avatar must
   still be there — that's the uploads volume doing its job.

> Uploaded files are the only state outside MySQL, and the database stores **filenames only**. If the
> volume isn't mounted, the rows survive a redeploy and the images all 404.

---

## Part 8 — n8n routing

n8n is already running from Part 3, with `TRACE_API_URL` and `TRACE_WEBHOOK_SECRET` injected by
compose.

1. Open `http://YOUR_VM_IP:5678` and create the owner account.
2. **Workflows → Import from File** → `n8n/routing-workflow.json`.
3. Toggle it **Active**.

**Check:** submit a request as a CCS student, then confirm it was routed:

```bash
docker compose exec mysql mysql -uroot -p"$DB_PASSWORD" trace_db \
  -e "SELECT d.tracking_number, u.student_id AS routed_to
      FROM documents d JOIN users u ON u.id = d.assigned_clerk_id
      ORDER BY d.id DESC LIMIT 3;"
```

You should see `SEC-CCS001`. If `assigned_clerk_id` stays NULL the document still flows normally —
routing fails soft by design — but n8n isn't reaching the API.

> The workflow reads its target from **environment variables**, not hardcoded values. That's
> deliberate: it previously had `localhost:3000` baked into three nodes and kept pointing there for a
> month after the backend moved to 3300, failing silently the whole time. If you edit the JSON in the
> repo, **re-import it** — n8n keeps its own copy.

---

## Troubleshooting

**Every API call fails with CORS errors.** `FRONTEND_URL` on the backend doesn't exactly match the
Vercel origin. It must include the scheme and have no trailing slash. Restart the backend after
changing it.

**API calls go to `vercel.app/api/...` and 404.** `VITE_API_URL` wasn't set at build time. Set it in
Vercel's environment variables and **redeploy** — it's inlined into the bundle, so a restart changes
nothing.

**Login works but notifications never arrive live.** The WebSocket isn't upgrading. Check Caddy is
proxying (`docker compose logs caddy`) and that nothing sits in front stripping `Upgrade` headers.
Data still appears on refresh, because realtime degrades to fetch-on-load by design.

**Backend won't start: "JWT_SECRET is not set".** Working as intended — it refuses to boot rather
than fall back to a default. Check `.env` is at the repo root, beside `docker-compose.yml`.

**`/api/health` returns 503.** The backend is up but can't reach MySQL. `docker compose logs mysql`,
and confirm `DB_PASSWORD` matches what the MySQL volume was *first created* with — changing it later
doesn't change the stored password. If you must reset: `docker compose down -v` (**destroys all
data**) and start over.

**First upload fails with ENOENT.** Shouldn't happen — the directory is created at boot — but check
the `uploads` volume is mounted: `docker compose exec backend ls -ld /app/uploads`.

**Certificate won't issue.** DNS hasn't propagated, or ports 80/443 are blocked. Both Oracle's
security list *and* the VM's own iptables must allow them; people usually forget the second.

**AI engine build fails or is killed.** It compiles Prophet's Stan binary and needs headroom. Confirm
the VM really has 12 GB (`free -h`), and give it 20+ minutes before assuming it hung.

**n8n won't start, port 5678 in use.** You have a standalone n8n container from local development.
`docker stop n8n`, or drop the n8n service from compose.

---

## Routine operations

```bash
# Update to the latest code
git pull && docker compose up -d --build
docker compose exec backend node database/migration.js

# Logs
docker compose logs -f backend
docker compose logs --tail=100 ai-engine

# Back up the database
docker compose exec mysql mysqldump -uroot -p"$DB_PASSWORD" trace_db > backup-$(date +%F).sql

# Back up uploaded files — these are NOT in the database
docker run --rm -v project-trace_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

Back up **both**. The database stores filenames; the bytes live only in the volume, so a database
dump alone restores rows pointing at files that no longer exist.

---

## Environment variable reference

Moved to **[`ENV_SETUP_GUIDE.md` §10](ENV_SETUP_GUIDE.md#10-complete-variable-reference)**, which
carries the full table for all four configuration surfaces, plus where each credential is obtained
and a verification command for each.

---

## What's deliberately not automated

- **Secret rotation** — you generate and set these yourself; they never live in the repo.
- **Provisioning** — no Terraform. One VM, set up once.
- **CI/CD** — deployment is `git pull && docker compose up -d --build` on the VM.

See also: [`ENV_SETUP_GUIDE.md`](ENV_SETUP_GUIDE.md) for every environment variable and where its
value comes from, [`README.md`](../README.md) for local setup,
[`BACKEND_GUIDE.md`](BACKEND_GUIDE.md) for the endpoint and schema reference, and
[`PROGRESS.md`](PROGRESS.md) for the phase history.
