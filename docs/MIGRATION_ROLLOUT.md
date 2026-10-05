# TRACE production update guide

Use this guide to update the existing `~/Project-TRACE` server with bundled MySQL (`mysql:3306/trace_db`) and its uploads volume. Run server commands in SSH, from the project folder. Keep the same terminal open, copy each command exactly and stop if any command fails. Long commands may wrap visually; do not insert a newline inside them.

## Current migration audit — 2026-10-05

The user's October 1 logs confirm completion of the earlier 18 incremental scripts and an equivalent manual creation of `password_history`, followed by a passing schema check. These are historical confirmations, not a read of the database today. The October 5 server output confirms the verification-reason, onboarding-guide and program-catalog migrations below completed, followed by a passing schema check and public API health response. The new graduation-year migration has not yet been deployed.

| Follow-up script (status stated above) | Purpose | Rerun behavior |
| --- | --- | --- |
| `migrate_verification_reason.js` | Nullable `users.verification_reason` for stored OCR/Admin review reasons | Adds only when missing; preserves stored reasons. |
| `migrate_onboarding_guides.js` | `onboarding_guides` for per-account tour state | Creates only when absent; preserves shown markers. |
| `migrate_graduation_year.js` | Nullable `student_profiles.graduation_year`, separate from attendance | Adds only when missing; no copying, backfill or historical rewrites. |
| `migrate_program_catalog.js` | Empty college-linked `programs`; widen `users.course` to accommodate college names | Creates only when absent, widens only a shorter course column; no program seeds/profile rewrites. |

`migrate_program.js` is a prerequisite already confirmed in the 18-script run. `migrate_password_history.js` is the preserving scripted equivalent of the manual table repair already confirmed; it is not a new missing-table requirement. Either may be rerun explicitly if its prerequisite status is uncertain. The latest UI/motion/report/status changes, password-reset lookup fix and Admin same-day browser trust introduce no additional database migration. Keep the existing MFA encryption key.

Audit findings: the full incremental list has **23** scripts, all exist and its dependencies are ordered; the short follow-up path includes the Program catalog and separate graduation year. Older data migrations are not all passive no-ops: `migrate_8b.js` backfills college mappings/enforces policy flags and `migrate_registrar_policy.js` writes catalog repeat/walk-in rules. Do not rerun those just for a UI or Program-catalog deployment.

The existing `check_schema.js` checks selected column presence, not every SQL type/index/foreign key or data row. Separately, fresh `schema.sql` currently omits the legacy `password_resets` and `payment_methods` definitions that live in the broad historical migration; this is a fresh-install gap, not evidence those tables are absent on this existing server. If live metadata reports a base table missing, stop for a targeted preserving repair rather than rerunning that broad migration or importing the fresh schema.

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

- **October 5 reason/tour/program rollout passed:** use [Graduation-year follow-up](#graduation-year-follow-up) for the new year-field repair.
- **Your earlier rollout already passed the schema check but those follow-ups are missing:** use the latest follow-up path, including the Program catalog and separate graduation year, under [Update the email button and guided tour](#update-the-email-button-and-guided-tour). This includes the prior Profile/Maintenance/OCR follow-up.
- **Earlier migrations are missing or their status is unknown:** use the complete numbered walkthrough below. Review the failed schema output before deciding which repairs are needed.
- **A new, empty installation:** use [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). This guide is for an existing database.

The user reported a successful earlier schema check and API health checks on October 1. Those results cover that earlier deployment. The October 5 logs confirm the reason-column, guided-tour and Program-catalog migrations; the new graduation column still needs applying with this repair. Local tests pass, but real email delivery, phone layouts and live workflows must be checked after updating.

The October 2 signup/account repairs add no migration: rebuild/recreate the backend and deploy the matching frontend. They restore multipart **Read ID**, display the separately saved Program/Course and College during Admin review, and allow `_` in passwords across creation/change/reset flows. New Admin temporary passwords use the same 8–64 character policy; existing login passwords are unchanged. Test Read ID with a synthetic/test proof, review a new registration's program, and test underscore passwords through signup, Profile, reset and Admin creation. The approved follow-up keeps email required at signup but sends its verification link from Profile only; requests remain blocked until verified. Admin with an enrolled app can opt into same-day personal-browser trust after verification. Clerk/Admin tours now enroll existing staff on their first eligible guide check. These additions reuse existing `trusted_browsers`, `authenticator_credentials` and `onboarding_guides`; there is no additional migration. Keep the existing MFA encryption key.

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
    migrate_8b.js \
    migrate_cn03_cn04.js \
    migrate_student_profiles.js \
    migrate_graduation_year.js \
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

The profile/Maintenance/OCR follow-up adds `migrate_verification_reason.js`. The guided-tour follow-up adds `migrate_onboarding_guides.js`; the linked-program follow-up adds `migrate_program_catalog.js`; the year-field repair adds `migrate_graduation_year.js` (23 scripts in the complete list). For a server that already passed the earlier rollout, apply only these new migrations that have not been applied; do not rerun data migrations solely for these follow-ups. Build both backend and ai-engine if deploying the OCR changes: OCR imports a new pure text-matching module included in the AI Dockerfile. The email-button/tour changes require a backend rebuild and matching frontend; they add no AI changes. Historical OCR reasons remain unknown. The guide migration creates an empty table and preserves existing display state; students registered on the updated backend receive an automatic tour; clerk/Admin accounts enroll lazily on their first eligible guide check. All supported roles can replay using the question mark. Deploy the matching frontend after migration/check/runtime update. Inspect real image outcomes separately; normalization tests do not prove document authenticity or actual OCR accuracy.

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
