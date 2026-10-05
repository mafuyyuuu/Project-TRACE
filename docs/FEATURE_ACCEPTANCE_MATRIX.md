# Feature acceptance matrix

Reviewed October 6, 2026. This is the current index of the requests supplied in the conversation. The detailed findings and executed checks remain in [PROGRESS.md](PROGRESS.md). A historical passing test is recorded evidence, not a claim that an unfinished replacement or the deployed site passes today.

Use these statuses precisely:

- **Implemented / recorded checks**: repository implementation and earlier local checks are recorded; recheck affected behavior after this round and perform live acceptance.
- **In progress**: code exists but the full requested behavior or acceptance is unfinished. Resolve outstanding checks before recommending rollout.
- **Pending evidence / policy**: a physical device, live delivery, restore exercise or institutional decision is still needed.
- **Discontinued / superseded**: the user explicitly ended the investigation or approved a replacement requirement.

## Shared presentation and account pages

| Requested feature | Status and evidence location |
|:---|:---|
| Consistent controls, spacing and responsive layouts for every role | Implemented / recorded checks: PROGRESS → Consistent controls and page layouts; [UI_CONVENTIONS.md](UI_CONVENTIONS.md) |
| Supplied Canva branding, logo1 light / logo2 dark | Implemented / recorded checks: Approved Canva branding; signed-in TraceBrand |
| Supplied PLP seal on every signed-out page and welcome panel | Implemented / recorded checks: PLP branding across public account pages; shared PlpBrand and AuthShell |
| Main / More, role-aware navigation, Preferences/Logout, accessible scroll fallback | Implemented / recorded checks. Latest approved rule supersedes earlier five-slot rule: **six destinations, More seventh only with seven or more destinations** |
| Responsive Preferences, text sizes 100/125/150/200%, focus/Escape | Implemented / recorded checks: Responsive Preferences and consistency round; physical-device acceptance remains open |
| Shared motion tokens, reduced motion, continuity/detail/context feedback | Implemented / recorded checks: Shared UI transition system; [UI_MOTION.md](UI_MOTION.md). New Support components must also pass this convention |
| Sidebar icon lift, green highlight and accessible hover/focus labels | Implemented / recorded checks: Floating sidebar icons and accessible labels |
| Button lift/press/focus/disabled states retaining semantic colors | Implemented / recorded checks: Shared button lift and feedback |
| Interactive card elevation without inventing actions on informational cards | Implemented / recorded checks: Restrained card elevation |
| Full-width expandable FAQs, camera-only profile photo changes | Implemented / recorded checks: Approved FAQ, Photo, Text Size and Profile Repair |
| Remove page search bars and message-send confirmation | Implemented / recorded checks in prior continuation; ordinary message Send remains direct. Ticket FAQ topic matching is part of the newly approved FAQ assistance |
| Once-per-account spotlight guide, question-mark replay and improved chat launcher | Implemented / recorded checks: Guided-tour and Signup/account repairs, including Window 1, Secretary, Finance and Admin tours |
| Preserve defense guide/script visual layout, diagrams and detail; update content | Original presentation restored and content corrected in place. Detailed Q&A and three-presenter script retained; local Support implementation and deployment limits labelled explicitly |

## Security, profiles and registration

| Requested feature | Status and evidence location |
|:---|:---|
| Authenticator app setup and recovery codes in every profile's Security | Implemented / recorded checks: all-role AuthenticatorSettings, QR/app confirmation and recovery flow; deployment requires configured MFA key and explicit migrations |
| Admin personal-browser trust after one app challenge, unchecked opt-in, expires today | Implemented / recorded checks: Signup/account repairs; account/version/app checks and Manila-midnight expiry preserved |
| Staff without inboxes use individual apps and Admin-assisted initial setup | Implemented / recorded checks; temporary setup cannot bypass an enrolled factor |
| Move shared-computer mode out of login | Implemented / recorded checks: Clerk browser preference relocation; explicit personal/shared choice in staff preferences |
| Recovery-code copy success/failure and download-started feedback | Implemented / recorded checks: Recovery-code copy/download feedback; no claim that a triggered download saved to disk |
| Recovery-code mode switch beneath its input | Implemented / recorded checks: Recovery-code switch placement in Login and Security |
| Security Logs readable columns, long identifiers and narrow-screen scrolling | Implemented / recorded checks: Security Logs column layout |
| Password `_` special character in signup/change/reset/Admin accounts, length/reuse unchanged | Implemented / recorded checks: Signup/account repairs, mirrored validators |
| Password change/reset, sessions/logout-all, email changes, audit/deactivation | Implemented / recorded checks in security continuation. Live owner-mail, session and deactivation acceptance remains separate |
| Forgot Password by student ID/staff ID/email, hashed single-use reset, safe diagnostics | Implemented / recorded checks: Password-reset email diagnosis. HTTP 200 is enumeration-safe receipt, not delivery proof; live recipient delivery still requires sanitized correlated outcomes |
| Signup retains email; ownership link initiated from Profile before requests/payments | Implemented / recorded checks: Signup/account repairs; login OTP remains separate |
| Verification email button, concise one-hour helper, resend/change-address instructions | Implemented / recorded checks: Verification email button and Concise Profile email verification guidance; backend expiry is one hour |
| Single state-appropriate email-result return button | Implemented / recorded checks: Verification return action; signed-in /dashboard vs signed-out Login |
| Profile loads saved fields, missing-field popup and API request gate | Implemented / recorded checks: Profile repair, followed by graduation-year request-gate tests; actual SQL/logout/login acceptance remains separate |
| Active-tab field warnings, accessible tab markers and Title Case labels | Implemented / recorded checks: profile warning/label rounds; required hints update with draft values |
| College and Program dropdowns; Admin manages approved catalog | Implemented / recorded checks: linked catalog round. Admin must populate Registrar-approved programs; no invented list |
| Separate PLP/college graduation and attendance years; exact four digits | Implemented / recorded checks: Graduation year labels and validation. College 2002–current Manila year; older school years allowed; college optional for current students, required for alumni; school years required; old attendance not reclassified |
| Registration proof framing, protected preview/download and Admin review images | Implemented / recorded checks: Registration proof framing and Maintenance image repair; no public identity URLs or real-ID fixtures |
| Read ID recognizes the selected local proof; program visible in Admin review | Implemented / recorded checks: multipart and safe Program/College projection repair |
| OCR false flags show a reason and retain human review | Implemented / recorded checks: OCR follow-up/verification-reason migration. Text matching and extraction do not prove authenticity; real image accuracy remains pending evidence |
| Finance OTP arrived at unrelated inbox | **Discontinued by user** after saved-recipient boolean check. No live delivery cause or repair is claimed |
| SEC-01 expansion | **Design/sign-off required before any new implementation**, per the user's acceptance rule |

## Documents, Finance and reporting

| Requested feature | Status and evidence location |
|:---|:---|
| Admin Templates tab, bounded loads and actual template consumption | Implemented / recorded checks: Templates recovery/continuation. Missing production tables were addressed through user-run rollout; test populated deployed templates separately |
| Student-name profile modal loads/retries across staff views | Implemented / recorded checks: shared student-profile repair and authenticated image handling |
| TOR Year Started/Ended; rates only during filing, final breakdown on dashboard | Implemented / recorded checks: CN-15/CN-08/D-10 pricing and approved TOR correction; actual printed pages determine final price |
| Admin default/college rate schedules and named fees; Secretary enters pages; Finance verifies | Implemented / recorded checks: approved pricing scope. Rental/special fees once per document type per request; historical recorded breakdowns preserved |
| Payment acknowledgment separate from deferred digital OR; actual OR sent when issued | Implemented / recorded checks: Finance continuation; no fabricated OR or automatic promise of issue date |
| 4:00 PM Manila cutoff inclusive, Later OR upload and elapsed pending-OR tracker | Implemented / recorded checks: Finance receipts and clarified workflow; delay is visible, issuance deadline is not promised |
| Finance transaction export and staff report/export access | Implemented / recorded checks: dedicated Finance panel plus Window 1/Secretary/Admin reports |
| Header Export dropdown; Filters → KPIs → Records; common active scope | Implemented / recorded checks: reporting rounds; applicable exports retain filters and role scope |
| Shared status colors: pending amber, processing/verified/Approved blue, Ready/Completed pine, Rejected red | Implemented / recorded checks: status helper round. Badge color does not override terminal lifecycle |
| Workload share against full filtered total, 60/30/10 and zero handling | Implemented / recorded checks: workload share round; denominator is unpaged staff data |
| Secretary merged records, cleared preset Ready + Completed, Completed-only, assigned-college exports, route alias | Implemented / recorded checks: approved optional merger; all columns and profile actions retained |
| Unpaid Payment card amber, Pay after breakdown, measured text contrast and grouped line items | Implemented / recorded checks: four payment presentation rounds; fee computation/payment guards unchanged |
| AI Insights dark theme and consistent KPI sparklines | Implemented / recorded checks: AI theme and Admin KPI sparkline rounds; volume forecast remains a separate graph |
| Edit/Restore/Deactivate button surfaces | Implemented / recorded checks: Fee-schedule action surfaces; confirmations and permissions retained |
| Repeat quantities except Honorable Dismissal; approved same-day walk-ins and original/photocopy checks | Implemented / recorded checks: Registrar policy continuation; CTC, second COR/OGR and CAV only under recorded prerequisites |
| Case-specific supporting documents, submission QR and durable request numbering | Existing implementation / recorded checks; requirements now use the locally verified Support catalog/replacement/history workflow below |
| Canonical forms/linked document sets and delay/SLA notification threshold | **Pending institution-approved policy** where not supplied. Do not invent forms, links or time thresholds |

## Unified Support round — each feature remains individually tracked

See [SUPPORT_IMPLEMENTATION_CHECKLIST.md](SUPPORT_IMPLEMENTATION_CHECKLIST.md) for the separate completion evidence for TRACE-28 through TRACE-41 and chat-file security. The approved policy is in [SUPPORT_DESIGN.md](SUPPORT_DESIGN.md).

TRACE-28–41 and the approved chat-file workflow are **implemented and locally verified**. The shared workspace, FAQ escalation, durable queue, calendars/reply clocks, private files, catalog/replacements, cancellation history, metrics and aggregate advice have source tests and synthetic checks. [SUPPORT_VALIDATION.md](SUPPORT_VALIDATION.md) records actual migration/race/browser/capacity evidence and its limits. Secretary/Finance review dialogs now use the ticket workspace; legacy send endpoints reject stale clients instead of splitting new history. The matched API, AI image, frontend and explicit migrations are ready for rollout review. They have not been deployed by the agent; real-phone, live permissions/delivery and matching staging capacity remain separate acceptance work.

## Acceptance that source tests cannot complete

Keep the user's original acceptance checklist in PROGRESS active: actual first-login alumni gate; phone/email persistence through live logout/login; institutional visibility saves observed by actual student/alumnus sessions; owner emails; original Back to Login viewport; physical phone input zoom, nine-step tracker/line, large-text layouts and queue badges; real populated exports; measured low/high chart rendering; private off-server backups plus a **test restore**; and production-like capacity. A healthy container, checksum or synthetic browser screenshot does not substitute for those checks.
