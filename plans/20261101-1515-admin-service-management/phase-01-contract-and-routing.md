# Phase 01 — Contract, domain service và routing

## Đầu vào

Đọc [spec](spec.md), xác nhận baseline BE không đổi. Không code theo tên commit mà bỏ qua validator/controller thực tế.

## File targets

| File                                   | Thay đổi                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/services/ServiceService/urls.ts`  | URL list `/services`, detail `/services/:id`, status `/services/:id/status`                                     |
| `src/services/ServiceService/types.ts` | Read model, category/status unions, filters, create/full update payloads, response envelopes, field-error shape |
| `src/services/ServiceService/index.ts` | `listServices`, `getService`, `createService`, `updateService`, `updateStatus`; export types; không hàm delete  |
| `src/routerMap/ROUTER.ts`              | `ADMIN_SERVICES: '/admin/services'`                                                                             |
| `src/routerMap/AppRouter.tsx`          | Import AdminServicesPage, thêm child cùng nhánh AdminRoute với AdminUsers                                       |
| `src/routerMap/MenuItem.tsx`           | Thêm menu Admin và title entry nếu consumer dùng ListTitleRouter                                                |
| `src/routerMap/breadcrumbMap.ts`       | Thêm `services: 'Quản lý dịch vụ'`; Breadcrumb thực tế map theo segment                                         |
| `src/pages/AdminServices/index.tsx`    | Page scaffold được guard, orchestration; không thêm file khác ở page root                                       |

Types đặt service-local, import qua `@/services/ServiceService` hoặc relative; **không dùng `@/types/...`** vì tsconfig.app hiện map alias đó sang `../../packages/types/*`, không phải `src/types`.

## Checklist

- [ ] Xác nhận VITE_API_ROOT ghép `/services` ra đúng `/api/services`, không đọc/ghi giá trị secret vào docs.
- [ ] Dùng axios instance `../01_axios`, có Bearer interceptor sẵn. Không tạo axios client mới.
- [ ] Typed response đúng body đã unwrap: `{ services }` / `{ service }`. Dùng Axios response generic phù hợp nếu cần, không cast bừa AxiosResponse thành domain object.
- [ ] Query chỉ search/category/status, bỏ undefined/empty; search trim.
- [ ] Payload POST/PUT là whitelist, numeric JSON thật; required write fields không dùng Partial; code không gửi.
- [ ] Export types/methods để UI không chứa URL hoặc HTTP calls trực tiếp.
- [ ] Route mới dưới AdminRoute, không dưới PublicRouters/ProtectedRoute đơn thuần; không thay auth guard ngoài nhu cầu feature.
- [ ] Menu mới chỉ xuất hiện trong MenuItemAdmin; bảo toàn mục quản lý tài khoản.
- [ ] Thêm nhãn trong `src/routerMap/breadcrumbMap.ts`, vì `src/components/layout/Breadcrumb/Breadcrumb.tsx:6` đọc map này, không đọc MenuItemBreadcrumbs; không sửa consumer khi data entry đã đủ.

## Exit criteria

Có contract typed, URL/service đúng, route/menu scaffolding dưới guard hiện có. Không có DELETE adapter, không tự mở trang guest, không sửa BE. Đến khi toàn bộ phase sau hoàn thành mới coi feature hoạt động.
