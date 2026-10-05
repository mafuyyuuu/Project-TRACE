# Support validation record

October 6, 2026. This records local synthetic checks for the approved Support redesign. It does not certify the deployed site, mailbox delivery, physical phones, a restore rehearsal or production capacity.

## Controlled 100-user run

| Measurement | Latest measured result | Agreed target |
| --- | --- | --- |
| Simultaneous authenticated users | 100 connected before the burst | At least 100 |
| Message-save latency p95 | 558 ms | ≤2,000 ms |
| Ticket/history-read latency p95 | 392 ms | ≤1,000 ms |
| Accepted / durable messages | 100 / 100 | Every accepted message persisted |
| Missing accepted messages | 0 | 0 |
| Same-key retries | 20, returned the original IDs | No duplicate writes |
| Reconnects | 10 | Correct private ownership after reconnect |
| Duplicated / cross-user messages | 0 / 0 | 0 / 0 |
| Wrong-user notifications observed | 0 | 0 |
| Foreign-ticket read | HTTP 403 | Denied |
| Burst errors | 0 | 0 |

Environment: Darwin arm64, Node v25.6.0, 8 CPU cores, 16 GiB RAM; isolated MySQL 8 on loopback, 10 pool connections, pending-query bound 200. Test data uses synthetic account names and `example.invalid` email addresses; no real records or production mail are used. Timing includes local Express API/database work while 100 Socket.IO clients are connected. This run excludes uploads, Caddy/TLS, WAN/mobile latency and browser rendering. Notification observation detects cross-owner events; it does not prove every notification arrives.

The first burst exposed a 50-query pool queue limit and failed; it is not hidden from the evidence. The bounded default was raised to 200, request tracking was corrected to record a save before a later read could fail, and the measured rerun passed. The unchanged 10-connection limit avoids claiming 200 database connections.

## Database integrity and race checks

A newly generated isolated database is loaded from the fresh schema once, then ticket/requirement migrations run twice. Schema presence passes. Additional actual MySQL checks passed:

- Ten concurrent general-ticket creations returned one ticket.
- Nine concurrent claims by three clerks assigned the oldest three tickets once, one live ticket per clerk.
- Six concurrent supporting-document requests created one requirement; the rest were rejected as duplicates.
- Rejected/corrected/accepted uploads and an explicit replacement preserved five original events, two uploads and the replacement chain.
- Wrong-student requirement reads and file downloads were denied.
- Cancellation retained read-only ticket history, all recorded requirement events and protected file authorization; new writes were rejected.
- Cursor checks retrieved all 26 synthetic tickets and 85+ messages through 20-ticket/50-message capped pages, with no missing or duplicate IDs.
- Separate legacy import/rerun checks retained three original messages/senders across one general and one linked ticket; no ticket was created for an empty request.

The first race run caught a stale REPEATABLE READ snapshot after a waiting owner lock. Short support/attachment transactions now use READ COMMITTED, retain row locks/unique constraints, and retry deadlocks up to three attempts. The complete race rerun passed.

## Browser and regression scope

177 local browser assertions passed (161 layout/runtime plus 16 keyboard/dialog/reduced-motion checks) across Student, Window 1, Admin, Secretary and Finance, at 320/375/768/1280 widths, light/dark and 100%/200% text, full and compact contexts. Checks covered bounded history, stationary input and visible Send, containment, usable history area, dialog focus containment/restoration, paperclip opening, reduced motion and absence of runtime exceptions. The 320 px dark 200% screenshot was visually inspected. A cramped floating layout was corrected with a collapsible ticket list and bounded independently scrollable context. A follow-up exposed clipped Send at 320 px/200% text in the Secretary compact view; placing input and Send together fixed it, and the complete layout rerun passed.

Source regressions cover ownership/college/Finance denial, terminal and unknown-status writes, idempotency, explicit escalation, calendars/timeouts, content validation, replacement guards, FIFO state, metric sample timelines/denominators and aggregate advice. The complete backend suite passes 1,283 tests / 97 suites, and the frontend suite passes 825 tests / 87 suites. Five Python aggregate-advice tests, ESLint and the production build pass (the existing large-bundle advisory remains). Final layout follow-ups and exact results are recorded in [PROGRESS.md](PROGRESS.md); do not infer missing physical-keyboard acceptance from emulation.

## Repeat safely

The repository contains opt-in checks in `backend/database/`. They force isolated MySQL on **127.0.0.1:13307** and refuse to run without `--synthetic-only`. Install the existing backend/frontend dependencies locally and provision the separate test MySQL database `trace_support_test` with the fresh schema and prerequisites. Do not map production volumes, use production credentials or point them at the deployed API.

```bash
node backend/database/check_support_integrity.js --synthetic-only
node backend/database/check_support_capacity.js --synthetic-only
```

Integrity creates and removes only its random `trace_support_schema_*` test database. Capacity retains uniquely named synthetic rows in `trace_support_test` for inspection and requires that isolated database to be initialized. Both disable mail/SMS and use temporary signing secrets. A passing local run is not a staging result; repeat in a matching controlled staging environment with an appropriately scoped harness before claiming production capacity.
