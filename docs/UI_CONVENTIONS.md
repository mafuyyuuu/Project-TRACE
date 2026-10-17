# TRACE controls and page layouts

All roles and public account pages use the Tailwind component classes in `frontend/src/index.css`. These are presentation rules; permissions, validation, API calls and confirmation workflows remain in their existing modules.

The existing green branding is the baseline. Normal fields and actions use consistent typography, padding and rounded corners. Controls have a minimum 44 px height; content can increase that height. Typography and unitless line height scale with the saved text-size preference. The PDF does not prescribe these dimensions.

The primary [TRACE Figma file](https://www.figma.com/design/78A3HTREQ86GIN9ZxvDBSv/TRACE-Draft?node-id=0-1) is the visual reference, applied per bug batch. Use its Font (`2:38`), Colors (`2:63`), Student Dashboard (`216:1003`) and New Request (`85:1514`) frames for shared foundations; disregard the glassmorphism/claymorphism and inspiration studies. `tailwind.config.js` defines the emerald, sage, canvas, surface, ink, muted and field tokens. Shared typography uses Inter, fields/buttons use 8 px corners, desktop sections use 32 px corners, and modal panels use 14 px corners. Keep compact mobile sections, 44 px control targets, wrapping text and the existing accessible dark equivalents. The Figma emerald is used for branding; small white-text actions retain the darker pine variant for contrast. Muted Figma text is decorative only; readable field placeholders and secondary copy retain higher-contrast colors.

Shared foundations do not replace role-specific workflows with mockup content or redesign entire screens in this batch. Support workspace (`260:3301`) and compact message frames (`254:987`, `258:1093`) are the Batch 10 references. Port their layout and interaction details in that batch, preserving live data and permissions.

## Window 1 reference and ticket archives — 2026-10-15

All 18 frames in the [Window Clerk section](https://www.figma.com/design/eQNaLBPXQSojI6lOK60Api/TRACE-UI---UX?node-id=2362-1473) were individually inspected before implementation. Window 1 / Receiving Desk shares the source staff shell, profile and Support Settings presentation without changing its role or API permissions. `WindowOverview`, `WindowTracking`, `ManualInputModal`, `IntakeReviewModal` and `ReleaseDocumentModal` own the counter-specific composition. Original SVG exports live in `public/window-figma`; existing identical source assets are reused. No source applicant photos, QR codes or payment documents are shipped as live data.

| Figma frame | View / state | Implementation |
|---|---|---|
| `2362:1474` | Dashboard — Intake | WindowOverview / queue / SubmissionQrPanel |
| `2413:6138` | Dashboard — Release | WindowOverview / release queue |
| `2369:4603` | Tracking Desk | WindowTracking, server records and progress filters |
| `2369:5200` | Student & case support | MessagingWorkspace / SupportWorkspace |
| `2385:3008` | Staff coordination | StaffCoordinationWorkspace |
| `2385:3372` | Internal assistance, selected concern | InternalAssistanceWorkspace |
| `2369:5375` | Reports & Export (source mislabeled Tracking Desk) | ReportsPanel / inline ReportFiltersModal |
| `2385:3237` | Support Settings | AdminSupportSettingsForm, existing can_manage guard |
| `2402:1585` | New linked support ticket | SupportWorkspace create form |
| `2402:1629` | New Staff Conversation | StaffCoordinationWorkspace recipient / message form |
| `2402:1701` | New Internal Concern | InternalAssistanceWorkspace create form |
| `2403:4606` | Manual / FAQ | Role-aware AdminManual presentation |
| `2406:1753` | Manual Input | ManualInputModal |
| `2408:5740` | Profile — Personal Info | ProfileSettingsModal staff presentation |
| `2408:5808` | Profile — Security top | AdminProfileSecurity, existing staff security API |
| `2408:5960` | Profile — Security scrolled | Same security body with pinned summary / footer |
| `2409:1753` | Intake Check | Two-column IntakeReviewModal, attachment readiness gate |
| `2417:6657` | Release Document (source mislabeled Window Clerk Modal) | Cancel-first ReleaseDocumentModal |

Live totals, eligibility, estimated/final fees, assignments, document stages, protected receipts and generated registration QR codes remain authoritative. Staff coordination keeps its actual conversations and recipient rules rather than the copied case-ticket rows in its mockup. Window guidance contains the role's actual tasks. Release uses the protected Official Receipt or truthful physical-receipt guidance; a mock payment slip is never substituted for a receipt. Tables scroll within the card; long/large-text forms scroll while actions remain reachable. Narrow 200% Intake Check condenses its repeated footer hint to retain usable body space.

The user's archive request intentionally extends the Figma frames: `TicketArchiveTabs` appears in student/case support and internal-assistance lists, including mobile ticket dialogs. **Active** contains unresolved tickets, **Archive** contains `RESOLVED` tickets. Backend filtering precedes cursor pagination and retains ownership/desk/college rules. Resolution/reopening switches the selected conversation to its new view. History, files and existing reopen restrictions remain; no archive table, deletion or extra archive migration is introduced. Staff coordination has no ticket-resolution state and keeps its existing conversation list. Shared `FilterSelect` remains the approved Student History treatment.

## Student reference and shared filters — 2026-10-15

The [Student section](https://www.figma.com/design/eQNaLBPXQSojI6lOK60Api/TRACE-UI---UX?node-id=2354-4416) is the current Student visual reference. The re-audit inventories 17 frames, including the floating panel, both support dialogs, six profile top/scrolled views, and Live Track. The earlier ten-frame inventory omitted the profile and tracking frames. The sparse manual frame was resolved through its screenshot and six detailed child contexts. Student is implemented for visual review; it has not yet been accepted.

| Figma frame | View / state | Implementation |
|---|---|---|
| `2283:1296` | Student Dashboard | StudentWelcome / StudentOverview |
| `2313:1577` | Dashboard with chat open | Source reference only: user removed the floating launcher October 16; use Support |
| `2317:1307` | Support tickets modal | SupportWorkspace ticket list |
| `2317:1359` | New Support Ticket | SupportWorkspace create form |
| `2321:1277` | New Request | NewRequestModal |
| `2323:1277` | Confirm Document Request | StudentRequestConfirmation |
| `2324:1277` | History: All Requests | StudentHistory request view |
| `2326:1293` | History: Payments | StudentHistory payment view |
| `2328:1309` | Support | StudentSupportEmpty / SupportWorkspace |
| `2354:3364` | User Manual / FAQ | Role-aware shared manual presentation |
| `2386:1553` / `2385:2345` | Personal Info: top / scrolled | StudentProfilePersonal |
| `2386:1819` / `2385:2157` | Educational Background: top / scrolled | StudentProfileEducation |
| `2386:2002` / `2385:2609` | Security: top / scrolled | StudentProfileSecurity / AuthenticatorSettings |
| `2394:1583` | Live Track | LiveTrackingModal |

`trace-student-shell` owns the reference header, rail, type scale and page geometry, including the compact mobile header. The Student SVG exports retain their intrinsic dimensions in `frontend/public/student-figma`. API identities, receipts, timestamps, status counts and prices remain dynamic. Keep required year/purpose/copy/attachment fields and the one-dismissal guard; selected document cards stay visible while searching so hidden required fields cannot bypass native validation. Review consumes the existing staged submission, preserves drafts on cancellation and confirms before submitting. Completed KPI copy describes completed records rather than promising pickup for a released request.

The user selected the History **All statuses** dropdown (`2324:1578`) as the system-wide filter design. `components/FilterSelect.jsx` composes the original 15 px funnel and chevron with a native select, outlined 12 px corners, 40 px desktop and 44 px mobile height, dark colors and visible focus. Reuse it for filtering dropdowns; preserve accessible names, options, controlled values and caller-owned filtering. Apply it in tracker/forecast, accounts/desks, document types, audit events/roles/range, analytics staff desks, graduate programs, internal-assistance state/category, and shared report/payment-history filters used by Admin, Window 1, Finance and Secretary. This is an intentional user-approved override of earlier Admin filter styling. Queue/navigation tabs and data-entry selects retain their own semantics.

History request search combines tracking/document terms and the saved status; payment search also matches references. Keep each view's search/status draft, the existing paid-or-submitted-reference payment cohort, honest unpriced amounts, protected receipt callbacks and totals derived from visible priced rows. Tables scroll internally rather than squeezing amounts, dates or receipt controls. Manual guidance and counts remain role-aware; local Yes/No selection does not create server FAQ votes. Support ticket creation, FAQ-first escalation, attachments, hours, permissions and confirmation stay in existing hooks/services. Older-ticket controls follow the actual cursor, not mock history.

User-approved current-student education override: show Year Level and Section instead of college graduation/last attendance, require the saved enrollment fields for requests, and show them in authorized staff profile views. Alumni retain their source historical-year fields. TOR still reads saved Year Started; school-history graduation years remain. This intentionally updates the education frame content without changing the Figma file.

Student profile uses the source 720 px panel, fixed identity/tabs/footer and one scrollable body. Proof remains authenticated and read-only. Preserve field hints, conditional requirements, saved-year restrictions, email verification, authenticator flows and confirmed profile/session changes. Security activity stays visible below the password/session sections. Live Track retains the source summary/progress composition and Copy tracking ID action. Following the October 16 readability request, its panel can reach 1200 px, with 9/3/2/1 alternating columns selected from actual map width and text size. Connectors join measured, unscaled node radii and turn around labels. Stage order and messages remain pipeline-derived; authenticated detail history loads on open and Refresh tracking, with real Manila dates or Date not recorded. Failed refreshes retain the last saved status with a visible warning; 403/404 discard the protected snapshot. Status badge dots inherit their status color. Only the current unfinished node pulses; completed, legacy/unknown records and reduced motion stay static. Static geometry stays in pixels while typography follows text-size preferences.

[Profile and tracking review](student-profile-tracking-review.png) · [Synthetic Student desktop review](student-tabs-review.png) · [Student dialogs/mobile](student-dialogs-mobile-review.png) · [Shared filter examples](shared-filter-review.png).

## Admin reference — 2026-10-15

The user accepted Main Tabs on 2026-10-14. That review covered every frame in [Admin – Main Tabs](https://www.figma.com/design/eQNaLBPXQSojI6lOK60Api/TRACE-UI---UX?node-id=2217-20270). All 35 frames were individually inspected, including modal, tab, expanded and scrolled variants. Registration v2 supersedes the original review frame, and the populated audit table supersedes the earlier placeholder. The current review covers all eight frames in [Admin – More Tabs](https://www.figma.com/design/eQNaLBPXQSojI6lOK60Api/TRACE-UI---UX?node-id=2193-1056), including both analytics scroll states. The More implementation is ready for the user’s visual review; it has not yet been accepted. Other roles keep the shared reference above.

`trace-admin-shell` scopes the Admin typography, rounded top bar and navigation rail, compact controls, table spacing and section surfaces. Admin-only components use `trace-admin-*` classes; portaled dialogs are scoped to the active Admin shell. The local Inter variable font and exported Figma SVG icons live in `frontend/public/admin-figma/` with the font license. Keep these as native assets, not rendered screenshots of entire screens.

The accounts directory initially shows six rows and three additional account previews; View all reveals the complete filtered set. Every account action opens its existing detail view. Catalog add/edit controls open the corresponding dialog or document-type drawer; draft staging, confirmations, pending guards, protected uploads and server permissions remain authoritative. Templates retain an isolated, sandboxed preview; variable insertion respects the selected cursor range and input limit, and Reset to default clears only the draft until a confirmed save. Manual search covers questions and answers without removing existing guidance.

Audit controls filter the loaded response, with eight rows per page; display this scope rather than implying complete server-history search. Default All loaded history retains the existing records, while date selections use the page's snapshot time. Preserve full raw event codes, identifiers and IP addresses. Graduate filters search loaded applicants and program/college values; row check/reject icons open the review dialog and never submit a decision directly.

Below 768 px the Admin header uses a single 64 px row with the accessible logo mark, menu and existing utility actions. Keep 44 px tap targets, hide only the duplicate text wordmark and anchor the notification panel to the header edge. Desktop retains the full wordmark and source spacing. [Synthetic before/after](admin-mobile-header-review.png).

Desktop geometry follows the source frames; narrow layouts stack sections and use existing table scrollers. Text preference enlargement may increase card height rather than clip values. Retain dark equivalents, keyboard access, visible focus, reduced motion and 44 px mobile controls. Live values, honest empty/error states and required workflow explanations take precedence over copying example records or unsupported performance claims from the mockups.

Main Tabs fidelity follow-up: boxed action labels reserve min-content width; registration
email addresses may break at `@` before splitting a domain. Original icon exports must
contain every contour (the staff password eye uses a complete Figma PNG export).
Profile Security keeps its summary/tabs fixed and scrolls its cards; card actions align
right on desktop and reflow at small widths. Document schedules show currency prefixes
and side-by-side base/rental/special fields, with Registrar rule guards preserved.
Payment method editing locks the code and stages confirmation through the existing service.
Audit timestamp lines use Asia/Manila, with raw unknown event codes preserved.
[Synthetic fidelity screenshots](admin-main-tabs-fidelity.png) cover the latest correction.

The tracker Filter label and dropdown share two grid columns at every supported
width. Document Types and Security Logs chip rows attach directly to their toolbar
without the shared header's bottom divider. Verify the label/control positions and
computed border width, as page overflow checks alone do not catch these differences.

### More Tabs frame inventory

Every frame below was inspected individually, including original screenshots and detailed child contexts. [Synthetic desktop screenshots](admin-more-tabs-review.png) and [mobile/dialog screenshots](admin-more-tabs-mobile.png) show the implementation with fixture data. Existing live values, workflow explanations and dynamic previews remain authoritative.

| Figma frame | View / state | Implementation |
|---|---|---|
| `2179:10722` | Reports & Export | ReportsPanel / ReportFiltersModal |
| `2185:965` | Document Efficiency, top | AnalyticsPanel / DocumentAnalytics |
| `2206:19344` | Document Efficiency, scrolled | Workload by Staff, filters and pagination |
| `2185:1066` | Support Analytics, top | SupportAnalytics period, metrics and durations |
| `2179:16175` | Support Analytics, scrolled | Categories, backlog, FAQ feedback, clerk workload and notes |
| `2179:10981` | Graduate Applications | GradApplicationReviewPanel |
| `2185:1369` | System Templates | AdminTemplatesPanel |
| `2185:1470` | User Manual / FAQ | AdminManual |

The staff table shows seven rows per page and filters the loaded analytics. Compute workload shares against all staff before filtering or paging; filtering must not change the denominator. Sort rows by handled volume. Released-document summaries derive from the loaded series. Keep null duration measurements distinct from recorded zeros and associate both the context and footer guidance with the table’s accessible description.

Template choices, original icons, font controls, variable chips and line-number gutter follow the source. The editor remains a native textarea, while the preview renders the actual draft with synthetic values in its isolated sandbox. Reset stages a draft and Save retains confirmation. Manual counts reflect the available guidance; the Yes/No selection is local page state only and does not submit or contribute to ticket-scoped FAQ analytics.

The Admin bell uses the original exported bell vector without the design’s decorative red circle. Render the dot only for actual unread notifications. After a successful read, update the IDs present when opening; retain unread notifications arriving while the request is pending. Failed reads retain unread state.

### Main Tabs frame inventory

All listed frames were inspected and Main Tabs was accepted by the user on 2026-10-14. [Synthetic browser screenshots](admin-main-tabs-review.png) show the rebuilt registration, security, support settings and document drawer layouts.

| Figma frame | View / state | Implementation |
|---|---|---|
| `93:663` | Dashboard | AdminDashboard |
| `2002:1306` | Document Tracker | AdminDashboard / RequestStaff |
| `2002:2945` | 7-Day Forecast modal | ForecastModal |
| `2224:1245` | Review Registration v2 | AccountVerificationModal / RegistrationProof / AdminRegistrationDetails |
| `2216:1245` | Original registration review | Superseded by v2; existing unavailable-proof review retained |
| `2002:2989` | View modal | ImageViewerModal |
| `2031:430` | Assign Processing Staff | RequestAssignmentModal |
| `2031:468` | Assignment with reconciliation expanded | RequestAssignmentModal details |
| `2094:935` | Maintenance Accounts | MaintenancePanel / AccountDirectory |
| `2105:1361` | Student information | UserDetailModal / AdminStudentInfo |
| `2118:433` | Add Staff Account | AddUserModal |
| `2127:491` | Edit User personal information | UserEditModal personal tab |
| `2127:524` | Edit User account settings | UserEditModal account tab |
| `2134:1455` | Maintenance document types | MaintenancePanel documentTypes tab |
| `2157:1575` | Edit document type drawer, top | MaintenancePanel / FeeScheduleEditor |
| `2157:2016` | Edit document type drawer, scrolled | Same drawer, scrolling body |
| `2161:588` | Colleges | MaintenancePanel colleges tab |
| `2161:1065` | Add College modal | MaintenancePanel college form |
| `2162:640` | Programs | ProgramsPanel / CatalogGuidelines |
| `2162:979` | Supporting Documents | SupportingDocumentsPanel / CatalogGuidelines |
| `2163:744` | Payment Methods | MaintenancePanel paymentMethods tab |
| `2163:1150` | Add Payment Method modal | MaintenancePanel payment form |
| `2002:2676` | Support, no ticket selected | MessagingWorkspace / SupportWorkspace |
| `2058:821` | Support, selected ticket | SupportConversation |
| `2086:381` | Linked request modal | SupportConversation / RequestAttachments / RequirementBubble |
| `2065:674` | Support Settings modal | SupportWorkspace / AdminSupportSettingsForm |
| `2062:614` | Staff Coordination, Admin monitoring | StaffCoordinationWorkspace |
| `2089:724` | Internal Assistance, unclaimed ticket | InternalAssistanceWorkspace |
| `2168:796` | Activity Logs, populated | AdminAuditLog |
| `2002:2806` | Earlier Activity Logs placeholder | Superseded by populated 2168:796 |
| `2168:1236` | Security Logs | AdminSecurityPanel / AdminAuditLog |
| `2210:1245` | Edit Profile, Personal Info | ProfileSettingsModal / EmailVerificationNotice |
| `2210:1313` | Edit Profile, Security top | ProfileSettingsModal / AuthenticatorSettings |
| `2211:20019` | Edit Profile, Security scrolled | Same profile, fixed summary and scrolling body |
| `2210:1555` | Preferences modal | PreferencesModal |

Main dialogs use the source-specific widths (registration 960 px, profile 640 px, viewer 800 px, assignment 667 px and support settings 720 px), with reachable mobile and enlarged-text layouts. Profile identity and tabs remain outside the scrolling body. Proof controls reuse authenticated files and do not change OCR evidence. A missing or aggregate OCR result stays “Not recorded.” Catalog edits, registration decisions, assignments and support settings retain staged confirmation and pending guards.


## Shared controls

| Element | Classes | Notes |
| --- | --- | --- |
| Text, number, date, password, select, textarea | `trace-control` | Includes dark, hover, focus, disabled and readonly styling. Textareas grow vertically. |
| Field on the green authentication background | `trace-control trace-control-inverse` | White text and focus indicator in both themes. |
| Invalid field | `trace-control` with `aria-invalid="true"` | Uses a red border/ring. Native `:user-invalid` also covers required/type validation after interaction. Keep the explanatory error and its existing validation logic. |
| Field label | `trace-label` | Add `trace-label-inverse` on green backgrounds. Retain `htmlFor`, required markers and accessible names. |
| Checkbox/radio | `trace-choice` | Retains native selection behavior and compact geometry. |
| File picker | `trace-file` | The native file button has its own theme/state styles. Camera-only photo pickers remain hidden. |
| Action | `Button` with `trace-button` plus a variant | `trace-button-primary`, `-secondary`, `-danger`, `-warning`, `-info`, `-inverse` or `-inverse-primary`. Secondary toggle actions reflect `aria-pressed`. |
| Icon action | `trace-icon-button` | Use an accessible label. Avatar/camera/floating support buttons retain their deliberate geometry. |
| Tab | `trace-tab` | Keep selection colors, tab semantics and keyboard behavior in the existing component. Queue tabs retain circular badges. |
| Link/row action with specialized geometry | `trace-action` | Shared transition and disabled treatment; does not turn a row or text link into a boxed button. |
| Page | `trace-page`, `trace-page-header`, `trace-page-title`, `trace-page-description` | Responsive wrapping and common section spacing. |
| Card/section | `trace-section` | Add `trace-section-body` for padding; use `trace-section-header` for a separate header. `trace-section-inverse` keeps white text readable on green/dark surfaces. Tables/charts retain their own scrollers. |
| Section heading | `trace-section-title` | Shared wrapping, size and theme colors for headings within cards and queue sections. Keep stage numbers and other role-specific text. |
| Informational metric | `trace-card-info` | Optional stationary shadow on fine-pointer hover. Never add a cursor, action or tab stop. Keep chart/data panels stationary. |
| Whole-card action | `trace-card-interactive` | Use a native button/link, shared 2 px lift and focus outline. Disabled/busy cards do not lift. Preserve grid gutters and responsive width. |
| Card containing controls | `trace-card-controls` | Stationary decoration; retain each control's own semantics and selected state. Use `data-card-disabled` for unavailable choices. |
| Card inside a clipped container | `trace-card-inset` | Stationary inset emphasis instead of outer elevation; keeps image/choice feedback and focus inside the clipping boundary. |
| Form fields | `trace-form-grid` | Columns depend on available reading width, not only viewport width. Spanning fields fill the row when it stacks. |
| Action group | `trace-actions` | Wraps on narrow screens. Stacked modal footers may retain `flex-col sm:flex-row`. |
| Date chip | `trace-date` | Wraps label, value and icon without splitting words at enlarged text sizes. |
| Error panel | `trace-error` | Retain existing alert/status semantics and error text. |
| Inline error | `trace-inline-error` | Compact theme-aware error text, without a separate panel. Keep existing `role="alert"` and retry actions. |

Example (import Button from @/components/Button):

```jsx
<label className="trace-label" htmlFor="reference">
  Reference number
</label>
<input id="reference" className="trace-control mt-2" disabled={saving} />
<div className="trace-actions mt-4">
  <Button type="button" className="trace-button trace-button-secondary" onClick={onCancel}>Cancel</Button>
  <Button type="submit" className="trace-button trace-button-primary" disabled={saving}>Save</Button>
</div>
```

Utilities can adjust layout, such as `flex-1`, `w-full`, `mt-2` or `pr-12` for a password visibility icon. Do not add a second base border, background, font-size or padding recipe to ordinary controls. New variants belong in the shared component layer.

Every boxed action needs both `trace-button` and its semantic variant, including retry, restore and deactivate controls in newer panels. The variant provides color; the base provides sizing, padding, wrapping and Button's visual feedback. Set `type="button"` on retry actions within forms so they do not submit the surrounding draft. Use `trace-form-grid` and `col-span-full` for common form layouts; avoid spanning two columns before the layout actually has two columns. Disabled ordinary inputs retain the shared border rather than becoming unmarked text. `trace-control` resets font weight so fields wrapped inside bold labels look the same as fields beside their labels.

Verification-mode switches belong directly beneath their associated input, outside submit and management action groups. Keep both directions in the same location, use a native `type="button"`, and preserve the existing input clearing, validation and pending-state guards. Login MFA and enrolled-authenticator Security settings follow this arrangement.

Saved registration evidence uses `RegistrationProof` in student Profile, Admin account details and Account Verification. Keep its object-contain thumbnail, visible magnifying-glass Preview cue, keyboard button and cohesive Download proof footer. PDF evidence uses a document tile leading to the same large viewer. `ImageViewerModal` uses ModalShell's scrollable body, pinned authenticated download footer, Escape and focus restoration. Normalize stored proof/viewer paths to a filename before `useAuthedFile` so identity evidence never takes the public-avatar URL bypass. Loading, access errors and absent files must not expose preview or download controls. Keep registration evidence read-only; staged avatar/upload pickers remain separate.

Security Logs uses five explicit column proportions and a 60 rem minimum table width so columns retain reading space as text grows. Give headers and cells consistent horizontal padding, top-align data, and use normal whitespace plus anywhere wrapping for long event names, account identifiers and IPv6 values. Preserve every value without ellipses or clipping. Its named, keyboard-focusable scroll region contains both overflow axes and keeps the opaque header sticky; never replace this with page-wide overflow or forced single-line cells.

Admin AI Insights uses the shared `trace-section trace-section-body` surface. Insight cards pair amber-50/amber-950 with amber-900/amber-200 text for warnings, and green-50/green-950 with green-900/green-200 text for information; borders follow the same semantic palette. Keep distinct icons and accessible type labels so meaning does not rely on color. Use root-class `dark:` variants rather than theme-dependent data state or refetching. The no-insights placeholder remains neutral; undefined palette shades and translucent inverse surfaces should not substitute for explicit theme pairs.

The three Admin KPI cards use the Figma label/value/icon/helper layout, with equal heights when side by side. Throughput remains the end-to-end duration with a separately labeled daily completion-count chart and date/count tooltip when measured series exist; do not draw a decorative fallback. Native values and helper text wrap without clipping. Other roles' compact MiniSparkline default remains available. A measured series or enlarged text can increase card height while keeping all values reachable.

Workload by Staff uses `getWorkloadShares` on the complete date-filtered `workload_by_clerk` array, before any display paging/slicing. The API supplies all staff with recorded activity, with no row limit. The denominator is the sum of per-staff documents handled, not the busiest count or globally unique requests. Shares rounded to one decimal feed the visible percentage, labelled meter value and shared ProgressFill; empty/zero-total data never divides by zero. Keep this a volume distribution, not a performance score. Use the table's internal scroller and rem minimum width so names/counts/percentages remain reachable at enlarged text sizes.

Document-type row actions use boxed Button variants: secondary Edit, primary Restore and danger Deactivate. Wrap them with `trace-actions` inside the existing table scroller. Fee-schedule draft additions use secondary buttons; draft removals use danger buttons with `type="button"` and the existing accessible names. Named-fee rows wrap their fields/actions instead of squeezing their inputs to accommodate larger controls. Keep fees, status pills and historical notices informational; preserve saved-record confirmation and retirement/limit/pending guards. Shared Button supplies hover, pressed, focus, disabled and reduced-motion feedback.

Reports and Finance transaction headers use `components/ExportDropdown.jsx` beside the title, replacing separate export cards or selector/submit pairs. Keep the trigger compact and let header actions wrap; the option panel clamps its width to the viewport and scrolls internally at enlarged text sizes. This is a labelled disclosure of native action buttons, with Tab/arrow navigation, Escape/focus return and outside-pointer/focus dismissal. Selecting an option starts the existing handler immediately; the caller retains pending/error/download state and disables the trigger while exporting. Reports offers filtered documents and the existing category-wide student CSVs; Finance offers its filtered transaction CSV only. Preserve their distinct filter semantics and server authorization. Summary columns follow available reading width; Finance date-filter labels must not exceed their container.

ReportsPanel is shared by Admin, Window 1 and Secretary. Its labelled regions stay in document order: Filters, Report summary, Records, with the sole Export control in the page header. KPIs and rows come from the same scoped response; useReports ignores superseded loads and withholds a response whose filters/page/page size differ from the current scope. During refresh keep filter controls and all five KPI positions mounted, show unavailable values and a loading Records row, and do not export documents until that scope has loaded successfully. Distinguish a failed report from an empty result and retain Apply Filters as retry. Category-wide student exports retain their independent scope.

Document-stage badges use `getStatusLabel` and `getStatusTone` from `utils/documentStatus.js`. Ready for Pick-up and Completed use pine-green text on green surfaces; all pending desk queues, Payment Required and Paid–Preparing for Release use amber; Secretary Processing, OR Verified and legacy Approved use blue. Rejected retains red; unknown statuses use neutral gray. Each tone has an explicit readable dark variant. Keep labels visible, permit wrapping, and do not override known statuses with page-local colors. Use rem-based minimum table/column widths so enlarged text retains reading space inside existing table scrollers; override inherited nowrap on status badges. The synchronized frontend/backend `getStatusCategory` is presentation metadata only: it must never replace workflow transitions or authorization. Payment, account-verification and receipt states retain their separate meanings.

Sidebar groups come from `navGroupsForUser` in `utils/navigation.js`, partitioning the existing authorized destinations. Existing daily-work destinations take priority, then secondary destinations fill Main to six; only overflow belongs in More. With six or fewer destinations all links are direct and there is no More button. When overflow exists, More is the seventh navigation control. Preferences and Logout sit outside that count. `SidebarNav` renders Main or More with shared `trace-nav-item` controls, Preferences and Logout in both, native keyboard activation and focus transfer after a group switch. Direct routes reveal their group; onboarding may reveal a group without navigating. `trace-nav-scroll` hides scrollbar chrome only. Keep `overflow-y-auto`, nonshrinking items and keyboard focus access on the rail/drawer so short screens retain every destination.

Normal dialogs use `ModalShell`, which applies `trace-modal-panel`, `trace-modal-body` and `trace-modal-footer`. Keep actions in its pinned footer. Profile retains its scrolling header/body arrangement with common panel/footer appearance. Lightboxes, split-column account review, printable slips and isolated HTML template previews may keep their existing overrides.

ModalShell also owns `trace-modal-header` and `trace-modal-title`: their responsive gutters align with the body/footer and reserve room for the close button. Common modal consumers should not repeat these recipes.

Student Edit Profile shows required-field hints only beside the active tab's fields, derived from the current draft using the existing completion helper. Associate each hint with its labelled control using aria-describedby. Incomplete Personal Info/Educational Background controls keep an exclamation marker and accessible “Required information missing” text, even when another tab is open; remove both when that tab's draft fields are complete. Do not restore a global cross-tab warning paragraph or change save validation/request eligibility from presentation state. Requests still require the authoritative saved profile.

Profile field labels, education section headings and related proof captions use explicit Title Case wording. Use trace-label for form labels and education headings; do not apply uppercase/capitalize transformations, including on the Profile Completion caption. Preserve abbreviations such as ID, required markers, input associations and warning descriptions. Read-only profile fields follow the same wording convention; names, stored values and role/ID metadata keep their existing presentation.

Preferences content lives in `components/PreferencesModal.jsx`, reached through the existing ProfileSettingsModal appearance branch for every role. Keep Appearance and Text size as separately labelled sections with full-width controls, short percentage options and descriptions outside the select. The compact responsive title preserves room for Close at 320 px with 200% text. Preferences are applied immediately through Layout's existing callbacks; unavailable callbacks disable their controls. Use the shared modal body for scrolling and retain the shell's Escape/focus containment/restoration. The standard panel height subtracts the overlay's fixed 16 px gutters (32 px total), independently of root font size.

When changing these conventions, run frontend tests, lint and build, then check actual pages and dialogs at 320, 375, 768 and desktop widths in light/dark themes at 100% and 200% text. Check line spacing, wrapping labels/actions, hover, visible keyboard focus, readonly/error/disabled states, contained table scrolling and reachable footer actions. Browser emulation does not replace acceptance testing on a physical phone. No database migration is required for this presentation change.

Signed-in branding uses `components/TraceBrand.jsx` and `utils/branding.js`. The supplied Canva exports are copied unchanged to `public/trace-logo-light.png` (logo1) and `public/trace-logo-dark.png` (logo2). Use the component rather than another logo import or recreated mark. Its SVG viewport removes only transparent canvas margins from the presentation, preserving the full artwork and its proportions. Vite generates browser/PWA icons from the same PNG bytes and shared viewport. The browser icon follows the selected theme; the installed app icon uses the light variant. If the approved artwork changes, update both PNGs and their dimensions/viewport together, then rebuild.

Public account pages use `components/PlpBrand.jsx` with the unchanged supplied `assets/plp-login-logo.png` (from `trace logo/PLP Logo (2).png`). AuthShell supplies it for Login/welcome, OTP/recovery-code login, Forgot Password, Reset Password, Verify Email and Staff Authenticator Setup. Signup's separate layout uses the same component for both student and alumni registration. Keep its square dimensions, object-contain rendering and full institutional alternative text; no page-local logo overrides. The browser/PWA icon remains TRACE.

Shared interaction mappings and tokens are documented in [UI_MOTION.md](UI_MOTION.md). Layout owns route context; SidebarNav owns group context; ModalShell owns drill entry/return for all consumers. Do not add a second page/modal entrance class. Keep native disclosure layout and scroll immediate, use transform-only ProgressFill for progress, and keep alerts/focus/busy state independent of animation completion.

Sidebar hover-label finding (2026-10-04, before implementation): SidebarNav has permanent aria-label names but desktop names otherwise rely on title; local hover recipes are gray/red and have no icon lift or tooltip lifecycle. Layout's desktop rail deliberately scrolls and clips overflow, so labels need a body portal. The current md breakpoint also hides the labeled menu trigger on wide touch screens. Use one delegated tooltip per icon rail, fine-pointer hover and keyboard focus, Escape dismissal, a contiguous pointer bridge to the label, viewport-clamped placement and scroll/resize dismissal. Keep Main/More metadata and selected green treatment; add a 2 px icon-only feedback-token lift and a noninteractive diffuse green pseudo-layer. Keep labeled drawer controls static and expose that drawer for coarse/nonhover pointers at every width. Reduced motion keeps highlight/labels but removes the lift.

Button actions use components/Button.jsx with the existing semantic variant classes. It forwards native attributes, events and refs (including submit/form association); it neither schedules nor intercepts actions. Boxed button/icon classes get a fixed-target visual-content lift and decorative elevation; trace-button-lift opts existing custom geometry into the same treatment. Inline links and card selectors keep stationary feedback. Shared QueueTabs pills use visual-only lift and shadow on a fixed native target. Use motion="feedback" to suppress a boxed lift where needed. Navigation retains its separate SVG-only feedback. Don't transform the native button, alter padding on hover, add individual durations or color every action green. Use amber for unpaid-balance actions and retain destructive red. Green authentication panels use trace-action-inverse-surface so focus outlines remain white. Disabled/busy presentation clears immediately. See UI_MOTION.md for the pointer/reduced-motion mappings.

Secretary records use the shared ReportsPanel rather than a second completed-log table. Keep the Main navigation label **Records & Export**, the old completed-logs tab as a Secretary-cleared alias, and its navigation highlight on the canonical reports destination. Record-view toggles are a named native-button group with aria-pressed, wrapping at enlarged text sizes; choosing a status clears the multi-status preset. Retain all eight report columns, student-profile action and document request labels, and use actual shared status badges rather than a constant Approved badge. Filters, summaries, records and document CSVs share one server-enforced assigned-college scope; student-category exports also stay within that college. No assignment means no records or export access. The API must derive the scope from the stored account, never client-supplied college parameters.

Student's Action Required — Payment card follows the updated source frame `2495:2103`: amber alert band/stepper, saved itemized summary and sage amount-due panel with primary Pay and secondary slip-preview actions. The warning band remains amber; Pay follows the source green. Render one card per existing billable request group, preserve all saved calculations/legacy fallback descriptions, and keep non-pending records ineligible. Wrap live text and groups on small/enlarged screens; no mock prices or new payment transitions.

Each student payment request group reads Request ID → itemized charges/saved calculations → total amount due → Pay. Keep this as real DOM order, never CSS order reversal or positive tabIndex. The grouped amber Pay button sits in a wrapping right-aligned footer and may fill the available width on phones. Preserve the existing representative document and group total when opening checkout.

Within that charge list, each document is a bounded, noninteractive trace-section/trace-section-body item. Keep its name and amount nearby in a wrapping desktop header, stack those fields on narrow screens, and align FeeBreakdown beneath them. Use the same spacing for saved calculations and historical recorded-charge explanations. Do not stretch the name and amount apart with full-card justify-between or add card actions/hover cues to these informational items.

Payment-card line amounts use gray-900/gray-100 with font-semibold rather than gray-500/gray-400. FeeBreakdown's historical explanation uses the same gray-700/gray-200 secondary palette as saved calculations; its recorded amount is a distinct gray-900/gray-100 semibold span. Preserve wording/currency and all saved values. Measure computed foreground colors against the actual containing surface in both themes; transparent backgrounds are not black. Compare unrounded ratios with the [WCAG AA normal-text minimum of 4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), including small secondary descriptions. Do not infer a failure from a screenshot or claim whole-site compliance from these text pairs.

## Revision 2 Batch 7 form and confirmation references

Use New Request (`85:1514`), detailed Request Confirmation (`177:691`) and compact confirmation (`183:741`) from the main TRACE Figma file. `ConfirmDialog` supports `presentation="review"` for a left-aligned title and dynamic summary/attachments; simple decisions use its centered compact presentation. Both keep the 535 px maximum panel, 14 px corners, 20 px inset and centered 285 px Cancel/Confirm group, adapted to stack at narrow widths and expand for text. Cancel remains the initial focus; Escape/backdrop dismiss only when idle. The Figma compact frame has no close icon, so Cancel is the explicit dismissal control.

The request reference shows a single-document select and estimated amount. TRACE retains its approved multi-document checkboxes and rates-only pricing workflow. Saved Year Started replaces editable start/end inputs; documents that need graduation reuse the saved year. Identity, summary and file content come from the current draft, including local image/PDF previews rather than Figma placeholder images. Maintain readable pine buttons/dark colors, 44 px targets, form validation and reduced motion. No inspiration-study glass/clay components are introduced.

## Queue tabs and filters — Revision 2 Batch 8

Use `QueueTabs` with a matching `QueuePanel` and a stable `idPrefix` for actual tab/tabpanel navigation. Use `semantics="filters"` for a button group that filters the same region. Preserve role-specific statuses, counts and action handlers. Put controls and the queue inside a `space-y-4` section for the shared 16 px gap; allow labels/counts to wrap. QueuePanel uses shared context motion keyed by the selected tab so reused DOM still animates; do not combine it with a competing CSS entrance transform or remount forms merely to animate them. Reduced motion removes the transition. Use shared pill classes rather than local capsule recipes.

## Revision 2 Batch 11 — support analytics

SupportAnalytics applies the Admin Figma dashboard (93:663) card hierarchy to recorded support metrics: rounded shared surfaces, prominent tabular values and soft sage/pine context strips. Use stationary `trace-card-info`, not whole-card controls. `trace-analytics-*` styles provide readable missing-value text, period context, tally panels and borderless semantic tables. All statistical columns remain in keyboard-focusable, contained scrollers with opaque sticky headers. Keep report formulas, denominators, imported distinctions and historical cutoff context; do not copy Figma mock graphs or baseline percentage changes. No additional entrance/hover animation or decorative asset is introduced.


### Internal assistance workspace

InternalAssistanceWorkspace reuses the main support frame (260:3301) proportions, shared ticket/avatar/icon components, pine-green outgoing bubbles, gray context panel and rounded composer. Ticket rows use the shared selected contrast and fixed-target lift; controls use Button and shared ModalShell/ConfirmDialog. Required concern category, creator/assigned Admin context and resolution notes adapt the live workflow rather than copying student mock records. The mobile drawer preserves the conversation and shared focus handling. Ordinary recipient/presence/unread connections remain deferred.

## Staff coordination and messaging categories

The additional staff workspace follows the main Figma messaging frame (260:3301) using existing Support visuals, intrinsic-size local icons, dynamic participant initials, readable aligned ticket-style rows, independently scrolling history and the rounded pinned composer. Shared QueueTabs group support, staff coordination and internal assistance; visited workspaces retain drafts. ModalShell and ConfirmDialog own recipient selection and first-message confirmation; subsequent Send is direct with pending guards. Active-category gating prevents hidden dialogs/toasts taking over another category. Mobile uses the shared conversation drawer; dark/reduced-motion/200% text adaptations preserve controls. No placeholder presence/read/unread marks are shown.

## Signup back navigation — October 15, 2026

Back to Login sits at the viewport’s upper-left edge rather than aligning with the centered form card. Both the header and link have transparent backgrounds with no bar border. Below 768 px the header stays in normal document flow and scrolls away; at 768 px and above it remains sticky. Retain the safe-area top inset, a minimum 44 px hit target and light/dark colors. The transparent container passes pointer events through to the form; the link remains clickable. Do not constrain this header to the card’s maximum width.

Validation: 17 existing registration/branding tests, lint, production/PWA build and whitespace checks pass. 65 browser checks cover student/alumni signup at top/bottom, 320/375/768/1440 px, 100/200% text and both themes, including transparent header/link backgrounds, mobile scroll-away behavior, desktop sticky positioning and Back to Login navigation. Screenshots use synthetic catalog data: [desktop](signup-header-desktop-review.png), [mobile](signup-header-mobile-review.png). No backend, database or validation changes.


## October 16 shared review corrections

Preferences uses the Admin design for all roles and portals, including Light/Dark selection, preview, auto-save guidance and Done. Phone dialogs center within the viewport with internal body scrolling. FileUploadField owns a keyboard-accessible trigger and controlled filename; replacing/cancelling preserves draft validation. Compound input wrappers own focus. Use EmailText and shared Manila date/event/peso formatting for account, audit, message and notification surfaces; user-authored conversation text is unchanged. Exported icons keep intrinsic dimensions and derive theme treatment from source paint metadata, preserving semantic hues and inverse glyphs.

Local record tables use PaginatedTable/Pagination where paging was absent, including Student overview/history, Admin verification/accounts/catalogs, Secretary queues, Graduate review, profile security and support statistical lists. Existing paged tables and full-data exports remain unchanged. Only FAQ answers scroll within the manual; all roles reuse its role-aware layout. Dashboard trailing padding and fixed minimum/queue heights are removed so the final surface ends naturally.

Student dashboard/history no longer mounts FloatingSupportChat. Tour guidance uses the Support navigation item. No Support workspace contains analytics actions or dialogs; only Admin Efficiency Analytics hosts SupportAnalytics and the API checks the current Admin role.

Validation: 1,144 frontend tests / 117 suites and 1,737 backend tests / 130 suites pass, followed by 125 backend checks for maintenance/email and metrics. The 496 passing browser checks cover 320/375/768/1440 px, both themes and 100/200% text; they include shared Preferences font/geometry equality across five role views, centered dialogs, FAQ-only scrolling, missing pagination, grouped pay/slip actions, file feedback, whole-field focus, all nine original payment asset dimensions, and dark navigation visibility. Lint, production/PWA build and whitespace checks pass. [Synthetic visual review](trace-notes-review.png). These are local checks; no live migration, deployment, real payment or real message was performed.


## College Secretary and Finance review — 2026-10-16

See [the per-frame audit](FIGMA_UI_REVIEW.md) for all 30 College Secretary and 25 Finance references, the current 135-frame inventory across accounts, required live-system differences and the explicitly unfinished Student checkout frame. Secretary/Finance shells use their source 75 px desktop header and the existing compact phone header. Their source layouts reuse the original intrinsic-size exports recorded in [asset provenance](figma-desk-assets.json).

Secretary evaluation keeps editable fields and a separate discussion panel, with a phone toggle that retains both drafts. Pricing uses the actual printed-page stepper and read-only saved-rate calculation, with existing group billing and current-rate acknowledgment. Receipt confirmation requires a recorded number and an explicit inspection acknowledgment for either physical or uploaded copies; changing the receipt number/copy resets the acknowledgment. Confirm Handoff retains Cancel-first focus and pending guards.

Finance verification uses independent summary/proof and issuance/copy/notes columns, stacked in narrow containers. The paper-pack serial is read-only; pack configuration, verification, issuance, upload, printing and voiding retain their original confirmations, cutoff rules and audit semantics. History keeps caller-owned draft/apply/reset filters, with From/To under Cleared date range. Published copies use authenticated blob previews/downloads and bounded image zoom. Shared supporting-document presentation applies to Secretary and Finance without granting Finance registrar attachment actions. The reports presentation flag never changes report scope or export authorization.

The October 17 review implements the newer Student Payment modal `2506:1867` and retrieves its original assets plus the Secretary Graduate Applications active white navigation icon. The earlier two asset gaps are resolved; see FIGMA_UI_REVIEW.md for the current 149-frame inventory, local verification and approved adaptations.


## Support and request-card refinements — 2026-10-16

The user-approved Support heading comes before the category tabs in DOM and visual order on every staff account. MessagingWorkspace owns the active page title; embedded workspaces retain their actions but suppress their duplicate title. Keep visited workspaces mounted so category changes preserve drafts. Do not reintroduce CSS order/display-contents tricks that place tabs before the heading. Standalone and compact Support keep their existing headings.

New Request choices use equal-width grid columns and equal-height rows, growing for complete titles and descriptions rather than clipping text. Selected documents’ keyed detail forms sit below the choice grid, so different requirements do not resize individual cards. Search preserves selected choices and the mounted details/file drafts. Rate calculations, availability, dismissal limits, saved years, validation and confirmations stay authoritative.

Activity action labels use utils/activityPresentation.js. Expand known domain abbreviations, preserve the saved code as metadata, and search the displayed label as well as the original record. This presentation does not rename database events or change security-event formatting.

## October 17 source and shared conventions

The current source inventory is 149 frames; see FIGMA_UI_REVIEW.md for every frame and approved adaptations. Login, three-step signup, three-step New Request and checkout use the current source. Preserve original export bytes and intrinsic icon dimensions; reuse exact existing assets instead of duplicates. Real QR/instructions/amounts replace reference payment examples.

Headers use a 75 px minimum and natural height. Non-dashboard pages have one heading and short purpose. Queue tabs have 10 px top corners, square bottoms and no active hover lift. Confirmation actions share one horizontal row at phone widths; allow their labels to wrap. New Request choices retain equal size and selected-document fields live in step two. Keep one modal instance across its three steps and preserve file objects/drafts on Back/Edit. The latest user direction removes the signup link above the logo; retain the existing-account link at the bottom. Password visibility retains the approved small subtle hover circle and a usable target.

All roles use the shared Support guidance below history in the composer’s Conversation guidance disclosure. Do not restore a Ticket Actions disclosure. Keep authorized action controls and Admin/read-only/Finance guidance. Completed operations close their owning dialog; required subsequent receipt printing, authenticator enrollment/recovery and actionable error states remain until complete.

Compact confirmation titles span the full header width and are centered. Logout asks “Are you sure you want to log out?” consistently, including graduate-gated and forced-password entry points. Keep the neutral Stay Signed In action initially focused and retain confirmed server logout.

## October 17 screenshot follow-up

This supersedes the earlier sticky/top-left signup link and rounded auth-canvas directions. Auth pages fill the outer right edge with square corners. Signup retains only the bottom existing-account login link. Use one focus highlight on login controls; autofill stays green with readable white text/caret and a visible visibility control. Do not disable autocomplete or modify password-manager behavior.

New Request: Cancel on Select Documents closes the wizard. On Fill up details and Review, show one secondary Back button returning one step and preserving values/files. There is no additional text Back/Edit details action. The close icon remains the explicit dismissal on later steps.

Support screenshot override: every selected conversation has one fixed, non-scrolling white header, a rounded-square avatar, title, state chip and ticket/tracking metadata. Open linked case is the original circle-i asset with its accessible name and hover title. Authorized Resolve, request-reply, Awaiting student and Reopen controls are icon buttons beside it, retaining confirmations and permissions. Guidance is below messages; never restore the Ticket Actions menu or place the long note above identity. Long title/metadata previews cap at two lines and retain the full title/authorized linked details. Support Settings is hosted beside the outer page heading, above categories and How live support works; the child retains its permission check and modal state.

Window Tracking has All, In progress, Completed and Other statuses. These partition the same loaded records; Other statuses never implies a current pipeline action. State the loaded count and authorized total when the list is capped. Analytics cards/charts display saved aggregates; advice and forecasts identify their source and unavailable/insufficient-data states. Do not manufacture volumes, apply fixed document-type percentages or turn zero into one.
