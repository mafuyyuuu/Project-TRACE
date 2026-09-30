# Project TRACE Progress Report

## Current Status
- **Batch 1 to 8**: Previously marked complete in the historical docket. The reconstructed batches are being re-verified; see the current review below.
- **Batch 9 registrar consultation**: CN-03/CN-04 implementation and automated checks complete; the user reported successful live migration. Runtime health, application acceptance and frontend promotion remain pending. Other consultation items remain pending. The earlier completion claims below are historical and superseded by the 2026-09-30 verification.
- **Batch 10 Phase 1 & 2 (Audit Trail & Rate Limiting)**: Complete.
- **Batch 10 Phase 3 (Security & Account Protection)**: Complete.

## Historical Batch 9 Phase 3 Claims — Not Acceptance Evidence
- **CN-11 (In-App Messaging):**
  - Added `document_messages` table and implemented full backend CRUD via `documentMessage.model.js` and `documents.controller/service`.
  - Created `DocumentChat.jsx` frontend component.
  - Injected `DocumentChat` into the Student `LiveTrackingModal`, Finance `FinanceVerificationModal`, and Secretary `SecretaryEvaluationModal`.
- **CN-12 (Template Engine):**
  - Added `system_templates` table and seeded defaults (`payment_slip`, `email_notice`).
  - Built `AdminTemplatesPanel.jsx` in the frontend to edit template layout with variables (`{{STUDENT_NAME}}`, `{{AMOUNT}}`, etc.) and WYSIWYG preview.
  - Wired the template engine directly into `PaymentStubModal.jsx` (replacing hardcoded receipt JSX) so that the Admin's custom HTML prints automatically.
- **CN-13 (Notifications):**
  - Integrated notification hooks directly into `sendMessage` (Student replies notify the assigned clerk, Staff replies notify the Student).
  - Validated that test expectations are met.

## Batch 9 Consultation Verification — 2026-09-30

Baseline: clean `dev` at `f15d5be`, **527 backend / 342 frontend tests passing**. The user approved the exact CN-03/CN-04 file scope and its backend/migration exceptions, then approved the additional Secretary service/test files to close the Return bypass. No live database migration or deployment was performed.

### Approved CN-03/CN-04 implementation

- Good Moral is retired for new online requests, identified counter requests, and unidentified counter scans. All three names found in the repository are recognized: `Certificate of Good Moral`, `Certificate of Good Moral Character`, and `Good Moral Certificate`. Case and whitespace variations are blocked by the policy. Reference options omit these types even before the database migration runs.
- Admin retains the historical catalog entry with a **Retired** label and explanation. Creation, editing/renaming, and restoration are rejected server-side; the existing retired request can still continue through its workflow. Changing another request into a retired type is rejected.
- Diploma defaults to **₱250**, explicitly described as a reissue fee. Admin can change the configured fee; Secretary still sets the final charge. Previously priced requests are untouched.
- The fresh seed no longer inserts Good Moral and preserves existing Diploma fees on reruns. The dedicated data migration changes only an existing Diploma fee of ₱50 and deactivates the known retired names. It records `cn03_cn04_catalog_v1` in `schema_migrations` in the same transaction. A failure rolls back both marker and updates; subsequent runs preserve later Admin edits, including a fee changed back to ₱50.

Apply the dedicated migration from the repository root when deploying this phase:

```sh
node backend/database/migrate_cn03_cn04.js
```

The configured database must be available. The migration is import-safe and fails with a nonzero exit status. Any pre-migration Diploma fee of ₱50 is treated as the old default; there is no historical marker distinguishing a custom ₱50 fee. Other configured amounts are preserved. Do not use the old `migrate_b9.js` for this phase: it targets inconsistent catalog names and also changes unapproved attachment rules.

### Files changed

| File | Change |
| --- | --- |
| `backend/database/schema.sql` | Defines the data-migration completion ledger. |
| `backend/database/migration.js` | Updates fresh defaults, protects Diploma fees on rerun, invokes the dedicated migration. |
| `backend/database/migrate_cn03_cn04.js` | New atomic, recorded catalog migration. |
| `backend/src/services/documentPolicy.service.js` | Central retirement rules; new-request blocking and historical-request compatibility. |
| `backend/src/services/documents.service.js` | Guards corrected types on both Secretary Approve and Return. |
| `backend/src/services/maintenance.service.js` | Retired Admin metadata and mutation guards; editable Diploma default. |
| `backend/src/services/referenceData.service.js` | Removes retired types from request options. |
| `frontend/src/features/admin/components/MaintenancePanel.jsx` | Retirement explanation/disabled controls and Diploma fee label. |
| `backend/database/__tests__/migrate_cn03_cn04.test.cjs` | Migration failure/retry, rerun, fee preservation, import and seed checks. |
| `backend/src/services/__tests__/documentPolicy.service.test.cjs` | Retirement aliases, intake bypass prevention, history and reference checks. |
| `backend/src/services/__tests__/documents.service.test.cjs` | New-request refusal before writes; both Secretary decisions reject type changes but permit unchanged historical types. |
| `backend/src/services/__tests__/maintenance.service.test.cjs` | Admin mutation guards and editable defaults. |
| `frontend/src/features/__tests__/batch9.catalog.test.jsx` | Retired actions, keyboard editing, confirmed saves, configured fee display, FAQ checks. |
| `frontend/src/pages/HelpPage.jsx` | Student/Admin guidance aligned with this phase. |
| `docs/PROGRESS.md`, `docs/USER_MANUAL.md`, `docs/SYSTEM_WORKFLOWS.md` | Findings, user instructions, deployment requirements and historical workflow distinctions. |

### Remaining consultation findings and decisions

These are source findings, not successful live end-to-end acceptance. No additional repairs were bundled into CN-03/CN-04.

| Item | Current finding / remaining scope |
| --- | --- |
| CN-01 | Order of Payment fallback already shows Program/Course, but request reads lack it and signup stores college in `users.course`. Template placeholders lack Course. User wants both slip and OR covered and approves a separate Program/Course field. Finance currently writes a physical OR and uploads its copy; no electronic OR generator was found. Exact implementation scope remains pending. |
| CN-02 | Student form still exposes Copies. Removing it supersedes Batch 8b's quantity decision; preserve historical quantities. |
| CN-05 | Names are unchanged; Student ID has no format validation. Signup's backend password rule currently requires eight characters, uppercase, lowercase, digit and a restricted symbol set. Capitalization style, retained minimum length and Alumni ID handling need explicit scoping. |
| CN-06/CN-10 | Reference attachment labels and conditional fields exist, but the full per-type forms do not. Transcript and Clearance names differ across migrations/catalog/helpers. Current-student versus alumni is the approved meaning of undergraduate versus graduate. Canonical types, linked-set behavior and field matrix still need agreement. |
| CN-07 | `is_same_day` exists and Admin can configure it, but reference shaping omits it and request reads lack it. Eligibility/cutoff rules need agreement. |
| CN-08 | Amount and page count are independently entered; final pricing accepts the entered amount, without pages × rate. Scope authoritative computation, rate settings and historical amounts together. |
| CN-09 | Numbering counts surviving requests and adds an alumni offset for all types. Cancellation deletes records, permitting reuse. Original issuance is not tracked per type; the slip does not show the sequence. |
| CN-11 | Message model incorrectly imports the DB pool object. `sendMessage` calls an undefined notification function for assigned-clerk replies; the legacy link payload is incompatible with the notification helper. Threads lack full role wiring, attachment/hold behavior and live refresh. Deferred DOC-03 depends on this project. |
| CN-12 | Template model also imports the pool incorrectly. Admin imports but does not render its editor. Only the payment slip consumes templates; email notices are disconnected. Scope safe template data/HTML and printable behavior separately. |
| CN-13 | Existing notification infrastructure already covers several status changes. No dedicated delay detection/SLA rules were found. Reuse the existing system rather than create another. |
| CN-14 | No Google Form destination found. `frontend/public/qr-walkin.png` is empty and unused. The slip QR encodes a tracking number for Finance. User approves a separate submission QR based on the deployed TRACE origin, preserving the tracking QR; alumni counter redirection and login continuation remain to scope. |

### Validation

- **554 backend / 347 frontend tests passed** for this phase; baseline was 527 / 342. The final backend run includes the ten additional pipeline regressions after the approved Secretary file addition. Frontend source is unchanged since its passing full-suite/build/lint checkpoint. The added checks cover catalog retirement, confirmed keyboard editing, request options, migration rollback/retry and preservation of custom fees.
- **Production frontend build passed**, with the existing large-chunk warning. ESLint passed for the changed Admin panel, FAQ and new frontend test. `git diff --check` passed. Frontend tests emitted the existing Node local-storage warning.
- Tests use mocked models/connections; they do not establish successful execution against a live MySQL database. No physical-device acceptance or migration was performed.
- **Additional verified gap resolved with user-approved file additions:** `acceptForProcessing()` previously checked policy only on Approve, while Return also saved corrected `document_type`. A request could be changed to Good Moral on Return and later treated as historical. Both decisions now reject such changes before evaluation/log writes or notifications; unchanged historical Good Moral requests still proceed. The additional source/tests are listed above. Focused pipeline/policy checks passed (175 tests), followed by the passing full backend suite reported above. No other implementation assumptions changed; the first new checks exposed test-selector/fixture mistakes, which were corrected before completion.

Remaining Program/Course, receipt, submission QR, form, pricing, sequence, messaging, notification and template work is not marked complete by this phase.

### SSH rollout runbook — database and uploads backup through migration

These are instructions for an existing Docker Compose installation using this repository's bundled MySQL. They have not been executed on the server. Keep the same SSH session/project directory throughout; run one block at a time and stop on errors. Use the deployed branch that contains the approved code (migration files committed at `cad5adb` on local `dev`); do not switch production branches blindly. Schedule downtime because the app's writers will be stopped until verification. Batch 10 begins only after rollout confirmation and its own verification/file approval; unfinished Batch 9 items remain pending.

**0. Stage the Vercel frontend before pushing to `main`.** The user confirmed that `main` pushes automatically update the live frontend. First open the Vercel project: **Settings → Environments → Production → Branch Tracking**, and disable **Auto-assign Custom Production Domains**. Then merge/push the approved code to `main`. Vercel can build a staged production deployment while the current production domain continues serving the previous frontend. Record the staged deployment's commit and URL; do not promote it yet. Follow Vercel's [staged production deployment instructions](https://vercel.com/docs/deployments/promoting-a-deployment#staging-and-promoting-a-production-deployment).

This controls frontend promotion only. It does not back up or migrate the server database. No server auto-deployment workflow was found in this repository; any separately configured cloud deployment trigger must also be accounted for before pushing. If the update was already pushed, check which Vercel deployment is **Current** before proceeding. No Vercel setting or deployment has been changed by the agent.

**1. Locate the existing deployment.** Replace `/path/to/project-trace` with the server's actual checkout. Do not create a second deployment directory/project with different volumes.

```sh
cd /path/to/project-trace
pwd
git branch --show-current
git status --short
docker compose ps
docker compose config --quiet
```

If Git shows local edits, resolve them before pulling; do not discard them. If the Docker commands fail or service names differ, stop and adapt the instructions first. Do not paste `.env` or a full expanded Compose configuration into chat.

**2. Verify the actual database target before backing up.** These commands expose only non-secret connection metadata:

```sh
docker compose exec -T backend node -e 'const e=require("./src/config/env"); console.log(JSON.stringify({host:e.DB_HOST,port:e.DB_PORT,database:e.DB_NAME,tls:e.DB_SSL},null,2));'
docker compose exec -T mysql sh -c 'printf "Bundled database: %s\n" "$MYSQL_DATABASE"'
```

Continue with this runbook only if the backend host is `mysql`, its port is `3306`, and the database name matches the bundled container's name. An external/managed database needs its own backup procedure: stop here and identify it rather than dump the unused local container.

**3. Create a private backup directory outside Git and record the old code revision.**

```sh
umask 077
TRACE_BACKUP_DIR="$HOME/trace-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TRACE_BACKUP_DIR"
git rev-parse HEAD > "$TRACE_BACKUP_DIR/deployed-commit.txt"
docker compose ps -aq | xargs docker container inspect --format '{{.Name}} image_id={{.Image}} image_ref={{.Config.Image}} status={{.State.Status}}' > "$TRACE_BACKUP_DIR/container-images.txt"
if [ -f .env ]; then cp .env "$TRACE_BACKUP_DIR/server.env"; fi
printf 'Backup directory: %s\n' "$TRACE_BACKUP_DIR"
```

Keep this path. Reconnecting clears the shell variable, so set it to the saved path before continuing. The backups contain personal data and possibly credentials; keep them private and out of Git/chat.

**Server checkpoint:** The user confirmed `/home/jhervinjimenez03/Project-TRACE` is on `main`, the five Compose services are running, and backend/MySQL both target `mysql:3306/trace_db`. `docker compose images` failed because Docker could not resolve the backend's recorded image ID (`sha256:08f1c5ab203baee9de626b8eacd2f6e6b9ffb2ca926976bcd0a819307ca78c02`). Follow-up inventory confirms the available `project-trace-backend:latest` is a different image (`sha256:8252df9a1ef8487f9f64b7e5f721d6c64c8fe8a7fe7f888f60e465f3af62995c`). The cause of the old image's absence and the newer image's compatibility are unknown. This does not establish database corruption. The user recorded container metadata and configuration under `/home/jhervinjimenez03/trace-backups/20260930-104712`; that directory does not yet contain a confirmed fresh database/upload backup. An existing local `alpine:latest` image allows a read-only upload backup without running the newer backend. Do not recreate or remove the old backend container while establishing recovery options. The user also has untracked `trace_db_backup.sql` and `uploads_backup.tar.gz` in the checkout; preserve them privately outside Git, without treating them as verified current backups. No writer stop, migration or rollout has been reported at this checkpoint.

Before stopping writers, check free space and the actual backend uploads mount:

```sh
df -h "$TRACE_BACKUP_DIR"
TRACE_BACKEND_CONTAINER=$(docker compose ps -aq backend)
docker container inspect --format '{{range .Mounts}}{{println .Type .Destination}}{{end}}' "$TRACE_BACKEND_CONTAINER"
```

Require a `volume /app/uploads` entry and enough space for the backups. The helper below assumes a named uploads volume, as configured in this repository, and the already available local Alpine image. If these differ, stop and adapt first. Keep the same shell variables throughout.

The next server output confirmed `volume /app/uploads` and **7.2 GB free** on the 38 GB root filesystem (82% used). Follow-up size checks reported **35 MB uploads / 31 MB database directory**, so available space is ample for these backups. These are source-directory sizes, not completed backup sizes or proof of sufficient space for later image builds; the database's on-disk size is only a rough estimate of SQL dump size. The read-only checks used were:

```sh
docker compose exec -T backend du -sh /app/uploads
docker compose exec -T mysql du -sh /var/lib/mysql/trace_db
```

At that preflight checkpoint, writer stop and fresh backup completion had not yet been reported. The subsequent step-5 checkpoint below records their completion. No image pruning or other cleanup is authorized by these checkpoints.

**4. Pause the app's writers, leaving MySQL running.** Ensure no other tool/operator is changing this database during the backup/migration window.

```sh
docker compose stop backend ai-engine n8n
```

The app is temporarily unavailable. Use `stop`, never `docker compose down -v`, which removes data volumes.

**5. Back up the database and uploads.** Run each block and require its success message before proceeding:

```sh
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --user=root --single-transaction --routines --events --triggers --no-tablespaces --set-gtid-purged=OFF --databases "$MYSQL_DATABASE"' > "$TRACE_BACKUP_DIR/database.sql" &&
test -s "$TRACE_BACKUP_DIR/database.sql" &&
grep -q '^-- Dump completed' "$TRACE_BACKUP_DIR/database.sql" &&
echo 'Database dump completed successfully.'
```

```sh
docker run --rm --pull=never --network=none --volumes-from "${TRACE_BACKEND_CONTAINER}:ro" alpine:latest tar -czf - -C /app/uploads . > "$TRACE_BACKUP_DIR/uploads.tar.gz" &&
tar -tzf "$TRACE_BACKUP_DIR/uploads.tar.gz" > /dev/null &&
echo 'Uploads archive is readable.'
```

```sh
ls -lh "$TRACE_BACKUP_DIR"
```

The SQL completion marker and readable archive are basic integrity checks, not proof of a successful test restore. The database stores upload paths, not the file bytes. The dump uses MySQL's [single-transaction backup options](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html); the archive uses the backend container's existing uploads volume through Docker's [read-only inherited volume mount](https://docs.docker.com/reference/cli/docker/container/run/#mount-volumes-from-container---volumes-from). It does not pull an image or start the backend application.

**Backup completion checkpoint:** The user reported successful stops for backend, AI-engine and n8n, `Database dump completed successfully.`, and `Uploads archive is readable.` The backup directory contains a **6.4 MB SQL dump**, **34 MB uploads archive**, container inventory, old Git revision and copied server configuration, with private file permissions. The backups passed the completion-marker/archive checks; no restore has been tested. Off-server copy, migration and deployment are still pending, and the app's writers remain stopped.

**6. Copy the backup off the server and verify the transfer.** First create relative-path checksums in the original SSH terminal. The subshell leaves the project working directory unchanged:

```sh
(cd "$TRACE_BACKUP_DIR" && sha256sum database.sql uploads.tar.gz > SHA256SUMS)
```

In a separate local terminal, substitute the usual SSH identity/server and the printed path; use the same SSH key options as the normal connection when needed:

```sh
mkdir -p "$HOME/trace-backups"
scp -r YOUR_USER@YOUR_SERVER:/exact/printed/backup/path "$HOME/trace-backups/"
```

For the user's current backup, the local directory is `$HOME/trace-backups/20260930-104712`. On the Mac, check the transfer:

```sh
cd "$HOME/trace-backups/20260930-104712"
shasum -a 256 -c SHA256SUMS
```

Require `database.sql: OK` and `uploads.tar.gz: OK`. Checksums verify copied bytes, not database-restoration behavior. Return to the original SSH terminal after the copy and checks succeed. Do not publish backup contents or `server.env`. If the current SSH connection uses a cloud-provider command rather than ordinary SSH, adapt the transfer to that existing authentication method instead of guessing a server address/key.

**Transfer checkpoint / browser fallback:** The Mac reached the VM's SSH server but ordinary `scp` failed with `Permission denied (publickey)`. The VM did not accept the offered key for the requested account; the exact key/account configuration has not been inspected. The server backups are unaffected, and an off-server copy is not yet confirmed. Google Cloud browser SSH uses its own connection credentials; accepting a host key on the Mac does not authorize the Mac's login key. Use the existing browser SSH connection's download button, as described in Google's [file transfer instructions](https://docs.cloud.google.com/compute/docs/instances/transfer-files#transfer_files_using_ssh-in-browser), to avoid changing SSH access during this rollout.

In the VM's browser SSH terminal, package the confirmed folder and a checksum manifest into one private archive outside the checkout:

```sh
umask 077
(cd "$HOME/trace-backups/20260930-104712" && sha256sum database.sql uploads.tar.gz > SHA256SUMS)
tar -czf "$HOME/trace-backups/trace-backup-20260930-104712.tar.gz" -C "$HOME/trace-backups" 20260930-104712
```

Stop on either command's failure. Click the browser SSH window's download icon, enter `trace-backups/trace-backup-20260930-104712.tar.gz` relative to the user's home directory, and download. On the Mac, after confirming the file's actual download location/name:

```sh
mkdir -p "$HOME/trace-backups"
chmod 600 "$HOME/Downloads/trace-backup-20260930-104712.tar.gz"
tar -xzf "$HOME/Downloads/trace-backup-20260930-104712.tar.gz" -C "$HOME/trace-backups"
cd "$HOME/trace-backups/20260930-104712"
shasum -a 256 -c SHA256SUMS
```

Require both `OK` results before continuing. The user subsequently reported successful Mac extraction and **`database.sql: OK` / `uploads.tar.gz: OK`**, confirming that both copied backup files match their server checksums. The off-server backup checkpoint is complete; a database restore has not been tested. Do not weaken SSH authentication or change firewall rules to solve a public-key rejection. No migration/restart has been reported, so the app writers remain stopped. Vercel automatic-domain-assignment status and the `dev` → `main` merge have not yet been confirmed; verify these before pulling/rebuilding the production checkout.

**7. Update the existing deployed branch and build the migration/runtime images.**

**Release gate checkpoint:** The user confirmed both that Vercel's automatic production-domain assignment is disabled and that the approved `dev` changes have been merged into `main`. Off-server backup checksums have passed. Subsequent server output shows **`8688001`**, merge PR #21, on `main`/`origin/main`, with `cad5adb` in its recent history and all three incremental migration files present. Staged Vercel build readiness, runtime builds and migrations remain unverified. Do not promote the frontend yet.

```sh
git pull --ff-only
git log -1 --oneline
ls backend/database/migrate_batch8.js backend/database/migrate_8b.js backend/database/migrate_cn03_cn04.js
docker compose config --quiet
git diff --name-only "$(cat "$TRACE_BACKUP_DIR/deployed-commit.txt")" HEAD -- ai-engine
docker compose build backend
df -h .
```

Confirm every command succeeds and the branch contains the approved implementation. A missing file means the rollout source is not ready. The AI-engine Dockerfile installs sizable Python dependencies and OCR models; inspect the diff and remaining disk space before rebuilding it. If the AI-engine diff lists changes, build its approved source with `docker compose build ai-engine` once resources are adequate. If the diff is empty, the existing recorded AI image can be retained. Failure to resolve the backed-up revision is an error, not an empty diff. Do not restart the app while a required build/migration is incomplete. No build completion has been reported at this checkpoint.

**Shell-variable recovery checkpoint:** Updated Compose validation passed, but the AI-engine comparison failed twice with `cat: /deployed-commit.txt: No such file or directory` and `fatal: bad revision ''`. This confirms that `TRACE_BACKUP_DIR` was empty in that shell; it does not show that the saved backup was deleted or that the AI engine is unchanged. Restore `TRACE_BACKUP_DIR="$HOME/trace-backups/20260930-104712"`, verify the saved revision file, then retry the comparison. No build/migration completion has been reported.

**AI image packaging finding:** Restoring the variable succeeded; the backed-up server revision is `778447c914d5497ac400fe043d9ec4e1c442ad99`. The comparison lists changed `ai-engine/app.py`, `identity_parser.py`, `ocr_engine.py` and `test_identity_parser.py`, confirming an AI image rebuild is required. Inspection of the local approved source found `ocr_engine.py:27` imports `identity_parser`, while `ai-engine/Dockerfile:37` copies only `app.py` and `ocr_engine.py`. `app.py:22` imports the OCR module during startup; without packaging the parser, the rebuilt container will fail to start with a missing-module error. The build-time model-download command imports EasyOCR alone, so a successful build would not detect this omission. The proposed correction is to include `identity_parser.py` in that existing COPY instruction and validate the existing parser tests plus the rebuilt image's import. This additional Dockerfile is outside the previously approved file scope; no code change has been made and implementation awaits explicit per-file approval. The server's Dockerfile line should also be checked before rollout. No backend/AI build, migration or restart completion has been reported at this checkpoint.

**Approved packaging repair:** The user approved adding `ai-engine/Dockerfile` and then confirmed the server's COPY instruction matches the diagnosed omission. The local Dockerfile now copies `app.py`, `ocr_engine.py` **and `identity_parser.py`**. Only that line and this previously approved progress document changed. No dependencies, application logic or other files were changed; no remaining discrepancy was found between the diagnosed local/server instruction. `ai-engine/.dockerignore` does not exclude the parser. Before and after the fix, **554 backend tests, 347 frontend tests and all four existing Python parser tests passed**. The Python command was `.venv/bin/python -m unittest -v test_identity_parser.py` from `ai-engine/`. Frontend emitted the existing local-storage warning. `git diff --check` passed. No local Docker image build or server import check was performed; successful source tests do not establish container startup.

Commit/push the two approved files on `dev`, merge that repair into `main` while Vercel automatic promotion remains disabled, then pull again on the server. Verify the COPY line includes the parser before rebuilding backend and AI-engine. After the AI image builds, require this startup-import smoke check to succeed before migration/restart:

```sh
docker compose run --rm --no-deps -T ai-engine python -c 'import identity_parser; import app; print("AI startup imports OK.")'
```

This imports the real image's Flask/OCR dependencies without starting its HTTP server; it may take time while OCR models load. Stop and investigate an import/resource error. The corrective commit/merge, image builds and smoke check remain pending at this checkpoint; Vercel is still staged and the app writers are stopped.

**Backend build checkpoint:** The user pulled the two-file packaging/documentation repair onto the server and confirmed `COPY app.py ocr_engine.py identity_parser.py ./`. `docker compose build backend` completed successfully using cached dependency layers and updated source/migrations. Compose warned that Bake is configured but buildx is not installed, then successfully used the default builder; no tooling change is needed to resolve this successful build. Root filesystem free space is now **7.1 GB**. The next required steps are the AI-engine build and startup-import smoke check above; neither has been reported complete. No migration or runtime restart has been reported, and production frontend promotion remains pending.

**AI dependency build failure:** The user attempted the AI image build; dependency installation failed with **`OSError: [Errno 28] No space left on device`**. The log shows Linux **x86-64** wheels and the default `torch==2.8.0` package pulling NVIDIA CUDA libraries and Triton, including several hundreds-of-MB wheels. The Dockerfile's ARM-only comment does not describe this actual build. OCR explicitly initializes EasyOCR with `gpu=False`, so its current operation requires CPU execution. Free space returned to the reported **7.1 GB** after failure; this does not justify pruning images/volumes or deleting application data. The backend build remains successful, but the AI build/import check, migrations and restart are not complete.

Proposed additional repair, awaiting scope approval: update only `ai-engine/Dockerfile` and this document to select the existing PyTorch 2.8.0 / torchvision 0.23.0 **CPU wheel variants for x86-64**, preserving the existing ARM path and all requirements versions. PyTorch publishes this exact CPU pairing in its [versioned installation instructions](https://pytorch.org/get-started/previous-versions/#v280); Python 3.12 x86-64 wheels are present in its official [torch](https://download.pytorch.org/whl/cpu/torch/) and [torchvision](https://download.pytorch.org/whl/cpu/torchvision/) indexes. Exact `+cpu` constraints in the same requirements-install invocation can prevent a CUDA variant from being selected without modifying `requirements.txt`. Resolver/build behavior, resource sufficiency and image imports still require verification; no dependency-install code was changed following this failure. The successful rebuilt image must report `torch.version.cuda is None`, import torchvision and the real Flask/OCR modules, and pass dependency checks before continuing. This extends the earlier parser-copy-only approval, so the user's no-unrelated-repairs gate applies.

**Approved CPU build repair:** The user approved this additional Dockerfile change. The x86-64 dependency-install branch now supplies exact `torch==2.8.0+cpu` and `torchvision==0.23.0+cpu` constraints together with the unchanged requirements file and official CPU wheel index. Other architectures retain the prior install path. The architecture comment now describes both deployed targets. The runtime build runs `python -m pip check` and imports torch/torchvision while asserting `torch.version.cuda is None`, so a CUDA variant or dependency conflict fails the build before release. Only `ai-engine/Dockerfile` and this document changed; no package versions were upgraded or requirements-file edits made.

Before/after checks passed: **554 backend / 347 frontend / four Python parser tests**. A local packaging-specifier check confirms `+cpu` versions satisfy the existing public version pins, and `/bin/sh -n` accepts the install branch. `git diff --check` passed; frontend retained the existing local-storage warning. These checks do not establish a successful Linux build or OCR startup. The corrected commit/merge/pull, AI rebuild, image import check and remaining-space check are pending. Keep Vercel staged and do not migrate/restart until the required image verifies; do not prune volumes or remove retained containers to make room.

**8. Apply incremental migrations in order.** Run each command separately and require successful completion before the next:

**AI image verification checkpoint:** The user ran the corrected image's real import check successfully: `AI startup imports OK.`, **torch `2.8.0+cpu`**, **torchvision `0.23.0+cpu`**, **`CUDA: None`**. The new parser and Flask/OCR modules imported successfully. EasyOCR's CPU notice and the optional Plotly warning did not prevent the check from completing; no dependency additions were made for those notices. Root filesystem free space is **5.2 GB** (87% used). This verifies CPU packaging/imports, not live OCR accuracy, forecasting, or HTTP health. The backend build is already successful. The next authorized actions are the three incremental migrations, one at a time. No migration/restart or production frontend promotion has yet been reported; app writers remain stopped.

```sh
docker compose run --rm --no-deps -T backend node database/migrate_batch8.js
```

Expect `Batch 8 migration complete.` It adds browser recognition, auth/OTP columns and notification links.

```sh
docker compose run --rm --no-deps -T backend node database/migrate_8b.js
```

Expect `Batch 8b migration complete.` It adds college/document policies and inactive counter fee drafts.

```sh
docker compose run --rm --no-deps -T backend node database/migrate_cn03_cn04.js
```

Expect `CN-03/CN-04 applied.` or `CN-03/CN-04 already applied.` It retires known Good Moral names and changes an existing Diploma fee of 50 to 250 once, preserving other fees and historical request charges. The temporary containers use the rebuilt backend image and the same Compose database configuration, without starting the API.

These scripts require the existing base schema. Do not run `migrate_b9.js`, re-import `schema.sql`/`seed.sql`, or run the broad `migration.js` as a shortcut: the former has unreconciled attachment/name changes and the latter reseeds other fees. On failure, keep the writers stopped and investigate the exact error. The first two migrations contain DDL that may already have committed, so do not assume a failed script changed nothing or perform a blind restore.

**9. Restart and check the deployment.**

**Live migration checkpoint:** The user ran the rebuilt backend's three incremental scripts in order and reported **`Batch 8 migration complete.`**, **`Batch 8b migration complete.`**, and **`CN-03/CN-04 applied.`**. This is successful execution against the configured server database, not mocked-test evidence. No restore, broad reseed or old `migrate_b9.js` execution was reported. Runtime restart/health, application acceptance and Vercel promotion are the remaining rollout steps; unfinished Batch 9 features remain out of scope.

```sh
docker compose up -d --no-deps backend ai-engine n8n
docker compose ps
docker compose logs --tail=60 backend
curl -fsS http://localhost:3300/api/health
curl -fsS http://localhost:5005/health
```

Expect a successful database health response. Allow a short startup period, then investigate persistent errors. Check the AI-engine logs if needed. Existing Caddy/MySQL are left running; these commands do not promote the staged Vercel frontend.

**Runtime checkpoint / backend startup blocker:** At server merge revision **`77ef912`**, the user restarted the services. AI-engine is healthy and its HTTP health endpoint returns success; MySQL remains healthy and n8n is running. The backend is in a restart loop, and port 3300 refuses connections. Logs identify `MODULE_NOT_FOUND` for `../utils/response`, required by `backend/src/controllers/templates.controller.js:2` before Express can start. Repository searches found no response helper at that path; existing controllers define their small `fail()` helper locally. A read-only audit resolving all literal relative CommonJS imports under `backend/src` found a second missing import at `backend/src/routes/templates.routes.js:4`: `../middlewares/auth`. The actual middleware is `auth.middleware.js`, exporting `authenticate` and `requireRole`; it does not export `authorize`, which the template route also calls at line 8.

Proposed narrowly scoped repair, awaiting the user's per-file gate: replace the missing response import with the existing local-controller error pattern; wire the existing authentication/`requireRole('admin')` exports into template routes; add startup/error/authorization regressions. Exact files: `backend/src/controllers/templates.controller.js`, `backend/src/routes/templates.routes.js`, new `backend/src/controllers/__tests__/templates.controller.test.cjs`, and this already approved progress document. No edits to auth middleware, schema, route URLs or template model are proposed. `template.model.js` separately imports the DB wrapper instead of its `pool` export, an already recorded CN-12 query issue; it is not needed to resolve module loading and is not bundled into this startup repair. No code repair has been made yet. The three completed migrations remain applied; do not rerun/reseed/restore the database as a response to this missing-module crash. Keep Vercel staged until backend health and application acceptance pass.

**Approved backend startup repair:** The user approved the four-file scope. `templates.controller.js` now defines the same local `fail()` pattern as other controllers; private server errors receive generic response text while explicit application statuses/messages are retained. `templates.routes.js` uses `auth.middleware`'s actual `authenticate`/`requireRole` exports and keeps template writes admin-only. The new CJS test file loads the full Express app without SQL calls and runs actual registered route middleware without opening a port. Its **12 regressions** cover missing/invalid authentication, forbidden student/clerk updates, permitted Admin updates, retained authenticated reads and 404 behavior, and safe errors for all three handlers. The startup regression was run before the source fix and reproduced the exact `../utils/response` failure. No additional discrepancy emerged during implementation; the separately diagnosed model query issue stays deferred.

Before the change, **554 backend / 347 frontend tests passed**. Afterward, **566 backend / 347 frontend tests passed**; the 12 new tests also passed in isolation. The literal relative CommonJS import audit now reports **zero unresolved imports**, and `git diff --check` passed. Frontend retained the existing local-storage warning. This validates imports and mocked request handling, not a live template/database operation. Only the four approved files changed; no middleware implementation, schema, dependencies, route URLs or model was modified.

Commit/push these four files to `dev`, merge the repair into `main` with automatic Vercel promotion disabled, then pull and rebuild **only the backend**. Before restarting it, require this rebuilt-image import check to pass:

```sh
docker compose run --rm --no-deps -T backend node -e "require('./src/app'); require('./src/config/db').pool.end().then(() => console.log('Backend startup imports OK.'))"
```

Then start/recreate just the backend with `docker compose up -d --no-deps backend` and check `/api/health` and container status. The healthy AI service can remain running. Existing successful migrations do not need repeating for this source-only repair. Commit/merge/pull, rebuilt-image check and live backend health remain pending; no production frontend promotion has been reported.

**10. Perform live application checks before Batch 10.** Verify student/staff login (including staff OTP), no Good Moral option in New Request, retired Admin controls for historical Good Moral types, the Diploma reissue label/configured fee, preserved historical records/uploads, and document-policy settings. Diploma should be 250 only if it previously used the 50 default; a custom fee should remain. Share migration completion messages, health output and any errors, never passwords or backup contents. Successful migrations do not establish all remaining OCR/notification/payment acceptance.

First check the staged production frontend against the updated backend. If login fails only on the staged URL, inspect existing origin/cookie configuration before assuming the migration failed. Once the matching frontend/backend revision passes, open Vercel **Deployments**, select **… → Promote** for that exact ready staged build, and confirm. Recheck the production domain after promotion. Leave automatic domain assignment disabled for future controlled rollouts, or deliberately re-enable it once this rollout is complete. This guide does not claim that the prior frontend is compatible with every backend change while it remains live.

## Batch 1 Re-verification — 2026-09-30

Baseline: `dev`, commit `42b18cd`. The user approved the file plan before editing, approved dark mode through D-01, and later approved `MiniSparkline.jsx` and the feedback integration test. This is a presentation-only pass; no backend, schema, route, auth, or pipeline-definition changes were made by this batch.

### Findings and implementation

| Item | Finding | Implementation / acceptance |
| --- | --- | --- |
| SH-03 | 64 inline SVG elements in 18 JSX files at baseline. Settings and Maintenance were already distinct. Admin Security Logs and Templates duplicated other destinations. | Distinct shield and template icons; existing SVG approach retained, no icon dependency added. |
| PL-01 | Global selection restrictions and table/input exceptions already existed; copyable values outside tables lacked overrides. | Explicit selectable names, IDs, tracking values, notes and messages; labels/controls remain non-selectable. |
| PL-02 | Fades, slides and reduced-motion CSS already existed; timings ranged from 200–1000 ms and queue switches lacked consistent entry motion. | 200 ms/easing convention, queue and modal entry motion, navigation fades without form remounts, reduced-motion scrolling, and static Recharts entry. |
| PL-03 | Uncontained tabs, flex-styled Finance table cells, graduate history badges, fixed floating panels, and narrow Student/Admin headers could overflow. | Wrapping controls and values, table-contained scrolling, constrained floating panels, and narrow-screen headers. Physical phone acceptance and Finance review remain outstanding. |
| PL-04 | No root theme control existed. D-01 approved it. | Root class set before React renders; browser-saved choice or initial system preference; accessible header switch; dark variants across screens and portaled modals; chart colors adapt. Slips and printable template previews remain light. |

### Validation and limitations

- Baseline suites: **438 backend tests**, **222 frontend tests**, all passing.
- Combined workspace checkpoint: **438 backend tests**, **245 frontend tests**, all passing. The frontend count includes preserved work from the separate Batch 2 session and integration-test corrections; it is not a Batch 1-only count.
- A production frontend build passed. It reports a large-bundle warning; dependency upgrades or bundle restructuring are outside this pass.
- Headless **Brave on macOS** with synthetic API responses: Finance, Graduate, Student, Window 1, Secretary and Admin dashboards at **320, 375, 768 and 1280 px**. None of those tested dashboard content panes overflow horizontally after the fixes. Wide tables retain their own scroll containers.
- All six dashboards were also checked in dark mode at 320 px. Public login, signup, forgot-password and reset-password routes were checked at 320 px in dark mode.
- Browser checks confirmed initial system theme, a saved light choice overriding a dark system preference, theme switching preserving a graduate form draft, a dark profile portal contained within 320 px, selectable profile names, and Escape returning focus to the navigation trigger. Reduced-motion CSS was checked against a dashboard fade.
- These checks do **not** establish live backend/payment/OCR behavior, physical phone/PWA installation acceptance, or every screen/state combination. PL-06/PL-08 must later be checked against their exact Batch 8 instructions.

### Pre-existing errors retained for a separately approved fix

The baseline frontend lint check has **31 errors and 3 warnings**. Batch 1 introduced no new diagnostic in its edited files; shared Batch 2 changes were inspected separately. Passing Vitest/build checks do not imply these runtime paths work.

| File / behavior | Finding |
| --- | --- |
| `frontend/src/features/finance/components/FinanceVerificationModal.jsx` | Opening Review with an itemized receipt crashes with `ReferenceError: formatPeso is not defined`. Reproduced in Brave and present in committed source; Finance modal visual acceptance is blocked. |
| `frontend/src/features/finance/FinanceDashboard.jsx` | Deferred OR modal references undefined `handleDeferredUpload`. Batch 2 replaces the simulated export alert with shared feedback; this does not implement export or expose its currently unreachable transactions tab. |
| `frontend/src/features/admin/AdminDashboard.jsx` | Security tab references `AdminSecurityPanel` without importing it; `AdminTemplatesPanel` is imported but not rendered. |
| `frontend/src/features/admin/components/AdminTemplatesPanel.jsx` | `{{VARIABLE_NAME}}` in JSX is evaluated as an undefined variable when the editor renders. |
| `frontend/src/features/student/StudentDashboard.jsx` | Profile-incomplete dialog references `ModalShell` without importing it. |
| `frontend/src/features/student/components/NewRequestModal.jsx` | `dropsPurpose` is referenced without a definition/import. |
| `frontend/src/features/secretary/useSecretaryDashboard.js` | `setPriceNotes` is referenced without a definition. This hook was not edited by Batch 1. |

### Concurrent Batch 2 work

A separate agent edited the same workspace during this pass. The user paused that session; its source and tests were preserved. It changed confirmations, modal focus handling and feedback to acknowledgment dialogs. Two integration failures were investigated: jsdom lacked Tailwind's `.hidden` rule in a modal test, and the feedback test still asserted the old toast structure. The fixture now supplies that CSS rule, and the feedback test verifies the current dialog/announcement/dismissal behavior. The user subsequently approved the Batch 2 takeover plan; see its separate review below.

### Batch 1 file manifest

Only the Batch 1 contribution is described here. Shared files also contain preserved Batch 2 edits.

| File | Batch 1 change |
| --- | --- |
| `frontend/src/components/AuthShell.jsx` | Dark surfaces and responsive public-page padding/title sizing. |
| `frontend/src/components/AuthedFilePreview.jsx` | Dark loading colors and Enter/Space access to clickable image previews. |
| `frontend/src/components/ConfirmDialog.jsx` | Dark styling; preserved the separate Batch 2 confirmation changes. |
| `frontend/src/components/DashboardAlerts.jsx` | Dark feedback colors; preserved Batch 2 acknowledgment-dialog behavior. |
| `frontend/src/components/DashboardLoading.jsx` | Dark text, entry fade and an announced loading status. |
| `frontend/src/components/DocumentChat.jsx` | Dark messages/forms, selectable messages and sender names, reduced-motion scrolling and a send-button label. |
| `frontend/src/components/ForcePasswordChange.jsx` | Dark form styling; preserved Batch 2 logout confirmation. |
| `frontend/src/components/ImageViewerModal.jsx` | Dark close-control styling; retains document imagery. |
| `frontend/src/components/MiniSparkline.jsx` | Disabled decorative Recharts entry animation after additional scope approval. |
| `frontend/src/components/ModalShell.jsx` | Dark portal surfaces, restrained entry motion and wrapping/responsive titles; preserved Batch 2 focus-stack work. |
| `frontend/src/components/ProfileSettingsModal.jsx` | Dark fields/tabs, selectable name, consistent progress timing and wrapping narrow-screen tabs. |
| `frontend/src/components/QueueTabs.jsx` | Wrapping tabs/counts, dark styling and arrow/Home/End keyboard navigation. |
| `frontend/src/components/UserAvatar.jsx` | Dark fallback avatar surface. |
| `frontend/src/components/UserCard.jsx` | Dark chips/surface and selectable names, IDs and email values. |
| `frontend/src/features/admin/AdminDashboard.jsx` | Dark cards/queues, chart colors/entry behavior and a contained narrow-screen forecast toolbar. |
| `frontend/src/features/admin/components/AccountVerificationModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/admin/components/AddUserModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/admin/components/AdminSecurityPanel.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/admin/components/AdminTemplatesPanel.jsx` | Dark editor chrome, stacked narrow-screen editor/preview and a paper-colored live preview. |
| `frontend/src/features/admin/components/AnalyticsPanel.jsx` | Dark cards/tables and static chart entry for reduced-motion consistency. |
| `frontend/src/features/admin/components/ForecastModal.jsx` | Dark forecast controls/cards and theme-aware chart stroke/tooltip colors. |
| `frontend/src/features/admin/components/MaintenancePanel.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/admin/components/ReportsPanel.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/admin/components/UserDetailModal.jsx` | Dark detail view and selectable/wrapping identity values. |
| `frontend/src/features/admin/components/UserEditModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/admin/components/UserGrid.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/finance/FinanceDashboard.jsx` | Dark queues, wrapping action groups inside real table cells, automatic column sizing and queue entry fades. |
| `frontend/src/features/finance/components/DeferredOrUploadModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/finance/components/FinanceVerificationModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/finance/components/WalkInPaymentModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/graduate/GraduateApplication.jsx` | Dark form/history, reduced mobile padding, wrapping IDs/status badges and responsive submit button. |
| `frontend/src/features/graduate/components/GradApplicationReviewPanel.jsx` | Dark review UI, a table-sized internal scroll area, selectable values and queue entry fades. |
| `frontend/src/features/secretary/SecretaryDashboard.jsx` | Dark queues, copyable identities and entry fades for queue changes. |
| `frontend/src/features/secretary/components/PaymentStubModal.jsx` | Selectable student name and wrapping detail rows; retained paper-colored styling. |
| `frontend/src/features/secretary/components/PricingModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/secretary/components/ReceiptVerificationModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/secretary/components/SecretaryEvaluationModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/student/StudentDashboard.jsx` | Dark queues/forms, consistent progress timing, copyable names and a wrapping header action group. |
| `frontend/src/features/student/components/FloatingSupportChat.jsx` | Viewport-constrained panel, dark messages, selectable tracking value and accessible open/close controls. |
| `frontend/src/features/student/components/LiveTrackingModal.jsx` | Dark tracker/details, selectable values, wrapping title and 200 ms progress transitions. |
| `frontend/src/features/student/components/NewRequestModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/student/components/OnboardingTutorial.jsx` | Viewport-clamped card placement, dark surface and consistent transition timing. |
| `frontend/src/features/window1/Window1Dashboard.jsx` | Dark queues/forms, copyable identities and consistent progress timing. |
| `frontend/src/features/window1/components/HardwareScannerModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/window1/components/IntakeReviewModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/features/window1/components/ManualInputModal.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/layouts/Layout.jsx` | Saved theme switch, dark shell, navigation fade without remounts, accessible notifications and keyboard-contained mobile drawer. |
| `frontend/src/layouts/SidebarNav.jsx` | Distinct destination icons, dark states and accessible link/current-page labels. |
| `frontend/src/main.jsx` | Apply saved/system theme before React paints. |
| `frontend/src/pages/ForgotPasswordPage.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/pages/LoginPage.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/pages/ResetPasswordPage.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/pages/SignupPage.jsx` | Dark variants for the existing presentation; wrapping/selectable direct values where present. |
| `frontend/src/index.css` | Root dark variant, chart colors, selection/focus rules and a shared 200 ms transition default. |
| `frontend/tailwind.config.js` | 200 ms fade/slide timing with one easing curve. |
| `frontend/src/utils/navigation.js` | Unique Security Logs and Templates icon keys. |
| `frontend/src/layouts/__tests__/Layout.test.jsx` | Theme persistence/storage-failure and drawer keyboard/focus checks. |
| `frontend/src/layouts/__tests__/SidebarNav.test.jsx` | Regression check for unique admin destination icons. |
| `frontend/src/components/__tests__/QueueTabs.test.jsx` | New regression tests for arrow/Home/End selection and focus. |
| `frontend/src/components/__tests__/ModalShell.test.jsx` | Preserved Batch 2 focus-stack tests and supplied the missing browser-style hidden fixture. |
| `frontend/src/components/__tests__/DashboardAlerts.test.jsx` | After scope approval, replaced stale toast assertions with feedback-dialog announcement, layering and dismissal checks. |
| `docs/CODING_PREFERENCES.md` | Document 320 px minimum, selection, keyboard, motion and theme conventions. |
| `docs/USER_MANUAL.md` | Explain the theme switch, navigation, copying and reduced motion. |
| `docs/PROGRESS.md` | Record baseline, findings, validation limits, concurrent work and this file manifest. |

## Batch 2 Re-verification — 2026-09-30

The user approved continuation of the paused agent's work and the exact completion file list, then separately approved the Layout source/test additions after the browser finding. The approved Batch 2 completion scope is complete. Their requested change from toasts to matching acknowledgment modals supersedes SC-02's original toast presentation. Existing field validation, authentication feedback, and profile-save banners stay inline. No backend, schema, API, route, authentication logic, or dependency changes were made.

### Findings and scope corrections

| Item | Current code and result |
| --- | --- |
| SC-01 | Shared `ConfirmDialog` already existed, with consumers for student cancellation, Window 1 release, Secretary handover, and shell logout. No executable native `window.confirm()` calls remain. Preserved its description, Cancel-first focus, neutral/destructive styling, configurable labels, and loading/dismissal protections. The forced-password screen now uses the same logout confirmation. Fixed the mobile drawer's keyboard interference after separate approval. |
| SC-02 | Portaled feedback was already above ordinary overlays, rather than two z-50 layers. The paused agent converted it to `DashboardAlerts` acknowledgment dialogs at z-110 over z-100 shells, removed expiry timers, and wired most dismissal handlers. Completed Graduate/Analytics dismissal and replaced remaining native alerts in Profile Settings and Finance. Feedback has its own visible OK footer. |
| SC-06 | `ModalShell` already existed; the historical count of 11 independent modal components was stale. Current source has 22 JSX consumers importing the shell. Preserved scrollable body/pinned footer, hidden/disabled-control filtering, stacked focus containment, Escape ownership, and connected-focus restoration. Full retrofit remains WI-05: Student still has two direct portals and Window 1 has two raw overlays. |

The earlier 23-consumer estimate was corrected by recounting production JSX imports; the shell itself is not a consumer. Graduate and Analytics rendered the new dialog without `onDismiss`, which could leave feedback open or fail on Escape. The Finance simulated-export control belongs to a transactions branch absent from the queue tabs; only its feedback presentation changed.

### Preserved takeover work

- `frontend/src/components/ModalShell.jsx`, `ConfirmDialog.jsx`, and `DashboardAlerts.jsx`: shared focus stack, confirmation behavior, and matching feedback dialog.
- `frontend/src/components/ForcePasswordChange.jsx` and `frontend/src/components/__tests__/ForcePasswordChange.test.jsx`: logout confirmation and its regression coverage.
- `frontend/src/hooks/useDashboardCore.js`, `frontend/src/features/admin/useMaintenance.js`, `useReports.js`, and `frontend/src/features/graduate/useGradApplicationReview.js`: persistent messages, clear-opposite-message behavior where supplied, and explicit dismissal callbacks.
- Student, Window 1, Finance, Secretary, and Admin dashboards plus Maintenance, Reports, and Graduate review panels: existing takeover dismissal wiring retained.
- `frontend/src/components/__tests__/ConfirmDialog.test.jsx` and `ModalShell.test.jsx`: confirmation variants/loading/cancellation and shared footer/focus-stack coverage retained.

### Completion file manifest

| File | Change |
| --- | --- |
| `frontend/src/features/graduate/GraduateApplication.jsx` | Pass the acknowledgment dismissal callback. |
| `frontend/src/features/graduate/useGraduateApplication.js` | Clear success/error on dismissal without resetting form answers. |
| `frontend/src/features/admin/components/AnalyticsPanel.jsx` | Connect the existing reports-hook dismissal callback. |
| `frontend/src/components/ProfileSettingsModal.jsx` | Replace logout-all native success/error alerts with stacked feedback; preserve the existing request. |
| `frontend/src/features/finance/FinanceDashboard.jsx` | Use shared feedback for the existing simulated export message. |
| `frontend/src/layouts/Layout.jsx` | Yield drawer keyboard handling while a shared dialog is open. |
| `frontend/src/layouts/__tests__/Layout.test.jsx` | Reproduce and prevent drawer interference with logout confirmation Tab/Escape and focus restoration. |
| `frontend/src/components/__tests__/DashboardAlerts.test.jsx` | Check OK/Escape/backdrop dismissal, keyboard containment, focus restoration, and draft preservation under feedback. |
| `frontend/src/components/__tests__/ProfileSettingsModal.test.jsx` | Cover logout-all success/failure, unchanged request, layering, acknowledgment, and focus restoration. |
| `frontend/src/features/__tests__/graduate.feedback.test.jsx` | New integration coverage for required-field, submission success/failure, dismissal, and retained drafts. |
| `frontend/src/features/__tests__/analytics.feedback.test.jsx` | New integration coverage for report-error dismissal with loaded analytics retained. |
| `frontend/src/features/__tests__/finance.modal.props.test.jsx` | Verify size-limit feedback persists after 30 seconds and dismisses without losing the underlying receipt form. The real receipt component remains mocked here. |
| `docs/CODING_PREFERENCES.md` | Replace obsolete toast/banner guidance with shared acknowledgment-dialog conventions. |
| `docs/USER_MANUAL.md` | Explain confirmations, persistent feedback, dismissal, and session-action feedback. |
| `docs/PROGRESS.md` | Record takeover scope, corrected assumptions, validation, and remaining blockers. |

### Validation and remaining work

- Before completion edits: **245 frontend tests / 21 files**, **438 backend tests / 15 files**, all passing.
- After completion edits, including the approved drawer fix: **255 frontend tests / 23 files**, **438 backend tests / 15 files**, all passing. Production frontend build and `git diff --check` pass.
- ESLint still fails on existing issues: **30 errors and 3 warnings**, down from 31 errors/3 warnings because the replaced profile alert no longer needs an unused catch variable. No new lint diagnostic appears in the completion files. Existing Node local-storage and build-size warnings remain.
- Headless Brave on macOS with synthetic API responses, **320 × 640 px**, both themes: Graduate submission feedback and session feedback render within the viewport, with visible OK footer and correct light/dark surfaces. Session feedback appears above Settings; OK, Escape, and backdrop dismissal preserve Settings and return focus to Logout All Devices. Tab remains inside feedback. No runtime exception occurred in these checks.
- **Additional finding fixed after approval:** mobile Logout opens a confirmation over the drawer. Brave originally reproduced the first Escape closing only the drawer, with a second Escape needed for the confirmation. A regression test also exposed incorrect Tab focus. The drawer now yields keyboard handling while a shared dialog is open. The regression passes, and Brave in both themes confirms the first Escape cancels only the confirmation, keeps the session, and restores focus to Logout; the next Escape closes the drawer.
- The Finance receipt `formatPeso` crash and other Batch 1 findings remain outside this approved scope. The real Finance return-without-receipt path cannot be accepted while that crash remains. Shared layering is covered using a working underlying form instead.
- Physical phone/PWA acceptance, live backend session behavior, and the later WI-05 retrofit remain outstanding. `AGENTS.md` was left unchanged.

## Batch 3 Re-verification — 2026-09-30

Baseline: clean `dev`, commit `e04e2f7`. Both items were re-verified before editing. The user approved the exact six-file plan for one full payment per request group; no independent D-02 decision was found in repository documents. This approval retains the current full-group payment behavior. No backend, schema, API, route, auth, pipeline, hook, dependency, or shared-component changes were made.

### Findings and implementation

| Item | Current-code finding | Change |
| --- | --- | --- |
| FX-01 | Active Requests already used `gap-3` between bar and percentage, but fixed-width columns, uneven cell padding, inline status chips, and combined timestamp text still crowded rows. Original locations: `StudentDashboard.jsx:198–270`. | Automatic table layout with sufficient column widths, consistent padding/middle alignment, separate date/time lines, wrapping document details/chips, and reserved percentage width. Progress values still use `getProgressVal`; bars expose their value to assistive technology. Narrow screens scroll within the existing card. |
| FX-02 | The banner already had one Pay action per request group (`StudentDashboard.jsx:158–195`), while Active Requests duplicated it for each payable document (`242–249`). Checkout displayed the first document's name/short tracking ID even when the total covered several documents (`534–552` for the old breakdown). | A single primary button per group always shows total/count above document amount line items. Row-level Pay buttons are removed; non-cancellable rows use existing Live Track. Checkout identifies the request, document count, total, and plain line-item amounts. |

The historical description of one independent payment per document was incomplete: grouping was already implemented in `useStudentDashboard.js:69–96`. Read-only verification of `documents.service.js:592–666` and `document.model.js:224–260` confirmed that one receipt is applied to one whole request group. Combining separate requests or selecting individual documents would require separately approved backend/workflow changes. The existing submission handler and representative-document API call remain unchanged.

### Files changed

| Exact path | Change |
| --- | --- |
| `frontend/src/features/student/StudentDashboard.jsx` | Active-row spacing/accessibility, one grouped Pay action with count and line items, and group-aware checkout labels/breakdown. |
| `frontend/src/features/__tests__/student.payment.test.jsx` | Five new integration regressions covering grouped totals/counts, separate requests, keyboard activation, checkout coverage, one unchanged receipt submission, and cancellation staging. |
| `frontend/src/features/__tests__/pipeline.queues.render.test.jsx` | Require exactly one grouped payment action; open it by its precise total/count label in existing method/submission checks. |
| `docs/CODING_PREFERENCES.md` | Record row spacing and consolidated payment conventions. |
| `docs/USER_MANUAL.md` | Explain grouped totals/counts, checkout coverage, and table scrolling. |
| `docs/PROGRESS.md` | Record corrected assumptions, scope, verification, and retained findings. |

### Validation

- Before edits: **255 frontend tests / 23 files** and **438 backend tests / 15 files**, all passing.
- After edits: **260 frontend tests / 24 files** and **438 backend tests / 15 files**, all passing. Focused student/payment suites also pass. Production frontend build passes, with the existing large-bundle warning.
- ESLint retains **30 existing errors and 3 warnings**. The edited tests have no diagnostics; StudentDashboard retains its existing unused `useEffect` and missing `ModalShell` import. No new lint diagnostic was introduced.
- Headless Brave on macOS, synthetic API data, **320/375/768/1280 × 900 px**, both themes: no dashboard horizontal overflow; table scroll remains inside its card. Across the tested rows, bar-to-percentage spacing is **12 px**, percentage-to-chip spacing is **32 px**, chip-to-action spacing is at least **32 px**, and vertical centers differ by at most **1 px**. Fixtures include long/unbroken document names, wrapped status labels, and cancellation.
- Browser checks show exactly one Pay button for each of two separate request groups and no row-level Pay buttons. Keyboard focus has a visible outline; Enter opens checkout with the two-document request/count/breakdown. Tested checkout forms have no internal horizontal overflow or runtime exception.
- Initial browser harness attempts used an alumni fixture without the existing application-gate flag, then an incomplete native Enter event. Correcting those test fixtures/events resolved the check failures; no application/auth code was changed for them.

### Findings retained for a separately approved investigation

- **Missing request-group IDs:** `useStudentDashboard.js:70–95` groups and totals solely by `request_group_id`; multiple records with null/undefined IDs can be combined incorrectly. Checkout uses that same existing equality. `backend/database/migration.js:292–298` backfills older null IDs from tracking numbers, but live migration/data state was not checked. The backend service has a tracking-number fallback while its group model reads/updates only `request_group_id`. This needs a separate data/workflow investigation before proposing any backend fix; Batch 3 does not claim payment support for malformed/unmigrated records.
- The previously recorded profile-incomplete `ModalShell` import error remains. The existing payment modal still uses a direct portal; its full pinned-footer/focus-shell retrofit belongs to WI-05. Its existing Back to Form action calls cancellation and its payment-slip action has no matching Student render branch; these actions were not changed or accepted in this batch.
- Live database/payment verification and physical phone/PWA acceptance remain outstanding. `AGENTS.md` was left unchanged.


## Batch 4 Re-verification — 2026-09-30

Baseline: `dev`, commit `e04e2f7`, with the existing uncommitted Batch 3 changes preserved. The user approved the Batch 4 file plan, D-05's **every save and submission** scope, and the physical-OR/deferred-copy workflow. They separately approved the Admin category-2 test addition and removal of the obsolete Secretary pricing reset. `AGENTS.md` existed and remains unchanged. No schema, API-contract, route, auth-logic, pipeline-definition, dependency, or AI-engine changes were made. The sole approved backend repair corrects the existing deferred-upload document lookup.

### Findings, decisions, and implementation

| Item | Re-verified result |
| --- | --- |
| WI-01 | Shared confirmations already covered Window 1 release, Secretary handoff, and shell/forced-password logout. There were no executable native confirms left to replace. Retained these and verified cancellation sends no request. |
| FX-05 | The historical release-stage return-without-receipt path does not exist. The actual regression was intake notes hidden for document types without required attachments. Notes are now available for every intake document; returning requires a reason and confirmation. No release-stage return action was invented. |
| Receipt workflow | Finance records the OR number and confirms payment without an immediate digital copy, hands the physical original to Secretary, and uploads its retained copy later. Secretary must inspect the uploaded copy or explicitly acknowledge physical inspection against the recorded number before handoff. Missing digital copies do not block release. The existing verification `notes` payload records physical inspection; no new backend inspection enforcement was introduced. |
| Deferred upload prerequisite | Finance's existing transactions branch was unreachable from its tabs, and its callback was not wired. Added **Transactions & OR Copies** with a queue derived from `PIPELINE`, and connected the existing upload service. The backend incorrectly treated `findById()`'s row array as a document; the approved destructuring repair restores group lookup. Upload changes only existing copy fields, including after completion. |
| WI-02 | Secretary already uses `QueueTabs` for all four current queues: Initial Evaluation, Processing & Pricing, OR Verification, Final Handoff. Counts are rendered as badges. No duplicate wiring added. The historical three-table count was stale. |
| WI-05 | The historical 11-modal count was stale. Shared-shell consumers already covered most dialogs. Migrated Student's remaining direct portals and Window 1's raw scan overlays; moved manual-entry and payment action buttons into shell footers. Existing split-view shells retain independently scrolling bodies and fixed action areas. `createPortal` now appears only in `ModalShell` in production JSX. |
| WI-07 / D-05 | Extended existing confirmation behavior to every implemented save/submission: student requests/payments and Back to Form cancellation; manual/scanned requests; deferred OR upload; Graduate applications; profile/session actions; forced-password changes; chat sends; Admin creation/user edits/template saves; sign-in/registration/password-recovery forms. Existing desk decisions and Graduate review confirmations were retained. Validate before staging, keep drafts/files on cancel or failure, clear only after success. |
| Pricing prerequisite | An existing undefined `setPriceNotes('')` call crashed after successful Secretary pricing. Removed after separate approval; regression tests cover billed/payment-slip and unbilled/close outcomes. |
| Other approved prerequisites | Imported missing `ModalShell` in Student and `formatPeso` in Finance Verification; restored the actual earlier New Request purpose/attachment behavior by removing calls to undefined `dropsPurpose`; escaped the template placeholder text that was being evaluated as JavaScript. |

The initial idea of blocking release whenever the digital attachment was missing was superseded by the user's physical receipt policy. The Secretary guard applies to its UI and hook, not to direct API callers. Visual checks also exposed a collapsed missing-copy message in the narrow receipt layout; its preview now has enough height for the message while the detail body scrolls above a visible footer.

### Source file manifest

| Exact path | Change |
| --- | --- |
| `frontend/src/features/window1/Window1Dashboard.jsx` | Shared scan shells/pinned actions, request-submission confirmation, digital-copy-pending release labels. |
| `frontend/src/features/window1/useWindow1Dashboard.js` | Stage manual/scanned payloads; reset inputs only after confirmed success. |
| `frontend/src/features/window1/components/IntakeReviewModal.jsx` | Show correction notes regardless of attachment requirements. |
| `frontend/src/features/window1/components/ManualInputModal.jsx` | Associate pinned Submit Request with the existing form; preserve required validation. |
| `frontend/src/features/secretary/components/ReceiptVerificationModal.jsx` | OR-number/physical-inspection prerequisites, loading protections, readable narrow layout. |
| `frontend/src/features/secretary/useSecretaryDashboard.js` | Verify receipt guards and audit notes; remove approved obsolete pricing reset. |
| `frontend/src/features/student/StudentDashboard.jsx` | Shared incomplete-profile/payment/success shells, pinned payment actions, submission confirmations; preserve Batch 3 grouping/spacing. |
| `frontend/src/features/student/useStudentDashboard.js` | Stage request/payment payloads and confirm Back to Form cancellation. |
| `frontend/src/features/student/components/NewRequestModal.jsx` | Restore purpose rendering and configured attachment requirements. |
| `frontend/src/features/finance/FinanceDashboard.jsx` | Reachable Transactions & OR Copies tab, count and upload wiring. |
| `frontend/src/features/finance/useFinanceDashboard.js` | Pipeline-derived transactions queue and existing deferred-upload action. |
| `frontend/src/features/finance/components/DeferredOrUploadModal.jsx` | Pinned upload footer, confirmation, retained file on cancel/failure. |
| `frontend/src/features/finance/components/FinanceVerificationModal.jsx` | Restore price formatter; OR number required, uploaded copy optional, physical-handoff guidance at all hours. |
| `frontend/src/components/ProfileSettingsModal.jsx` | Confirm profile save and logout-all; visible failure in confirmation. |
| `frontend/src/hooks/useProfileSettings.js` | Return save success/failure for confirmation dismissal. |
| `frontend/src/components/ForcePasswordChange.jsx` | Validate, stage, and confirm replacement password. |
| `frontend/src/components/DocumentChat.jsx` | Confirm sends before optimistic mutation; restore failed message draft. |
| `frontend/src/features/graduate/GraduateApplication.jsx` | Shared application-submission confirmation. |
| `frontend/src/features/graduate/useGraduateApplication.js` | Validate/stage answers; keep draft on cancel/failure. |
| `frontend/src/features/admin/components/AddUserModal.jsx` | Confirm staff creation with staged payload. |
| `frontend/src/features/admin/components/UserEditModal.jsx` | Confirm changed account fields before save. |
| `frontend/src/features/admin/components/MaintenancePanel.jsx` | Confirm document-type, college, and payment-method creation. |
| `frontend/src/features/admin/components/AdminTemplatesPanel.jsx` | Confirm staged template save; visible error; literal placeholder text. |
| `frontend/src/pages/LoginPage.jsx` | Confirm existing sign-in/OTP submissions without changing auth requests. |
| `frontend/src/pages/SignupPage.jsx` | Confirm existing registration payload and identity proof. |
| `frontend/src/pages/ForgotPasswordPage.jsx` | Validate and confirm reset-link request. |
| `frontend/src/pages/ResetPasswordPage.jsx` | Validate and confirm existing token/password reset submission. |
| `backend/src/services/documents.service.js` | Destructure the existing deferred-upload lookup result. |

### Test and documentation manifest

| Exact path | Change |
| --- | --- |
| `backend/src/services/__tests__/documents.service.test.cjs` | Ten deferred-copy regressions: four paid stages, missing document/file, unauthorized roles, group fields only, no payment/pipeline mutation. |
| `frontend/src/features/__tests__/batch4.confirmations.test.jsx` | Eleven regressions for pricing completion, desk gates, manual/scanned/student drafts, Back to Form cancellation, user edits, and template payloads. |
| `frontend/src/features/__tests__/finance.deferred-or.test.jsx` | Seven receipt-workflow regressions: no immediate digital copy, OR number/physical inspection required, deferred upload confirmation/cancel/failure. |
| `frontend/src/features/__tests__/modal.footers.test.jsx` | Five regressions for associated manual form/keyboard/native validation, always-visible intake notes, and restored student request fields. |
| `frontend/src/pages/__tests__/submission.confirmations.test.jsx` | Five account-form confirmation/validation/draft/payload regressions. |
| `frontend/src/components/__tests__/DocumentChat.test.jsx` | Two send-confirmation/cancellation/failure-draft regressions. |
| `frontend/src/features/__tests__/pipeline.queues.render.test.jsx` | Existing payment test confirms before expecting the unchanged request; Finance mock includes the existing deferred service. |
| `frontend/src/features/__tests__/student.payment.test.jsx` | Existing grouped-payment submission test waits for confirmation and asserts no earlier request. |
| `frontend/src/features/__tests__/graduate.render.test.jsx` | Existing submission payload tests confirm before expecting requests. |
| `frontend/src/features/__tests__/graduate.feedback.test.jsx` | Confirm first; failure acknowledgment leaves confirmation/draft open until cancelled. |
| `frontend/src/features/__tests__/admin.category2.render.test.jsx` | Staff/payment-method payload tests require confirmation; college cancellation and document-type defaults covered. |
| `frontend/src/components/__tests__/ProfileSettingsModal.test.jsx` | Confirm save/logout-all, cancellation, feedback dismissal, underlying Settings and focus restoration. |
| `frontend/src/components/__tests__/ForcePasswordChange.test.jsx` | Existing success/failure tests confirm first; server error checked inside confirmation. |
| `frontend/src/hooks/__tests__/useProfileSettings.test.jsx` | Assert save boolean matches success/failure. |
| `docs/CODING_PREFERENCES.md` | D-05 staging/draft rules and physical-OR/deferred-copy convention. |
| `docs/USER_MANUAL.md` | Current desk labels/actions, confirmations, physical OR inspection, delayed copy upload, pricing behavior. |
| `docs/SYSTEM_WORKFLOWS.md` | Physical OR handoff and deferred copy semantics; unchanged payment authority and pipeline. |
| `docs/PROGRESS.md` | Current verification, approvals, manifests, corrected assumptions, limitations. |

### Validation

- Before Batch 4: **260 frontend tests / 24 files** and **438 backend tests / 15 files**, all passing.
- After Batch 4: **293 frontend tests / 29 files** and **448 backend tests / 15 files**, all passing. Production frontend build passes. Existing local-storage and large-bundle warnings remain.
- ESLint still fails: **21 errors and 3 warnings**, versus baseline 30/3. Comparing the saved baseline confirms no new lint diagnostic was introduced. The template effect/function-ordering and dependency warnings already existed alongside its undefined placeholder; the placeholder error is fixed, while the existing ordering issues remain outside scope. Test files have no lint diagnostics.
- Headless Brave on the user's macOS/M1 environment, intercepted synthetic APIs, **320/375/768/1280 × 640 px**, both themes: **99 recorded checks**, no checked footer visibility/scroll movement/horizontal-overflow or runtime-exception failures. Student payment/incomplete-profile, manual intake, intake review, Secretary receipt, and Finance verification actions remain visible while bodies scroll. Finance confirmation contains Tab; Escape preserves the underlying form and restores Verify Payment focus. Missing-copy Secretary confirmation is disabled until physical inspection; cancellation sends no mutation. Finance confirmation without a digital copy and later deferred upload each send exactly one existing request; cancelling upload sends none and preserves the selected File.
- Screenshots in `/private/tmp/trace-batch4-<dialog>-<theme>.png` are current synthetic-fixture captures. Initial captures were taken during entry animation; the final captures wait for animation completion. They are not matched original acceptance before/after pairs.
- Following the daemon restart, the test server was restarted on IPv4 loopback before completing browser checks. No product configuration changed.

### Remaining findings and acceptance limits

- A physical phone/PWA check, live database/payment/file-upload validation, and matched original before screenshots are not available. Batch 6 is not accepted from desktop viewport emulation alone.
- The mock camera screen still creates a plain object rather than a real captured File, and has no reachable opening button in the current dashboard. The real file-upload/manual paths and confirmation staging are covered; camera/scanner integration was not invented.
- Student's existing Print Payment Slip action still has no matching render branch. The pre-existing forced 2FA path in Login cannot be accepted end-to-end because `useAuth.login()` does not return the response its page expects. Auth logic remains outside this batch.
- `AdminSecurityPanel` exists but is not imported in `AdminDashboard`; its route still errors. `AdminTemplatesPanel` is imported but not rendered for the Templates tab. The latter's component save behavior is tested directly; tab wiring remains outside this approved scope.
- Malformed/missing request-group IDs retain the Batch 3 investigation finding. No migration or live data repair was performed.
- Batch 5 and Batch 6 each still require their own current-code/file-plan approval gate. The 7-Day Volume Forecast scaling item belongs to Batch 8 and was not changed here.


## Batch 5 Re-verification — 2026-09-30

Baseline: clean `dev`, commit `6ccd951`. The user approved the exact six-file plan with **continue** before edits. This batch is presentation-only: no backend, API, schema, route, auth, dependency, pipeline, Finance source, or shared-component changes.

### Findings and result

| Item | Current-code finding | Result |
| --- | --- | --- |
| FX-03 | `AdminDashboard.jsx:94–116` already displayed the reporting analytics `end_to_end.avg_minutes` through `formatDuration` and an explicit empty-state message. `useAdminDashboard.js:63–86` already fetched this data independently through the existing reporting endpoint. The historical blank dash diagnosis was stale. The chart still competed with the metric in a row, and passing `[]` to `MiniSparkline` drew its decorative fallback. | Retained the real average/unit and empty message. Moved the measured chart below the metric at full content width and 96px height, labeled **Daily completed documents**, and rendered it only with completed requests and a nonempty daily series. The existing tooltip shows dates and document counts through mouse/keyboard interaction. Kept caption within the card at narrow widths. |
| WI-06 | `FinanceDashboard.jsx:86–93` already exposed Awaiting Payment, Verification Queue, and Transactions & OR Copies through `QueueTabs`, including the Batch 4 deferred-upload queue. All relevant table branches were wired. | No duplicate Finance implementation. Strengthened tests for real count badges, one selected table, keyboard switching, and correct paid-stage membership through completion. |

System Throughput remains a duration KPI; the chart measures daily completed-document counts. These labels distinguish the two. The 7-Day Volume Forecast and Batch 8 scaling issue were not changed. The metric's numeric production accuracy is not asserted from synthetic fixtures.

### Files changed

| Exact path | Change |
| --- | --- |
| `frontend/src/features/admin/AdminDashboard.jsx` | Accessible card region, full-width measured chart/label, suppression of empty decorative trend, wrapping caption. |
| `frontend/src/features/__tests__/admin.throughput.test.jsx` | Four integration regressions using the real Admin hook, formatter and chart: reporting average instead of dashboard-stats fallback, keyboard date/count tooltip, explicit empty state with no chart, and sub-minute average without a daily series. Only API responses and jsdom chart dimensions are mocked. |
| `frontend/src/features/__tests__/pipeline.queues.render.test.jsx` | Finance badge counts and keyboard selection/membership checks, preserving existing queue tests. |
| `docs/CODING_PREFERENCES.md` | Measured versus decorative chart rules and tooltip accessibility convention. |
| `docs/USER_MANUAL.md` | Explain average duration, daily completion counts, tooltip controls and empty state. |
| `docs/PROGRESS.md` | Record corrected diagnosis, six-file scope, tests, browser evidence and remaining acceptance limits. |

### Validation and remaining work

- Before edits: **293 frontend tests / 29 files**, **448 backend tests / 15 files**, all passing.
- After edits: **298 frontend tests / 30 files**, **448 backend tests / 15 files**, all passing. Production build and `git diff --check` pass.
- ESLint retains **21 existing errors and 3 warnings**. Saved-baseline comparison shows no new diagnostic. Existing local-storage and build-size warnings remain.
- Headless Brave on macOS/M1 with synthetic API responses: **48 checks**, **320/375/768/1280 × 900 px**, both themes. Chart fills its card content width at 96px height, real average reads **45 min** for the fixture, and measured date/count tooltips work through hover and Left/Right arrows with visible keyboard focus. Empty completions show the message and no chart. Finance badges remain present and keyboard switching selects one correct queue table. No tested card/dashboard overflow or runtime exception.
- Initial browser assertions expected a tooltip immediately on programmatic SVG focus. Actual Brave reveals it through Arrow-key interaction; checking the required keyboard equivalent resolved that harness assumption without changing the shared component.
- Current synthetic screenshots: `/private/tmp/trace-batch5-admin-light.png`, `trace-batch5-admin-dark.png`, `trace-batch5-empty-light.png`, `trace-batch5-empty-dark.png`. These are not original before/after acceptance pairs.
- Live reporting values, physical-phone acceptance, and original before-screenshot matching remain for Batch 6. Batch 4's documented out-of-scope findings remain. `AGENTS.md` was unchanged, and no commit or push was performed by this batch.

## Batch 6 Verification Baseline — 2026-09-30

Baseline: clean `dev`, commit `29da15b`. The user explicitly approved Batch 6 after the verification plan. The only approved repository edit is **`docs/PROGRESS.md`**, recording acceptance evidence and findings. Product code, tests, `AGENTS.md`, dependencies, backend contracts, database, auth, and pipeline definitions were not changed.

### Acceptance results

| Check | Evidence and outcome |
| --- | --- |
| Native confirmation removal | Source search across frontend/backend production code finds only the explanatory `window.confirm()` comment in `ConfirmDialog.jsx:5`. A browser trap records no native confirmation calls in the exercised flows. |
| Logout in all six roles | Student, alumni, Window 1, Secretary, Finance, and Admin open the shared confirmation before logout. Tab stays inside with visible focus; Escape preserves the session. On narrow screens, the first Escape closes confirmation while retaining the drawer; the next closes the drawer. |
| Feedback above open dialogs | Every role's Account Settings → Security → Logout All Devices sends no mutation before confirmation. Synthetic success appears in the acknowledgment dialog at z-index 110 above the open settings dialog at 100, with its OK button visible and separated from the underlying Save Profile action. Dismissal restores focus inside settings. Feedback deliberately requires acknowledgment rather than expiring as a toast, per Batch 2's approved decision. |
| Window 1 decisions | Returning intake without notes shows a visible reason above the intake dialog and sends no mutation. Notes remain available without a required attachment. With notes, Return stages confirmation; release stages confirmation even without a digital OR copy. Cancellation sends no mutation. This follows the approved physical-OR workflow, not the historical return-at-release assumption. |
| Secretary and Finance queues | Secretary has four tabs, including OR Verification; Finance has three, including Transactions & OR Copies. Real styled badges match the synthetic queues (Secretary 1/1/1/1; Finance 3/1/4). Arrow keys select one visible table. Secretary handoff stages confirmation before mutation. |
| Student payment and spacing | Both student identities show one payment action per request group: ₱200.00 for two documents, plus ₱50.00 for a separate request. No per-row Pay buttons. Checkout lists the group's documents and correct total. Progress/percentage/status/action gaps are at least 7px, with centers aligned within 2px; narrow tables scroll within their container without dashboard overflow. |
| Throughput | Admin displays the reporting fixture's real `avg_minutes` value, **45 min**, above the full-width 96px daily-completions chart. Batch 5's empty-state and tooltip regression tests remain green. Synthetic evidence verifies rendering, not the numeric accuracy of production reporting. |
| Themes and motion | All six dashboard shells and exercised settings/confirmation/feedback dialogs work in light/dark mode at 320/375/1280 × 900px. Keyboard theme switching persists after reload. Reduced-motion media settings suppress modal animation/transition duration. Graduate Application also passes at 375/1280px in both themes. |
| Actual phone | **Pending.** Headless Brave on the user's macOS/M1 environment with narrow viewport emulation is not a physical-phone/PWA test. No physical-phone setup has been provided. |
| VF-02 screenshot matching | **Unavailable:** the user confirmed they have no copy of the original screenshots. Captured 40 current synthetic screenshots, including six-role dashboards, Graduate, progress, checkout, and feedback. These establish a current reference; they cannot validate historical before/after pairs. |

### Unresolved findings — no source edits authorized

- **Admin Security:** `frontend/src/features/admin/AdminDashboard.jsx:71` references `AdminSecurityPanel` without importing it. Opening `?tab=admin-security` reproduces `ReferenceError` and the dashboard crashes. The component exists at `frontend/src/features/admin/components/AdminSecurityPanel.jsx`.
- **Admin Templates:** the import at `frontend/src/features/admin/AdminDashboard.jsx:1` has no matching render branch for `admin-templates`, despite its navigation entry at `frontend/src/utils/navigation.js:53`. Browser navigation renders an empty main area. The existing panel is `frontend/src/features/admin/components/AdminTemplatesPanel.jsx`.
- **Student payment slip:** `frontend/src/features/student/StudentDashboard.jsx:474` changes `activeModal` to `payment-stub`, but no branch renders that state. Clicking **Print Payment Slip (Walk-in)** closes checkout and shows no slip. This reproduces Batch 4's recorded finding.
- **Tracker pipeline duplication:** `frontend/src/features/student/components/LiveTrackingModal.jsx:10–20` hardcodes the nine-stage `TRACKER_NODES` list; line 47 derives the count from that duplicate. The shared `PIPELINE` is used for status comparisons but does not generate nodes/order/count. Frontend/backend pipeline arrays currently match all nine stages. The earlier assumption that the tracker fully derives its stages from `PIPELINE` was incorrect; a separately approved repair is needed to meet the standing instruction.

Batch 4's camera, forced-2FA response, and malformed request-group concerns remain unaccepted; this batch did not expand into those fixes. No live database, real payments, real receipt files, notification delivery, or production reporting accuracy was exercised. API responses were intercepted with synthetic records; browser mutation checks did not change real records. Full-system acceptance remains incomplete despite the passing targeted checks.

### Validation and artifacts

- Before/after documentation edit: **298 frontend tests / 30 files** and **448 backend tests / 15 files**, all passing. Frontend production build and `git diff --check` pass.
- ESLint: **21 existing errors, 3 warnings**; exact diagnostics match the saved Batch 5 baseline. Existing local-storage and large-bundle warnings persist.
- Brave: **318 main checks plus 28 additional checks**, all passing. Separate diagnostic navigation probes reproduce the three runtime/navigation failures above; these are not counted as acceptance passes.
- Browser harness assumptions were corrected without product edits: desktop Logout is an icon button identified by its title, the handoff label is **Handed to Window 1**, synthetic stats must include the existing Secretary KPI fields, and native Enter activation needs the carriage-return text event. The initial incomplete Enter event failed theme checks; the complete native event passes in every role and persists after reload.
- Temporary evidence: `/private/tmp/trace-batch6-browser-results.json`, `trace-batch6-extra-results.json`, before/after frontend/backend JSON test reports, `trace-batch6-lint.json`, and current `trace-batch6-*.png` captures. A review gallery and ZIP are at `/private/tmp/trace-batch6-review/index.html` and `/private/tmp/trace-batch6-review.zip`. These contain synthetic screenshots/current results, not original before images.
- Only `docs/PROGRESS.md` changed in the repository. No commit or push was performed. VF-01 requires resolution of the recorded defects and real-device/live-flow acceptance; VF-02 cannot be completed without the originals.


## Batch 8 Implementation — 2026-09-30

Baseline: clean `dev`, commit `803e73c`. The user approved implementation after re-verification and decision review, including narrowly scoped backend/API/auth dependencies. Later explicit approvals added `AccountVerificationModal.jsx`, Finance's hook/dashboard, and reconciliation of missing repository auth DDL plus independent login/email-change OTP slots. No dependencies were upgraded, pipeline stages reordered, live records changed, migration applied, commit made, or push performed. Existing `AGENTS.md` remains unchanged.

### Re-verification and outcome

| Item | Actual finding and result |
| --- | --- |
| BR-01 | Opened the existing SVG: it was the Vite mark. Replaced it with the approved green TRACE T. Seal inventory: shared `AuthShell` (Signup/Forgot/Reset), old standalone Login, and dashboard `Layout` header. Layout already paired its seal with TRACE. Login now reuses AuthShell, which pairs the PLP crest with TRACE. No standalone seal asset was found in generated payment slips or document/email templates; existing document branding was retained. |
| SEC-01 | No browser recognition existed, but notifications already did. Added per-user hashed recognition-cookie records and first/new-browser bell/email alerts only after complete password/OTP authentication. Notification links open Security settings. Cookie clearing or privacy blocking can trigger another alert; this is browser recognition, not device attestation or a sessions redesign. Live cookie/SMTP acceptance remains pending. |
| AC-01 | Phone persistence was not reproduced as broken: both write and fresh login/profile reads contain the field. Email intentionally remained pending, but its existing OTP routes lacked controller adapters and the UI falsely treated it as committed. Completed the OTP save/verify/cache flow; the current email stays active until verification, then a fresh profile read updates all hook consumers. |
| AC-02 | The account editor lacked contact/college/program support and student editing; some displayed fields were unsupported by its save endpoint. Added supported fields for student/alumni/staff and an approved admin-only profile endpoint. IDs remain immutable; staff password/activation permissions remain unchanged. |
| AC-03 | Added the approved central field limits throughout editable text inputs. Existing saved values are not truncated; login/current passwords remain unrestricted. Payment-method reference labels use their actual 150-character SQL limit. Numeric/date controls retain validation. The exact policy is in `CODING_PREFERENCES.md`. |
| PL-05 | `frontend/index.html:6` still has the accessible viewport. Existing global mobile CSS already makes inputs/textareas 16px below 768px. Browser audits passed; did not disable pinch zoom or change the viewport. Actual iOS Safari remains untested. |
| PL-06 / FX-09 | Historical line-number/implementation assumptions had moved. The tracker still duplicated the stage list despite the shared pipeline. Its original completed line reached the final center after animation; an early animated sample misleadingly showed a shortfall. Rebuilt positioning from PIPELINE: three alternating columns on mobile, one row on desktop, measured center-to-center SVG connections. No separate node count/order list. |
| FX-10 | Both legacy statuses fell through to active-looking progress. Added explicit zero progress, closed-record tracker treatment, green Approved/red Rejected presentation shared across student, Window 1, admin, and reports. Backend status vocabulary already includes both; no pipeline or backend transition change was required. |
| FX-11 | Reproduced content-driven Reports column movement on page 2 (up to about 161px at desktop width); Window 1's fixed columns did not reproduce it. Reports now has a stable eight-column layout that accommodates the new Last Updated field. Final page-two geometry remains stable. |
| PL-07 | Existing pagination inventory: Window 1 intake/release/tracking, admin document tracker, and Reports. Applied one measured ResizeObserver/RAF hook to these tables, preserving the first-row position and using the largest observed row height. Secretary/Finance queues and user grids remain unpaginated. Capacity uses a conservative viewport/main-height budget; wide tables retain internal scrolling. |
| WI-08 | Stale diagnosis: QueueTabs line 24 is keyboard navigation, and nonzero circular badges were already implemented below it. Existing zero hiding, active/inactive contrast, and shared Secretary/Finance usage were verified. No duplicate badge change. |
| WI-09 | FETCH was fully inside ManualInputModal at 320/375/768/1280px. No clipping repair was invented; this file only received approved input limits. |
| WI-10 | requiresAttachment was already wired into IntakeReviewModal; upload is hidden for types that do not require it. Retained the condition while adopting the shared upload field. |
| WI-11 | Release was a text confirmation, while AI review already had proof/info panes. Extended the existing shared confirmation to accept a preview pane and request details. Uses available OR/supporting attachment; explicit empty state preserves the physical-OR workflow. No new attachment/release API. |
| WI-12 | Replaced the stacked intake/release queue presentation with one shared tab group beside a 320px desktop upload card; stacks on narrow screens. Counts and selected queue preserve existing ownership/workflow. |
| SEC-02 | Reproduced Certification shown as TOR: a hardcoded select omitted the document's actual type. The select now uses the reference options and retains the current historical value if absent from them. |
| SEC-03 / SEC-04 | Already implemented: ReceiptVerificationModal contains inline payment details/proof plus physical receipt acknowledgment, and Pricing uses shared confirmation. No replacement modal or duplicate finalization step. Finance can still upload its retained OR copy later. |
| FX-12 | AI returns confidence under extracted_data; the backend read the wrong top-level field and substituted zero. Corrected the approved adapter, preserving finite zero/fractional values and null for unavailable data. Review display now distinguishes zero from unavailable. Live OCR accuracy is unaccepted. |
| RPT-01 / RPT-02 | Added readable Philippine-time full timestamps in the existing formatters module, reused pricing's existing formatPeso, and wired Requested/Updated/Amount columns. Combined export categories into one labeled select and Export button; existing filters/endpoints retained. CSV content contracts were not changed. |
| AD-01 / AD-02 | Merged Registered Users into Maintenance → Accounts; retained its old URL as an alias. Verification queue now identifies Applicant Type and opens one Review modal; Verify/Reject each stage shared confirmation. No account decision is sent when opening/cancelling review. |
| NT-01 | Existing bell/realtime/email plumbing was reusable. Pending registrations now notify active admins with an internal matching-account review link. Notification failures do not roll back registration; repeat SPA clicks can reopen a cancelled review. Bell popups close on navigation/tab change. |
| FX-13 | Already exact: auth messages say 15 minutes on lockout and the remaining rounded minutes afterward. No duration-copy repair. |
| PL-08 | Reproduced oversized Login text in the desktop split at intermediate widths (about 492px text inside a 192px pane at 768px). Shared responsive AuthShell and clamped type now fit narrow/intermediate layouts; vertical scrolling is retained. |
| SU-04 / SU-07 | Signup's supplied lines 56/181 were stale after earlier confirmation work. Loading already existed; the success redirect timer still needed removal. Success is explicitly closable, redundant bottom login copy removed, safe automatic-verification reasons exposed. The single Back to Login link was already visible/hittable in tested viewports and remains so; no second link. |
| SU-06 | Gate already existed. Completion subqueries compared the application student identifier with users.id instead of users.student_id. Corrected both login/restore reads and refreshed cached completion after confirmed submission. Completion is derived from the existing application, without a new boolean/schema. |
| SU-08 | Found unbounded AI fetches and an existing manual-verification fallback. Added a 15-second connection/body deadline with the existing null/fallback behavior. Controlled stalled-fetch/body tests pass; a genuine alumni signup with a diploma was not attempted, so the reported production cause and final live behavior remain unverified. |
| SEC-05 | Found the existing nodemailer builder in notification.service.js. Added escaped TRACE-branded, inline-styled table HTML and preserved plain text/SMTP configuration. No mail was sent during this session. |
| ST-01 | Consolidated student request/payment history into one table with All Requests/Payments controls, retaining legacy URLs and their filter behavior during SPA navigation. |
| AD-03 | Forecast's Y-axis used automatic scaling. Card/modal now share zero baseline and a ceiling from the unfiltered forecast maximum plus 20%, rounded to 5 with minimum 5. Filters do not move the scale. Throughput duration KPI remains separate. |
| SET-01 | Sidebar Settings opened the same profile modal. It now opens Appearance; avatar opens Profile; security notifications open Security. Existing theme persistence is reused. |
| SC-07 | Upload inventory: signup proof, student request/payment proof, Window 1 document/intake scan, Finance walk-in/review/deferred OR, and profile avatar. One shared field gives local filename/preview/type/size errors and authenticated stored-file preview/download. Replacement remains limited to existing API authority. Finance OCR runs only on Read Receipt. General frontend limit 10MB, Finance walk-in/review 5MB, avatar 2MB. Signup's server uploader still lacks a size guard; this is documented, not silently claimed fixed. |
| ST-02 | Stale gap: NewRequest already filters the data-driven available_to values for students/alumni. Synthetic student-only/alumni-only/both options verified. No hardcoded role lists or schema change; live reference mapping still needs the group's audit. |
| SC-08 | Added role-aware Help / FAQ using native keyboard-accessible disclosure controls and existing user-manual workflows; available to all six roles after existing onboarding gates. |

### Auth dependency discovered during implementation

- Existing auth code referenced failed-login/lockout/token-version/pending-email/OTP columns missing from repository schema/migrations. The approved **read-only metadata query** found those original columns already present in the configured database. No account values were queried or changed; the DDL omission affects fresh/reproducible installations, not proof that the configured database lacked them.
- Explicitly approved migration reconciles those columns idempotently and adds independent `login_otp`/`login_otp_expires`; email changes retain `email_otp`/expiry and use `E:<six digits>` to reject legacy shared challenges. Code generation uses cryptographic randomness. Null/invalid/expired challenges fail. Login generation/clearing cannot overwrite a pending email code.
- Apply `node backend/database/migrate_batch8.js` only during the reviewed rollout in `ENV_SETUP_GUIDE.md`; it has **not been run here**. Old login/email challenges require a fresh login or a new email-change request after rollout. JWT sessions/routes remain on the existing system.

### Validation and remaining acceptance

- Baseline: **448 backend tests** and **298 frontend tests**, all passing. Final: **492 backend tests** and **321 frontend tests**, all passing. Auth boundary/expiry/slot isolation, migration duplicate handling, OCR timeouts/confidence, admin whitelist/ownership permissions, local-file staging, profile email caching, viewport pagination, legacy History navigation, review confirmations, and repeat notification navigation have regression coverage.
- Production frontend build and `git diff --check` pass. ESLint retains **17 pre-existing errors and 3 warnings**, down from 21/3; saved-baseline comparison finds **no new diagnostics**. The existing large-bundle/local-storage warnings remain. This is not a clean-lint claim.
- Headless Brave on macOS/M1, intercepted synthetic API responses: **95 passing observations**, including repeated Reports geometry observations. All six roles at 320/1280px in light/dark themes; tracker at 320/375/768/1280px; auth screens at those widths with 600px height. No tested dashboard/modal horizontal overflow or runtime exception. Mobile inputs measured 16px; snake connectors reach final-node centers within 1px; page-two Reports columns stay stable; History, Accounts, Help, registration review, and Security notification destinations render.
- Temporary JSON evidence: `/private/tmp/trace-batch8-before-backend.json`, `trace-batch8-before-frontend.json`, `trace-batch8-back-final.json`, `trace-batch8-front-final.json`, `trace-batch8-lint-final.json`, `trace-batch8-browser-after.json`. These are machine-local artifacts, not committed test fixtures.
- Current synthetic screenshots: `/private/tmp/trace-batch8-tracker-light-320.png`, `trace-batch8-tracker-light-1280.png`, dark equivalents, `trace-batch8-login-320.png`, `trace-batch8-signup-320.png`, and `trace-batch8-reports-page2.png`. The earlier favicon capture shows the Vite mark. Original before screenshots remain unavailable; no matched historical pairs are claimed.
- Unexpected intermediate failures were investigated: OCR regression files needed the existing multer fieldname; cleared native file inputs required tests to inspect the staged filename/payload; viewport fake-timer cleanup needed unmount before restoring globals; the Finance receipt label query matched both its region and input and was narrowed to the input. The full frontend run also exposed a post-save graduate profile-refresh failure being reported as a failed submission; the approved hook now retains success with refresh guidance, covered for successful and failed refreshes. A review caught accidental AI-helper recursion; it was corrected to fetch plus bounded response parsing, and targeted/full tests pass. Early animated connector sampling was corrected by waiting for completion.
- **Still pending:** physical phone/Safari/PWA behavior; live migration and MySQL device uniqueness; real first/known/new-browser cookie persistence; SMTP/bell delivery; actual alumni diploma signup/OCR confidence; live graduate-completion state; group-approved reference document mapping; genuine reporting/payment/upload integration. Synthetic browser checks and mocked model tests do not establish production acceptance.
- **Separate existing findings preserved:** Admin Security references an unimported AdminSecurityPanel; Templates navigation has no render branch and retains existing hook lint; non-admin Reports hooks remain admin-only; student Print Payment Slip lacks its render branch; mock camera/scanner lacks a real reachable File capture; extended student_profiles fields are not selected by profile reads; PWA icon assets are missing; malformed request-group concerns remain from earlier batches. These were not absorbed into Batch 8 without a scope decision.

### Exact changed-file manifest

Every path below is relative to the repository root. Shared text-field changes listed as input limits are intentionally limited to the approved AC-03 policy.

| Exact path | Change |
| --- | --- |
| `backend/database/migrate_batch8.js` | Explicit idempotent deployment migration; no automatic execution or record rewrites. |
| `backend/database/schema.sql` | Add reproducible auth columns, separate login OTP slots, recognition-device table, notification action URL. |
| `backend/src/controllers/auth.controller.js` | Complete existing auth route adapters and recognize browsers only after full authentication. |
| `backend/src/controllers/maintenance.controller.js` | Adapter for approved admin account-profile editing. |
| `backend/src/models/notification.model.js` | Persist nullable notification action URLs. |
| `backend/src/models/user.model.js` | Correct completion joins, expose supported account/pending-email data, isolate login OTP writes, locate active admins. |
| `backend/src/models/userDevice.model.js` | Unique hashed per-user browser records and last-seen updates. |
| `backend/src/routes/maintenance.routes.js` | Admin-only account-profile update endpoint. |
| `backend/src/services/__tests__/aiEngine.service.test.cjs` | Timeout, stalled body, error and fallback cases. |
| `backend/src/services/__tests__/auth.service.test.cjs` | Regressions for safe/complete OTP login, email commitment, purpose isolation and expiry. |
| `backend/src/services/__tests__/batch8.auth-boundary.test.cjs` | Full-auth-only recognition, completion joins, unique-device SQL, OTP SQL isolation and safe migration failures. |
| `backend/src/services/__tests__/deviceLogin.service.test.cjs` | Known/new/malformed cookie, failure and HTTP/HTTPS cookie behavior. |
| `backend/src/services/__tests__/documents.service.test.cjs` | Nested zero/fractional/missing confidence regressions. |
| `backend/src/services/__tests__/maintenance.service.test.cjs` | Admin authority, immutable identifiers, supported-field validation and privilege exclusion. |
| `backend/src/services/__tests__/notification.service.test.cjs` | TRACE/plain-text email and HTML escaping regression. |
| `backend/src/services/aiEngine.service.js` | Bound fetch/body parsing to 15 seconds with existing best-effort fallback. |
| `backend/src/services/auth.service.js` | Safe public login DTO, OTP/controller dependencies, email verification, pending-registration notices/reasons, isolated purpose-bound OTPs. |
| `backend/src/services/deviceLogin.service.js` | Recognition cookie/hash, metadata, first/new-browser bell/email alerts, fail-soft notification behavior. |
| `backend/src/services/documents.service.js` | Read actual nested finite OCR confidence, preserve zero/fractions and null absence. |
| `backend/src/services/maintenance.service.js` | Validate admin-only supported profile fields and immutable IDs; preserve staff permissions. |
| `backend/src/services/notification.service.js` | Action URL/realtime ID propagation and escaped TRACE-branded HTML emails. |
| `docs/BACKEND_GUIDE.md` | Approved API/DTO, notifications, auth/migration/OCR dependencies and limits. |
| `docs/CODING_PREFERENCES.md` | Input/upload/pagination/status/forecast/FAQ maintenance conventions. |
| `docs/ENV_SETUP_GUIDE.md` | Explicit unapplied migration, paired rollout, fresh OTP and live cookie/mail/OCR acceptance. |
| `docs/PROGRESS.md` | Per-item re-verification, exact manifest, approvals, evidence, corrections and pending acceptance. |
| `docs/SYSTEM_WORKFLOWS.md` | Merged Accounts and current auth, recognition, alumni, history, upload and help workflows. |
| `docs/USER_MANUAL.md` | User-facing registration, account, desk, export, upload, notification, History and Help instructions. |
| `frontend/public/favicon.svg` | Replace Vite favicon with approved green TRACE T. |
| `frontend/src/components/AuthShell.jsx` | TRACE with PLP crest and responsive clamped heading. |
| `frontend/src/components/ConfirmDialog.jsx` | Allow release proof/info content while reusing existing confirmation shell. |
| `frontend/src/components/DocumentChat.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/components/FileUploadField.jsx` | Shared controlled local/stored file feedback, validation, previews/download and object-URL cleanup. |
| `frontend/src/components/ForcePasswordChange.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/components/ProfileSettingsModal.jsx` | Appearance entry, pending-email code confirmation, shared avatar upload feedback and field limits. |
| `frontend/src/components/__tests__/FileUploadField.test.jsx` | Local replacement/cleanup, size/type failure and stored-file read-only feedback regressions. |
| `frontend/src/features/__tests__/admin.category2.render.test.jsx` | Merged Accounts/exports expectations; decision confirmation and repeated SPA notification review regressions. |
| `frontend/src/features/__tests__/finance.deferred-or.test.jsx` | Controlled staged uploads; explicit OCR and confirmed counter-payment payload regression. |
| `frontend/src/features/__tests__/pipeline.queues.render.test.jsx` | One Window 1 queue at a time; legacy History route/filter regression. |
| `frontend/src/features/admin/AdminDashboard.jsx` | Maintenance alias, applicant review/type, shared forecast scale, stable tracker columns/status treatment. |
| `frontend/src/features/admin/components/AccountVerificationModal.jsx` | One review pane with Verify/Reject decisions and nested shared confirmation. |
| `frontend/src/features/admin/components/AddUserModal.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/features/admin/components/AdminTemplatesPanel.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/features/admin/components/ForecastModal.jsx` | Use shared padded forecast ceiling. |
| `frontend/src/features/admin/components/MaintenancePanel.jsx` | Merge all account cards into Maintenance Accounts. |
| `frontend/src/features/admin/components/ReportsPanel.jsx` | Readable timestamps/pesos, stable columns, consolidated export control and measured pagination. |
| `frontend/src/features/admin/components/UserDetailModal.jsx` | Supported college/program/contact details and student editing; staff-only activation retained. |
| `frontend/src/features/admin/components/UserEditModal.jsx` | Supported fields for all account identities, read-only IDs, existing staff password authority and limits. |
| `frontend/src/features/admin/components/UserGrid.jsx` | Allow account editing for student/alumni without granting activation. |
| `frontend/src/features/admin/useAdminDashboard.js` | Notification-driven review/reopen and measured tracker pagination. |
| `frontend/src/features/admin/useMaintenance.js` | Load accounts and route supported profile edits/password changes through their approved endpoints. |
| `frontend/src/features/admin/useReports.js` | Measured report page size using existing report contract. |
| `frontend/src/features/finance/FinanceDashboard.jsx` | Wire the existing controlled receipt setter into the walk-in form. |
| `frontend/src/features/finance/components/DeferredOrUploadModal.jsx` | Shared staged upload feedback; preserve deferred OR workflow. |
| `frontend/src/features/finance/components/FinanceVerificationModal.jsx` | Shared optional receipt-copy feedback and existing confirmed verification. |
| `frontend/src/features/finance/components/WalkInPaymentModal.jsx` | Local receipt selection and explicit Read Receipt control, limits and 5MB validation. |
| `frontend/src/features/finance/useFinanceDashboard.js` | Expose local receipt selection independently of OCR and reset its confidence. |
| `frontend/src/features/graduate/GraduateApplication.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/features/graduate/components/GradApplicationReviewPanel.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/features/graduate/useGraduateApplication.js` | Refresh/announce completion after confirmed successful submission; retain saved success if profile refresh fails. |
| `frontend/src/features/secretary/components/SecretaryEvaluationModal.jsx` | Reference-driven actual document type, valid zero confidence/unavailable display and limits. |
| `frontend/src/features/student/StudentDashboard.jsx` | Unified History/legacy route filters, shared local payment upload and legacy status treatment. |
| `frontend/src/features/student/components/LiveTrackingModal.jsx` | PIPELINE-derived mobile snake/desktop nodes, measured connectors and closed legacy records. |
| `frontend/src/features/student/components/NewRequestModal.jsx` | Shared local attachment feedback and input limits; existing role filtering preserved. |
| `frontend/src/features/student/useStudentDashboard.js` | Derive tracker stage progress from PIPELINE rather than a duplicate list. |
| `frontend/src/features/window1/Window1Dashboard.jsx` | 320px upload card, shared Intake/Release tabs, measured tables, release preview/info and local upload feedback. |
| `frontend/src/features/window1/components/IntakeReviewModal.jsx` | Shared required-only upload field, real confidence display and limits. |
| `frontend/src/features/window1/components/ManualInputModal.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/features/window1/useWindow1Dashboard.js` | Measure existing intake/release/tracking pagination with active-table guards. |
| `frontend/src/hooks/__tests__/useAuth.batch8.test.jsx` | Challenge is not an authenticated session; fresh profile cache and graduate post-save refresh/failure regressions. |
| `frontend/src/hooks/__tests__/useProfileSettings.test.jsx` | Pending email not committed optimistically; verified fresh email persists in cache. |
| `frontend/src/hooks/__tests__/useViewportPagination.test.jsx` | Resize capacity/first-row preservation and disabled-table cleanup. |
| `frontend/src/hooks/useAuth.js` | Return incomplete OTP challenge without caching; synchronize updated cached users. |
| `frontend/src/hooks/useProfileSettings.js` | Stage avatar, keep pending email separate, verify then refresh persistent profile/cache. |
| `frontend/src/hooks/useViewportPagination.js` | Measured conservative row capacity, stable first-row position, observer/RAF cleanup. |
| `frontend/src/layouts/Layout.jsx` | Separate profile/appearance/security entries and internal notification navigation with popup dismissal. |
| `frontend/src/layouts/SidebarNav.jsx` | Help book icon using existing icon mechanism. |
| `frontend/src/layouts/__tests__/Layout.test.jsx` | Appearance-entry expectations preserving drawer/logout keyboard regressions. |
| `frontend/src/layouts/__tests__/SidebarNav.test.jsx` | Merged History/Accounts/Help navigation expectations. |
| `frontend/src/pages/DashboardPage.jsx` | Role Help routing and notification review navigation inputs; existing alumni gate retained. |
| `frontend/src/pages/ForgotPasswordPage.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/pages/HelpPage.jsx` | Role-aware accessible manual/FAQ disclosures. |
| `frontend/src/pages/LoginPage.jsx` | Responsive shared auth shell, complete OTP response/caching and exact code-length control. |
| `frontend/src/pages/ResetPasswordPage.jsx` | Apply approved AC-03 text limits; existing workflow retained. |
| `frontend/src/pages/SignupPage.jsx` | Local proof feedback, explicit success close, safe verification reason and removal of redirect/redundant login copy. |
| `frontend/src/pages/__tests__/submission.confirmations.test.jsx` | Assert controlled signup proof remains staged after cancelling confirmation. |
| `frontend/src/services/api.js` | Send recognition-cookie credentials; invalid OTP codes do not trigger global logout redirect. |
| `frontend/src/services/authService.js` | Existing OTP/email verification client adapters. |
| `frontend/src/services/maintenanceService.js` | Approved account-profile edit client adapter. |
| `frontend/src/utils/__tests__/batch8.presentation.test.js` | Forecast/timestamp/legacy-status/input-policy regressions. |
| `frontend/src/utils/documentStatus.js` | Explicit legacy progress, shared closed-status/tone helpers; pipeline unchanged. |
| `frontend/src/utils/forecastScale.js` | Shared forecast ceiling with headroom/minimum scale. |
| `frontend/src/utils/formatters.js` | Readable full Philippine-time timestamp helper. |
| `frontend/src/utils/inputLimits.js` | Approved central text-field limit policy. |
| `frontend/src/utils/navigation.js` | Merged History/Accounts navigation and shared Help destination. |
| `frontend/src/utils/userLabels.js` | Human applicant-type labels for student/alumni. |


## Batch 8b — Account, Admin, and Workflow (2026-09-30)

Implemented against `dev` at `e420246` after the approved exact-file plan and narrowly scoped backend exceptions. Root `AGENTS.md` already exists and remains unchanged. No commit, push, deployment, real account creation, or database migration was performed.

### Re-verification and resulting behavior

| Item | Finding and outcome |
| --- | --- |
| AC-04 | Appearance already existed but shared profile layout. Preferences is now appearance-only; avatar opens Edit Profile. |
| AC-05 | Existing status tones remain; edit/profile/OCR links use blue, primary/approval/totals green, destructive/error red, warnings amber. Labels/focus/confirmations remain. |
| SEC-06 | Inline protected previews already exist in account, intake, Secretary evaluation, Finance payment and OR verification. Reused rather than rebuilding; graduate review has form answers, not an attachment schema. |
| WI-13 | Role navigation and backend report/export permissions already existed. Shared ReportsPanel/useReports now render/load for Window 1 and Secretary. |
| SEC-17 | Shared feedback/bell dismiss on navigation or hidden browser tab; queue/maintenance/security keys dismiss internal-tab feedback. Draft/decision modals are retained. |
| SU-09/SU-10 | An unsafe unused extract-id endpoint already existed. Replaced its internals with bounded temporary OCR, explicit Read ID, structured identity parsing and blank-only autofill. New alumni use Alumni ID; existing login IDs remain unchanged. |
| AC-06 | Registration proof was already saved. Surface it through existing authenticated preview/download in Edit Profile and staff profile. No replacement permission added. |
| AD-04 | Policy columns existed in UI/model expectations, but schema placed them on colleges and INSERT bindings were wrong. Repair DDL, migration/model/save; configure student/alumni/both and enforce server-side. |
| AD-05 | Partial name/profile links existed. Add full projection and authorized staff boundary, then links across tracker, queues, transactions, reports and graduate applications. |
| AD-06 | Users already had college_id support, but signup did not save it. Validate/store selected college; byte-exact legacy backfill only; unknown mappings get an Admin-review warning. Configure allowed-college junction rows and enforce target student's college. |
| DOC-01 | Repeat rules were incomplete and backend silently forced copies=1. Enforce single active/completed HD with a target-user lock; permit cancellation/legacy-rejection retry. Restore quantities and estimated pricing for repeatable types. |
| DOC-02 | Four absent counter types added as inactive zero-fee drafts, with original inspection disabled. Fees remain Admin-editable. Photocopy requirement awaits user decision; no guessed enforcement. |
| DOC-03 | Existing chat is text-only. User placed case attachment requests/student messaging uploads/processing hold in later communication batches. Deferred; no invented attachment route or pipeline stage. |

### Corrections, approvals and limits

The original notes understated existing report navigation/permissions, identity-proof storage, inline verification previews and policy UI. These were extended, not rebuilt. The schema's college-owned policy columns, malformed document-type insert, omitted signup college write, and backend quantity collapse were confirmed implementation gaps. Existing Secretary Reject returns to Intake; it is **not** terminal cancellation/rejection for repeat policy. Raw attached counter scans can be staged for human review without an ID; restricted requests cannot pass Secretary evaluation without eligible identity.

Additional explicit approvals cover backend policy/OCR/profile exceptions; `backend/vitest.config.mjs` to discover migration tests; backend pricing/helper tests; and `frontend/src/features/__tests__/modal.footers.test.jsx` to supply configured document options while retaining keyboard/native validation checks. Additional exact-file approval covers HelpPage and CODING_PREFERENCES to synchronize FAQ labels, policy guidance, signup server guards and feedback dismissal.

Unrelated findings left unchanged: current lint failures include undefined `AdminSecurityPanel`, unused imports/tutorial state and existing hook diagnostics. ProfileSettingsModal's legacy isStudent predicate also classifies staff with user_type=student as needing student educational fields. Manual-entry's hardcoded program dropdown may not match a fetched legacy college-name course. Existing AI forecasting still imports/queries MySQL; identity OCR adds no DB access. These require separate scope.

### Verification evidence

- Baseline: backend **492**, frontend **321** tests passed before edits.
- After: backend **527**, frontend **342** tests passed. Parser **4/4** passed via `ai-engine/.venv/bin/python -m unittest discover -s ai-engine -p test_identity_parser.py`. Frontend production/PWA build passed; existing bundle-size warning remains.
- Lint: **12 errors / 3 warnings**, all diagnostic messages present in the previous Batch 8 report (**17 / 3**); no new lint diagnostics. This is not a clean lint claim.
- Regressions cover authorization/projection, temporary cleanup/type/size guard/timeout, exact college mapping, SQL bindings/idempotency/error propagation, transactional policy rollback, target-user lock, forged policies/quantities, stale responses, confirmed policy payloads, role reports, local OCR, notification dismissal and draft preservation.
- Brave: **72/72 synthetic API checks**, light/dark at 320 and 1280 px, all six roles' profile/preferences; both desks' reports/full profiles; Admin confirmed policy saves; route feedback dismissal; new-alumni OCR. Screenshot inspection confirmed readable/pinned modal layout. Fixtures, not live MySQL or real OCR. Harness selector mistakes and an incomplete report-summary fixture were corrected; application code was not changed to accommodate them.
- Temporary artifacts: `/private/tmp/trace-batch8b-browser.json`, `trace-batch8b-*-final.json`, `trace-batch8b-lint.json`; screenshots `trace-batch8b-admin-policy.png`, `trace-batch8b-secretary-profile-{light,dark}.png`, `trace-batch8b-alumni-ocr-{light,dark}.png`. Existing Batch 8 signup screenshot can be compared, but original pre-revision screenshots remain unavailable.
- Pending acceptance: live migration/FKs/atomic writes/concurrent repeat attempts, real OCR/registration/protected proof delivery, and physical phone. PDF upload can fall back to manual input because current OCR decoding may not support it. DOC-02 photocopy decision and DOC-03 future messaging are not complete acceptance.

### Files changed

| Exact path | Change |
| --- | --- |
| `ai-engine/app.py` | Expose temporary-upload identity OCR over HTTP; add WebP to existing extensions. |
| `ai-engine/identity_parser.py` | Conservative labeled Student/Alumni ID, name and college extraction. |
| `ai-engine/ocr_engine.py` | Parse identity fields with manual fallback; no database access added. |
| `ai-engine/test_identity_parser.py` | Four pure parser regressions. |
| `backend/database/__tests__/migrate_8b.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/database/migrate_8b.js` | Explicit, import-safe policy/junction/FK reconciliation, exact backfill and inactive drafts. |
| `backend/database/migration.js` | Invoke the idempotent 8b migration from the existing manual migration command. |
| `backend/database/schema.sql` | Create colleges before user FK; place policy columns on document types. |
| `backend/src/controllers/ai.controller.js` | Controller adapter for signup identity OCR. |
| `backend/src/controllers/auth.controller.js` | Pass the authenticated caller to the full-profile service. |
| `backend/src/controllers/referenceData.controller.js` | Pass the caller for student-specific reference eligibility. |
| `backend/src/middlewares/rateLimit.middleware.js` | Limit public signup OCR to 20 requests/hour/IP. |
| `backend/src/middlewares/upload.middleware.js` | 10 MB/type guards for signup proof and temporary OCR; random temp filenames. |
| `backend/src/models/__tests__/referenceData.model.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/src/models/document.model.js` | Count blocking prior requests, excluding terminal rejection and current record. |
| `backend/src/models/referenceData.model.js` | Correct policy SQL bindings; persist and read allowed-college junction rows. |
| `backend/src/models/user.model.js` | Save college ID; explicit full-profile projection, policy user lock and college-aware routing reads. |
| `backend/src/routes/ai.routes.js` | Reuse existing extract-id route with bounded uploads, rate limit and controller. |
| `backend/src/routes/auth.routes.js` | Add staff-role middleware on student-profile lookup. |
| `backend/src/services/__tests__/aiEngine.service.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/src/services/__tests__/auth.service.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/src/services/__tests__/documentPolicy.service.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/src/services/__tests__/documents.service.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/src/services/__tests__/maintenance.service.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/src/services/__tests__/signupOcr.service.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/src/services/aiEngine.service.js` | Bounded structured identity endpoint adapter with null fallback. |
| `backend/src/services/auth.service.js` | New-alumni login identifier/college persistence and desk-authorized full-profile read. |
| `backend/src/services/documentPolicy.service.js` | Shared target-applicant/college/counter/repeat policy, quantity guard and user lock. |
| `backend/src/services/documents.service.js` | Validate/preserve quantities, enforce policy during filing and approval, prefer college routing IDs. |
| `backend/src/services/maintenance.service.js` | Validate policy inputs and save settings/restrictions atomically; protect HD exception. |
| `backend/src/services/referenceData.service.js` | Expose normalized policy flags and student eligibility reasons. |
| `backend/src/services/signupOcr.service.js` | Allowlisted bounded extraction, exact college mapping and finally cleanup. |
| `backend/src/utils/__tests__/pricing.test.cjs` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `backend/src/utils/pricing.js` | Preserve copies and multiply estimates to match the frontend. |
| `backend/vitest.config.mjs` | Discover database migration regression tests alongside source tests. |
| `docs/BACKEND_GUIDE.md` | Policy/OCR/profile contracts and security/rollback behavior. |
| `docs/ENV_SETUP_GUIDE.md` | Explicit unapplied migration and paired backend/frontend/AI rollout checks. |
| `docs/SYSTEM_WORKFLOWS.md` | Server policy/lock/retry rules, identity routing, staff access and deferred attachments. |
| `docs/USER_MANUAL.md` | Current account, OCR, reports/profile, policy, quantity and notification instructions. |
| `frontend/src/App.jsx` | Announce SPA navigation to notification-dismissal subscribers. |
| `frontend/src/components/DashboardAlerts.jsx` | Dismiss feedback on navigation/browser/internal tab changes. |
| `frontend/src/components/ProfileSettingsModal.jsx` | Separate Preferences from Edit Profile; expose stored proof read-only. |
| `frontend/src/components/StudentProfileModal.jsx` | Render full saved profile with loading/error states via shared hook. |
| `frontend/src/components/__tests__/DashboardAlerts.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/components/__tests__/ProfileSettingsModal.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/features/__tests__/admin.category2.render.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/features/__tests__/batch8b.workflow.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/features/__tests__/modal.footers.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/features/admin/AdminDashboard.jsx` | Open full profile from tracker names. |
| `frontend/src/features/admin/components/MaintenancePanel.jsx` | Edit fees/policies/colleges with confirmation, draft warning and action colors. |
| `frontend/src/features/admin/components/ReportsPanel.jsx` | Open full profile from report names. |
| `frontend/src/features/admin/components/UserDetailModal.jsx` | Complete personal/educational fields, proof, college warning and read-only staff view. |
| `frontend/src/features/admin/useReports.js` | Enable existing reports for Window 1 and Secretary. |
| `frontend/src/features/finance/FinanceDashboard.jsx` | Profile links including transactions; queue-tab feedback dismissal. |
| `frontend/src/features/graduate/components/GradApplicationReviewPanel.jsx` | Applicant profile links and review-tab feedback dismissal. |
| `frontend/src/features/secretary/SecretaryDashboard.jsx` | Render shared reports, profile links and queue-tab dismissal. |
| `frontend/src/features/student/components/NewRequestModal.jsx` | Audience/counter filtering, visible blocked reasons and quantity controls. |
| `frontend/src/features/student/useStudentDashboard.js` | Refresh eligibility after filing/cancellation; close saved confirmation before the read to prevent duplicate submission. |
| `frontend/src/features/window1/Window1Dashboard.jsx` | Render shared reports and configured counter types; profile links and tab dismissal. |
| `frontend/src/features/window1/components/IntakeReviewModal.jsx` | Use reference attachment requirement; wait for rule loading. |
| `frontend/src/features/window1/components/ManualInputModal.jsx` | Configured counter document options and controlled selection. |
| `frontend/src/features/window1/useWindow1Dashboard.js` | Fetch configured document rules for counter filing/intake. |
| `frontend/src/hooks/__tests__/useNotificationDismissal.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/hooks/__tests__/useSignupOcr.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/hooks/__tests__/useStudentProfile.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/hooks/useNotificationDismissal.js` | Shared navigation/visibility/key dismissal with listener cleanup. |
| `frontend/src/hooks/useSignupOcr.js` | Abort/discard stale extraction and expose manual fallback. |
| `frontend/src/hooks/useStudentProfile.js` | Abort stale person lookups and expose full-profile loading/errors. |
| `frontend/src/layouts/Layout.jsx` | Edit Profile avatar label/personal entry and bell auto-dismissal. |
| `frontend/src/layouts/SidebarNav.jsx` | Rename appearance destination to Preferences. |
| `frontend/src/layouts/__tests__/Layout.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/layouts/__tests__/SidebarNav.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/pages/LoginPage.jsx` | Include Alumni ID in login identifier label. |
| `frontend/src/pages/SignupPage.jsx` | Explicit advisory OCR, blank-only autofill, new-alumni ID, college ID and role-change reset. |
| `frontend/src/pages/__tests__/submission.confirmations.test.jsx` | Regression coverage for the policy, security, confirmed payload or current UI behavior in this file. |
| `frontend/src/services/authService.js` | Encode profile identifiers, support cancellation and signup OCR service call. |
| `frontend/src/pages/HelpPage.jsx` | Synchronize Preferences/Edit Profile, OCR/IDs, reports, profile and document-policy guidance. |
| `docs/CODING_PREFERENCES.md` | Current server upload guard, feedback dismissal, identity/profile and policy conventions. |
