# Consolidated deployment checklist — Revision 2

Updated with each completed batch. This tracks the **newer fixes guide**, not the earlier numbered migrations. The five follow-up migrations were applied to an isolated local test database on 2026-10-12. The user’s cloud SSH output confirms all five scripts and final schema check passed on the same date. The agent did not access SSH. The user subsequently confirmed internal backend health and database ok; no main merge or frontend release is recorded.

## Migration ledger

| Revision 2 batch | New migration | Prerequisites | Status / preserving behavior |
| --- | --- | --- | --- |
| 7 — Alumni / Request Forms | `backend/database/migrate_alumni_study_years.js` | Existing users/student profiles; `migrate_student_profiles.js`, `migrate_graduation_year.js` | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Adds study-year confirmation, proof-review markers and audit tables; preserves graduation, attendance and request history. |
| 8 — Intake / Staff Scope | `backend/database/migrate_request_intake_scope.js` | Existing documents; `migrate_request_attachments.js`, `migrate_support_requirements.js` and their ticket/catalog prerequisites | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Adds nullable routing-college snapshots and `blocks_intake` default false; no historical backfill/reclassification. |
| 9 — Reports & Export | **None** | Batch 8 routing columns plus existing fee-schedule and Finance receipt/payment-method columns | API/frontend changes only. Uses existing reference catalogs, receipt fields and pricing snapshots. Deploy the matching API/frontend together. |
| 10 — Support / Messaging UI | **None** | Existing support tickets, archive/requirements/catalog and Batch 8 intake scope | Frontend-only presentation changes; existing ticket/desk/college permissions remain. |
| 11 — Support Analytics | **None** | Existing support reports and ticket audit/calendar history | Frontend-only KPI/table presentation. Report formulas, cohorts, role authorization and AI inputs are unchanged. |
| 12 — Finance Receipts | `backend/database/migrate_receipt_packs.js` | Existing grouped documents/payment/OR columns from `migrate_finance_receipts.js`; Batch 8 scope and assignment support | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Creates InnoDB pack/control/reservation/issued-snapshot/audit tables and an empty control row; adds a full leading OR-number index when missing. Preserves historical ORs; activates no pack and rewrites no payments. Matching API/frontend required. |
| 13 — Internal Assistance | `backend/database/migrate_internal_assistance.js` | Existing users and active desk/Admin accounts; existing support schema remains separate | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Creates three empty InnoDB internal ticket/message/event tables; imports no student tickets or attachments. Matching API/frontend required; Admin operational support becomes read-only. |
| Additional chat connections — TRACE-78 follow-up | `backend/database/migrate_staff_conversations.js` | Existing users/colleges, supported active desk accounts; separate support/internal prerequisites for their existing categories | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Creates three empty InnoDB staff conversation/message/retry-event tables with pair uniqueness; imports no student/internal messages or files. Deploy matching API/frontend. |

| Finance workflow follow-up — 2026-10-12 | `backend/database/migrate_student_name_parts.js` | Existing users/student profiles; the five earlier follow-up migrations remain applied | Prepared; NOT applied to cloud or tested on MySQL in this disconnected session. Adds nullable first/middle/last profile fields, preserving existing Full Name, requests and issued receipt snapshots. No guessed backfill, reseed or new table. Matching API/frontend required. |

The cross-batch integration follow-up adds **no migration or environment variable**. Deploy the matching API/frontend to include routing-college chat scope, access-cache clearing, reactive notification links and consistent Receiving Desk authority. On staging, change a student’s profile college after routing, confirm old/new Secretary access, revoke staff access, follow two notification links on an open screen, and verify assignment enforcement between Window 1 and Receiving Desk.

The earlier `migrate_batch8.js` is a different historical base migration. It is **not** the Revision 2 Batch 8 migration above. Existing databases need preserving migration scripts, not a fresh schema or seed import.

## Local test application — 2026-10-12

The five original follow-up scripts were applied, in the listed order, through their actual Node CLIs against
`trace_staging_test_20261012` on isolated local MySQL 8.0.46, using code commit
`281179fdf1f8ce757023a85065a1449b5a931280`. The target was a new synthetic database prepared with
all earlier schema prerequisites; it was not a copy of the live database or an existing cloud
staging service. Before mutation, preflight reported only fields belonging to these five scripts.
A logical baseline backup was restored into the separate `trace_staging_restore_20261012`
database; schema and records matched across all **41** baseline tables.

All five CLIs exited successfully and the final read-only `check_schema.js` passed with **zero
missing fields**. The test now has **54** tables, including all thirteen new InnoDB tables.
Every pre-existing record retained its original values, including synthetic graduation/attendance
years, saved fees, historical OR and clearance. New routing/study-year values remain nullable,
historical clearance remains nonblocking, and the leading full OR-number index exists. Receipt
control has one empty row; no pack, receipt, ticket, conversation or audit was imported/activated
by migration. The local server was shut down cleanly and its test data retained for follow-up
checks in this workspace. No application, Docker stack or cloud service was deployed.

## Cloud migrations and internal backend health confirmed — 2026-10-12

The user's SSH output from the cloud host confirms database `trace_db`, a preflight listing only
these five follow-ups, successful completion of all five actual migration CLIs in order, and
`Schema presence check passed.` No additional migration was indicated by that earlier version of the check. The later Finance name-field change below adds a new pending migration.
This is user-provided execution evidence, not a direct database inspection by the agent; full
schema/data compatibility and workflow acceptance are separate checks.

The backend was recreated and AI/n8n restarted. The initial curl ran while health was starting
and could not yet connect. A subsequent user-provided internal /api/health response at
2026-10-12T03:33:42.643Z confirmed status ok and database ok. Backend/database readiness is now
confirmed; public HTTPS, AI/provider behavior and full workflow acceptance remain separate. Do
not rerun migrations for this startup timing. The production alumni missing-proof follow-up uses
existing applied schema and needs only a matching backend/frontend rebuild, with no new migration.

The agent has no SSH connection to the server. The user waived mandatory backups for the current
early test rollout because the system has no major data yet; the completed local restore check
creates no additional user task. No main merge, matching frontend publication or complete cloud
workflow acceptance is recorded.

## Local readiness evidence — 2026-10-11

An isolated MySQL 8.0.46 rehearsal passed **11 checks**: fresh-schema preflight, incremental
application of all five new scripts after removing only their objects from a prerequisite-complete
synthetic baseline, preserved historical accounts/years/fees/ORs/requirements, nonblocking new
defaults and an empty Finance control. Two reruns preserved all thirteen populated new tables,
including print configuration and audits. Real service calls verified concurrent opposite-direction
staff creation produces one thread, replay adds no duplicate, Admin reads without writing, and
linked-support SQL follows the saved routing college after a profile change (cancelled history
uses its authorized profile fallback). These checks do not inspect or migrate the live database,
prove compatibility with every historical schema variant, or replace backup/restore and staging
acceptance. All five production migrations remain unapplied by this work.

The optional Docker frontend previously served SPA HTML for API paths and could not forward
Socket.IO. Its Nginx configuration now proxies both to the Compose backend. **11 real Nginx checks**
passed for syntax, request/auth/query/body forwarding, multipart upload, private response/error
headers, API 404 behavior, SPA deep links, asset caching, WebSocket and polling-to-WebSocket upgrade.
Rebuild the optional frontend image and verify the actual container stack on staging; Docker
containers and live infrastructure were not started here. This repair adds no migration or
environment variable and does not change Vercel hosting.

## Before the final deployment

1. Review this ledger again after all requested batches. Pin the tested commit. Work is pushed to `dev`; no merge to main or automatic deployment is included.
2. Confirm the server's already-applied migrations and inspect the read-only schema check. Use the complete **32-script** dependency order in [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md) only to identify missing prerequisites; do not rerun historical data migrations merely for a UI update.
3. For the current early test rollout, the user has waived the backup/restore step because the system has no major data yet. Keep the writer-stop and prerequisite checks. For a later live rollout with important records, use the rollout guide's database/uploads backup and restore steps. Build/use the matching backend image that actually includes the new scripts.
4. These five scripts are confirmed applied on the user’s cloud database as of 2026-10-12. The commands below remain for an installation where they are still missing; do not rerun them just to resolve backend startup. Apply only after earlier prerequisites are confirmed, stopping on any failure:

```bash
docker compose run --rm --no-deps -T backend node database/migrate_alumni_study_years.js
docker compose run --rm --no-deps -T backend node database/migrate_request_intake_scope.js
docker compose run --rm --no-deps -T backend node database/migrate_receipt_packs.js
docker compose run --rm --no-deps -T backend node database/migrate_internal_assistance.js
docker compose run --rm --no-deps -T backend node database/migrate_staff_conversations.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

5. Start the matching backend and publish the matching frontend after successful preflight. Batches 7–13 and the chat-connection follow-up require no new environment variables, AI rebuild or n8n workflow re-import. The production alumni missing-proof follow-up always remains pending Admin identity review; it adds no migration or environment variable and requires the matching API/frontend.
6. On staging, verify staff directory exclusions, same-college Secretary peers, unrelated-user read denial, read-only Admin monitoring, simultaneous opposite-direction pair creation, lost-response retries, changed-college/revoked access, retained history, private notifications and category draft preservation. Then verify creator-only internal concerns, competing Admin claims, stale resolution rejection, awaiting-staff return, retained resolution/reopen history and Admin operational read-only access. Internal notifications stay private to the creator/assigned Admin or the Admin queue. Then verify concurrent cashier issuance, the 50th/51st boundary, lost-response retry, deferred issuance, exact-receipt copy upload, pre-handoff void/replacement and printer alignment on blank paper. Then verify live account/college routing, a flagged clearance through acceptance, same-college staff assignment and physical handoff, then report filters and CSV row counts. Verify expected notifications and actual phone/keyboard behavior separately. Record the applied scripts, commit and acceptance results here when confirmed.

## Walkthrough and rollout references

- [Batch 7](../README.md#main-workflows): alumni saved years, Admin corrections and audited missing-proof identity review.
- [Batch 8](../README.md#main-workflows): clearance, college scope, assignment and shared tabs.
- [Batch 9](../README.md#main-workflows): draft filters, authorized reporting, CSV contract and synthetic sample.
- [Batch 10](../README.md#main-workflows): Figma chat/workspace/evaluation layouts and persistent drafts, with existing ticket permissions.
- [Batch 11](../README.md#main-workflows): support KPI cards, statistical tables, honest missing values and report retry feedback.
- [Finance receipts](../README.md#finance-receipt-walkthrough): configure 50-number packs, final issuance, copy upload, reprint and demo printer calibration.
- [Internal assistance](../README.md#internal-assistance-walkthrough): private staff-to-Admin concerns and retained resolution history. Additional staff coordination is covered by the follow-up below.
- [Environment setup](ENV_SETUP_GUIDE.md) and [preserving rollout](MIGRATION_ROLLOUT.md): deployment commands, prerequisites and limits of schema preflight.

A passing presence check does not prove every index/type, restored backup, production delivery or institutional evidence-policy decision. Recorded unit/browser checks are local verification evidence, not a claim that the live site already runs the update.

- [Staff coordination](../README.md#staff-coordination-walkthrough): recipient connections, pair history, Admin monitoring and draft-preserving categories.


## Admin functional review — no additional migration

The current Admin review changes duplicate navigation/analytics views, truthful scan metric wording,
Admin-managed student/alumni account status, relevant account filters, shared visible report
filters with Student ID / Name search, and readable CSV fee/purpose/date output. It uses existing
status/version/audit/report fields; all five previously confirmed cloud migrations remain complete.
The fresh-install template includes the existing Phase 19 payment_channel column; this adds no
new migration for installed databases.
Deploy matching backend/frontend after the dev update; no AI rebuild, n8n import or new environment
setting is needed. Verify deactivation/restoration with actual accounts, old-session denial, retained
request/history, Secretary scope, complete Finance groups and CSV counts. Cosmetic icon/compact
layout changes are deferred to the user's forthcoming Figma redesign. Main is not merged by this work.


## Admin queue insight / table follow-up — 2026-10-12

**Migration: none.** Deploy matching Node/frontend and rebuild ai-engine for aggregate POST
classification and the new packaged document_insights.py helper. The existing five migrations
remain cloud-applied. No new environment or dependency, OCR model download change or n8n import.
New Node rejects the legacy AI success contract and uses full-stage local counts if the engine
is older/unreachable. Validate processing/payment-only queues, unknown statuses, prototype
labelling, snapshot refresh/failure and wrapped Admin tables before promoting the release.
Dev publication does not perform a main merge, cloud rebuild or deployment.


## Staff assistance navigation — 2026-10-12

**Migration: none.** Frontend-only navigation/routing change: Window 1/Receiving Desk, Finance
and College Secretary open Internal assistance inside Support, matching Admin. Existing ticket
links remain readable in that category. Account gates and all backend ticket permissions remain.
Publish the matching frontend when promoting dev; no backend/AI rebuild or new setting is needed
for this follow-up. React tests/build/browser verification is pending because the coding
environment is disconnected. Main merge and live deployment remain separate.


## Finance name-field rollout — additional migration, 2026-10-12

The five previous follow-up migrations are confirmed cloud-applied. This Finance review adds **one new migration**: `migrate_student_name_parts.js`. Do not rerun the five merely for this update. Existing users/student_profiles remain prerequisites; fields are nullable and no existing name or issued snapshot is rewritten.

After code review and validation, use the intended release checkout/image that includes this script. Pause backend/AI/n8n writers using the existing rollout procedure, build the matching backend image, then run one command at a time and stop on failure:

```bash
docker compose run --rm --no-deps -T backend node database/migrate_student_name_parts.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
```

Start the matching backend/frontend only after schema presence passes. Retain existing database/volume contents and MFA/JWT keys. No new dependency, environment variable, AI image change or n8n re-import is required for this Finance follow-up. The user's waiver of backup for the current early-data rollout remains; this change does not introduce another approval flow.

Verify on staging: students confirm name parts with compound given/surnames and an optional middle name; mismatch is refused and Full Name stays intact. New OR names follow confirmed parts, old receipt reprints preserve their snapshots. Configure/replace an exactly 50-paper range; test stale cashier and exhausted pack, immediate copy vs Later, 3:59/4:00 PM Manila, reprint and later upload. Confirm History has no export/configuration block and Finance's shared reports/CSV are independent.

**Status:** prepared in source, not cloud-applied. Full Vitest/lint/build/browser/MySQL checks cannot run while the coding environment is disconnected. The existing screenshots show older receipt controls; update them through a connected browser before treating them as this review's UI evidence.


## ID-reader reliability follow-up — 2026-10-12

Read ID now uses an identity-specific original-image pass, preserving OCR fragments as lines. When an identifier is found, it skips preprocessing; otherwise a second pass may fill missing fields. Conflicting fallback values remain blank. Label/value pairs, separate name-part labels, same-line explicit fields and spaced Unicode numeric dashes are supported. Unlabelled names are never split or guessed. Only explicitly labelled first/middle/last fields may fill empty signup controls; manual edits are retained.

The backend exposes safe timeout, unavailable, no-text/no-fields and processing categories instead of one generic failure. Identity calls have a 30-second cap; the browser allows 40 seconds including upload/transport. Other AI request deadlines and automatic registration verification are unchanged. Successful reads are reused only in the current form for the same File object/account type; failures stay retryable and selecting another file/type discards stale work. Temporary scans are always deleted and raw OCR text is not returned by the signup API.

Deploy matching frontend/backend/**AI engine** code. Restarting the existing AI container does not replace its image with updated OCR code; build the new AI image from the reviewed release checkout. This follow-up adds no migration, dependency or environment variable. The separately pending Finance `migrate_student_name_parts.js` still must precede the matching backend release.

Available verification: JavaScript services/hook handlers executed with in-memory file/network/React-hook fixtures, plus syntax checks. Native Python/Vitest/build/browser, real JPEG/PNG accuracy, latency and cloud-container verification remain pending because the coding environment is disconnected and no failing ID image was supplied. Focused Python parser/pipeline tests use fake readers and require no EasyOCR model download:

```bash
python3 -m unittest discover -s ai-engine -p 'test_identity*.py'
```

These unit tests verify parsing/conditional passes; they do not establish real image accuracy or a measured speedup. Validate an actual failing photo separately on the rebuilt engine. For cloud diagnostics, health alone does not prove the identity route is installed: a read-only GET to `http://ai-engine:5005/ocr/identity` from backend should return 405 when the POST route exists; 404 means that route is absent in the running image. The agent has not accessed the cloud container.
