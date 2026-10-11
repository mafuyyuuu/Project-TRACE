# Revision 2 Batch 11 — Support Analytics

Implements **TRACE-69/70** from the newer fixes guide. This is a frontend presentation refactor of recorded support metrics. The next guide batch is Batch 12, Finance Receipts. No live database migration or deployment is included.

## Walkthrough without an account

1. Open the [desktop analytics screenshot](batch11-support-analytics-light.png). Six KPI cards group ticket volume, escalations, unresolved backlog, FAQ views, explicit FAQ resolutions and staff assigned episodes. Each card includes a cohort, denominator or cutoff explanation rather than a decorative trend.
2. New Tickets keeps imported tickets separate. Escalations retains its FAQ-assisted creation-cohort numerator and denominator. FAQ views, helpful-or-not-helpful feedback and explicit resolutions remain distinct; silence is not a resolution.
3. Read Measured Durations in minutes. All seven metrics and all five columns remain: Metric, Median, p90, Samples and Missing. Service time uses recorded Manila calendars and excludes Awaiting Student intervals; wall time includes them. Imported histories remain excluded from duration samples.
4. Compare a measured zero with [an empty measured period](batch11-support-analytics-empty.png). Missing median/p90 values display muted, readable **No data**. Recorded zero counts remain zero. A missing escalation percentage has no percent sign; empty categories/backlog/workload are explained explicitly.
5. Category and backlog panels keep recorded categories and historical cutoff states, including UNKNOWN history. Staff workload counts assigned/responded episodes, including reopened episodes; it is not a ranking of clerk performance.
6. In the actual Admin → Efficiency Analytics page, edit From and Through, then choose **Apply period**. Edits do not fetch until Apply. The date strip shows the actually loaded period in Manila, including its exclusive ending instant. Initial defaults remain the last 30 days.
7. During a refresh, previous results stay visible with a notice identifying them. On failure, inline feedback retains the previous period and date draft. Apply period retries; a successful load replaces the data and clears the error. No summary is fabricated after an initial failure.
8. Open [phone analytics in dark mode](batch11-support-analytics-mobile-dark.png). Cards stack, date controls wrap and statistical tables scroll within their own panels. Keyboard users can focus a table region and use arrow keys to reveal its other columns. Informational cards use stationary shadow feedback and have no click action/tab stop.

Screenshots use synthetic API responses. They demonstrate the current repository UI without requiring an account; they are not measured institutional outcomes or production screenshots.

## Figma reference and adaptations

The main [Admin Registrar dashboard, 93:663](https://www.figma.com/design/78A3HTREQ86GIN9ZxvDBSv/TRACE-Draft?node-id=93-663) supplies the visual hierarchy: rounded white surfaces, prominent values, Inter typography and soft sage/pine context strips. Its design context and screenshot were reviewed before implementation. The page has no dedicated Support Analytics frame, so existing support content is grouped using those foundations and the established `trace-*` Tailwind tokens.

This scope does not reproduce the Figma dashboard's unrelated forecast, avatar/sidebar/calendar assets, mock trend graphics or baseline percentage changes. No new static imagery is needed for these metric cards/tables. Existing global shell, document analytics and role access remain. Dark-mode colors, small-screen layouts, visible keyboard focus and reduced-motion behavior use the existing shared conventions; glass/clay alternatives are excluded.

## Causes and code changes

- `frontend/src/components/SupportAnalytics.jsx` rendered category, backlog and FAQ summaries mainly as plain text; only three values had simple boxes. A shared label/value/context card recipe now groups all relevant summaries. Detailed breakdowns remain visible in tally panels and semantic tables.
- The duration table repeated a local rounded border and tight cell recipe. `frontend/src/index.css` now provides explicit `trace-analytics-*` presentation styles with spacious padding, right-aligned tabular values, no cell borders, subtle row bands and opaque sticky headers. Horizontal/vertical overflow stays inside focusable table regions; no statistical column is removed.
- `frontend/src/features/admin/components/AnalyticsPanel.jsx` wrapped the entire support view in another card, nesting containers and consuming useful width. It now renders SupportAnalytics directly; each metric/table owns its appropriate shared surface.
- `frontend/src/utils/supportAnalyticsPresentation.js` centralizes recorded-value formatting, sums only returned backlog/episode counts and preserves missing values as No data. It does not recalculate server percentiles, escalation percentages or duration formulas. Loaded period timestamps are explicitly displayed in Manila.
- `frontend/src/hooks/useSupportAnalytics.js`, service calls and backend aggregation are unchanged. The component labels previous results during refresh/error, retains date drafts for retry and disables/guards Apply while loading. Help/README/manual and the consolidated deployment ledger describe the revised presentation.

To prevent recurrence, keep report definitions in the backend, share presentation recipes, label each cohort/denominator near its value and review actual small-screen/enlarged-text rendering. A desktop flex basis must not become fixed blank height in a mobile column.

## Verification

- **Full frontend suite: 887 tests in 95 files pass.** Final focused analytics regressions: **10 tests in 2 files pass**, covering cohorts/denominators/episodes, zero versus missing data, all duration columns, draft dates, Apply guards, refresh failure/retry, initial failure, unmount abort and existing Admin report feedback.
- **Existing backend metrics/report regressions: 15 tests in 2 files pass.** These cover service versus wall time, pauses/requeues/reopens, imported exclusions, FAQ denominators, historical categories/unknown backlog, role access and Manila reporting boundaries. Backend code is unchanged.
- ESLint, production/PWA build and whitespace checks pass. Existing PostCSS and chunk-size advisories remain.
- **Chromium: 80 layout cases pass.** Populated, empty, loading, failed and integrated Admin analytics views were checked at 320/375/768/1440 px, in light/dark themes, with 100% and 200% text. Additional checks confirm contained keyboard scrolling, visible table focus, all five duration columns, borderless cells, at least 4.5:1 No data contrast, stationary informational-card hover, reduced motion and date-draft/error/retry behavior. No page errors or mocked write requests occurred.
- The three screenshots were visually reviewed against TRACE's Admin card treatment. A mobile flex-basis gap was corrected and all browser cases rerun. No browser/test dependency was added to the application.

Tests use synthetic data and viewport emulation. Actual production metric histories, deployed account permissions and physical-phone acceptance remain final rollout checks. The pre-existing parent document-analytics loading/availability gate is unchanged; this batch does not redesign unrelated document analytics.

## Migrations and deployment

**Batch 11 adds no database migration, environment variable, API contract or dependency.** It uses the existing support-report endpoint and ticket audit/calendar history. No AI rebuild or n8n workflow re-import is required for this frontend change.

[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) records Batch 11 as None and retains the earlier alumni/intake migrations and existing support prerequisites. Do not rerun historical migration scripts just for a UI update. Publication is to `dev` only; no main merge, live migration or production deployment is performed.
