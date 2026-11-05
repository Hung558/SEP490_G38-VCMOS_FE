---
title: Frontend Cage Management
status: planned
created: 2026-11-05
---

# Plan — FE quản lý chuồng theo BE mới

## Baseline

- BE cage commit: `ab426fe`; BE current local HEAD: `25380b9`.
- FE current local HEAD: `c4d000f`.
- Canonical spec: `plans/20261105-frontend-cage-management/spec.md`.
- Execution handoff: `plans/20261105-frontend-cage-management/antigravity-handoff.md`.

## Constraints

- Tuân thủ `ai_coding_rule.md`: AntD trực tiếp, styled-components khi cần; service domain tách `urls.ts` + `index.ts`; component không gọi axios trực tiếp.
- Không sửa BE, không thêm dependency, không thay đổi axios interceptor/auth behavior.
- Page root chỉ chứa `index.tsx`; component, hook, style và helper của page nằm trong `components/`.
- Exact roles: Admin và Receptionist được đọc; chỉ Admin được tạo/cập nhật. Không dùng generic `staff` guard cho cage vì sẽ mở quyền cho Veterinarian/Groomer.
- Không commit/push trong quá trình thực thi nếu chưa được yêu cầu.

## Phases

- [x] [Phase 01 — Contract, types and service](phase-01-contract-and-service.md)
- [x] [Phase 02 — Route, role access and navigation](phase-02-route-role-navigation.md)
- [x] [Phase 03 — List, filters and detail](phase-03-list-filters-detail.md)
- [x] [Phase 04 — Admin create and update](phase-04-admin-write-workflows.md)
- [x] [Phase 05 — Verification and review](phase-05-verification.md)

## Phase 01 — Contract, types and service

- Add `Cage`, enum, params, list response and write payload types.
- Add `src/services/CageService/urls.ts` and `index.ts` using existing axios instance.
- Implement list/detail/create/update only; forward optional Axios config/signal if needed for cancellation.
- Add helpers for query sanitization, form validation, labels and API error extraction.
- Ensure response shape matches the interceptor: list/detail/create/update use `response.data` exactly once.

## Phase 02 — Route, role access and navigation

- Add route constant and page route.
- Implement exact role access for `Admin` and `Receptionist` using `normalizeRole`; do not rely on `getRoleGroup` alone.
- Add menu/breadcrumb entry only for Admin and Receptionist.
- Preserve existing landing behavior for all other roles.
- Confirm direct URL access is blocked for guest, PetOwner, Veterinarian and Groomer.

## Phase 03 — List, filters and detail

- Create `Cages` page with hook/components following AdminProducts conventions.
- Load paginated list with status/size/isolation/sort/page/limit query values.
- Add table/card responsive rendering, status/size/isolation labels, empty/loading/error/retry states.
- Add server-side pagination and reset page when filters/sort change.
- Add detail modal/drawer using the detail endpoint and stale-response protection.

## Phase 04 — Admin create and update

- Add Admin-only create/edit modal/drawer.
- Validate label and enum values locally; submit only documented fields.
- Map `400 errors[]`, `409` duplicate label, `403`, `404`, `500/network` without losing user input.
- Disable pending actions and prevent double submit.
- Refresh the current list after successful create/update while preserving active filters where valid.

## Phase 05 — Verification and review

- Run `npm test`, `npm run lint`, and `npm run build`.
- Test exact role matrix: Admin, Receptionist, Veterinarian, Groomer, PetOwner, guest.
- Test list filters, sort, pagination, empty, retry, detail, stale requests, create, update and duplicate label.
- Inspect network paths/query/payloads; ensure no unsupported fields or `/api/api` prefix.
- Verify responsive layout at 375px, 768px and desktop.
- Review diff against every acceptance criterion and report blocked BE/auth prerequisites.

## Definition of done

- All five phases checked with evidence.
- No mock cages or fake write success remain in the implemented page.
- Exact BE roles and payload contract are preserved.
- Tests, lint, build and browser/network smoke are reported accurately.
