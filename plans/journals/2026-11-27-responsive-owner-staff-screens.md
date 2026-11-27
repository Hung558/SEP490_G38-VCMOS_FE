# Responsive owner and staff screens — 2026-11-27

## Scope and baseline

- User authorized adding responsive behavior to recently implemented FE screens.
- Fetched origin and fast-forward checked origin/main before edits: already current at 46e5b99. No dev branch exists in the local/remote branch inventory; this repository uses main.
- Working branch: fix/responsive-staff-owner-screens-20261127.
- Frontend only; no service contracts, permissions or backend files changed.

## Changes

- MainLayout: below AntD lg (992px), remove the space-reserving sidebar and expose the same role menu in an accessible Drawer. Close on menu selection, navigation, Escape, close button, or breakpoint change; preserve desktop collapse preference.
- Allow the content flex column to shrink; wrap breadcrumb text and reduce compact header padding.
- Dashboard: responsive card header/actions and padding; concise Vietnamese pet filters; horizontal scrolling contained inside the pet table, not the document.
- Profile: allow work rows to wrap; pet-card grid can shrink below its previous 240px minimum.
- Portal calendars: on phones, stack range panels and presets; bound popup position and height to the viewport, with internal scrolling so both months remain reachable.

## Verification

- npm run lint: pass.
- npm run build: pass; existing large-bundle advisory remains.
- npm test: 402 cases, 401 pass, 1 pre-existing skip, 0 fail. Includes 3 new source-contract regression tests, which complement rather than replace visual tests.
- Chromium/Playwright: 48 viewport cases passed at widths 320, 390, 768, 1366. Scope: Profile for Receptionist/Veterinarian/Groomer/PetOwner; owner dashboard pets and appointments; pet journeys (empty and expanded populated milestone); community timeline feed; owner invoices; clinic pending and issued invoices.
- Assertions: document width fits viewport; primary controls not outside viewport (intentional internal table scrolling excluded); no page errors; compact menu opens/closes via Escape and menu selection; desktop collapse works.
- Additional range-calendar popup checks at 320x667 and 390x667: popup remains inside viewport with presets and vertically scrollable calendars. Dedicated stable Drawer screenshot verified after transition.
- All API traffic intercepted using fictional fixture data; non-GET requests blocked; zero write attempts. No live patient/customer data touched.
- Browser audit scripts and screenshots kept outside the repository, respecting the removal of Python browser helpers in PR62.

## Limits

- Viewport emulation in Chromium, not physical-device Safari/Firefox certification.
- The audit covers the listed screens and representative fixtures, not every possible modal, clinical payload or staff workflow.
- Changes remain local; not pushed or merged in this task.
