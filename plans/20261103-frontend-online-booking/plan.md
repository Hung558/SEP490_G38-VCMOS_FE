---
title: Frontend Online Booking Integration
status: completed
created: 2026-11-03
completed: 2026-11-03
---

# Plan — FE đặt lịch online theo BE mới

## Baseline

- BE local HEAD: `d169f1c`; FE local HEAD: `b9a83c5`.
- Canonical spec: `plans/20261103-frontend-online-booking/spec.md`.
- Handoff guide: `plans/20261103-frontend-online-booking/antigravity-handoff.md`.

## Constraints

- Tuân thủ `ai_coding_rule.md`: AntD trực tiếp, styled-components khi cần, domain service `urls.ts` + `index.ts`; component không gọi axios trực tiếp.
- Không đổi BE contract, auth interceptor, global theme hoặc thêm dependency.
- Page root chỉ `index.tsx`; component/hook/style cục bộ nằm trong `components/`.

## Phases

- [x] [Phase 01 — Contract and service](phase-01-contract-and-service.md)
- [x] [Phase 02 — Real booking flow](phase-02-ui-and-workflows.md)
- [x] [Phase 03 — History and detail](phase-03-history-and-detail.md)
- [x] [Phase 04 — Verification](phase-04-verification.md)

### Phase 01 — Contract, service, types

- [x] Tạo `src/services/AppointmentOrderService/urls.ts` với create/list/detail.
- [x] Tạo `src/services/AppointmentOrderService/index.ts`; export typed methods.
- [x] Tạo types trong domain phù hợp (`src/types/api/appointment.api.ts`).
- [x] Kiểm tra path không bị `/api/api`, response interceptor không unwrap sai.

### Phase 02 — Real booking flow

- [x] Refactor `src/pages/Home/components/QuickBookingSection.tsx` để dùng active pets + DatePicker + note + POST thật.
- [x] Require normalized `PetOwner` via `normalizeRole`; no unknown-role fallback.
- [x] Xóa unsupported service/staff/time-slot UI và marketing promises; không gửi ngoài payload.
- [x] Giữ login gate, no-pet CTA, loading, success code và error mapping.
- [x] Không dùng `setTimeout` như kết quả đặt lịch.

### Phase 03 — Appointment history/detail

- [x] Tách component `src/pages/Dashboard/components/AppointmentDetailModal.tsx`.
- [x] Nối list API, filters, server pagination, pet-name mapping, status labels.
- [x] Cập nhật/bỏ consumers cũ `activeAppointments`, `completedAppointments`, stats và live stepper; không đọc fields không có trong API hoặc gọi `Done` là SOAP.
- [x] Nối detail API và stale-request guard với AbortController và sequence ref.
- [x] Giữ các luồng pet hiện tại nguyên vẹn.

### Phase 04 — Verification and review

- [x] Chạy `npm test` (63/63 passed), `npm run lint` (0 errors), `npm run build` (tsc -b passed).
- [x] Browser smoke qua Playwright: guest, owner no-pet, create 201, duplicate 409, list/filter/pagination, detail, 401/403.
- [x] Responsive 375/768/desktop.
- [x] Review diff against every acceptance criterion; fix race condition and UX feedback.

## Definition of done

- [x] Spec acceptance 1–10 có evidence.
- [x] Không còn fake success/mock appointment trong luồng đã nối.
- [x] API/network payload khớp docs BE.
- [x] Lint/build/browser checks pass.
