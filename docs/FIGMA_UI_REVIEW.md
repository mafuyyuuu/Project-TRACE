# TRACE UI review — October 16, 2026

This review inventories 135 frames in the current TRACE UI/UX file, across Admin Main (35), Admin More (8), Student (19), Window 1 (18), College Secretary (30) and Finance (25). It records implementation and local verification, not production deployment or user acceptance.

## Completed in this change

College Secretary now uses the reference dashboard, four workflow queues, digital evaluation and discussion layout, saved-rate pricing stepper, receipt inspection states, handoff summary, supporting-document dialogs and staff profile presentation. Reports and Graduate Applications reuse the corresponding scoped shared layouts. The manual uses Secretary topics. Supporting files remain authenticated; copies and downloads come from actual request data.

Finance now uses the source summary cards, searchable payment queues, counter form, two-column verification, payment history toolbar, receipt settings, pack replacement, calibration, void review, immutable print preview, published-copy viewer and empty/selected upload states. The manual and profile use the Finance presentation. The shared payment slip follows the source structure while retaining live QR generation, custom templates and saved group calculations.

Source SVGs are unmodified local exports. Identical existing exports are reused. `figma-desk-assets.json` records the source node, local file, intrinsic dimensions and SHA-256 for the Secretary/Finance icon manifests. Unused newly exported files were removed. Applicant images, uploaded documents, payment proofs and receipt previews remain real authorized data; reference photos, example receipts, sample QR data and mock financial values are not shipped.

## Required live-system differences

The reference supplies desktop mockups. Mobile, dark theme, enlarged text, empty/error states and pagination remain supported. Dates, totals, status, saved fee calculations, assignments and report scope come from current records. No decorative trends or unsupported performance claims are added.

The approved shared History filter treatment, ticket archives, removal of the Student floating chat launcher, Admin-only Support Analytics, and current-student Year Level/Section changes remain in force. Staff coordination describes actual staff permissions rather than the copied Admin monitoring copy in some mockups. Required supporting-document instructions, correction notes, receipt numbers and existing confirmation gates remain enforced. Receipt inspection and Final Handoff stay separate. Uploaded and physical OR inspections both require acknowledgment; changes to the recorded receipt reset it.

Subsequent user-approved refinements place Support page headings above the category tabs in DOM and visual order, show readable Activity Log actions with expanded abbreviations, and use equal-size New Request choices with selected-document fields below the grid. These requests take precedence over the earlier mockup composition; see `UI_CONVENTIONS.md` and the current progress entry for validation.

## College Secretary frame coverage

| Source frames | Implemented view |
|---|---|
| `2456:1798`, `2484:1830`, `2515:1921`, `2540:2404` | Evaluation, pricing, OR and handoff queues |
| `2519:5166` | Reports & Export; assigned-college scope remains |
| `2458:1813` | Digital evaluation, editable fields, purpose/routing summary and compact discussion |
| `2485:1829` | Set the Amount |
| `2533:2404`, `2533:2489` | Missing and recorded/uploaded OR states |
| `2543:2429` | Confirm Handoff |
| `2463:1813` | Support tickets dialog |
| `2463:1909`, `2593:3778` | New linked-ticket form variants |
| `2463:1964`, `2468:1813`, `2560:9110` | Supporting-document request, empty/ready variants |
| `2463:2022`, `2555:2599` | Linked request, empty/with attachment |
| `2557:2587`, `2557:2652` | Review COR and request replacement |
| `2560:8838` | Case support and requirement message |
| `2512:2702`, `2512:3035` | Staff coordination and internal assistance |
| `2569:2587`, `2569:2641` | New staff conversation and internal concern |
| `2569:2696`, `2569:2764`, `2569:2916` | Personal Info, Security top/scrolled |
| `2514:3171`, `2547:2420` | Graduate Applications and Secretary manual |

## Finance frame coverage

| Source frames | Implemented view |
|---|---|
| `2575:3274`, `2587:2587`, `2628:4751` | Awaiting Payment, Verification Queue and Payment History |
| `2584:2587`, `2584:2673` | Payment slip and Log Counter Payment |
| `2622:2667` | Verification Details |
| `2588:2630`, `2588:2745`, `2588:2794` | Receipt settings, paper pack and calibration |
| `2589:2630`, `2589:2724` | Saved OR print preview and void review |
| `2631:2667`, `2631:2781`, `2631:2829` | Published-copy viewer and empty/selected upload |
| `2525:6269` | Reports & Export |
| `2525:6717`, `2525:7128`, `2525:7401` | Case support, staff coordination and internal assistance |
| `2593:3410`, `2593:3463`, `2593:3823` | New staff conversation, linked request and new support ticket |
| `2581:2609`, `2581:2677`, `2581:2829` | Personal Info, Security top/scrolled |
| `2525:7669` | Finance manual |

## Cross-account audit and outstanding gap

The existing per-frame Admin, Student and Window inventories are maintained in `UI_CONVENTIONS.md`. The current Figma section inventories were re-read, and the implemented views were checked with synthetic records at 320, 375, 768 and 1440 px, 100%/200% text and both themes. Browser checks measure overflow, modal bounds, loaded assets and intrinsic icon geometry; screenshot inspection supplies the visual review. These checks do not prove exact pixel parity for every frame.

**Not complete: Student Payment modal `2506:1867`.** The newer checkout frame is readable in Figma, but StudentDashboard still mounts the older checkout layout. Its grouped-payment behavior and existing regression tests pass; that does not establish visual parity. The revised payment-card/dashboard view `2500:1876` is implemented, with the explicitly removed floating chat left out. Original checkout assets such as `c2452.svg`, `5f3dc.svg`, `ccf70.svg`, `55f54.svg` and `51fa3.svg` still need retrieval and implementation. During this review, Figma native export and app-opening calls became unavailable. The download tool later returned asset URLs again, but downloading them still produced a 195-byte HTML “Site Unavailable” page instead of SVG. Original bytes could not be retrieved. No substitute artwork or temporary Figma URL was added to the application. Resume exact checkout implementation when original asset export is available.

**Also pending: Secretary Graduate Applications active navigation icon.** Its source white `8dfb2.svg` is identified at `I2542:8341;2519:5643`, but its original export is unavailable. The implemented inactive `fa806.svg` remains visible on the active tab. The Manual active icon and linked-request history/back icons use original exports already obtained. Do not redraw or silently substitute the missing active asset.

The system must not be described as a perfect or completely finished Figma match while that frame remains outstanding. No production account session or physical phone was used for these local checks.

## Final validation

All 1,163 frontend tests across 120 suites pass. The additional regressions cover uploaded-receipt inspection/reset, handoff focus/pending guards, saved-rate page calculations, and payment clearance without OR issuance after the Manila cutoff. Frontend lint and the clean production/PWA build pass. The existing large-chunk build advisory remains.

| Browser coverage | Passed checks |
|---|---:|
| Admin Main | 528 |
| Admin More | 192 |
| Student main views | 144 |
| Student profile, education, security and tracking | 112 |
| Window 1 | 292 |
| College Secretary | 510 |
| Finance | 510 |
| Final Secretary layout refinements | 85 |
| Final Finance cutoff/layout refinements | 136 |
| Total, including targeted reruns | 2,509 |

All checks completed without recorded page errors or layout/asset failures. All 165 Secretary/Finance manifest entries match non-empty local SVGs, source root dimensions, SHA-256 provenance and production-build bytes. Generated HTML entrypoints and service-worker asset references resolve; no temporary Figma asset URL is used in application source.

Review screenshots use synthetic records: [Secretary desktop](secretary-figma-evaluation.png), [Secretary mobile](secretary-figma-evaluation-mobile.png), [Finance desktop](finance-figma-verification.png), [Finance mobile](finance-figma-verification-mobile.png).

## Delivery

Frontend changes only. No backend, database migration, dependency, environment or receipt-template data change is required. Publish the updated frontend build after the dev commit. Git push does not itself establish that the production frontend has redeployed.
