# TRACE UI review — October 17, 2026

The current [TRACE Figma file](https://www.figma.com/design/eQNaLBPXQSojI6lOK60Api) contains 149 frames: Admin Main 35, Admin More 8, Student 21, Alumni 1, Window 1 18, College Secretary 30, Finance 25 and Login/Signup 11. All 149 source screenshots were retrieved and visually inspected. Design context was read for every root; large analytics, applications, templates and manual roots were inspected through their content children. The complete inventory below records source coverage, not a claim of exact pixel equality or production deployment.

## Changes from the October 16 review

- Login uses the current source column ratio, original TRACE/PLP image paints, colors, typography, spacing and control sizes. Signup follows its three-step academic, personal and verification screens, with one retained draft and controlled proof selection. Inline field validation, the approved transparent Back to Login placement and normal mobile scrolling remain.
- New Request uses one modal through selection, details and review. Equal document choices, search, selected files and typed values survive Back/Edit. Current students use saved Year Started and their current Year Level/Section. Alumni may save 1999 when their study interval is valid.
- Student checkout now implements `2506:1867` with original source SVGs, saved grouped charges, configured methods, real payment instructions and the existing GCash QR. Returning from the slip keeps the checkout draft. Reference example QR/account data is not shipped.
- The Secretary Graduate Applications active icon now uses the original white `8dfb2.svg`. Both outstanding asset gaps recorded on October 16 are resolved.
- Shared headers have a 75 px minimum and can grow for larger text. Tabs have 10 px top corners and square bottom corners; active tabs do not lift on hover. Non-dashboard views show a heading and short purpose. Confirmation buttons stay side by side on narrow screens, with wrapping labels.
- Every account's Support conversation replaces the Ticket Actions disclosure with visible guidance above history. Authorized Resolve/Reopen/Reply controls remain functional. Admin monitoring, Finance guidance and saved-history states retain their role-specific rules.
- Credentials and cached identity are tab-local. Successful writes publish resource-name invalidations, and active views refetch with their own credentials. Drafts remain local. Obsolete session responses cannot replace the active identity.
- Admin can assign a pending intake to a Secretary in the request's verified college. The Secretary sees only explicitly delegated intake; server locks, ownership, college checks and audit writes remain. Admin name editing saves first/middle/last parts atomically and retains the saved suffix.

## Source assets and approved adaptations

`figma-oct17-assets.json` records the unmodified new exports, source nodes, intrinsic dimensions and SHA-256 values. The existing `figma-desk-assets.json` remains the provenance for prior Secretary/Finance exports. Identical existing assets are reused. Applicant photos, proofs, receipt copies, prices, assignments, queue counts and report values come from authorized records. No reference mock payment, fake receipt or illustrative performance trend replaces live data.

Desktop frames are the visual reference. Responsive layouts, dark mode, 200% text, keyboard focus, loading/error/empty states and security confirmations are supported adaptations. User-approved changes take precedence over older frames: Student chat lives in Support, analytics is Admin-only, filters follow Student History, document cards are uniform, Support headings precede category tabs, and conversation guidance is visible. The old dashboard-chat frame is recorded below but its floating launcher is intentionally removed.

No separate source frame exists for delegated Secretary intake, the full split-name edit state or new refresh/session failure states; these reuse the relevant shared forms and styling. Finance can retain a receipt screen after verification when printing/issuing the receipt is still the next required step. Recovery-code and enrollment screens similarly remain until their workflow is complete.

## Per-frame source inventory

The module column identifies the implementation area. Multiple source states may be handled by one component; mocked source values are replaced by saved records.

### Admin · "More" tabs

| Frame | Source design | Implementation area |
|---|---|---|
| `2179:10722` | TRACE Reports and Export | Admin reports / analytics / applications / templates / manual |
| `2185:965` | Effe Analytics — Document Efficiency | Admin reports / analytics / applications / templates / manual |
| `2206:19344` | Effe Analytics — Document Efficiency | Admin reports / analytics / applications / templates / manual |
| `2185:1066` | Efficiency Analytics — Support Analytics | Admin reports / analytics / applications / templates / manual |
| `2179:16175` | Efficiency Analytics — Support Analytics | Admin reports / analytics / applications / templates / manual |
| `2179:10981` | TRACE Graduate Applications | Admin reports / analytics / applications / templates / manual |
| `2185:1369` | System Templates | Admin reports / analytics / applications / templates / manual |
| `2185:1470` | User Manual & FAQ | Admin reports / analytics / applications / templates / manual |

### Admin - Main Tabs

| Frame | Source design | Implementation area |
|---|---|---|
| `2127:524` | TRACE Edit User — Account Settings | AdminDashboard and shared review / maintenance / profile dialogs |
| `2127:491` | TRACE Edit User — Personal Information | AdminDashboard and shared review / maintenance / profile dialogs |
| `2118:433` | TRACE Add Staff Account | AdminDashboard and shared review / maintenance / profile dialogs |
| `2105:1361` | TRACE Student information | AdminDashboard and shared review / maintenance / profile dialogs |
| `2094:935` | TRACE System Maintenance — Accounts | AdminDashboard and shared review / maintenance / profile dialogs |
| `2134:1455` | TRACE System Maintenance — Accounts | AdminDashboard and shared review / maintenance / profile dialogs |
| `2157:2016` | Edit drawer | AdminDashboard and shared review / maintenance / profile dialogs |
| `2157:1575` | Edit drawer | AdminDashboard and shared review / maintenance / profile dialogs |
| `2089:724` | TRACE Internal Assistance — Unclaimed ticket | AdminDashboard and shared review / maintenance / profile dialogs |
| `2086:381` | Linked request modal | AdminDashboard and shared review / maintenance / profile dialogs |
| `2065:674` | TRACE Support Settings | AdminDashboard and shared review / maintenance / profile dialogs |
| `2062:614` | TRACE Staff Coordination — Admin monitoring | AdminDashboard and shared review / maintenance / profile dialogs |
| `2058:821` | TRACE Support — Selected ticket | AdminDashboard and shared review / maintenance / profile dialogs |
| `2031:468` | Assign Processing Staff — reconcile college | AdminDashboard and shared review / maintenance / profile dialogs |
| `2031:430` | Assign Processing Staff — initial | AdminDashboard and shared review / maintenance / profile dialogs |
| `93:663` | Admin Registrar - Dashboard | AdminDashboard and shared review / maintenance / profile dialogs |
| `2002:1306` | Admin Registrar - Document Tracker | AdminDashboard and shared review / maintenance / profile dialogs |
| `2002:2676` | Admin Registrar - Support | AdminDashboard and shared review / maintenance / profile dialogs |
| `2002:2806` | Admin Registrar - Activity Logs | AdminDashboard and shared review / maintenance / profile dialogs |
| `2002:2945` | 7D FORECAST MODAL | AdminDashboard and shared review / maintenance / profile dialogs |
| `2002:2989` | View Modal | AdminDashboard and shared review / maintenance / profile dialogs |
| `2161:588` | TRACE System Maintenance — Colleges | AdminDashboard and shared review / maintenance / profile dialogs |
| `2161:1065` | TRACE Add College | AdminDashboard and shared review / maintenance / profile dialogs |
| `2162:640` | TRACE System Maintenance — Programs | AdminDashboard and shared review / maintenance / profile dialogs |
| `2162:979` | TRACE System Maintenance — Supporting Documents | AdminDashboard and shared review / maintenance / profile dialogs |
| `2163:744` | TRACE System Maintenance — Payment Methods | AdminDashboard and shared review / maintenance / profile dialogs |
| `2163:1150` | TRACE Add Payment Method | AdminDashboard and shared review / maintenance / profile dialogs |
| `2168:796` | TRACE Activity Logs | AdminDashboard and shared review / maintenance / profile dialogs |
| `2168:1236` | TRACE Security Logs | AdminDashboard and shared review / maintenance / profile dialogs |
| `2210:1245` | TRACE Edit Profile — Personal Info | AdminDashboard and shared review / maintenance / profile dialogs |
| `2210:1313` | TRACE Edit Profile — Security | AdminDashboard and shared review / maintenance / profile dialogs |
| `2211:20019` | TRACE Edit Profile — Security | AdminDashboard and shared review / maintenance / profile dialogs |
| `2210:1555` | TRACE Preferences | AdminDashboard and shared review / maintenance / profile dialogs |
| `2216:1245` | TRACE Review Registration | AdminDashboard and shared review / maintenance / profile dialogs |
| `2224:1245` | TRACE Review Registration v2 | AdminDashboard and shared review / maintenance / profile dialogs |

### Alumni

| Frame | Source design | Implementation area |
|---|---|---|
| `2697:2668` | Alumni - Graduate Application | GraduateApplication |

### Student

| Frame | Source design | Implementation area |
|---|---|---|
| `2283:1296` | Student - Dashboard | StudentDashboard, ProfileSettingsModal and shared Support |
| `2500:1876` | Student - Dashboard | StudentDashboard, ProfileSettingsModal and shared Support |
| `2313:1577` | Student - Dashboard Chat open | StudentDashboard, ProfileSettingsModal and shared Support; chat launcher removed by user request |
| `2317:1307` | Support tickets modal | StudentDashboard, ProfileSettingsModal and shared Support |
| `2317:1359` | New support ticket modal | StudentDashboard, ProfileSettingsModal and shared Support |
| `2324:1277` | Student - History | StudentDashboard, ProfileSettingsModal and shared Support |
| `2326:1293` | Student - History - Payments | StudentDashboard, ProfileSettingsModal and shared Support |
| `2328:1309` | Student - Support | StudentDashboard, ProfileSettingsModal and shared Support |
| `2354:3364` | Student - User Manual & FAQ | StudentDashboard, ProfileSettingsModal and shared Support |
| `2386:2002` | TRACE Edit Profile — Security | StudentDashboard, ProfileSettingsModal and shared Support |
| `2385:2609` | TRACE Edit Profile — Security | StudentDashboard, ProfileSettingsModal and shared Support |
| `2386:1553` | TRACE Edit Profile — Personal Info | StudentDashboard, ProfileSettingsModal and shared Support |
| `2385:2345` | TRACE Edit Profile — Personal Info | StudentDashboard, ProfileSettingsModal and shared Support |
| `2386:1819` | TRACE Edit Profile — Educational Background | StudentDashboard, ProfileSettingsModal and shared Support |
| `2385:2157` | TRACE Edit Profile — Educational Background | StudentDashboard, ProfileSettingsModal and shared Support |
| `2394:1583` | Live Track modal | StudentDashboard, ProfileSettingsModal and shared Support |
| `2506:1867` | Payment modal | StudentDashboard, ProfileSettingsModal and shared Support |
| `2686:2667` | New Request — Step 1 · Select documents | StudentDashboard, ProfileSettingsModal and shared Support |
| `2692:2934` | New Request — Step 1 · Select documents | StudentDashboard, ProfileSettingsModal and shared Support |
| `2686:2841` | New Request — Step 2 · Fill up details | StudentDashboard, ProfileSettingsModal and shared Support |
| `2686:3025` | New Request — Step 3 · Review | StudentDashboard, ProfileSettingsModal and shared Support |

### Window Clerk

| Frame | Source design | Implementation area |
|---|---|---|
| `2362:1474` | Window Clerk - Dashboard | Window1Dashboard and shared Support / profile / manual |
| `2413:6138` | Window Clerk - Dashboard | Window1Dashboard and shared Support / profile / manual |
| `2369:4603` | Window Clerk - Tracking Desk | Window1Dashboard and shared Support / profile / manual |
| `2369:5200` | Window Clerk - Support | Window1Dashboard and shared Support / profile / manual |
| `2385:3008` | Window Clerk - Support | Window1Dashboard and shared Support / profile / manual |
| `2385:3372` | Window Clerk - Support | Window1Dashboard and shared Support / profile / manual |
| `2369:5375` | Window Clerk - Tracking Desk | Window1Dashboard and shared Support / profile / manual |
| `2385:3237` | TRACE Support Settings | Window1Dashboard and shared Support / profile / manual |
| `2402:1585` | Window Clerk - New Support Ticket | Window1Dashboard and shared Support / profile / manual |
| `2402:1629` | Window Clerk - New Staff Conversation | Window1Dashboard and shared Support / profile / manual |
| `2402:1701` | Window Clerk - New Internal Concern | Window1Dashboard and shared Support / profile / manual |
| `2403:4606` | Window Clerk - User Manual / FAQ | Window1Dashboard and shared Support / profile / manual |
| `2406:1753` | Window Clerk - Manual Input | Window1Dashboard and shared Support / profile / manual |
| `2408:5740` | TRACE Edit Profile — Personal Info | Window1Dashboard and shared Support / profile / manual |
| `2408:5808` | TRACE Edit Profile — Security | Window1Dashboard and shared Support / profile / manual |
| `2408:5960` | TRACE Edit Profile — Security | Window1Dashboard and shared Support / profile / manual |
| `2409:1753` | Window Clerk - Intake Check | Window1Dashboard and shared Support / profile / manual |
| `2417:6657` | Window Clerk -  Modal | Window1Dashboard and shared Support / profile / manual |

### College Secretary

| Frame | Source design | Implementation area |
|---|---|---|
| `2456:1798` | College - Dashboard | SecretaryDashboard and shared scoped review / Support / profile |
| `2519:5166` | College - Dashboard | SecretaryDashboard and shared scoped review / Support / profile |
| `2458:1813` | Digital Request Evaluation modal | SecretaryDashboard and shared scoped review / Support / profile |
| `2463:1813` | Support tickets modal (college) | SecretaryDashboard and shared scoped review / Support / profile |
| `2463:1909` | New support ticket modal (college) | SecretaryDashboard and shared scoped review / Support / profile |
| `2463:1964` | Request supporting document modal | SecretaryDashboard and shared scoped review / Support / profile |
| `2463:2022` | Linked request modal | SecretaryDashboard and shared scoped review / Support / profile |
| `2468:1813` | Request supporting document modal — ready to send | SecretaryDashboard and shared scoped review / Support / profile |
| `2484:1830` | College - Processing & Pricing | SecretaryDashboard and shared scoped review / Support / profile |
| `2560:8838` | College - Support (Request document) | SecretaryDashboard and shared scoped review / Support / profile |
| `2514:3171` | College - Graduate Applications | SecretaryDashboard and shared scoped review / Support / profile |
| `2512:2702` | College - Support | SecretaryDashboard and shared scoped review / Support / profile |
| `2512:3035` | College - Support | SecretaryDashboard and shared scoped review / Support / profile |
| `2485:1829` | Set the Amount modal (college) | SecretaryDashboard and shared scoped review / Support / profile |
| `2515:1921` | College - OR Verification | SecretaryDashboard and shared scoped review / Support / profile |
| `2533:2404` | Verify Official Receipt modal (college) | SecretaryDashboard and shared scoped review / Support / profile |
| `2533:2489` | Verify Official Receipt modal (college) — ready to confirm | SecretaryDashboard and shared scoped review / Support / profile |
| `2540:2404` | College - Final Handoff | SecretaryDashboard and shared scoped review / Support / profile |
| `2543:2429` | Confirm Handoff modal (college) | SecretaryDashboard and shared scoped review / Support / profile |
| `2547:2420` | College - User Manual / FAQ (redesign) | SecretaryDashboard and shared scoped review / Support / profile |
| `2555:2599` | Linked request modal (with attachment) | SecretaryDashboard and shared scoped review / Support / profile |
| `2557:2587` | Review COR modal | SecretaryDashboard and shared scoped review / Support / profile |
| `2557:2652` | Replace modal | SecretaryDashboard and shared scoped review / Support / profile |
| `2560:9110` | Request Document | SecretaryDashboard and shared scoped review / Support / profile |
| `2569:2587` | New staff conversation modal | SecretaryDashboard and shared scoped review / Support / profile |
| `2569:2641` | New internal concern modal (college) | SecretaryDashboard and shared scoped review / Support / profile |
| `2569:2696` | TRACE Edit Profile — Personal Info | SecretaryDashboard and shared scoped review / Support / profile |
| `2569:2764` | TRACE Edit Profile — Security | SecretaryDashboard and shared scoped review / Support / profile |
| `2569:2916` | TRACE Edit Profile — Security | SecretaryDashboard and shared scoped review / Support / profile |
| `2593:3778` | Window Clerk - New Support Ticket | SecretaryDashboard and shared scoped review / Support / profile |

### Finance

| Frame | Source design | Implementation area |
|---|---|---|
| `2575:3274` | Finance - Command Center | FinanceDashboard and shared receipt / Support / profile |
| `2525:6269` | Finance - Reports | FinanceDashboard and shared receipt / Support / profile |
| `2525:6717` | Finance - Reports | FinanceDashboard and shared receipt / Support / profile |
| `2525:7669` | Finance - Reports | FinanceDashboard and shared receipt / Support / profile |
| `2525:7128` | Finance - Reports | FinanceDashboard and shared receipt / Support / profile |
| `2525:7401` | Finance - Reports | FinanceDashboard and shared receipt / Support / profile |
| `2584:2587` | View Slip modal | FinanceDashboard and shared receipt / Support / profile |
| `2584:2673` | Log Counter Payment modal | FinanceDashboard and shared receipt / Support / profile |
| `2581:2609` | TRACE Edit Profile — Personal Info | FinanceDashboard and shared receipt / Support / profile |
| `2581:2677` | TRACE Edit Profile — Security | FinanceDashboard and shared receipt / Support / profile |
| `2581:2829` | TRACE Edit Profile — Security | FinanceDashboard and shared receipt / Support / profile |
| `2587:2587` | Finance - Verification Queue | FinanceDashboard and shared receipt / Support / profile |
| `2628:4751` | Finance - Payment History | FinanceDashboard and shared receipt / Support / profile |
| `2588:2630` | Receipt settings modal | FinanceDashboard and shared receipt / Support / profile |
| `2588:2745` | Replace paper pack modal | FinanceDashboard and shared receipt / Support / profile |
| `2588:2794` | Printer calibration modal | FinanceDashboard and shared receipt / Support / profile |
| `2589:2630` | Official Receipt modal | FinanceDashboard and shared receipt / Support / profile |
| `2589:2724` | Void receipt modal | FinanceDashboard and shared receipt / Support / profile |
| `2593:3410` | New staff conversation modal | FinanceDashboard and shared receipt / Support / profile |
| `2593:3463` | Linked request modal (with attachment) | FinanceDashboard and shared receipt / Support / profile |
| `2593:3823` | Window Clerk - New Support Ticket | FinanceDashboard and shared receipt / Support / profile |
| `2622:2667` | Verification Details modal | FinanceDashboard and shared receipt / Support / profile |
| `2631:2667` | Document preview modal | FinanceDashboard and shared receipt / Support / profile |
| `2631:2781` | Attach Official Receipt Copy modal | FinanceDashboard and shared receipt / Support / profile |
| `2631:2829` | Attach Official Receipt Copy modal — file chosen | FinanceDashboard and shared receipt / Support / profile |

### Login / Signup

| Frame | Source design | Implementation area |
|---|---|---|
| `115:1057` | Login Page | LoginPage / AuthShell; SignupPage / SignupShell |
| `2705:2667` | Sign Up · Step 1 · Student | LoginPage / AuthShell; SignupPage / SignupShell |
| `2705:2737` | Sign Up · Step 1 · Alumni | LoginPage / AuthShell; SignupPage / SignupShell |
| `2705:2820` | Sign Up · Step 2 · Student | LoginPage / AuthShell; SignupPage / SignupShell |
| `2705:2897` | Sign Up · Step 3 · Alumni | LoginPage / AuthShell; SignupPage / SignupShell |
| `2707:2667` | Sign Up · Step 2 · Alumni | LoginPage / AuthShell; SignupPage / SignupShell |
| `2707:2744` | Sign Up · Step 3 · Student | LoginPage / AuthShell; SignupPage / SignupShell |
| `2770:2665` | Sign Up · Step 3 · Student · File not accepted | LoginPage / AuthShell; SignupPage / SignupShell |
| `2770:2772` | Sign Up · Step 3 · Alumni · File not accepted | LoginPage / AuthShell; SignupPage / SignupShell |
| `2771:2665` | Sign Up · Registration complete · Pending verification · Student | LoginPage / AuthShell; SignupPage / SignupShell |
| `2771:2791` | Sign Up · Registration complete · Pending verification · Alumni | LoginPage / AuthShell; SignupPage / SignupShell |

## Local verification

All 1,192 frontend tests (124 suites) and 1,767 backend tests (131 suites) pass. Frontend lint and the clean production/PWA build pass. The existing large-chunk build advisory remains. All 31 current asset entries match original digests and production bytes; generated HTML and all 545 precache references resolve. Browser checks use synthetic records, inspect page/dialog bounds, text wrapping, original assets and key draft/session workflows at 320/375/768/1440 px, both themes and 100%/200% text. Screenshot inspection supplements those measurements. No production login, physical-phone acceptance or production deployment is claimed.

| Browser coverage | Passed checks |
|---|---:|
| Login/signup and separate tabs | 19 |
| Admin Main initial seven views | 112 |
| Admin Main remaining views | 416 |
| Admin More | 192 |
| All-role Support, wizard and activity | 368 |
| Student checkout and slip return | 32 |
| Window 1 | 292 |
| College Secretary | 510 |
| Secretary final layout refinements | 85 |
| Finance | 510 |
| All-role logout | 112 |
| Total, including targeted reruns | 2648 |

Screenshots use synthetic records: [Login](login-oct17-review.png), [Student checkout](checkout-oct17-review.png), [Mobile logout](logout-oct17-mobile.png). The logout title is centered and its description is “Are you sure you want to log out?” in every entry point. Phone actions stay side by side, including 200% text.

## Delivery requirements

Deploy matching frontend and backend revisions. This batch adds no schema, dependency or environment variable. Existing migrations remain prerequisites; it reuses `users.study_load`, `assigned_clerk_id`, routing-college snapshots and current-student detail fields. New invalidation messages contain resource names only; each authorized client refetches its own view. A Git push does not establish that a hosting service has rebuilt the frontend or restarted the backend.
