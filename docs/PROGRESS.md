# Project TRACE Progress Report

## Current Status
- **Batch 1 to 8**: Previously marked complete in the historical docket. The reconstructed batches are being re-verified; see the current review below.
- **Batch 9 Phase 1 (Core Routing & Split-Screen)**: Complete.
- **Batch 9 Phase 2 (Registrar Consultation - Pricing/Sequence)**: Complete.
- **Batch 9 Phase 3 (Messaging & Templates)**: IN PROGRESS (Just Completed)
- **Batch 10 Phase 1 & 2 (Audit Trail & Rate Limiting)**: Complete.
- **Batch 10 Phase 3 (Security & Account Protection)**: Complete.

## Completed In Batch 9 Phase 3
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

## Next Steps
- Begin Final Phase of the remaining tasks, or deploy and test.

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
