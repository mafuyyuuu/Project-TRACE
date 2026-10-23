# Security follow-up rollout

Production evidence provided October 22: clean main b973af7, Docker 29.1.3; backend 3300, AI 5005 and n8n 5678 published on IPv4/IPv6 wildcard addresses. Caddy owns 80/443. MySQL has no host mapping. GCP Ops Agent listeners 20201/20202 also require effective firewall inspection. Listening on an interface does not establish whether a cloud firewall permits remote access.

## Changes and boundaries

- Tracking requires authentication; student ownership/Secretary college scope remains enforced in services. MySQL has application-enforced row authorization, **not native RLS**.
- Live account desk and verification state invalidate stale REST/Socket permissions. Graduate applications allow owner reads, Admin and current-college Secretary review; Finance/Window 1 cannot review them.
- Proofs require owner/Admin; support files retain ticket authorization before Admin access; orphan ordinary files are denied to staff. Finance gets payment evidence and minimal student identity/contact fields. Student/Secretary/Finance KPI queries use their scopes.
- Production registration OCR never grants verified status by itself. Admin must compare identity/enrollment against official records. Existing verified accounts are not reclassified.
- Production defaults to MySQL rate counters. Atomic shared increments survive restarts. Account buckets use verified JWTs; login identifiers are normalized and HMAC hashed. Login also has a failed-attempt network budget. Upload/OCR/export limits run before expensive work. Public unauthenticated limits still depend on accurate trusted-proxy configuration; Vercel auth proxy behavior needs a live campus test.
- AI business endpoints require a separate gateway secret, health stays public, and each worker admits one expensive job at a time. Backend/AI runtime images omit package installers and run without root, with read-only root filesystems and bounded temporary storage. API is CRUD-only; AI reads documents and step_logs only.
- Request IDs, safe structured access events, masked internal errors, private API caching, CSP/static asset headers, readiness and graceful draining are included. Logs deliberately omit raw URLs/query strings, headers, bodies and extracted OCR identities/payment values. Logs are not a replacement for the database audit trail.
- CI checks Node applications, lightweight Python tests, real MySQL concurrency/permissions, real encrypted backup/isolated restore, Caddy, actual non-root OCR/Prophet runtime and dependency/image/secret scans. Image vulnerability gates cover fixable HIGH/CRITICAL findings; passing does not mean no vulnerability can exist.

## First: read-only Google Cloud inventory

Run from the existing SSH checkout; this does not change the active branch or services:

```bash
cd ~/Project-TRACE
git fetch origin dev
TRACE_CHECK_DIR="$(mktemp -d)"
git show origin/dev:deploy/gcp_inventory.py > "$TRACE_CHECK_DIR/gcp_inventory.py"
python3 "$TRACE_CHECK_DIR/gcp_inventory.py"
```

Review effective ingress policies for both IP families before changing firewall rules. Preserve current SSH access. Only HTTP/HTTPS should be public application entry points; restrict SSH to the approved source or an explicitly configured IAP path. Do not disable Ops Agent listeners without understanding their local consumers. Do not paste .env, tokens, private keys or raw student records.

Inspect the VM service account's project/bucket roles in Cloud Console. Use a private backup bucket with uniform access, retention and minimum writer permissions; keep decryption identity off the VM. Review snapshot schedules and perform an actual off-host recovery drill. These cloud controls are **not applied by this repository**.

## Server capacity and firewall follow-up

The supplied October 22 measurements show 7.3 GB free on the 38 GB root filesystem, 8.283 GB of unused Docker build cache and 3.8 GB of journals. Recent `vmstat` samples show little swap traffic and mostly idle CPU; used swap alone does not establish a need to resize the VM. Keep runtime images for rollback and measure actual free space after removing only unused build cache:

```bash
cd ~/Project-TRACE
docker builder prune --all --force
df -h .
docker system df
```

This removes unused build cache without pruning containers, images or volumes. Do not infer physical reclaimed space from Docker's logical totals or manually delete Docker storage directories. Keep journal history while deciding retention and verifying remote log collection.

Cloud Shell inventory confirms the VM has one IPv4-only NIC. The supplied effective rules permit n8n TCP 5678 from any IPv4 address, while no public allow rule for backend 3300 or AI 5005 appears. HTTP/HTTPS use the existing `http-server` and `https-server` tags. SSH is separately allowed from any IPv4 source; leave that rule until a restricted source or IAP login has actually been tested.

Run the following in **Cloud Shell**, setting the three variables to the project, zone and instance verified by the inventory. These are operator values, not application secrets:

```bash
TRACE_GCP_PROJECT="your-project-id"
TRACE_GCP_ZONE="your-vm-zone"
TRACE_GCP_INSTANCE="your-vm-name"

gcloud compute firewall-rules create trace-deny-private-ports \
  --project="$TRACE_GCP_PROJECT" --network=default \
  --direction=INGRESS --priority=900 --action=DENY \
  --rules=tcp:3300,tcp:3306,tcp:5005,tcp:5678,tcp:20201,tcp:20202,tcp:3389,udp:3389 \
  --source-ranges=0.0.0.0/0 --target-tags=trace-internal-only
```

Confirm rule creation succeeds before adding the tag below. If a rule or tag already exists, inspect its scope and bindings first. The new tag must be dedicated to this VM; do not disable shared network rules that could affect other instances.

```bash
gcloud compute instances add-tags "$TRACE_GCP_INSTANCE" \
  --project="$TRACE_GCP_PROJECT" --zone="$TRACE_GCP_ZONE" \
  --tags=trace-internal-only

gcloud compute instances network-interfaces get-effective-firewalls "$TRACE_GCP_INSTANCE" \
  --project="$TRACE_GCP_PROJECT" --zone="$TRACE_GCP_ZONE" --format=json
```

The priority-900 deny precedes the supplied priority-1000 n8n allow, and applies only to tagged VMs. Ports 22, 80 and 443 remain outside this deny; `add-tags` preserves existing tags. Container-to-container calls on the Docker network are separate from remote VM ingress. Verify the website, current SSH session, API/database readiness and internal AI/n8n routing after the change. Access the n8n editor through an SSH tunnel. Host listeners still show wildcard bindings until the application Compose rollout changes them; firewall enforcement does not change `ss` output. Reassess both IP families if IPv6 is later enabled.

These changes have **not** been executed by the agent. The VM service-account scopes shown in inventory are insufficient for Compute administration using that identity; successful Cloud Shell reads do not prove the VM's active CLI identity or the exact cause of its earlier hidden permission error. Perform operator administration from an authorized account rather than granting broad project permissions to the workload.

References: [Docker build-cache pruning](https://docs.docker.com/reference/cli/docker/builder/prune/), [Google Cloud firewall priorities](https://cloud.google.com/firewall/docs/firewalls), [adding network tags](https://cloud.google.com/vpc/docs/add-remove-network-tags).

## Coordinated application rollout

Wait for all CI jobs to pass. Review/merge dev into main, then use a maintenance window. Do not run a generic rebuild first: a new AI secret, additive migration, upload-volume ownership and runtime users are required.

```bash
cd ~/Project-TRACE
git status --short
git pull --ff-only origin main
python3 deploy/configure_security.py --prepare
```

The helper supports the bundled MySQL topology only. It locates the already running containers directly, preserves their JWT/MFA/webhook keys and actual MySQL root password, and prepares independent AI/API/AI-DB credentials in a private .env. It does not print secrets. Missing keys, ambiguous projects or unsupported values stop the helper. Reconcile privately rather than generating a new MFA key: changing that key would invalidate existing encrypted authenticators.

Record the current image IDs privately (`docker compose images`) for rollback. Build first while existing containers continue serving:

```bash
docker compose build backend ai-engine
```

Apply the additive migration using a one-off DBA container; this overlay must never be used for `up`:

```bash
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps backend node database/migrate_rate_limits.js
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps backend node database/check_schema.js
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps backend node database/provision_runtime_users.js
```

The last command prints a plan. After reviewing it:

```bash
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps backend node database/provision_runtime_users.js --apply
python3 deploy/configure_security.py --activate-runtime
```

`--activate-runtime` connects with both new accounts before changing the API DB credentials. CREATE USER deliberately fails for existing names; MySQL account DDL is not transactional. On partial failure inspect accounts/grants privately rather than rerunning or deleting an existing user. Keep the root/DBA credential only for controlled migrations; ordinary backend containers do not receive the candidate or root credentials.

Existing uploads may be owned by root. Update only the mounted uploads directory with an explicitly privileged one-off container:

```bash
docker compose -f docker-compose.yml -f deploy/compose.migrations.yml run --rm --no-deps --cap-add CHOWN --cap-add FOWNER --cap-add DAC_OVERRIDE --entrypoint sh backend -c 'chown -R 1000:1000 /app/uploads'
docker compose --profile tls up -d --no-deps --force-recreate backend ai-engine n8n caddy
docker compose exec -T backend node database/security_preflight.js
docker compose ps
curl -fsS http://127.0.0.1:3300/api/health
sudo ss -lntp
```

Expect 3300/5005/5678 on 127.0.0.1 only. Keep Caddy public 80/443. Test the real HTTPS API domain and Vercel deployment; the frontend CSP currently allows trace-plp-api.duckdns.org. Update connect-src when intentionally changing domains. Use `ssh -L 5678:127.0.0.1:5678 USER@HOST` for n8n administration.

Run live acceptance with test accounts: staff OTP; logout revocation; another student's tracking/files denied; Secretary other-college denial; Finance academic-file/graduate-review denial; own profile/avatar/payment/graduate flow; support attachment and archived-ticket rules; document intake, routing, payment, receipt and release; forecast/insights; exports. Verify campus logins are not collapsed into an auth-proxy IP bucket. Do not load-test production with student records.

Rollback uses recorded backend/AI image IDs together through an image override, while retaining the new private environment and loopback/security Compose settings. Do not switch back to old Compose and run up: it would restore wildcard ports and can confuse the preserved root password with the new API password. The rate-limit migration is additive; do not drop student data or volumes.

## Encrypted recovery

Install age on the operator machine/VM. Generate the decryption identity on an independent recovery machine; copy only its **public** recipient list to the production VM. Keep a private off-host copy of every ciphertext archive and checksum. The helper defaults to a plan and makes no backup until --run is supplied:

```bash
python3 deploy/recovery.py backup
python3 deploy/recovery.py backup --run --recipients /absolute/path/public-recipients.txt --output /absolute/path/private-backups
```

Backup checks space, briefly stops only the writers that were running, dumps the actual API database, snapshots uploads/n8n, preserves runtime encryption/signing settings, encrypts, removes plaintext staging and resumes writers in a finally block. It supports named Docker volumes and bundled MySQL; links in volume archives fail closed. Schedule it only after observing acceptable downtime and configuring protected off-host storage. A snapshot alone is not a verified application-consistent backup.

On an independent Docker recovery machine with the private identity (chmod 600):

```bash
python3 deploy/recovery.py drill
python3 deploy/recovery.py drill --run --archive /absolute/path/backup.tar.age --identity /absolute/path/private-age-key
```

The drill validates checksums, decrypts in private temporary space, restores MySQL into a fresh network-isolated container with events disabled, runs SQL CHECK TABLE, compares every base table row count with the stopped source and checks restored upload/n8n file bytes. It never mounts production volumes or starts application/n8n workflows. Complete application acceptance on an isolated staging restore as a separate gate. Measure achieved recovery time and tolerable data loss; no RTO/RPO or off-host protection is claimed before that evidence exists.

## Cloud, logs, delivery and scaling work still requiring live setup

- Main branch protection payload is in deploy/main-branch-protection.json. Apply through a repository administrator after all five check names appear. Require pull requests/current checks, prohibit force pushes/deletions and enforce for Admins. The connected GitHub integration cannot administer protection. Add an independent reviewer requirement when a second maintainer is available.
- CI has read-only repository permissions and no automatic production SSH deployment. Add a separate reviewed deployment job/environment only after rollout and rollback acceptance; use GitHub-to-GCP Workload Identity Federation rather than stored long-lived cloud keys. A Vercel frontend deployment does not rebuild these backend containers.
- Existing Ops Agent needs a reviewed JSON log pipeline/retention/access policy. Confirm masked events/request IDs arrive in Cloud Logging, then add external HTTPS uptime checks plus backend failure/latency, disk, database connection and backup-age alerts. Choose a real notification channel and test delivery; no channel or alert has been silently created.
- Keep API/private files outside CDN caches; fingerprinted frontend assets can be immutable. Verify actual Vercel headers after deployment. Do not add a cache for user data without explicit authorization keys/invalidation.
- Current topology is one VM and one API instance, **not high availability**. MySQL shared throttling is one prerequisite, not a claim of horizontal readiness. Before replicas: shared upload/object storage, Socket.IO shared adapter/affinity or WebSocket-only contract, coordinated scheduled jobs, database connection budgets, isolated migration stage and measured load tests. Managed DB/compute, load balancer, regional/object backup and associated cost/IAM decisions require the live inventory.
- Patch host OS/Docker/n8n/Caddy with compatibility and rollback checks. Do not enable paid infrastructure, remove IAM/firewall policies or rotate persistent encryption keys based on guessed project settings.

Primary references: [Docker ports](https://docs.docker.com/engine/network/port-publishing/), [Docker firewall behavior](https://docs.docker.com/engine/network/packet-filtering-firewalls/), [GCP effective firewalls](https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/get-effective-firewalls), [express-rate-limit stores](https://github.com/express-rate-limit/express-rate-limit/blob/main/docs/guides/creating-a-store.mdx).
