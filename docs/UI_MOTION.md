# TRACE interaction motion

Motion describes a UI change; it never decides permissions, API timing, busy state, focus or navigation. This shared presentation policy coordinates the existing branding, Main/More navigation and responsive Preferences work (TRACE-01/TRACE-03/TRACE-04): keep the approved logos, role-aware destinations, text-size geometry and shared modal keyboard behavior.

## Source inventory and mappings

Before implementation, Layout owns a separate hardcoded 200 ms page fade. Tailwind has 200 ms fade/slide keyframes with a 1 rem lift; many role pages replay entrance classes and six customized dialog panels supply their own entrance classes. ModalShell handles immediate dismissal/focus restoration but no visual return. DocumentChat remounts by conversation identity for request isolation, with immediate composer focus and unconditional bottom scrolling on every refresh. FAQ uses native details without motion. Fourteen source locations use transition-all, local duration overrides or local animation calls. Existing reduced-motion CSS covers CSS animations but needs equivalent cancellation for Web Animations. The Admin dashboard forecast Area also leaves library drawing animation enabled, while sparkline/analytics/forecast-detail charts explicitly disable it; keep chart data changes immediate rather than adding another drawing sweep.

| Mapping | Surfaces | Behavior |
| --- | --- | --- |
| Continuity | Native FAQ expansion, progress fills, selected cards and status/feedback | Keep the same element and scroll container. Commit expanded content/status immediately; use a restrained emphasis or transform-based progress transition. No animated height measurement. |
| Drill | ModalShell consumers: profiles, document/receipt/image previews, confirmations and feedback; mobile drawer and support panel | Small entry from the trigger's origin. Dismiss live content and restore focus immediately. A sanitized, inert, aria-hidden visual copy may finish a brief exit; it contains no live controls, IDs, embedded viewers or credential values and is removed on finish/cancel/timeout or a new drill entry. Return emphasis identifies the surviving origin. |
| Context | Layout route changes, queue panels, Profile tabs, Main/More and conversation selection/type | Restrained fade/4 px translation without changing React keys or remounting forms just for motion. Existing conversation identity keys remain for data/draft isolation. First page paint does not replay a second full-page entrance. |
| Action feedback | Shared controls, progress and conversation send/read feedback | Update state, labels, alerts, disabled state and focus immediately. Color/opacity/transform only; pending loaders retain their functional purpose. Important messages never depend on an animation event. |

Tokens live in index.css: 150 ms feedback, 180 ms context/continuity, 220 ms drill entry, 160 ms exit; shared cubic-bezier easing, 2/4/8 px distances, subtle opacity and scale, and resting/raised elevation. Tailwind's default timing and legacy fade/slide utilities reference these tokens. Distances are fixed pixels so text enlargement does not enlarge movement. Elevation changes are static hierarchy cues, not animated shadows or blur.

Web Animations are progressive enhancement. Missing APIs/tokens mean an immediate change. Cancellation reads the current presentation before replacement; unmount and reduced-motion changes cancel work. Reduced motion disables directional motion, lifts, progress interpolation and visual exit copies. Native scrolling/focus/state changes stay immediate. Avoid transition-all, animated layout/height, floating loops, animated blur, artificial action delays and storing content snapshots beyond the bounded exit.

New surfaces should use the shared hooks/classes instead of local keyframes, durations or effect timers. Verify rapid switch/close/reopen, nested dialogs, draft and scroll preservation, unmount cleanup, focus restoration, reduced motion, 320 px layouts and 200% text. Browser fixtures do not replace physical-phone or deployed-site acceptance.

## Local verification

627 frontend tests in 73 suites, ESLint, production build and whitespace checks pass. 512 isolated synthetic-browser checks cover all five roles, normal/reduced motion, dynamic preference changes, both themes, 320/375/768/1280 widths, short viewports and 100%/200% text, including nested previews/confirmations, pending guards, immediate focus restoration, rapid reopening, safe exit cleanup and preserved drafts/chat scroll. The mobile dark 200% nested dialog was visually inspected. Existing build chunk-size advisory remains. Physical phone and deployed-site acceptance are separate; no migration is needed.
