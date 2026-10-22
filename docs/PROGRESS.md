> Documentation cleanup (October 22, 2026): PNG review artifacts and retired defense/checklist documents are available in Git history. Historical screenshot labels below are evidence descriptions, not links to files in the current tree. Current setup is in README; deployment, migration and security instructions are in their dedicated guides.

## Security and operational readiness first batch - October 22, 2026

Reviewed latest main `b973af7` and implemented ownership/college checks for tracking and Secretary profile lookup, owner/Admin registration-proof access, Admin-only insight routing, private no-store API/file/error responses, request IDs, safe 5xx messages and structured sanitized main-controller errors. Auth storage outages deny access with 503 instead of false invalid-token 401. Production CORS fails closed without an allowlist and rejects the public JWT placeholder. Ordinary uploads require matching exact extension/MIME.

Compose's backend/AI/n8n host ports bind to loopback and six service logs rotate at 10 MB x3; Caddy HTTP/HTTPS remains public. Updated affected Node dependencies, replaced development nodemon with native Node watch mode, and defined pinned-action/read-only CI jobs for backend, frontend and isolated analytics checks. No database migration, real cloud change or automatic production rollout is performed. See SECURITY_ROLLOUT.md for evidence and the remaining RLS/permissions, rate limiting, CDN, scaling, telemetry, recovery, CI enforcement and hosting work. Application row authorization is not native MySQL RLS.

Validation: **1,924 backend tests / 146 files on Node 22**, **1,250 frontend tests / 135 files**, lint, production/PWA builds including Node 22, **30 Python tests in a fresh CI-pinned environment**, and **65 responsive synthetic browser checks** pass. Fresh npm installs and explicit full audits report zero known advisories for both lockfiles. SMTP message construction is checked locally; real delivery, Docker builds, live DB/cloud settings, backup restores and new remote CI runs are not claimed.

## Experimental Random Forest with simulated and current stage history - October 18, 2026

Admin Insights now uses an actual 100-tree residual-wait classifier when eligible current-history reads and the AI service succeed. It learns from 2,000 reproducible simulated episodes plus usable completed modern stage intervals. It estimates whether the oldest recorded case in a stage remains there another 24 hours, then uses existing authorized workflow descriptions for the suggested action. It does not determine delay causes, staffing capacity or route requests. Model coverage is limited to recorded stage-entry ages <=168 hours; unsupported stages and failures retain visible workflow guidance. No new database rows, migration, secrets or environment variables are introduced.

A read-only, bounded MySQL window query coalesces consecutive same-stage notes and derives entry/exit intervals from actual changed statuses. Only legal modern transitions, ordered known timestamps and durations <=720 hours qualify. Legacy mock workflow markers are excluded rather than relabeled. Payloads contain stage/times, anonymous document group numbers and provenance flags, with no names, IDs, chats or file paths.

AI & Model Evaluation shows training source counts, exclusions, separate simulated/held-out saved scores, majority baseline, precision/recall/F1 and false/missed alerts. Whole saved document groups split chronologically, crossing groups are excluded, and current predictions never become labels. Synthetic and unmarked/unverified histories are not certified real-world validation. The original four coded examples remain retired. Serving fits are cached by training-data fingerprint. The revised 12-page defense PDF explains the active experiment and uses live-value placeholders instead of manufactured accuracy.

Validation: full backend **1,899 tests / 143 files** and frontend **1,250 tests / 135 files** passed; final focused behavior checks **247 backend / 16 frontend**, **30 Python model/route/forecast/support tests**, lint and production/PWA build pass. **65 browser checks** cover 320/375/768/1440 px, both themes and 100/200% text for the trust explanation, Prophet comparison, RF scores and Dashboard advice, plus keyboard horizontal scrolling of the scores; no page overflow or browser errors. Browser records are intercepted synthetic fixtures with actual locally fitted RF output. Window-query expressions were checked against a SQLite fixture for repeated-note and interval semantics, not a live MySQL database. Live deployed DB counts/scores and SSH rollout are unverified here. A broad Python discovery additionally encountered the existing OCR smoke test's missing EasyOCR dependency; the 30 relevant isolated tests pass.

Rollout: deploy matching frontend and run the existing service rebuild for `backend` and `ai-engine`. First Admin evaluation/Insights read fits against the deployed history; verify the loaded model ID and separate cohort counts/scores. See AI_MODEL_EVALUATION.md for assumptions and exact target/split.

## Signup navigation after unauthorized catalog reads — October 15, 2026 (ready for review)

Reproduced Login → Sign up → Login using an anonymous program-catalog request returning 401, as an older protected backend can do. The shared API interceptor previously redirected on nearly every 401, including public-page reads. Public college/program failures now remain with their caller, retaining signup and its Retry Catalog state. An expired `/auth/me` check can clear matching cached credentials without navigating away from public signup/recovery/verification pages. Genuine expired protected dashboard requests still clear the session and return to Login. Delayed failures from a prior token cannot erase a newer login; credential/OTP exception handling and pending-request accounting remain.

The API/backend authorization boundary is unchanged. A backend that still protects `/reference/programs` needs the matching public active-catalog update before anonymous programs can load; the frontend correction prevents the redirect without pretending the catalog request succeeded. No new database migration is required.

Validation: **1,134 frontend tests / 116 files**, lint, production/PWA build and whitespace checks pass. Five real-App browser scenarios verify anonymous student/alumni signup against a catalog 401, expired cached credentials on signup with draft entry, normal college/program selection, and expired dashboard redirection. The pre-fix browser run reproduced the bounce; post-fix runs retain signup for public failures and return the protected dashboard to Login, with no browser page errors. Requests use synthetic intercepted responses; no live endpoint/deployment outcome is claimed.

## Signup field errors and persistent navigation — October 15, 2026 (ready for review)

Signup validates the complete draft before review and marks invalid identity, contact, password/confirmation, college/program, alumni years/missing-proof reason, proof and privacy fields in red with associated explanatory text. Editing fields clears their previous feedback; server rejections such as duplicate ID or invalid email return to the corresponding field while preserving all entered values and proof. Unknown server/connection errors appear beside Create Account. There is no error popup or top-of-form banner. The form uses explicit validation with `noValidate`, preventing native required-field prompts from scrolling the applicant to the beginning. The existing registration review, privacy notice and success dialogs remain.

Back to Login now sits in an opaque sticky header above the scrolling form, including mobile and enlarged text. Decorative clipping is confined to the background so it cannot disable sticky positioning. Shared upload controls accept an optional externally managed field error and associate it with the picker; year fields can defer validation until signup submits while preserving default behavior in other forms.

Validation: **1,109 frontend tests / 115 files**, lint, production/PWA build and whitespace checks pass. **168 actual-browser checks** cover signup/required errors, privacy and upload errors, server duplicate-ID recovery, registration review/cancellation, alumni missing proof, catalog failure/retry/empty lists, all 13 supplied programs, and Back to Login navigation. Widths 320/375/768/1440 px, 100/200% text and both themes retain the sticky header, contain page/dialog layout and preserve drafts/files. No live signup/deployment or physical-device acceptance is claimed. Scrolled mobile field errors and sticky header (archived screenshot).

## Signup programs, privacy notice and proof requirements — October 15, 2026 (ready for review)

Registration now selects an active Program/Course from the existing college-scoped catalog, shared with profiles and Admin maintenance. College changes clear the prior program; loading failures provide Retry Catalog, empty catalogs explain the Registrar follow-up, and the full selected program remains readable below the native dropdown at small widths. Public program reads expose active catalog data only; unrelated reference endpoints retain authentication. Registration rejects missing/foreign/inactive programs and rechecks availability under catalog locks after OCR before writing the account.

Prepared `migrate_signup_programs.js`, an explicit additive import of the owner’s 13 supplied programs. It resolves existing colleges by name (including the historical International Hospitality Management name), refuses missing/ambiguous matches, preserves profiles/college routing/program names/inactive flags, and rolls back failed imports. It requires the existing program-catalog schema and has not been run on the live database.

Added the readable Registration Privacy Notice, an initially unchecked required acknowledgment, and the notice/program in the existing review confirmation. Notice open/close and confirmation cancellation preserve drafts; opening the notice does not grant acknowledgment. The server requires the current revision and records `REGISTRATION_PRIVACY_ACK_2026_10_15_V1` with its database timestamp in the account transaction, including rejected-account resubmission. Historical users receive no backfilled acknowledgment; no new privacy schema migration is introduced. The notice discloses actual OCR/automatic and manual review, account data, providers, role access, retained proofs and rights/referral without inventing DPO details or deletion schedules. School/DPO policy review remains necessary before production adoption; notice acknowledgment is distinct from unrestricted consent.

Proof upload guidance lists student/alumni examples, **JPG/JPEG/PNG/PDF, one file, 10 MB maximum**, and image/scan clarity. The server’s extension/MIME checks now match these displayed formats. Known-rejected upload drafts are removed; uncertain server/commit failures preserve evidence rather than risk deleting an accepted proof. Existing stored files remain readable.

Validation: **1,735 backend tests / 130 files**, **1,104 frontend tests / 115 files**, plus **25 focused frontend checks after final copy changes**, lint, clean production/PWA build and whitespace checks pass. **103 actual-browser checks** cover all seven college groups/13 programs; signup, notice, review, alumni missing-proof, catalog failure/retry and empty states at 320/375/768/1440 px, 100/200% text and both themes. They also verify preserved drafts, unchecked notice behavior and a single confirmed synthetic request. Screenshots use synthetic data: signup (archived screenshot), mobile privacy notice (archived screenshot). No live registration, import, deployment or physical-device acceptance is claimed. Rollout instructions and the user manual describe the matching API/frontend requirement and explicit catalog import.

## Ticket chat archives — October 15, 2026 (ready for review)

Added Active / Archive views to student/case support and internal assistance, including mobile ticket dialogs. Resolving a ticket moves the selected chat to Archive; reopening an eligible ticket returns it to Active. Archive derives from the saved `RESOLVED` state, retains messages/files as read-only history, and introduces no new archive columns, table, migration or deletion. Server filters apply before cursor pagination and retain student ownership, desk/college scope, private internal assistance and Admin monitoring restrictions. View switches abort old reads and reset the cursor; notification links still open archived history. A fresh list refresh replaces the current page so remotely resolved tickets cannot remain cached as Active. Staff coordination retains its conversation lifecycle.

Regression coverage includes SQL ownership plus archive/cursor predicates, invalid view rejection, late responses after view switches, automatic resolve/reopen navigation, read-only history, legacy-record tracking filters, and release Cancel-first/busy guards. Updated the manual, in-app FAQ and UI inventory. **1,099 frontend tests / 114 files** and **1,703 backend tests / 128 files** pass. Archive browser review passes **144 combinations** across Window 1, Student, Admin, internal history, resolve/reopen, older pages and empty archives, plus mobile ticket-list access. Synthetic data only; no live DB, physical device, merge or deployment.

## Window 1 Figma review — October 15, 2026 (ready for visual review)

Individually inspected all **18 frames** in Window Clerk section `2362:1473` before implementation; complete IDs and implementation mapping are in UI_CONVENTIONS.md. Covers Intake and Release dashboards, Tracking Desk, Reports & Export, all three Support categories, Support Settings, linked ticket/staff conversation/internal concern dialogs, Manual/FAQ, Manual Input, Personal Info, both Security scroll states, Intake Check and Release Document.

Replaced legacy KPI sparklines and counter layouts with the source hierarchy and **55 original read-only SVG exports**, reusing identical existing source assets. Added real tracking filters before pagination, compact upload and generated QR cards, queue chips and pinned count/paging footers, inline Reports filters, staff profile/security chrome, eligible recipient forms, two-column Intake Check and protected-receipt release confirmation. Keeps original-issued notes, attachment readiness, walk-in/one-dismissal/graduation guards, actual routing, estimate labels, physical receipt procedure and staged submissions. Cancel preserves the manual draft; release focuses Cancel first. Source mock applicant data, fixed counts, QR and payment-slip images are never used as live records. The user's archive request explicitly extends the source ticket lists.

All 18 states pass **292 final browser checks** (288 width/theme/text combinations plus manual draft cancellation, release focus/cancel, tracking filters and mobile ticket navigation). The 320px/200% Intake Check footer was corrected and rechecked. Selected ticket rows are content-sized rather than filling their list; **68 follow-up checks** pass for Support, staff coordination, internal assistance and the recipient dialog after that correction. A final **20-check** Manual Input pass verifies the labeled copies stepper and cancellation flow. Dark/light and 100/200% text are checked at 320/375/768/1440px, with reachable dialog bodies/actions. Source fidelity still requires the user's visual acceptance.

## Current-student education fields — 2026-10-15

The user reported Graduation Clearance asking a current student to complete study
years and requested Year Level/Section instead of college graduation and last
attendance. The request rule incorrectly fell back to last attendance for current
accounts. Current students now edit saved Year Level and Section; both participate
in frontend/backend profile completion and authorized staff lookup. College
Graduation Year and Last Attendance Year are alumni-only in these views and request
requirements. Existing historical values remain stored; older clients cannot erase
them through a current-student profile save. School history and TOR/dismissal-set
Year Started requirements remain. Alumni validation and catalog permissions remain.

Added nullable `student_profiles.year_level` and `section` (20 characters), the
explicit rerunnable `migrate_current_student_details.js`, schema preflight, model
writes/reads, public session fields and refresh/cache persistence. Do not infer or
backfill enrollment data. Existing current students complete the new fields before
filing. The migration is prepared and tested, not run against a live database.

Validation: **1,091 frontend tests / 113 files** and **1,695 backend tests /
224 files** pass. Regressions cover current
Graduation Clearance without graduation/attendance, forged request values, missing
saved enrollment fields, profile partial-save/reload, role/type guards, parameterized
SQL, migration preservation/reruns and unchanged alumni requirements. Current and
alumni profile/request/review states pass 64 responsive combinations each, plus a
16-combination current-profile layout check and 16-combination alumni capture
check. ESLint, production/PWA build and whitespace checks pass. Synthetic review is in
archived review screenshot. No live database/backend or physical
phones tested. Manual, FAQ, workflows, backend/deployment and defense notes updated.
Work remains on draft PR #37; no deployment or merge performed.

## Student omitted profile and tracking frames — 2026-10-15

Re-audit found seven omitted frames in Student: Personal Info, Educational
Background and Security each have top/scrolled views, plus Live Track. The prior
ten-frame inventory was incomplete; the current inventory records all 17 frames.

Implemented the 720 px Student profile, fixed identity/tabs/footer, protected proof
preview/download, grouped contact/receipt-name/academic/personal/address fields,
education cards, authenticator/password/session cards, visible security activity
and original password-eye controls. Accessible field hints, conditional validation,
saved-year restrictions, email verification, confirmations and API behavior remain.
On mobile the summary can scroll independently while tabs and save/cancel stay
reachable. Typography scales while geometry uses stable pixel spacing.

Live Track now has the source 960 px summary cards, Copy tracking ID with explicit
clipboard feedback, progress panel and next-step guidance. Its nine stages, order,
counts, dates and status messages use the existing pipeline. Mobile retains three
alternating columns and measured connector geometry. Restored the chat launcher
shown on the Student Support frame. Added 41 original read-only SVG exports; no
Figma canvas edits, backend/dependency/migration/environment changes.

Validation: **1,084 frontend tests / 113 files** pass, including two tracking
clipboard/terminal-state regressions. All 17 Student states passed **272 Chromium
combinations** at 320/375/768/1440 px, 100/200% text, and both themes. The final
**112-combination** profile chrome follow-up also passes and checks tab visibility and reachable body and
footer. Synthetic captures are in archived review screenshot.
ESLint, production/PWA build, original SVG/callsite checks and whitespace checks
pass. Physical phones and the live backend were not tested. Student remains ready for
user review on draft PR #37 targeting dev; no merge or deployment.

## Student Figma implementation and system-wide filter consistency — 2026-10-15

The user asked to proceed with Student and use its History filter design throughout
TRACE. Figma access was confirmed and ten initially identified frames in Student
(`2354:4416`) were individually inspected. The re-audit above corrects that inventory. The frame inventory is in `docs/UI_CONVENTIONS.md`.

Student now follows the source header/rail, welcome/KPI/active-request hierarchy,
request/payment History layouts, request selection/review steps, compact support,
ticket/create dialogs, support empty state and searchable manual. All 66 new SVGs
are original read-only exports; no Figma canvas was edited. Live records, pricing,
identity, protected receipts and existing submission/confirmation rules remain.
Required selected fields stay mounted during document search. Three regressions
cover combined History filters, submitted-payment scope/receipts/unpriced amounts,
and required-field validation while searching.

FilterSelect reuses the History funnel/chevron design across existing filtering
dropdowns, including shared reports used by staff desks. Filtering stays native,
labelled and controlled by its existing caller; options, applied/draft/export scope,
loaded-record limits and permissions are unchanged. Audit event/document-type chips
now use that same dropdown by explicit user request. Data-entry selects and queue
navigation remain distinct.

Validation: **1,082 frontend tests / 112 files** pass. Student's ten source states
pass **160 Chromium combinations** at 320/375/768/1440 px, 100/200% text and both
themes. The shared filters pass another **192 combinations** across Admin and staff desks;
a final manual theme/asset check passes 16 combinations.
ESLint, production/PWA build, SVG/callsite integrity and whitespace checks pass.
Synthetic screenshots are in archived review screenshot,
archived review screenshot and archived review screenshot.
No physical phones or live backend were used. No backend, dependency, migration or
environment changes. Student is ready for visual review, not declared accepted;
work remains on the existing Admin/Student draft PR #37 targeting dev.

## Admin mobile header — 2026-10-15

The user flagged the tall mobile header in the More review screenshots. The full
wordmark and desktop-sized brand spacing forced the action group onto another row.
Below 768 px, Admin now shows the accessible logo mark and all existing controls
on one 64 px header row. Menu, quick guide, theme, notifications and profile keep
44 px tap targets. The notification panel anchors to the header edge on mobile so
it cannot extend off the left side. Desktop and other role headers retain their
existing treatment. No actions or notification behavior were removed.

Validation: 27 Layout tests, ESLint, production/PWA build and whitespace checks
pass. Chromium checks 320/375/414/640/767/768/1440 px at 100/200% text in both
themes (28 combinations), including one-row geometry, minimum tap targets, page
containment and loaded assets. Mobile menu open/close, theme toggle, notification
read/clearing and Edit Profile remain functional. Notification-panel containment
also passes at five mobile widths and both text sizes. Synthetic comparison:
archived review screenshot. No live backend or physical phone was used.

## Admin More Tabs fidelity and notification state — 2026-10-15

The user accepted Main Tabs, requested the More destinations, reported the persistent
notification dot, and explicitly authorized pushing the finished fixes to the same
branch and draft PR. All eight frames under Figma More (`2193:1056`) were inspected,
including both Document Efficiency and Support Analytics scroll states. The source
inventory and component mapping are in `docs/UI_CONVENTIONS.md`.

Reports now use the source Export CSV action, search icon and split Manila date/time
cells. Document Efficiency restores original metric icons, release summaries and the
staff toolbar, notice, desk badges and seven-row pagination. Search and desk filters
retain the full-staff workload denominator. Support restores the joined period card,
six metric cards, duration treatment, side-by-side feedback/workload empty states,
and measurement guidance. Graduate rows split submission dates and relative ages.
Templates restore source choices, controls, icons and line numbers around the real
editable draft and sandboxed preview. Manual restores search, counts, chevrons and
local Yes/No selection without deleting current guidance. That selection is page
state only; it is not a server FAQ vote or analytics event.

The persistent dot came from a red circle embedded in the bell SVG as well as the
conditional unread indicator. Admin now uses the original bell-only vector, and
only unread state renders a dot. Successful mark-read updates use the opening IDs
and a functional state update, preserving notifications arriving during the request.
Regression tests cover both clearing and concurrent arrivals.

Validation: **1,079 frontend tests / 110 files** pass. **192 Chromium combinations**
cover all eight source states plus export, graduate review, filtered workload and
notifications at 320/375/768/1440 px, 100/200% text, light/dark. No page/dialog
escape, split button words, missing original assets or browser errors were found.
A separate notification scenario verifies the unread dot disappears after a
successful read and checks another 16 responsive/theme/text combinations. A final
32-combination support check verifies contained table scrolling at narrow widths. ESLint,
production/PWA build, SVG integrity and changed-line whitespace checks pass.
archived review screenshot and archived review screenshot contain
synthetic browser captures. Physical devices and a live backend were not tested.

No backend, migration, dependency or environment changes. Protected files, live
records, filtering/export contracts, template isolation and decision confirmations
remain intact. Figma was only read/exported. More is ready for user review, not yet
accepted. This work is pushed to `feat/admin-figma-ui` in draft PR #37 targeting
`dev`; no merge or deployment is requested.

## Admin Main Tabs toolbar corrections — 2026-10-14

The user's latest screenshots exposed a full-width dropdown wrapping below its
Filter label and inherited header dividers above Document Types/Security Logs
filter chips. Rechecked source frames `2002:1306`, `2134:1455`, and `2168:1236`.
The tracker control group now uses two grid columns so the label stays left and
vertically centered; its typography and gray dropdown surface follow the source.
Only the Document Types and Security Logs filter toolbars suppress the inherited
bottom border. Existing filters and loaded-record scope remain functional.

Validation: **83 focused frontend tests / four suites**, lint, production/PWA
build and changed-line whitespace checks pass. **48 Chromium combinations** at
320/375/768/1440 px, 100/200% text and light/dark pass position assertions for the
Filter label, zero-width toolbar dividers, word wrapping, containment, original
assets and browser errors. archived review screenshot uses synthetic data.
More tabs remain paused; Main Tabs still awaits the user's visual acceptance.

## Admin Main Tabs fidelity corrections — 2026-10-14

Revisited all 35 source frames and rendered all 33 current states in the real Admin
shell. Corrected the Review action's min-content width, registration email breaks,
and password-eye geometry. The staff eye's SVG export omitted its pupil; the exact
Figma node now uses a four-times-resolution PNG at its original 18 px size.

Rebuilt Profile Security's aligned icon/title/description cards, password eyes,
requirements, guidance, and right-aligned session/activity actions. Restored missing
check/info assets. Reworked the document table's type/fee metadata, icons, actions,
source font sizes and card height; the drawer now has side-by-side fee inputs,
currency prefixes, an aligned status badge, original corners, college chips and
request-rule tiles. Existing Registrar policy guards remain enforced.

Preferences headings, forecast header/day legend, catalog controls, and messaging
heading/tab order now follow their source frames. Payment-method Edit uses the existing
update service, locks the immutable code and retains staged confirmation. Audit date/time
lines use Philippine time, recognized security events have readable labels with raw
codes available as tooltips, and unknown event codes remain unchanged.

Validation: **1,075 frontend tests across 110 files**; ESLint, production/PWA build,
asset integrity and changed-line whitespace checks. Browser fixtures use synthetic
records; **528 size/theme checks** cover 33 states at 320/375/768/1440 px,
100/200% text, light/dark, with checks for split action words, page/dialog containment,
missing original images and browser errors. See archived review screenshot.

The draft PR remains for the user's visual review. Main Tabs has not been accepted;
More tabs remain paused. No merge, deployment or Figma mutation was performed.

## Admin tracker control wrapping — 2026-10-14

The user's mobile screenshots exposed `Filter:` split across two lines and `View`
across three lines. A real Chromium reproduction confirmed both failures without
page overflow, which explains why the earlier overflow-only checks missed them.
The tracker filter now uses a nonshrinking, single-line accessible label and a
wrapping control group. The attachment column reserves seven rems, and its View
button keeps the icon and complete word together. Filtering and authenticated
preview behavior are unchanged.

Browser checks assert single-line text, containment within the label/button/table
cell, and no page overflow across 320/375/768/1440 px, 100/125/150/200% text,
light/dark themes, and short/long document filters: **64 combinations pass**.
The protected viewer opens, no browser errors occur, and **59 focused Admin tests**
pass. Lint, production build and changed-line whitespace checks pass.
archived review screenshot contains only synthetic fixture records.
This follow-up remains in Main Tabs; More work stays paused.

## Admin Main Tabs — review stage — 2026-10-14

Inspected all 35 frames in Figma Admin – Main Tabs (`2217:20270`) individually before
this follow-up, including Registration v2, both profile tabs, viewer, both assignment
states, support settings, catalog dialogs, document drawer and scroll variants.
The full frame-to-component inventory is in `docs/UI_CONVENTIONS.md`.

Rebuilt the registration proof/detail split, protected zoom/rotate/full preview,
profile summary and security cards, assignment/reconciliation layout, support schedule
and closed-date controls, catalog forms/guidelines, linked request cards, student
information and document drawer sections with original read-only Figma icon exports.
Unknown OCR checks remain unknown; no approval, protected-file or mutation permissions
were broadened. Existing backend contracts and staged confirmations remain authoritative.
Fixed toolbar shrinking and table containment found in the fresh responsive browser sweep.

Frontend validation: **1,074 tests pass**, ESLint and production build pass.
Fresh Chromium review uses synthetic records and actual React components, with checks at
320/375/768/1440 px, light/dark themes and 100/200% text sizes. All 33 current views/states
pass **528 size/theme checks**, without page overflow or browser errors, including
catalog dialogs, drawer/profile scroll states, selected support, linked request,
staff monitoring the unclaimed internal ticket and the forecast modal. Two historical Figma
frames are superseded by their newer designs.
Physical devices, the live backend and deployment were not tested. The Figma originals
were only read/exported, never modified. Screenshots contain synthetic records.

Main Tabs is prepared for user review, not declared visually accepted or completely done.
**More tabs are paused** pending the user's Main Tabs review. Earlier More changes in this
branch remain provisional; this follow-up adds no More screen work, merge or deployment.

## Admin Figma UI implementation — 2026-10-14

Replaced the Admin portal presentation using the TRACE UI / UX Figma file
`eQNaLBPXQSojI6lOK60Api`, including its Main and More destinations. The Admin shell,
navigation, dashboard metrics/forecast/verification queue, tracker, accounts directory,
maintenance dialogs/document drawer, reports, support workspaces, templates, manual and
profile/preferences dialogs now use the reference typography, spacing, rounded surfaces
and exported icons. Graduate queues include the matching toolbar, program/search filters
and review shortcuts; decisions still require the existing review and confirmation steps.
Audit tables use the Figma toolbar, event/role/date/search filters and eight-row paging
over already loaded records. Their scope is labelled; older server history is not fabricated.

Preserved services, live data, protected-file access, Admin authorization, staged saves,
confirmation dialogs, desk actions, pricing and workflow transitions. Unsupported Figma
performance claims remain qualified by the existing measured-data/advisory rules. Admin
styles are scoped; shared components retain other roles' presentation by default. Local
Inter and original SVG assets add no package dependency or environment requirement.
Integrated the latest dev field-bound, pickup-reminder and Secretary catalog fixes before
verification; this change adds no backend or migration work.

Validation: **1,067 frontend tests pass**, ESLint and the production build pass, and the
changed-line whitespace check passes. Browser review covers 13 Admin destinations and
five dialogs with synthetic API fixtures. **128 responsive checks** cover dashboard,
accounts, reports, support, manual, both audit tables and graduate applications at
320/375/768/1440 px, light/dark themes and 100/200% text size, without page overflow.
Table overflow stays inside its scroller. UI screenshots use synthetic accounts and
are for review only; physical devices and the live backend/deployment were not tested.
Prepared for review against dev; no main merge or cloud deployment.

Continuation verification: recovered the saved branch and its uncommitted audit/graduate
refinements. Rechecked all 1,067 frontend tests, lint and production build. Replaced remaining
dashboard and directory icon substitutes with original read-only Figma layer exports, and
matched the report column proportions and footer. The earlier browser review above was
recorded before the workspace interruption. A fresh browser review in the resumed workspace
is blocked: Chromium is absent, its download is unavailable, and the cloud browser cannot
reach the local Vite server. Final asset integrity, frontend tests, lint and build pass after the refinements;
pixel-for-pixel and live deployment acceptance still need a browser review.

## Staff internal-assistance navigation — completion — 2026-10-12

Removed the separate Internal Assistance destination for Window 1/Receiving Desk, Finance and
College Secretary. Each role now opens the existing Support → Internal assistance category,
matching Admin. Legacy tab=internal-assistance links render the same MessagingWorkspace with
initialCategory=internal; the existing internalTicket query reaches the requested concern and
Support is the selected sidebar/drawer destination. Removed DashboardPage's unused standalone
import/route. Category keys/draft preservation, onboarding targets, account gates, staff creator
privacy and assigned-Admin authority remain intact; no backend or visual styling change.

Executed **88 assertions against the actual navigation utility** in the available JavaScript
runtime: supported-role destination removal, Support uniqueness, legacy mapping, stable menu
partitions and preservation of other destinations/role mappings. Reviewed the real route and
MessagingWorkspace ticket-query wiring and confirmed onboarding already targets Support.
Added/updated React regressions for all four desk labels, Admin, labelled/icon navigation,
requested internal ticket selection, forced unauthorized URLs and temporary-password gates.
Changed-line whitespace review passes. **These React tests were not run**: the selected coding
environment is disconnected and no terminal/runtime is available. Lint/build, browser screenshots,
physical-device and live-deployment checks remain pending; prior suite counts are not claimed
for this patch.

Updated existing README navigation, Help, User Manual, System Workflows, defense walkthroughs and
the consolidated deployment ledger. **No migration, dependency or environment change**; only the
matching frontend must be published for this follow-up. Publication is to dev, without main merge,
cloud deployment or per-batch acceptance Markdown. The prior AI update's separate rebuild
requirement remains recorded and is not executed here.

## Staff internal-assistance navigation — findings before edits — 2026-10-12

The user reports Window 1's duplicate Internal Assistance destination and extends the review to
Finance and College Secretary. The shared navigation inserts a separate entry for all supported
clerks, although MessagingWorkspace already contains the same Internal assistance category.
Admin already maps old internal-ticket links into that categorized workspace; staff still open
the standalone component. Remove duplicate entries for Window 1/Receiving Desk, Finance and
Secretary and extend the existing legacy-link route/active Support mapping to all of them.
Retain ticket queries, category drafts, account gates and creator/assigned-Admin permissions.
This is a frontend navigation change, without new schema, design or migration.

The selected coding environment is offline and exposes no terminal/runtime tools. Proceed with
a pinned dev source read and small GitHub patch, execute the real navigation utility in the
available JavaScript runtime, and add React regression tests. React/Vitest, lint/build and browser
execution remain unverified until a coding environment reconnects. No new acceptance Markdown.

## Admin document insights and narrow tables — completion — 2026-10-12

Replaced unsupported Optimal Performance/System Normal claims with an authoritative Node queue
snapshot across every active PIPELINE stage. Known terminal history is excluded; unknown statuses
are counted separately for review. Today’s workflow actions use explicit full Manila-day bounds
and are distinguished from distinct requests. Count size alone makes no efficiency, delay or
capacity conclusion. Existing evaluation >5 and pickup >3 checks are labelled advisory thresholds.
Optional Random Forest remains a ten-tree/four-coded-example prototype: only its explicit
unvalidated integer class enables experimental review text, never a success/performance claim.
Node builds its own messages and ignores old unsupported AI response contracts. Flask accepts
validated aggregate-only POST input; compatibility GET also counts every stage. Support insight
formulas, Prophet/OCR, document state changes and existing permissions are untouched.

Added snapshot times, guarded read-only Refresh insights and honest stale/loading/failure states.
Failed refresh replaces prior advice instead of leaving it apparently current. Admin verification,
tracker and audit tables have stable Tailwind column widths, full-value wrapping, separate log
tracking lines and contained keyboard-accessible horizontal scrolling. Tracker shows the complete
tracking identifier. A real browser stress case exposed an additional unconstrained student-name
button; constrained it to its cell and retained click/profile behavior. Existing row pagination,
buttons and main design remain; no whole-system Figma restyling was introduced.

Final **1,538 backend tests / 117 files** and **961 frontend tests / 104 files** pass, plus lint,
production/PWA build, Python compilation and **11 document/support Python unit tests**. Isolated
execution of the actual Flask route with real Flask/RandomForest and a synthetic DB stand-in passes
**five HTTP checks**, including POST-without-DB, legacy GET, strict payloads and size limit.
**Twenty Node/Python advisory parity cases** pass. **Four real MySQL/HTTP checks** in the retained
isolated synthetic test database verify all-stage reads, legacy response rejection, aggregate-only
prototype requests and equality with the existing backlog count. No cloud database, actual users,
mail, proof or OCR/model download was used. Full Docker image build/startup was not performed;
verified its explicit COPY now packages the helper and all listed sources exist.

**48 browser configurations** pass for all three Admin tables at 320/375/768/1440 px, both themes
and 100/200% text. Full values stay within cells and horizontal scrolling is contained; keyboard
scrolling works where needed. Insight refresh failure removes prior workload advice. No page
errors. Three representative actual-component screenshots with synthetic responses were visually
inspected and added to the existing README. Living Help/manual/workflow/backend/setup/deployment
and defense docs, including aggregate-flow diagrams, reflect the new contract and limits.

**No additional migration, dependency or environment setting.** Matching backend/frontend and an
AI image rebuild are needed when deploying because app.py imports document_insights.py and Node
posts the aggregate snapshot. An old/unreachable AI service uses complete local advice safely.
Existing five cloud migrations remain complete. Publication targets dev only, without main merge,
cloud deployment, n8n import, external messages or per-batch acceptance Markdown.

## Admin document insights and narrow tables — findings before edits — 2026-10-12

The user reports Optimal Performance despite many outstanding documents and attaches an Activity
Logs screenshot where document type/tracking text overlaps the Action column. They request fixes
within the current design while their new Figma redesign is being prepared; dev only, no main
merge or deployment. Inspection finds ai-engine/app.py checks only Secretary evaluation/release
and today's step-action count, fits Random Forest on four hard-coded samples, and treats absence
of warnings as confirmed efficiency. The Node fallback repeats the two-stage blind spot, calls
step-action volume higher than average without a baseline, and recommends seeding mock history.
Replace these unsupported production claims with read-only complete pipeline queue aggregates,
transparent advisory rules and explicit limits: outstanding volume does not prove delay/capacity.
Use the same live aggregate for optional AI formatting and local fallback; reject old unsupported
AI contracts during staggered rollout. Keep Prophet, OCR and support insight definitions intact.

Admin activity logs use table-fixed/whitespace-nowrap with equal narrow columns and put tracking
beside the document type. Account review and tracker tables have similar unbounded text cells.
Use explicit stable widths, full-value wrapping and contained keyboard-accessible table scrollers
for Admin tables; preserve original actions, roles, row pagination and current shared styling.
Record screenshots in the existing README and migration/setup notes in the consolidated guides,
without per-batch acceptance Markdown or a database migration.

## Comprehensive Admin functional review — completion — 2026-10-12

Admin now reaches Internal assistance through Support, with legacy internal-ticket URLs mapped
into that workspace and category drafts retained. The duplicate Admin Support analytics action
is removed. Efficiency Analytics has independent Document Efficiency/Support Analytics views;
direct Support links do not wait for document data and switching preserves the reporting draft.
Scan Field Detection explains expected-field coverage instead of presenting the parser ratio as
verified accuracy. Student/alumni accounts now have confirmed Admin-only deactivate/reactivate
through the existing account lock, atomic status/version/audit transaction and socket revocation.
Identity, enrollment and request history are preserved; restoration retains other login gates.
Student/Admin role filters hide irrelevant desks and clear a stale desk selection.

All reporting roles use visible draft filters with combined Student ID / Name and a header Export
action. Export uses applied filters and is blocked for dirty/loading/failed scopes. Search is a
parenthesized exact ID or literal name match within the existing college restriction. Finance
continues selecting complete paid groups before expanding document CSV rows. Fees and structured
purpose details become readable text; date/time includes seconds in Manila, without ISO syntax.
Numeric amounts, the 36-column contract, private exclusions and spreadsheet escaping remain.
Also repaired the Receiving Desk alias's inactive report hook. Real SQL verification found the
fresh schema omitted payment_channel even though the historical Phase 19 migration and reporting
SQL already require it; added that existing nullable column to the fresh-install template. This
is not a new cloud migration. Existing installation data and migration scripts are unchanged.

Final full suites: **1,522 backend tests / 116 files**, **959 frontend tests / 104 files**;
frontend lint, production/PWA build and whitespace checks pass. **Nine real MySQL checks** pass
on isolated synthetic local data: scoped document/student search, literal wildcard handling,
status/version/history preservation, audited restoration, complete Finance groups/readable CSV,
exact student-registration timestamps, and fresh-schema import/preflight/document/Finance reads.
No cloud database, actual users, uploaded proof or external mail was used. **32 report browser
configurations** pass across four role portals, four widths and two themes, with applied export
scope, dirty blocking, retained drafts, acknowledgments and keyboard containment; four additional
320px/200% text and reduced-motion checks pass. **16 analytics browser configurations** pass at
100/200% text, with independent direct Support loading and retained dates. No browser page errors.
Three synthetic actual-component screenshots were visually inspected; the existing README and
CSV sample are updated. No separate batch acceptance Markdown was created.

The existing five cloud migrations and internal health remain confirmed from the user's SSH
output. This follow-up needs **no additional migration**, dependency/environment change, AI
rebuild or n8n import. Publication is to **dev only**; main is not merged and cloud/frontend
release is not performed here. Cosmetic icons, tracker/compact filter styling and the whole-system
redesign are deferred until the user's new Figma reference. Living Help/manual/workflow/backend/
environment/defense/deployment guides are synchronized with these functional changes.

## Comprehensive Admin review — findings before edits — 2026-10-12

The user requested four new Admin-focused batches while retaining the main Figma/shared modal
styles. They confirmed Reports & Export should restore visible filters consistently across all
report roles, merge Student ID/Name search, and keep Export at the upper right. Both Fee Breakdown
and Purpose currently show structured JSON; timestamps need readable exact Manila date/time.
No main merge is authorized by this review; publish verified changes to dev only.

Scope steering: the user is preparing a new Figma redesign for the entire system and requested
functionality first. Defer icon/button styling, tracker layout and compact filter restyling until
that reference arrives. Removed the provisional icon/compact-row presentation changes. Continue
duplicate navigation removal, independent analytics views, truthful metric wording, account
deactivation/reactivation and relevant filters, combined report search and readable CSV. Existing
shared controls/modals remain. Visible report filters are treated as the expressly requested
workflow placement change, with no new design language.

Inspection finds Admin navigation adds Internal Assistance although Support already hosts it;
SupportWorkspace exposes another Admin analytics modal, and AnalyticsPanel stacks support below
document metrics and blocks both behind document loading/errors. Consolidate Admin entry points,
retain old notification links and drafts, and provide independent Document Efficiency/Support
Analytics subtabs. Tracker/attachment actions are underlined text, and the OCR KPI falsely calls a
field-detection ratio accuracy. The parser counts detected ID/name/form type, not validated model
accuracy. Maintenance passes no student status callback and its backend status handler accepts
staff only; add audited student/alumni deactivate/reactivate with existing session revocation,
confirmation and record preservation. Compact context-appropriate filters and narrow-screen rows.
Report CSV explicitly JSON-serializes fee lines and emits ISO Manila timestamps; inspect Purpose
structure before formatting it, preserving stored details and CSV escaping/formula protection.
Use shared controls; keep desk/college/report access and all existing legal workflow gates.

## Production alumni missing-proof registration — completion — 2026-10-12

Removed the demo-only runtime and Admin-review gates and replaced the registration-options
contract with proof_unavailable_enabled. Alumni can explicitly apply with unavailable proof and
a bounded reason in production. Registration always stores a pending account without a proof
file or AI approval; contradictory proof attachment plus missing-proof marker is rejected before
account creation. Current students still upload proof, and a malformed current-student exception
cannot be approved. Only Admin decides with recorded evidence/basis; the existing audit and
identity decision commit together. Pending login, profile/email/request gates and uploaded-proof
Read ID remain unchanged. Removed the obsolete demo environment setting and UI copy. Confirmation
includes the missing-proof reason, preserves cancelled/failed drafts and keeps shared modal styles.

Validation: final full **1,508 backend tests / 115 files**, **954 frontend tests / 103 files**,
lint, production/PWA build and whitespace checks pass. An auto-approval mutation fails the new
pending-account regression; restored source passes the focused suite. **Seven real MySQL service
checks** in production mode on the isolated synthetic local test database pass: enabled options,
current-student denial, saved pending account/years/reason, denied pending login, required review
evidence, actual atomic approval/audit and approved login with zero historical documents. Email
ownership remains unverified after identity approval. No production data, external mail or real
proof was used. **16 browser configurations / 32 signup-confirmation screen checks** pass at
320/375/768/1440 px, both themes and 100/200% text; checks cover contained layout, trapped Tab,
Escape/draft preservation, restored student proof and one synthetic multipart submission without
attachment. No page errors. New README screenshots were visually inspected after exit animation
settled. The initial browser package was incomplete and reconstructed from its pinned package;
test selectors were corrected to the actual Create Account button and synthetic-email text.

Updated living Help/manual/workflow/backend/environment/defense/rollout docs and the consolidated
ledger. Cloud migrations and internal backend/database health are confirmed from the user's SSH
output. This follow-up adds **no migration**, dependency, AI/n8n change or environment variable.
The repaired backend and matching frontend still need publication on the cloud; main remains
unmerged. Work is published to dev only, with no per-batch acceptance Markdown.

## Production alumni missing-proof registration — findings before edits — 2026-10-12

The user confirmed a successful cloud internal /api/health response with database ok after all
five migrations. The earlier connection refusal was initial startup timing. Main merge, matching
frontend release, public health and full workflow acceptance are still unconfirmed.

Before final release, the user asked why alumni still require proof. The implemented register,
registration-options and Admin-review gates hard-disable missing-proof applications in production,
and signup/Admin UI calls the flow a defense demo. This does not satisfy the intended final alumni
workflow. Enable an alumni-only missing-proof application with a bounded reason in production,
always pending, no OCR/automatic verification, and Admin-only transactional decision/evidence audit.
Keep current-student proof, identifier/study-year validation, pending login denial, email/profile/
request gates and uploaded-proof OCR intact. Remove the obsolete demo setting/copy; use existing
cloud-applied columns/tables, with no new migration or permissive identity auto-approval.

## Cloud migration confirmation; runtime readiness pending — 2026-10-12

The user's cloud SSH output confirms `trace_db` and an initial presence check reporting only the
five Revision 2 follow-ups. All five actual CLIs then printed successful completion in ledger
order; final `check_schema.js` passed. Updated the consolidated ledger from cloud-pending to
cloud-applied based on these user-provided logs. No direct SSH or record inspection by the agent,
additional migration, application code change, main merge or frontend release is claimed.

The user recreated backend and restarted AI/n8n. Their immediate container listing shows backend
up two seconds with health starting, followed by an internal curl connection refusal on port
3300. This may be initial startup timing; readiness is unconfirmed. Next steps are retry status
and internal/public health, then recent backend logs if unavailable. Migration reruns are not
needed for this health check. Keep final merge/frontend release pending runtime health and
matching workflow acceptance. Backup waiver for the current early test rollout remains recorded.

## Isolated test migration application — 2026-10-12

The user authorized applying the five recorded migrations to a staging/test database. No external
staging or SSH database connection is available in the workspace, so the work used a separate
local MySQL 8.0.46 test target with synthetic records. The user then asked who performs cloud
migrations; clarified that local application is performed here, while cloud commands still run
through the user's SSH session. No production or existing external staging connection was used.

Prepared `trace_staging_test_20261012` with the current schema's earlier prerequisites and only
the five new migrations omitted. Refused to recreate an existing target. Initial preflight
confirmed that all reported gaps belonged to those five scripts. A baseline logical backup was
restored into a separate local database with identical DDL/records across **41** tables. Applied
the five actual CLI entry points in ledger order using code commit `281179f`; all exited zero,
then the complete read-only schema CLI passed with zero missing fields. The final target has
**54** tables, including thirteen new InnoDB tables. All existing synthetic records were unchanged;
saved fees, historical OR, graduation/attendance years and clearance survived. Nullable routing/
study-year defaults, nonblocking historical clearance and the full leading OR-number index were
verified; no automatic pack activation or ticket/conversation/audit import occurred.

Recorded **11** passing checkpoints, script hashes/completion times, baseline and migrated logical
backups in the local test workspace; shut the isolated server down cleanly and retained its data.
Updated the existing consolidated ledger to distinguish local-applied from cloud-pending. This is
database operations/documentation only, with no runtime code/dependency/environment change,
per-batch acceptance Markdown, main merge or deployment. All five cloud migrations remain pending;
real role-workflow acceptance, delivery and phone/printer checks remain separate. The user waived
mandatory backup/restore steps for the current early test rollout because the system has no major
data yet. Recorded this preference in the consolidated checklist; prerequisite checks, preserving
migrations and writer-stop checks remain. The already-completed local restore check needs no
additional user action.

## Deployment readiness — optional Docker frontend and migration rehearsal — 2026-10-11

After publishing the integration review, the user authorized continuing while they rest. The next readiness audit confirms backend image packaging includes database scripts, application startup does not execute migrations, and README/docs links resolve. It found the optional local-frontend Compose profile builds with blank VITE_API_URL for same-origin requests, but frontend/nginx.conf has no API or Socket.IO proxy. The Dockerfile says that proxy exists. Login/API calls therefore fall into the SPA response, and WebSocket upgrades cannot reach the backend. Repair this optional profile’s proxy and verify real HTTP/multipart/WebSocket behavior against an isolated synthetic backend if a local Nginx runtime is available. Preserve SPA deep links and static caching. This does not change Vercel’s separately configured API origin, live infrastructure, stored records or migration requirements.

The same audit found older README/environment quick-start commands still invoke the broad historical migration after importing the now-complete fresh schema, despite the preserving rollout guide explicitly rejecting that shortcut for existing installations. Use the read-only schema preflight in fresh-install recipes and direct existing installations to the consolidated preserving ledger. Do not execute the broad migration or alter production data.

Implemented the same-origin API/Socket.IO proxy with complete URI/query/auth/body forwarding,
streamed multipart requests, explicit WebSocket headers and a 75-second read timeout. Backend
Multer still owns per-file limits; SPA deep links and static caching remain. No Vercel, application,
dependency, environment or schema change. README/environment fresh-install recipes now use
read-only preflight; seed.sql already includes the seven Secretary demo accounts. Existing
installations are directed to the preserving rollout rather than broad historical data updates.

Validation: **11 real Nginx checks pass**, including >15 MiB multi-file upload, private bytes/errors,
JSON API 404, REST headers/body/query, SPA/reset deep links, immutable assets and both direct
WebSocket and polling upgrade. **11 isolated MySQL 8.0.46 checks pass**: complete fresh schema,
five incremental migrations, unchanged synthetic historical accounts/years/fees/OR/requirements,
nullable/nonblocking defaults, no automatic pack activation, two preserving reruns across thirteen
populated tables and saved print format. Actual staff service calls verify simultaneous pair
creation, idempotent replay and Admin read-only monitoring; actual linked-support SQL follows saved
routing college after a profile change and authorized cancelled-history fallback. Initial QA
connection failed because the prior test server was in another execution network; the final
server and checks ran together and shut down cleanly. No production database, mail, Docker stack
or deployment was used. The preceding full suites remain **1,501 backend / 953 frontend tests**;
this follow-up changes only Nginx and docs. Production migrations remain unapplied, with genuine
staging delivery/receipt contention/printer/phone and backup restoration still required.

## Cross-batch integration review — completion — 2026-10-11

Support now follows student/legacy ticket and general-context notification changes on a mounted screen. Explicit ticket links take priority; obsolete context lookups are aborted and cannot overwrite selection. An actual-component browser check confirms that a new-ticket form draft survives notification selection changes.

Receiving Desk now renders the normal Window 1 dashboard, passes the existing intake/release guards, appears among active Admin backup candidates and receives Window 1 workflow notifications. Canonical desk comparison keeps another processor’s assignment binding across Window 1/Receiving Desk labels. Stored identities, college restrictions and legal transitions are unchanged.

Linked ticket list/history/file authorization and authorized legacy chat history now honor the existing routing_college_id, matching desk processing and reports. Unsnapshotted records fall back to the verified student profile; cancelled ticket history without a surviving document retains its authorized profile-based scope. Shared SQL keeps its correlated student alias. An opaque authoritative list-scope digest lets the frontend discard cached rows/selection after college/desk scope changes. Denied 403/404 reads clear protected conversation context/history; local drafts and data during ordinary temporary errors are retained.

Validation: full **1,501 backend tests / 115 files**, **953 frontend tests / 103 files**, lint, production/PWA build and whitespace checks pass. **Eight Chromium actual-component notification/draft cases** cover 320/375/768/1440 px in both themes, plus denied-history/composer clearing and changed-scope selection clearing; no page errors or writes. Temporarily restoring the old desk-label and missing-routing-snapshot logic makes the new security regressions fail; the fixes were restored before full verification. The migration audit confirms **32** unique existing scripts, ordered relevant prerequisites and all **13** new-migration table definitions present in fresh schema. **181** README/docs local links resolve. No new migration, dependency or environment variable; the five Revision 2 follow-up migrations remain unapplied. Genuine MySQL contention, delivery, printer and phone checks remain staging work. Publication is dev only, without merge or deployment.

## Cross-batch integration review — findings before fixes — 2026-10-11

The user authorized continuing after the additional chat connections. The review found that the student/legacy RequestMessagesPanel never forwards notification ticket changes to useSupportTickets, whose initial selection reads the URL only once. General-support context changes also lack a reactive dependency, and an in-flight document-context lookup can overwrite a later explicit ticket selection. Follow route queries without remounting drafts and abort obsolete context lookups; explicit ticket links take precedence.

The application already treats Receiving Desk as the Window 1 alias for navigation, walk-in filing, support and staff coordination. DashboardPage nevertheless renders no normal dashboard for that alias, document intake/release requires the literal Window 1 label, backup selection omits Receiving Desk, and assignment enforcement compares the two raw labels as different desks. Normalize the alias at these boundaries without changing stored identities, college scope, document stages or ownership. Another processor's assignment must remain binding across both labels. Window 1 workflow notifications should include active staff using either label.

A further boundary check found linked support list/history authorization still derives only from the current student profile, omitting the saved routing_college_id added in Batch 8. Use that existing routing snapshot for case conversations and the legacy read-only history, with profile fallback only for unsnapshotted rows. Support lists also merge old rows across changed authoritative college/desk scope, and conversation read failures leave protected cached content visible. Add an opaque authoritative scope marker and discard cached rows/history on changed scope or denied reads; preserve local drafts and ordinary temporary-error behavior.

Review the consolidated migration order and affected workflow documentation. No new migration, environment variable, Figma theme, per-batch acceptance document, merge or deployment is proposed. Local mocked regressions cannot substitute for real MySQL, delivery, printer and phone staging checks.

## Additional operational chat connections — completion — 2026-10-11

Following the user's explicit authorization, the previously deferred TRACE-78 connections are implemented. Support now groups student/case tickets, staff coordination and internal assistance. Window 1's student communication retains its existing ticket/FAQ/queue flow; Finance/Secretary case discussions keep existing document/college access. Ordinary staff recipients are active Window 1/Receiving Desk, Finance and Secretary accounts; students, Admin, self and unsupported desks are excluded. Secretary peers must share an active resolved college; a Secretary's college is snapshotted for coordination with global desks. No new cross-college request access or student attachments are imported.

Separate preserving staff conversation/message/event tables enforce unique participant-pair/college scope and actor retry keys. Sorted account locks precede pair/thread writes; first-message creation and sends commit message/audit/update together, with bounded deadlock retries. First-message review/cancel/failure retains the same retry key until content/recipient changes or acceptance; direct Send has a synchronous duplicate guard and retains failed drafts. Accepted sends survive failed refreshes and notifications. Staff participants alone read a thread; active Admin monitors all operational staff history but cannot pick recipients, open conversations or send. Changed/inactive peers make retained history read-only; a changed Secretary loses old-college access. Refreshed authoritative scope or access denial clears cached protected history. History pagination bridges missed middle pages after reconnect, and notification query changes open the requested conversation.

The workspace reuses the main Figma messaging hierarchy (260:3301), local Support icon assets at intrinsic size, dynamic initials, shared QueueTabs/ModalShell/ConfirmDialog and success toasts. Visited categories preserve drafts; inactive category dialogs/toasts do not appear. A browser check found Staff Coordination's heading overflow at 320 px/200% text; using the shared page-header layout with wrapping fixes it. No fabricated presence, read-receipt or unread marks. Staff conversations remain separate from student support metrics/AI and Internal Assistance authority.

Validation: **1,488 backend tests / 114 files**, **941 frontend tests / 101 files**, final focused UI checks, lint, production/PWA build and whitespace checks pass. **48 Chromium actual-component layout cases** cover staff/Admin/unavailable-peer, 320/375/768/1440 px, both themes and 100–200% text. Additional checks cover composer reachability, Admin read-only rendering, drawer Tab containment/Escape, category draft retention, cancelled first-message confirmation, enlarged mobile create controls, reduced motion and visible asset loading/geometry. Screenshot fixtures are synthetic. Transaction tests simulate opposite-direction concurrent opens, retries and rollback; no live MySQL concurrency, actual phone, delivery or production outcome is claimed.

README screenshots/walkthrough/local seed credentials and living Help/manual/workflow/backend/environment/defense docs are updated. No per-batch acceptance file. New `migrate_staff_conversations.js` is additive/rerunnable, with matching fresh schema/checker entries; the consolidated rollout now lists **32 existing scripts**, with matching staff DDL and separate metrics sources verified. It creates no accounts/conversations and imports no student/internal history. All new migrations remain **unapplied**; no dependency/environment/AI/n8n change, main merge or deployment. Publication is **dev only**. This completes the authorized additional recipient-connection phase.

---

## Additional operational chat connections — inspection — 2026-10-11

User explicitly authorized implementing TRACE-78's previously deferred connections after Batch 13. Existing Support already provides Window 1↔student ticket communication and college-scoped case discussions; it has no staff recipient directory or pair conversation store. Internal Assistance is already a separate creator/Admin queue. Implement additional staff coordination without bypassing student tickets, importing student files or expanding Secretary request access. Reuse the main Figma messaging frame (260:3301), shared controls/modal confirmations and supported desk identities. Fresh active staff/college checks must govern directory, list, detail and writes; Admin monitors operational staff conversations read-only. Recipient pairs should reuse one thread within their recorded college scope, with durable retries, bounded history and generic private notifications. No fictional presence/read indicators or per-batch acceptance document. Record the new preserving migration in the consolidated rollout before publication.

---

## Revision 2 Batch 13 — Internal Assistance — completion and integration review — 2026-10-11

TRACE-77/78 are the final entries in the newer 13-batch guide. Inspection found no separate private staff-to-Admin ticket store or lifecycle, and operational support still allowed Admin intervention. The existing Figma Support frame (260:3301) provides the two-column ticket/conversation hierarchy, but no dedicated internal-assistance frame. This implementation reuses that hierarchy, shared confirmation/modal styles, readable aligned cards and toasts rather than adding a new visual theme.

Window 1 (including Receiving Desk), Secretary and Finance now create their own text-only concerns in Internal Assistance. Fresh active account/desk authorization scopes staff to their own tickets; active Admins inspect the queue, claim before replying, and only the assignee manages awaiting-staff, resume and mandatory-note resolution. Staff replies retain assignment and resume handling. Creator or assigned Admin may reopen into the unassigned queue with retained history. Explicit takeover is restricted to an open concern whose assignee is inactive or no longer Admin. Ticket locks arbitrate competing Admins; actor locks, durable retry hashes/keys and version checks protect duplicate/stale actions. Failed sends retain drafts and retry keys; post-commit private notifications do not import concern text or student files.

Admin operational student support is now read-only in API and UI, including case-specific attachment mutations. Global catalogs, support settings and analytics remain administratively accessible. Internal tickets, messages and events are stored separately and excluded from existing student support metrics/AI. TRACE-78 remains a documented matrix/category specification: no new ordinary recipient connections, presence or read/unread claims were implemented.

Local verification: full backend suite passes **1,449 tests / 111 files**; final full frontend suite passes **919 tests / 99 files**, with 22 focused internal-workspace/routing checks. Lint, production/PWA build and whitespace checks pass; the existing bundle-size advisory remains. Earlier Chromium verification passed **48 actual-component** staff/assigned-Admin/unassigned-Admin width/theme/100–200% text cases, plus drawer keyboard focus/Escape, cancelled-draft preservation, resolution confirmation and reduced-motion checks. Screenshots use synthetic records and are linked with navigation and local seed credentials in README. Mocked transactions and local browser checks do not establish live MySQL contention, notification delivery, physical-phone or printer acceptance.

The bounded integration review found notification links changed the query without updating the already-mounted internal conversation; the route now passes its ticket query and the hook follows it, with regression tests. It also corrected stale Year Ended, export-button and manual-OR walkthrough copy in the living Help/manual/backend/defense guides. All **31** ordered migration scripts exist, relevant dependencies precede the new scripts, internal migration DDL matches fresh schema, and README/docs local file links resolve. The consolidated deployment ledger includes `migrate_internal_assistance.js` and all earlier pending migrations; none were applied. No separate acceptance Markdown, new dependency/environment variable, main merge or deployment. Publication remains **dev only**. The newer numbered guide is complete; ordinary chat connections remain deferred pending their separately agreed scope.

---

## Revision 2 Batch 12 — Finance Receipts — completion — 2026-10-11

TRACE-71/72/73/74 now add the Official Receipts / History pill beside Finance verification, a shared configurable 50-number paper pack, permanent serial reservations, immutable issued snapshots and receipt-specific copy uploads. Finance chooses the numeric segment of a complete serial and confirms the first three/50th preview. Issuance runs under document/control/pack locks with serial, active-group and retry-key uniqueness; managed payment approval commits clearance and issuance together. Later remains payment acknowledgment without OR issuance. Stale displayed serials require refresh/review, successful retries reuse the issued receipt, and the 51st issuance requires a new pack. Early replacement needs a reason and never recycles unused numbers. Existing historical manual receipts remain intact and cannot use reserved managed serials.

The reviewed payor name preserves the original profile name; saved amounts use integer centavos, recorded payment references and the authenticated cashier. Copy validation checks JPEG/PNG/PDF size and content; uploads, previews and reprints allocate no numbers. Print requests/reprints, copy publication, pack changes, calibration and pre-Secretary voids are audited. Voids preserve paid payments while consuming the original number permanently. Printing uses the saved snapshot in a sandboxed iframe with full/demo and data-only modes, saved paper/margin/offset settings and an overflow guard. Unknown printer geometry is explicitly illustrative; physical success/alignment remains a real-printer check. Groups beyond the supported 12-item print layout require review rather than clipped printing.

Local verification: full backend suite passes 1,410 tests in 108 files; frontend suite passes 895 tests in 97 files. Lint and production/PWA build pass. Chromium passes 64 actual component mode/width/theme/100–200% text cases, plus draft-preserving pack preview/cancel and reduced motion, with no page errors. The existing chat-scroll assertion now waits for its asynchronous effect rather than checking immediately after message text renders. Tests cover permissions, rollback, lost-response retry, stale serials, modeled competing cashiers at 49/50, the 51st issue, pack overlap/replacement, content validation, exact copy publication, print audit and void/handoff gates. These mocked/unit checks do not establish live MySQL contention, notification delivery or physical-printer acceptance.

Screenshots, navigation and local seed testing credentials are consolidated in [README.md](SYSTEM_WORKFLOWS.md#managed-finance-receipts). Per user instruction, the five old per-batch acceptance Markdown files and the obsolete Batch 8b plan are removed; related links point to the README. The consolidated progress and deployment records remain. New preserving migration: `backend/database/migrate_receipt_packs.js`, with a preserving OR-number index, fresh-schema and read-only preflight entries. [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md) records it as not applied and the complete rollout order now has 30 scripts. No new dependency/environment variable, live migration, main merge or deployment. Publication is dev only.

---

## Revision 2 Batch 11 — Support Analytics — completion — 2026-10-11

TRACE-69/70 now use the Admin Figma dashboard (93:663) card hierarchy for six recorded support KPI summaries, detailed categories/backlog and borderless semantic duration/FAQ/workload tables. Reporting period, imported-cohort exclusions, FAQ denominators, historical cutoff, service/wall minutes, episode counts and missing-versus-zero distinctions remain. Tables have contained scrolling, aligned values and readable No data; the parent no longer nests the whole view inside another card. Date drafts stay explicit Apply, and refresh failures retain labeled previous results for retry. Backend/AI calculations, endpoints and permissions are unchanged.

Local verification: full frontend suite passes 887 tests in 95 files; final focused analytics suite passes 10 tests in 2 files. Existing backend metric/report regressions pass 15 tests in 2 files. Lint, production/PWA build and whitespace checks pass. Chromium passes 80 state/width/theme/text-size cases, plus keyboard scrolling/focus, No data contrast, stationary informational hover, reduced motion and draft/error/retry checks. Screenshots and an account-free walkthrough are in [system workflows](SYSTEM_WORKFLOWS.md); synthetic checks do not establish live metric outcomes or physical-phone acceptance.

No new migration, environment variable, API contract or dependency. [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md) records Batch 11 as None and retains previous prerequisites. Publication remains dev only; no main merge, live migration or deployment. Next: newer guide Batch 12, Finance Receipts.

---

## Revision 2 Batch 11 — Support Analytics — inspection and implementation — 2026-10-11

TRACE-69/70 from the newer guide. Inspection found `SupportAnalytics.jsx` using scattered plain-text FAQ/category/backlog summaries and a boxed duration table, plus a surrounding AnalyticsPanel card duplicating its container. The existing API already supplies cohorts, FAQ denominators, historical backlog, service/wall durations, imported distinctions and workload episodes. The Admin Figma dashboard (93:663) supplies rounded white cards, a label/value/context hierarchy and soft green context strips; it has no dedicated Support Analytics frame. Decorative mock trends, baseline percentages and unrelated dashboard assets are outside this presentation scope.

Implementation now groups recorded summaries into six KPI cards, categories/backlog tally panels and semantic, borderless duration/FAQ/workload tables. Date drafts remain explicit Apply; previous loaded period is labeled during refresh/failure; failures stay inline with retry. Measurement notes, units, missing-vs-zero, authorization and backend/AI definitions remain. No migration, API contract, environment variable or new dependency is planned. The inspection/implementation record is retained here; completion and verification are recorded above. No live database or deployment action.

---

## Revision 2 Batch 10 — Support / Messaging UI — completion — 2026-10-11

TRACE-61/62/63/64/65/66 now use the main TRACE Figma conversation layout and local original illustration/icons. Shared rows fix selection contrast/alignment; header controls distinguish confirmed availability, primary FCFS claiming and creation. Linked-case viewing sits in selected context. Local search covers loaded authorized ticket metadata, with no invented unread/presence/read/snippet data. Success toasts stack outside layout; errors and confirmation behavior remain. Full/compact conversations preserve FAQ, reply clocks, protected files, requirements, cursor history and retry-safe sends. The compact widget retains drafts across close/reopen and restores focus; digital evaluation separates persistent form/discussion panels with a mobile switch and pinned decisions.

Verification: 876 frontend tests in 94 files pass, followed by 26 final focused regressions. Existing backend support/attachment regressions pass 31 tests in 2 files. Lint/build/whitespace checks pass; 64 mocked Chromium role/theme/width cases plus 200% text, drawer keyboard focus/restoration, independent scrolling, composer reachability, reduced motion and local assets pass. Screenshots and walkthrough are in [system workflows](SYSTEM_WORKFLOWS.md). No live database, physical-phone or delivery claim is made.

No new migration, environment variable, API contract, dependency or staff chat connection. [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md) records Batch 10 as None and retains previous migration prerequisites. Publication is to dev only; no main merge, live migration or deployment. Next: newer guide Batch 11, Support Analytics (TRACE-69/70).

---

## Revision 2 Batch 10 — Support / Messaging UI — findings — 2026-10-11

Scope: TRACE-61/62/63/64/65/66. Inspected the main TRACE Figma workspace (260:3301) and compact empty/conversation frames (254:987, 258:1093), plus the three supplied reference images. Staff chat connections remain deferred; this batch preserves the existing ticket/desk/college rules.

Findings before edits: SupportWorkspace uses centered trace-button markup for every queue row and its selected aria-pressed secondary styles conflict with the pale surface. The header mixes availability, queue claiming, creation and administration; “Open linked case” opens a new-ticket form. Action notices occupy the list layout. SupportConversation already has protected attachments, reply/FAQ/requirements actions, cursor history and duplicate-safe sends, but mixes queue/hours notices with context and uses broad card-like messages. SecretaryEvaluationModal embeds a 70dvh support workspace below form fields, making one long scroll. FloatingSupportChat lacks Escape/focus restoration and discards drafts on close. The API has no unread/read-receipt/presence or last-message snippet fields; local search will clearly search loaded authorized ticket metadata and show real status/context instead of fabricated message metadata. No new backend capability or DDL is planned.

Findings recorded before source edits; implementation and final evidence are recorded above. Publication remains dev only; no main merge, live migration or deployment.

---

## Revision 2 Batch 9 — Reports & Export — 2026-10-11

TRACE-58/59/60: all report/export configuration now uses the shared Filters & Export modal across Admin, Window 1, Secretary and Finance. Draft/Apply/Reset/Cancel semantics prevent keystrokes from changing reports; current-scope/pending/error guards protect exports. Student ID/name, authoritative college and document type filters are validated server-side and share row/KPI/export scope. Secretary filters cannot expand its assigned college. The shared 36-column document CSV uses complete filtered sets, explicit Manila timestamps, numeric PHP values, recorded fees and safe formula/RFC quoting; oversized document exports refuse rather than truncate. Finance retains complete payment groups on screen and exports one row per document in those groups. Separate student-category exports retain their own row unit and apply identity/college filters.

Local checks: 1,374 backend / 866 frontend tests pass, followed by 49 focused final regressions; lint/build and whitespace checks pass. Responsive synthetic browser evidence and the sample CSV are in [system workflows](SYSTEM_WORKFLOWS.md). No new migration in this batch; [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md) consolidates Batch 7/8 migrations and prerequisites for the final rollout. No live migration, merge to main or deployment is included. Next: newer guide Batch 10 (Support / Messaging UI).

---

## Revision 2 Batch 8 — Intake / College Scope / Staff Assignment — 2026-10-10

Implements TRACE-55/56/57/67/68 from the newer guide. Explicit catalog-based intake requirements block routing until accepted; saved college routing scope governs own-college Secretary lists, reports/exports, details, actions and files. Alumni route to their recorded former college. Admin alone can confirm and audit eligible backup assignments within the current desk/college, with stale-save protection. Missing legacy scope can be reconciled from institutional records without rewriting saved snapshots or closed history. Existing payment/OR prerequisites and physical handoff remain. Shared QueueTabs/QueuePanel align pills, keyboard semantics, spacing and visible context/hover motion across roles, with reduced motion.

Verification: the full backend suite passes 1,357 tests; the full frontend suite passes 871 tests, plus focused regressions added for the final reconciliation path. Lint/build and whitespace checks pass. Synthetic Chromium covers 56 layout cases, enlarged text, both themes, context motion, fixed hover targets and reduced motion. Screenshots, causes, reproduction and deployment limits are in [system workflows](SYSTEM_WORKFLOWS.md).

The additive intake-scope migration has not run on a live database. Matching API/frontend rollout and live acceptance remain required. Publication is to `dev` only; no merge to main or deployment is included. The next guide batch is Batch 9 (Reports & Export).

---

## Revision 2 Batch 7 — Alumni / Request Forms — 2026-10-10

Implements the new-fixes guide's TRACE-52/53/54/75/76: persisted one-time alumni study years, saved read-only Year Started in requests with Year Ended removed, Admin corrections with transactional before/after audit, duplicate attachment-label cleanup, pending alumni proof-unavailable defense demo, and independent inline Reset Password eye icons. Figma references are New Request 85:1514, detailed confirmation 177:691 and compact confirmation 183:741; the selected approach uses detailed review for forms and compact confirmation for simple decisions. Approved pricing, multi-document intake, identity/email/request gates and historical request details remain.

Verification: backend **1,323**, frontend **866** tests pass; lint/build pass. Synthetic Chromium checks cover six form/dialog types at four widths in both themes (**48 cases**), plus 200% text/reduced-motion/keyboard checks. Screenshots and reproduction are in [system workflows](SYSTEM_WORKFLOWS.md). The older guide Batches 1–6 are separate; this is Batch 7 of the user's newer fixes, not another whole-app/shared-control pass.

The additive alumni migration has **not** run against a live database; matching API/frontend rollout is required. Proof-unavailable registration defaults off, is blocked in production, and still awaits institution evidence-policy approval for any production version. Rejected applicants now reuse their original account instead of deleting audit/history. Existing historical years are not normalized on unrelated profile saves. No merge to main or deployment is included; the authorized publication target is `dev` only. The next guide batch is Batch 8 (intake/staff request access).

---

# Project TRACE Progress Report

Current request-by-request index: [PROGRESS.md](PROGRESS.md). The Support redesign has its own [implementation checklist](SUPPORT_DESIGN.md); incomplete features are not accepted merely because another feature passed.


### Unified Support round — completed local implementation and validation, 2026-10-06

TRACE-28–41 and the approved chat-file additions are implemented: one role-scoped ticket workspace, canonical FAQ matching/explicit escalation, durable FCFS/one-live-clerk assignment, Manila hours/exception settings, explicit reply clocks with warning/Awaiting student/fair requeue, private content-validated files, composer requests, immutable requirement events/replacements, terminal/cancelled history, bounded incremental retrieval, separate Support metrics and aggregate-only Flask advice. Secretary/Finance review dialogs and Finance navigation now use the unified workspace; old sends reject stale clients instead of creating split histories. Admin maintains an empty approved supporting-document catalog. The last Maintenance account search was removed as requested; FAQ topic matching remains the separately approved assistance feature.

Final review findings and repairs: older query suggestions could remain visible during a new FAQ query; results are now query-scoped and aborted stale responses are ignored. File-controller regressions verify cleanup after invalid/failed/retried sends and denial before multipart parsing. The enlarged-text browser follow-up found Send clipped in the compact Secretary composer; input and Send now share a row, with secondary attachment controls below. Scope remains inside the bounded chat, preserving direct sends, disabled/busy guards, file limits and drafts. No document/pricing pipeline or role boundary was changed for presentation.

Validation: **1,283 backend tests / 97 suites**, **825 frontend tests / 87 suites** and **five Python support-insight tests** pass. ESLint, production build and `git diff --check` pass; the existing >500 kB frontend bundle advisory remains. **177 synthetic browser assertions** pass across all five roles, 320/375/768/1280 widths, both themes, 100/200% text and full/compact layouts, including stationary input/visible Send, context/history containment, keyboard focus trap/Escape restoration, paperclip dialogs and reduced motion. The latest mobile dark 200% screenshot was inspected.

Actual isolated MySQL checks pass: fresh schema, schema preflight and repeated migrations; ten concurrent general creations → one ticket; nine claims across three clerks → oldest three tickets / one slot each; six requirement requests → one requirement. Rejection/correction/acceptance/replacement retains five original events and two uploads. Cancellation keeps read-only history and private file authorization. Cursor traversal retrieves all **26 synthetic tickets and 85+ messages** through capped pages without missing/duplicate IDs. Separate legacy import preserves three source messages/senders across two tickets with no empty request ticket. The earlier stale-snapshot race and initial pool-queue failure are recorded, corrected and rerun, not counted as passes.

Controlled local capacity: 100 authenticated Socket.IO clients connected before the burst; 100 acknowledged/durable messages, zero burst errors or missing/duplicated/cross-owner messages, 20 exact retries, ten reconnects and foreign-ticket HTTP 403. Latest p95 save **558 ms**, read **392 ms**, on Darwin arm64 / Node 25.6.0 / MySQL 8 loopback / pool 10 / queue 200. This excludes uploads, Caddy/TLS, WAN and browser rendering, and does not establish production capacity. Reproducible opt-in synthetic checks are in backend/database/check_support_integrity.js and check_support_capacity.js; production credentials/database are never used by those checks.

The original defense-guide detail, emoji headings, tables, diagrams, question bank and three-presenter script are retained, with content corrected to current code and evidence. Manual/Help, workflows, backend/environment/migration instructions, metrics definitions and feature matrix/checklist are synchronized. Eleven guide files pass local-link/code-fence checks; the complete incremental rollout contains 27 existing ordered scripts. New-only Support rollout includes preserving password-reset/payment-method repairs, separate graduation year, ticket import and supporting-document migration, matched backend/AI/frontend, off-server backup checks and live acceptance.

**Remaining acceptance:** matched rollout and real import ownership/counts, Registrar catalog entries, real-phone/keyboard layouts, actual email/SMS/notification delivery, a test restore and matching controlled staging capacity. SEC-01 remains design/sign-off gated; the Finance inbox investigation was discontinued by the user. No production migration/deployment, commit or push was performed by the agent. See SUPPORT_VALIDATION, SUPPORT_IMPLEMENTATION_CHECKLIST and FEATURE_ACCEPTANCE_MATRIX for per-feature evidence and limitations.

### Whole-request audit: remaining account search — 2026-10-06

Finding before repair: Layout no longer has the shared header search, but MaintenancePanel still passes a name/email query to UserGrid, which renders a visible search input. This does not satisfy the user's instruction to remove search bars on every screen. Remove this last page search and its now-unreachable query state while retaining the role/desk selectors and account actions. The newly approved Support FAQ topic matching is a separate requested assistance feature.

### Unified Support tickets and current-system documentation — investigation 2026-10-05

Finding before edits: support_messages groups all general history by student_user_id; document_messages groups by document_id. Neither schema has a ticket subject, state, escalation, assignment or closure boundary. RequestMessagesPanel switches between two tabs and exposes visible page controls. Message reads keep only the latest 100 rows, making older conversation history unreachable in the current UI. Request attachment mutations do not check terminal case status; labels are free text, rejection changes the requirement back to requested and overwrites its latest review fields. Ticket state, case closure and attachment review must remain distinct. The existing document lifecycle treats COMPLETED and legacy APPROVED/REJECTED as terminal; badge color is presentation only.

User approved importing one general ticket per student with messages and one linked ticket per messaged request, initially Queued, without empty request tickets or moving original case attachments. Student ownership, Admin/Window 1 general access, assigned-college Secretary linked access and Finance linked-only access are confirmed. FAQ assistance is a saved ticket state; explicit staff escalation reuses that ticket. Additional scope covers durable FCFS assignment, one live ticket per clerk, Manila Mon–Thu 08:00–16:00 support, observed wait ranges, configurable response warning/timeout, composer-integrated requirements, persisted actionable requirement events, stable duplicate/replacement identity, terminal read-only history and incremental lists/messages. Chat files are limited to three JPEG/PNG/PDF files per message, 5 MB each, with ticket authorization and content validation; user chose retention with ticket history. User confirmed Admin and Window 1 manage global settings, Admin maintains a Registrar-approved stable supporting-document catalog, and COMPLETED plus both legacy terminal statuses are read-only. The controlled 100-user test targets are p95 saves ≤2 s and reads ≤1 s with accepted-message integrity. No ticket implementation or deployment is claimed by this investigation.

Documentation findings: the defense guide/script describe eight stages, semester-based TOR estimates, password reset and Docker as future work, and OCR as a guarantee against fake accounts. Forecast bounds and empirically trained workload recommendations are also overstated. The code has nine stages, rates-only filing, implemented hash-token recovery and Docker deployment; AI forecasting counts step-log events and the classifier fits four coded examples. Current-system guide/script diagrams and wording are corrected within their original emoji headings, comparison tables, detailed question bank and three-presenter format, following the user’s request to update content without replacing presentation. Local verification, proposed work and deployed acceptance remain separate.


### Graduation year labels, validation and separate attendance — investigation 2026-10-05

Finding before edits: ProfileSettingsModal uses unrestricted number inputs for the three school graduation years (placeholder Year); its alumni-only Graduation Year control writes last_attendance_year and allows 1950–2100. auth.service.updateProfile forwards year values into an INT-column upsert without validation, after potentially writing other profile/credential/email changes. Profile completion checks only presence and treats last_attendance_year as the alumni requirement, while Admin labels that value Last Attendance Year. The listed onboarding controller/model now handle tutorial enrollment, not graduation data. User confirmed the 2002 minimum applies only to PLP/college graduation, older four-digit school years remain valid/required, only college graduation is optional for current students, and graduation/attendance must be separate with historical attendance values preserved. Add an explicit nullable graduation_year column without copying/reclassifying old values, synchronize saved reads/completion, validate exact four-digit draft text before writes, and use the current Asia/Manila year as the ceiling. Preserve partial profile updates and existing attendance values; never import schema.sql into an existing database.

Implemented `graduation_year` as a separate nullable profile column, a preserving explicit migration and schema preflight requirement; safe self/staff reads include both meanings. Partial profile updates merge omitted saved values, so editing graduation does not clear attendance. Shared mirrored year helpers validate exact draft text before upload/credential/email/profile writes, with the Manila calendar-year ceiling. UI uses labelled numeric-keyboard text inputs, inline field errors, active-tab completion markers and focus transfer to invalid education. School years remain required for profile completion and accept older four-digit years; college graduation is alumni-required/current-student-optional and starts at 2002. Invalid required saved years fail both UI and API request gates. The actual Graduate Application `year_graduated` input/service also uses the college rule; tutorial onboarding modules and unrelated configurable numeric questions remain unchanged. No existing attendance or application answer is copied into graduation. Help/manual/environment/rollout docs include the new-only deployment path and record the user's successful October 5 follow-up rollout.

Validation: full frontend 86 suites / 813 tests and full backend 82 suites / 1,155 tests pass; after adding three extra invalid-year request-gate cases, the document-service suite passes all 200 tests. Frontend lint/build and git diff --check pass. Regression tests cover malformed/negative/decimal/exponent/incomplete/future values, 2002 college bounds, older school years, Manila New Year, alumni/current-student applicability, partial preservation, saved draft/reload handling and migration reruns. Synthetic local browser checks pass 210 assertions at 320/375/768/1280 px in both themes and 100%/200% text, verifying separate fields, invalid-draft preservation, confirmation blocking, optional college/required school behavior, cancellation and Escape focus restoration. Reviewed the mobile dark enlarged-text screenshot; zero runtime exceptions or API writes. Browser emulation does not replace physical phone testing. Existing build chunk-size advisory remains. Migration and production deployment have not been run by the agent; deploy the new migration before recreating the backend and activate the matching frontend.

### Verification return action and seven-destination More threshold — investigation 2026-10-05

Finding before edits: VerifyEmailPage's AuthShell footer always links Back to Login to /, while a second Return to TRACE link in its body uses /dashboard when trace_token exists and / otherwise. They duplicate navigation only when signed out; App's dashboard route uses the same token-presence gate before normal server session validation. Keep one prominent state-appropriate link in the footer, preserving token stripping, StrictMode single consumption and verification/loading/error messages. navGroupsForUser currently hardcodes five Main slots, making More the sixth control. User confirmed six destinations in Main and More as the seventh control only for seven or more page destinations; Preferences/Logout stay separate. Existing shared SidebarNav handles direct-link/group reveal and role permissions; no new destination or workflow is needed.

Implemented one shared inverse-primary return link: Back to Login (/), or Return to TRACE (/dashboard) when a session token is present. Kept the existing public verification operation and session-validation boundaries. Main now holds six destinations, placing Security Logs in Admin Main and Reports & Export first in Admin More; no destinations or permissions changed. Updated sidebar focus/tooltip regression expectations, verification route tests and Help/manual/UI conventions.

Validation: full frontend 85 suites / 775 tests, lint, production build and git diff --check pass. Synthetic local browser checks pass 115 assertions across 320/375/768/1280 px, both themes and 100%/200% text: one prominent state-appropriate return action for success/expired results, stripped verification hash, contained layout, six Main destinations before More, keyboard group/focus transfer, Preferences/Logout availability and direct-route reveal. Mobile dark enlarged-text result screenshot reviewed. All 64 confirmation requests went to the local synthetic fixture; no production verification email/token or account was used. Zero browser runtime exceptions; existing build chunk-size advisory remains. Frontend deployment only, with no migration/configuration/backend change.

### Registration proof framing and preview — investigation 2026-10-05

Finding before edits: ProfileSettingsModal and UserDetailModal render saved proof through FileUploadField, whose image is not interactive and download is a small standalone text link. AccountVerificationModal separately wraps AuthedFilePreview in a large gray panel; only images open the viewer, and there is no explicit Preview cue. ImageViewerModal uses the shared modal focus/Escape behavior but bare content has no download action. File bytes currently use useAuthedFile and the authenticated /files endpoint with backend ownership/role checks. Use one read-only RegistrationProof card for these three surfaces, with a proportional image frame, labelled native Preview button and cohesive protected download. Improve ImageViewerModal's visible title/footer and authenticated download, retaining PDF support and modal focus restoration. Normalize proof/viewer paths to a basename before loading so stored HTTP paths cannot bypass authentication; do not alter external avatar support, file replacement rights, review decisions or backend authorization.

Implemented RegistrationProof in Student Profile, Admin Maintenance/account details and Account Verification. The native thumbnail button includes a visible magnifying-glass Preview cue and a protected Download proof footer; PDF evidence opens through the same viewer. ImageViewerModal now has a readable title, object-contain image/PDF body and pinned Download file action with safe loading/error states. Existing ModalShell owns Escape, focus containment and restoration. Read-only proof replacement rights, avatar selection, backend authorization and confirmed Admin decisions are unchanged. Updated Help/manual and shared UI conventions.

Short-screen visual finding: the review's split mobile scroll panes left very little account-detail reading height at 200% text. Replaced its custom bare shell with the standard modal header, one responsive scrollable body and pinned decision footer. Desktop retains two content columns; narrow screens stack the proof and account details.

Validation: the final full frontend suite passes 85 suites / 772 tests; the affected suites pass 70 tests. The existing backend file-authorization suite passes 24 tests. Frontend lint/build and git diff --check pass; build retains its existing chunk-size advisory. Regression checks cover protected stored HTTP paths, read-only evidence, image/PDF preview, loading/403/500 states, stale-file cleanup, nested focus trapping/restoration and Admin/Student integration. Synthetic browser checks pass 221 assertions across Student Profile, Admin account details and Admin review at 320/375/768/1280 px, both themes and 100%/200% text, plus 640 px-high mobile checks. Confirmed contained frames, authenticated blob downloads, browser download initiation, Enter, Tab containment, Escape restoration and zero runtime exceptions/API writes. Screenshots use an explicitly non-ID document only; no real identity evidence or live production access. No database migration or backend runtime change.

### Concise Profile email verification guidance — investigation 2026-10-05

Finding before edits: EmailVerificationNotice renders the one-click explanation, Spam, expiry, resend, refresh, request/payment gate and ID-approval distinction in one paragraph. ProfileSettingsModal already delegates this notice and separately protects changed-email verification with a current password and confirmation. emailVerification.model.create sets expires_at using DATE_ADD(NOW(), INTERVAL 1 HOUR); lookup/consume use the same database clock. There is no environment expiry override. Shorten the primary student guidance to two sentences with that one-hour lifetime and move supporting resend/refresh/ID guidance into an accessible native disclosure. Keep pending-email, delivery/status feedback and all verification handlers unchanged.

Implemented the concise guidance in EmailVerificationNotice with a native Verification help disclosure and shared focus feedback. Resend/refresh/ID-approval guidance stays available there; pending address and delivery feedback remain visible, and changed-email password/confirmation behavior is unchanged. Staff copy does not imply student request permissions. Updated manual/Help, and added mocked model checks for the existing one-hour issuance and database-clock expiry/single-use guards. No backend runtime, configuration or schema change.

Screenshot finding during verification: the new dark help label used pine-300, but the configured pine palette has only 500/600/700. Replace that nonexistent shade with the existing green-300 dark variant and verify its computed color; no global palette expansion is needed.

Validation: four targeted frontend suites / 97 tests and two backend verification suites / 15 tests pass; frontend lint/build and git diff --check pass. Read-only synthetic browser checks pass 50 assertions across 320/375/768/1280 px, both themes and 100%/200% text: concise text, contained layout, visible pending/error feedback, focus and native Enter/Space disclosure operation. Mobile dark enlarged-text screenshot reviewed; no runtime exceptions or API writes. Build retains the existing chunk-size advisory. No migration or deployment; live delivery/token behavior was not exercised.

### Sidebar More threshold — investigation 2026-10-05

Finding before edits: navGroupsForUser partitions by static group flags, and Help is always marked More. SidebarNav correctly renders its switch whenever that partition is nonempty, so even a student with four destinations sees More. User requested five visible destinations before a sixth More control. Keep existing daily-work priority, fill Main to at most five destinations and send only overflow to More. Accounts with five or fewer destinations need no switch; Preferences and Logout remain outside the destination count. Retain direct-link/group reveal, mobile labels, keyboard focus and role permissions.

Implemented the count-based partition in the existing navigation helper; SidebarNav's existing overflow guard now hides More for Student, Alumni and clerk desks and places it sixth for Admin. Kept Admin System Maintenance and Finance/Secretary records in daily-work priority. Updated regression expectations for the first overflow item (Security Logs), preserving tooltips, focus transfer, Back/Forward, direct links, tour reveal and drawer closing. Help/manual/UI conventions explain the threshold and the separate Preferences/Logout controls. No new destinations, permissions or workflow changes.

Validation for the navigation and public-branding changes together: full frontend 84 suites / 760 tests, lint, production build and git diff --check pass. Read-only synthetic browser fixture passes 322 checks at 320/375/768/1280 px in both themes and 100%/200% text: all six public page layouts load one proportional supplied PLP seal; each role's rail/drawer has the correct direct-link count, Admin More is sixth, overflow and Preferences/Logout remain accessible. No runtime exceptions or API writes. Reviewed mobile enlarged-text signup/Admin More and desktop Login screenshots. Existing large bundle advisory remains. No migration or deployment; physical-phone/live acceptance remains separate.

### PLP branding across public account pages — investigation 2026-10-05

Finding before edits: LoginPage alone overrides AuthShell's default TraceBrand with plp-login-logo.png, so password recovery/reset, email verification and staff authenticator setup still show TRACE artwork. SignupPage uses a separate layout with no logo. The welcome panel is part of AuthShell, not a separate route. Verified plp-login-logo.png is byte-identical to the user's supplied trace logo/PLP Logo (2).png. Make the supplied PLP image a shared public-page component, use it in AuthShell and signup, and remove the Login-only override. Preserve authenticated TraceBrand, browser/PWA branding and all account workflows.

Implemented PlpBrand with one unchanged asset import, full institutional alternative text, square intrinsic dimensions and object-contain sizing. AuthShell now supplies it across Login/welcome, OTP/recovery-code entry, password recovery/reset, email verification and staff setup; student/alumni signup uses the same component in its separate layout. Removed the Login-only override. Tests cover every public page, both signup account types and existing login challenges; Layout's signed-in TRACE tests remain green. Validation is recorded with the sidebar entry above. Frontend deployment only; no server/schema changes.

### Backup transfer walkthrough — 2026-10-05

Expanded MIGRATION_ROLLOUT.md Step 2 with server-side archive packaging, browser SSH download, Mac extraction and checksum verification. Commands identify which terminal to use, recover the recorded backup variable after reconnecting, and use the reported fresh October 5 folder as a clearly dated example. Documented success output, failure handling, archive privacy, retained copies and the return to the chosen pull/build path. The user's server output confirms backup creation and basic checks; the new off-server transfer/checksums remain pending. No server operations or application changes were performed for this documentation update.

Validation: executed the documented packaging/extraction/checksum commands against temporary synthetic files; both checks report OK, the package has mode 600 and the original folder remains. git diff --check passes. No real backup contents were read or copied.

### Current migration rollout audit — 2026-10-05

Reviewed all 22 ordered incremental scripts, the broad legacy migration, the Batch 9/phase-three/purpose rewrite helpers, fresh schema, Compose initialization/image behavior and runtime reference/auth queries. The earlier server logs confirm 18 scripts plus an equivalent manual password-history table repair; no live result confirms the later verification-reason, onboarding or program-catalog migrations. `migrate_program.js` is already confirmed and remains a prerequisite. Latest UI/report/status/password-reset lookup/Admin trust changes add no new table or column. Corrected the short runbook's omission of the catalog, the stale 21-script count and the upgrade-path wording; documented targeted current follow-ups and an optional metadata-only type/index/FK/base-table check. Old policy/backfill scripts are not passive no-ops and should not be rerun merely for these additions. Broad legacy migration and purpose rewrite helpers are excluded from current rollout.

Additional finding: fresh schema lacks legacy password_resets/payment_methods definitions, while runtime queries need them and the broad historical migration defines them. This does not prove a missing table in the existing server. The presence preflight already covers password_resets but not payment_methods; the documented supplementary metadata audit covers both. No new base migration, schema rewrite, live connection or SQL mutation was made for this audit. Live migration status remains pending actual server metadata/output; backup/pull/build/migrate/check/restart instructions are in MIGRATION_ROLLOUT.md. Validation: all 21 migration/preflight suites (51 tests) pass; documented supplementary diagnostic passes syntax and six synthetic cases for success, missing base fields, short course capacity, missing unique index/FK and connection failure, with SELECT-only queries and pool cleanup. git diff --check passes.


### Linked College and Program selections — investigation 2026-10-05

Findings before implementation: colleges already have an active reference catalog and public /reference/colleges read endpoint. There is no approved program catalog/table, program-to-college relation, program reference endpoint or program Maintenance view in the repository. migrate_program.js only adds nullable users.program without inferring values. ProfileSettingsModal renders a free-text Program/Course field and no College selection; useProfileSettings seeds program but no college_id. auth.service.updateProfile accepts client course and a length-checked program without membership validation; course is the college display name, college_id is its reference key, and program is the separate degree/program text. Preserve these distinctions and existing saved values. User approved Admin-managed Registrar-approved programs in System Maintenance. Implement an initially empty college-linked catalog, with confirmed addition/deactivation/restore (no name/college rewriting of existing entries), active reference reads and linked Edit Profile selections. Preserve historical academic values on unrelated saves; validate changed membership before writes and again under college/program locks. No invented seeds, live database changes or deployment.


Implemented: explicit empty `programs` catalog with college FK and per-college unique names; Admin-only add/deactivate/restore endpoints and System Maintenance Programs panel with confirmations, duplicate-submit guards, preserved failure drafts and independent load-error/retry feedback. Active profile reads exclude inactive programs/colleges. Edit Profile uses linked selects; College changes clear Program/Course, old unlisted/inactive values remain visible, and unchanged academic fields are omitted on unrelated saves. Changed values are validated against the active catalog before writes and under transaction locks; canonical college id/display name/program are saved together. No invented catalog population, delete/rename, new completion rules or pricing changes. Signup retains its existing manual program field. Updated fresh schema, read-only preflight, migration sequence, manual and role-aware Help. `migrate_program_catalog.js` widens nullable `users.course` to the college name capacity without rewriting values.

Validation: full frontend 83 suites / 746 tests and full backend 79 suites / 1,102 tests pass; final targeted backend auth/catalog regression suites pass after the missing-account guard. Frontend lint, production build and git diff --check pass (existing chunk-size advisory remains). Read-only synthetic browser checks pass 244 assertions across 320/375/768/1280 px, both themes and 100%/200% text, including existing modal focus/Escape checks, linked hydration/clearing/filtering and contained Admin catalog controls/table; profile and mobile dark enlarged-text screenshots reviewed. Migration SQL is regression-tested with mocked executors; no live MySQL migration, real account writes or deployment was performed. Apply the documented explicit migration from the new backend image, populate actual Registrar-approved programs and perform live/physical-phone acceptance before rollout is considered complete.

### Consistent profile label casing — investigation 2026-10-05

Finding before edits: shared trace-label already uses normal casing. ProfileSettingsModal locally forces uppercase on the Profile Completion caption and the Elementary/Junior High School/Senior High School section headings; its changed-email current-password and registration-proof labels use sentence case. StudentProfileModal only fetches and delegates to UserDetailModal, whose read-only field captions already use Title Case; its registration-proof caption is sentence case. Use explicit Title Case wording and the shared label styling for education headings, removing their uppercase transformation. Keep role/ID metadata, values, security-table headings, required markers, ids/labels, completion warnings and save behavior intact. No global CSS, backend or schema change is needed.

Implemented Title Case education headings using trace-label, removed the Profile Completion caption's uppercase/wide-tracking styling, and aligned changed-email/password and student/alumni/read-only proof captions. StudentProfileModal requires no direct change because it renders UserDetailModal. Added student/alumni regression coverage for captions, associated required controls and the changed-email password label; adjusted existing proof assertions to the new casing while retaining authenticated preview and read-only behavior. Documented the convention in UI_CONVENTIONS.md.

Validation: five relevant frontend suites / 103 tests pass, covering profile editing/completion, saved-field hooks, read-only lookup and Maintenance proof previews. Frontend lint/build and git diff --check pass. Read-only synthetic browser checks pass 226 assertions across 320/375/768/1280 px, both themes and 100%/200% text: computed normal text transformation on form labels/education headings/Profile Completion and shared read-only captions, preserved hints/input associations/required validation, contained layout and Escape/focus return. Mobile dark enlarged-text and desktop light screenshots reviewed. Existing build chunk-size advisory remains. No real account writes, migration or deployment; physical-phone/live acceptance remains separate.

### Active-tab profile warnings — investigation 2026-10-05

Finding before edits: ProfileSettingsModal renders the entire getProfileCompletion missing list above the form, outside its personal/educational/security branches. Thus Personal Info and Security also show missing education fields. The helper already recomputes from the current draft and provides consistent personal/education indicators, but tabs expose only unlabelled red dots and most profile controls lack associated labels or missing-field descriptions. Remove the global paragraph; show concise, associated required-field hints only inside the rendered tab, and give incomplete tabs a visible marker plus accessible missing-information text. Preserve the shared completion rules, conditional requirements, progress, native required validation, confirmation, server errors and save handlers. No backend/schema change is needed.

Implemented active-tab hints in ProfileSettingsModal, with labelled controls and aria-describedby associations. Personal/education tab indicators now include a visible exclamation and accessible missing-information text; both reflect draft changes immediately. No completion rules or save handlers changed. Tests cover tab isolation including Security, clearing/reintroducing missing values, conditional alumni/maiden-name/transfer requirements, required-field validation, partial-profile confirmation and server feedback. Updated the existing Layout incomplete-request regression to assert the associated Birth Date hint instead of the removed global paragraph, preserving its direct-open behavior. Help/manual and UI conventions explain the current indicators and saved-profile gate.

Validation: full frontend 81 suites / 733 tests pass after updating that obsolete Layout assertion; targeted component/hook/completion tests pass 89 tests. Frontend lint/build and git diff --check pass. Read-only synthetic browser checks pass 162 assertions across 320/375/768/1280 px, both themes and 100%/200% text, covering tab-local hints/associations, live corrections, conditional transfer changes, native validation, contained layout and Escape/focus return. Mobile dark enlarged-text and desktop light screenshots reviewed. Existing build chunk-size advisory remains. Physical-phone/deployed acceptance remains separate; no real accounts, writes, migrations or deployment.

### Structured student payment line items — investigation 2026-10-05

Finding before edits: each payment list item is a full-width flex-wrap/justify-between row; document and amount are separated by free space, while FeeBreakdown spans the entire row below. This preserves data but spreads related information across the outer card on desktop. Replace each row with a bounded, noninteractive shared section: nearby document/amount header, saved calculation beneath, and stacked header fields on narrow screens. Keep FeeBreakdown's saved/history behavior, group totals, Pay-after-breakdown footer, amber/contrast styling and all payment handlers unchanged. No backend or schema change is needed.

Implemented bounded shared sections for each document in StudentDashboard. The name and amount sit together above FeeBreakdown on desktop and stack below the small-screen breakpoint. Long labels wrap; informational items gain no action, tab stop or hover affordance. FeeBreakdown, saved amounts, group totals and payment handlers are unchanged. Regression coverage keeps saved and historical descriptions with their respective document/amount and preserves the combined total and checkout flow.

Validation: Student payment, pricing and dashboard regression suites pass 55 tests; frontend lint/build and git diff --check pass. Read-only synthetic browser checks pass 130 assertions over saved/historical states, 320/375/768/1280 px, light/dark and 100%/200% text: related-field alignment, mobile stacking, contained layout, unchanged total, no invented item actions, preserved Pay-after-charges order and text contrast. Reviewed mobile dark enlarged-text and desktop light screenshots. Existing build chunk-size advisory remains. No real records, payment writes, migration or deployment.


### Student payment amount and description contrast — investigation 2026-10-05

Measured before edits using computed browser foreground/card-background colors from read-only synthetic StudentDashboard records. The 12 px line amount uses gray-500/gray-400: 4.8364:1 on white in light mode, 6.8210:1 on gray-900 in dark mode. FeeBreakdown's older-record paragraph uses gray-600/gray-300: 7.5581:1 / 12.0527:1. Saved-breakdown description uses gray-700/gray-200: 10.3048:1 / 14.3338:1. All measured pairs meet the [WCAG AA normal-text 4.5:1 minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); the reported faintness is not proof of an AA failure. Strengthen primary line amounts with gray-900/gray-100 and font-semibold; align the recorded-charge explanation with saved secondary text and emphasize its recorded amount separately. Preserve currency, saved amounts/calculations, fallback wording, payment eligibility and handlers. No schema/backend change is needed.

Implemented stronger per-document amounts in StudentDashboard and the secondary historical explanation plus distinct primary amount in shared FeeBreakdown. Existing saved calculations already use the clearer secondary palette and remain unchanged. Tests preserve historical text/currency, saved labels, escaping and grouped payment flow, while asserting both theme variants and amount hierarchy.

Measured after edits on the actual card: primary amount gray-900 on white = 17.7466:1; gray-100 on gray-900 = 16.1257:1. Historical description now matches saved description at 10.3048:1 light / 14.3338:1 dark. Its embedded recorded amount uses the primary pair. Original ratios already met AA; these changes increase reading comfort and hierarchy rather than remediate a demonstrated AA failure. Ratios use computed browser colors converted to sRGB and the WCAG relative-luminance formula; thresholds are checked unrounded.

Validation: full frontend 81 suites / 728 tests, lint/build and git diff --check pass. Read-only synthetic browser checks pass 98 assertions over saved/historical states, 320/375/768/1280 px, light/dark and 100%/200% text: ≥4.5:1 text contrast, stronger primary amount/weight, preserved Pay-after-charges order and contained card/page layout. Reviewed mobile dark enlarged-text and desktop light historical-charge screenshots. Existing build chunk-size advisory remains. No real records, payment writes, migrations or deployment.


### Student payment action after fee breakdown — investigation 2026-10-05

Finding before edits: each request-group section in StudentDashboard emits Request ID, then Pay, then the itemized document list/FeeBreakdown. This JSX order drives both visual and keyboard reading order; FeeBreakdown itself only renders calculations. Move the same grouped Pay action after the list in a responsive right-aligned footer, with the existing group total displayed before it. Preserve amber styling, eligibility, selected representative document/group total and the existing checkout/confirmation/submission flow. No backend or schema change is needed.

Implemented the same grouped Pay button after the charge list in a flex-wrap/justify-end footer. The saved group total appears immediately before the button in DOM order, and mobile full-width action styling remains. No CSS reordering, positive tabIndex, new state, timers or handler changes. Tests check both request groups' charges → total → Pay order, and retain keyboard activation, representative-document selection, confirmation, single submission and non-payable states.

Validation: Student payment/dashboard regression suites pass 38 tests; frontend lint/build and git diff --check pass. Read-only synthetic browser checks pass 85 assertions across 320/375/768/1280 px, light/dark and 100%/200% text: actual Pay position below charges, right alignment, DOM order, contained layout, amber contrast, non-payable states and keyboard checkout. Screenshots reviewed. Existing build chunk-size advisory remains. No real payment writes, migration or deployment.


### Student unpaid Payment Action Card — investigation 2026-10-05

Finding before edits: StudentDashboard renders its Action Required — Payment card only for billableGroups derived from the existing pending-payment queue. The Pay action already uses the shared trace-button-warning variant; the surrounding card still hardcodes a pine-green border and header with white warning icon/text. FeeBreakdown is neutral and renders saved fee calculations, not payment success. Align the pending card's border/header with amber light/dark palette and preserve group totals, payment eligibility, checkout, confirmation and submission handlers. No backend or schema changes are needed.

Browser finding during verification: the existing payment line item renders the document, amount and saved FeeBreakdown side by side; at 320 px/200% text its minimum content width exceeds the card and overflow-hidden clips it. Keep name/amount together and place the calculation on a wrapping full-width row.

Implemented amber border/header and theme-aware text/current-color icon in StudentDashboard, retaining the existing shared amber Pay button. Header padding is responsive and its icon cannot shrink. Saved fee calculations now occupy their own full-width wrapping row; FeeBreakdown remains neutral and its calculation/data logic is unchanged. Added assertions for the pending presentation, saved calculation, and absence of Pay for submitted/paid/completed requests; existing grouped checkout/keyboard/confirmation/submission tests remain intact. Documented the convention in UI_CONVENTIONS.md.

Validation: full frontend 81 suites / 727 tests pass; after the layout adjustment, Student payment + dashboard regressions pass 37 tests, with payment tests rerun after the saved-calculation fixture update. Lint, production build and git diff --check pass (existing chunk-size advisory remains). Read-only synthetic browser checks pass 69 assertions across 320/375/768/1280 px, both themes and 100%/200% text, covering grouped Pay, header/button contrast ≥4.5:1, icon color, contained card/page layout, no Pay for paid/submitted states and keyboard checkout. Screenshots reviewed. No real records, payment writes, migrations or deployment.


### Optional Secretary records workspace — investigation 2026-10-05

Findings before implementation: SecretaryDashboard has separate completed-logs and reports branches, mirrored by separate navigation entries. Completed Logs uses the dashboard's first 100 documents and filters READY_FOR_RELEASE/COMPLETED; its only row action opens the student profile. It displays updated_at under “Date Approved”, abbreviated tracking, student identity, document_sequence_number (falling back to document_type) and a constant APPROVED badge. Reports already preserves created/updated timestamps, full tracking, student profile action, document type, actual status, payment and amount, plus date/type/status/payment filters, created-desc sorting, pagination and five existing CSV export options. Its API projection omits document_sequence_number. The two APIs also differ in scope: the Secretary queue uses assigned-clerk/college routing rules, while reporting currently permits all staff to view all colleges. A simple COMPLETED-only alias would omit Ready for Pick-up records; a frontend-only merge could also change record scope. Asked the user to choose the preserved cleared preset and college/report scope before implementation.

User decisions: preserve Ready for Pick-up plus Completed in Secretary-cleared, keep Completed-only, and restrict the workspace and filtered exports to the assigned college. Implemented one Records & Export destination in Main with All records/Secretary-cleared/Completed only controls. The old completed-logs tab renders the same workspace with its cleared preset and canonical navigation highlight, including browser Back/Forward. Retained all eight report columns, student-profile action, filters, created-desc sorting, pagination and five CSV options; added the saved document request label to the report projection, Secretary document cell and Secretary CSV. Last Updated preserves the old timestamp without inventing an approval event. Updated the Secretary tour and user guide.

Backend scope is derived from the stored Secretary account for report list/count/summary/breakdowns, document CSV and all four student CSV categories. College-ID matching supports legacy null-ID college names; missing assignments fail closed. Client-supplied college parameters cannot widen the scope. Admin/Window 1/Finance reporting behavior remains unchanged. Record presets and individual statuses cannot conflict. No schema migration is needed.

Validation: frontend 81 suites / 724 tests, backend 76 suites / 1078 tests, frontend lint/build and git diff --check pass. Read-only synthetic browser verification passed 136 checks across both old/new tabs at 320/375/768/1280 px, light/dark and 100%/200% text, including preserved fields, contained layout, current navigation, Completed-only, Back behavior, student profile opening/Escape and five export options. Screenshots reviewed; no real records or writes. Existing build chunk-size advisory remains. Not deployed.

### Staff workload shares — 2026-10-05

Finding before edits: AnalyticsPanel divides each documents_handled count by workload_by_clerk[0].documents_handled, so the busiest member always displays a full bar instead of a share of total workload. It also has no numeric/accessibility percentage. report.model.workloadByClerk groups all clerk/admin audit activity in the requested date range with no LIMIT/OFFSET; reports.service maps every returned row and does not pass document-report pagination into the workload query. The workload table is currently scrollable, not paginated. Compute the denominator from the full analytics array before any display slicing; use one percentage for the visual bar, visible text and accessible value. Preserve per-staff distinct document counts (a document handled by two staff contributes to both staff totals), date scope, permissions and unrelated analytics. No schema migration is needed.

Implemented `getWorkloadShares` as a pure presentation helper over the complete staff array, with safe empty/zero-total handling and one-decimal percentages. AnalyticsPanel now renders that same value in a labelled meter, visible percentage and shared transform-based ProgressFill. Kept the existing counts and analytics API; documented the unpaged query contract and added model/service checks that dates are applied and document pagination cannot truncate workload. The table retains its internal scroller with a rem minimum width for labels/bars at enlarged text sizes. Regression tests cover 60/30/10, display slicing, report page changes, unsorted/string counts, decimal shares, zero and empty data.

Validation: frontend 81 suites / 720 tests, reporting model/service 2 suites / 39 tests, frontend lint/build and git diff --check pass. Read-only browser fixtures passed 210 checks for normal, zero and empty workload at 320/375/768/1280 px in light/dark at 100%/200% text, covering actual bar ratios, numeric/accessibility labels and contained layout; screenshots reviewed. Existing build chunk-size advisory remains. No real records or writes used, no migration, not deployed.

### Document status badge meaning — 2026-10-05

Findings before edits: frontend getStatusTone only handles Completed/Approved/Rejected and defaults every other pipeline stage to amber. Admin document rows override the fallback to blue; Student document/history rows override Payment Required to red (one class string also has a stray brace); Reports overrides it to unboxed gray text. Window 1 and tracking use the default. Admin activity logs read `step_logs.to_status AS status` but compare it with lowercase `completed`, so current uppercase COMPLETED incorrectly remains amber. Secretary/Finance payment badges and account/application verification notices represent other domains and must retain their own meanings. Use the existing shared helper rather than a parallel document-status system; preserve all labels, transitions, actions and payment guards. The user confirmed pending queues amber, processing/OR verified/legacy Approved blue, Ready/Completed pine green and Rejected red. Shared semantic categories will be mirrored in backend/frontend; CSS stays frontend-only. Unknown states use a neutral fallback. No migration is needed.

Implemented the confirmed mapping in the existing helper and removed page-local overrides in Admin, Student and Reports. Window 1 and shared tracking inherit the same tones; activity logs now use readable labels and support recognized lowercase historical statuses. Added parity and rendered-role regression checks, retained rejection and payment styling, and documented the convention in UI_CONVENTIONS.md. Browser verification found fixed pixel table widths squeezing badge labels at 200% text; tracker/history/report/log minimum widths and report columns now scale in rem, keeping their existing contained scrollers. Activity status badges override inherited nowrap to wrap normally.

Validation: frontend 80 suites / 714 tests, backend 75 suites / 1,067 tests, frontend lint/build and git diff --check pass. A local read-only browser fixture passed 450 checks across Reports (Admin, Window 1, Secretary), Student history, Admin tracker/logs and Window 1 tracking at 320/375/768/1280 px, light/dark, 100%/200% text. Checks cover actual computed contrast (at least 4.5:1), shared semantic colors and nonclipped badge labels; mobile/desktop screenshots reviewed. No real records or mutations were used. Build retains its existing large-chunk advisory. Not deployed; no schema migration required.

### Reports flow and filter consistency — 2026-10-05

Finding before edits: the shared ReportsPanel already renders Filters, report-summary KPIs, then Records for Admin, Window 1 and Secretary after TRACE-12 removed the export card. Export remains in the header. The displayed KPIs and rows come from one document-report response, and backend summary/list/export queries already use the same document filter builder. However, useReports accepts overlapping responses without checking which load is current, keeps old results after filters change, and exports the newly selected filter scope while those old results remain visible. Preserve automatic filter updates, Apply/Reset, pagination, columns and category-wide student exports. Track report response scope and latest load, retain controls during refresh, and show unavailable/loading metrics/records rather than mislabel stale results as the current scope. Block document export until a matching response is available. No backend/schema change is required.

Implemented labelled Filters → Report summary → Records regions and stable KPI placeholders during refresh/failure, with a Records loading announcement and explicit retry message. The header Export dropdown and eight table columns remain intact. The hook now derives refresh state from the current/settled scope and accepts only the latest load; dismissed/error feedback remains under existing control. Regression checks cover all three roles' region order, all filters, reversed responses, stale failures, blocked premature export, current-scope retry, paging/reset and independent student exports. Local validation: **688 frontend tests / 80 suites**, **35 existing backend reporting tests**, lint, build and `git diff --check` pass (existing chunk-size advisory). **355 isolated browser checks** pass, including region geometry/order and header/column preservation across roles, widths, themes and text sizes. Fixtures used synthetic data, rejected writes and blocked external API access; physical-phone and deployed acceptance remain separate. No deployment or migration was performed.

### Export in report headers — 2026-10-05

Finding before edits: Admin, Window 1 and Secretary render the same ReportsPanel. Its export selector and separate submit button sit in a standalone section below the filters/summary (with an incomplete `ga` class). FinanceTransactionsPanel already puts its single CSV button beside its own title, but does not use the same dropdown presentation. Reports supports filtered documents plus four student categories; Finance supports filtered transactions only. Backend staff authorization and the existing export services remain authoritative. Student-category exports are category-wide; the document and Finance exports retain their respective date/status filters.

Use a shared, labelled Export disclosure beside each panel title, with wrapped header actions, themed buttons, keyboard dismissal/navigation and pending-state disabling. Selecting an option invokes the existing download handler immediately. Remove only the standalone reports export section; retain filters, report data, notifications and role routes. No migration or backend change is needed.

Browser finding: the existing two-column reports summary overflows at 320 px with 200% text even though the header/dropdown fit. Use available reading width for summary columns so it stacks at that size and retains all values; no metric calculation changes.

Finance's date-filter labels also use their native input minimum widths as unconstrained flex-item widths at 200% text. Constrain those labels to their container while preserving values, handlers and native controls.

Implemented the shared header dropdown in ReportsPanel (Admin/Window 1/Secretary) and FinanceTransactionsPanel. Existing service/hook/backend export paths are unchanged. Regression checks cover keyboard/focus dismissal, category selection, filtered document/Finance payloads, pending controls, failure feedback/retry and Finance's browser download filename. Local frontend validation: **681 tests / 79 suites pass**, lint/build and `git diff --check` pass (existing build chunk-size advisory). **259 isolated browser checks pass** across all four role panels at 320/375/768/1280 px, light/dark, 100%/200% text, plus touch/reduced-motion checks; screenshots reviewed. Synthetic fixtures reject writes and block external API access. This is local verification, not production or physical-phone acceptance. No deployment, migration or dependency change was performed.

## Current Status — 2026-10-03

### Consistent controls and page layouts — 2026-10-03

#### Findings recorded before presentation edits

The user confirmed scope includes every role and public authentication pages. The existing Tailwind theme has color/font/motion tokens and global keyboard/mobile/text-size rules, but no shared control or page-section styles. Similar elements repeat independent utility strings: FinanceTransactionsPanel date filters use `p-2` and transparent backgrounds, PricingModal fields use `py-3` without an explicit dark background, Window 1 ManualInputModal uses `text-xs`, and SignupPage's program field omits the focus/border conventions of neighboring fields. ModalShell supplies shared behavior, but ProfileSettingsModal overrides normal panel/backdrop styling. Dashboard headings/cards also repeat local sizing and spacing.

Use explicit reusable Tailwind component classes for fields, action variants, page headings/sections and modal chrome. Keep inverse authentication controls, icon buttons, tabs, native file/choice controls, printable slips and template previews distinct. Preserve all event handlers, field identities, permissions, validation, API payloads, confirmation workflows, focus trapping and text-size preferences. No backend or schema changes are needed.

#### Implementation and verification

- Added shared Tailwind component classes in `frontend/src/index.css` and adopted them across 55 UI modules, including every role, messaging, fees/reports, Profile/Security, graduate forms and public account pages. Normal modal appearance/footer spacing is shared; deliberate split-column, print, lightbox and spotlight layouts remain supported.
- Form grids adapt to available width; full-row fields use `col-span-full`. Labels, controls and wrapped actions use unitless line height to avoid overlapping text at 200%. Date chips and document-selection labels wrap without squeezing words into single-character columns. Signup's Back to Login link now appears in the page flow above the form; its local errors use the shared inline alert styling. Green-background status panels retain an inverse variant.
- Documented reusable variants and review steps in [UI_CONVENTIONS.md](UI_CONVENTIONS.md) and Coding Preferences. Updated ModalShell/ConfirmDialog regression assertions to follow the new shared classes while retaining their focus, cancellation, pending-action and pinned-footer checks.
- Final frontend validation: **588 tests / 69 suites pass**, ESLint passes, production build passes (the existing large-chunk advisory remains). `git diff --check` passes. A presentation AST audit of all 55 changed UI modules found no changes beyond styling/whitespace and Signup's added alert semantics; handlers, validation, permissions and payloads are unchanged.
- Isolated local browser verification: **105 checks pass**, no JavaScript exceptions. Checked Window 1/Secretary/Finance/student forms and shared states at 320/375/768/1280 widths, both themes, 100%/200% text; checked public account pages, five role dashboards and five role Profile dialogs. Separate computed-style checks verified hover color changes, keyboard focus, red invalid borders, disabled treatment and readable inverse panels. Reviewed screenshots, including mobile Signup/Profile and large-text request forms. Fixtures used synthetic records and blocked live API access; this is not deployed-role or physical-phone acceptance evidence.

No production deployment, database migration or dependency change was performed.

### Signup/account repairs and approved follow-ups — 2026-10-02

#### Findings recorded before follow-up edits

Before these runtime edits: Admin is explicitly excluded by browser-trust service/model/login and the local preference helper. Extend the existing account-bound, hashed HttpOnly grant to active Admin accounts with an enrolled authenticator; offer unchecked opt-in only on that app challenge. Keep Admin email challenges ineligible. Recheck account version/activation and active app under the account lock at grant time and in lookup SQL, preserve Manila-midnight expiry and mandatory password verification, and keep failure closed. Authenticator changes already bump the account version. Use one shared browser-preference helper and include Admin's existing Security reset control.

Signup currently issues an ownership email automatically after account creation. The user approved keeping the required email but sending its one-use link only from Profile. Remove that automatic issuance/wait and give an explicit Profile instruction; keep student email gates on request/payment writes and separate login MFA. Existing links remain valid until consumed/expired.

Before the request-button follow-up: New Request checks missing profile fields but does not include email ownership, leaving an otherwise complete student to encounter the server email gate only on submission. Include the unverified address in the existing explanatory Profile popup and retain the server gate.

First-login guides are student-only in enrollment, route and Layout. The user approved desk-specific clerk/Admin tours using the same spotlight. Lazily enroll an authenticated staff/Admin account at its first eligible guide check (including existing staff who never had a guide); conditional claim remains once per account. Required temporary-password/Graduate Application steps run first. Students retain registration-based enrollment. Tour steps highlight actual permitted navigation, queues and Security/Profile controls, opening the mobile drawer for navigation steps without making desk decisions or submitting forms. Replays stay under the question mark. No new schema is needed beyond the existing onboarding/trust/authenticator migrations.

Browser verification found that spotlighting the entire Admin account-review panel at 375px/200% left too little vertical room for tour navigation. Its anchor was narrowed to the existing heading. Screenshot inspection also showed that the fixed header row squeezed that heading into mid-word breaks; the heading/badge now wrap onto separate rows when space is limited.

FINANCE001 live read-only results confirmed a Finance clerk, an active email different from the test inbox, no pending email, and unverified email ownership. The user then explicitly discontinued this investigation before delivery headers/logs were collected; no live recipient cause or fix is claimed. No supplied credential was used in source, tests, logs or documentation. Inspection and synthetic regressions show login OTP uses the active persisted account email; a pending email remains inactive until its link is verified. Outbound-mail tests preserve the requested recipient independently of the SMTP sender, without CC/BCC overrides.

Implemented the confirmed Read ID multipart repair, safe pending-registration Program/College projection and distinct display, and underscore support through shared frontend/backend validators. Signup, Profile change, forced first-login change, reset and Admin creation/reset retain password length limits; auth password-history checks are unchanged. Admin creation/reset now also enforce the full shared requirements. Finance active-versus-pending recipient regression passes; no live recipient cause is claimed. Implemented the approved choices: signup saves the required email without issuing an ownership link, Profile Verify sends it and server request/payment gates remain enforced with Profile instructions. Eligible Admin app challenges offer unchecked browser trust; grant and lookup recheck active account/version/app, expire at Manila midnight, and preserve password checks. Browser reset is available to Admin and clerks. Window 1, Secretary, Finance and Admin receive a role-specific spotlight tour once after required setup, including existing staff with no shown marker; student enrollment remains signup-based. Question-mark replay works for all these roles and phone navigation steps open the drawer. No migration is needed for this round: deploy matching backend/frontend after review. Investigation findings appear below.

Validation: **1,034 backend tests / 74 files** and **588 frontend tests / 69 files pass**. Frontend lint/production build, changed backend module syntax checks and `git diff --check` pass. The existing build chunk-size warning remains. Tests include real Axios transformations with synthetic files, saved Program/College review, active Finance email versus pending address, underscore acceptance through registration/change/reset/Admin and forced-change forms, unchanged password-reuse rejection, and preventing invalid drafts from uploading a staged avatar. Additional coverage checks Admin app trust opt-in, failed verification, password-before-trust and grant eligibility under the account lock; signup without automatic email, unchanged student write gates and the direct Profile popup; staff/Admin once-only guide claims, permitted role destinations and visible mobile link selection. No genuine identity image, production login, SMTP delivery, agent database mutation, push or deployment was used for this verification. The live Finance boolean query was executed by the user and its investigation was discontinued at their request.

Browser acceptance used isolated headless Brave and synthetic API fixtures for Window 1, Secretary, Finance and Admin at 1280px/100%, 375px/100%, 375px/200% dark and 320px/150%. The initial 152 checks found the Admin account-review anchor issue; all 48 Admin checks passed after narrowing that anchor. The other three desk tours passed their bounds, spotlight, reachable controls and no-repeat checks. No runtime exceptions or workflow writes occurred; only synthetic guide-claim requests were permitted. These checks do not establish physical-phone, live-cookie, SMTP or MySQL concurrency acceptance. User-manual/setup/rollout file links and rollout shell syntax also pass; commands were parsed, not deployed.

### Tutorial documentation revision — 2026-10-01

Reorganized USER_MANUAL.md into numbered tasks for registration/login, the once-per-account floating tour, Profile email links, requests/payment/tracking, messaging, Security, appearance and each staff desk. Removed production instructions to use shared demo credentials and superseded email-code, manual-price and attachment-policy statements. Added common problems and explicit distinctions between email verification, login factors and ID review. MIGRATION_ROLLOUT.md now starts with an existing-server follow-up path, verified-backup prerequisites, two preserving migrations, expected results, restart/frontend order and live feature checks. Deployment/configuration guides link to that path; HelpPage's email, authenticator-control labels and tour wording follow the manual. No runtime workflow, database, email dispatch or production deployment is changed by this documentation round.

Validation: the two relevant FAQ/workflow Vitest suites pass (14 tests); frontend lint and `git diff --check` pass. Manual/rollout local links and heading anchors were checked; all 16 rollout shell blocks pass Bash and Zsh syntax checks. The shell blocks were parsed only, not executed. No full application retest or live deployment was needed for documentation and FAQ copy changes.

The user's broad “finish everything” authorization supersedes the historical per-file approval checkpoints below. Current implementation and rollout instructions take precedence over older pending/completion statements; local verification is not deployed acceptance.

### Verification email button finding — 2026-10-01

Before edits: emailVerification.issue sends the long fragment-token URL in its plain-text message. Both default emailHtml and saved email_notice templates turn that URL into an anchor whose visible label is the entire URL. Use explicit verification action metadata from the issuing service to render a styled Verify Email anchor in both HTML paths; retain the full URL in the plain-text alternative and preserve token, expiration, single-use validation and confirmation behavior. Only the exact action URL is replaced, and both URL and label are escaped. Saved template sanitization must retain only the limited anchor styling required for the button. No schema, template-record rewrite or frontend change is needed.

### Guided-tour inspection and implementation — 2026-10-01

Inspection found a manual seven-page ModalShell tutorial, a prominent Quick guide dashboard button and a floating chat launcher with only the text “Chat.” There was no account-persisted first-display marker or actual control spotlight. The requested replacement uses a floating, viewport-clamped tour anchored to real controls, a blurred surrounding backdrop, profile/support exploration actions, and Back/Next/Skip. A question mark beside the theme control replays it; the chat launcher now has an accessible speech-bubble/close icon. Alumni graduation and temporary-password gates remain ahead of the tour. Browser inspection at 200% text found two cards exceeding the phone viewport and spotlights needing remeasurement after modal animation; the repaired tour targets compact controls/headings, constrains its scrollable card to available space and follows animation completion.

New signup enrolls only that account in `onboarding_guides`; an authenticated, student-only conditional update atomically claims its first display. Closing/skipping, logging out and another browser do not reset that marker. Existing accounts are not automatically enrolled and retain manual replay. The explicit preserving `migrate_onboarding_guides.js` creates the table, is included in the schema check/runbook, and must be run before starting the new backend. No schema import, reseed, live account enrollment, deployment or outbound email was performed. Browser fixture checks and automated validation are recorded below after verification.

Validation: **1,015 backend tests across 74 files** and **545 frontend tests across 66 files** passed. Changed guide/Layout/hook tests were repeated after visual/focus adjustments; lint, production build, backend syntax and `git diff --check` passed. The existing large frontend chunk warning remains. Isolated headless Brave used synthetic local data to inspect nine tour steps and repeat-display behavior at 1280px/100%, 375px/100%, 375px/200% dark and 320px/150%; card bounds, spotlight, runtime errors and visible navigation controls were checked. These are browser fixture checks, not physical-phone, live MySQL concurrency, signup, mail-client or real SMTP acceptance. Email tests inspect the outbound Nodemailer payload for both saved/default layouts, exact capability destination, escaped content, button styles and retained plain text; no real email was sent.

- **Batches 1–8:** earlier repairs are present; the added acceptance checklist still requires real-phone, mail, SQL, OCR and deployed-role verification.
- **Batch 9:** Program/Course, repeat quantities under the Registrar's updated rule, conditional same-day counter eligibility, durable request numbering/original-issuance evidence, request/general messaging, safe slip/email templates, and TRACE-origin submission QR are implemented locally. Fixed document sets/forms, unspecified identity formatting and delay thresholds remain policy-dependent. A digital OR generator is not present: Finance issues a physical OR and publishes its uploaded copy.
- **Batch 10:** fee schedules, profile completion/gate, a first-login guided tour with manual question-mark replay, authenticator enrollment/recovery for all roles, session/account/password/email hardening, and FIN-01–FIN-05 are implemented locally. Clerk verification and enrolled-app Admin verification offer optional same-day personal-browser trust; students and email-only Admin challenges do not receive it. Staff without inboxes have Admin-assisted initial authenticator enrollment. These require the matching build and explicit migrations.
- **Live deployment repair:** the user confirmed login works after authenticator/session instructions. Later logs proved missing fee schedules/rental columns, document messages, templates, and attachment-upload tables. On Oct 1 the user verified fresh database/uploads backups off-server, pulled `dbd11e6`, rebuilt backend, confirmed unchanged AI source and valid MFA key format, then successfully ran all 18 listed migrations. The user subsequently applied the targeted password-history CREATE, displayed its four canonical columns and reported **Schema presence check passed**. The user restarted backend/AI/n8n, retained running Caddy, and reported successful direct and public HTTPS API health responses with `database: ok`. Backend and MySQL were healthy; AI was still starting in the initial eight-second snapshot. Matching frontend, settled AI health and live acceptance remain unconfirmed. No agent ran live migrations or deployed changes. WebSocket upgrade still needs separate proxy/realtime acceptance.
- **Holds:** SEC-01 extensions need explicit design/sign-off. Canonical linked document sets, naming/ID conventions, automatic attachment processing holds, and delay/OR deadlines have not been invented.
- **Latest local follow-up:** Profile has an inline Verify action that sends email links separately from other drafts; those HTML emails now show a Verify Email button in both default/saved templates. Admin Maintenance returns protected photo/proof paths. Request selection focuses and reveals the labeled composer, and message refresh scrolls only history. Registration stores safe OCR review reasons and normalizes whitespace/dashes without fuzzy ID approval; legacy reasons remain unknown. The new first-login guided tour highlights real controls and offers question-mark replay with a refreshed chat icon. This follow-up is not deployed: it needs the unapplied `migrate_verification_reason.js` and `migrate_onboarding_guides.js`, backend plus AI rebuilds for the OCR changes, and the matching frontend. The complete runbook now includes 21 incremental scripts; do not rerun the old data migrations solely for these follow-ups.

The complete existing-server walkthrough is [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md), including fresh database/uploads backup, incremental prerequisites, stop-on-failure execution, schema presence verification and matching runtime/frontend rollout. No production schema import is required. The current complete list includes 21 migrations; the earlier reason-column follow-up is followed by the new onboarding-guide table. Email buttons alone require no migration, but the automatic tour requires this new table and matching backend/frontend.

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

**Backend recovery checkpoint:** The user rebuilt the backend after the approved import repair, received **`Backend startup imports OK.`**, and restarted it successfully. Compose now shows **backend, AI-engine and MySQL healthy**, with Caddy and n8n running. The backend HTTP health response reports **`status: ok` / `database: ok`**, timestamp **`2026-09-30T12:21:38.281Z`**. This confirms service recovery and an actual database query. The successful final server Git revision has not yet been provided. Public HTTPS access, staged-browser login, saved-record/upload checks and Vercel promotion remain unverified; health alone does not establish every workflow.

**Vercel browser checkpoint:** Brave loads the supplied `https://project-trace-8oshkukw8-fuyuu.vercel.app/`, but Vercel's deployment details identify it as the old production build from **`778447c`**, not the updated staged frontend. A fresh load still shows the old login identifier label. The inspected newer main deployment **`aee0790`** (PR #24, deployment `EoHpc3H28yCeBka6JLrohejmGVK4`) reports **`Build Failed: Invalid vercel.json file provided`**, before any build duration/log output. The deployments list also shows earlier main merges failing while dev preview builds are Ready. This establishes a deployment/configuration boundary failure; it does not yet establish the specific invalid property or a CORS/API failure. Local remote-tracking history lacks this main commit, so its configuration cannot be inferred from the current local file. Stop acceptance of the new frontend until that exact main configuration is investigated and a matching staged build is Ready. No Vercel settings, promotion, credentials, database records or migrations were changed during these browser checks. Automatic builds of main are expected with automatic production-domain assignment disabled; creating a staged build is separate from promoting it live.

Before opening the staged frontend, verify it uses the intended HTTPS API. `frontend/src/services/api.js` inlines `VITE_API_URL` at build time and sends requests directly when configured. `backend/src/config/cors.js` allows only the comma-separated `FRONTEND_URL` origins when set. A staged deployment's exact origin may therefore need inclusion alongside the production origin using the existing configuration mechanism. Do not clear the allowlist or allow arbitrary Vercel origins to make staging work. No CORS/env edits have been made; obtain the staged URL and inspect the configured allowed origins if browser requests fail.

First check the staged production frontend against the updated backend. If login fails only on the staged URL, inspect existing origin/cookie configuration before assuming the migration failed. Once the matching frontend/backend revision passes, open Vercel **Deployments**, select **… → Promote** for that exact ready staged build, and confirm. Recheck the production domain after promotion. Leave automatic domain assignment disabled for future controlled rollouts, or deliberately re-enable it once this rollout is complete. This guide does not claim that the prior frontend is compatible with every backend change while it remains live.

**Configuration-fix follow-up:** The user reports fixing the Vercel problem; the corrected source/settings and successful build are not yet verified. If the fix changes repository files, test the new main commit's deployment instead of redeploying the old `aee0790` source. If only Vercel build settings/environment changed, redeploying the existing commit can apply those settings. Keep automatic production-domain assignment disabled and promotion pending.

**Corrected frontend / CORS checkpoint:** Brave loads the new supplied `https://project-trace-bj4s24745-fuyuu.vercel.app/` with the updated TRACE branding and Student/Alumni/Staff login label. The user reports login failing at the preflight to `https://trace-plp-api.duckdns.org/api/auth/login`: the response lacks `Access-Control-Allow-Origin` for this exact staged origin. This confirms the frontend is calling the HTTPS API, but browser authentication is blocked before the login POST can complete. The existing REST/Socket.IO policy reads comma-separated `FRONTEND_URL`, supplied by root Compose configuration; check the running backend's allowlist before changing it. Preserve existing production origins, append only the intended stage origin if absent, and recreate the backend to load changed Compose environment. No allowlist change or promotion has been performed. The user also requested removing sign-in confirmation; its exact-file plan remains pending, with the current frontend baseline **347 tests passing**.

**Running allowlist confirmed:** The user's VM command prints `FRONTEND_URL=https://project-trace-two.vercel.app`, excluding the new stage origin. Proposed root server `.env` value: `FRONTEND_URL=https://project-trace-two.vercel.app,https://project-trace-bj4s24745-fuyuu.vercel.app`. Keep both exact HTTPS origins with no trailing slash. Validate Compose configuration, then recreate only backend with `docker compose up -d --no-deps --force-recreate backend`; a plain restart does not load changed Compose environment. Recheck the running value, API health, and staging login before promotion. The edit/recreation and successful CORS/login response remain pending user execution. This configuration change requires no image rebuild, code change or database migration.

**Staff OTP checkpoint:** After the CORS instructions, the user reports reaching email OTP but the tested account has a dummy recipient address. Reaching this step supports successful browser login POST/password validation; completed authentication and SMTP delivery remain unverified. Current `auth.service.js` requires OTP for both Admin and clerk roles regardless of `two_factor_enabled` and sends it to the stored user email. The sign-in confirmation dialog is separate from this security challenge. Correct the intended account's recipient through an accessible authorized Admin, or scope a single-account operator recovery if none can log in. Target identity, recovery authorization and a controlled replacement mailbox are still pending; no account/email/OTP or authentication policy has been changed, and no stored OTP has been read.

## Sign-in Confirmation Follow-up — 2026-09-30

The user approved six exact files: `frontend/src/pages/LoginPage.jsx`, its existing `frontend/src/pages/__tests__/submission.confirmations.test.jsx`, `frontend/src/pages/HelpPage.jsx`, `docs/CODING_PREFERENCES.md`, `docs/USER_MANUAL.md`, and this progress log. The user also requested loading animations whenever the system loads and subsequently approved the six additional app-wide loading files listed below.

Re-verification located the shared confirmation at `LoginPage.jsx:87–90`, staged submission at lines 21–37, and the existing spinner gated only by `useAuth.loading`, leaving OTP pending state outside that indicator. Login and OTP now submit directly from the form, keep required OTP/token handling, report errors inline, and share an announced Processing spinner with reduced-motion support. A ref rejects duplicate submission synchronously; pending credential/code inputs and the OTP back action are disabled. Tests cover direct click/Enter submission, validation, pending/loading protection, retained credentials/code, OTP payload and retry after failure. The manual, FAQ and coding convention document the explicit D-05 sign-in exception. No backend/auth policy, dependency or migration changed.

The user identified `ADMIN001` for SSH email recovery. The read-only lookup confirms **id 1, role admin, active 1**. A parameterized, transactional operator recovery command was supplied: require that exact active Admin row, reject an email already used by another account, update its recipient and clear old login/email-change challenges. Its replacement address is entered privately at the terminal; no OTP is read or bypassed. The first lookup heredoc had an indented closing delimiter; cancellation and a single-line replacement were supplied. Subsequent recovery attempts used curved shell quotes and a double-quoted JavaScript command containing `!`; Bash rejected them before the Node recovery ran. Straight-quote guidance, disabling Bash history expansion for this session, and a plain `read -r TRACE_RECOVERY_EMAIL` input step were supplied. Later server logs confirm email dispatch; the user confirms receiving the code. Completed authentication remains blocked by the missing audit table described below.

Before-edit frontend baseline: **347 tests passing**; backend baseline: **566 passing**. After the change, **350 frontend tests pass**, including all **9** tests in the account-submission file; targeted ESLint on the three changed JSX/test files, the frontend production build and `git diff --check` pass. Existing local-storage and large-chunk warnings remain. Only the six approved files changed. No implementation finding contradicted the scoped plan. This validates local behavior and packaging, not a deployed sign-in or SMTP delivery. The source change has not been committed, pushed or promoted by this session; stage promotion and completed staff login remain pending.

**App-wide loading, approved and implemented:** Existing role dashboards, reports, maintenance, analytics, Graduate application/review, chat and protected previews already render spinners. The shared axios client now publishes the number of pending requests; `useApiActivity` subscribes through `useSyncExternalStore`, and `App` reuses compact `DashboardLoading` for a non-blocking indicator above dialogs. Exact additional approved files: `frontend/src/services/api.js`, new `frontend/src/hooks/useApiActivity.js`, `frontend/src/components/DashboardLoading.jsx`, `frontend/src/App.jsx`, new `frontend/src/services/__tests__/api.activity.test.js`, and new `frontend/src/components/__tests__/DashboardLoading.test.jsx`, plus the already-approved docs. Tests cover overlapping requests, errors, AbortController and CancelToken cancellation, late completion, preserved bearer/OTP behavior, navigation and reduced-motion classes. This tracks shared API requests, not third-party image loads or Socket.IO events. Empty data alone does not indicate loading; no empty-state spinner was added.

**Resend OTP, requested and implemented:** Within the already-approved Login/FAQ/manual/conventions/test scope, the OTP screen can request a new challenge through the existing password-validated login endpoint after a 60-second cooldown. Pending controls prevent duplicate sends. Successful resend clears the old entered code, replaces the temporary challenge and announces use of the latest email. Failures remain inline and do not claim success. The server login limiter remains in force; no new endpoint or OTP bypass was added. Focused frontend checks pass **20 tests**, including fresh-challenge verification, cooldown, duplicate-send protection and failed-send handling.

**Live OTP audit-table blocker, approved repair:** The user's server logs show `ER_NO_SUCH_TABLE` for `security_logs` during accepted OTP verification, followed by 401 when the consumed code is retried. Current code confirms `auth.service.js:490–493` clears the code before inserting the login audit event. The canonical table already exists at `backend/database/schema.sql:97`, but the original explicit Batch 8 migration omitted it. This contradicts the earlier assumption that successful migrations plus database health established all login schema dependencies. The user approved five exact files: `backend/database/migrate_batch8.js`, `backend/src/services/__tests__/batch8.auth-boundary.test.cjs`, `docs/ENV_SETUP_GUIDE.md`, `docs/BACKEND_GUIDE.md`, and this log. The migration now creates that existing table with `IF NOT EXISTS`; regression coverage compares its DDL to the canonical schema and checks reruns without record mutations. An initially overbroad test matched the foreign key's `ON DELETE CASCADE` as a deletion command; narrowing the assertion to SQL statement starts resolves the test error. No auth execution order, schema definition, account data or live database was changed by this implementation. Rebuild the repaired backend image and explicitly rerun this migration on the server, then recreate backend and request a fresh code. Do not reseed or restore. SSH execution, complete staff login and Vercel promotion remain pending.

**Final local validation:** `npm --prefix frontend test` passes **361 tests / 41 files**; `npm --prefix backend test` passes **567 tests / 24 files**. Targeted ESLint on all nine changed frontend source/test files, `npm --prefix frontend run build`, and `git diff --check` pass. Existing Node local-storage and frontend large-chunk warnings remain. Tests mock backend migration execution rather than applying it to a database. No source was committed, pushed or deployed by this session; live migration/login and browser acceptance remain pending. The approved indicator covers shared HTTP activity rather than every background task.

| Changed file | Purpose |
| --- | --- |
| `backend/database/migrate_batch8.js` | Create the existing login audit table during explicit upgrades/reruns. |
| `backend/src/services/__tests__/batch8.auth-boundary.test.cjs` | Check canonical audit DDL and safe reruns. |
| `frontend/src/pages/LoginPage.jsx` | Direct Login/OTP submission, inline errors, processing/duplicate protection and cooled-down resend. |
| `frontend/src/pages/__tests__/submission.confirmations.test.jsx` | Cover direct submissions, failure retry, pending controls, resend and fresh challenge use. |
| `frontend/src/services/api.js` | Publish pending request activity; finish on success, error or cancellation. |
| `frontend/src/hooks/useApiActivity.js` | Subscribe React to the shared request count. |
| `frontend/src/components/DashboardLoading.jsx` | Reuse accessible/reduced-motion loading in full and compact forms. |
| `frontend/src/App.jsx` | Show non-blocking shared API activity through navigation. |
| `frontend/src/services/__tests__/api.activity.test.js` | Cover concurrency, errors, cancellation and retained auth behavior. |
| `frontend/src/components/__tests__/DashboardLoading.test.jsx` | Cover loader accessibility, navigation and continued interaction. |
| `frontend/src/pages/HelpPage.jsx` | Synchronize FAQ sign-in, resend and loading guidance. |
| `docs/CODING_PREFERENCES.md` | Document the sign-in exception, resend and shared activity conventions. |
| `docs/USER_MANUAL.md` | Explain direct sign-in, latest-code resend and loading feedback. |
| `docs/ENV_SETUP_GUIDE.md` | Provide targeted missing-audit-table rollout commands and verification. |
| `docs/BACKEND_GUIDE.md` | Record migration coverage, failure cause and fresh-OTP recovery. |
| `docs/PROGRESS.md` | Record approval, investigation, changes, validation and outstanding live checks. |

## Post-OTP Session and Manifest Repair — 2026-09-30

The user reports OTP verification completing but returning to Login, plus missing Resend OTP and PWA icon errors. Baseline is clean `dev` at `6f1eaa2`: **567 backend tests / 24 files** and **361 frontend tests / 41 files** pass. The user approved six exact files before editing, then separately approved the manifest credential option within the same Vite file. No agents were delegated, dependency changes made, or live credentials requested.

Re-verification confirms both JWT issuers at `backend/src/services/auth.service.js:137,503` used `user.token_version || 1`, while schema and migration default the stored version to zero. Middleware at `backend/src/middlewares/auth.middleware.js:25–29` correctly requires equality. A read-only local probe through the actual OTP service and middleware, with all database operations replaced by fixtures, produced **stored 0 → issued 1 → authenticated request 401**. This establishes the code defect; the requested read-only live ADMIN001 version check remains pending. Six new service-to-middleware cases cover password and staff-OTP issuance at zero/nonzero versions and rejection after increment. Before the fix, four cases failed as expected: zero issuance mismatched, and that incorrectly issued token became accepted after a stored increment to one. After preserving zero with `?? 0`, all 57 auth-file tests pass. Middleware and global-logout behavior remain unchanged; no account-version update or new migration is required for this correction.

The user confirms testing the earlier immutable deployment URL explains the missing Resend control, and supplies the newer `https://project-trace-r3ri78di8-fuyuu.vercel.app/`. The older URL is protected by Vercel authentication, so direct inspection did not reveal its bundle/commit. The new deployment's exact commit and rendered OTP controls remain unverified. The user also reports manifest SSO redirects and login preflight failure on the newer origin. An unauthenticated, read-only API preflight confirms **HTTP 204 without Access-Control-Allow-Origin** for that origin. Root server `.env` instructions append this exact origin while preserving existing entries, then validate Compose and recreate only backend. Successful live reconfiguration remains pending; API CORS was not broadened in code.

**Next deployment-origin checkpoint:** The user now reports the same login preflight rejection from `https://project-trace-oik652o6a-fuyuu.vercel.app`. This is another distinct deployment origin; allowing the previous hostname does not allow this one. Instructions append the exact new origin to root `.env`'s existing `FRONTEND_URL`, validate Compose, recreate backend, then inspect only the running allowlist. No frontend rebuild or database migration is needed for this environment-only change. The latest local workspace is clean before this finding update, but the running server revision, updated allowlist and completed login have not been independently confirmed. No remote configuration was edited by this session.

The approved PWA repair reuses the existing TRACE SVG instead of nonexistent 192/512 PNGs and includes only the existing favicon asset. The later approved `useCredentials: true` option is verified in the installed plugin's declarations/implementation; it generates a credentialed manifest link for protected deployments. These repairs address separate missing-file and manifest-session boundaries; the current frontend does not gain or remove Vercel protection rules. SVG manifest format follows the [Web Application Manifest specification](https://www.w3.org/TR/appmanifest/). Protected-manifest and physical PWA installation acceptance remain pending.

| Approved changed file | Change |
| --- | --- |
| `backend/src/services/auth.service.js` | Preserve stored zero in password/OTP token issuance. |
| `backend/src/services/__tests__/auth.service.test.cjs` | Exercise issued tokens through middleware; check valid versions and incremented-version rejection. |
| `frontend/vite.config.js` | Use existing TRACE SVG and credentialed manifest link; remove missing asset references. |
| `docs/BACKEND_GUIDE.md` | Document session-version cause, retained revocation checks and code-only recovery. |
| `docs/ENV_SETUP_GUIDE.md` | Provide backend rebuild/fresh-login, staged-origin and protected-manifest guidance. |
| `docs/PROGRESS.md` | Record approval, reproduction, later findings and outstanding live verification. |

The original report combined authentication, manifest and deployment-version symptoms. Later investigation separated them: the API allowlist blocks the newest origin before password validation; the existing backend version mismatch blocks authenticated requests after OTP; the PWA PNGs are absent; and Vercel SSO requires credentialed manifest requests. Source repair does not substitute for the live `.env` update. No files outside the approved scope were edited. Commit/push/merge, server rollout, fresh completed login, latest Resend display and production promotion remain pending user execution.

Final local checks pass: **573 backend tests / 24 files**, **361 frontend tests / 41 files**, Vite-config ESLint, frontend production build and `git diff --check`. The built manifest names only the existing TRACE SVG; its file is present, the generated manifest link has `crossorigin="use-credentials"`, and the service worker precaches that icon. The existing large-bundle and Node local-storage warnings remain. These checks establish code/build behavior, not successful protected-deployment login or live CORS reconfiguration. No source was committed, pushed or deployed by this session.

**Running-origin mismatch confirmed:** The user's backend prints the production origin plus `https://project-trace-oik652o6a-fuyuu.vercel.app/` with a trailing slash. The browser sends the slash-free origin, so the existing exact allowlist does not match it. Correct only the trailing slash in root server `.env`, validate Compose, recreate backend and recheck the running value. This requires neither an image rebuild nor a database migration. Corrected runtime output and completed login remain pending user execution.

## Admin Runtime Repair — 2026-09-30

The user subsequently reported completed login; supplied backend/Caddy logs show successful login/OTP/authenticated requests and the matching slash-free allowed origin. This supersedes the preceding pending-login note. Investigation baseline was `dev` at `dbb844e`, with the existing progress-note edit preserved. The user explicitly approved the seven files below, including the narrow missing-table migration exception. No authentication, realtime or AI code changes were authorized by this approval.

| File | Change |
| --- | --- |
| `frontend/src/features/admin/AdminDashboard.jsx` | Import the existing Admin Security panel used by the Security tab. |
| `frontend/src/features/__tests__/dashboards.render.test.jsx` | Exercise the actual Security tab/panel and its log fetch/empty state. |
| `backend/database/migrate_student_profiles.js` | New standalone explicit conditional table creation matching `schema.sql`. |
| `backend/database/__tests__/migrate_student_profiles.test.cjs` | Base-schema alignment, safe conditional reruns, error propagation and import-without-query checks. |
| `docs/ENV_SETUP_GUIDE.md` | Backend rebuild, explicit migration, restart and live lookup acceptance steps. |
| `docs/BACKEND_GUIDE.md` | Profile-table dependency/recovery and explanation of repeated staff login OTP. |
| `docs/PROGRESS.md` | Approval, confirmed causes, verification results and remaining findings. |

- **Security tab:** `AdminDashboard.jsx` rendered an unimported `AdminSecurityPanel`. The new regression failed with that exact ReferenceError before the import repair and passes afterward. The existing panel and authorization remain unchanged.
- **Student profile 500:** live backend logs confirm `ER_NO_SUCH_TABLE` for `student_profiles` during the authorized lookup's LEFT JOIN. The base schema defines this table, but existing upgrade scripts omitted it. The new migration issues only `CREATE TABLE IF NOT EXISTS`, retaining the canonical user foreign key. It does not modify users, rewrite profile rows, backfill personal information, or reconcile an existing table's columns. Users without a saved profile row have null joined personal/education fields. No live migration was applied by this session; rollout and successful lookup still require SSH execution.
- **WebSocket remains unresolved:** a direct anonymous Engine.IO WebSocket handshake through the public Caddy endpoint returned **101 Switching Protocols**. Supplied logs show repeated successful Socket.IO polling requests. This verifies transport availability and polling fallback, not the browser's polling-session upgrade or authenticated notification delivery. No transport forcing or Caddy change was made. Missing upgrade entries in these logs do not prove a request never reached Caddy.
- **AI finding:** forecast and insight fetches abort at the existing 15-second deadline while their API endpoints return fallback responses. Slow/unavailable AI work requires separate engine/log/resource investigation; no timeout or AI code change was made.
- **Repeated OTP explanation:** `auth.service.js` requires 2FA when `two_factor_enabled || isStaff`; Admin and clerk logins always request a fresh code, including after logout. Recognition cookies control first/new-browser notices and do not bypass OTP. No authentication-policy change was requested or implemented.

Validation: baseline **573 backend / 361 frontend** tests passed. Final **577 backend tests / 25 files** and **362 frontend tests / 41 files** pass, as do the frontend production build, migration/test syntax checks and `git diff --check`. Targeted frontend ESLint decreases from three errors to two: the missing-panel reference is resolved; pre-existing unused `AdminTemplatesPanel` and `ConfirmDialog` imports remain. The edited regression test has no lint diagnostics. Existing build-size and Node local-storage warnings remain. Mocked migration checks do not establish live MySQL acceptance. No commit, push, deployment, migration execution or production promotion was performed by this repair.

## Batch 10: Admin Templates Recovery — 2026-09-30

The user reported that the preceding Admin Security/profile-table repair now works. Baseline for this scope was clean `dev` at `acd4136`, with **577 backend / 362 frontend** tests passing. The user approved exactly the seven files below, including the narrow backend pool-import exception. No Finance, profile-completion, authentication-policy, database migration or deployment changes are included.

| File | Change |
| --- | --- |
| `frontend/src/features/admin/AdminDashboard.jsx` | Add the missing `admin-templates` render branch using the existing panel. |
| `frontend/src/features/admin/components/AdminTemplatesPanel.jsx` | Load-error/retry/empty states, selection-safe details, and isolated HTML preview; confirmed save retained. |
| `frontend/src/features/__tests__/dashboards.render.test.jsx` | Actual-tab regression checks for load, preview isolation, wrapper-style injection, list/detail retry, empty catalog and stale-selection save protection. Mock the existing analytics service so tab tests do not make unrelated network requests. |
| `backend/src/models/template.model.js` | Destructure the configured pool; existing SQL/bindings unchanged. |
| `backend/src/models/__tests__/template.model.test.cjs` | New real-model/mocked-pool list/read/update/error regressions. |
| `docs/BACKEND_GUIDE.md` | Template contract, preview limits and paired rollout/live acceptance. |
| `docs/PROGRESS.md` | Findings, approval, validation and separate remaining Batch 10 scopes. |

The frontend regression reproduced the empty tab before wiring. All four new model regressions initially failed with `pool.query is not a function`, confirming the import defect. The panel now loads the existing catalog/details, surfaces failures with Retry, offers no blank save for an empty/missing detail, and ignores stale responses when selection changes. The existing cancellation/confirmed-save regression remains green. The preview replaces direct app-DOM HTML injection with an empty-sandbox iframe and restrictive CSP, retaining sample substitutions and supported fonts/sizes. Stored template HTML and other consumers are unchanged; this is not a whole template-engine security acceptance claim. [MDN's iframe reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) documents the sandbox restrictions used.

### Agreed decisions for later scopes

- **CN-15/CN-08/D-10:** students see itemized charges and calculations as well as the total. This supersedes hiding “How the Amount Was Worked Out.” College/document/item/rental/special fee rules and historical-price preservation still need their own design and file scope.
- **FIN-01–FIN-04/D-08:** payment clearance sends an acknowledgment immediately. If OR issuance/upload is deferred, send the actual digital OR when issued and route it to Secretary for release. The same-day cut-off starts at exactly **4:00 PM Asia/Manila**. A payment acknowledgment must not be labeled an official receipt. Each workflow item requires separate scoping; the code has a deferred-upload path that needs verification, not an assumption that nothing exists.
- **SEC-11 clerk trust:** Admin OTP every login; clerks may trust a personal browser for today after successful OTP; shared computers require OTP each login. Password changes/resets and logout-all revoke trust. Existing browser-recognition cookies only control alerts and cannot be reused as proof of MFA. The separately approved authentication implementation is recorded below; live cookie acceptance remains pending.
- **SEC-16:** accept any email domain; verify with a time-limited, single-use one-click link, offer resend, gate requests/sensitive features, and reverify email changes. No PLP domain restriction. Existing ID/document approval is distinct from email verification.
- **PROF-01–PROF-05 and SEC-07–SEC-16:** current code already contains personal/educational fields, conditional profile progress, password change/reset, OTP/email-change routes, audit logs and a Security settings tab. Docket claims that none exist are stale. Each item needs current behavior/gap verification, backend enforcement and its own approved plan before implementation. Bcrypt remains unchanged.

Live template table/default records, MySQL persistence, physical-device behavior and browser sandbox enforcement remain deployment/acceptance checks. No missing-table migration or seeding was inferred from the frontend's empty tab. WebSocket upgrade and AI timeout findings from the previous repair remain open. No commit, push or deployment was performed.

Validation: **581 backend tests / 26 files** and **368 frontend tests / 41 files** pass, along with the frontend production build, backend model/test syntax checks and `git diff --check`. The existing template cancellation/confirmed-save test passes. The edited Templates panel and dashboard regression file pass ESLint; targeted diagnostics fall from **4 errors / 1 warning** to **1 error / 0 warnings**, with only the pre-existing unused `ConfirmDialog` import in `AdminDashboard.jsx` remaining. The build-size and Node local-storage warnings persist. Tests use synthetic API data and a mocked database pool; they do not prove live persistence or browser sandbox enforcement.

## Batch 10: Clerk Browser Trust — 2026-09-30

The user approved the 18 exact files, including the new trust storage/migration and narrowly scoped backend authentication changes. During implementation they separately approved one additional test file, `backend/src/services/__tests__/batch8.auth-boundary.test.cjs`, because its HTTP mock lacked cookie clearing and its OTP call asserted the previous signature. The approved scope is now **19 files**. The preceding seven-file Templates changes were preserved uncommitted; the current trust baseline was **581 backend / 368 frontend** passing tests. No agents were delegated.

| Approved file | Change |
| --- | --- |
| `backend/src/controllers/auth.controller.js` | Forward actual cookies and boolean consent; set an HttpOnly trust cookie without exposing its value in JSON; clear it for shared mode and successful credential/global-logout actions. |
| `backend/src/services/auth.service.js` | Personal-mode clerk trust after password validation; signed challenge eligibility/version; OTP-only grant; atomic credential update/version revocation/OTP clearing. |
| `backend/src/services/trustedBrowser.service.js` | New random proof/hash, strict clerk eligibility, Manila midnight expiry, matching cookie settings, fail-closed lookup and version-checked grant transaction. |
| `backend/src/models/trustedBrowser.model.js` | New parameterized proof lookup/insert and account-row lock. Lookup checks ownership, current clerk role/activation, version and expiry. |
| `backend/database/schema.sql` | Add the canonical hash-only proof table for new databases. |
| `backend/database/migrate_trusted_browsers.js` | New explicit/import-safe conditional table creation for existing installations. |
| `backend/database/__tests__/migrate_trusted_browsers.test.cjs` | Canonical DDL, safe reruns, failures and no queries on import. |
| `backend/src/services/__tests__/auth.service.test.cjs` | Admin/shared/personal/optional-student MFA policy, bad-password/code guards, consent, versions and atomic password-change revocation. |
| `backend/src/services/__tests__/passwordReset.service.test.cjs` | Reset/revocation transaction, rollback and locked-link recheck. |
| `backend/src/services/__tests__/trustedBrowser.service.test.cjs` | New expiry/cookie/hash/role/version/storage-failure and real SQL regression checks. |
| `backend/src/controllers/__tests__/trustedBrowser.controller.test.cjs` | New secret-isolation/cookie/revocation checks and real-controller/service flow with mocked storage. |
| `backend/src/services/__tests__/batch8.auth-boundary.test.cjs` | Separately approved response-mock and argument update; original full-auth recognition/security assertions retained. |
| `frontend/src/pages/LoginPage.jsx` | Shared mode by default; eligible clerk opt-in during OTP; retain duplicate protection, inline errors, keyboard submission and 60-second resend. |
| `frontend/src/services/authService.js` | Serialize shared mode with strict false as the sole personal-mode value. |
| `frontend/src/pages/__tests__/submission.confirmations.test.jsx` | Default/shared/Admin eligibility, personal clerk consent and resend-mode/consent behavior. |
| `frontend/src/services/__tests__/authService.test.js` | New serialization/default-mode/OTP payload checks. |
| `docs/BACKEND_GUIDE.md` | Contracts, version revocation, migration and limits. |
| `docs/ENV_SETUP_GUIDE.md` | Explicit rollout steps and live acceptance checks. |
| `docs/PROGRESS.md` | Scope approvals, evidence and remaining work. |

Admin still verifies every login. A clerk must explicitly select personal mode at each login and opt into trust after successful OTP; shared mode ignores/clears any earlier proof. New `trace_mfa_trust` values are random, separate from `trace_device`, and stored only as SHA-256 hashes plus user/version/UTC epoch expiry. They expire at the next **midnight Asia/Manila**, not 24 hours after issuance. Missing/invalid/blocked/expired/revoked cookies or unavailable storage require OTP. No raw proof appears in JSON or trust error logs. Grant failure leaves a valid OTP login without browser trust.

Password changes/resets increment the existing version and clear login OTPs in the same transaction as the password write. Password-change concurrency checks compare the verified hash again under lock; reset links are rechecked/consumed under that lock. Rollback prevents successful credential writes without revocation. Logout-all already increments the same version. Old proofs and pending challenges cannot be upgraded to the new version. This also expires existing JWTs, including the current session: sign in again afterward. Existing pending tokens without version binding require a fresh login after deployment. Trust expiry affects the next login, not an existing authenticated session.

The new service regressions first failed because the approved new implementation modules did not exist, then passed. An initial auth test-fixture error was corrected by spying on the actual CommonJS pool's `getConnection`; the Vitest ESM factory was not the imported CommonJS object. A new frontend test initially lacked explicit Vitest imports for ESLint; imports were corrected without changing source behavior. The complete controller/service flow test exercises password → OTP → trust cookie → later personal password login → shared/expired/revoked fallback, using synthetic accounts and mocked SQL storage.

Validation: **640 backend tests / 29 files** and **378 frontend tests / 42 files** pass. The frontend production build, targeted Login/auth-service/test ESLint, backend syntax checks and `git diff --check` pass. Existing large-bundle and Node local-storage warnings remain. No live database or SMTP was exercised, no real account/session was changed, and no actual cross-site cookie persistence or physical-phone behavior was verified. Automated fixtures do not establish live MySQL locking/commit behavior. The explicit migration and acceptance runbook have not been executed on the server. No commit, push, deployment or production promotion was performed.

This is the approved clerk-trust addition only. The site cannot identify a physically shared device; user selection is required. Browser third-party-cookie policies can still block persistence despite credentialed CORS ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#requests_with_credentials)). No new environment variables/dependencies, automatic session redesign, authenticator/back-up codes, other SEC-07–SEC-16 acceptance, Finance or Profile Completion implementation is included. Remaining security gaps (including comprehensive active-account/session/realtime revocation, reset-flow requirements and credential-safe audit logging) require their own current-code scope. Batch 10 fee-calculation visibility, acknowledgment versus OR, 4:00 PM cutoff and any-domain verification-link decisions above remain unchanged and unimplemented.

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


## Batch 10: CN-15/CN-08/D-10 Fee Schedules — 2026-10-01

### Approved decisions and resulting behavior

The user approved the 35-file pricing scope, added the TOR student hook (36), then approved the existing Batch 8b workflow regression test (37) after changing the filing display to rates only. Admin configures default rates, complete college overrides and named items; Secretary enters actual printed pages per copy; Finance verifies payment. Rental/Special/named fees apply once per document type per request, not per copy. Students see the full calculation after final pricing, while the filing form shows informational rates only.

TOR now asks Year Started/Year Ended, with whole-year/order validation and purpose JSON storage. Study years never infer printed pages. The old semester interface remains accepted for older callers/records. Page-based final pricing uses pages per copy × copies × rate; flat pricing uses copies × rate. A three-page, two-copy TOR at ₱100 with ₱20 rental, ₱30 special and ₱10 certification bills ₱660.

Filing saves a trusted-college rate snapshot in its transaction. Final pricing ignores client amounts/rates and saves calculation, actual pages, basis and clerk atomically. Historical billed totals remain untouched; missing historical calculations are clearly identified rather than reconstructed. Older unpriced records require Secretary review of current rates. Multi-document billing still waits for every document and only Finance clears payment. The dashboard, checkout, Finance review and payment slip use the saved final breakdown. Admin rate changes affect later requests.

### Validation and deployment limits

Baseline: 640 backend tests (29 files), 378 frontend tests (42 files). Final verification is recorded below after the last checks. New tests cover migration retries/preservation, SQL bindings/atomic snapshots, complete overrides, exact monetary arithmetic and quantity bounds, trusted ownership/rates, role restrictions, grouped billing, TOR validation, rate-only filing, confirmations and saved bill rendering. Targeted lint and production build are also required before handoff. No live MySQL migration, SMTP test, real browser/payment acceptance, commit, push or deployment occurred. Follow the explicit fee migration and acceptance checklist in ENV_SETUP_GUIDE.md; do not reimport the schema or reseed production.

### Newly reported follow-ups — status after subsequent approvals

- FAQ: subsequently approved and repaired to use the available width with natural expanded-answer height; synthetic local browser checks recorded below.
- Profile photo: subsequently approved and consolidated to the camera picker, retaining validation, preview and confirmed saving.
- Security: the settings tab contains password/activity/session controls but no two-factor setup. Login checks a two_factor_enabled flag and emails codes. No authenticator enrollment, QR setup or recovery-code implementation exists. Earlier claims that the feature was available in Settings were incorrect. Student OTP is not first-login-only: enabled accounts receive a code every login, while disabled accounts do not get new-browser OTP. Clerk trust remains clerk-only; Admin always requires OTP.
- Accessibility: subsequently approved and implemented locally, including legacy pixel text/chart conversion and the responsiveness repair below. Live role/device acceptance remains pending.
- Window 1 messaging: FloatingSupportChat is mounted inside the student's main dashboard branch and returns null without a document. It opens one document conversation, not a general support thread or desk inbox. DocumentChat loads messages on mount/document change and after sending; incoming messages do not refresh automatically. No Window 1 DocumentChat render was found (Secretary evaluation embeds it). General pre-request messaging, a bubble across student tabs, Window 1 inbox/unread indicators and incoming updates require a dedicated scope and authorization tests. Attachments/processing holds stay deferred.

### Exact approved 37-file manifest

- `backend/database/__tests__/migrate_fee_schedules.test.cjs`
- `backend/database/migrate_fee_schedules.js`
- `backend/database/schema.sql`
- `backend/src/models/__tests__/document.model.test.cjs`
- `backend/src/models/__tests__/pricing.model.test.cjs`
- `backend/src/models/__tests__/referenceData.model.test.cjs`
- `backend/src/models/document.model.js`
- `backend/src/models/pricing.model.js`
- `backend/src/models/referenceData.model.js`
- `backend/src/services/__tests__/documents.service.test.cjs`
- `backend/src/services/__tests__/maintenance.service.test.cjs`
- `backend/src/services/__tests__/referenceData.service.test.cjs`
- `backend/src/services/documents.service.js`
- `backend/src/services/maintenance.service.js`
- `backend/src/services/referenceData.service.js`
- `backend/src/utils/__tests__/pricing.test.cjs`
- `backend/src/utils/pricing.js`
- `docs/BACKEND_GUIDE.md`
- `docs/CODING_PREFERENCES.md`
- `docs/ENV_SETUP_GUIDE.md`
- `docs/PROGRESS.md`
- `frontend/src/components/FeeBreakdown.jsx`
- `frontend/src/features/__tests__/batch10.pricing.test.jsx`
- `frontend/src/features/__tests__/batch4.confirmations.test.jsx`
- `frontend/src/features/__tests__/batch8b.workflow.test.jsx`
- `frontend/src/features/admin/components/FeeScheduleEditor.jsx`
- `frontend/src/features/admin/components/MaintenancePanel.jsx`
- `frontend/src/features/finance/components/FinanceVerificationModal.jsx`
- `frontend/src/features/secretary/SecretaryDashboard.jsx`
- `frontend/src/features/secretary/components/PaymentStubModal.jsx`
- `frontend/src/features/secretary/components/PricingModal.jsx`
- `frontend/src/features/secretary/useSecretaryDashboard.js`
- `frontend/src/features/student/StudentDashboard.jsx`
- `frontend/src/features/student/components/NewRequestModal.jsx`
- `frontend/src/features/student/useStudentDashboard.js`
- `frontend/src/utils/__tests__/pricing.test.js`
- `frontend/src/utils/pricing.js`

## Batch 10: Approved FAQ, Photo, Text Size and Profile Repair — 2026-10-01

### Result and diagnosis

Preferences persists 100%, 125%, 150% or 200% text in the browser and applies it before rendering. FAQ answers now use the full content width. The profile camera is the sole photo picker, preserving staged preview, validation and confirmed saving. Enlarging the root font originally inflated Tailwind spacing and kept desktop grids/header groups in narrow available space. The repair stabilizes spacing, wraps header/profile groups, stacks grids using content/dialog container widths, and retains horizontal scrolling for tables and dense charts. Profile content has one scroll area with a reachable Save footer. Print root size remains 100%.

The request gate previously used incomplete account projections and inconsistent completeness checks. Profile reads now join safe saved fields; frontend/backend helpers agree on required and conditional fields. New Request shows missing fields with a direct Edit Profile action, and student API filing checks saved completeness under the transaction before writes. A successful profile save refreshes authoritative account data; stale reads do not publish draft education into the completion cache. Staff-assisted intake is preserved.

The supplied server logs independently confirmed `d.student_id` without a table alias in document history and a missing `document_sequence_number` during Transfer insertion. Count/list now alias `documents d`; the approved explicit fee migration adds the missing nullable sequence column without rewriting historical data. Null file fields in the failing Transfer query confirmed that its reported 500 was SQL, not an attachment rule. No live migration or deployment has occurred.

### Approved 18-file UI manifest

- `frontend/src/pages/HelpPage.jsx`
- `frontend/src/components/ProfileSettingsModal.jsx`
- `frontend/src/components/FileUploadField.jsx`
- `frontend/src/layouts/Layout.jsx`
- `frontend/src/main.jsx`
- `frontend/src/index.css`
- `frontend/src/utils/textSize.js`
- `frontend/src/components/MiniSparkline.jsx`
- `frontend/src/features/admin/components/AnalyticsPanel.jsx`
- `frontend/src/features/admin/components/ForecastModal.jsx`
- `frontend/src/features/admin/AdminDashboard.jsx`
- `frontend/src/components/__tests__/ProfileSettingsModal.test.jsx`
- `frontend/src/components/__tests__/FileUploadField.test.jsx`
- `frontend/src/layouts/__tests__/Layout.test.jsx`
- `frontend/src/features/__tests__/batch10.accessibility.test.jsx`
- `docs/USER_MANUAL.md`
- `docs/CODING_PREFERENCES.md`
- `docs/PROGRESS.md`

### Approved profile repair additions and shared files

Eight additional files: `backend/src/models/user.model.js`, `backend/src/models/__tests__/user.model.test.cjs`, `backend/src/utils/profileCompletion.js`, `backend/src/utils/__tests__/profileCompletion.test.cjs`, `frontend/src/utils/profileCompletion.js`, `frontend/src/utils/__tests__/profileCompletion.test.js`, `frontend/src/hooks/useProfileSettings.js`, `frontend/src/hooks/__tests__/useProfileSettings.test.jsx`.

Ten already approved files are reused: backend documents service/test; frontend StudentDashboard, ProfileSettingsModal/test, Layout/test and Batch 10 pricing test; CODING_PREFERENCES and PROGRESS. Existing approved ENV_SETUP_GUIDE/BACKEND_GUIDE document rollout and SQL behavior.

### Verification and limits

Regression coverage includes safe profile SQL projection/locking, completion conditions and boolean normalization, forged completion flags, rollback without document/activity writes, attachment-free Transfer, authoritative profile refresh, missing-field popup/direct navigation, camera validation, persistent sizes and expandable FAQ answers for all roles. Synthetic local browser inspection reproduced then repaired header overlap and verified 320-pixel/200% profile and FAQ reflow, education scrolling and reachable Save, plus desktop 1280-pixel/200% FAQ wrapping. Desktop 150% request tables and existing document-support chat remain readable. Admin analytics at desktop/mobile 200% stacks cards and contains chart overflow; its workload table uses readable unbroken headings and a local scroller. It uses synthetic API responses and does not establish real SQL, SMTP, payment, Socket.IO or physical-device acceptance. Real backend/DB rollout and role-flow checks remain in ENV_SETUP_GUIDE. Authenticator setup, general Window 1 messaging and remaining Finance/security features are still pending.

Final automated checks: **739 backend tests / 35 files** and **442 frontend tests / 45 files** pass. Production frontend build, ESLint on all changed/new frontend JS/JSX, syntax checks on 20 changed/new backend JS/CJS files, matching frontend/backend profile helper cores and `git diff --check` pass. Repository-wide lint remains blocked by the existing unused React import in `AdminSecurityPanel.jsx` and reports the existing `updateRect` dependency warning in `OnboardingTutorial.jsx`; neither file is in this approved repair. No live migration, deployment, commit or push was performed.

## Acceptance checklist follow-up findings — 2026-10-01

Read-only findings before additional product repairs: Admin Templates' local render branch exists, but the shared document loader returns before that branch while history remains pending. Template list/detail requests have no deadline. Student names open the shared profile dialog across desks; its hook sends an unbounded lookup. A successful response without `student` sets no error, and the modal's `!user` branch continues to say Loading. The user reports the dialog opens but remains loading everywhere. This confirms the reported symptom and source failure modes, not the deployed HTTP/SQL cause; the exact deployed URL/request result is not yet supplied. Proposed repair uses bounded requests, explicit invalid-response/error states and retry, retaining stale-response cancellation and staff authorization.

Other checklist findings: staff deactivation calls guarded `notifications.notifyByEmail`, but notification.service exports `sendEmail` and no `notifyByEmail`; owner email is silently skipped. Password change/reset use the exported sendEmail adapter. Deactivation changes only is_active; current JWT middleware checks token_version, not active state. Signup currently renders its own SIGN UP/PLP heading without TRACE, despite an earlier docket claim that it reused AuthShell. Graduation gating precedes dashboard tabs, but Layout still exposes account/settings and no universal graduation-submission API gate was found. Shared axios has no general timeout; signup's AI deadline does not bound the whole registration request. These items are findings, not repairs or live acceptance passes.

The user explicitly requested removal of the shared header search bar on every screen; Layout's unused header input and its sole INPUT_LIMITS import were removed. Queue/report/account filters remain. Authenticator enrollment and recovery codes are absent and remain unimplemented; existing email OTP is not authenticator setup.


### Approved follow-up repairs and messaging findings

The user approved the three-file student-profile loading repair (useStudentProfile, its existing tests and StudentProfileModal) and the two-file direct-message-send exception (DocumentChat and its existing tests). Profile lookup now has a 15-second deadline, cancels stale responses, rejects missing profile data and offers Retry. Send/Enter submits directly; a synchronous guard blocks pending duplicates, failures keep the draft, and a failed post-send refresh cannot restore an accepted message. The message exception is recorded in CODING_PREFERENCES.

Within the earlier approved Templates scope, independent Admin panels now render before the core history loading gate. Template list/detail loads are bounded, cancelled when superseded, validate responses and offer retry without enabling a blank save after a failure. These local repairs do not identify or deploy a fix for an unknown live HTTP/SQL failure.

Read-only messaging findings before a broader repair: documentMessage.model imports the DB wrapper instead of its pool export; sendMessage calls undefined notifyInApp for an assigned-clerk notification and never notifies Window 1 when no clerk is assigned. Existing notifyStudent drops link_url, so notifications do not open a conversation. Window1Dashboard has no message view; FloatingSupportChat appears only in the main student dashboard and selects one request. Conversation reads have no incoming refresh or explicit loading error. The single read_at column represents a shared read state, not individual clerk read receipts. Repair must enforce student ownership and recognized staff desk access and must not turn notification failures after a committed insert into a false failed send. General pre-request conversations, attachments and processing holds are separate additions to the existing request threads.

Authenticator requirement confirmed by the user: enrollment must appear in the shared Profile Settings → Security for every account type (student, Admin, Window 1, Finance, College Secretary), with authenticator-app QR enrollment and recovery codes. This remains unimplemented; email login OTP is not authenticator enrollment. A visible nonfunctional toggle is not an acceptable completion.


### Acceptance checklist requested for this round

“Local verified” means source/automated or synthetic browser evidence, not production sign-off. Physical phone checks and real SQL/mail/session behavior stay open until performed on the deployed build. Findings precede new repair code in the sections above.

| Acceptance item | Current evidence and remaining check |
| --- | --- |
| TRACE branding everywhere, including favicon | TRACE signup/shell/favicon and payment/email defaults are present. The complete original locations list and deployed assets still need exhaustive acceptance. |
| First-login alumni graduation form; no other access until submitted | Local shell and API gates allow only graduation submission/read, logout and necessary email recovery. New-account deployed acceptance remains open. |
| Back to Login visible and clickable on originally reported viewport | Local verified again in Brave at 320 × 600, including actual click returning to Login. Earlier synthetic checks cover 375/768/1280. Original phone/browser was not supplied, so that exact environment is pending. |
| Alumni signup bounded; visible actionable failure; no silent hang | Client registration has a 60-second deadline and a persistent actionable error; AI retains its own deadline. Actual registration/SMTP/OCR timing remains pending. A timeout does not prove server rollback. |
| SEC-01 only after explicit design/sign-off | Historical docket records an approved implementation scope. No new SEC-01 code is included here; original design sign-off must be confirmed from its prior record before any extension. |
| Phone/email edits survive logout and login | Local profile persistence/refresh regressions pass; email remains pending until its single-use verification link succeeds. Actual deployed SQL write, logout/login and email delivery still need verification. |
| Account edit shows every listed field by account type | Current role forms/projected fields covered locally. Complete original notes field matrix and real-role review remain to reconcile. |
| Mobile inputs avoid zoom; viewport meta untouched | Source has 16px minimum input text and no viewport change. Physical iOS/Android focus/zoom check pending. |
| Nine-step tracker, snake, no mid-word splits on real phone | Local nine-step/measured line implementation and prior synthetic layout checks exist. Real phone and enlarged-font tracker acceptance remain pending. |
| Progress line reaches final node | Prior synthetic geometry check reported approximately 1px node/line alignment. Physical device acceptance pending. |
| REJECTED/APPROVED distinct from active statuses | Local status helper/presentation regressions pass; historical rejected/approved states use distinct treatments. |
| Circular queue badges, zero hidden, readable in both tab states on Secretary/Finance | Shared QueueTabs condition/style exists and desk queue tests pass. Both themes, multi-digit counts and physical/enlarged-text visual acceptance remain pending. |
| Seven-day forecast Y-axis scales for low/high data side by side | Scale regression checks max 10 → ceiling 15 and max 100 → 120; card/modal use shared domain. Actual side-by-side rendered chart review remains pending. |
| Reports dates readable and amounts formatted with ₱ | Local formatting/source/role report checks exist. Live populated export/dates and currency review pending. |
| Registered Users and System Maintenance one screen | Local implemented: admin-users routes to MaintenancePanel; combined Accounts management exists. Live build check pending. |
| Applicant Type visible in Admin verification | Local implemented and covered by Admin review/presentation checks. Live table check pending. |
| AD-04/AD-06 settings actually change student/alumnus ST-02 options | Server policy/forged-request rejection and frontend option regressions exist. Real Admin save → student/alumnus session acceptance pending. |
| Incomplete profile cannot file; exact missing fields shown | Local verified: saved-data frontend/API guard tests, missing-field popup and direct Edit Profile action. Paired deployed code/schema and bypass check pending. |
| Password change/reset/deactivation notify owner | Correct email adapter and owner notices covered locally. Real SMTP acceptance remains open. Staff with no email cannot receive owner email; app enrollment does not invent an address. |
| Every NEEDS INVESTIGATION item has a written finding before code | Findings recorded for items investigated this round and prior scopes. Entire original flagged-item list is not available as one checklist; exhaustive sign-off remains pending. |
| Vitest suites green | Current continuation results are recorded at the end; prior numeric checkpoints below are historical. |

### Remaining batch work at the earlier 739/455 checkpoint (superseded by Current Status)

- Earlier batches: complete the deployed acceptance and physical-device checks above, including genuine sessions, mail, OCR, protected records, reports and payment/provider integration. Existing malformed request-group and printed-slip findings remain separate. DOC-02 photocopy policy and DOC-03 attachment/processing-hold additions remain deferred.
- Batch 9: CN-01 Program/Course on payment slip/OR; reconcile CN-02 removal of Copies with the later approved quantity/pricing behavior; CN-05 identity/name conventions; CN-06/CN-10 canonical document forms and linked sets; CN-07 same-day eligibility; CN-09 durable numbering/original issuance; CN-11 full messaging; CN-12 email-template consumption; CN-13 delay/SLA notifications; CN-14 submission QR/alumni continuation. Good Moral retirement and Diploma defaults have reported live migration success; remaining application acceptance still applies.
- Batch 10: FIN-01–FIN-05 receipt/acknowledgment workflow, distribution, deferral, 4:00 PM Manila cutoff and dedicated Finance export; PROF-05 onboarding; remaining SEC-07–SEC-16 account/session/email hardening and authenticator enrollment/recovery codes. Existing implementations are partial, not blanket completion of those security items. Approved pricing/profile/FAQ/photo/text-size work is local and requires paired backend/frontend rollout and the explicit fee migration.
- Current additions: three-file profile loading repair and direct Send/Enter are implemented locally; broader Window 1 messaging scope awaits approval. Authenticator setup must be in Security for all account types, per the user's latest requirement. General support before a request is a distinct conversation design from the existing document chat.

Follow-up verification: **455 frontend tests / 45 files pass** after the final conversation-switch/account-loading guards and wrong-student/missing-ID profile regressions. Frontend production build, ESLint on the ten follow-up JS/JSX files and git diff --check pass. Backend was unchanged in this follow-up; its latest round-start run remains **739 tests / 35 files passing**. Build retains the existing large-chunk warning. Native Brave at 320 × 600 with 200% text shows the Admin Templates heading, malformed-catalog error and usable Retry; actual Retry was clicked using the local synthetic fixture. This confirms accessible failure behavior, not a successful production catalog/SQL fetch. The original physical-phone acceptance remains pending. No live migration, deployment, commit or push was performed.

### Authenticator design for approval — all account types

Current-code finding before implementation: no authenticator table, QR enrollment, TOTP verification or recovery-code flow exists. Login sends email codes based on the existing two_factor_enabled/staff policy. Shared ProfileSettingsModal already exposes Security to every account type, so one working enrollment panel there can serve students/alumni, Admin, Window 1, Finance and College Secretary. authenticate currently does not reject pending_2fa tokens; a temporary password-only challenge must never authorize account/settings APIs. This boundary repair is required by the proposed authenticator integration, rather than postponed behind a cosmetic settings toggle.

The user approved this 36-file authenticator scope and the 23-file two-way messaging scope on 2026-10-01, and authorized completing the remaining batches. Implementation and verification are in progress. Previously unresolved business decisions will be documented and clarified without inventing institution policies.

Approved behavior; implementation in progress:

- Security → Two-factor authentication shows server-confirmed status and a Set up authenticator app action for every account type. Re-enter the current password, scan a locally generated QR or use a manual setup key, then enter the app's six-digit code. Enrollment expires after ten minutes and only becomes enabled after successful code verification. Closing the panel discards displayed secrets; pending setup never replaces an active factor.
- After activation, show ten random single-use recovery codes once, with accessible copy/download and a saved-codes acknowledgment. Store only their hashes. They can verify login or authorize factor changes when the phone is lost; regeneration invalidates all previous codes. If both the app and codes are lost, the UI directs the person to an identity-verified operator recovery process; no insecure email-only bypass or automatic reset is introduced.
- Preserve the approved login frequency: Admin verifies every login; clerks can retain explicit personal-browser trust until Manila midnight, while shared devices, new browsers, expired or revoked trust require verification. Students/alumni opt into authenticator verification on every login; unenrolled students do not acquire a new first-login/new-browser OTP policy in this scope. For an enrolled account, use its app or a recovery code when verification is required. Email OTP remains the existing method for unenrolled mandatory-staff accounts, not an enrolled factor fallback. Disabling the app does not disable mandatory staff login verification.
- Setup, disable and recovery-code regeneration require current-password verification; enrolled-factor changes additionally require the app or one recovery code. Confirm sensitive changes, notify the registered email after success, and write credential-free security events. Revoke previous session versions, browser trust and pending challenges on factor changes. Provide a freshly authenticated replacement session for the current browser only after successful verification; pending enrollment does not revoke existing sessions.
- Use six-digit RFC 6238 codes with 30-second steps and a bounded one-step clock tolerance. Encrypt both pending and active secrets with AES-256-GCM under a dedicated MFA_ENCRYPTION_KEY (32 random bytes, no default, separate from JWT_SECRET). Bind encrypted records to the account; never log, persist in browser storage or return an active secret. Reuse the installed frontend qrcode package and Node crypto; no external MFA/QR service is required. Missing or invalid encryption configuration fails closed for authenticator operations, with deployment instructions rather than an email downgrade.
- Use transactional account locks for activation, factor changes, challenge consumption, replay prevention and recovery-code consumption. Bind a five-minute login challenge to user, method and session version; persist its nonce hash and enforce a failed-attempt cap, expiry and single-use consumption. Reuse the existing login limiter on sensitive endpoints. Keep authenticated-session access distinct from temporary OTP challenges and reject inactive/revoked accounts.
- Migration is explicit/idempotent and preserves users and existing email-OTP/trust records. Apply schema/key configuration before deploying the paired API/frontend. Tests cover published TOTP vectors, wrong/replayed/expired codes, concurrent single-use recovery, OTP-token API denial, session revocation, all account roles, failed/cancelled enrollment, login method selection, pending duplicate guards and responsive 200% text. Actual phone scan, SMTP, database concurrency and deployed cross-site trust acceptance remain separate live checks.

The TOTP timing/replay design follows [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238); factor-change reauthentication and recovery choices follow [OWASP MFA guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html). This scope does not claim the rest of SEC-07–SEC-16 is complete.

Proposed exact 36-file scope:

1. `backend/database/schema.sql`
2. `backend/database/migrate_authenticator.js`
3. `backend/database/__tests__/migrate_authenticator.test.cjs`
4. `backend/.env.example`
5. `.env.example`
6. `docker-compose.yml`
7. `backend/src/config/env.js`
8. `backend/src/utils/authenticator.js`
9. `backend/src/utils/__tests__/authenticator.test.cjs`
10. `backend/src/models/authenticator.model.js`
11. `backend/src/models/__tests__/authenticator.model.test.cjs`
12. `backend/src/services/authenticator.service.js`
13. `backend/src/services/__tests__/authenticator.service.test.cjs`
14. `backend/src/services/auth.service.js`
15. `backend/src/services/__tests__/auth.service.test.cjs`
16. `backend/src/services/__tests__/batch8.auth-boundary.test.cjs`
17. `backend/src/controllers/auth.controller.js`
18. `backend/src/controllers/__tests__/trustedBrowser.controller.test.cjs`
19. `backend/src/controllers/authenticator.controller.js`
20. `backend/src/controllers/__tests__/authenticator.controller.test.cjs`
21. `backend/src/routes/auth.routes.js`
22. `backend/src/middlewares/auth.middleware.js`
23. `backend/src/middlewares/__tests__/auth.middleware.test.cjs`
24. `frontend/src/services/authenticatorService.js`
25. `frontend/src/services/__tests__/authenticatorService.test.js`
26. `frontend/src/hooks/useAuthenticator.js`
27. `frontend/src/hooks/__tests__/useAuthenticator.test.jsx`
28. `frontend/src/components/AuthenticatorSettings.jsx`
29. `frontend/src/components/__tests__/AuthenticatorSettings.test.jsx`
30. `frontend/src/components/ProfileSettingsModal.jsx`
31. `frontend/src/components/__tests__/ProfileSettingsModal.test.jsx`
32. `frontend/src/pages/LoginPage.jsx`
33. `frontend/src/pages/__tests__/submission.confirmations.test.jsx`
34. `docs/PROGRESS.md`
35. `docs/ENV_SETUP_GUIDE.md`
36. `docs/USER_MANUAL.md`


### Approved messaging implementation and security integration — 2026-10-01

The broad finish-all approval covers the previously reviewed request-thread inbox (student and Window 1), bounded conversation reads, reply refresh, desk unread counts, and notification routing. Source findings above precede these repairs. The model now uses the actual pool and bounded reads; student ownership and Secretary college assignments are enforced before reads/writes. Student messages notify active Window 1/Receiving Desk accounts even without document assignment; staff replies notify the owning student. Notification failures cannot fail a committed send. Existing read_at is a shared desk acknowledgment, not an individual staff receipt. General pre-request support is still a separate conversation requirement.

Additional integration finding before security edits: Socket.IO currently verifies only JWT signature, without rejecting pending_2fa challenges or checking account activity/session version, and connected sockets have no expiration/revocation check. This violates the new REST boundary and must be repaired under the finish-all authorization before authenticator/session changes are complete. The earlier Templates controller integration test also required a full-session token and an active-account fixture; this test-only extension preserves its authorization assertions.


### Session, account and email follow-up scope

Before edits: logout removes browser storage only; logout-all invalidates the current session while its UI claims the current browser remains signed in. Password-reset mail failure logs a usable reset link. Deactivation references an undeclared notifications binding and a nonexistent adapter, so a committed deactivation may return an error and omit owner email. Email changes use codes rather than the requested verification links; signup has no email confirmation gate. Broad approval covers explicit session/email migrations, hashed revocation and verification tokens, API/realtime enforcement, proper owner notices, and shared account/onboarding UI with regression tests. No production database or email delivery is claimed from local tests.

### Finance continuation: finding and clarified design (2026-10-01)

Before changes: Finance's export button only reports a simulated export; its Transactions queue derives from an API that excludes paid documents. Payment verification requires an OR number, uses the host's local hour for cutoff copy, and promises tomorrow despite no scheduling or working-day policy. Deferred upload references a missing or_uploaded_at column, writes outside a transaction and can overwrite an existing receipt even for an unpaid request. Secretary OR checks have UI-only prerequisites.

Approved continuation: server records payment-clearance time and separates its immediate acknowledgment from actual OR issuance/digital copy. Exactly 4:00 PM Asia/Manila is after cutoff for new same-day OR issuance. A later eligible day is a lower bound, not a promised deadline. Show elapsed waiting time for cleared payments without an issued OR, and separate digital-copy-pending from issuance-pending. Preserve historical dates and already recorded physical ORs; require a real number/date when issuing later and retain physical-inspection acknowledgment for an OR without a digital copy. Finance gets a real paginated paid-transaction/export view. Same-day document eligibility, required form/linked sets and delay-alert thresholds remain ON HOLD at the user's request pending institutional policy. No invented weekend/holiday calendar or automatic overdue alert.

### Registrar policy clarification received 2026-10-01

The office confirms all documents may be requested repeatedly in varying quantities except Honorable Dismissal. This supersedes configurable non-repeatable flags for other types. Walk-in same-day eligible types are CTC, 2nd Copy of COR, 2nd Copy of OGR and CAV, conditional on presenting the original and a photocopy. It does not authorize skipping evaluation, pricing, payment, OR checks or physical handoff. Existing inactive counter drafts remain inactive until Admin approves rates. Before implementation, Manual Input had no quantity/original/photocopy fields and its hook omitted purpose; is_same_day was displayed from a document property never written. Add an explicit conditional eligibility snapshot for new counter requests, not a same-day promise on all requests.

Attachments vary by case: Registrar must be able to request named pertinent documents on a specific request, students upload against those requirements, and authorized staff inspect the protected uploads. Do not impose a universal fixed attachment list. Attachment requests do not automatically suspend or change the existing pipeline; delay-alert threshold remains unresolved. Record requester/uploader/reviewer and timestamps, enforce ownership/college access and never overwrite another requirement's upload.

Browser finding before the final messaging repair: the synthetic Window 1 conversation remained in initial Loading. React StrictMode cancels the first mount read, but useDocumentChat cleanup leaves the cancelled controller in read.current; the second mount skips its initial read until polling. Clear that cancelled controller during cleanup and cover the StrictMode remount. This is a source/lifecycle finding, not a live API diagnosis.

### Registrar continuation — earlier local checkpoint, 2026-10-01

Next continuation authorized 2026-10-01: before changes, signup accepts an unconfirmed email, email changes use a six-digit code, reset does not share signup password requirements/history checks, and the alumni first-login gate replaces dashboard content but leaves shared navigation/settings accessible. Implement hashed, time-limited, single-use email links with transactional account locks; preserve ID review as a separate status. Existing students also verify their current email, rather than fabricating verification on migration. Staff remain able to operate while confirming their email. Add server request/sensitive-action gates and an alumni shell gate, without blocking logout, graduate submission or email recovery. Remaining fixed document sets and delay thresholds remain policy-dependent.

The Registrar clarification is implemented locally: repeat requests/quantities for non-Honorable-Dismissal types; a conditional same-day snapshot for the four confirmed counter types after both original and photocopy checks; and per-request named attachment requirements, protected uploads, acceptance and reasoned resubmission. The canonical Honorable Dismissal type retains its existing one-copy/no-second-active-or-completed-request rule. No additional document aliases or linked document sets have been identified by the office; no restriction on Certificate of Transfer has been invented. No stage bypass, automatic attachment processing hold or delay deadline was introduced.

Authenticator enrollment/recovery, server session revocation, request conversations, and FIN-01–FIN-05 are also implemented locally in this continuation, superseding older pending-scope entries. Edit Profile → Security displays Two-factor authentication for all roles. Window 1, Student, Admin and Secretary have Messages & Attachments; existing desk chat authorization remains enforced. A final counter-payment check found duplicate disabled props that left its receipt picker active under Later; the picker and OCR now disable together, with regression coverage proving retained receipt drafts are omitted from deferred submissions.

Final validation: **877 backend tests / 52 files** and **492 frontend tests / 53 files pass**. Frontend ESLint, production build and git diff --check pass; the build retains its large-chunk warning. Synthetic native-Brave inspection at desktop/200% text confirmed immediately loaded Window 1 messages after the StrictMode repair, wrapped attachment instructions and reachable upload controls, and the shared Security authenticator setup action. These observations do not establish physical-phone, real MySQL transaction/concurrency, SMTP delivery, genuine authenticator enrollment or deployed cross-site cookie acceptance.

Explicit migration/key/paired-rollout instructions are in ENV_SETUP_GUIDE.md. No migration, deployment, commit or push was performed. Remaining work includes signup email verification by link and the request/sensitive-action gate (SEC-16), email-change link conversion (SEC-10), the rest of the password/account hardening acceptance, fixed institutional forms/linked sets, numbering/original-issuance and QR/alumni continuation, and live acceptance. General support before a document request is not implemented by the request-thread inbox. SEC-01 still requires the agreed design/sign-off. Automatic delay alerts remain on hold until the Registrar supplies a threshold; no OR deadline or holiday calendar has been invented.


### General Window 1 support: source finding and approved continuation

The floating support bubble mounts only the document-thread inbox, whose empty state explicitly requires filing a request first. It therefore cannot provide the requested pre-request support. Under the finish-all authorization, add a separate student-account conversation with Window 1/Receiving Desk and Admin, independent of document creation. Reuse direct-send, draft preservation, deadlines, bounded reads, polling/realtime refresh and unread acknowledgment. Other desks do not gain general-support access. Request conversations and case-specific attachments keep their existing authorization. An unverified email must not prevent contacting Window 1 for verification help; the mandatory alumni graduate-form gate still applies. No automatic agent reply or external messaging service is introduced.

### Template rendering follow-up finding

PaymentStubModal substitutes names/types directly into stored HTML and injects the result into the app DOM. Its configurable body also replaces the whole fallback, losing the tracking QR and program field. The Admin preview is already sandboxed, but saved HTML must be sanitized server-side on both read and write, and dynamic values escaped before rendering. Keep the tracking QR/program/sequence context visible independently of the customizable body. Connect email_notice to outbound mail with a required MESSAGE placeholder, safe clickable verification/reset links, a branded default when configuration is empty/unavailable, and synthetic preview values only. The supported markup/style allowlist follows the maintained [sanitize-html documentation](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html).

### Request numbering continuation design

The CN-09 finding above is confirmed: surviving-row COUNT plus alumni offset reuses numbers after cancellation and treats every alumni document as a reissue. Replace this with a persistent student-ID/document-type counter allocated under a row lock in the same request transaction. Seed only from surviving request counts and recognizable stored sequence maxima; previously deleted history cannot be reconstructed. Preserve existing labels, reserve committed numbers after cancellation, and allocate a new label when evaluation corrects identity/type. Unidentified scans stay unnumbered until identity review. Record original issuance only when Window 1 explicitly confirms prior issuance with a note during intake; it is never inferred from alumni status. Original-issuance confirmation affects numbering, not eligibility, charges, ORs or pipeline shortcuts.

### Templates deployment schema finding

Before edits: system_templates and its two catalog rows exist only in older generated/phase-three migration code, not the fresh schema or read-only rollout preflight. A new installation can still show no usable Templates catalog. Add an explicit CREATE TABLE IF NOT EXISTS plus INSERT IGNORE migration for payment_slip/email_notice, preserving existing layouts and adding only missing catalog keys. Include its columns in the deployment check; do not run the old broad migration or overwrite template content.

### Live schema diagnosis: login and dashboard, 2026-10-01

The user reported Login error ER_NO_SUCH_TABLE for authenticator_credentials, then successful login after the explicit authenticator/session repair instructions. The subsequent backend logs prove document_fee_schedules, document_messages and system_templates are missing, and document_types.rental_fee is absent. Fee-schedule migration already repairs the first/last; request messages also need a standalone preserving CREATE TABLE IF NOT EXISTS migration and fresh-schema definition, rather than running the old broad migration or its code-generation helper. The WebSocket upgrade failure has no supporting realtime/proxy error in this trace; it remains a separate diagnostic, with polling fallback possible. No agent live database changes were made.

### Clerk browser preference relocation — user direction, 2026-10-01

Before edits the initial login form asks every account whether this is a shared computer, although only clerks can receive browser trust. Remove that universal control. After password validation, the server may offer an unchecked personal-browser choice only on an actual clerk's factor challenge. Trust still requires successful factor verification, signed clerk eligibility and explicit opt-in. Remember only the server-confirmed expiration as a local non-secret preference; a matching unexpired HttpOnly proof remains necessary to skip the next clerk challenge. Security gives clerks a confirmed action to forget this browser preference; the next login uses shared mode and clears the proof. Admin always verifies; student factor policy remains unchanged. No role guessing from login IDs.

The user also reports that operational staff have no individual email addresses. Current staff creation accepts a nullable email while mandatory email-factor login cannot deliver without one. The user chose individual apps with Admin-assisted initial setup. Design before implementation: an authenticated Admin re-enters their password and issues a random, hashed, single-use ten-minute setup code for an active clerk who has no enrolled factor. Hand over the code privately after checking the staff identity. The dedicated public setup page requires the clerk's own ID/password, this code, then verification from the new app. It grants no session or dashboard access before app confirmation; expired/replaced/used/version-mismatched codes and repeated failures are refused. Existing authenticators cannot be replaced through this path. Admin issuance and enrollment are audited without credentials. Save recovery codes once, then sign in using the app. This is initial enrollment, not an Admin bypass or recovery policy for an already-enrolled lost authenticator.

### Latest file-access diagnosis

The user's follow-up backend logs confirm `request_attachment_uploads` is missing and causes proof/avatar 500s: the shared file authorization service checks attachment ownership before legacy file permissions. Do not bypass that check or expose uploads publicly. The existing explicit attachment migration creates the two missing case-attachment tables. The schema preflight now covers this reported failure alongside pricing, inbox and Templates dependencies.

### Final continuation implementation and acceptance boundaries

Implemented locally: any-domain signup/email-change verification links with hashed one-use tokens, credential/reset/password-history checks and current-password verification; strict alumni shell/API gate; separate Program/Course; pre-request Window 1 support; manual Quick guide; TRACE-origin submission QR; persistent request numbering with explicit original-issuance evidence; sanitized printable/email templates preserving tracking QR and clickable recovery links; preserving chat/Templates migrations; clerk-only trust choice and Security preference reset; Admin-assisted email-free clerk authenticator setup. Earlier pending statements in this journal are checkpoints, superseded by Current Status and this continuation.

Current deployment instructions are in ENV_SETUP_GUIDE.md. The live missing-table repairs are not complete merely because files exist locally: review/merge/pull, rebuild, run the explicit migrations, require a passing read-only schema presence check, and deploy the matching frontend. No agent commit, push, server mutation, SMTP delivery, account creation or deployment occurred. Real-phone, live SQL/concurrency, enrolled-app/cookie, mail, uploaded-record and payment/provider acceptance stay open. An isolated in-app preview browser was unavailable in this round; the active user browser was not used for final visual inspection. Earlier synthetic layout observations remain historical evidence only.

Remaining policy work: canonical fixed/linked document forms and any Honorable-Dismissal-related aliases not identified by the office; name/ID formatting conventions; whether case attachments should hold processing; delayed-request alert threshold; OR deadline/working-day calendar; already-enrolled lost-factor identity recovery; SEC-01 extensions after explicit design/sign-off. The Registrar's quantities/original+photocopy/same-day and case-specific attachment directions are implemented; they do not imply those unsupplied policies.

Final local validation for this continuation: **983 backend tests / 67 files** and **524 frontend tests / 63 files pass**. Frontend ESLint and production build pass; the build retains its large-chunk warning. Syntax checks pass for all 59 changed/new backend JavaScript modules, and `git diff --check` passes. These checks do not close the live deployment or acceptance boundaries above.

### Signup and account testing findings — 2026-10-02

Before runtime edits: the real Axios request transformation converts Read ID's FormData to JSON under the shared JSON Content-Type. A synthetic transport regression reproduces `{"id_proof":{}}` instead of a multipart file; Multer therefore supplies no file and returns “Choose an ID proof first” before OCR. Restore multipart transport while retaining cancellation. This error does not evaluate ID ownership; testing with somebody else's ID is not evidence of identity approval.

Signup already stores `program` separately from `course` (college). Admin's pending-registration projection omits both, and its review modal reads `course` under Program/Course. Include the safe program/college projection and show their distinct values; historical blank programs must remain unknown rather than inferred.

Password signup/change/reset share a validator that excludes underscore, while Admin staff creation/reset enforce length only. The user explicitly requests `_` with matching frontend/backend requirements. Centralize the backend validator, apply it to those staff paths and align all frontend hints/guards, retaining 8–64 length and existing password-history checks.

Finance OTP inspection finds no test-mailbox fallback: login uses the active persisted `user.email`, not `pending_email`; SMTP_USER is only the sender. Profile keeps the old address active until a new link is consumed. Add recipient regressions, but leave the reported live recipient unexplained until the user confirms pending versus verified email/account state. Do not reroute staff codes to Admin or log credentials.

Current first-login tutorial enrollment and route are student-only; staff/Admin have no automatic guide. Email-flow and Admin trust recommendations await the user's choices before changing those policies.

### Password-history rollout finding — 2026-10-01

Before repair: the user's successful 18-script rollout stops at the read-only schema check, which reports absent `password_history.user_id`, `.password_hash` and `.created_at`. The base `schema.sql` defines that table, but no explicit upgrade script creates it. Password changes/reset call `getPasswordHistory` and `addPasswordHistory`; the query also depends on `id` to order distinct earlier hashes. The metadata check alone does not distinguish an absent table from an incompatible existing table. Add an explicit preserving CREATE TABLE IF NOT EXISTS migration matching the base definition, map all four required columns to it, and add it to the ordered runbook. Never seed invented historical passwords or rewrite current users/hashes. An incompatible existing table remains for inspection rather than automatic destructive alteration. A targeted SQL creation of this single canonical table can unblock the current rebuilt image without rerunning the other successful migrations or importing the full schema.

### Profile email verification and Maintenance images — 2026-10-01 finding

Before edits: ownership verification already sends single-use email links; its action is in the global Layout banner and changed addresses send a link through Save Profile. Move Verify beside the Profile email field, independently of other unsaved profile fields. A different address still requires the current password and confirmation; keep the existing address active until the link is consumed. Preserve server cooldown, delivery errors, verification gates and separate login factors. Maintenance's Admin-only listAllUsers projection omits profile_picture and id_proof_path although its detail modal already uses the protected avatar/proof renderers. History's full student lookup includes both paths. Include these two paths in the explicit safe Admin projection without widening file access or returning credentials. No schema change is needed for these repairs.

### Request composer and registration OCR investigation — 2026-10-01

Before edits: choosing a request renders DocumentChat after pagination in a 60dvh box, with the composer at its bottom. It can fall below the page/floating panel viewport. Message refresh also uses scrollIntoView on its end marker, which can scroll outer containers. Bring the selected composer into view once, label where to type, bound chat height and scroll message history internally; preserve direct-send, duplicate guard and failure drafts.

Registration OCR currently searches lowercased text for exact school/student-ID/college substrings; the backend supplies the canonical college name. OCR spacing/dashes, unprinted or abbreviated colleges and extraction failures can yield pending. This is inconclusive text matching, not counterfeit detection: the backend leaves these accounts pending rather than automatically rejecting them. It returns a reason only to the signup response/log, not the stored account or Admin review. The user confirms no reason is shown during review. Persist a bounded, allowlisted review reason (no raw OCR or private details), distinguish manual review from rejection, and normalize only whitespace/dash formatting for literal text matching; do not invent IDs, bypass required fields, introduce fuzzy auto-approval or define unsupplied college aliases. Old records need an explicit unknown-reason fallback. A preserving reason-column migration is required before deploying readers of that column.

Implemented this follow-up locally. **1005 backend tests / 71 files** and **538 frontend tests / 65 files pass**; frontend ESLint/production build pass (existing chunk-size warning retained). Four identity-parser and five registration-matching Python tests pass; Python source and rollout-function syntax checks pass. Tests cover isolated link sending and password/confirmation boundaries, pending-address persistence, Admin protected images/review reasons, selected student request sending/focus/draft failures, exact ID boundaries and unknown OCR reasons. They use synthetic fixtures, not genuine ID images or live MySQL/SMTP. The isolated IAB was unavailable; the retained headless profile refused launch because its lock exists, and no user browser was used or lock deleted. Physical-phone/floating-panel geometry, actual OCR quality on genuine images and live deployment remain acceptance work. No agent SQL, commit, push or deployment occurred.

Implemented locally in `migrate_password_history.js`, migration regression tests, schema preflight/test and rollout documentation. The future ordered rollout includes 19 scripts; the already-built server can use the equivalent single-table SQL in ENV_SETUP_GUIDE.md. **988 backend tests / 68 files pass**, both changed runtime modules pass syntax checks, and `git diff --check` passes. Frontend unchanged in this repair (prior 524-test/lint/build checkpoint retained). No live SQL, commit, push or deployment was performed by the agent. The user subsequently ran the equivalent targeted SQL on the verified bundled MySQL, displayed `id`, `user_id`, `password_hash` and `created_at`, and reported **Schema presence check passed** from the already-built image. No additional source merge/rebuild is needed solely to unblock this table; the new preserving script/preflight/docs should be retained for future deployments. The user then successfully restarted backend/AI/n8n, kept Caddy running and reported `status: ok` / `database: ok` from both container-local and public HTTPS `/api/health` at 06:05 UTC. This proves database connectivity and the HTTPS API path, not actual application, SMTP, WebSocket or AI readiness. AI health was still starting in the initial snapshot; matching frontend/live acceptance remain open.


### Approved Canva branding — 2026-10-04

Inspection found `Layout.jsx` and `AuthShell.jsx` importing the PLP seal, a separately drawn TRACE T in `public/favicon.svg`, and plain-text branding in the mobile drawer and graduate gate. The approved asset was absent from the initial repository inventory. The user then supplied `trace logo/logo1.png` and `logo2.png` and explicitly chose logo1 for light mode and logo2 for dark mode. Both originals are 2000×2000 transparent PNGs with identical artwork bounds; no replacement was guessed or recreated.

Copied the exact exports to public assets, verified byte equality, and centralized paths/canvas geometry in `utils/branding.js`. `TraceBrand` presents all shared branding with an accessible TRACE logo label, proportional SVG image rendering and a viewport containing the complete artwork with padding. Authentication pages, all role headers, the mobile drawer and the alumni entry screen use it. The build generates SVG browser/PWA icon wrappers embedding those same PNG bytes; the browser icon follows the initial/saved theme and theme toggle, and the installed app icon uses logo1. The obsolete drawn favicon is removed. No workflows, roles, protected files or database schema changed.

Validation: all 594 frontend tests / 70 suites passed; after the final browser-icon theme integration, the 25 affected AuthShell/Layout tests passed again. ESLint and production build pass; the existing large-JavaScript-chunk advisory remains. The build includes and precaches both variants and generated icons, with the protected manifest behavior retained. All 61 isolated synthetic-browser layout checks passed across all five roles, mobile drawers, authentication, both themes and 100%/200% text at 320/375/768/1280 widths as applicable; the generated favicon and actual theme-toggle icon switch also passed, with no JavaScript exceptions. Physical phone and deployed-site acceptance remain separate. No commit, push or deployment performed.


### Main / More sidebar investigation — 2026-10-04

Before runtime edits: `navigation.js` exposes one flat authorized list; `SidebarNav.jsx` renders every item with a 48px desktop height and 16px gaps, followed by Preferences/Logout. Admin has eleven destinations plus these actions, while Layout's rail uses a bounded height and `overflow-y-auto`; this exceeds common viewports and exposes the native scrollbar. The mobile drawer uses the same list and also needs scroll fallback. Onboarding targets `data-guide-tab`, so hiding secondary items without preparing their group would lose highlights.

Chosen groups preserve all existing URLs/authorization: Main contains student Dashboard/History/Messages, Secretary Dashboard/Completed Logs/Messages, Window 1 Dashboard/Tracking Desk/Messages, Finance Dashboard/Transactions & Export, and Admin Dashboard/Document Tracker/Messages/System Maintenance. More contains each role's remaining destinations, including Help; alumni Graduate Application is secondary. Preferences and Logout remain outside the swapped destinations. Add native More/Back controls, automatic route-based group selection, keyboard focus transfer, and visually hidden scrollbar chrome with real overflow scrolling retained.


Implemented the Main/More navigation locally in shared role metadata, SidebarNav and Layout, with common Tailwind navigation controls and scrollbar-only CSS. Route/account changes reveal their current group and scroll its active link into view; deliberate Back to main keeps More visibly marked when the current page is secondary. Native Enter/Space group switching moves focus to an available link. Tour preparation reveals secondary targets without changing the route. Preferences still opens appearance settings, links close the mobile drawer, group switches leave it open, and Logout retains its existing confirmation. The desktop rail remains focusable and genuinely scrollable; touch/wheel/focus scrolling remain available in the drawer. The existing undersized mobile close button now uses the shared 40px icon control.

Validation: **609 frontend tests / 70 suites pass**, including role-list preservation, both groups' actions, direct/repeated links, browser history, keyboard group switching, mobile closure and Admin tour targets. ESLint, production build and diff whitespace checks pass (existing chunk-size advisory remains). **326 isolated synthetic-browser checks pass**, covering five roles, Main/More, widths 320/375/768/1280, light/dark, 100%/200% text, 320px-tall fallback layouts, focus-to-Logout reachability, direct secondary routes and actual PageDown scrolling on a short desktop rail. No JavaScript exceptions. Screenshots were inspected for desktop More and mobile enlarged-text fallback. Manual/FAQ and UI conventions are updated. Physical-phone and deployed-site acceptance remain separate; no backend/schema changes, commit, push or deployment. Prior Canva-branding edits remain in the working tree.

### Responsive Preferences — 2026-10-04

Source finding: Preferences is the `appearance` branch in ProfileSettingsModal, opened by Layout; it is not separate content inside ModalShell. The branch places the heading, explanatory copy, intrinsic-width theme action and text-size label/select into one spacing stack. Before changing it, a synthetic Admin browser reproduction at 320×568 with 200% text showed the Preferences heading split mid-word and the lower controls below the fold. The shared shell already provides real body scrolling, Escape and focus containment/restoration. Its `100dvh - 2rem` height cap, however, scales the reserved gap with root typography while the overlay's Tailwind p-4 remains 16 px per side, creating uneven vertical margins.

Implementation: extract a pure PreferencesModal with labelled Appearance/Text size sections, consistent spacing, full-width controls, a compact responsive heading, descriptions outside short percentage options, explicit theme active/pressed states and disabled controls when their callbacks are unavailable. Keep Layout's saved theme/text-size callbacks and ProfileSettingsModal's existing entry point. Align the shared panel height with the actual 32 px total overlay gutter; no portal, dismissal or focus code changes. No backend, workflow or schema change.

Validation: **616 frontend tests / 71 suites pass**, including all account types, controlled theme/text-size updates, disabled preferences, Tab/Shift+Tab containment, Escape and focus restoration. ESLint, production build and diff whitespace checks pass; the existing bundle-size advisory remains. **484 isolated synthetic-browser checks pass** across five roles, widths 320/375/768/1280 (including a 320 px-tall viewport), both themes and all four text sizes. Checks cover panel gutters, an unsplit heading, contained overflow, scroll-to-control reachability, actual hover/pressed/focus states, disabled controls, theme changes and Escape/focus restoration. No JavaScript exceptions. Mobile 200% and desktop 100% screenshots were visually inspected. Physical-phone and deployed-site acceptance remain separate; no migration or deployment.

### Shared UI transition system — 2026-10-04

Inventory and chosen mappings were recorded in [UI_MOTION.md](UI_MOTION.md) before runtime edits. The gap was distributed presentation ownership: Layout hardcoded its page fade, role wrappers/queue panels replayed entrance utilities, customized dialogs duplicated animations, progress animated width, and conversation refresh always jumped to the bottom. Shared focus/confirmation/authorization already existed and remains authoritative.

Implemented canonical CSS tokens, interruptible Web Animation helpers and hooks, native-disclosure continuity, transform-only progress, route/group/profile/conversation context, shared dialog/drawer/support entry and visual return, and restrained control/action feedback. The live dialog is removed and focus restored immediately; its optional exit copy is inert, hidden from accessibility, strips IDs/credentials/embedded viewers, preserves visible scroll position and expires on finish/cancel/timeout, reduced motion or reopening. No React keys or API/workflow timings were added for motion. Existing conversation identity keys still isolate drafts/data. Readers above the conversation bottom retain scroll position on refresh. CSS reduced motion now disables transitions/animations completely; the old 0.01 ms rule created unwanted transitions on otherwise static nodes. Preview hover transforms also respect reduced motion.

Validation: **627 frontend tests / 73 suites pass**, including configurable/interrupted/cancelled motion, dynamic reduced motion, bounded exit cleanup, rapid reopen/StrictMode, native FAQ focus, unchanged context drafts/scroll, progress transforms and chat refresh scroll. ESLint, production build and diff whitespace checks pass; the existing bundle-size advisory remains. **512 isolated synthetic-browser checks pass**: 484 across five roles, Main/More and Preferences at 320/375/768/1280 widths, short viewports, both themes, 100%/200% text and normal/reduced motion, plus 28 nested detail/preview/confirmation checks. Checks cover immediate focus/state, safe exits, rapid reopen, live preference cancellation, FAQ continuity, chat switching/scroll, pending action guards, draft preservation and modal cleanup. No JavaScript exceptions; the mobile dark 200% nested-dialog screenshot was inspected. These fixtures do not prove physical-phone or deployed-site acceptance. No backend/schema/dependency changes, commit, push or deployment.

### Floating sidebar icons and accessible labels — 2026-10-04

The source finding and chosen mapping were recorded in UI_CONVENTIONS.md before runtime edits: desktop names relied on title, hover recipes lacked an icon-only lift/soft green layer, and the rail's genuine overflow scroller would clip an in-flow label. The breakpoint-only mobile trigger also left wide coarse-pointer devices with an icon-only rail.

SidebarNav now delegates hover/focus intent to one shared tooltip hook and renders its full label in a body portal. Controls retain permanent aria-label names and gain aria-describedby only while their label is visible; browser title labels are removed to prevent duplicates. Pointer movement from the control onto the label stays in a contiguous padded bridge. Escape dismisses without changing focus or activating navigation, and does not reopen the same label until a fresh interaction. Scroll/resize removes stale mouse labels and repositions visible keyboard-focused labels. Route/group/account changes invalidate old selections; listeners and portals clean up on unmount. Main/More, role lists, active-page state and Preferences/Logout handlers remain unchanged.

A decorative pointer-events-none pseudo-layer provides soft theme-aware green background/diffuse shadow. Only the sharp SVG icon lifts 2 px, using the shared continuity-distance and feedback-duration/easing tokens. The click target never moves or changes size; selected green/white styling stays distinct. Keyboard focus has the same feedback plus the existing visible outline. Reduced motion removes the lift/interpolation while keeping static feedback and labels. Labeled drawer controls remain static. Layout exposes the existing drawer and hides the icon rail for primary coarse/nonhover pointers at any viewport width, so touch never needs a reveal-only first tap.

Validation: **638 frontend tests / 74 suites pass**. After the final label-expression refactor, the **66 SidebarNav/tooltip/Layout tests** pass again; ESLint, production build and whitespace checks pass (existing large-chunk advisory remains). **515 isolated synthetic-browser checks pass** across five roles: fine-pointer hover/label persistence, Escape, sharpness/noninteractive decoration, fixed hit targets, persistent selection, real Tab focus and Preferences activation, Main/More keyboard transitions and direct-route cleanup, 768/1280 widths, 320/700 heights, light/dark, 100%/200% text and reduced motion, plus 320/1024 touch drawers and single-tap navigation. No JavaScript exceptions. Desktop dark enlarged-text tooltip and wide touch-drawer screenshots were visually inspected. Physical phone/deployed acceptance remains separate. No backend/schema/dependency changes, commit, push or deployment.

### Shared button lift and feedback — 2026-10-05

Finding before changes: shared trace-button/trace-icon-button styles only transition colors; boxed New Request, camera, scanner, chat and tour controls have local recipes. FeeScheduleEditor has an unstyled Remove action. Source mappings were recorded in UI_MOTION.md before implementation. New components/Button.jsx forwards the native button's props, events, ref and form association, adding only presentation. Shared boxed/icon variants and audited custom boxed controls across Student, Admin, Window 1, Secretary, Finance and graduate/authentication screens now lift visual content/elevation 2 px using shared 150 ms feedback tokens; native target/background/border/layout stay fixed. Press returns visuals to rest; focus has a visible theme-aware outline. Inline actions/cards/tabs remain stationary; navigation retains its existing SVG feedback. Native disabled, aria-disabled and busy states immediately remove elevation and movement, without new action timers or handler changes. Fine-pointer hover only; reduced motion removes movement. Existing loading/validation/confirmation/draft behavior remains.

Unpaid-balance Pay uses the warning variant. Destructive actions retain red, including the previously unstyled fee-item removal. Browser contrast inspection found inverse white-translucent hover surfaces had only 3.47:1 white-text contrast on pine; darkening the same green surface fixes it. White focus outlines stay readable on inverse/authentication surfaces. No backend, database, dependency or viewport-meta changes.

Validation: **648 frontend tests / 75 suites pass**, including native props/ref, external-form submit and keyboard activation, pending/disabled actions, tab presentation and unpaid-payment color regression. ESLint, production build and git diff --check pass; existing bundle-size advisory remains. **1,933 isolated synthetic-browser checks pass** for shared variants, long wrapping labels, icons, fixed targets/footprints, press return, keyboard outlines, immediate disable while hovered and dynamic reduced motion at 320/375/768/1280 widths, both themes, 100%/200% text, fine/touch/reduced pointer modes, and five roles' shell/Profile actions. No JavaScript exceptions. **36 label-contrast measurements** cover six shared variants in both themes at rest/hover/press, including pressed opacity; minimum 4.94:1. Desktop dark variants and mobile dark 200% text were visually inspected. Physical-phone and deployed-site acceptance remains separate; changes are local with no commit, push or deployment.

### Restrained card elevation — 2026-10-05

Finding and mapping were recorded in UI_MOTION.md before implementation. Inspected dashboard metrics have no whole-card action; charts, queues and forms contain separate controls. Local user-card hover recipes, simulated image buttons and independent image zooms lacked a shared policy for these distinctions.

Shared card tokens/classes now provide 2 px/150 ms lift and soft shadow for genuine user-detail actions, faint stationary shadow for informational metrics, and stationary inset emphasis for clipped image previews/document choices. Nested controls never acquire a parent lift; chart/data panels remain stationary. Native preview buttons preserve Enter/Space and avoid form submission; loading/errors/PDFs retain their existing behavior. Cards without an action render as articles. User-grid edge gutters contain elevation, and responsive user-card width/padding/wrapping preserve readable names at enlarged text sizes. Removed independent preview image zooms in Admin, Window 1, Secretary and Finance. No new actions, permission changes, workflow timing, API changes, dependencies or schema changes.

Validation: **654 frontend tests / 76 suites pass**, including six card semantic/keyboard/preview regressions. ESLint, production build and whitespace checks pass; existing chunk-size advisory remains. **353 isolated synthetic-browser checks pass** across all five roles, 320/375/768/1280 widths, light/dark, 100%/200% text, fine/touch/reduced motion, keyboard focus/activation, press return, nested controls, selected document fields, contained overflow, immediate busy/disabled feedback clearing, dynamic reduced motion and protected preview sharpness. No JavaScript exceptions. Desktop/mobile dark enlarged-text screenshots were visually inspected. Physical-phone and deployed-site acceptance remain separate. Changes are local; no commit, push or deployment.

### Recovery-code copy/download feedback — 2026-10-05

Finding before implementation: AuthenticatorSettings's inline Copy handler catches clipboard promise failures without feedback and silently does nothing when the Clipboard API is unavailable. Its Download handler invokes the existing browser helper without reporting that the download was triggered. The existing save acknowledgment alone removes the codes; copy/download must not acknowledge on the user's behalf. Add inline live success/error feedback, pending copy protection and code-set/unmount cancellation of stale feedback. Report only download-started status, never saved-to-disk success. Keep existing shared button states, code contents/export format and authenticator API/confirmation behavior; do not log or persist recovery codes.

Implemented through useRecoveryCodeActions and the shared AuthenticatorSettings panel. Copy waits for writeText resolution, has a synchronous duplicate guard, disables export controls while pending and shows a polite status or actionable alert. Missing/rejected clipboard access offers download/manual copy; browser-download failures offer retry/copy. A triggered download reports only “download started” and asks the user to check browser downloads. Feedback holds only an opaque code-set scope/count and safe messages; stale clipboard results are ignored after acknowledgment, replacement or unmount. Copy/download never acknowledge automatically. Existing shared Button hover/pressed/focus/motion styling and recovery-code export format remain unchanged. Manual/FAQ instructions reflect these distinctions.

Validation: **663 frontend tests / 77 suites pass**, including nine new regression cases for asynchronous success, rejection/unavailable clipboard, pending duplicates, download-start/error, no credential logging/storage, code-set/unmount cleanup and explicit acknowledgment. An initial full run had two failures, including an existing dialog-focus assertion; the **52 relevant component/hook tests** and subsequent full suite pass on rerun without a focus implementation change. ESLint, production build and whitespace checks pass; existing bundle-size advisory remains. **178 isolated synthetic-browser checks pass** across 320/375/768/1280 widths, both themes and 100%/200% text, including real clipboard write/read, rejected/missing clipboard, pending controls, shared hover/focus, contained layout and late acknowledgment cleanup. All 16 synthetic exports emitted browser download-start events. No runtime exceptions; the mobile dark 200% feedback was visually inspected. Clipboard content was checked only against synthetic codes, with no real account or credential use. Physical-phone/deployed acceptance remains separate; no backend/schema changes, commit, push or deployment.

### Recovery-code switch placement — 2026-10-05

Source finding, reported before edits: LoginPage places its recovery switch after Verify & Login; AuthenticatorSettings groups its switch with Generate new recovery codes and Disable authenticator. The layout comes from DOM grouping, not MFA logic.

Both switches now sit directly below their corresponding input, before login browser-trust controls and outside Security's management row. Both directions remain in the same location. Native button semantics, input clearing, numeric filtering, input limits, pending-state disabling, verification payloads and management confirmations remain intact. Initial enrollment still has no recovery-code switch. Manual and shared layout conventions document the placement. No API, schema or security-policy changes.

Validation: **665 frontend tests / 77 suites pass**, including **27 focused Login/AuthenticatorSettings tests** for keyboard switching, clearing in both directions, input limits, pending guards, retained failure drafts and unchanged verification payloads. ESLint, production build and whitespace checks pass; the existing bundle-size advisory remains. **385 isolated synthetic-browser checks pass** across Admin, Window 1, Finance and College Secretary at 320/375/768/1280 widths, light 100% and dark 200% text. Checks cover beneath-input placement, separate action groups, contained horizontal overflow, actual Tab/Enter switching and clearing/limits. No runtime exceptions. Mobile dark enlarged-text switch screenshots were visually inspected. Physical-phone and deployed-site acceptance remain separate; changes are local with no commit, push or deployment.

### Security Logs column layout — 2026-10-05

Source finding before runtime edits: AdminSecurityPanel's fixed-layout table inherits whitespace-nowrap; its Timestamp/Event/User/Role widths total 768 px before the unassigned IP column, exceeding the 680 px minimum. Cells have no consistent horizontal padding and unbroken names/events/IPs can paint into adjacent columns. The identifier's break-words cannot wrap under inherited nowrap. The existing API provides event_type, timestamp, user name/identifier, role and IP; this repair preserves those five fields and the Admin endpoint.

Use five explicit column proportions with a readable minimum table width, normal whitespace and anywhere wrapping on each data cell. Keep contained horizontal/vertical overflow, an opaque sticky header, all text selectable and a named keyboard-focusable scroll region. No truncation, hidden fields, new record actions or authorization changes.

Implemented in AdminSecurityPanel with 20/26/24/12/18 percent columns, a 60 rem minimum width, shared section padding, uniform cell gutters/top alignment, wrapping on each cell and improved header/identifier contrast. The scroll region has a permanent accessible name, native keyboard focus and visible focus feedback; headings have column scope. Loading/empty states, local timestamp formatting, unknown-IP fallback and the read-only Admin API remain unchanged. Manual and UI conventions explain scrolling and full-value preservation.

Validation: **666 frontend tests / 77 suites pass**, including **23 dashboard tests** and a new full-value/column association/keyboard access regression. ESLint, production build and whitespace checks pass; the existing bundle-size advisory remains. Browser baseline reproduced cell overflow in both themes at 320/375/768/1280 widths. After repair, **127 isolated synthetic-browser checks pass** across those widths, both themes and 100%/200% text. Checks cover long unbroken events/names/IDs, IPv6, cell text bounds/gutters, unchanged fields, no page-wide horizontal overflow, native keyboard scrolling, last-row/field reachability and opaque sticky headers. No runtime exceptions; desktop light and mobile dark enlarged-text screenshots were visually inspected. Browser emulation does not establish physical-phone or deployed acceptance. No backend/schema/dependency changes, commit, push or deployment.

### Password-reset email diagnosis — 2026-10-05

Finding before edits: ForgotPasswordPage confirms a trimmed student/staff ID or email, usePasswordReset forwards it to /auth/forgot-password, and both frontend recovery routes exist. The active-account model queries student_id OR active email, excludes inactive accounts and does not use pending_email. requestPasswordReset already uses 32 random bytes, SHA-256 storage, one-hour expiry, serialized issuance and hashed single-use checks under the account lock; token generation is not missing. SMTP configuration is forwarded by Compose and checked at startup. The deployed nonarrival cannot be attributed to credentials, lookup or mailbox filtering without sanitized delivery logs; requested those separately.

Confirmed gaps: the public generic response claims a link was sent even on skipped/failed delivery; its only reset warning loses the cause/correlation. sendEmail ignores accepted/rejected recipients from sendMail, logs recipient/raw provider errors, and inherits lengthy SMTP defaults. Reset-link construction silently falls back to localhost when FRONTEND_URL is absent, including production. Implement a random public request reference unrelated to account identity; keep every eligible/ineligible/delivery outcome publicly identical, add uniform mailbox/support guidance, validate the reset frontend origin, record safe allowlisted SMTP outcome codes/counts without recipient/body/token/credentials, and bound SMTP inactivity/API waits. Preserve accepted email domains, authorization, token expiry/single-use, confirmation and rate limits. No production send or account mutation is authorized by local verification.

Live evidence and root cause confirmed during investigation: the user's POST returns 200 and the read-only lookup reports one matching active student with a saved email. trustedBrowser.model.lockAccount selects only id/role/is_active/token_version/password_hash. requestPasswordReset replaces the lookup result with that projection and exits on !user.email, so it never reaches token insertion or SMTP. Existing service mocks incorrectly included email/full_name/student_id and concealed this gap. Extend the internal lock projection with those three fields and test the reset service using the real lock query with a projection-aware executor. This retains the same users-row lock and credential/session serialization.

Implemented the lock projection repair, neutral request receipt with a random support reference, safe correlated SMTP outcomes, accepted/rejected recipient counts, bounded mail inactivity and frontend request waits, and production reset-origin validation. Public responses remain identical across account and delivery outcomes. No recipient, token, password, provider response or email body is recorded in diagnostic logs. Existing hashed one-hour single-use tokens, password history, rate limits and session revocation remain intact. Help, manual, environment examples and rollout instructions document the behavior.

Validation: **1,066 backend tests / 75 suites** and **670 frontend tests / 77 suites pass**; ESLint, production build, syntax and whitespace checks pass. The projection-aware regression fails with the original query and passes with the repaired query. Real Nodemailer against an isolated local SMTP server verifies acceptance, recipient rejection and authentication failure with safe diagnostics; no production mail or database was used. **81 isolated browser checks pass** at 320/375/768/1280 widths, both themes and 100%/200% text for confirmation, receipt/reference wrapping and contained layout; mobile dark enlarged-text feedback was visually inspected. Production mailbox delivery and physical-device acceptance remain separate. Changes are local, with no migration, commit, push or deployment; rebuild/recreate the backend and deploy the frontend after review/merge.

### AI Insights theme repair — 2026-10-05

Finding before edits: AdminDashboard's inline AI Insights panel forces a gray-900/light-text surface in light mode and gray-800 in dark mode instead of the shared section palette. Its warning card repeats the same translucent background in both themes, the informational card lacks a dark border, and body text has no light-mode alternative. The informational heading references undefined pine-300 (the palette defines 500/600/700 only). Layout already toggles the root .dark class correctly; useAdminDashboard's fetching and insight data need no change. Use the shared section surface/padding, solid amber and green theme pairs with readable text/borders, and decorative warning/information icons. Preserve immediate CSS theme switching, existing messages and fetching; keep the no-insights placeholder neutral.

Implemented the shared panel surface, paired semantic card backgrounds/borders/text, accessible warning/information headings and decorative icons, copyable content and wrapping for long values. Removed the fixed inverse surface and decorative blur. The root theme class alone drives immediate changes; no hook, API, insight data or fetching behavior changed. UI_CONVENTIONS.md records the palette mapping.

Validation: **671 frontend tests / 77 suites pass**, including the new repeated-theme-switch regression; ESLint, production build and whitespace checks pass (existing bundle-size advisory remains). **225 isolated browser checks pass** at 320/375/768/1280 widths, 100%/200% text and repeated light/dark switches. Checks verify shared surface colors, distinct warning/information backgrounds and borders, minimum measured text contrast 7.55:1, long-content wrapping, sharp/selectable content, stable DOM/data/scroll and no additional API requests. Desktop light and mobile dark enlarged-text screenshots were visually inspected. The initial test assertion required flexible accessible-name whitespace; the corrected focused and full suites pass. No runtime exceptions, production data access, backend/schema changes, commit, push or deployment. Physical-device and deployed acceptance remain separate.

### Admin KPI sparkline alignment — 2026-10-05

Finding before edits: AdminDashboard gives the measured throughput sparkline w-full h-24 below its value, while AI Confidence and Backlog use MiniSparkline's default w-20 h-10 beside their values. MiniSparkline's ResponsiveContainer follows those deliberately different parent dimensions; point counts are not the cause. Standardize this Admin row with a shared full-width 64 px chart slot and aligned label/value/chart/footer tracks. Preserve measured throughput dates/counts, duration units, keyboard tooltips and absence of a chart when the measured series is missing. The neighboring curves are illustrative, so label them accordingly rather than inventing historical data. Other roles' compact sparkline defaults and the volume forecast are outside this repair.

Implemented trace-kpi-sparkline with stable height/full content width and shared desktop grid tracks. Captions sit beneath charts; missing throughput retains a blank slot without a fallback curve. KPI sections have accessible names, and long numeric values wrap. Browser inspection caught a large backlog widening its slot at 768 px/200% text; keeping this row stacked until the lg breakpoint resolves that cramped three-column layout. Metric sources, chart data/units, tooltip behavior, other roles and the volume forecast remain unchanged.

Validation: **672 frontend tests / 77 suites pass**, including **29 focused dashboard/throughput tests** and a new single-day measured-tooltip/illustrative-label regression. ESLint, production build and whitespace checks pass; the existing bundle-size advisory remains. **401 isolated browser checks pass** across 320/375/768/1280 widths, both themes, 100%/200% text and empty/single-day/30-point/large-magnitude datasets. Checks verify equal stable 64 px slots, SVG dimensions, desktop label/value/chart/card alignment, contained overflow, stable footprints across data changes, absent empty measured charts and actual keyboard date/count tooltips. No runtime exceptions. Desktop light and mobile dark enlarged-text screenshots were visually inspected. Physical-device/deployed acceptance remains separate; no backend/schema/dependency changes, commit, push or deployment.

### Fee-schedule action surfaces — 2026-10-05

Finding before edits: no review PDF is supplied or identifiable in the repository; uploaded record PDFs are not design specifications and were not opened. The named Edit/Restore/Deactivate controls identify MaintenancePanel's Document Types table. Restore/Deactivate already use trace-button-primary/danger; Edit has trace-action plus hover:underline without padding/surface. FeeScheduleEditor likewise renders real Add/Remove draft controls with trace-action only. Reuse existing Button/shared variants for Edit and draft additions (secondary), keep Restore primary and removals/deactivation destructive, and wrap action/draft rows as their footprints grow. Preserve retirement/limit/pending guards, input values, confirmations, role authorization and mutation handlers; informational fee/status text stays text.

Implemented the shared boxed variants and wrapping table-action/named-fee rows. The named-item field can retain reading width and wrap onto its own row; all local draft actions retain type=button, existing accessible names and limits. No new shared CSS or business logic was required; the shared Button already owns hover/pressed/focus/disabled/reduced-motion feedback. Existing Restore/Deactivate colors, handlers, confirmations and disabled rules remain intact.

Validation: **674 frontend tests / 77 suites pass**, including **53 focused maintenance/pricing/catalog tests** and new active/inactive document confirmation, Escape cancellation and pending duplicate/disabled regressions. ESLint, production build and whitespace checks pass; the existing bundle-size advisory remains. **194 isolated browser checks pass** at 320/375/768/1280 widths, both themes and 100%/200% text. Checks cover visible surfaces/padding, semantic color distinctions, retired disabled controls, keyboard focus/Enter editing, draft preservation/addition, editor containment, stable hover targets, pressed feedback and Restore cancellation. Browser harness key events were corrected to include native Enter text; no application logic change was needed. No runtime exceptions or API mutations; desktop light and mobile dark enlarged-text screenshots were visually inspected. Physical-device/deployed acceptance remains separate. No backend/schema/dependency changes, commit, push or deployment.

### Fresh-schema audit: password reset base table — 2026-10-06

The fresh-database integration check found that schema.sql omits password_resets although check_schema.js and the implemented hashed-token reset model require it. Existing databases must not be re-imported. Add the missing base DDL plus a preserving CREATE TABLE IF NOT EXISTS migration, point the checker/rollout to it, and verify fresh schema and reruns against isolated synthetic databases. This is a deployment schema gap, not evidence that reset token generation is missing.

### Support concurrency audit — 2026-10-06

The real MySQL race check found that REPEATABLE READ snapshots could predate a waiting owner/case lock. A locked lookup then found a newly committed ticket, but the following joined read saw the old snapshot and returned not found; attachment duplicate checks had the same risk. Use READ COMMITTED explicitly for these short support/attachment transactions, retaining row locks, unique constraints, and bounded deadlock retries. Verify concurrent general creation, FCFS claims, requirement creation and cancelled history before claiming acceptance.

### Fresh-schema audit: payment-method base table — 2026-10-06

The schema audit also confirms that payment_methods exists only in the broad legacy migration, while active reference/maintenance queries require it. Add the existing definition to fresh schema and a preserving CREATE TABLE IF NOT EXISTS follow-up/checker entry. Do not run the broad migration or seed guessed institutional methods during a Support rollout; an absent catalog stays empty for Admin-approved configuration. Existing server methods and instructions remain untouched.

### Last batch: registration QR, intake waits and Finance workspace — 2026-10-06

Findings before edits (TRACE-42–47): SubmissionQrPanel is rendered above the Window 1 KPI row instead of beside the intake table under Upload Document. Its 256 px QR has no preview control. Use a compact same-column card and a high-resolution generated QR with an unchanged registration destination, white quiet zone and shared keyboard-accessible modal; do not pass its data URL through the protected-file viewer. getWaitTime rounds minutes and never switches beyond hours, and the page has no display clock. The queue currently uses document creation, which predates later Secretary returns; step_logs already records actual transitions into intake. Project the latest intake entry (excluding intake-to-intake notes), falling back to creation for legacy records, and refresh elapsed labels once per minute without refetching. Finance mounts both dashboard and transaction hooks and repeats all three tabs even on Reports. Separate the overview from a canonical Transactions & OR Copies workspace, retain Reports/Export deep-link aliases and one sidebar entry, and load only each view's data. The receipt Actions cell is blank when a private copy exists; route View OR through the existing authenticated image/PDF viewer. Rename only the filter labels to From/To, preserving query fields and Manila range semantics. No new table, column, migration, issuance rule or permission is required for these six prompts.

Implemented all six: the compact registration card now shares Upload Document's column and has a native Preview button, 768 px QR/four-module white quiet zone, unchanged student/alumni links/downloads, concise guidance and shared modal focus/Escape behavior. A shared minute/return clock updates elapsed waits safely at 24-hour/seven-day boundaries. Existing audit transitions supply actual intake entry; same-status notes and unrelated updates do not restart it. Finance Dashboard loads only payment queues; the dedicated transaction component loads only its report. Canonical transactions navigation and Reports/Export aliases select the same destination, including its tour. Available OR copies open through the existing authenticated viewer; missing/issued/deferred states retain confirmed upload/issuance and private error feedback. From/To change only labels, not query fields/date semantics. Concurrent receipt submission is guarded; failed confirmations/drafts remain, and a late completion cannot close a different selected row.

Motion follow-up from the user's live observation: the original 0.84 opacity/0.99 scale/4–8 px entry made changes hard to see. The local browser also reproduced no visual exit for an open=false portal: layout cleanup measured after removal. Callback-ref detachment now captures the sanitized visual before removal, shared by ModalShell, drawer and floating Support. Normal motion now uses 220 ms context/continuity, 250 ms drill, 200 ms exit, 0.6 entry opacity/0.96 drill scale and 8/12 px context/drill movement. Immediate focus/state, inert visual exits, bounded cleanup, rapid reopening and reduced-motion cancellation remain. A full-suite check also exposed a first-visible-code timing race in recovery-code Copy; its code-scope lifetime now commits before paint, retaining duplicate/unmount/privacy guards. A first-publication regression covers it without logging codes. Explicitly private authenticator regions, including QR/manual secrets and recovery-code text, are excluded from exit copies.

Validation: **1,283 backend tests / 97 suites** and **851 frontend tests / 89 suites pass**; final focused recovery/Finance checks, frontend lint (no warnings), build and whitespace checks pass. The existing bundle-size advisory remains. **204 synthetic browser checks pass** at 320/375/768/1280 px, both themes, 100%/200% text and normal/reduced motion, covering QR placement/preview/focus, Finance aliases/view-specific fetching/private OR preview, context/continuity/drill entry/exit and exit cleanup. Real OpenCV decodes the generated registration destination at 160/256/512/768 px. An isolated fresh MySQL test verifies Secretary-return entry, same-status note exclusion, legacy creation fallback and null projection outside intake, using the driver's local-time interpretation. Screenshots of desktop Window 1 and mobile dark enlarged Finance were inspected; fixtures use synthetic records and standalone navigation, not production. Two legacy transaction-tab assertions were updated for the dedicated page; the recovery timing regression now passes the full suite. No new migration/dependency/AI change, production write, commit, push or deployment. All 27 named incremental rollout scripts were checked to exist; the five earlier pending Support/year/base-table follow-ups remain separate from this batch. Manual, Help, workflow/backend/environment guides, detailed defense guide/script, motion policy, acceptance matrix and rollout instructions were updated without replacing their existing format.


## 2026-10-12 — Finance receipt workflow review (implementation in progress)

Findings before edits: Review treats Later as deferred issuance and conditionally removes both number controls and the copy picker. Managed verification rejects all uploaded copies; pack setup requires the clerk to choose a numeric segment. History mixes pack administration and exports; Finance reports URLs alias to History. Student names are stored as one unstructured full_name, so compound given/surnames cannot be reliably inferred.

Scope: Later defers the copy while preserving issuance during eligible hours; retain the existing 4 PM Manila issuance cutoff as an explicitly separate state. First/last pack bounds must describe exactly 50 contiguous serials, with unchanged literals and zero padding. Remove replacement-reason entry but retain structured audit and permanently reserved unused numbers. Save before print and preserve immutable historical snapshots. Separate payment History from the shared Reports & Export workspace. Use saved student identity; preserve ambiguous legacy names rather than guess name parts.

Verification limitation: the coding environment is disconnected. Source and pure-JavaScript checks can run through GitHub/in-memory execution; React, Vitest, MySQL, browser, lint and production build require the environment to reconnect. No cloud deployment or main merge is authorized in this change.


Implementation prepared: Later keeps number/upload presentation while deferring only publication of the copy during eligible hours. The user explicitly reaffirmed the existing 4 PM cutoff and automatic receipt generation on verified payment; Print beside the saved number reads its immutable snapshot. Managed verification now accepts a validated immediate copy and saves/audits it in the same transaction as clearance and issuance. Pack setup/replacement infer the changing digit block from first/last bounds of exactly 50; replacement retains an audit without free-text reason. Stale actions refresh number state and require a new confirmation. Review no longer has a Discussion or editable payor field. History is grouped cleared payments with copy actions/waits and shared visible filters, retaining a recovery issuance action for cutoff/historical OR-pending payments; exports/settings moved into their separate report/verification locations.

The user's name-storage follow-up led to an additive nullable first/middle/last migration and confirmed profile entry, without guessed historical backfill. API writes validate against the saved identity under the profile lock and are audited; Finance trusts saved identity instead of supplied payor overrides. Old full/request names and immutable issued snapshots remain unchanged. Name formatting and timing utilities are mirrored. Migration ledger/rollout/environment/manual/Help/defense/workflow documentation and tour destinations were updated; no per-batch acceptance Markdown was added.

Available verification: actual backend receipt/payment/profile services executed in V8 against in-memory model/file fixtures (47 assertions), covering Later issuance, immediate copies, file/payload rejection, retry identity, stale serials, 4 PM cutoff/later issuance, print retry, 50th/51st boundary, early replacement/reservation, student identity and additive/rerunnable migration. This is not MySQL or Vitest execution. JavaScript/JSX/CJS sources are parsed with Acorn plus its JSX plugin, without adding a project dependency. Focused backend/frontend regression tests were prepared for the new contracts. Full npm tests, lint/build, live contention, browser/screenshots and cloud migration/deployment remain pending due to the disconnected coding environment. Changes are for dev only; no main merge or live deployment.

New signup collects first/middle/last fields, builds Full Name automatically and saves parts with the account in the registration transaction. Existing accounts confirm their unsplit names in Edit Profile; legacy API clients that send only Full Name remain supported. Read ID retains a detected full-name hint, fills other eligible empty fields and never guesses compound name boundaries. The new form requires first/last before confirmation; middle remains optional.

Final available checks: 47 actual service/migration assertions and 54 helper/parity/navigation assertions passed in V8; Acorn/JSX parsed 48 source/test files and resolved 165 changed-frontend imports. These are explicitly not full Vitest/build/MySQL/browser runs. The existing receipt HTML/layout module was left unchanged. Legacy single-name records that exceed the formatted name cap retain the full saved name rather than being truncated.


## 2026-10-12 — Read ID failures and speed investigation (findings before edits)

The user reports clear JPEG/PNG IDs ending with Cannot read this ID. Source findings: identity extraction invokes the shared two-pass extractor unconditionally; it joins OCR fragments with spaces while identity_parser requires labelled line boundaries. The extractor chooses the longer text rather than fields, so preprocessing noise can discard a clearer original. The Node AI client aborts all calls after 15 seconds and extractIdentity swallows causes into null; Signup maps all failures to the same message. Repeat reads can duplicate CPU work. No failing image, cloud log, benchmark or connected Python/browser runtime has been inspected, so these are code defects and plausible causes, not a confirmed diagnosis of the user's particular photo.

Plan: identity-only original-first OCR with a conditional preprocessing fallback, line-aware conservative labels and field-based merge, explicit safe failure categories, a bounded 30-second identity call and 40-second browser allowance, duplicate guard and memory-only reuse of successful reads. Keep saved proof, registration verification, ownership, manual entry and temporary scan cleanup intact. Other receipt/document extraction remains unchanged. No new dependency or migration is planned; matching AI/backend/frontend rebuild will be needed.


## ID-reader reliability follow-up — 2026-10-12

Read ID now uses an identity-specific original-image pass, preserving OCR fragments as lines. When an identifier is found, it skips preprocessing; otherwise a second pass may fill missing fields. Conflicting fallback values remain blank. Label/value pairs, separate name-part labels, same-line explicit fields and spaced Unicode numeric dashes are supported. Unlabelled names are never split or guessed. Only explicitly labelled first/middle/last fields may fill empty signup controls; manual edits are retained.

The backend exposes safe timeout, unavailable, no-text/no-fields and processing categories instead of one generic failure. Identity calls have a 30-second cap; the browser allows 40 seconds including upload/transport. Other AI request deadlines and automatic registration verification are unchanged. Successful reads are reused only in the current form for the same File object/account type; failures stay retryable and selecting another file/type discards stale work. Temporary scans are always deleted and raw OCR text is not returned by the signup API.

Deploy matching frontend/backend/**AI engine** code. Restarting the existing AI container does not replace its image with updated OCR code; build the new AI image from the reviewed release checkout. This follow-up adds no migration, dependency or environment variable. The separately pending Finance `migrate_student_name_parts.js` still must precede the matching backend release.

Available verification: JavaScript services/hook handlers executed with in-memory file/network/React-hook fixtures, plus syntax checks. Native Python/Vitest/build/browser, real JPEG/PNG accuracy, latency and cloud-container verification remain pending because the coding environment is disconnected and no failing ID image was supplied. Focused Python parser/pipeline tests use fake readers and require no EasyOCR model download:

```bash
python3 -m unittest discover -s ai-engine -p 'test_identity*.py'
```

These unit tests verify parsing/conditional passes; they do not establish real image accuracy or a measured speedup. Validate an actual failing photo separately on the rebuilt engine. For cloud diagnostics, health alone does not prove the identity route is installed: a read-only GET to `http://ai-engine:5005/ocr/identity` from backend should return 405 when the POST route exists; 404 means that route is absent in the running image. The agent has not accessed the cloud container.

Available verification completed for this follow-up: 34 assertions executed against the actual JavaScript AI client, signup sanitization/cleanup and hook handlers using in-memory file/network/React-hook fixtures. Checks cover the scoped 30-second AI deadline, unchanged other deadlines, safe failure categories, temporary cleanup, active exact college matching, duplicate guards, cache reuse, retry and stale-result discard. JavaScript/JSX/CJS syntax checks passed. Python parser/conditional-reader and Vitest transport/hook regressions were prepared but could not run here. Native Python/Vitest/build/browser, actual failing JPEG/PNG, CPU timings and the running cloud image remain unverified. Ambiguity from the original is preserved even if fallback sees only one candidate; parsing does not guess names or correct ID characters. Finance is already pushed to dev as 8cbe9ba; this reader follow-up is a separate dev-only commit with no migration or dependency change.


## 2026-10-13 — Submitted ID layout follow-up (findings before edits)

The user supplied a school ID photo in chat. Visual inspection shows an unlabelled year-prefixed hyphenated student number, an adjacent uppercase comma-format name, and a two-line college heading. The current student-number fallback already accepts this format, so the layout does not explain a complete extraction failure if EasyOCR actually detects the number. Source-confirmed gaps: natural COLLEGE OF headings are treated as labelled College values (yielding OF or OF plus a suffix), and unlabelled names are ignored. The attachment has not been processed with EasyOCR: the coding environment remains disconnected. No recognition output, deployed-image version or measured latency is available.

Scope: recognize natural one-/two-/three-fragment COLLEGE OF headings; allow a full-name review hint only for a readable PLP header, a unique standalone supported student number, and an adjacent comma-format name. Never infer first/middle/last parts or expand a middle initial. Ambiguities remain blank. Use synthetic fixtures only; do not commit the supplied photo, its name or its ID. No schema, API, automatic registration verification, model or preprocessing change is needed.


Implemented in source: natural college headings preserve their complete wording; the restricted PLP adjacent comma-name layout supplies only a full-name review hint. The existing standalone student-number fallback and original-first fast path are unchanged. Added nine synthetic parser regressions and one fake-reader pipeline regression for this layout, absent context, explicit-name precedence and ambiguous identifiers/names/colleges. No actual record/image appears in fixtures or guides.

Verification limitation: no Python, EasyOCR, browser, full npm check or real-photo benchmark was executed. Source review and committed-file parity checks are available through GitHub while the runtime is offline. No measured speed or recognition-success claim is made. Publishing source to dev does not update the running cloud image; no main merge, migration or deployment performed.

## 2026-10-13 — Connected-runtime ID / Finance follow-up (findings before edits)

The clean local checkout resumed at 795e201 and was fast-forwarded to the already pushed dev head 88e3d63. The user confirms Print is being tried before Verify Payment and has not confirmed rebuilding the latest deployed images. Current ReceiptPackControl already has only first/last numbers and no replacement-reason control; an old frontend remains a plausible explanation for that reported field. Print before payment verification is intentionally blocked because pack configuration reserves numbers without creating a payment receipt. Make this prerequisite visible and exercise the saved-receipt enablement path; do not allocate a receipt or print an unsaved number by bypassing Finance approval.

Native identity regressions now execute: one failure exposes duplicate interpretation of a separate College label followed by College A. The value is reread as another College label, causing false ambiguity. Track consumed label/value lines within each field scan. A Finance regression also needs its file input query scoped to input rather than the identically labelled upload section. The previous ID attachment is not present in the local uploads and two filename searches did not retrieve it; real-photo recognition remains unverified. No new migration is required for this follow-up, and the separately recorded student-name migration remains pending unless user-applied.


Validation completed in the connected environment: 1,578 backend tests / 122 suites and 993 frontend tests / 105 suites pass. Frontend lint and production build pass (existing large-chunk advisory retained). Twenty-five native identity parser/fake-reader pipeline tests and five registration-text tests pass. The full frontend run exposed one stale onboarding fixture still targeting the removed Finance transactions navigation item; it now checks the actual Reports & Export mobile link without changing tour behavior.

Eight isolated Chromium cases at 320/375/768/1280 px in both themes verify the real Finance dashboard: Print disabled before approval with visible guidance; first/last pack fields without a reason; confirmed Later payment saves once even when its queue row disappears; Print opens the immutable receipt; Print / Reprint submits one audit before invoking a stubbed browser print function. No page exceptions or page-width overflow. The mobile dark preview screenshot was inspected internally. These use synthetic records and intercepted local APIs, not live credentials, MySQL or a physical printer. The actual submitted ID bytes are unavailable in this resumed environment, so no real EasyOCR/image latency result is claimed. No live migrations/deployment/main merge performed; publish this follow-up only to dev.

## 2026-10-13 — Resumed ID timeout follow-up

GitHub `dev` was still at `da2bba9`; the later timeout/wording changes from the previous conversation were not published. This follow-up bounds the identity detector canvas to 1280 pixels, keeps original-first parsing and ambiguity handling, and skips the second scan when the first has consumed 20 seconds. Each Gunicorn worker allows one identity scan at a time; competing ID reads return a safe retry/manual-entry message. This guard applies to ID reads within a worker, not a global cross-worker queue. Native OCR calls are not forcibly interrupted.

The identity-only backend deadline is 60 seconds and the browser deadline is 75 seconds. Other AI endpoints retain their existing deadlines. Backend request timing, Flask upload timing, and original/fallback OCR stage logs distinguish where a read is waiting without logging recognized ID text. Signup, saved profile proof and Admin attachment labels now use Proof of ID; other Diploma document catalog labels remain intact.

Validation: all 1,579 backend tests pass. The frontend run passes 993 tests and exposes one old 40-second transport assertion; that assertion is updated for the new deadline and the affected transport/service tests pass on rerun (994 frontend tests in total). Forty-six Python unit tests pass, including slow-pass fallback prevention, partial field preservation, worker busy handling/release and log privacy. Frontend lint and production build pass with the existing chunk-size advisory. A real EasyOCR/Flask request using a generated synthetic image extracts its expected student ID in 6.19 seconds on this machine. Broad unittest discovery also imports the separate manual `test_ocr.py` tool and initially fails on the read-only default model cache; the real-route check uses a writable external model cache and verified EasyOCR model downloads. No actual user photo, live VM, provider delivery or physical printer was tested.

Deploy from the updated `dev` checkout: pull with `git pull --ff-only origin dev`, build with `docker compose build backend ai-engine`, then recreate with `docker compose up -d --no-deps --force-recreate backend ai-engine`. Deploy the matching frontend separately. Recreating containers alone reuses old images. This follow-up adds no migration, dependency or environment variable; the previously recorded student-name migration remains necessary if still pending. Retry Read ID and inspect both backend and AI-engine logs for the timing markers. The original failing JPG is still unavailable here, so its accuracy and latency remain unverified.

## 2026-10-13 — revised student/alumni request catalog

Implemented the user's supplied request list as 38 selectable options: five Honorable Dismissal/Transcript sets, purpose-specific TOR options, per-page and fixed-price certificates/copies, CHED-CAV with independently counted CTC pages, and a requestable Underload Units option with a blank fee pending Admin confirmation. Combined duplicate COR entries and deactivated the six BSN/Nursing options per user clarification. Kept Masters dismissal at the explicitly supplied ₱100/page. Transfer Copy of Grade is ₱50/page; standalone Copy of Grades is ₱100/page. No unspecified rate was invented.

The new preserving `migrate_request_catalog.js` registers metadata/rules, deactivates superseded catalog rows, and installs the new live prices/component schedules once. Existing requests and issued fee/receipt snapshots retain their records; reruns preserve later Admin edits. Secretary pricing accepts independent page counts for each included component. The existing Honorable Dismissal quantity/nonrepeatable policy now covers all five sets and historical dismissal requests. A blank-fee request cannot be billed until Admin configures a rate and the Secretary explicitly reviews current rates. See [REQUEST_CATALOG.md](REQUEST_CATALOG.md) for the complete catalog and required rollout.

Validation: isolated MySQL 8 accepted the current fresh schema and seed, applied the 38-option catalog in order, deactivated an existing Nursing option, preserved historical document amounts and an issued receipt snapshot, loaded component rates through the real reference/pricing models, and verified blank-fee confirmation plus idempotent reruns preserving Admin edits. Full JavaScript runs and affected-suite reruns cover 1,608 backend and 1,034 frontend tests. New regressions cover individual set totals, independent pages, page-count validation, frontend/backend parity, pending-fee billing, one COR option, Nursing exclusion, dismissal restrictions, migration rollback, and historical preservation. Frontend lint/build pass. No live production database or deployment was modified.

## 2026-10-13 — remove signup autofill, preserve proof checks and expose alumni review

Per user request, removed Read ID from signup and deleted its hook, API helper, anonymous scan route/controller/service, temporary Multer storage/limiter, Python identity parser/pipeline and dedicated tests. The proof upload, manual identity/name inputs, confirmation flow, registration verification, and document/receipt OCR remain. Alumni always receive Records / proof unavailable, with an explanation and manual Admin review; this no longer depends on a capability request that could silently hide it. Only Student shows an asterisk on the upload label. The server continues rejecting missing proof for students, incomplete missing-proof reasons, and uploaded-proof/missing-proof combinations.

Investigated automatic proof verification separately: the old path always scanned twice, chose the longest output even when it lacked the correct fields, and used a 15-second transport deadline. Verification now scans the original with a bounded detector canvas first, preserves a successful match, and uses an independent preprocessed fallback within its budget. The selected college must be present; there is no fuzzy ID substitution, combining incomplete scans, or automatic approval when a check is inconclusive. The backend proof deadline is 45 seconds and timeout reasons are stored as safe fixed explanations. Timing logs contain no ID text. This checks visible field consistency, not physical authenticity, and does not bulk-approve existing pending accounts.

Validation: 1,598 backend and 1,026 frontend tests in full runs, followed by affected frontend checks after the always-visible alumni change; 24 Python unit tests cover original-first success, fallback matching, mismatch/pending, independent passes, budget and log privacy. Frontend lint/build pass. Functional HTTP checks confirm the removed Node route returns 404 without creating a temporary upload. Real EasyOCR/Flask checks on a generated synthetic proof verify matching fields in 7.57 seconds and keep a wrong entered ID pending; the removed Python autofill route returns 404. The actual user photos remain unavailable as files here and were not processed. No live account or deployment was changed. Deploy the matching frontend/backend/AI engine; no new migration is introduced.


## 2026-10-13 — preserve multipart upload files

Diagnosis: the supporting-document upload returned Choose the pertinent document to upload, meaning Multer received no file. The shared Axios client forced application/json, while supporting-document, Support-message and deferred-receipt services supplied FormData without overriding that header. A local Axios/XHR-to-Multer reproduction returned 400 for all three file paths while ordinary JSON succeeded.

Removed the shared forced content type. Axios still serializes ordinary objects as JSON, and browser FormData now carries the generated multipart boundary and file bytes. No file-validation, authorization, confirmation, duplicate-submission or request-activity rule changes. Added standalone local HTTP regressions inspecting actual XHR multipart bodies, filenames, content type, file bytes and companion metadata, plus ordinary JSON and bearer-token preservation. Fixtures are synthetic transport bytes, not real records or file-validity checks; the tests require no backend dependency installation.

Validation: all 1,030 frontend tests / 105 suites pass, including the four transport regressions. Frontend lint and production build pass with the existing bundle-size advisory. The 38 focused backend attachment/file-validation tests and four attachment-hook tests also pass. No production upload or record was changed. Deploy the frontend from the matching dev commit on Vercel and retry the chosen attachment; this fix requires no backend/AI rebuild, migration or environment-variable change.


## 2026-10-13 — field limits and phone formatting (findings before edits)

User requests limits and formats after oversized phone entry and inconsistent spreadsheet export. Existing frontend INPUT_LIMITS covers most fields and new passwords already enforce 8–64 characters, but signup/self-profile/staff writes lack consistent server length/phone checks. User confirms Philippine mobile numbers only. Accept 09XXXXXXXXX and +639XXXXXXXXX, normalize new writes to local 11-digit text, preserve existing records until corrected, and retain login/current-password compatibility. CSV phone fields need explicit text handling to avoid spreadsheet numeric conversion without emitting formulas. Numeric controls need bounded ordinary decimal entry consistent with existing integer, money and calibration ranges; do not invent lower business limits or truncate records.


Implemented: Philippine-only PhoneInput and mirrored normalization/validation for signup, profile, Admin staff/account and configured graduate phone fields; new saved values use 11 local digits. Server account/profile/catalog text guards match their schema bounds. Editable numeric controls now reject oversized drafts and exponent entry, retain centavo precision and enforce supported quantities/calibration limits. Years are capped at four input characters; existing values are not truncated. New-password requirements remain 8–64, and current/login credentials remain compatible. Student CSV phone fields normalize recognized formats and include an explicit text marker; invalid historical values are preserved. SMS converts valid local phones to +63 at provider delivery.

Registration follow-up: a numeric false proof-unavailable flag rendered a stray zero in React; explicit boolean normalization fixes it, including string zero. College matching tolerates only whitespace splitting/joining while retaining every letter, school and exact-ID checks. No abbreviation inference or letter substitutions were added. The supplied ID is readable visually, but inline bytes were unavailable for local EasyOCR, so actual-photo recognition remains unverified. Existing pending accounts need Admin review; pending login correctly returns 403.

Validation: 1,649 backend tests / 125 suites pass, followed by 113 focused pricing, SMS-recipient and export tests after the final additions. All 1,042 frontend tests / 106 suites pass; lint/build and whitespace checks pass. Twenty-six Python checks pass. Seventy-two isolated Chromium checks across 320/375/768/1280 pixels and both color schemes verify real signup phone/password caps and numeric controls, centavos, exact upper bounds, exponent rejection and no page overflow. Browser fixtures are synthetic and no live provider or account was changed. Temporary browser scaffolding was removed. Deploy matching frontend/backend/AI; this field/review batch itself requires no migration. The user's subsequent requested pickup reminder is tracked separately and will require its own preserving ledger migration.


## 2026-10-13 — pickup SMS reminders (findings before edits)

User confirms the running backend has a UniSMS key and TRACE sender configured, but no document has reached Ready for Pickup since its last restart. Logs show only key presence, so there is no pickup-send result and live delivery remains unverified. Existing Secretary handoff to READY_FOR_RELEASE already requests SMS and email; earlier in-app-only transitions and signup/login do not imply an SMS send.

Authorized reminder policy: after three calendar days ready and unclaimed, then every seven days until claimed. Use actual readiness transition logs rather than mutable updated_at. Persist each document/readiness-episode/weekly-period attempt before sending, serialize workers across replicas, recheck current eligibility, batch due documents per recipient, and never replay missed periods or automatically retry ambiguous provider outcomes. No status change, fee change or real SMS test is authorized by this coding work. A preserving reminder-ledger migration will be required.


Implemented: a background pickup reminder checks every 15 minutes using actual transition audit timestamps. First SMS is after 72 hours ready/unclaimed, then weekly, with at least seven days between attempts even after downtime. It excludes claimed/nonready records, missing/unknown readiness transitions, inactive/unverified accounts and invalid phones; fresh checks catch claims/phone changes before dispatch. Due documents are batched per recipient. A MySQL replica lock and unique document/readiness-episode/period attempt ledger prevent repeat submissions after restarts. Missed periods are skipped. Interrupted/uncertain attempts remain recorded without automatic replay; SDK network retries are disabled for the same reason. Startup reports key configuration separately from provider acceptance/handset delivery, and send logs report safe outcomes without numbers/messages/keys.

Validation: all 1,676 backend tests / 127 suites pass, including 35 focused reminder/migration/SMS tests. Isolated MySQL 8 applies the migration twice, exercises real model/worker SQL, verifies eligibility exclusions, unique attempt keys, replica advisory-lock contention, recipient batching, restart deduplication, three-day/weekly scheduling, claimed exclusion, minimum weekly spacing and missed-period skipping. Its provider is stubbed; no SMS is sent. Frontend lint/build pass after the Help update; the preceding field batch passed 1,042 frontend and 26 Python checks plus 72 Chromium cases. Live SMS delivery remains unverified because the user confirms no pickup transition since restart. Deploy using the preserving migrate_pickup_sms_reminders.js before the new worker starts; the complete current rollout also includes the earlier matching frontend/AI changes. Existing eligible unclaimed documents may receive reminders after deployment. See MIGRATION_ROLLOUT.md for exact commands.


## 2026-10-14 — Secretary evaluation catalog crash (findings before edits)

User reports u.some is not a function while opening College Secretary intake evaluation Review. The local production bundle maps function XZ to SecretaryEvaluationModal's EvaluationForm and u to documentTypes. The reference endpoint and client return an object containing document_types, but useSecretaryDashboard stores that whole response directly in array state. Other callers already read document_types. Correct the Secretary loader, validate the reference response shape, retain historical selected-type fallback and show a recoverable catalog error rather than crashing. No backend, fee, workflow, authorization or schema change is needed.

Implemented: the Secretary loader now stores the response's document_types array, ignores late completions after unmount, and supplies a catalog-load error to both digital and scanned evaluation forms. The shared reference service rejects malformed catalogs while preserving its response wrapper and fee fields for existing callers. Historical request types remain selectable even when absent from the active catalog. Pending, empty and failed catalogs do not erase the request or evaluation drafts.

Validation: all 1,061 frontend tests / 108 suites, frontend lint and the production build pass. Nineteen new regressions exercise the actual reference service through the Secretary hook, dashboard Review action and evaluation form, covering digital/scanned requests, catalog options and editing, historical types, empty/pending responses, network failure and invalid payloads. Deployment requires the matching Vercel frontend from dev, then a browser refresh; no Docker rebuild or database migration is needed. The deployed site has not been retested from this workspace.

## 2026-10-16 — reported UI bugs (findings before edits)

Reviewed all five pages of the user's Trace notes PDF and the current dev head d82e237. Shared FileUploadField clears its native input after selection, leaving misleading browser text beside a separate selected filename. ModalShell top-aligns phone dialogs. Preferences branches by role. DashboardPage adds a 64 px trailing spacer; queue animation may retain additional height. Some tables expose all rows or truncate security history without pagination. Manual layouts scroll their entire main container. Login uses a low-contrast text password toggle instead of the shared eye control. Compound input wrappers do not own focus outlines. Figma Student payment frame 2495:2103 now contains the finalized two-column summary/pay-panel design. Preserve saved fees and existing payment/slip handlers. Remove the student floating support launcher, update its tour guidance, and remove analytics actions/dialogs from Support for all roles. Support reports must authorize active Admin actors only; Admin retains Analytics access. No migration or live deployment is part of this batch.


Implemented: removed the Student dashboard/history chat launcher and its duplicate Support instance, updated the tour, and removed analytics controls/dialogs from every Support view. The report service rechecks the current Admin actor before reading aggregates; Window 1/Receiving Desk now receive 403. Student payment frame 2495:2103 uses all nine original intrinsic-size SVG exports, saved charges, grouped checkout, copy feedback and the previously missing slip preview wiring. Shared controls now own truthful file names, phone-modal centering, full compound-field focus, pointer affordances, normalized email/event/date/currency presentation and semantic dark icon treatment. Every role uses the same Preferences font, dimensions, controls and footer. FAQ answers scroll independently. Tables without paging now share PaginatedTable/Pagination; existing queue/server paging and exports retain their behavior. Removed the dashboard trailing spacer and fixed queue/minimum heights.

Validation: all 1,144 frontend tests / 117 suites and 1,737 backend tests / 130 suites pass; the final 125 maintenance/email/metrics checks pass. All 496 browser checks pass with synthetic data: 320/375/768/1440 px, both themes, 100/200% text, five role views, FAQ scroll containment, dialog centering, equal Preferences geometry/font, original payment asset dimensions, full-field outlines, Window 1 trailing space, pagination, Student chat absence, Admin Analytics availability, Support analytics absence, password toggling, selected-file feedback and slip preview. Lint, clean production/PWA build and git diff checks pass. Screenshot: archived review screenshot. The existing large-chunk build advisory remains. Deploy matching frontend/backend; no migration is required for this batch. Live deployment and physical-phone/keyboard acceptance are not claimed.

## 2026-10-16 — live tracker spacing and active status (findings before edits)

The two supplied screenshots show a nine-column tracker forced by the viewport breakpoint into a 960 px modal, an amber SVG dot in every status badge, and only the first stage date. Connectors use a hardcoded 22 px inset despite 16 px node radii and read transformed bounding boxes during modal entry. StudentDashboard passes list records without loading the existing authenticated /documents/:id/detail audit history. The old trackerProgress timer is no longer used by this tracker. Adapt columns to actual available width and text size, measure unscaled node geometry, route row turns outside labels, use status-colored dots, and fetch saved audit dates through a hook/service. User explicitly requests continuous animation for unfinished trackers: only the current node gets a subtle status pulse, disabled for completed/closed records and reduced motion. No inferred dates, status transitions, schema or backend changes.

Implemented: the panel allows 1200 px and chooses 9/3/2/1 columns from its actual width and text size, with measured radius-based connectors routed around labels. Badge dots inherit the saved status color. A lightweight halo pulses only around the current unfinished stage; completion removes it and reduced motion keeps a static halo. Authorized history loads on open and manual Refresh tracking, cancelling obsolete reads and rejecting wrong-document responses. Stage-entry dates use Manila time, latest recorded re-entry and explicit missing-date labels. Failed refreshes preserve the last saved snapshot with a warning; 403/404 remove protected details. Removed the unused fake progress timer.

Validation: all 1,159 frontend tests / 119 suites pass, including 17 focused tracker/history checks. All 141 synthetic-browser checks pass across 320/375/768/1440 px, light/dark, 100/200% text, normal/reduced motion and short 568 px viewports. Verified processing, payment-wait, completed, legacy and unavailable states; animation movement and dynamic reduced-motion cancellation; completed refresh stops the pulse; authorization loss removes cached details; no label/card overflow. Lint, production build, generated HTML/JS/CSS/service-worker asset consistency and git diff checks pass. Screenshot: archived review screenshot. This patch needs only frontend deployment; no backend rebuild or migration. Live deployment and physical-phone acceptance are not claimed.


## 2026-10-16 — College Secretary main tabs (findings before edits)

Inspected every one of the 28 main-tab frames in College Secretary section 2456:1797 of the current TRACE UI/UX file: dashboard/evaluation, Records & Export, Processing & Pricing, OR Verification, Final Handoff; digital evaluation, ticket list/create variants, supporting-document empty/ready/replacement/review states, linked cases with/without uploads, staff/internal Support workspaces and create dialogs; Personal Info and both Security scroll states. Graduate Applications 2514:3171 and Manual/FAQ 2547:2420 remain the later More-tabs review, per the user's main-first instruction. Current Secretary uses the generic shell/profile and sparkline KPI decoration, generic queue headings/equal columns, generic pricing/receipt/handoff dialogs and unstyled supporting-document forms. Existing shared Reports and Support workflows already supply most actions, scoped records, archives, history and protected files.

Implement the source shell/card/queue hierarchy, original intrinsic-size assets, case summary/purpose/evaluation sections, pricing stepper/summary and calculated amount, OR states and final-handoff summary. Scope shared Support/profile presentation to Secretary. Reuse existing hooks, confirmation/pending behavior, saved fee schedules, college authorization, archives and authenticated previews/downloads. Preserve mandatory instructions/receipt validation even where copied source labels or data imply a weaker rule. Do not copy source applicant imagery, receipt samples, fake counts/trends, Admin-only monitoring text or all-colleges access. No schema, dependency or backend changes are planned.


### 2026-10-16 — Finance Figma review (findings before edits)

Inspected all 25 Finance reference frames, including the three queues, counter entry, verification, receipt settings/pack/calibration/void/print, file preview/upload, Support dialogs and both profile tabs with scrolled Security. The current Finance implementation lacks the source KPI cards, table composition, two-column verification form and receipt dialog hierarchy. The latest user instruction authorizes Finance after Secretary and a subsequent all-account audit, including remaining frames. Preserve payment authorization, group totals, saved receipt snapshots, cutoff/deferred issuance, mandatory rejection notes, protected files and confirmation gates. Frontend presentation changes only; no migration proposed.

Implemented Secretary and Finance source layouts, queues, profile/security, reports, manuals and shared Support presentation; Secretary evaluation/pricing/OR/handoff and supporting-document workflows; Finance counter/verification/history, pack/calibration/void/print/copy dialogs. Reused existing hooks, saved fees, scoped records, archives, authenticated files and confirmation gates. Both uploaded and physical OR inspections require acknowledgment, reset when the receipt changes. Finance cutoff feedback distinguishes cleared payment from pending issuance. Mobile identity rows and supporting-document metadata wrap without compressing their text. Original SVG exports retain their dimensions; provenance covers all 165 manifest entries.

The cross-account audit inventories 135 current Figma frames. It found two remaining visual gaps: Student Payment modal 2506:1867 still uses the older checkout layout, and Secretary Graduate Applications needs the source white active icon 8dfb2.svg. Original asset retrieval remains blocked: Figma reads work, but native export is unavailable and download URLs return HTML rather than SVG. These gaps are explicit in FIGMA_UI_REVIEW.md; this change does not establish perfect system-wide parity.

Validation: all 1,163 frontend tests / 120 suites pass, including four new behavior regressions. All 2,509 synthetic-browser checks pass across all roles, 320/375/768/1440 px, both themes and 100/200% text, including targeted final layout/cutoff reruns. Lint, clean production/PWA build, local SVG dimensions/digests/build bytes, generated entrypoints/service-worker references and git diff checks pass. The existing large-chunk advisory remains. Four Secretary/Finance desktop/mobile screenshots and per-frame coverage are linked from FIGMA_UI_REVIEW.md. Frontend deployment only; no backend restart, migration, dependency or environment change. Production deployment and physical-phone acceptance are not claimed.


## 2026-10-16 — Support heading, activity labels and request-card consistency (findings before edits)

The user's screenshot requests Support headings above category tabs and readable activity action labels. Admin's desktop internal-category CSS explicitly reverses header/tab order; the other desk CSS only repairs visual order while leaving the DOM tabs first. Move category headings into MessagingWorkspace before its shared tabs and suppress duplicate embedded workspace titles, retaining local action buttons and mounted drafts. Activity Logs directly replaces underscores in raw step names; use a shared presentation formatter with expanded known abbreviations, preserve raw audit values, and search both saved codes and displayed labels. New Request has start-aligned auto-height cards containing variable descriptions and per-selection forms. Give the choice grid equal-width/equal-height cards, and keep selected-document fields in a separate keyed details list below it. Preserve selection rules, file drafts, search, saved years, validation and confirmation. No backend or schema changes.

Implemented the shared Support page heading before category tabs in both DOM and visual order. Embedded workspaces suppress duplicate headings; local actions, keyboard tab focus, category drafts and standalone/compact Support stay intact. Activity Logs now displays readable action labels, expands known abbreviations and searches both labels and original saved codes. Audit records and security-event formatting are unchanged. New Request choice cards have equal grid dimensions; selected-document fields appear below the cards with their existing keyed values, attachments, policies and validation.

Validation: all 1,168 frontend tests / 121 suites pass, including four readable-label/search regressions and a heading-order/keyboard-focus regression. All 304 browser checks pass at 320/375/768/1440 px, both themes and 100/200% text: all three categories for Admin, Window 1, Receiving Desk, Secretary and Finance; empty/selected/searched request choices with equal measured card sizes and retained purpose/file drafts; and formatted Activity Logs. Lint, clean production/PWA build, generated entrypoints/service-worker references and git diff checks pass. The existing large-chunk advisory remains. Screenshots: Support heading (archived screenshot), New Request desktop (archived screenshot), New Request mobile (archived screenshot). This is a frontend-only change; no backend restart or migration. Production deployment and physical-phone acceptance are not claimed. The previously recorded Student checkout and active Graduate icon Figma-asset gaps remain separate.


## 2026-10-17 — new notes and complete Figma review (findings before edits)

Read the 14-page October 17 notes and refreshed dev at ae0079a. Current Figma inventory has 149 frames: Admin Main 35, Admin More 8, Student 21, Alumni 1, Window 18, Secretary 30, Finance 25 and Login/Signup 11. New designs include three-step signup and document requests. The session mix-up is caused by authentication in shared localStorage, read afresh by Axios and realtime while React keeps a different cached actor. Move credentials/cache to tab-specific storage, preserve a compatibility path for existing tabs without replacing their legacy token, and guard late reads/rotations/logouts. Preferences remain browser-wide.

Other requested fixes: authoritative refresh of lists, details and badges after successful writes; login eye/field feedback; exact Student checkout with slip return navigation; declared Student Status throughout registration/Admin/profile; alumni dates starting at 1999; single-row confirmation actions; newest-first timestamped verification rows removed after success; shared non-dashboard page headings; consistent top-rounded tabs/inactive-only hover; saved year propagation; Admin-authorized Secretary backup intake within college scope; split Admin name fields; Secretary discussion/ticket spacing, shared 75px desktop header, meaningful updating counts (excluding Finance Payment History), Window intake composition, positive initial pricing pages and stable maintenance footer. Request steps must remain in one modal lifetime and keep files/drafts visible. Completed modal actions close, while unfinished multi-step work stays open. Preserve server authorization, saved pricing, confirmations and prior explicit UI overrides.

### Logout confirmation follow-up — findings before edits

The supplied screenshot shows a left-aligned Log Out title above a centered description. ConfirmDialog requests text-center, but ModalShell wraps its title in a start-aligned flex row, so inherited text alignment cannot center that row's contents. Center the full-width title in compact confirmations and use “Are you sure you want to log out?” for normal, graduate-gated and forced-password logout entry points. Retain Stay Signed In focus, pending protections, error recovery and server-confirmed logout.


## October 17 review — implemented and locally verified

Inspected all 149 current Figma frames and all 14 pages of the updated notes. Implemented the current Login and three-step signup, required current-student Regular/Irregular using existing study_load, alumni 1999 boundary, one-lifetime three-step request wizard with retained file/value drafts, source checkout with saved grouped charges and slip return, original auth/checkout/navigation assets, shared header/tab/heading/confirmation refinements and stable college choices. Removed the Ticket Actions disclosure for every account and placed role-specific guidance above conversation history; authorized operational controls remain. Logout title now centers correctly despite ModalShell's internal flex row, with the requested question in every logout entry point.

Moved auth tokens/cache to tab-local storage with one-time legacy adoption and guards against obsolete reads, rotations, 401s and logout. Successful writes emit allowlisted resource names through local/cross-tab/socket channels; each view independently refetches authorized data and preserves dirty drafts. Payment/catalog refresh retains checkout values. Pending verification rows prune immediately and sort newest first. Added Admin split-name edits with saved suffix and atomic audit, plus per-request Admin delegation of pending intake to a same-college Secretary. Assignment and intake independently enforce scope/ownership under locks; this does not grant a new global desk permission. No new schema, dependency or environment variable.

Validation: 1,192 frontend tests / 124 suites and 1,767 backend tests / 131 suites pass. All 2,648 synthetic browser checks pass across account/desk roles, 320/375/768/1440 px, light/dark and 100%/200% text, including final targeted layout and logout reruns. Test coverage includes separate-tab adoption/session races, successful-write invalidation boundaries, signup declarations/retained steps, saved payment draft refresh, same-college delegated intake/denials, atomic names/audit rollback and visible Support notes for seven role/desk variants. Lint, clean production/PWA build, all 31 current export digests/dimensions/build bytes, generated HTML, all 545 precache references and diff whitespace checks pass. Existing large-chunk advisory remains. Current screenshots, complete source inventory and adaptations are in FIGMA_UI_REVIEW.md. Production deployment, physical-phone acceptance and perfect pixel parity are not claimed. Deploy matching frontend/backend; no new migration. Standing user authorization is to push the reviewed result directly to dev, without publishing main or deploying services.

## October 17 follow-up — autofill, duplicate-ID timing and login edge (findings before edits)

The password screenshot shows the browser's pale autofill paint underneath white text. The existing inverse autofill inset shadow is in the base layer and is replaced by higher-layer focus ring shadows; focus-visible also adds an outline to the input's focus ring. Keep the autofill correction above ordinary controls, preserve readable text/caret and use one focus highlight. The user also requests square outer login corners, overriding the source frame's rounded canvas.

Signup currently rejects duplicate IDs only at final registration. The three-step form therefore lets an already registered ID leave Academic Details. Add a bounded, rate-limited public availability check returning only a boolean, and require a successful check before leaving step one. Preserve rejected applicants' existing-account resubmission, authoritative final validation, the unique database constraint, draft values and inline errors. Ignore cancelled/obsolete checks; network or malformed responses must keep the applicant on step one with retry guidance. Normalize new registration IDs consistently and translate the database duplicate race to the same inline message.


### Support header and Window totals / analytics — findings before edits

The latest Support screenshot requests the existing white avatar/title/status hierarchy, an icon-only linked-case control and no Ticket Actions disclosure. The shared conversation still puts its note first and collapses compact headers. Promote identity/status first in every role, use the original info asset and keep authorized actions, guidance and linked-case access.

Window Tracking counts every loaded record in All, but only current pipeline records in In progress and COMPLETED in Completed, leaving legacy/unknown records unexplained. Add an explicit Other statuses view from the same dataset; do not relabel rejected/unknown records as active work. Admin efficiency metrics already query saved documents/audit logs. Forecast fallback uses random volumes and frontend type filters multiply total predictions by fixed fractions; replace these with request-date daily aggregates, exact type filters, zero-filled observed days and explicit method/insufficient-data states. Existing AI queue recommendations use a four-example prototype: retain only evidence-based queue advice in production and connect Analytics advice to aggregate report measurements through the AI service. No personal data should be sent for analysis.


### Follow-up implementation

Fixed login autofill/focus contrast, square outer auth edge and top signup link removal; later request steps now have one Back button, while first-step Cancel dismisses. Registration checks ID availability before leaving Academic Details, preserves inline drafts/errors and ignores obsolete checks. Final duplicate admission and the unique-key race remain authoritative.

The latest Support instruction supersedes the earlier above-history note placement: identity/status is a fixed non-scrolling header, linked case is the native i icon, permitted ticket controls are adjacent icon buttons with accessible names/native hover titles, and Conversation guidance is below messages in the composer. Removed the compact header disclosure and kept the Ticket Actions menu absent. All roles preserve action confirmation, archives, file scope and drafts. Window/Receiving Settings is hosted beside the outer heading under the existing server permission.

Window Tracking now shows Other statuses for legacy/unknown records so all category counts partition the same dataset. Its caption explicitly states loaded count and any larger authorized total; the shared dashboard still fetches at most 100 latest documents. This is not a claim that the tab now provides server-wide status aggregates.

Admin efficiency and support charts use saved report queries. Their loaded aggregate datasets now reach the existing AI service for descriptive advice, with no identities, staff names or messages. Production queue advice no longer uses the four-coded-example classifier. Forecasts use saved request creation counts, exact saved type names, complete Manila days and observed idle days, require 14 days, validate model output and otherwise use deterministic weekday means. Removed all random baseline/jitter and frontend percentage/minimum-one adjustments. Outages are labelled separately from measured zero. Matching API/AI/frontend deployment is required; no new migration/dependency/environment variable.


### Final follow-up verification

All 1,200 frontend tests / 127 suites and 1,796 backend tests / 132 suites pass. The final 18 Python aggregate/route-body checks pass: actual route bodies are exercised with a controlled model, not a running Flask/Prophet/OCR installation or live institutional history. Lint, clean production/PWA build, generated entrypoints and all 528 detected entry/precache references pass. All 28 review-manifest asset byte/native-dimension checks and five reused Support-icon build-byte checks pass; no original Figma asset was edited.

All 665 synthetic browser checks pass across this follow-up: 25 auth/autofill/preflight checks, 368 request/role checks, 176 seven-role selected-Support/tracking/forecast/analysis checks and a final 96 targeted checks after footer/outage refinements. Widths are 320/375/768/1440, light/dark and 100/200% text. Checked fixed header bounds/no scrollbar, icon names/authorized linked dialogs, confirmed Resolve staging, accessible footer guidance, Settings heading placement, reconciled Other statuses, exact type requests, zero forecast display, report advice and dialog/page bounds. Source screenshots: archived review screenshot, archived review screenshot and archived review screenshot. No live MySQL/AI/OCR execution, deployment, forecast-accuracy result, physical-phone acceptance or perfect pixel parity is claimed. Deploy matching backend, AI service and frontend; no new migration.


## October 18 Admin PDF reports — findings before edits

Reports & Export currently downloads CSV only. Document Efficiency and Support Analytics have no PDF export. Add Admin-only generated PDF downloads for filtered document records, document efficiency and support analytics. Reuse authorized report services, preserve applied filters, include complete matching table datasets within an explicit PDF limit, and timestamp each fresh read. Include measured vector charts, denominators/sample notes, true missing/zero distinctions and available aggregate advice. Do not scrape the paged screen, invent data or expose raw support conversations/proofs. Keep existing CSV and other-role workflows intact. Default efficiency uses all recorded completion/desk history and a separate recent-release window; custom analytics dates must also reach release queries. New PDF generation is read-only and needs no save confirmation or migration.

### Implemented and locally verified

Admin now downloads generated record, document-efficiency and support-analytics PDFs through an authenticated, current-actor-checked API. Reports & Export offers all three types; both analytics views also export directly using applied dates, with document staff filters over the full dataset. Records override UI paging, cap at 1,000 and reject changing/incomplete counts. PDFs include generated Manila timestamps, scope, summaries, vector charts, complete matching tables, available validated aggregate advice, explicit missing values and repeated headers. Embedded licensed Inter fonts preserve Latin accents; unsupported glyphs use explicit Unicode code points with a note. Custom release queries now honor reporting dates. Existing CSV/other-role authorization remains intact. No new migration/environment variable; backend dependency/image rebuild and matching frontend deployment are required.

Verification: full frontend **1,217 tests / 129 files**, backend **1,816 tests / 135 files**, plus final affected-UI checks pass. Lint and production/PWA build pass. **85 final synthetic browser checks** cover 320/375/768/1440 px, both themes, 100/200% text, chooser/analytics layout, readable PDF icons, actual downloaded PDF bytes and filenames, applied-vs-draft dates and recoverable server errors. All 14 pages of three synthetic PDFs were rendered and visually reviewed; extracted text bounds, accented names, explicit unsupported-glyph notes and missing/zero distinctions were checked. No live MySQL/AI execution, production deployment, physical-phone acceptance or perfect Figma parity is claimed. Mobile PDF chooser (archived screenshot).

## October 18 forecast visibility and defense evidence — findings before edits

The compact Admin dashboard forecast currently slices seven returned predictions down to the last five, labels only weekdays, and provides no dated numeric list or historical comparison. The expanded view has all seven numbers but also lacks date labels and the exact input history. The API computes history counts/sample range but does not return the aggregate rows for inspection. Neither the code nor reviewed evidence establishes held-out Prophet/OCR accuracy; scan field detection is not accuracy. Some older defense-guide answers still incorrectly call step_logs the forecast target despite a later corrective addendum. Correct the visible forecast and source/evaluation explanation, preserve explicit insufficient-data/fallback states and Admin authorization, and do not invent a live-data result or accuracy percentage.

### Implemented and locally verified

The Admin dashboard and expanded forecast now share a solid recent-history line, dashed green prediction line and all seven exact dated values, including zero. The API returns the exact dates/counts already passed to Prophet, source/target metadata, current Manila day and explicit unvalidated status. Expand exposes every aggregate input row through a paged source table. Filters preserve exact type scope; loading clears obsolete history/method metadata. The modal filter no longer overlaps its visible close control. The chart remains visible at phone widths, with dated numeric alternatives and contained source-table scrolling. Corrected the primary stale step_logs forecast answers and Random Forest claims in the defense sources. No accuracy result, live-data provenance, deployment or institutional benefit is inferred.

Validation: all **1,220 frontend tests / 130 files**, **1,817 backend tests / 135 files**, lint and production build pass; all 528 entry/precache references resolve. **48 full browser matrix checks plus six source-table visual checks** pass across 320/375/768/1440 px, light/dark and 100/200% text. Checked all seven dates/zero, two series, full source-table pagination, exact type request, fallback/no-estimate/outage behavior, current-scope evidence and modal bounds. Fixtures are synthetic; no live Prophet fit or held-out institutional evaluation was run. Dated dashboard forecast (archived screenshot), mobile source counts (archived screenshot). Deploy matching frontend/backend; no migration, dependency or AI-engine change in this patch.

## October 18 held-out forecast evaluation — findings before edits

The user requests measured accuracy using existing data. No live database/.env is available in this workspace, so do not fabricate a local institutional result. Implement an Admin-triggered chronological backtest on the same saved aggregate history, with unseen later dates, the production skipped-current-day gap, Prophet-vs-weekday-baseline errors and inspectable prediction rows. Keep demonstration/unverified data provenance explicit. Require at least the production minimum of 14 training days plus eight later calendar days (22 total), labeling small-sample results as limited evidence; do not run an in-sample fit or turn missing evaluation into a percentage. Also found that the AI image omits analytics.py from COPY, which would make the existing route import fail in the container. Include the shared forecast/evaluation modules in the image and document a matching backend/AI/frontend rebuild.

The user's screenshots confirm the deployed compact card still shows five weekdays, the expanded card seven, and the active method is historical_weekday_average (fallback). They also show a 31-document snapshot (20 intake, five Finance, four preparation, one evaluation, one release) without actionable stage guidance. Add concrete human-reviewed next-step suggestions for occupied queues, including below earlier thresholds, and label them as workflow rules. Do not silently revive or claim a trained Random Forest from four coded examples; no labeled-outcome dataset or validated classifier is available here. Continue the forecast evaluation work already authorized.

### Forecast evaluation and action guidance — locally verified

Implemented Admin-triggered held-out evaluation, using the same fixed Prophet model configuration as forecasting, at least 22 complete days and up to five chronological seven-day target windows after a skipped simulated current day. Node validates model dates/cutoffs and recomputes Prophet/baseline MAE, RMSE, WAPE and horizon errors from the actual source counts; no invented accuracy percentage is returned. Added sample/provenance/model metadata, full prediction/fold evidence, explicit all-zero/insufficient/unavailable states, bounded compute/cache and protected Admin-only access. The AI image now contains analytics.py plus both new forecast helpers. Main queue messages lead with concrete intake/Finance/preparation actions; rules remain explicitly labeled and do not resurrect the four-example classifier. Document advice adds a workflow-appropriate next step for its observed longest stage.

Full backend **1,838 tests / 138 files**, full frontend **1,224 tests / 131 files**, final affected-UI tests, lint/build and 23 focused Python aggregate/route tests pass. A genuine Prophet1.3.0 integration fit five folds and produced35 held-out predictions on an explicitly synthetic fixture; the gateway validated and scored those outputs. This is an engine-integration check, not institutional predictive accuracy. All **64 final synthetic browser checks** pass for metric/fold/prediction/horizon views across 320/375/768/1440, both themes and 100/200% text, including exact type and failure/no-score flows. The user screenshot's fallback and analysis outage are consistent with the omitted module, but no deployed logs or live database were accessed. Rebuild backend/AI images and deploy the matching frontend; no migration/new dependency/env change.

### October 18 — Graduate application submission and academic selectors (implemented and locally verified)
Reproduced the onboarding 403: a mounted collection request has `/api/grad-applications/`, while the gate only allowed its slashless spelling. Normalize trailing slashes without widening the allowed routes. The published `program` field is still free text. Use the existing active college/program catalog for College → Degree Program, validate membership again under the submission transaction, and save readable names in application answers. Preserve configurable unrelated questions, historical answers and failed drafts; no schema migration or automatic profile-academic changes.

Implemented College → Degree Program using the shared active catalogs, canonical answer snapshots and locked membership validation. Added trailing-slash gate regression checks and inactive/foreign/deactivation-race coverage. Confirmation/failure drafts are preserved; saved applications no longer report a failed submission when only history refresh fails. Fixed the narrow-screen heading at 200% text. Full frontend **1,227 tests / 131 files**, full backend **1,849 tests / 138 files**, plus the final 57-test service run including added historical-answer coverage pass. Lint and production build pass. All **48 final synthetic browser checks** pass at 320/375/768/1440 in both themes and 100/200% text, including catalog retry, confirmed save, rejection retention and dashboard unlock. An earlier concurrent PDF test exceeded its timeout; its isolated and full bounded-worker reruns pass. A feedback focus test now waits for catalog readiness. No live database or production deployment was accessed. Deploy frontend and updated backend; no migration, dependency or environment change.

### October 18 — Graduate submission 500 follow-up (compatibility patch verified; live cause unconfirmed)
The user reports a live submission 500 after the trailing-slash fix. Browser status alone does not identify the production exception. Found a separate reproducible schema incompatibility: alumni submission writes `users.profile_completed`, although the base schema omits it and access is already derived from saved graduate applications. Remove the obsolete write rather than adding a redundant flag/migration. Add a regression that exercises the real answer-insert models with a connection that rejects the legacy column; retain atomic answer saves and independent profile completion. Production logs remain needed to confirm the user's exact exception.

Removed the obsolete profile flag write. A red/green regression reproduced `ER_BAD_FIELD_ERROR` through the real legacy UPDATE model on a mocked connection, then verified that actual application/answer INSERT builders commit without that column. Full backend **1,851 tests / 138 files** pass; the 98-test affected gate/profile/application run also passed. No live database/SSH access and no production deployment: the user’s exact 500 still needs backend error code/message confirmation. No frontend changes or migration required.

### October 18 — OCR measurement provenance and optional demo — findings before edits

The local dashboard's 45% came from two saved 45.00 scores with no verified current-method provenance. The three expected fields produce per-scan presence scores of 0, 33.33, 66.67 or 100; provider confidence cannot certify those measurements. Exclude historical/unverified and marked synthetic scores, stamp new completed intake measurements in the existing JSON, distinguish completed zero-field scans from processing failures, and show eligible/excluded counts. The correction is implemented locally; no database migration is needed.

The user now explicitly requests dummy examples whose displayed percentage also responds to new scans. Add an optional, initially off, clearly labeled dashboard demo preview using three examples (1/3, 2/3 and 3/3 detected fields). Combine these with eligible recorded scans using their sample counts, retain the recorded-only value and both sample counts, and never save demo records or use the combined result as real accuracy. Verify toggling, refreshed recorded samples, failures and mobile/text-size layouts before pushing to dev.

### Implemented and locally verified

New completed intake measurements are normalized/stamped in Node and checked by one shared aggregate used by dashboard/AI reporting. Completed zero-field reads are distinct from OCR failures. The old local two-score average is excluded without modifying saved history. The optional dashboard preview starts off, labels its three example scans and keeps recorded-only measurements visible; fresh qualifying scans change its weighted value. No dummy records are inserted and no accuracy claim is made. Existing analytics tab styling is preserved.

Verification: **1,876 backend tests**, **1,237 frontend tests** plus the **four upload integration tests**, **16 Python checks**, ESLint and production/PWA build pass. A read-only MySQL SELECT over literal fixtures verified eligible zero/partial/full samples, mismatched metadata, legacy scores and synthetic exclusions; the local aggregate remains null/zero eligible with two unverified scores. Browser review passes at 320/375/768/1280 px in both themes and at 200% text/320 px. [Mobile demo preview](ocr-demo-mobile-review.jpg). No production deployment is claimed. Rebuild backend and AI engine and deploy matching frontend; no migration/new dependency/environment variable.

### October 18 — compact metric information and first-party browser trust — findings before edits

The scan metric and forecast repeat long methodology/provenance paragraphs on the dashboard. Move those explanations into accessible info dialogs built on ModalShell, retaining primary values, demo provenance, sample counts and forecast method/status. Keep detailed source tables and held-out validation reachable from the expanded forecast.

Deployed authentication currently targets a separate DuckDNS API origin via VITE_API_URL. Brave/Safari may block that third-party HttpOnly trust cookie even though credentials and CORS are configured. Add a Vercel authentication-only reverse proxy before SPA fallback, enabled by the Vercel build command. Keep uploads, forecasting and Socket.IO on their existing API origin. Preserve cookie attributes, midnight expiry, password/factor verification, account binding, revocation and conservative proxy-IP handling. Verify rewrite routing, credentialed authentication requests and trusted/shared/expired states without changing real accounts. Production browser acceptance still requires deployment and a fresh opted-in OTP login.

### Added scope — irregular applicant transfer question, findings before edits

The user requests “Are you a transfer student?” for Irregular students. Signup does not collect it, while student_profiles already has is_transfer_student and previous_school and profile education already reads/edits them. Add a conditional explicit Yes/No choice in Academic details, requesting Previous School on Yes. Validate both client/server, include the staged registration review and save only those columns in the existing registration transaction without overwriting other profile/history fields. Clear hidden signup answers when changing applicant/student type; use the existing profile fields without adding a migration.

### Implemented and locally verified

Scan/forecast explanations now open from info icons, with shared dialog focus/Escape handling; primary values, brief statuses, scan demo provenance and denominators remain visible. The scan demo option is inside its info dialog. Expanded forecast info retains source pagination and held-out validation. Fixed a narrow signup heading overflow found at 200% text.

Vercel now enables the auth-only first-party proxy at build time, ahead of SPA fallback. Axios retains credentialed cookie transport and existing non-auth REST/Socket.IO origins. The real Express auth mount is private/no-store. A synthetic browser run used the real LoginPage and controller/auth/trust services with in-memory model replacements: one opted-in OTP challenge, ordinary logout and a second password sign-in reusing the HttpOnly proof without another challenge. No real accounts/database writes/email or live Vercel/Brave/Safari acceptance were used. [Deployment/acceptance and proxy-IP scope](BROWSER_TRUST_PROXY.md).

Signup now collects explicit transfer Yes/No for Irregular current students, requires bounded Previous School on Yes, includes the values in staged review and persists them in existing student_profiles columns within the account transaction. The narrow upsert preserves unrelated profile fields, and type changes clear hidden drafts. Existing academic profile/Admin views read the saved values. No migration/new dependency/backend environment variable; VITE_AUTH_PROXY is set by the root Vercel build command. Deploy matching frontend/backend.

Verification: full backend **1,891 tests / 142 files**, full frontend excluding localhost uploads **1,244 tests / 134 files**, and all **four upload integration tests** pass. Final affected-page checks, ESLint and production/PWA build pass. Browser checks cover compact cards/info dialogs and the conditional transfer form at 320/375/768/1280 in both themes; 200% text at 320 fits, source tables remain contained, and nested information closes back to the forecast. [Compact info UI](compact-ai-info-review.jpg), [transfer signup](signup-transfer-mobile-review.jpg). The screenshots use synthetic fixtures, not live institutional measurements.

### October 18 — Plain-language AI explanations on latest main (implemented and verified)
Fetched and reviewed `origin/main` 1c328a8 (10:45 Manila), with `origin/dev` 68e6798 at the same source tree. Main already contains Admin AI evaluation, archived cohorts and verified OCR method/exclusions; the older parallel local AI implementation is superseded and is not being merged. Confirmed `/ai/recommend` returns aggregate rules and does not train/call Random Forest. Its earlier four-example demonstration is not credible accuracy evidence. Simplify the current AI page and uploaded guide pages 8–10, explaining what can be tested, what remains unmeasured, and how the panel can inspect errors without claiming trustworthy predictions solely from staff review. Preserve all current scoring/data/auth logic and OCR eligibility checks.

Verified 15 affected AI/OCR frontend tests, ESLint and production build. All 48 synthetic browser checks pass at 320/375/768/1440, both themes and 100/200% text for trust/result/Random Forest explanations. The uploaded 10-page defense guide preserves pages 1–7 exactly and replaces only AI pages 8–10 with plain-language explanations; rendered all three edited pages and verified page/text preservation. Original source-guide metrics remain labelled as a reported local generated-data example, not a new production run. Updated the same user-provided PDF item. No algorithm, measurement formula, OCR sample eligibility, authorization, database migration or production deployment changed.


### October 22 security follow-up — implementation in progress
Restored from pushed dev after the previous transient worktree was unavailable. Rechecking route authentication, live permissions, upload scope, persistent throttling, AI gateway authentication and deployment/recovery prerequisites. Live server remains main b973af7; no cloud rules or production data changed.

### October 22 security follow-up — restored implementation
Implemented authenticated tracking, live desk/student-verification checks, owner/college/Finance file boundaries, graduate read/review scope with locked transactional decisions, scoped KPI aggregates, Admin-only global analytics/roster/maintenance, manual production registration verification, shared MySQL throttling and upload/OCR/export limits. Added AI gateway/concurrency protection, non-root read-only runtimes, safe request logs/context, readiness/graceful shutdown, bounded PDF layout cache, patched Python dependencies, static CSP/CDN headers, private credential preparation, least-privilege provisioning, encrypted backup/isolated restore tooling, read-only GCP inventory and expanded CI acceptance. Corrected a pre-existing flaky MFA test to flip a ciphertext bit rather than sometimes writing the same byte; encrypted MFA format is now validated strictly. Live production remains b973af7 until coordinated rollout. Local and CI evidence recorded in the follow-up commit/checks; unavailable prior transient work was not treated as verified.

CI acceptance found that the read-only volume helper lacked permission to inspect MySQL-owned 0700 directories after dropping all capabilities. Added only DAC_READ_SEARCH to read helpers while keeping source volumes mounted read-only; restore helpers remain isolated to fresh drill volumes. Real atomic MySQL counter/account checks already passed.

The image scanner found vulnerable vendored installer libraries that the ordinary installed-package audit did not cover. Updated build installer CA bundle and removed pip/ensurepip from the immutable AI runtime instead of excluding findings. CI now inventories actual installed distributions with importlib.metadata and asserts there is no runtime installer. Local production-build CSP checks passed 24 assertions across login/signup at 320/375/768/1440, including blocked inline-script probes; this is not a whole-application browser acceptance claim.

Final review coalesced readiness probes with a short production cache to protect the database from public health-check bursts, and removed remaining raw OCR debug text/exception strings from logs and responses. Added regression checks for coalescing and private OCR failure details.

Recovery acceptance now compares every restored base-table row count with a manifest captured while source writers are stopped, as well as database integrity and restored upload/n8n bytes; added manifest validation tests.

The isolated restore reached import successfully but the minimal mysql:8.4 image does not ship mysqlcheck. Switched integrity verification to SQL CHECK TABLE using the included mysql client; retained all row/file comparisons and network isolation. AI runtime and image/dependency gates passed on 9000879.

The complete encrypted SQL/row-count/file restore drill and Caddy validation passed on 95d504a. The backend image gate then found vulnerable npm-bundled packages outside the audited application dependency tree. Removed unnecessary npm/Yarn runtime installers and added a container acceptance assertion; development/CI npm tooling remains available outside the production image. No scan findings were excluded.


## Documentation cleanup — October 22, 2026 (complete)

Requested cleanup: remove the PNG review artifacts and retired/duplicate Markdown guides, reduce the README to the system introduction and clone-to-local-setup instructions, and retain current deployment, migration, security, workflow and model references. Preserve unique migration evidence before removing the duplicate checklist; repair retained links and validate setup paths against the source.

Completed: removed all **71 PNGs** from `docs/` and six retired Markdown documents (the two defense guides, duplicate deployment checklist, old feature/support implementation checklists and superseded security-readiness snapshot). Kept 19 current reference/policy/evidence guides. Unique migration status and live-acceptance requirements are consolidated in MIGRATION_ROLLOUT; historical artifacts remain available through Git history. The README now covers introduction, supported prerequisites, clone/install, private backend settings and independent keys, fresh database/seed/preflight, API/frontend startup, AI setup and routing links. Local n8n editor instructions bind to loopback and include the Linux host-gateway alias.

Validation: **170 local Markdown links across 23 retained Markdown files resolve, including heading anchors**; fresh-schema source cross-check found **zero missing fields** against every exported `check_schema.js` requirement; README script names, configuration names, ports, proxy paths, seed IDs and AI CPU wheel versions were checked against source. `git diff --check` passes. This documentation-only change does not repeat application test suites; the preceding security-code commit 066d64b passed all five push/PR CI jobs, separately recorded above.

Operational continuation: SECURITY_ROLLOUT now records the supplied capacity/firewall findings, unused-build-cache cleanup and a VM-tag-scoped Cloud Shell deny rule that leaves SSH/HTTP/HTTPS outside its ports. Cloud inventory confirms public n8n ingress and the VM's IPv4-only NIC; no VM/firewall/IAM mutation or disk cleanup has been executed by the agent. Existing production remains on the user-reported main b973af7 until the coordinated rollout.


### October 22 — Registrar revisions (in progress)

Source: current TRACE Figma file eQNaLBPXQSojI6lOK60Api (149 frames, eight sections), ClickUp Bugs list and the user's confirmed policies. Mobile tab/dialog layout, analytics cards and persisted FAQ feedback were investigated; their unpushed implementation was removed by workspace maintenance and is being reconstructed. These items are not yet verified or deployed.

Confirmed preparation periods count Monday–Thursday, with Day 1 on the first following working day: BSN RLE, Nursing Hours, BSN Course Description, BSN Course Syllabus, BSN International Form and BSN Accreditation use 15 working days. Undergraduate TOR and Honorable Dismissal use 10; graduates use 5. Copy of Grades and Permanent Record(s) use 10. Unknown types keep a staff-entered Monday–Thursday estimate capped at 15 working days. Dates are based on original submission, never Secretary acceptance. Same-day eligibility remains its existing independent policy. No invented holiday calendar or automatic release/status transition.

In progress: additive release_working_days snapshot with an explicit migration; server-authoritative estimates at filing/evaluation; page-based base-fee calculations for every unpriced document and college override, preserving the saved numeric rate. Fixed Rental/Special/named extras retain their stated basis; separately printed components retain independent page counts. New calculation snapshots are version 2 (printed_pages_v2). Existing finalized prices, paid records, receipts and historical amounts are preserved. Payment remains Finance-only.

Pending: complete regressions, mobile/browser comparison, FAQ persistence reconstruction and current extreme-case analysis (long desk wait, 15-working-day breach, missed estimate). Do not describe this batch as complete until the checks and push are recorded.
