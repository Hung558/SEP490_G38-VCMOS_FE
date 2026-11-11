---
title: FE implementation plan for verified feedback/API gaps
status: completed
created: 2026-11-11
updated: 2026-11-11
---

# Implementation plan

## Baseline

- FE revision audited: `322019e784e3224a73b3dbbb816f7f829f2230ba`.
- BE revision audited: `b3cd61c956af8dae70a2d2e524f6bfe4f6199c29` -> updated to `63f0bb2b57232039f6036e24ee975b92f359519e` (PR #35 BE).
- Gap 1: Form đặt lịch online một màn hình và gỡ bỏ booking wizard khỏi landing page (Đã hoàn thành - PR #25).
- Gap 2: Chuồng chờ đón sau khám cho Bác sĩ (`waitingCageId`), phân quyền chuồng cho Bác sĩ/Groomer (Đã unblock và hoàn thành - PR #26).
- Sửa lỗi tràn chữ nút "Thêm dịch vụ" trên bảng lịch hẹn Dashboard (Đã hoàn thành - PR #25).

## Likely files

Booking:

- `src/pages/Home/components/QuickBookingSection.tsx`
- `src/pages/Home/components/BookingServiceStep.tsx`
- `src/pages/Home/index.tsx`
- `src/pages/Home/components/HeroSection.tsx`
- `src/pages/Home/components/ServicesSection.tsx`
- `src/pages/Home/components/DoctorsSection.tsx`
- `src/pages/Dashboard/index.tsx`
- `tests/online-appointment-service.test.mjs`
- `tests/verify_feedback_parity_e2e.py`

SOAP waiting cage & cage authorization (PR #26):

- `src/pages/ExamRecord/components/SoapForm.tsx`
- `src/pages/StaffQueue/index.tsx`
- `src/routerMap/AppRouter.tsx`
- `src/routerMap/MenuItem.tsx`
- `tests/clinic.test.mjs`
- `tests/verify_vet_cage_e2e.py`

## Phases

- [x] Phase 1 — Reconfirm current BE contracts and FE callers
- [x] Phase 2 — Refactor owner booking into one Dashboard form
- [x] Phase 3 — Route landing booking CTAs into Dashboard
- [x] Phase 4 — Record the BE prerequisite for waiting-cage UI
- [x] Phase 5 — Add focused booking tests and regression verification
- [x] Phase 6 — Integrate waiting cage for Veterinarian & Groomer (Unblocked by BE PR #35)
- [x] Phase 7 — Git Flow, PR review and Merge to `main`

## Phase details

### Phase 1: Contract and caller reconfirmation

- Confirm booking combined endpoint and exact whitelist against current validator/docs.
- Confirm date/note/service validation helpers and current catalog cancellation guards; preserve them.
- Confirm `waitingCageId` validation, cage eligibility/availability constraints, omitted-vs-null behavior, and completion response.
- Trace all `QuickBookingSection` callers and all complete-payload builders before editing.

### Phase 2: One-screen Dashboard booking

- Replace four-step visibility/state with one form presenting pet, services, date, note, and final confirmation together.
- Keep the current combined booking service method, Active filtering, request cancellation/stale guards, pet prefill, duplicate-submit prevention, server errors and success callbacks.
- Use existing validation helpers for the full form and map errors to visible fields.
- Remove or adapt step-only child usage without changing unrelated service selection behavior.
- Mở rộng cột Hành động trên bảng lịch hẹn Dashboard lên 240px, scroll x 960px khắc phục tràn nút "Thêm dịch vụ".

### Phase 3: Landing CTA migration

- Stop rendering the full booking component on Home.
- Route signed-in PetOwner booking/service/doctor CTAs to `/dashboard?tab=appointments&book=new` hoặc prefill tương thích.
- Reuse current login modal/return behavior for guests; do không tự tạo auth flow mới.
- Verify direct Dashboard query params, browser back/forward and post-booked navigation.

### Phase 4: Waiting-cage backend prerequisite (Unlocked by BE PR #35)

- BE đã merge PR #35: mở quyền `GET /api/cages`, `GET /api/cages/:id`, `POST /api/cage-assignments` cho `Veterinarian` và `Groomer`.
- BE tự động kiểm tra tải trọng chuồng theo cân nặng thú cưng (BR-11: S <= 5kg, M <= 15kg, L <= 30kg, XL không giới hạn) khi truyền `waitingCageId`.

### Phase 5: Verification for Phase 1-3

- Chạy test suite: 140 pass.
- TypeScript, lint, build pass 100%.
- Playwright E2E `verify_feedback_parity_e2e.py`: 5/5 pass.

### Phase 6: Integrate waiting cage for Veterinarian & Groomer (PR #26)

- `SoapForm.tsx`: Thêm dropdown chọn chuồng chờ đón (`waitingCageId`), tự động tải danh sách chuồng trống `status=Available`, kiểm tra cân nặng thú cưng và disable các chuồng quá tải (BR-11) kèm tag cảnh báo.
- `StaffQueue/index.tsx`: Mở nút "Chuồng" cho cả Bác sĩ và Groomer để xem thông tin và giải phóng chuồng (`PATCH /api/cage-assignments/:id/release`).
- `AppRouter.tsx` & `MenuItem.tsx`: Mở quyền route `/cages` và menu "Quản lý chuồng" cho Bác sĩ và Groomer.
- Viết unit test trong `tests/clinic.test.mjs` và browser E2E test `tests/verify_vet_cage_e2e.py` (3/3 pass).

### Phase 7: Git Flow, PR review and Merge to `main`

- PR #25: `b1ba60b` -> PR #25 -> Merged into `main` (`e570116`).
- PR #26: `a3c5feb` -> PR #26 -> Merged into `main` (`4f8f806`).
- Đồng bộ nhánh `main` trên local và remote, working tree cả 2 repo hoàn toàn sạch sẽ.

## Definition of done

- Đã đáp ứng 100% các tiêu chí trong `spec.md`.
- 141/141 Unit tests pass.
- TypeScript check: 0 lỗi.
- Linter: 0 cảnh báo/lỗi.
- Production build: Thành công.
- Browser E2E: Tất cả các kịch bản test trên trình duyệt thật đều pass 100%.
- Đã merge vào `main` chuẩn Git Flow.
