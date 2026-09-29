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
