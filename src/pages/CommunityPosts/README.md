# Bài viết của tôi — BE PR53

## Scope / integration

- Base FE: `ad5fe27`; backend contract inspected at `3d56eaa` on 2026-11-19.
- Default export of this directory: `CommunityPostsPage`. Lead owns mounting it at
  `/community/my-posts`, router/menu permissions and navigation. This module does
  not change router, menu, PetProfile or the main checkout.
- Page mounts API consumers only for `PetOwner` (`role` / `systemRole`); backend
  remains responsible for authentication, ownership and atomic status checks.
- No public feed, likes, comments, moderation actions or appointment-derived
  timeline APIs are implemented or simulated in the product.

## Implementation plan / acceptance

1. [x] Type and isolate the five owner CRUD endpoints under `/community-posts`.
2. [x] Paginated list (10/page), server filters for type/status, reset page on
       filter change, loading/error/empty/retry and page correction after removal.
3. [x] Fetch fresh detail before offering edits; show all four moderation statuses,
       moderation note and manual timeline. Only `PendingReview` offers edit/delete.
4. [x] Create/edit `Discussion` (required content) and `TimelineShare` (active owned
       pet, 1–50 dated/titled manual items). Pet selector reads every result page.
5. [x] Always use multipart for POST/PUT. Full replacement payload deliberately
       retains or removes image URLs; new photos use `image` / `timelineImages`
       and zero-based packed `imageIndex`. No caller-supplied ownership/status.
6. [x] Validate JPEG/PNG/WebP, 5 MB/file, 1 cover plus at most 10 new item photos;
       5,000-character content, 200-character titles and actual calendar dates.
7. [x] Explicit delete confirmation; preserve draft/files on server validation,
       network/upload failure or 409. Lock repeat writes after 409/404, without
       discarding the draft. Closing editor refetches current server status.
8. [x] Vietnamese copy, associated native labels, keyboard-operable controls,
       focus first invalid input, modal focus handling, error announcements and
       unsaved-change confirmation. Display remote photos only via HTTP(S);
       local previews use revocable object URLs.
9. [x] Focused contract/transport tests, isolated desktop browser QA, full existing
       Node test suite, typecheck, focused lint and production build.

## Verification (2026-11-19)

- `node --experimental-strip-types --test tests/community-post.test.mjs`:
  19 passing contract/transport tests.
- `npm test`: 284 passing tests (integrated timeline/community branch), zero failures.
- `npx tsc -b --pretty false`: passed.
- `npx eslint src/services/CommunityPostService src/pages/CommunityPosts tests/community-post*.mjs`:
  passed.
- `npm run build`: passed. Existing large application chunk warning remains.
- Isolated headless Chrome harness: 12 passing checks, no page errors; covers
  pagination/status filters, multipart PUT, retained draft/photo on 409, inline
  400 errors/retry, explicit delete/cancel/409, read-only Published, soft-delete
  refresh, keyboard/validation/manual timeline create and non-owner API guard.

### Reproduce mocked desktop QA

Install/use an available Playwright runtime without changing product dependencies.
Set `COMMUNITY_POST_PLAYWRIGHT_MODULE` to that package's absolute `index.mjs` if it
is not resolvable locally, and optionally `COMMUNITY_POST_BROWSER_CHANNEL=chrome`.
Then run `node tests/community-post-browser.mjs`.

The script starts a temporary Vite harness at `127.0.0.1:3103`, forces an empty API
root, mocks owner API responses, blocks non-local network requests and always
closes its server/browser in `finally`. It does not start FE on port 3000 or use
real BE/Cloudinary. No persistent harness files or product routes are created.

## Remaining integration / verification

- Integrated owner-only route and sidebar/header navigation are included in the
  final feature branch. Full-page community E2E: 9/9; see the integration plan for
  complete regression evidence.
- Real token/owner isolation, concurrent moderation with a real backend and real
  Cloudinary uploads still need integration QA. Browser QA uses mocked responses.
- TimelineShare is authored manually; there is no automatic order/exam link.
- Existing BE image removal unlinks the URL but does not delete Cloudinary assets.
- `ak` CLI is not available on this host. No journal is written outside the
  explicitly owned paths; this document records module delivery evidence.

## Update 2026-11-21 (branch `trung/community`, BE PR #55–#57)

- The public feed, likes, comments, reports and Admin moderation now exist:
  `/community`, `/community/posts/:postId`, `/admin/community-moderation`
  (`services/CommunityService`, `services/CommunityModerationService`).
- TimelineShare is no longer authored manually (K4). The editor writes
  discussions only; a share is built by the BE from the pet's Done visits via
  "Chia sẻ hành trình" on the pet profile (`POST /community-posts/timeline-share`,
  BR-18). A pending TimelineShare can be deleted but not edited.
- A Published post can be withdrawn from its detail ("Thu hồi bài viết",
  `PATCH /community-posts/:id/withdraw`) and opened on the community.
- `?compose=1` opens the editor on arrival ("Viết bài trao đổi" on the feed and
  the home page).
