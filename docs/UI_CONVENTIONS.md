# TRACE controls and page layouts

All roles and public account pages use the Tailwind component classes in `frontend/src/index.css`. These are presentation rules; permissions, validation, API calls and confirmation workflows remain in their existing modules.

The existing green branding is the baseline. Normal fields and actions use consistent typography, padding and rounded corners. Controls have a minimum 44 px height; content can increase that height. Typography and unitless line height scale with the saved text-size preference. The PDF does not prescribe these dimensions.

| Element | Classes | Notes |
| --- | --- | --- |
| Text, number, date, password, select, textarea | `trace-control` | Includes dark, hover, focus, disabled and readonly styling. Textareas grow vertically. |
| Field on the green authentication background | `trace-control trace-control-inverse` | White text and focus indicator in both themes. |
| Invalid field | `trace-control` with `aria-invalid="true"` | Uses a red border/ring. Native `:user-invalid` also covers required/type validation after interaction. Keep the explanatory error and its existing validation logic. |
| Field label | `trace-label` | Add `trace-label-inverse` on green backgrounds. Retain `htmlFor`, required markers and accessible names. |
| Checkbox/radio | `trace-choice` | Retains native selection behavior and compact geometry. |
| File picker | `trace-file` | The native file button has its own theme/state styles. Camera-only photo pickers remain hidden. |
| Action | `trace-button` plus a variant | `trace-button-primary`, `-secondary`, `-danger`, `-warning`, `-info`, `-inverse` or `-inverse-primary`. Secondary toggle actions reflect `aria-pressed`. |
| Icon action | `trace-icon-button` | Use an accessible label. Avatar/camera/floating support buttons retain their deliberate geometry. |
| Tab | `trace-tab` | Keep selection colors, tab semantics and keyboard behavior in the existing component. Queue tabs retain circular badges. |
| Link/row action with specialized geometry | `trace-action` | Shared transition and disabled treatment; does not turn a row or text link into a boxed button. |
| Page | `trace-page`, `trace-page-header`, `trace-page-title`, `trace-page-description` | Responsive wrapping and common section spacing. |
| Card/section | `trace-section` | Add `trace-section-body` for padding; use `trace-section-header` for a separate header. `trace-section-inverse` keeps white text readable on green/dark surfaces. Tables/charts retain their own scrollers. |
| Form fields | `trace-form-grid` | Columns depend on available reading width, not only viewport width. Spanning fields fill the row when it stacks. |
| Action group | `trace-actions` | Wraps on narrow screens. Stacked modal footers may retain `flex-col sm:flex-row`. |
| Date chip | `trace-date` | Wraps label, value and icon without splitting words at enlarged text sizes. |
| Error panel | `trace-error` | Retain existing alert/status semantics and error text. |

Example:

```jsx
<label className="trace-label" htmlFor="reference">
  Reference number
</label>
<input id="reference" className="trace-control mt-2" disabled={saving} />
<div className="trace-actions mt-4">
  <button type="button" className="trace-button trace-button-secondary" onClick={onCancel}>Cancel</button>
  <button type="submit" className="trace-button trace-button-primary" disabled={saving}>Save</button>
</div>
```

Utilities can adjust layout, such as `flex-1`, `w-full`, `mt-2` or `pr-12` for a password visibility icon. Do not add a second base border, background, font-size or padding recipe to ordinary controls. New variants belong in the shared component layer.

Sidebar groups come from `navGroupsForUser` in `utils/navigation.js`, partitioning the existing authorized destinations. `SidebarNav` renders Main or More with shared `trace-nav-item` controls, Preferences and Logout in both, native keyboard activation and focus transfer after a group switch. Direct routes reveal their group; onboarding may reveal a group without navigating. `trace-nav-scroll` hides scrollbar chrome only. Keep `overflow-y-auto`, nonshrinking items and keyboard focus access on the rail/drawer so short screens retain every destination.

Normal dialogs use `ModalShell`, which applies `trace-modal-panel`, `trace-modal-body` and `trace-modal-footer`. Keep actions in its pinned footer. Profile retains its scrolling header/body arrangement with common panel/footer appearance. Lightboxes, split-column account review, printable slips and isolated HTML template previews may keep their existing overrides.

Preferences content lives in `components/PreferencesModal.jsx`, reached through the existing ProfileSettingsModal appearance branch for every role. Keep Appearance and Text size as separately labelled sections with full-width controls, short percentage options and descriptions outside the select. The compact responsive title preserves room for Close at 320 px with 200% text. Preferences are applied immediately through Layout's existing callbacks; unavailable callbacks disable their controls. Use the shared modal body for scrolling and retain the shell's Escape/focus containment/restoration. The standard panel height subtracts the overlay's fixed 16 px gutters (32 px total), independently of root font size.

When changing these conventions, run frontend tests, lint and build, then check actual pages and dialogs at 320, 375, 768 and desktop widths in light/dark themes at 100% and 200% text. Check line spacing, wrapping labels/actions, hover, visible keyboard focus, readonly/error/disabled states, contained table scrolling and reachable footer actions. Browser emulation does not replace acceptance testing on a physical phone. No database migration is required for this presentation change.

Shared branding uses `components/TraceBrand.jsx` and `utils/branding.js`. The supplied Canva exports are copied unchanged to `public/trace-logo-light.png` (logo1) and `public/trace-logo-dark.png` (logo2). Use the component rather than another logo import or recreated mark. Its SVG viewport removes only transparent canvas margins from the presentation, preserving the full artwork and its proportions. Vite generates browser/PWA icons from the same PNG bytes and shared viewport. The browser icon follows the selected theme; the installed app icon uses the light variant. If the approved artwork changes, update both PNGs and their dimensions/viewport together, then rebuild.

Shared interaction mappings and tokens are documented in [UI_MOTION.md](UI_MOTION.md). Layout owns route context; SidebarNav owns group context; ModalShell owns drill entry/return for all consumers. Do not add a second page/modal entrance class. Keep native disclosure layout and scroll immediate, use transform-only ProgressFill for progress, and keep alerts/focus/busy state independent of animation completion.
