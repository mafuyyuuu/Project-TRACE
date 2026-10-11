# Revision 2 Batch 10 — Support / Messaging UI

Implements **TRACE-61/62/63/64/65/66** from the newer guide. The next guide batch is Batch 11, Support Analytics. This is repository implementation with local evidence; no live migration or deployment is included.

## Walkthrough without an account

1. Open Support. Window 1 sees **Claim oldest ticket** as the primary queue action and **Live availability** as a labeled switch with its current saved state. “How live support works” explains both controls for keyboard and touch users. Existing confirmation, one-live-ticket and server eligibility rules remain.
2. Search **loaded tickets** by ticket number, title, student metadata or state. Older ticket pages remain reachable. Search is local to already-authorized records, not a new server-wide search endpoint.
3. Select a ticket. Every row shares the same avatar/title/status/context slots and left padding. Selection uses a pale tint, green edge and dark readable text. Initials derive from real ticket names; they do not imply presence. Timestamps appear only when supplied by the API.
4. Read the selected context above its conversation. **Open linked case** opens that ticket’s request information and existing authorized supporting-document controls. **New linked ticket** opens the creation form; the two labels now describe different actions. An unlinked ticket has no Open linked case control.
5. Queue and support-hours notices sit separately from ticket context. History scrolls independently. Incoming bubbles stay light; outgoing bubbles use TRACE green. Date separators and message times use recorded Manila timestamps. The composer stays at the bottom, with distinct **Attach files** and **Request document** actions where permitted.
6. On small screens, Tickets / Support actions opens a focused ticket drawer. Escape closes it and restores the trigger. The student widget uses the Figma green header and empty illustration; closing/reopening retains its message/file draft. Escape closes a nested confirmation first.
7. In **Digital Request Evaluation**, the evaluation fields and discussion have separate panels on wide screens. On narrow screens, **Open discussion** / **Back to evaluation** switches the visible panel without discarding either draft. Evaluation actions remain in the shared pinned footer. Scanned evaluation retains its existing preview and discussion workflow.
8. A successful support action produces a dismissible, polite toast outside the list/conversation layout. Consecutive successes stack in a bounded scrollable region. They stay until dismissed or navigation/browser-tab dismissal; important failures remain inline or inside their confirmation. Ordinary messages and real system/requirement events stay in the conversation.

## Figma references and deliberate adaptations

Main TRACE file: [chat workspace, 260:3301](https://www.figma.com/design/78A3HTREQ86GIN9ZxvDBSv/TRACE-Draft?node-id=260-3301), [compact empty state, 254:987](https://www.figma.com/design/78A3HTREQ86GIN9ZxvDBSv/TRACE-Draft?node-id=254-987), [compact conversation, 258:1093](https://www.figma.com/design/78A3HTREQ86GIN9ZxvDBSv/TRACE-Draft?node-id=258-1093). The three supplied reference images were inspected before source edits. Glass/clay alternatives were excluded as requested.

The app retains its global shell and shared modal/confirmation components. This extends the two-column reference with real ticket actions, protected attachments, FAQ/requirements controls, dark mode and enlarged text. It does not duplicate the global header/sidebar inside chat. The Figma illustration and static icons are saved locally under `frontend/src/assets/support/`, with their original geometry and no temporary URL dependencies. The illustration is 122 × 116; icons retain their exported SVG dimensions.

The API does **not** provide unread counts, presence, delivery/read receipts, avatar photographs or last-message snippets for ticket lists. The UI therefore shows actual ticket state/request metadata, name initials and available timestamps. It does not copy mock counts, people, “Sent” checks, lorem ipsum or a guaranteed waiting time. New staff-to-staff messaging connections remain deferred; this is a UI change to the existing ticket workflow.

## Screenshots

All screenshots use synthetic API responses and can be viewed without an account. They are not live database screenshots.

- [Support workspace — light](batch10-support-workspace-light.png)
- [Compact empty state — light](batch10-widget-empty-light.png)
- [Compact conversation — phone / dark](batch10-widget-mobile-dark.png)
- [Digital evaluation — light](batch10-evaluation-light.png)
- [Digital discussion — phone / dark](batch10-evaluation-mobile-dark.png)

## Causes and code changes

- `SupportWorkspace.jsx` used a centered action-button recipe for selection rows; its pressed secondary-button colors overrode the pale selection surface. `SupportVisuals.jsx` and explicit `trace-support-ticket` styles now provide consistent row geometry and contrast.
- The header called creation “Open linked case” and mixed queue, availability and administration actions. Creation is labeled explicitly, while actual case context lives with the selected ticket. Availability is a confirmed switch; claim remains the primary Window 1 action.
- Hook-owned success strings were rendered inside layout. `useSupportFeedback.js` and `SupportToasts.jsx` now queue and dismiss successful feedback without shifting cards. Send errors and post-send refresh errors keep their existing draft/accepted-message behavior.
- `SupportConversation.jsx` mixed context with queue notices and rendered broad message cards. Separate regions, reusable date separators, restrained bubbles and a pill composer now follow the main Figma layout. Existing protected file and requirement components are reused.
- `FloatingSupportChat.jsx` unmounted the workspace on close and had no Escape/focus restoration. It now hides an inert preserved workspace after first opening, suspends its dialogs while closed, restores focus and lets shared dialogs consume Escape first.
- `SecretaryEvaluationModal.jsx` stacked a 70dvh chat below evaluation fields. The digital view now has independently scrolling panels and a mobile discussion view, with parent-owned evaluation drafts and a persistently mounted chat. Field labels are associated with their controls; the existing document-type catalog is passed through.

## Verification

- Full frontend suite: **876 tests in 94 files pass**. Final focused support/evaluation regressions: **26 tests in 3 files pass**, covering confirmed availability, success/failure feedback, local search, closed/assigned ticket permissions, send retries, file validation, cursor history, widget close/reopen and evaluation draft retention.
- Existing backend support/attachment suite: **31 tests in 2 files pass**. Backend routes, SQL, authorization, service hours, claim ordering, ticket limits and migrations are unchanged.
- ESLint and production build pass. Existing PostCSS/chunk-size advisories remain.
- Chromium: **64 cases pass** across Admin, Window 1, Secretary, Finance, Student, compact empty/conversation widgets and digital evaluation, at 320/375/768/1440 px in light/dark themes. Additional checks cover 200% text, independent history scrolling, reachable composers, ticket-drawer focus containment/restoration, context/queue switching, reduced motion and loaded local assets. No page errors or mocked workflow mutations occurred. Screenshots were visually reviewed against the references. Narrow context buttons were made to wrap; compact ticket context is collapsed so messages retain space.

Local checks use mocks and Chromium viewport emulation. They do not prove live MySQL state, real notification delivery, physical-phone behavior or production queue timing. Recheck actual role/college scope, attachments and a confirmed live claim on staging before rollout. No test browser dependency was added to the application.

## Migrations and deployment

**No database migration, environment variable, API contract or dependency is added by Batch 10.** It requires the existing support-ticket, archive/requirements/catalog and Batch 8 intake-scope schema already tracked in [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md). The consolidated [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) records this batch and the earlier alumni/intake scripts. Publication is to `dev` only; no main merge or production deployment is performed.
