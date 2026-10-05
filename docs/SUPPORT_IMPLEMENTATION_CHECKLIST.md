# Support round: feature and acceptance checklist

Updated October 6, 2026. The approved implementation is complete locally; it has not been deployed by the agent. Live acceptance is separate from local verification. Keep the approved policy in [SUPPORT_DESIGN.md](SUPPORT_DESIGN.md), findings/results in [PROGRESS.md](PROGRESS.md), and deployment steps in MIGRATION_ROLLOUT synchronized.

| Requested feature | Implemented behavior and local evidence | Live acceptance still required |
|:---|:---|:---|
| Unified tickets / legacy import (TRACE-28) | One workspace; saved states; role-negative tests; import/rerun preserves three synthetic messages and two tickets; ten concurrent creations produce one general ticket | Compare real import counts/ownership during stopped-writer rollout; all-role navigation |
| FAQ / escalation (TRACE-29) | Shared approved answers; suggested matching; explicit feedback; phrase/button escalation of the same ticket; durable events | Registrar copy review; actual student/staff escalation |
| FCFS / one live ticket (TRACE-30) | Explicit availability; durable unique slot; nine real claims across three clerks assign oldest three tickets once; repeated claim has no duplicate notice | Multiple staff sessions, reload/reconnect |
| Hours / waiting (TRACE-31) | Server Manila Mon–Thu 08:00–16:00; exceptions; outside-hours submissions; paused Window 1 replies; observed-data-only estimates | Deployment settings and closing/reopening session |
| Student inactivity (TRACE-32) | Explicit reply action; configurable warning/timeout; service-time pause; Awaiting student frees slot; returning student tail-requeues; durable sweep | Live notification and overnight pause |
| Composer document requests (TRACE-33) | Authorized staff paperclip; compact confirmed form; failure/cancel retains draft; Finance denied | Populate approved catalog and exercise actual case |
| Requirement bubbles (TRACE-34) | Persisted system entries; exact Upload/review; submitted/accepted/rejected states; older events retained | Actual file and protected preview |
| Catalog / replacements (TRACE-35) | Stable Admin types; legacy identities; six concurrent requests create one requirement; chain preserves five original events/two uploads | Registrar catalog and real replacement/history |
| Closed history (TRACE-36) | COMPLETED/APPROVED/REJECTED/unknown reject writes; actual cancellation retains events and protected files | Approved historical cases/files after rollout |
| Anchored composer (TRACE-37) | Independent bounded history/context/composer; all-role 320–1280 px, both themes, 100/200% browser checks | Physical mobile keyboard/original browser |
| Layout / incremental history (TRACE-38) | Selected context; distinct bubbles; no Previous/Next; capped ticket/message/requirement cursors | Long real histories/mobile scrolling |
| 100 simultaneous users (TRACE-39) | Local 100-user run: p95 save 558 ms/read 392 ms; 100 durable messages; 20 retries/ten reconnects; no observed loss/duplicates/cross-owner messages | Matching staging; uploads/WAN/TLS excluded |
| Support metrics (TRACE-40) | Separate Admin/Window 1 analytics; durable episodes; medians/p90, denominators, missing values, periods/backlog/workload; reopen/weekend/as-of tests | Populated live reporting period and interpretation |
| Aggregate advice (TRACE-41) | Existing Flask pipeline; approved aggregates only; period/sample/evidence; insufficient/unavailable fallback; nested private fields rejected | Matching AI image and sufficient actual samples; no accuracy claim |
| Chat files / privacy | Three files × 5 MB JPEG/PNG/PDF; full content parsing; bounded workers; random names; authorized downloads; failed/invalid/retry cleanup; requirement uploads remain 10 MB | Real protected downloads and institutional retention review; no antivirus guarantee |
| Defense guide/script and docs | Original detailed format retained; diagrams/manual/Help/backend/environment/rollout updated with measured limits | Demonstrate only matching deployed revision; external delivery/restore separate |

## Cross-cutting acceptance

- Confirmed saves retain drafts/files on cancel and failure; ordinary message Send remains direct.
- Every accepted send is durable, ordered and idempotent; retry keys cannot cross tickets or actors.
- Existing profile, financial, document, email and MFA gates remain enforced.
- Synthetic fixtures only; no production load test or real-student data use is authorized.
- Full tests, lint/build, migration compatibility and negative authorization checks passed locally; exact results are in PROGRESS and SUPPORT_VALIDATION.
- Capacity, restore rehearsal, external delivery and physical-phone acceptance are distinct; do not infer them from unit tests.
- No production migration, deployment, commit or push has been performed by the agent. Follow the complete matched Support rollout, with fresh off-server backups and stopped writers; do not import the fresh schema into production.

Secretary and Finance review dialogs use the ticket workspace. Old send endpoints reject stale clients; original history remains retained. [SUPPORT_VALIDATION.md](SUPPORT_VALIDATION.md) provides the measured scope and reproducible isolated checks.
