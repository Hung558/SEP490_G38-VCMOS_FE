# Spec — FE quản lý chuồng/lồng

## 1. Mục tiêu

Nối FE với module cage management mới trong `SEP490_G38-VCMOS_BE` để nhân sự phòng khám có thể:

- Xem danh sách chuồng với filter, sort và phân trang server-side.
- Xem chi tiết một chuồng.
- Admin tạo chuồng mới.
- Admin cập nhật thông tin/trạng thái chuồng.
- Receptionist chỉ được xem danh sách/chi tiết; không được thấy hoặc thực hiện action ghi.

Đây là implementation theo contract BE hiện tại, không tự mở rộng nghiệp vụ phân chuồng cho thú cưng hay lưu trú.

## 2. Evidence và baseline

- BE cage commit: `ab426fe` (`Cage management`), trên BE `main` hiện tại `25380b9`.
- BE docs:
  - `SEP490_G38-VCMOS_BE/api/cages/get-cages.md`
  - `SEP490_G38-VCMOS_BE/api/cages/get-cage-by-id.md`
  - `SEP490_G38-VCMOS_BE/api/cages/create-cage.md`
  - `SEP490_G38-VCMOS_BE/api/cages/update-cage.md`
- BE routes: `GET /api/cages`, `GET /api/cages/:id` cho `Admin`, `Receptionist`; `POST /api/cages`, `PATCH /api/cages/:id` chỉ cho `Admin`.
- FE baseline: các trang `AdminUsers`, `AdminServices`, `AdminProducts` dùng Ant Design, domain service và component/hook riêng.
- FE rules: `ai_coding_rule.md`; axios instance tại `src/services/01_axios/index.ts` tự gắn Bearer token và trả `response.data`.
- FE hiện chưa có cage route, service, type hoặc page.

## 3. API contract

Base path là `/api` theo `VITE_API_ROOT`; service chỉ dùng path tương đối `/cages`, không tạo `/api/api/cages`.

### 3.1 List cages

`GET /api/cages`, Bearer token, role `Admin` hoặc `Receptionist`.

Query optional:

| Param        | Giá trị                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| `status`     | `Available` hoặc `Occupied`                                               |
| `size`       | `S`, `M`, `L`, `XL`                                                       |
| `isIsolated` | string query `true` hoặc `false`                                          |
| `page`       | số nguyên dương, mặc định `1`                                             |
| `limit`      | số nguyên `1..100`, mặc định `20`                                         |
| `sort`       | `label`, `size`, `status`, `createdAt`, `updatedAt`; thêm `-` để giảm dần |

Success `200`:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "6ad96d4a9664da6b2c0d8d70",
        "label": "A-01",
        "size": "M",
        "isIsolated": false,
        "status": "Available",
        "createdAt": "2026-11-05T03:15:42.118Z",
        "updatedAt": "2026-11-05T03:15:42.118Z",
        "__v": 0
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

FE dùng `data.items`, `data.total`, `data.page`, `data.limit`, `data.totalPages`; không tự phân trang lại toàn bộ dữ liệu.

### 3.2 Get cage detail

`GET /api/cages/:id`, Bearer token, role `Admin` hoặc `Receptionist`.

Success `200`: `{ success: true, data: Cage }`.

Errors: `400` id không hợp lệ, `401`, `403`, `404` không tìm thấy, `500`.

### 3.3 Create cage

`POST /api/cages`, Bearer token, role `Admin`.

Body:

```json
{
  "label": "A-01",
  "size": "M",
  "isIsolated": false,
  "status": "Available"
}
```

- `label` bắt buộc, trim, không rỗng, unique.
- `size` bắt buộc: `S | M | L | XL`.
- `isIsolated` optional boolean thật, mặc định BE là `false`.
- `status` optional: `Available | Occupied`, mặc định BE là `Available`.
- Chỉ gửi các field trên; không gửi `_id`, timestamps hoặc field tự suy diễn.

Success `201`: `{ success: true, message, data: Cage }`.
Duplicate label trả `409` với message `Nhãn chuồng đã tồn tại`.

### 3.4 Update cage

`PATCH /api/cages/:id`, Bearer token, role `Admin`.

Body patch gồm ít nhất một field trong `label`, `size`, `isIsolated`, `status`; field khác bị BE bỏ qua.

Success `200`: `{ success: true, message, data: Cage }`.
Errors gồm `400`, `401`, `403`, `404`, `409`, `500`.

## 4. Types đề xuất

```ts
export type CageSize = 'S' | 'M' | 'L' | 'XL';
export type CageStatus = 'Available' | 'Occupied';

export interface Cage {
  _id: string;
  label: string;
  size: CageSize;
  isIsolated: boolean;
  status: CageStatus;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface CageListParams {
  status?: CageStatus;
  size?: CageSize;
  isIsolated?: boolean;
  page?: number;
  limit?: number;
  sort?: CageSort;
}

export type CageSort =
  | 'label'
  | '-label'
  | 'size'
  | '-size'
  | 'status'
  | '-status'
  | 'createdAt'
  | '-createdAt'
  | 'updatedAt'
  | '-updatedAt';

export interface CageListData {
  items: Cage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CageCreatePayload {
  label: string;
  size: CageSize;
  isIsolated?: boolean;
  status?: CageStatus;
}

export interface CageUpdatePayload {
  label?: string;
  size?: CageSize;
  isIsolated?: boolean;
  status?: CageStatus;
}
```

Do not rely on a fabricated `cageCode`, `petId`, occupancy owner, admission, checkout or assignment field.

## 5. UX và quyền

### 5.1 Page và navigation

- Add a dedicated page, for example `src/pages/Cages/index.tsx`, with child components/hooks under `src/pages/Cages/components/`.
- Add route constant such as `ROUTER.CAGES` with a stable path (`/cages` or `/clinic/cages`; choose one consistent with existing route naming and document it in the implementation).
- The page must be accessible only to normalized exact roles `Admin` and `Receptionist`.
- Existing `RoleRoute` groups all clinic staff together; do not use that group alone because it would expose cages to Veterinarian/Groomer. Add an exact-role guard or equivalent page guard using `normalizeRole`.
- Add the menu item for Admin and Receptionist only. Veterinarian/Groomer must not receive the menu item and must be redirected by route guard.
- Admin sees list + detail + create + edit. Receptionist sees list + detail only.

### 5.2 List

- AntD `Table` or equivalent responsive card/table built from direct AntD components.
- Columns: label, size, isolation, status, created/updated time if useful, actions.
- Status labels:
  - `Available` → `Sẵn sàng`
  - `Occupied` → `Đang sử dụng`
- Size labels can be `S`, `M`, `L`, `XL`; isolation must be explicit `Có`/`Không`.
- Filters: status, size, isolation; sort; page size within BE limit.
- Reset filters returns page to `1`; changing a filter/sort also resets page to `1`.
- Empty state distinguishes no cages from no results under active filters.
- Show loading, retryable error and refresh action.
- Preserve the latest valid table state when a request fails.

### 5.3 Detail

- Detail action calls `GET /api/cages/:id`; table row is only an initial placeholder, not the final source.
- Show label, size, isolation, status, createdAt and updatedAt when available.
- Handle stale detail responses when users open multiple rows quickly; closing the modal must not allow an old response to reopen/overwrite it.

### 5.4 Create/edit

- Admin-only modal/drawer form.
- Create requires label and size; defaults `isIsolated=false`, `status=Available` in the form or lets BE defaults apply consistently.
- Edit supports partial update but the UI submits the complete current editable form as a valid patch; never submit an empty object.
- Client validation mirrors BE: trimmed non-empty label, valid enum values, real boolean values.
- Duplicate label `409` stays in the form and shows the BE message.
- `400 errors[]` is mapped to the relevant field or shown as a clear form-level error.
- On success show toast, close form, return to current list/filter state and refresh the affected page.
- Disable submit while pending and prevent double submit.
- Receptionist must not see create/edit controls; UI permission is not a replacement for BE authorization.

## 6. Error, race and security behavior

- Existing axios interceptor handles Bearer and 401 session expiry; page must not duplicate the 401 toast/redirect.
- `403`: show no-permission feedback and do not expose write controls after failure.
- `404`: show not-found feedback for detail/update; refresh list if the item disappeared.
- `409`: preserve form input and show `Nhãn chuồng đã tồn tại`.
- `400`: use `message`, `errors` and field-level mapping where possible.
- Network/500: Vietnamese fallback message, retry button, no data corruption.
- Use AbortController and/or request sequence guards for list/detail so stale responses cannot overwrite newer filter/detail state.
- Do not put role authorization, owner identity or write permissions in client-supplied API fields.
- No new dependency, no direct axios call from page components.

## 7. Non-goals / BE limitations

- No cage assignment to pets, owners, appointments or inpatient records.
- No occupancy history, check-in/check-out, transfer, delete or bulk actions; BE has no endpoints for them.
- No fake availability calculation or local mutation pretending a cage is occupied.
- No changes to BE, auth middleware, global axios behavior or unrelated booking code.
- Do not broaden access to Veterinarian/Groomer just because they are in the generic staff role group.

## 8. Acceptance criteria

1. Admin can open the cage page, list cages, filter by status/size/isolation, sort, paginate and refresh through the real API.
2. Receptionist can list and inspect cage details but cannot see create/edit actions.
3. Veterinarian, Groomer, PetOwner and guest cannot access the cage page; they are redirected safely.
4. Admin create sends only the documented fields and shows the returned cage after `201`.
5. Admin edit uses `PATCH /api/cages/:id` and reflects the returned object after `200`.
6. Duplicate label `409`, validation `400`, forbidden `403`, not-found `404`, auth `401` and network/500 have non-destructive feedback.
7. List and detail stale responses cannot overwrite current state; double submit is blocked.
8. Empty, loading, error/retry and responsive states work at 375px, 768px and desktop widths.
9. `npm test`, `npm run lint`, and `npm run build` pass; any pre-existing lint warning is reported separately.
10. Network smoke confirms exact relative paths, query values and payload fields against the BE docs.
