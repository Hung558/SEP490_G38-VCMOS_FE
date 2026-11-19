# FE desktop: BE #53 community + #54 unified pet timeline

## Baseline and authorization

- 2026-11-19: FE origin/main `ad5fe27`, BE origin/main `3d56eaa` (latest #54).
- Both main checkouts fetched and pulled fast-forward-only; clean before starting.
- Earlier inpatient FE PR #40 merged 2026-11-17, not a pending blocker.
- FE changes only. No mobile, BE, database, secrets, live-data mutation, or policy bypass.
- Feature branch → focused checks → regression/E2E → PR → ordinary merge only if repository requirements permit.

## Work ownership

1. Lead: plan/spec, navigation/owner-only route, integration, final checks/PR.
2. `code` chat: isolated worktree; PetTimelineService, PetProfile and timeline unit tests.
3. `Lập plan và code phần FE` chat: isolated worktree; CommunityPostService, CommunityPosts and community unit tests.
4. `Run testing and web QA` chat: isolated tests for timeline/community; no app writes.

## Phases

- [x] Fetch/pull both repositories, identify changes missing in FE.
- [x] Inspect backend controllers/services/validators; pin baseline and ownership.
- [x] Implement timeline + preserve useful existing history/navigation.
- [x] Implement owner post CRUD with uploads and review-state constraints.
- [x] Integrate route/menu and independently review contracts/privacy.
- [x] Typecheck, lint, unit tests, build, isolated mocked browser E2E and affected regressions.
- [x] Publish PR and inspect CI/review requirements.
- [ ] Merge PR after the required independent approval (repository-policy blocker).

## Risks / non-goals

- Community endpoints are owner-only self-management, NOT a public feed. No fake publish/like/comment actions.
- Timeline `canShareToCommunity` is not an order-sharing API. TimelineShare currently uses manually supplied dated items; do not invent orderId mutation.
- Financial data must not render for veterinarian/groomer, including nested inpatient invoice.
- Date filters use clinic date strings; no client timezone shifts.
- Existing real-backend setup prerequisites remain; mocked E2E is not live integration proof.

## Verification evidence

Pending implementation. Do not infer completion from chat dispatch.

## Verification evidence (2026-11-19)

- Final integrated source: `npm test` **284/284**, zero skipped/failed;
  `npx tsc -b`, `npm run lint`, `npm run build` all pass.
- Production build with same-origin `/api`, reception intake and specialty flags
  disabled (the existing optional feature gates are not changed).
- Full-page Chromium desktop suites on owned `127.0.0.2:3000` production preview:
  timeline **7/7**, community **9/9**, inpatient **8/8**, SOAP **3/3**,
  reception-today **9/9**, pet-delete conflict **1/1**: **37/37**.
- Separate isolated component browser harness: **12/12** checks, no page errors;
  includes identity fail-closed, account-switch dialog cleanup, draft/image
  retention on conflict, rejected-file revert and refreshed-status delete lock.
- Independent timeline/community code reviews completed; restored invoice PDF,
  active-care refresh and pickup safeguards; guarded all nested financial output.
- Inspected desktop screenshots of timeline and owner posts with synthetic data.
- BE remains clean at `3d56eaa`; FE base still `ad5fe27` after final fetch.

### Test repairs, not product changes

- Older pet-profile/inpatient test fixtures now provide the new timeline endpoint.
- Reception tests had stale pre-FE-#41 assertions: at-clinic work deliberately spans
  appointment dates; pickup CTA now directs billing. Updated exact assertions and
  added early/late appointment regression; no production reception code changed.
- New QA timeline harness repaired AntD selectors, event-driven stale-response
  control, awaited async auth/routing and real page-count arithmetic. The final
  tests have no timing sleeps for the stale-request ordering.

### Reproduce desktop browser suites

Build with `VITE_API_ROOT=/api`, then start a dedicated production preview:
`node node_modules/vite/bin/vite.js preview --host 127.0.0.2 --port 3000 --strictPort`.
In another terminal set `FE_BASE_URL=http://127.0.0.2:3000` and run each
`python tests/verify_<suite>_e2e.py` listed above (pet-delete uses
`verify_be42_pet_profile_e2e.py`). Requires Python Playwright and Chromium.
All new QA API requests are intercepted; no real patient data, payments or uploads.
The separate JS harness instructions are in the CommunityPosts README.

### Remaining limitations

- Mocked browser QA is not live BE/Cloudinary, real authorization or concurrency QA.
- Backend moderation atomicity and orphan upload cleanup are outside FE scope.
- Production build retains the pre-existing >2000 kB main-chunk warning.
- Automatic `ak` journal persistence unavailable because the CLI is not installed.
- Publishing/merge still requires the repository's PR policy: one approving review;
  no self-approval, admin bypass or ruleset edits.

## Final verification result (2026-11-19)

- Unit tests: **284/284** passed, no skips.
- TypeScript project build (`npx tsc -b`), ESLint and production build passed.
- Production-preview Python browser suites: **37/37** passed: timeline 7,
  community 9, inpatient 8, SOAP 3, reception-today 9, pet-delete 1.
- Isolated community browser harness: **12/12** checks passed, no page errors.
- Timeline tests include actual active-inpatient banner/logs, owner SOAP and
  invoices, veterinarian/groomer financial hiding, server pagination/filter reset,
  retry/empty, page shrink correction, suppressed pickup while admitted, 403 and
  event-ordered stale-response protection during same-document pet navigation.
- Independent reviewers covered both app modules and final QA isolation; no
  unresolved blocking findings. Desktop screenshots inspected at 1440 px.
- Latest remote baselines rechecked before publishing: FE ad5fe27 / BE3d56eaa.

## Publication / handoff

- Pushed `feat/pet-timeline-community-be54`; opened FE PR **#44** against main.
- GitHub reports `MERGEABLE` (no conflicts) but `REVIEW_REQUIRED` / `BLOCKED`.
- One approving review is required; reviewer `truzne` is already requested.
- Ordinary merge was attempted and rejected by base-branch policy; no bypass used.
- Repository `allow_auto_merge=false`; no setting was changed to enable it.
- No CI checks were reported for this PR at inspection time; local evidence above
  is not represented as a successful GitHub CI run.
- FE main remains `ad5fe27`; new functionality is on the pushed feature branch
  until approval/merge. Backend remains untouched at `3d56eaa`.
- Remaining action: independent approval, then normal merge of the reviewed head
  and pull main; recheck CI/state at that time.
