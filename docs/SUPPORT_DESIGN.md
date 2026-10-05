# Support tickets: approved design and implementation contract

Approved policy, October 5, 2026. This defines the implementation contract; consult PROGRESS and SUPPORT_VALIDATION for completed local checks. Do not deploy a partial implementation or treat this specification as acceptance evidence.

## Ticket identity and history

One Support workspace replaces the request/general tabs. A student owns every ticket. A general ticket has no document; a linked ticket refers to an authorized case. Only one unresolved general ticket per student is allowed, with a nullable generated unique key and transaction locks. Linked tickets do not grant new document permissions.

Import one general ticket for each student with old general messages and one linked ticket for each request with old document messages, initially Queued. Preserve source rows and stable import keys. Import all messages; never create an empty ticket for every request. Keep attachments on their original cases. Closed linked cases retain imported history but cannot enter live assignment or accept writes. Migration runs with all writers stopped and is repeatable.

Ticket states: FAQ assistance → Queued → In progress → Awaiting student → Queued; Resolved records explicit closure. FAQ helpful feedback alone is not resolution unless the student explicitly selects resolved. Reopening uses the same ticket and joins the queue at the return time; it must not displace a live conversation or bypass another unresolved general ticket. Terminal document cases (COMPLETED, legacy APPROVED, legacy REJECTED) and unknown statuses reject case writes independently of ticket state.

## Access and assignment

Students see their own tickets. Admin and Window 1/Receiving Desk manage all. College Secretaries manage linked cases within their saved assigned college; Finance retains authorized linked messaging and has no general-support access or supporting-document request/review permission. File access uses the same ticket scope, including after resolution. No public upload URLs or role-wide shortcut may expose support files.

Window 1 clerks declare their availability. FCFS uses server queue-entry time plus ticket ID for ties, not browser sorting. Claiming the oldest eligible ticket and allocating a clerk's live slot is one transaction. At most one In progress ticket per clerk is enforced by a generated unique key. Repeated claims return the existing assignment rather than stealing another ticket. Availability denotes declared capacity, not a guarantee that a person is looking at the screen.

## Hours and response clocks

Defaults: Asia/Manila, Monday–Thursday, 08:00 inclusive to 16:00 exclusive. Friday–Sunday are closed. FAQ access and ticket submission remain available outside hours. Show the next opening and retain queue position. Live assignment pauses outside hours; conversations are preserved, with an explicit closed-hours notice.

Admin and Window 1 may save validated global settings and closed-date exceptions with an audit record. Clerks control their own availability. An explicit Request student reply action starts the response clock; ordinary clerk messages and waiting for a clerk do not. Defaults warn at three service minutes and time out at five. On timeout, Awaiting student releases the slot and notifies the student. A student reply resumes the same ticket at the queue tail. Timers count only configured open intervals, retain their starting calendar/settings snapshot and survive restart; background processing and locked mutations both enforce them.

No observed data or available capacity means “Waiting for available staff.” A wait range is derived from measured handling times and declared available capacity, with sample size and uncertainty, not a guaranteed appointment. Do not fabricate a countdown from queue position alone.

## FAQ and files

Maintain approved FAQ questions/answers shared with Help. Offer suggested questions and deterministic matching; do not invent answers or add a generative provider. “Human”, “live support” and “talk to staff” escalate the existing ticket explicitly. Persist FAQ-view, helpful/resolved feedback and escalation events with retry keys.

Chat permits three JPEG, PNG or PDF files per message, 5 MB each. Validate names, MIME, size and file contents; use random server filenames, authenticated authorized downloads, and private no-store responses. Reject SVG, archives and executable content. Clean staged files on rejected/duplicate requests. Retain accepted files with ticket history; no automatic deletion job is authorized. These controls must not be represented as malware scanning or a guarantee that every PDF is harmless. Download chat files as attachments rather than executing embedded document content in the application.

Case requirements use Admin-managed Registrar-approved supporting-document IDs. Preserve old free-text entries as legacy requirement identities rather than guessing equivalence from similar labels. Lock the case to prevent concurrent duplicate requests. Rejected documents may be requested again; an explicit replacement preserves previous uploads/reviews and links to the original requirement. A general ticket alone cannot request a case document. Staff paperclip opens a compact confirmed requirement form; students see chronological system bubbles with an Upload action for the exact requirement. Keep pending/error feedback and confirmations for document submissions; ordinary Send remains direct.

## Layout and retrieval

Use a bounded history scroller and a stationary composer inside the chat container. The floating widget and full page use the same presentation. Keep selected context visible, distinguish student/staff/system bubbles, preserve scroll position when loading earlier messages and follow new messages only when already at the bottom. Incremental ticket and message cursors replace visible Previous/Next controls; server limits remain. No history is silently truncated at 100 messages.

## Metrics and capacity acceptance

Support metrics remain separate from document turnaround. Record lifecycle events once using stable event IDs and idempotency keys. All reports show the selected reporting period, denominators and missing measurements. Use No data when measurement is unavailable.

- Ticket volume: tickets created in the reporting period, grouped by approved FAQ category or general/linked category; imported history is labelled and excluded from new-service duration samples.
- Queue wait: each queued episode to its claim, counted in open service time; report initial waits and requeue waits separately.
- First human response: first staff message after escalation/reopening in each episode, counted in open service time. FAQ/system messages are not human responses.
- Resolution: creation to explicit resolution; distinguish wall elapsed, service elapsed and Awaiting student intervals. Reopened episodes are separate; do not overwrite earlier closure measurements.
- Student wait/response: explicit reply-request to student reply or timeout, with only open service time counted. Awaiting student pauses are reported separately from staff handling.
- FAQ usage: durable topic views; helpful and resolved feedback counts with their own denominators. Silence is neither helpfulness nor resolution.
- Escalation rate: tickets explicitly escalated divided by eligible FAQ-assisted tickets for the selected creation cohort; report numerator/denominator.
- Backlog: unresolved tickets as of the report cutoff, separately by state. Workload: assigned and responded ticket episodes per clerk; include median/p90 when samples exist.

Aggregated categories, counts, periods and duration samples may support grounded advisory insights. No raw transcripts, identity evidence or credentials are sent for AI training. Insufficient history gets No data; trend comparisons require comparable periods and disclose sample sizes. Prototype recommendations must not masquerade as validated forecasts.

Controlled capacity test: at least 100 simultaneous synthetic users, p95 message-save ≤2 seconds and p95 ticket/history-read ≤1 second, with no lost, duplicated or cross-user accepted messages. Test retries, reconnects, assignment races and durable row counts. State environment, dataset, latency distribution, errors and integrity findings. A local test is not proof of production capacity; production-like staging and real browser/phone acceptance remain separate.

Window 1 live replies, as well as new claims, use server-time working-hour enforcement. Students can leave messages while queued or outside hours; authorized Admin/Secretary/Finance case correspondence does not consume a Window 1 live slot. Existing assignments remain durable at closing.
