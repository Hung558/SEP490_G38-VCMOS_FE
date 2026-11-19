# Contract and acceptance specification

## Unified pet timeline (BE #54)

Source authority: BE `src/services/petTimeline.service.js`, validator/controller and `api/pets/get-pet-timeline.md` at `3d56eaa`.
GET `/pets/:petId/timeline` returns bare `{pet,summary,activeInpatient,timeline,sharedPosts,pagination}` (verify exact source keys).
Query: `type=All|Examination|Vaccination|Grooming|Paraclinical|Inpatient`, optional order status/from/to, page>=1, limit 1..50.
PetOwner own pets only; clinic roles any pet. Invoice fields are owner/reception/admin only.

- Render server summary, actual active admission, visits with service/medical/prescription/subtask/grooming/inpatient/cage information.
- Server filters/pagination; changing filters resets page. Valid inclusive date range; useful reset/empty/retry states.
- Preserve SOAP access and owner `#inpatient-logs` link. Discard stale pet/account responses.
- 403/404 display access/not-found safely, not data from previous route.
- All free text escaped by React; images/URLs handled safely; no raw HTML.

## My community posts (BE #53)

Source authority: BE `src/routes/communityPost.routes.js`, controllers/services/validators, upload middleware.
Route `/community/my-posts`, PetOwner only; navigation label 'Bài viết của tôi'.
GET collection returns bare `{posts,pagination}`; GET item returns `{post}`; create/update response checked against controller.
POST and PUT multipart only, `image` primary and `timelineImages` indexed per JSON timelineItems. Validate actual backend upload limits.
Discussion requires trimmed content <=5000. TimelineShare requires own active pet + 1..50 dated items, title<=200; optional content.
Create/update return `{message,post}`, delete `{message}`. PUT replaces editable payload; retaining image requires matching existing imageUrl; omitting removes. Never send author/status/moderation/counters.
Only PendingReview editable/deletable. Deleted is soft-Removed; explain moderation statuses. Confirm removal.

- List status/type filters + pagination, detail, create/update/remove with real server state.
- Busy-submit lock; errors inline; preserve input/files on validation, upload failure,409; refresh conflicting server state without destructive automatic retry.
- No arbitrary external image URL entry, fake public feed, moderation, like/comment controls.

## Definition of done

Both features accessible from desktop with explicit next actions; contract unit checks and browser E2E run with isolated API mocks; existing reception/inpatient/owner workflows not regressed. Publish exact evidence and live-BE verification gaps in PR. Merge only with required checks/reviews satisfied.
