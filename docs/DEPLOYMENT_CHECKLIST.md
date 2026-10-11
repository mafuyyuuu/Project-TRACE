# Consolidated deployment checklist — Revision 2

Updated with each completed batch. This tracks the **newer fixes guide**, not the earlier numbered migrations. No database migration or production deployment has been performed by the agent during these batches. Confirm actual server state before deciding which scripts are pending.

## Migration ledger

| Revision 2 batch | New migration | Prerequisites | Status / preserving behavior |
| --- | --- | --- | --- |
| 7 — Alumni / Request Forms | `backend/database/migrate_alumni_study_years.js` | Existing users/student profiles; `migrate_student_profiles.js`, `migrate_graduation_year.js` | Not applied by this work. Adds study-year confirmation, proof-review demo markers and audit tables; preserves graduation, attendance and request history. |
| 8 — Intake / Staff Scope | `backend/database/migrate_request_intake_scope.js` | Existing documents; `migrate_request_attachments.js`, `migrate_support_requirements.js` and their ticket/catalog prerequisites | Not applied by this work. Adds nullable routing-college snapshots and `blocks_intake` default false; no historical backfill/reclassification. |
| 9 — Reports & Export | **None** | Batch 8 routing columns plus existing fee-schedule and Finance receipt/payment-method columns | API/frontend changes only. Uses existing reference catalogs, receipt fields and pricing snapshots. Deploy the matching API/frontend together. |
| 10 — Support / Messaging UI | **None** | Existing support tickets, archive/requirements/catalog and Batch 8 intake scope | Frontend-only presentation changes; existing ticket/desk/college permissions remain. |
| 11 — Support Analytics | **None** | Existing support reports and ticket audit/calendar history | Frontend-only KPI/table presentation. Report formulas, cohorts, role authorization and AI inputs are unchanged. |
| 12 — Finance Receipts | `backend/database/migrate_receipt_packs.js` | Existing grouped documents/payment/OR columns from `migrate_finance_receipts.js`; Batch 8 scope and assignment support | Not applied by this work. Creates InnoDB pack/control/reservation/issued-snapshot/audit tables and an empty control row; adds a full leading OR-number index when missing. Preserves historical ORs; activates no pack and rewrites no payments. Matching API/frontend required. |
| 13 — Internal Assistance | `backend/database/migrate_internal_assistance.js` | Existing users and active desk/Admin accounts; existing support schema remains separate | Not applied by this work. Creates three empty InnoDB internal ticket/message/event tables; imports no student tickets or attachments. Matching API/frontend required; Admin operational support becomes read-only. |
| Additional chat connections — TRACE-78 follow-up | `backend/database/migrate_staff_conversations.js` | Existing users/colleges, supported active desk accounts; separate support/internal prerequisites for their existing categories | Not applied by this work. Creates three empty InnoDB staff conversation/message/retry-event tables with pair uniqueness; imports no student/internal messages or files. Deploy matching API/frontend. |

The cross-batch integration follow-up adds **no migration or environment variable**. Deploy the matching API/frontend to include routing-college chat scope, access-cache clearing, reactive notification links and consistent Receiving Desk authority. On staging, change a student’s profile college after routing, confirm old/new Secretary access, revoke staff access, follow two notification links on an open screen, and verify assignment enforcement between Window 1 and Receiving Desk.

The earlier `migrate_batch8.js` is a different historical base migration. It is **not** the Revision 2 Batch 8 migration above. Existing databases need preserving migration scripts, not a fresh schema or seed import.

## Before the final deployment

1. Review this ledger again after all requested batches. Pin the tested commit. Work is pushed to `dev`; no merge to main or automatic deployment is included.
2. Confirm the server's already-applied migrations and inspect the read-only schema check. Use the complete **32-script** dependency order in [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md) only to identify missing prerequisites; do not rerun historical data migrations merely for a UI update.
3. Follow the rollout guide's off-server database/uploads backup, restore check and writer-stop steps. Build/use the matching backend image that actually includes the new scripts.
4. If every earlier prerequisite is already installed, apply these new scripts in order, stopping on any failure:

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
