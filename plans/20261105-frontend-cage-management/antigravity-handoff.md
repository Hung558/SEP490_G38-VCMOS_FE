# AntigravityIDE handoff — FE cage management

Bạn đang làm việc trong repo `SEP490_G38-VCMOS_FE`. Đây là task chuẩn bị thực thi từ BE cage management mới; hãy đọc toàn bộ tài liệu trước khi code:

- `plans/20261105-frontend-cage-management/spec.md`
- `plans/20261105-frontend-cage-management/plan.md`
- `plans/20261105-frontend-cage-management/phase-01-contract-and-service.md`
- `plans/20261105-frontend-cage-management/phase-02-route-role-navigation.md`
- `plans/20261105-frontend-cage-management/phase-03-list-filters-detail.md`
- `plans/20261105-frontend-cage-management/phase-04-admin-write-workflows.md`
- `plans/20261105-frontend-cage-management/phase-05-verification.md`
- `ai_coding_rule.md`
- `src/services/01_axios/index.ts`
- `src/constants/roles.ts`
- `src/routerMap/ROUTER.ts`
- `src/routerMap/AppRouter.tsx`
- `src/routerMap/MenuItem.tsx`
- `src/pages/AdminProducts/index.tsx`
- `src/pages/AdminProducts/components/useProductManagement.ts`

## Assignment

Implement the plan end-to-end against the exact BE contract below. Do not invent fields, endpoints or permissions.

### BE endpoints

- `GET /api/cages`, roles `Admin`, `Receptionist`; query `status`, `size`, `isIsolated`, `page`, `limit`, `sort`; response `{ success, data: { items, total, page, limit, totalPages } }`.
- `GET /api/cages/:id`, roles `Admin`, `Receptionist`; response `{ success, data }`.
- `POST /api/cages`, role `Admin`; body `{ label, size, isIsolated?, status? }`; success `201 { success, message, data }`.
- `PATCH /api/cages/:id`, role `Admin`; body has at least one of `{ label?, size?, isIsolated?, status? }`; success `200 { success, message, data }`.

Enums:

- size: `S | M | L | XL`
- status: `Available | Occupied`
- isIsolated: real boolean

### Required implementation

1. Add typed `CageService` under `src/services/CageService/` with `urls.ts`, `index.ts`, helpers/types as appropriate. Use the existing axios instance and respect its response interceptor.
2. Add a dedicated cage page and route. Exact normalized roles must be enforced: Admin and Receptionist can read; only Admin can create/edit. Do not use the generic `staff` role group alone because Veterinarian and Groomer must not gain access.
3. Add menu/breadcrumb entry only for Admin and Receptionist. Preserve existing routes and role landing behavior.
4. Implement server-side list filters, sort and pagination with loading, empty, retry/error and responsive states. Detail must call the detail endpoint and guard stale responses.
5. Implement Admin-only create/edit UI. Validate and trim label, validate enums/boolean, submit only documented fields, preserve form input on errors and prevent double submit.
6. Handle 400 `message/errors`, 401 via interceptor, 403, 404, 409 duplicate label, 500/network without duplicate or destructive feedback.
7. Do not add delete, pet/owner assignment, occupancy history, check-in/out, bulk actions, service/staff fields or local fake mutations.
8. Follow AntD direct imports, styled-components conventions, page component-folder rule, and no new dependency. Do not modify BE. Do not commit or push unless explicitly requested.

## Verification required

Run and report:

- `npm test`
- `npm run lint`
- `npm run build`

Also verify with local FE/BE where available:

- Admin: list, filters, sort, pagination, detail, create, update.
- Receptionist: list/detail only; no create/edit controls.
- Veterinarian/Groomer/PetOwner/guest: blocked or redirected.
- Validation `400`, duplicate label `409`, forbidden `403`, not-found `404`, auth/network failures.
- Exact request paths, query strings and payload whitelist; no `/api/api` and no unsupported fields.
- Responsive 375px, 768px and desktop layouts.

Report exact checks actually run and blocked prerequisites. Do not claim browser/network verification if the local BE or credentials are unavailable.
