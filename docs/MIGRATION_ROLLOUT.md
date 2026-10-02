# TRACE production update guide

Use this guide to update the existing `~/Project-TRACE` server with bundled MySQL (`mysql:3306/trace_db`) and its uploads volume. Run server commands in SSH, from the project folder. Keep the same terminal open, copy each command exactly and stop if any command fails. Long commands may wrap visually; do not insert a newline inside them.

## Choose the right update path

- **Your earlier rollout already passed the schema check:** use [Update the email button and guided tour](#update-the-email-button-and-guided-tour). This includes the prior Profile/Maintenance/OCR follow-up.
- **Earlier migrations are missing or their status is unknown:** use the complete numbered walkthrough below. Review the failed schema output before deciding which repairs are needed.
- **A new, empty installation:** use [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). This guide is for an existing database.

The user reported a successful earlier schema check and API health checks on October 1. Those results cover that earlier deployment. The new reason-column and guided-tour migrations still need applying if they have not been deployed. Local tests pass, but real email delivery, phone layouts and live workflows must be checked after updating.

The October 2 signup/account repairs add no migration: rebuild/recreate the backend and deploy the matching frontend. They restore multipart **Read ID**, display the separately saved Program/Course and College during Admin review, and allow `_` in passwords across creation/change/reset flows. New Admin temporary passwords use the same 8–64 character policy; existing login passwords are unchanged. Test Read ID with a synthetic/test proof, review a new registration's program, and test underscore passwords through signup, Profile, reset and Admin creation. The approved follow-up keeps email required at signup but sends its verification link from Profile only; requests remain blocked until verified. Admin with an enrolled app can opt into same-day personal-browser trust after verification. Clerk/Admin tours now enroll existing staff on their first eligible guide check. These additions reuse existing `trusted_browsers`, `authenticator_credentials` and `onboarding_guides`; there is no additional migration. Keep the existing MFA encryption key.

## Update the email button and guided tour

This path adds a **Verify Email** button in HTML mail, inline Profile verification, Maintenance proof/photo display, the request-chat input repair, OCR review reasons and the first-login guided tour. Email buttons themselves need no new table; the automatic tour does.

### A. Prepare and back up

1. Review and merge the intended changes into `main` on your development machine. Coordinate Vercel's frontend promotion so it uses the matching backend.
2. In SSH, run the inspection commands in [Step 1](#1-prepare-source-and-inspect-the-existing-deployment). A blank `git status --short` means the checkout is clean. If files are listed, resolve them before pulling.
3. Follow [Step 2](#2-record-recovery-information-and-create-a-fresh-backup) to back up the current database, uploads, configuration and deployed revision. That step stops backend, AI and n8n; keep them stopped during the update.
4. Copy the backup off the server and verify its checksums before continuing. Retain the existing MFA key.

**Expected result:** fresh backups are verified, MySQL remains running and database writers are stopped.

### B. Pull and build

From `~/Project-TRACE` in the same SSH terminal, run one command at a time:

```bash
git pull --ff-only
git status --short
git log -1 --oneline
docker compose config --quiet
docker compose build backend ai-engine
docker compose run --rm --no-deps -T ai-engine python -c 'import identity_parser; import app; print("AI startup imports OK.")'
```

**Expected result:** the intended revision is present, Git status is blank, configuration succeeds, both images build and the AI import check passes. Rebuilding AI here includes the prior OCR follow-up; the tour itself does not change AI.

### C. Apply only the follow-up migrations

```bash
docker compose run --rm --no-deps -T backend node database/migrate_verification_reason.js
docker compose run --rm --no-deps -T backend node database/migrate_onboarding_guides.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

**Expected result:** both migration completion messages, followed by **Schema presence check passed.** These migrations preserve existing reasons and tour display records. If another missing table/column is reported, keep writers stopped and inspect that specific error; do not import the full schema or repeat old data migrations as a shortcut.

### D. Restart and deploy the matching frontend

Only after the preceding checks pass:

```bash
docker compose up -d --no-deps backend ai-engine n8n
docker compose --profile tls up -d --no-deps caddy
docker compose ps
docker compose exec -T backend curl -fsS http://localhost:3300/api/health
curl -fsS https://trace-plp-api.duckdns.org/api/health
```

**Expected result:** backend and AI settle to healthy; both health responses show `status: ok` and `database: ok`. Then promote the matching Vercel frontend and refresh TRACE. Health checks prove API/database connectivity; complete the feature checks below too.

Vercel's Git-connected deployment can be used. For deployment, environment and log commands from your development machine, install the CLI with `npm i -g vercel`.

### E. Test the visible changes

| Check | Expected result |
| --- | --- |
| Register and sign in with a fresh test account | Signup saves email without sending an ownership link. After account approval and required onboarding, the tour highlights controls and blurs the background. Profile Verify sends the link; requests remain blocked until verified. |
| Sign in as Window 1, Secretary, Finance and Admin | After required password setup, the role-specific tour appears once. Existing staff with no prior guide marker receive this offer too. Navigation steps highlight the visible desktop link or open the phone menu. |
| Admin opts into personal-browser trust on the app challenge | The choice starts unchecked. Only a successful verification grants trust. Correct-password login skips the factor before Manila midnight; new browsers, revoked grants and expired trust challenge again. Admin email challenges never offer this grant. |
| Finish/skip the tour, sign out and sign in again | The tour does not open automatically again. Another browser does not reset the account's marker. |
| Select the header **?** | The tour can be replayed manually, including on older accounts. |
| Send a verification link from Profile | The received HTML email shows **Verify Email**; its button opens the verification page. Plain-text readers show the link. |
| Open Maintenance and a request conversation | Stored proof/photo previews load; selecting a request reveals **Message to Window 1** and sending works. |
| Review a fresh pending registration | A stored review reason appears when the automatic check is inconclusive. Older reasons may remain unknown. |
| Use a real phone with enlarged text | Tour instructions scroll and Back/Next stay reachable; profile, chat and tables remain usable. |

Use [USER_MANUAL.md](USER_MANUAL.md) for the click-by-click user tutorial. Existing student accounts use manual replay; existing clerk/Admin accounts without a shown marker receive their new role tour once. Use fresh student accounts and each staff role to test the automatic offer.

## Remaining acceptance and policy decisions

Policy-dependent work remains: canonical fixed/linked forms and Honorable-Dismissal-related aliases; name/ID conventions; whether case attachments hold processing; delayed-request notification threshold; OR service deadline/working-day calendar; identity-verified recovery for an already-enrolled lost authenticator; SEC-01 extensions after design/sign-off. The Registrar's confirmed repeat quantities, conditional walk-in same-day eligibility and case-specific attachment rules are implemented. Finance publishes an uploaded physical OR copy; an electronic OR generator is not implemented.

Live acceptance still includes real phone/text-size/tracker checks, email delivery, genuine authenticator enrollment, browser trust cookies, SQL concurrency, uploads, OCR/forecasting and payment-provider behavior. The WebSocket upgrade error needs separate verification after database repairs.

## Complete migration walkthrough

Use Steps 1–6 for the full existing-server rollout. The shorter path above is for an already migrated server receiving the follow-up changes.

## 1. Prepare source and inspect the existing deployment

First commit/review/merge all intended files, including new migrations, into the deployed branch. Stage the matching Vercel build and keep the current frontend until the API/schema is ready. If automatic frontend promotion is active, coordinate a maintenance window; do not assume a Git push leaves the current site unchanged.

In SSH:

```bash
cd ~/Project-TRACE
pwd
git branch --show-current
git status --short
docker compose ps
docker compose config --quiet
```

Stay in the existing checkout and Compose project. Resolve local edits before pulling; do not discard them. Confirm MySQL is running. Do not share `.env` or expanded Compose configuration.

Check the actual database target while the existing backend runs:

```bash
docker compose exec -T backend node -e 'const e=require("./src/config/env"); console.log(JSON.stringify({host:e.DB_HOST,port:e.DB_PORT,database:e.DB_NAME,tls:e.DB_SSL},null,2));'
docker compose exec -T mysql sh -c 'printf "Bundled database: %s\n" "$MYSQL_DATABASE"'
```

Continue only if these identify `mysql`, port `3306`, and the same database (`trace_db` for this deployment). An external database needs its own backup procedure. If the backend is already stopped, do not start it solely for this check: verify the configured target privately instead.

## 2. Record recovery information and create a fresh backup

Yesterday's backup does not include later transactions. Create a new private folder:

```bash
umask 077
TRACE_BACKUP_DIR="$HOME/trace-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TRACE_BACKUP_DIR"
git rev-parse HEAD > "$TRACE_BACKUP_DIR/deployed-commit.txt"
cp .env "$TRACE_BACKUP_DIR/server.env"
TRACE_BACKEND_CONTAINER=$(docker compose ps -aq backend)
docker container inspect --format '{{.Name}} image_id={{.Image}} image_ref={{.Config.Image}}' "$TRACE_BACKEND_CONTAINER" > "$TRACE_BACKUP_DIR/backend-image.txt"
docker container inspect --format '{{range .Mounts}}{{println .Type .Destination}}{{end}}' "$TRACE_BACKEND_CONTAINER"
docker image inspect alpine:latest --format '{{.Id}}'
df -h "$TRACE_BACKUP_DIR"
printf 'Backup directory: %s\n' "$TRACE_BACKUP_DIR"
```

Require a `volume /app/uploads` mount, the already available Alpine helper image and adequate disk space. If anything differs, stop and adapt the backup before changing containers. Record the printed backup path; shell variables disappear when reconnecting.

Pause writers, including any other operators/jobs writing this database. Keep MySQL running:

```bash
docker compose stop backend ai-engine n8n
```

The site is temporarily unavailable. Dump MySQL with [MySQL's backup options](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html), then validate the completion marker:

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --user=root --single-transaction --routines --events --triggers --no-tablespaces --set-gtid-purged=OFF --databases "$MYSQL_DATABASE"' > "$TRACE_BACKUP_DIR/database.sql"
test -s "$TRACE_BACKUP_DIR/database.sql"
grep -q '^-- Dump completed' "$TRACE_BACKUP_DIR/database.sql"
```

All three commands must return successfully. Archive uploads using the existing container's [read-only inherited volume](https://docs.docker.com/reference/cli/docker/container/run/#mount-volumes-from-container---volumes-from); this does not start the backend:

```bash
docker run --rm --pull=never --network=none --volumes-from "${TRACE_BACKEND_CONTAINER}:ro" alpine:latest tar -czf - -C /app/uploads . > "$TRACE_BACKUP_DIR/uploads.tar.gz"
tar -tzf "$TRACE_BACKUP_DIR/uploads.tar.gz" > /dev/null
(cd "$TRACE_BACKUP_DIR" && sha256sum database.sql uploads.tar.gz > SHA256SUMS)
ls -lh "$TRACE_BACKUP_DIR"
```

Copy this private folder off the server using the working SSH/browser-download method. On the Mac, inside the copied folder, run `shasum -a 256 -c SHA256SUMS` and require both files to report `OK`. A completed dump, readable archive and matching checksums are basic integrity checks; they are not a test restore. Do not post backup contents or `server.env`.

## 3. Pull, check configuration and rebuild

After the fresh backups are copied and verified:

```bash
git pull --ff-only
git log -1 --oneline
docker compose config --quiet
docker compose build backend
```

Confirm the revision contains the intended changes and migration files. The build installs the new locked backend dependency and includes `database/`; migrations run from this rebuilt image, not the previous running container. Keep writers stopped.

Privately review the root `.env`: preserve existing `JWT_SECRET`, `WEBHOOK_SECRET` and database credentials. Set the intended HTTPS frontend origin first in `FRONTEND_URL`, working SMTP values, and `MFA_ENCRYPTION_KEY`. If no MFA key was ever configured, `openssl rand -hex 32` generates a 32-byte hex secret to save there and in a secure backup. Never replace the existing key after enrollment; never put it in a `VITE_` variable or chat. Validate its format without printing the value:

```bash
docker compose run --rm --no-deps -T backend node -e 'const e=require("./src/config/env"); if (!/^[a-fA-F0-9]{64}$/.test(e.MFA_ENCRYPTION_KEY)) { console.error("MFA key missing or invalid"); process.exit(1); } console.log("MFA key format OK");'
```

An unchanged AI image can be retained. If the approved revision changes AI source/Dockerfile since the deployed version, rebuild and require its import check before restarting:

```bash
git diff --name-only "$(cat "$TRACE_BACKUP_DIR/deployed-commit.txt")" HEAD -- ai-engine
```

For actual AI changes, run separately:

```bash
docker compose build ai-engine
docker compose run --rm --no-deps -T ai-engine python -c 'import identity_parser; import app; print("AI startup imports OK.")'
```

A successful import is not OCR/forecast acceptance. Do not remove volumes, retained containers or recovery data to resolve a build error.

## 4. Apply incremental schema migrations and check the result

**Do not import `schema.sql` into this existing production database.** It defines a fresh installation, and `CREATE TABLE IF NOT EXISTS` does not add missing columns to existing tables. Compose's initialization scripts run on an empty MySQL data directory only. Do not run `seed.sql`, the broad `migration.js`, `migrate_b9.js` or `migration_phase3.js` as a shortcut.

This existing server already reported successful Batch 8, Batch 8b and CN-03/CN-04 migrations. The list includes them for prerequisite coverage; their deliberate rerun behavior is retained: Batch 8b fills missing college mappings/drafts and enforces the known Honorable Dismissal flag; the following Registrar migration applies the confirmed repeat policy. CN-03/CN-04's ledger preserves later fee edits. These are data migrations as well as schema changes, not a universal repair for incompatible old definitions.

Paste this entire function block. It stops at the first failed migration and runs the read-only schema presence check only after all scripts succeed. It does not restart services:

```bash
trace_migrate_rollout() {
  for TRACE_MIGRATION_FILE in \
    migrate_batch8.js \
    migrate_password_history.js \
    migrate_8b.js \
    migrate_cn03_cn04.js \
    migrate_student_profiles.js \
    migrate_trusted_browsers.js \
    migrate_fee_schedules.js \
    migrate_authenticator.js \
    migrate_sessions.js \
    migrate_finance_receipts.js \
    migrate_registrar_policy.js \
    migrate_request_attachments.js \
    migrate_document_messages.js \
    migrate_templates.js \
    migrate_program.js \
    migrate_email_verification.js \
    migrate_support_messages.js \
    migrate_request_sequences.js \
    migrate_staff_authenticator_setup.js \
    migrate_verification_reason.js \
    migrate_onboarding_guides.js
  do
    printf '\nApplying %s\n' "$TRACE_MIGRATION_FILE"
    if ! docker compose run --rm --no-deps -T backend node "database/$TRACE_MIGRATION_FILE"; then
      printf 'STOP: %s failed. Keep writers stopped and investigate.\n' "$TRACE_MIGRATION_FILE"
      return 1
    fi
  done
  docker compose run --rm --no-deps -T backend node database/check_schema.js
}
trace_migrate_rollout
```

Require **`Schema presence check passed.`** The check reads `information_schema`; it validates selected critical table/column presence, not every definition, index, constraint, rate, data row or live transaction. If it lists a named migration, investigate that script's output. Password history now has its own explicit migration, added after the user's first 18-script run exposed that base-table gap. If the check says `base schema`, such as missing `password_resets`, `grad_applications` or core users fields, keep writers stopped and share the non-secret check output for a targeted preserving repair. Do not import the full schema or reseed to fill the gap.

The profile/Maintenance/OCR follow-up adds `migrate_verification_reason.js`. The guided-tour follow-up adds `migrate_onboarding_guides.js` (21 scripts in the complete list). For a server that already passed the earlier rollout, apply only these new migrations that have not been applied; do not rerun data migrations solely for these follow-ups. Build both backend and ai-engine if deploying the OCR changes: OCR imports a new pure text-matching module included in the AI Dockerfile. The email-button/tour changes require a backend rebuild and matching frontend; they add no AI changes. Historical OCR reasons remain unknown. The guide migration creates an empty table and preserves existing display state; students registered on the updated backend receive an automatic tour; clerk/Admin accounts enroll lazily on their first eligible guide check. All supported roles can replay using the question mark. Deploy the matching frontend after migration/check/runtime update. Inspect real image outcomes separately; normalization tests do not prove document authenticity or actual OCR accuracy.

MySQL DDL can commit before a later command fails. Do not assume a failed script changed nothing; inspect the error before rerunning or restoring. A rollback may require coordinated restoration of database, uploads, configuration and matching code, not just a Git checkout.

## 5. Start the matching runtime and frontend

Only after successful builds, migrations and schema check:

```bash
docker compose up -d --no-deps backend ai-engine n8n
docker compose --profile tls up -d --no-deps caddy
docker compose ps
docker compose exec -T backend curl -fsS http://localhost:3300/api/health
curl -fsS https://trace-plp-api.duckdns.org/api/health
```

Keep `docker compose ps` on one line. Allow the backend health check to settle; a successful `/api/health` proves database connectivity, not complete application acceptance. Activate the matching staged Vercel frontend revision after the API/schema is ready, then refresh the site. Vercel CLI is optional for this Docker migration; installing `npm i -g vercel` on the development machine enables deployment/log/environment commands.

## 6. Perform live acceptance

Test Admin login and Templates, student list/History, proof/avatar display, incomplete-profile and email-verification request blocks, and a no-attachment Certificate of Transfer request. Verify saved phone/email behavior, alumni first-login gate, email links, password/reset/deactivation notices, Window 1 general support/replies, and document conversations/attachments. Every profile's Security section must show authenticator setup. Admin-assisted setup uses a private ten-minute code plus the clerk's own password/app verification; it cannot replace an enrolled factor.

Then test fees/history, Finance clearance/acknowledgment, Later OR issuance/upload and Secretary handoff; Admin layouts in an actual slip/email; repeat quantities/same-day evidence; request numbering; 100–200% text and phone layouts. WebSocket upgrade, OCR/forecast and provider behavior remain separate checks.

If a request still fails, reproduce once, then inspect:

```bash
docker compose logs --since=3m --tail=100 backend caddy
```

Share only the relevant error and stack trace; omit passwords, tokens, codes, keys and personal details. Expected repairs from the latest logs are fee schedules/rental fields, `document_messages`, `system_templates` and `request_attachment_uploads`; all are covered above.

## Common rollout problems

| Message or situation | Next step |
| --- | --- |
| `compose: command not found` after entering `docker` | Run the complete `docker compose ps` command on one line. |
| `git status --short` lists files | Review them before pulling. `??` means untracked files, not committed changes. Move private backups to your backup directory; do not commit them. |
| `cannot stat` or `No such file or directory` | Run `pwd` and check the source path. Backups originally in `~/Project-TRACE` are not in `~` just because you changed folders. |
| Container inspect requires an argument | Set `TRACE_BACKEND_CONTAINER` as shown in Step 2. Keep a space between the quoted format and the container argument. |
| A backup variable is empty after reconnecting | Re-enter the recorded backup path and container variable. Do not create a different path and assume it contains the earlier backup. |
| `mysqldump` reports an unknown option | Copy the full dump command exactly. For example, `--single-transaction` must not contain a space or inserted newline. Check the dump again after rerunning. |
| `chmod` says Operation not permitted | Inspect the file owner. Keep backups in the private directory and have the owner/administrator correct permissions; do not make the directory public. |
| MFA key format check fails | Check the root server `.env` privately and copy the validation expression exactly. It requires 64 hexadecimal characters. Preserve an existing enrollment key. |
| Schema check reports missing fields | Keep writers stopped, identify the named migration and inspect its result. Share only the non-secret error; do not import `schema.sql` into production. |
| Health passes but a feature returns 500 | Reproduce the specific action once and inspect recent backend/Caddy logs. A healthy database connection does not verify every table or feature. |

Record the deployed commit, applied migrations and live checks after the rollout. Keep the verified backup until the updated site has passed acceptance.
