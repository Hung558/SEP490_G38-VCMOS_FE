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
- [ ] Implement timeline + preserve useful existing history/navigation.
- [ ] Implement owner post CRUD with uploads and review-state constraints.
- [ ] Integrate route/menu and independently review contracts/privacy.
- [ ] Typecheck, lint, unit tests, build, isolated mocked browser E2E and affected regressions.
- [ ] Publish PR, inspect CI/reviews, merge without bypass if allowed.

## Risks / non-goals

- Community endpoints are owner-only self-management, NOT a public feed. No fake publish/like/comment actions.
- Timeline `canShareToCommunity` is not an order-sharing API. TimelineShare currently uses manually supplied dated items; do not invent orderId mutation.
- Financial data must not render for veterinarian/groomer, including nested inpatient invoice.
- Date filters use clinic date strings; no client timezone shifts.
- Existing real-backend setup prerequisites remain; mocked E2E is not live integration proof.

## Verification evidence

Pending implementation. Do not infer completion from chat dispatch.
