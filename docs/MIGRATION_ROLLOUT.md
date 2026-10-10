# TRACE production update guide

Use this guide to update the existing `~/Project-TRACE` server with bundled MySQL (`mysql:3306/trace_db`) and its uploads volume. Run server commands in SSH, from the project folder. Keep the same terminal open, copy each command exactly and stop if any command fails. Long commands may wrap visually; do not insert a newline inside them.

## Current migration audit — 2026-10-06

The user's October 1 logs confirm completion of the earlier 18 incremental scripts and an equivalent manual creation of `password_history`, followed by a passing schema check. These are historical confirmations, not a read of the database today. The October 5 server output confirms the verification-reason, onboarding-guide and program-catalog migrations below completed, followed by a passing schema check and public API health response. The new graduation-year migration has not yet been deployed.

| Follow-up script (status stated above) | Purpose | Rerun behavior |
| --- | --- | --- |
| `migrate_verification_reason.js` | Nullable `users.verification_reason` for stored OCR/Admin review reasons | Adds only when missing; preserves stored reasons. |
| `migrate_onboarding_guides.js` | `onboarding_guides` for per-account tour state | Creates only when absent; preserves shown markers. |
| `migrate_graduation_year.js` | Nullable `student_profiles.graduation_year`, separate from attendance | Adds only when missing; no copying, backfill or historical rewrites. |
| `migrate_request_intake_scope.js` | Saved routing college and explicit intake-blocking requirements | Additive and rerunnable; no historical backfill. Run after request attachments and Support requirements. |
| `migrate_alumni_study_years.js` | Saved Year Started, first-confirmed timestamp, proof-review demo markers and audit tables | Additive and rerunnable; keeps existing graduation/attendance/request values. Run after student profiles and graduation-year prerequisites. |
| `migrate_program_catalog.js` | Empty college-linked `programs`; widen `users.course` to accommodate college names | Creates only when absent, widens only a shorter course column; no program seeds/profile rewrites. |

`migrate_program.js` is a prerequisite already confirmed in the 18-script run. `migrate_password_history.js` is the preserving scripted equivalent of the manual table repair already confirmed; it is not a new missing-table requirement. Either may be rerun explicitly if its prerequisite status is uncertain. The latest UI/motion/report/status changes, password-reset lookup fix and Admin same-day browser trust introduce no additional database migration. Keep the existing MFA encryption key.

Audit findings: the full incremental list has **29** scripts, all exist and its dependencies are ordered; the short follow-up path includes the Program catalog and separate graduation year. Older data migrations are not all passive no-ops: `migrate_8b.js` backfills college mappings/enforces policy flags and `migrate_registrar_policy.js` writes catalog repeat/walk-in rules. Do not rerun those just for a UI or Program-catalog deployment.

The existing `check_schema.js` checks selected column presence, not every SQL type/index/foreign key or data row. The fresh-schema audit found an omitted `password_resets` definition. It is now included in `schema.sql`, with a separate preserving `migrate_password_resets.js` for existing databases. Existing reset tokens are retained. The full checker still does not prove every type/index or transaction. If live metadata reports a base table missing, stop for a targeted preserving repair rather than rerunning that broad migration or importing the fresh schema.

After applying the needed follow-ups, this optional read-only metadata check verifies their objects, the separate program prerequisite, password history and the two legacy base tables, without reading account data:

```bash
docker compose run --rm --no-deps -T backend node <<'NODE'
const { pool } = require('./src/config/db');
(async () => {
  try {
    const [rows] = await pool.query(`SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('users', 'programs', 'onboarding_guides', 'password_history', 'password_resets', 'payment_methods', 'student_profiles')`);
    const found = new Map(rows.map(row => [`${row.TABLE_NAME}.${row.COLUMN_NAME}`, row]));
    for (const [table, columns] of [
      ['users', ['program', 'course', 'verification_reason']],
      ['programs', ['id', 'college_id', 'name', 'is_active']],
      ['onboarding_guides', ['user_id', 'shown_at']],
      ['student_profiles', ['graduation_year', 'last_attendance_year']],
      ['password_history', ['id', 'user_id', 'password_hash', 'created_at']],
      ['password_resets', ['id', 'user_id', 'token_hash', 'expires_at', 'used_at']],
      ['payment_methods', ['id', 'code', 'name', 'provider', 'instructions', 'requires_reference', 'reference_label', 'requires_proof', 'is_active', 'sort_order']]
    ]) {
      for (const column of columns) {
        const row = found.get(`${table}.${column}`);
        console.log(`${table}.${column}: ${row ? row.COLUMN_TYPE : 'MISSING'}`);
        if (!row) process.exitCode = 1;
      }
    }
    const course = found.get('users.course');
    if (!course || Number(course.CHARACTER_MAXIMUM_LENGTH) < 150) {
      console.error('users.course must support at least 150 characters.'); process.exitCode = 1;
    }
    const [indexes] = await pool.query(`SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list
      FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'programs'
      GROUP BY INDEX_NAME, NON_UNIQUE`);
    if (!indexes.some(index => Number(index.NON_UNIQUE) === 0 && index.columns_list === 'college_id,name')) {
      console.error('programs: missing unique college_id/name index.'); process.exitCode = 1;
    }
    const [keys] = await pool.query(`SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'programs' AND COLUMN_NAME = 'college_id'
      AND REFERENCED_TABLE_NAME = 'colleges' AND REFERENCED_COLUMN_NAME = 'id'`);
    if (!keys.length) { console.error('programs: missing college foreign key.'); process.exitCode = 1; }
  } catch {
    console.error('Metadata audit failed. Check database connectivity/permissions privately.'); process.exitCode = 1;
  } finally { await pool.end(); }
})();
NODE
```

Require no `MISSING` entries, no constraint/capacity error and a zero exit status. An incompatible existing table is not repaired by `CREATE TABLE IF NOT EXISTS`; investigate before restarting writers. This supplementary audit still does not certify every historical table definition or a working application transaction.

## Choose the right update path

### Last batch (TRACE-42–47) and visible motion repair

These changes add **no database migration**. The registration QR remains a generated frontend link; Finance reuses existing transaction/receipt APIs; intake waits derive from existing `step_logs` transitions, excluding same-status notes, with creation as the legacy fallback. Rebuild/recreate the backend for that timestamp projection and deploy the matching frontend for the compact QR/preview, dedicated Finance page, View OR, From/To labels and shared motion repair. Do not re-import schema, reseed, regenerate the MFA key, or rerun old policy-writing migrations for this UI batch.

If the latest Support rollout has **not** been applied, the pending named follow-ups are still the five commands in [Support ticket rollout](#support-ticket-rollout): `migrate_password_resets.js`, `migrate_payment_methods.js`, `migrate_graduation_year.js`, `migrate_support_tickets.js`, `migrate_support_requirements.js`, then `check_schema.js`. The first two preserving base-table scripts may find existing tables. The earlier October 5 reason/onboarding/program migrations are already confirmed; do not mistake this new UI work for a requirement to rerun all 29 scripts.

If those five follow-ups already passed, use the normal fresh-backup, review/merge, pull, backend build/recreate and matching frontend deployment steps; run `check_schema.js` to check the current image against the current database. No AI rebuild is necessary for TRACE-42–47 or motion alone; the separate Support insights rollout does require its matching AI image.

After rollout, check Window 1 QR placement/scan/download/student–alumni selection/keyboard preview, a new and a Secretary-returned intake wait, one Finance transactions page through new and old links, From/To inclusivity, authenticated image/PDF OR previews and missing/deferred states. Check modal entry/exit, page/FAQ transitions, rapid reopening and focus restoration with normal and reduced motion. A stale Vercel frontend or OS reduced-motion setting can hide the new motion even when the API is healthy.

Remaining operator work: enter Registrar-approved Program and supporting-document catalogs; review Support calendars/timeouts and clerk availability; compare legacy import ownership/counts privately; test live role/file permissions, email/SMS, real-phone keyboards and enlarged text; rehearse a restore; and run the agreed capacity test in matching staging before claiming production capacity. SEC-01 remains held for its separate agreed design/sign-off; no missing institutional forms or delay-notification threshold is invented. Track these in [FEATURE_ACCEPTANCE_MATRIX.md](FEATURE_ACCEPTANCE_MATRIX.md) and [SUPPORT_IMPLEMENTATION_CHECKLIST.md](SUPPORT_IMPLEMENTATION_CHECKLIST.md).

**For this repository revision, use the Support ticket rollout path.** The older targeted paths below describe earlier revisions. The latest schema checker also requires the new Support and preserving base-table objects; do not apply only an older follow-up list and expect the current checker to pass.

- **Deploying the unified Support workspace:** follow [Support ticket rollout](#support-ticket-rollout) first; it includes the new explicit migrations and matching API/AI/frontend.
- **October 5 reason/tour/program rollout passed, without Support changes:** use [Graduation-year follow-up](#graduation-year-follow-up) for the new year-field repair.
- **Your earlier rollout already passed the schema check but those follow-ups are missing:** use the latest follow-up path, including the Program catalog and separate graduation year, under [Update the email button and guided tour](#update-the-email-button-and-guided-tour). This includes the prior Profile/Maintenance/OCR follow-up.
- **Earlier migrations are missing or their status is unknown:** use the complete numbered walkthrough below. Review the failed schema output before deciding which repairs are needed.
- **A new, empty installation:** use [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). This guide is for an existing database.

The user reported a successful earlier schema check and API health checks on October 1. Those results cover that earlier deployment. The October 5 logs confirm the reason-column, guided-tour and Program-catalog migrations; the new graduation column still needs applying with this repair. Local tests pass, but real email delivery, phone layouts and live workflows must be checked after updating.

The October 2 signup/account repairs add no migration: rebuild/recreate the backend and deploy the matching frontend. They restore multipart **Read ID**, display the separately saved Program/Course and College during Admin review, and allow `_` in passwords across creation/change/reset flows. New Admin temporary passwords use the same 8–64 character policy; existing login passwords are unchanged. Test Read ID with a synthetic/test proof, review a new registration's program, and test underscore passwords through signup, Profile, reset and Admin creation. The approved follow-up keeps email required at signup but sends its verification link from Profile only; requests remain blocked until verified. Admin with an enrolled app can opt into same-day personal-browser trust after verification. Clerk/Admin tours now enroll existing staff on their first eligible guide check. These additions reuse existing `trusted_browsers`, `authenticator_credentials` and `onboarding_guides`; there is no additional migration. Keep the existing MFA encryption key.

## Support ticket rollout

This is a matched backend, AI and frontend update. The previous user-run migrations do not create these ticket tables. Review/merge this revision, follow Steps 1–2 below for a **fresh backup**, copy the private folder off the server and require both checksum checks to report OK. Keep backend, AI and n8n writers stopped; leave MySQL running. Record the deployed commit and keep the existing MFA encryption key.

Pull the reviewed revision and build both images:

```bash
git pull --ff-only
docker compose config --quiet
docker compose build backend ai-engine
```

Apply each preserving follow-up from the new image, stopping at the first failure:

```bash
docker compose run --rm --no-deps -T backend node database/migrate_password_resets.js
docker compose run --rm --no-deps -T backend node database/migrate_payment_methods.js
docker compose run --rm --no-deps -T backend node database/migrate_graduation_year.js
docker compose run --rm --no-deps -T backend node database/migrate_support_tickets.js
docker compose run --rm --no-deps -T backend node database/migrate_support_requirements.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

These assume the earlier `migrate_support_messages.js`, `migrate_document_messages.js` and `migrate_request_attachments.js` prerequisites already passed, as recorded in the user's rollout. Apply a named missing prerequisite only after reviewing its result. Never import the fresh schema into this database.

| Migration | What changes | What it preserves |
| --- | --- | --- |
| Payment methods | Creates the existing reference-table definition only if absent | Existing methods/instructions; no new method seeds |
| Password resets | Creates the hashed-token table only if absent | Existing tokens/table |
| Graduation year | Adds a separate nullable college graduation year | Attendance and historical school years |
| Support tickets | Six durable ticket/settings/availability/message/file/event tables and unique live-slot/general-ticket/retry constraints | Imports one general ticket per student with history and one linked ticket per messaged request, initially Queued; original sender/text/time/source rows remain |
| Support requirements | Empty approved supporting-document catalog, stable identity/replacement columns, rejected state, immutable events and persisted requirement bubbles | Old free-text identities stay distinct; uploads/reviews remain; reruns do not duplicate bubbles |

The ticket migration aborts on ambiguous/missing student ownership rather than assigning history to a guessed account. Its history import is transactional; DDL may already have committed. Inspect any failure with writers stopped. Confirm rerun counts and representative ownership privately; do not post message contents or identity files. Old write endpoints return a refresh-required response after this upgrade; do not leave the old frontend as the active client.

Use Step 5 to recreate/start the matching backend/AI/n8n, check internal/public health and promote the matching frontend. In Admin → System Maintenance → Supporting Documents, enter **Registrar-approved** types; none are invented or seeded. Admin and Window 1 can configure support days, hours, closed dates and response warning/timeout. Defaults are Monday–Thursday 08:00–16:00 Manila, warning 3 minutes and timeout 5 service minutes. Window 1 declares availability and claims the oldest ticket; it does not automatically change document routing.

`DB_POOL_QUEUE_LIMIT=200` is the bounded default (validated range 1–1000), with the existing 10-connection pool. It is a pending-query limit, not the number of concurrent database connections. Do not increase it without measuring latency and server capacity. The new file validators require the matching installed `sharp` and `pdf-lib` dependencies included in the backend image. The AI image includes `support_insights.py`; support advice uses aggregates only.

Live acceptance must include an existing imported conversation, a student with no request, FAQ/explicit escalation, two clerks claiming concurrently, duplicate sends, returning/closed-hours tickets, timeout/restart behavior, case document requests/replacement/history, authorized downloads, negative student/college/Finance access, and 100–200% text. Use synthetic accounts for staging capacity checks; local results are in [SUPPORT_VALIDATION.md](SUPPORT_VALIDATION.md), not a production-capacity claim.

Rollback requires the matched pre-update code, database, uploads and configuration. Reverting only the frontend/API can allow new legacy messages outside the imported tickets. Do not drop the new tables or discard accepted conversations. Coordinate restoration with writers stopped and account for messages accepted after the backup; a checksum is not a test restore.

## Graduation-year follow-up

For the server that completed the October 5 migrations, only `migrate_graduation_year.js` is new. Review/merge this repair, coordinate the matching frontend, and follow the fresh backup, off-server checksum verification and writer-stop steps below. Keep MySQL running and retain the existing MFA key. Pull the reviewed revision and build `backend` while writers are stopped, then run each command separately:

```bash
docker compose run --rm --no-deps -T backend node database/migrate_graduation_year.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

Require **Graduation year migration complete** and **Schema presence check passed** before recreating backend and restarting the previously stopped services using Step 5. Deploy the matching frontend after the API is ready. No AI rebuild is required for this year-field repair. Do not import `schema.sql`, reseed or rerun older data migrations for this change.

The migration adds a nullable college `graduation_year` without inferring it from `last_attendance_year`, copying Graduate Application answers, or rewriting school years. Existing alumni must enter their confirmed college graduation year in Edit Profile → Educational Background before their saved profile can be complete. Attendance stays separately visible and optional. Valid partial contact edits preserve omitted historical values; invalid submitted years fail before credential, email or profile writes. School years remain required for completion, may predate 2002 and cannot be future years. College graduation is required for alumni, optional for current students and limited to 2002 through the current Asia/Manila year. Year drafts are sent as exact four-digit strings so decimal/exponent notation cannot be normalized into valid values.

Live acceptance: check a current student's optional college year, an alumni account's required year, historical school/attendance values and reload/logout persistence. Try negative, decimal, exponent, incomplete, pre-2002 college and future years; each must identify its field and prevent saving. Confirm missing/invalid required years still block New Request at both UI and API. Local mocked migration tests check preserving SQL and reruns; they do not replace a test restore or live MySQL acceptance.

## Update the email button and guided tour

This path adds a **Verify Email** button in HTML mail, inline Profile verification, Maintenance proof/photo display, the request-chat input repair, OCR review reasons, the first-login guided tour and linked College/Program selections. Email buttons themselves need no new table; the review reasons, tour state and Program catalog have explicit migrations.

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
docker compose run --rm --no-deps -T backend node database/migrate_program_catalog.js
docker compose run --rm --no-deps -T backend node database/migrate_graduation_year.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

**Expected result:** all four migration completion messages, followed by **Schema presence check passed.** These migrations preserve existing reasons, tour display records and academic values. This path assumes `migrate_program.js` already added `users.program`, as confirmed in the earlier server logs; if that field is reported missing, apply that preserving prerequisite before continuing. If another missing table/column is reported, keep writers stopped and inspect that specific error; do not import the full schema or repeat old data migrations as a shortcut.

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
| Open System Maintenance → Programs, then a student/alumni profile | Admin can enter the real Registrar-approved catalog; active Program/Course options follow College, changing College clears Program, and confirmed selections survive reload. |
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

### 2A. Package the backup in SSH

Continue in the same **server SSH terminal**. The commands above created the backup folder; the next commands package it into one file for download. Keep backend, AI and n8n stopped, and MySQL running until the update checks pass.

```bash
printf 'Backup directory: %s\n' "$TRACE_BACKUP_DIR"
```

Confirm this is the fresh backup you just created. If it is blank after reconnecting, set the variable to the exact recorded folder before continuing. For the backup reported on October 5, that command is:

```bash
TRACE_BACKUP_DIR="$HOME/trace-backups/20261005-115358"
```

That timestamp is an example from this rollout, not a folder to reuse for future updates. Use each update's newly recorded backup path.

Run each command separately and stop if any fails:

```bash
umask 077
test -n "$TRACE_BACKUP_DIR"
test -d "$TRACE_BACKUP_DIR"
test -s "$TRACE_BACKUP_DIR/database.sql"
test -s "$TRACE_BACKUP_DIR/uploads.tar.gz"
test -s "$TRACE_BACKUP_DIR/SHA256SUMS"
tar -czf "${TRACE_BACKUP_DIR}.tar.gz" -C "$(dirname "$TRACE_BACKUP_DIR")" "$(basename "$TRACE_BACKUP_DIR")"
chmod 600 "${TRACE_BACKUP_DIR}.tar.gz"
printf 'Download this file: %s\n' "${TRACE_BACKUP_DIR}.tar.gz"
```

The `test` commands normally print nothing when successful. The archive contains the whole private folder, including `server.env`; do not publish it or put it in Git. Packaging does not delete the original backup.

### 2B. Download the archive to the Mac

Use the browser SSH's existing **Download file** option. Enter the absolute path printed by the last command and save the file to your Mac's **Downloads** folder. For the October 5 backup, the path is:

```text
/home/jhervinjimenez03/trace-backups/20261005-115358.tar.gz
```

Wait for the download to finish. Run the following steps in your **Mac Terminal**, not in SSH.

### 2C. Extract and verify on the Mac

Set `TRACE_BACKUP_NAME` to the exact folder name printed in SSH. The example below matches the October 5 backup; replace it for a different update. If the browser renamed the downloaded archive, use its actual filename in the `chmod` and `tar` commands.

```bash
umask 077
TRACE_BACKUP_NAME="20261005-115358"
mkdir -p "$HOME/trace-backups"
chmod 600 "$HOME/Downloads/${TRACE_BACKUP_NAME}.tar.gz"
tar -xzf "$HOME/Downloads/${TRACE_BACKUP_NAME}.tar.gz" -C "$HOME/trace-backups"
cd "$HOME/trace-backups/$TRACE_BACKUP_NAME"
shasum -a 256 -c SHA256SUMS
```

Run one command at a time and stop if any fails. Both checks must report:

```text
database.sql: OK
uploads.tar.gz: OK
```

If either reports `FAILED`, is missing, or cannot be read, stop before pulling or migrating. Check that the correct archive finished downloading and extract it again into a fresh private location before retrying verification. Do not regenerate `SHA256SUMS` on the Mac to make a mismatch pass.

A completed dump, readable archive and matching checksums are basic integrity checks; they are not a test restore. Share only the checksum result, never backup contents or `server.env`. Retain both server and Mac copies through rollout and acceptance.

For this rollout, the user's October 5 server output confirms the fresh folder `20261005-115358`, nonempty database/upload files, checks with no reported errors and private file permissions. Off-server download and Mac checksum verification are still pending user output; the earlier October 1 transfer does not verify this new backup. After both October 5 checks report `OK`, return to **SSH** in `~/Project-TRACE` and proceed to the chosen update path's pull/build step.

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

**Do not import `schema.sql` into this existing production database.** It defines a fresh installation, and `CREATE TABLE IF NOT EXISTS` does not add missing columns to existing tables. Compose's initialization scripts run on an empty MySQL data directory only. Do not run `seed.sql`, the broad `migration.js`, `migrate_b9.js`, `migration_phase3.js` or `retroactive_purpose.js` as a shortcut. The last script rewrites existing request-purpose data; it is not a schema upgrade.

This existing server already reported successful Batch 8, Batch 8b and CN-03/CN-04 migrations. The list includes them for prerequisite coverage; their deliberate rerun behavior is retained: Batch 8b fills missing college mappings/drafts and enforces the known Honorable Dismissal flag; the following Registrar migration applies the confirmed repeat policy. CN-03/CN-04's ledger preserves later fee edits. These are data migrations as well as schema changes, not a universal repair for incompatible old definitions.

Paste this entire function block. It stops at the first failed migration and runs the read-only schema presence check only after all scripts succeed. It does not restart services:

```bash
trace_migrate_rollout() {
  for TRACE_MIGRATION_FILE in \
    migrate_batch8.js \
    migrate_password_history.js \
    migrate_password_resets.js \
    migrate_payment_methods.js \
    migrate_8b.js \
    migrate_cn03_cn04.js \
    migrate_student_profiles.js \
    migrate_graduation_year.js \
    migrate_alumni_study_years.js \
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
    migrate_program_catalog.js \
    migrate_email_verification.js \
    migrate_support_messages.js \
    migrate_request_sequences.js \
    migrate_staff_authenticator_setup.js \
    migrate_verification_reason.js \
    migrate_onboarding_guides.js \
    migrate_support_tickets.js \
    migrate_support_requirements.js \
    migrate_request_intake_scope.js
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

Require **`Schema presence check passed.`** The check reads `information_schema`; it validates selected critical table/column presence, not every definition, index, constraint, rate, data row or live transaction. If it lists a named migration, investigate that script's output. Password history now has its own explicit migration, added after the user's first 18-script run exposed that base-table gap. If the check says `base schema`, such as missing `grad_applications` or core users fields, keep writers stopped and share the non-secret check output for a targeted preserving repair. Do not import the full schema or reseed to fill the gap.

The profile/Maintenance/OCR follow-up adds `migrate_verification_reason.js`. The guided-tour follow-up adds `migrate_onboarding_guides.js`; the linked-program follow-up adds `migrate_program_catalog.js`; the year-field repair adds `migrate_graduation_year.js` (29 scripts in the complete list, including the Revision 2 Batch 7 alumni study-year and Batch 8 intake-scope migrations). For a server that already passed the earlier rollout, apply only these new migrations that have not been applied; do not rerun data migrations solely for these follow-ups. Build both backend and ai-engine if deploying the OCR changes: OCR imports a new pure text-matching module included in the AI Dockerfile. The email-button/tour changes require a backend rebuild and matching frontend; they add no AI changes. Historical OCR reasons remain unknown. The guide migration creates an empty table and preserves existing display state; students registered on the updated backend receive an automatic tour; clerk/Admin accounts enroll lazily on their first eligible guide check. All supported roles can replay using the question mark. Deploy the matching frontend after migration/check/runtime update. Inspect real image outcomes separately; normalization tests do not prove document authenticity or actual OCR accuracy.

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

### Linked College and Program catalog (2026-10-05)

Existing deployments must run `migrate_program.js` and then `migrate_program_catalog.js` from the newly built backend image before recreating the API. Follow the backup/writer-stop sequence above; do not re-import `schema.sql` into an existing database. The new migration creates an empty `programs` catalog and widens `users.course` to match the college display-name capacity, without seeding or rewriting academic values. Reruns preserve entries and profile records. Run `check_schema.js` after migration.

```sh
docker compose run --rm --no-deps -T backend node database/migrate_program_catalog.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

After rollout, Admin opens **System Maintenance → Programs**, selects an active college, enters its Registrar-approved program name, and confirms Add Program. Populate the real approved catalog before asking students to update their academic selections. No program list is inferred from existing free text. Names/college membership stay immutable: add an approved replacement and deactivate the superseded row. Deactivation hides new selections and preserves saved entries; restore requires an active college. Existing signup retains its manual Program/Course entry; this rollout changes Edit Profile selections.

Acceptance: load a saved profile, change College and see Program clear, select its active program, confirm Save, and reload/sign in again to verify `college_id`, college display name (`course`) and degree/program (`program`). Test a program from another college, an inactive program/college, no programs, reference failure/retry, and a historical unlisted program while saving phone only. Verify Admin alone can manage the catalog and that deactivation does not change existing profiles or request pricing snapshots. Check 320/375/768/desktop, both themes and enlarged text.

### Revision 2 Batch 7 — alumni study years (2026-10-10)

This is a paired schema/API/frontend update. Use the verified backup and stopped-writer process above. For an otherwise upgraded installation, run only the new migration from the matching backend image, then check the schema before starting the updated API/frontend:

```sh
docker compose run --rm --no-deps -T backend node database/migrate_alumni_study_years.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

Older installations first need `migrate_student_profiles.js` and `migrate_graduation_year.js`, plus the other outstanding prerequisites identified by schema preflight. The additive migration leaves Year Started and its confirmation timestamp NULL on existing profiles; it never infers them from attendance/graduation or rewrites historical document JSON. Existing alumni sign in and complete missing study years in Edit Profile. Saved values require an Admin correction reason; each correction and identity-review decision commits with its audit record. Keep the audit tables when restoring or upgrading.

`ALUMNI_PROOF_UNAVAILABLE_DEMO_ENABLED=false` is the default. The optional proof-unavailable path is for a nonproduction defense database only and is forced off when `NODE_ENV=production`; do not enable or import demo applicants into production. No proof-unavailable production evidence policy has been approved. Ordinary proof registration, pending identity review, email verification and document access checks remain in place.

Acceptance and synthetic screenshots are in [BATCH7_ACCEPTANCE.md](BATCH7_ACCEPTANCE.md). This change was tested locally with mocked database/API responses; no live migration or deployment was performed.

## Revision 2 Batch 8 — intake scope follow-up

If all earlier prerequisites are already applied, use the matching backend image and run only the new preserving migration plus schema check, following the backup and writer-stop procedure above:

```bash
docker compose run --rm --no-deps -T backend node database/migrate_request_intake_scope.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

The migration adds `documents.routing_college_id`, `documents.routing_college_name` and `request_attachment_requirements.blocks_intake`. The last column defaults to false; historical requirements are not reclassified. Existing profiles/requests/history are not backfilled or normalized. Do not import schema.sql or seed.sql. Deploy the matching API/frontend after successful migration and preflight. No additional AI or n8n workflow import is needed for this batch.

Reconcile unresolved legacy colleges explicitly using Admin's evidence-based confirmation. Existing routing snapshots and closed history stay protected. Test own-college lists/details/files/actions, a blocking intake requirement through acceptance, stale assignment rejection and physical handoff in staging. [BATCH8_ACCEPTANCE.md](BATCH8_ACCEPTANCE.md) records local evidence; no live migration/deployment was performed by the agent.
