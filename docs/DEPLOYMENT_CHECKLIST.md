# Consolidated deployment checklist — Revision 2

Updated with each completed batch. This tracks the **newer fixes guide**, not the earlier numbered migrations. The five follow-up migrations were applied to an isolated local test database on 2026-10-12. The user’s cloud SSH output confirms all five scripts and final schema check passed on the same date. The agent did not access SSH. Backend startup/health remains unconfirmed; no main merge or frontend release is recorded.

## Migration ledger

| Revision 2 batch | New migration | Prerequisites | Status / preserving behavior |
| --- | --- | --- | --- |
| 7 — Alumni / Request Forms | `backend/database/migrate_alumni_study_years.js` | Existing users/student profiles; `migrate_student_profiles.js`, `migrate_graduation_year.js` | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Adds study-year confirmation, proof-review demo markers and audit tables; preserves graduation, attendance and request history. |
| 8 — Intake / Staff Scope | `backend/database/migrate_request_intake_scope.js` | Existing documents; `migrate_request_attachments.js`, `migrate_support_requirements.js` and their ticket/catalog prerequisites | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Adds nullable routing-college snapshots and `blocks_intake` default false; no historical backfill/reclassification. |
| 9 — Reports & Export | **None** | Batch 8 routing columns plus existing fee-schedule and Finance receipt/payment-method columns | API/frontend changes only. Uses existing reference catalogs, receipt fields and pricing snapshots. Deploy the matching API/frontend together. |
| 10 — Support / Messaging UI | **None** | Existing support tickets, archive/requirements/catalog and Batch 8 intake scope | Frontend-only presentation changes; existing ticket/desk/college permissions remain. |
| 11 — Support Analytics | **None** | Existing support reports and ticket audit/calendar history | Frontend-only KPI/table presentation. Report formulas, cohorts, role authorization and AI inputs are unchanged. |
| 12 — Finance Receipts | `backend/database/migrate_receipt_packs.js` | Existing grouped documents/payment/OR columns from `migrate_finance_receipts.js`; Batch 8 scope and assignment support | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Creates InnoDB pack/control/reservation/issued-snapshot/audit tables and an empty control row; adds a full leading OR-number index when missing. Preserves historical ORs; activates no pack and rewrites no payments. Matching API/frontend required. |
| 13 — Internal Assistance | `backend/database/migrate_internal_assistance.js` | Existing users and active desk/Admin accounts; existing support schema remains separate | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Creates three empty InnoDB internal ticket/message/event tables; imports no student tickets or attachments. Matching API/frontend required; Admin operational support becomes read-only. |
| Additional chat connections — TRACE-78 follow-up | `backend/database/migrate_staff_conversations.js` | Existing users/colleges, supported active desk accounts; separate support/internal prerequisites for their existing categories | Local test and cloud applied 2026-10-12 (cloud confirmed by user SSH output). Creates three empty InnoDB staff conversation/message/retry-event tables with pair uniqueness; imports no student/internal messages or files. Deploy matching API/frontend. |

The cross-batch integration follow-up adds **no migration or environment variable**. Deploy the matching API/frontend to include routing-college chat scope, access-cache clearing, reactive notification links and consistent Receiving Desk authority. On staging, change a student’s profile college after routing, confirm old/new Secretary access, revoke staff access, follow two notification links on an open screen, and verify assignment enforcement between Window 1 and Receiving Desk.

The earlier `migrate_batch8.js` is a different historical base migration. It is **not** the Revision 2 Batch 8 migration above. Existing databases need preserving migration scripts, not a fresh schema or seed import.

## Local test application — 2026-10-12

All five scripts above were applied, in the listed order, through their actual Node CLIs against
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

## Cloud application confirmed; runtime health pending — 2026-10-12

The user's SSH output from the cloud host confirms database `trace_db`, a preflight listing only
these five follow-ups, successful completion of all five actual migration CLIs in order, and
`Schema presence check passed.` No additional migration is currently indicated by that check.
This is user-provided execution evidence, not a direct database inspection by the agent; full
schema/data compatibility and workflow acceptance are separate checks.

The backend was recreated and AI/n8n restarted. The immediately following container listing showed
the backend up for two seconds with health starting; its internal curl could not yet connect to
port 3300. This does not establish a startup failure or successful readiness. Retry container
status and internal/public health; if connection still fails, inspect recent backend logs before
main merge/frontend publication. Do not rerun migrations merely for this startup check.

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

5. Start the matching backend and publish the matching frontend after successful preflight. Batches 7–13 and the chat-connection follow-up require no new environment variables, AI rebuild or n8n workflow re-import. Proof-unavailable registration remains disabled in production; do not enable the defense-only path there.
6. On staging, verify staff directory exclusions, same-college Secretary peers, unrelated-user read denial, read-only Admin monitoring, simultaneous opposite-direction pair creation, lost-response retries, changed-college/revoked access, retained history, private notifications and category draft preservation. Then verify creator-only internal concerns, competing Admin claims, stale resolution rejection, awaiting-staff return, retained resolution/reopen history and Admin operational read-only access. Internal notifications stay private to the creator/assigned Admin or the Admin queue. Then verify concurrent cashier issuance, the 50th/51st boundary, lost-response retry, deferred issuance, exact-receipt copy upload, pre-handoff void/replacement and printer alignment on blank paper. Then verify live account/college routing, a flagged clearance through acceptance, same-college staff assignment and physical handoff, then report filters and CSV row counts. Verify expected notifications and actual phone/keyboard behavior separately. Record the applied scripts, commit and acceptance results here when confirmed.

## Walkthrough and rollout references

- [Batch 7](../README.md#main-workflows): alumni saved years, Admin corrections and the isolated identity-review demo.
- [Batch 8](../README.md#main-workflows): clearance, college scope, assignment and shared tabs.
- [Batch 9](../README.md#main-workflows): draft filters, authorized reporting, CSV contract and synthetic sample.
- [Batch 10](../README.md#main-workflows): Figma chat/workspace/evaluation layouts and persistent drafts, with existing ticket permissions.
- [Batch 11](../README.md#main-workflows): support KPI cards, statistical tables, honest missing values and report retry feedback.
- [Finance receipts](../README.md#finance-receipt-walkthrough): configure 50-number packs, final issuance, copy upload, reprint and demo printer calibration.
- [Internal assistance](../README.md#internal-assistance-walkthrough): private staff-to-Admin concerns and retained resolution history. Additional staff coordination is covered by the follow-up below.
- [Environment setup](ENV_SETUP_GUIDE.md) and [preserving rollout](MIGRATION_ROLLOUT.md): deployment commands, prerequisites and limits of schema preflight.

A passing presence check does not prove every index/type, restored backup, production delivery or institutional evidence-policy decision. Recorded unit/browser checks are local verification evidence, not a claim that the live site already runs the update.

- [Staff coordination](../README.md#staff-coordination-walkthrough): recipient connections, pair history, Admin monitoring and draft-preserving categories.
