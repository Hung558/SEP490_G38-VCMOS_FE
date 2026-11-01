# Spec — Admin quản lý danh mục dịch vụ

## 1. Tính năng mới nhất là gì?

BE local `main` tại `a35fdc9` merge commit tính năng `2778140` ngày 31/10/2026: **Admin Feature/ Service Management**, quản trị danh mục dịch vụ (SCR-29 / UC-66) và API đọc công khai (SCR-02 / UC-01).

BE cung cấp: list/search/filter, detail, tạo mới, cập nhật đầy đủ thông tin và bật/tắt Active/Inactive. Mã dịch vụ được sinh ở BE. **DELETE bị cấm**, không phải soft delete.

FE hiện có quản lý tài khoản (`AdminUsers`), `AdminRoute`, `MainLayout`, role-based sidebar và axios client; chưa có trang/service/route quản lý dịch vụ. Không dùng kế hoạch quản lý tài khoản cũ để suy ra rằng phần Admin đó chưa có.

### Bằng chứng source

Đường dẫn BE tương đối từ repo FE:

- [Routes và quyền](../../../SEP490_G38-VCMOS_BE/src/routes/service.routes.js): GET public tại dòng 7–9; các mutation Admin tại dòng 11–15.
- [Controller](../../../SEP490_G38-VCMOS_BE/src/controllers/service.controller.js): response tại dòng 8–70; DELETE 403 tại dòng 74–78.
- [Validator](../../../SEP490_G38-VCMOS_BE/src/validators/service.validator.js): enum/range tại dòng 3–9, validation tại dòng 12–82.
- [Service nghiệp vụ](../../../SEP490_G38-VCMOS_BE/src/services/service.service.js): filter/search/sort dòng 27–54, create dòng 72–114, update dòng 117–165, status dòng 168–184.
- [Model](../../../SEP490_G38-VCMOS_BE/src/models/Service.js): fields/timestamps/index dòng 3–20.
- [Contract tests hiện có](../../../SEP490_G38-VCMOS_BE/tests/service.test.js). Chỉ đọc làm tham chiếu, chưa chạy trong bước planning.
- FE: `src/pages/AdminUsers/index.tsx`, `src/pages/SUPPORTPAGES/AdminRoute/index.tsx`, `src/routerMap/{AppRouter.tsx,MenuItem.tsx}`, `src/services/01_axios/index.ts`.

## 2. Outcome và phạm vi

Admin truy cập **`/admin/services`**, xem và quản lý danh mục mà không ảnh hưởng lịch sử lịch hẹn/hóa đơn. Giao diện tiếng Việt; enum gửi nguyên tiếng Anh theo BE.

Trong phạm vi: bảng + search/filter + phân trang client, detail modal, create/edit modal, confirm đổi status, feedback/validation và responsive.

Ngoài phạm vi: trang danh mục công khai cho khách, booking/payment, category CRUD, ảnh/upload, code tự nhập, xóa/khôi phục, lịch sử audit, bulk/export, sửa BE. GET public là khả năng BE đã có, **không đồng nghĩa phải xây thêm trang khách** trong đợt FE Admin này.

## 3. Contract API hiện tại

Base HTTP: `/api/services`. Với axios hiện tại, dùng URL service `/services` nếu `VITE_API_ROOT` đã kết thúc bằng `/api`; kiểm tra config local trước tích hợp để tránh `/api/api/services`. Không hardcode host.

| Method | Path đầy đủ                | Quyền BE       | Input                                   | Thành công                         |
| ------ | -------------------------- | -------------- | --------------------------------------- | ---------------------------------- |
| GET    | `/api/services`            | Public         | query `search?`, `category?`, `status?` | 200 `{ services: Service[] }`      |
| GET    | `/api/services/:id`        | Public         | Mongo ObjectId                          | 200 `{ service: Service }`         |
| POST   | `/api/services`            | Admin + Bearer | create body                             | 201 `{ service: Service }`         |
| PUT    | `/api/services/:id`        | Admin + Bearer | full editable body                      | 200 `{ service: Service }`         |
| PATCH  | `/api/services/:id/status` | Admin + Bearer | `{ status: 'Active' \| 'Inactive' }`    | 200 `{ service: Service }`         |
| DELETE | `/api/services/:id`        | Admin + Bearer | Không dùng                              | **403**, hướng dẫn chuyển Inactive |

- Search trim, không phân biệt hoa/thường, tìm literal substring trong `name`, `code`, `description`; BE escape regex. Không hứa tìm bỏ dấu.
- Không truyền filter rỗng. Không có query page/limit/sort, total hoặc server pagination.
- BE sort `createdAt` giảm dần. FE phân trang từ mảng kết quả BE; tổng là `services.length`.
- GET không filter status trả cả Active và Inactive, kể cả guest. Admin mặc định “Tất cả”; không giả định BE tự ẩn Inactive.
- Axios response interceptor đã trả `response.data`; đọc `result.services` / `result.service`, không `.data.services` lần nữa.

### Types đề xuất

```ts
export type ServiceCategory =
  | 'Examination'
  | 'Vaccination'
  | 'Grooming'
  | 'Paraclinical'
  | 'Inpatient';
export type ServiceStatus = 'Active' | 'Inactive';

export interface Service {
  _id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  defaultDuration?: number;
  basePrice?: number;
  status: ServiceStatus;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceFilters {
  search?: string;
  category?: ServiceCategory;
  status?: ServiceStatus;
}

export interface ServiceWritePayload {
  name: string;
  category: ServiceCategory;
  defaultDuration: number;
  basePrice: number;
  description?: string;
  status?: ServiceStatus;
}
```

Read fields duration/price optional vì schema model không bắt buộc ở dữ liệu cũ; POST/PUT vẫn bắt buộc. Không hiển thị giá thiếu thành 0 miễn phí. Không đưa `__v`, `_id`, timestamps/code vào write payload. Có thể đặt tên riêng `CreateServicePayload`/`UpdateServicePayload` dựa trên cùng shape; **PUT không dùng Partial**.

Ví dụ POST:

```json
{
  "name": "Khám tổng quát",
  "category": "Examination",
  "defaultDuration": 30,
  "basePrice": 150000,
  "description": "Kiểm tra sức khỏe tổng quát",
  "status": "Active"
}
```

### Validation chính xác

| Field             | Quy tắc                                                                        | UX                                                                       |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `code`            | BE tự sinh `SRV-XXXXXX`, alphabet bỏ 0/O/1/I                                   | Read-only khi edit/detail, không gửi body                                |
| `name`            | Required, trim, 3–100 ký tự                                                    | Input + validator trim; chỉ whitespace không hợp lệ                      |
| `category`        | Required, 1 trong 5 enum                                                       | Select cố định                                                           |
| `defaultDuration` | Required, **số nguyên 5–480 phút**                                             | InputNumber min/max/precision 0 + validator số nguyên                    |
| `basePrice`       | Required, số hữu hạn >= 0; BE không quy định max hoặc bắt buộc nguyên          | InputNumber; cho phép 0 và số thập phân, không tự áp ceiling/precision 0 |
| `description`     | Optional, string, tối đa 500 sau trim                                          | TextArea; gửi `''` để xóa mô tả khi edit                                 |
| `status`          | Optional POST/PUT, chỉ Active/Inactive; POST mặc định Active; PUT thiếu giữ cũ | Create hiển thị mặc định Active; edit đổi trạng thái qua action riêng    |

- Name trùng trong cùng category (trim, case-insensitive) trả 409; tên giống nhau khác category được phép. Không tự chặn bằng danh sách đang filter vì không đầy đủ.
- PUT cần gửi đủ name/category/duration/price. Description omitted/null khi PUT giữ cũ; `''` xóa. Create mô tả rỗng có thể được lưu thành thiếu/chuỗi rỗng tùy input; UI đều hiển thị “—”.
- Edit đề xuất **không gửi status**, giữ status mới nhất ở BE và tránh ghi đè khi người khác đổi trạng thái. Đổi status dùng PATCH riêng.

### Lỗi

- 400 validation `{ message: string, errors: Record<string, string> }`; list filter/ID sai có thể chỉ có `{ message }`.
- 401/403 do auth/quyền: thông báo hết quyền/phiên, theo luồng hiện có; không retry mutation tự động.
- 404 detail/update/status: record không tồn tại; đóng hoặc đánh dấu dữ liệu đã lỗi thời, refetch list.
- 409 duplicate: giữ form, hiển thị lỗi name và message BE; user có thể sửa tên/category.
- 500/network/timeout: fallback tiếng Việt, giữ input và cho retry chủ động. Timeout mutation có thể đã ghi DB; khuyến nghị tải lại trước khi tạo lại để tránh tạo trùng.
- Chỉ map `errors` có tên trùng field form; lỗi còn lại hiển thị alert/toast. HTTP error interceptor hiện không toast; page chịu trách nhiệm một thông báo, không thêm toast global.

## 4. UI/UX

### 4.1 Trang danh sách

Heading “Quản lý dịch vụ”; subtitle “Quản lý danh mục, giá niêm yết và trạng thái cung cấp dịch vụ”. Nút “Thêm dịch vụ”, “Làm mới”. Menu Admin mới nằm cạnh “Quản lý tài khoản”, không thay thế menu cũ.

Toolbar: search placeholder “Tìm mã, tên hoặc mô tả dịch vụ”; search submit bằng Enter/nút tìm (không cần gọi mỗi phím), category Select clearable, status Select clearable. Clear search áp dụng từ khóa rỗng; filter đổi gọi API với search đã submit, không phải draft chưa submit. Có thể thêm “Xóa bộ lọc”.

Bảng rowKey `_id`: mã, tên, danh mục, thời lượng (phút), giá, trạng thái, hành động. Giá hiển thị VND với `Intl.NumberFormat('vi-VN')`, không làm tròn mất phần thập phân có thật. Status tag Active xanh “Đang cung cấp”, Inactive trung tính “Ngừng cung cấp”.

Danh mục: Examination “Khám bệnh”; Vaccination “Tiêm phòng”; Grooming “Chăm sóc / làm đẹp”; Paraclinical “Cận lâm sàng”; Inpatient “Lưu trú / nội trú”. Đây là nhãn FE đề xuất, enum không đổi.

Actions: “Chi tiết”, “Sửa”, “Ngừng cung cấp” hoặc “Kích hoạt”. **Không có Xóa**. Page size theo constants repo, mặc định 10; filter/search mới reset page 1, mutation/refresh giữ page nếu hợp lệ rồi clamp.

State: loading, empty toàn danh mục, không có kết quả theo filter, error + retry riêng biệt. Không đổi error thành empty thành công. Khi refetch fail có thể giữ dữ liệu cũ với alert “Dữ liệu chưa được cập nhật”. Request sequence/cleanup bảo đảm response cũ không ghi đè response mới.

### 4.2 Create/edit modal

AntD Form dùng chung component theo mode; tách type/mapping helper, không tạo wrapper Input/Button custom. Create có status default Active; edit có code read-only, trạng thái read-only và nhắc dùng action đổi trạng thái bên ngoài.

Mở edit gọi GET detail trước khi set form để không sửa dữ liệu stale trên table. Loading/errors/retry rõ, không mở form trống khi detail fail. Reset form khi chuyển record/mode hoặc đóng; save disabled khi loading/pending; ngăn đóng/hủy trong lúc ghi để tránh hiểu sai kết quả. Sau thành công đóng, toast đúng một lần, refetch giữ filter và ghi rõ nếu item không thuộc filter hiện tại.

Lỗi field giữ modal/input. Create/edit không có default giá 0 hoặc duration tự bịa cho dữ liệu cũ thiếu; yêu cầu nhập đúng trước save.

### 4.3 Detail modal

GET detail khi click; Descriptions gồm code, name, category, duration, price, description (plain text), status, createdAt, updatedAt. Thiếu dữ liệu hiển thị “—”. Phân biệt loading/error/404; click record khác hoặc đóng khi request chưa xong không để kết quả cũ hiện ở modal mới.

### 4.4 Đổi trạng thái

Confirm: “Ngừng cung cấp dịch vụ {name}? Lịch sử lịch hẹn và hóa đơn được giữ nguyên.” hoặc “Kích hoạt lại dịch vụ {name}?”. Không hứa ngăn booking cũ hay tự hủy lịch hẹn vì API này không có contract đó.

PATCH với status đích; pending theo row, không optimistic update. Thành công cập nhật/refetch list và detail nếu đang mở; fail giữ status trước. Nếu filter Active và đổi sang Inactive, row biến mất đúng kỳ vọng, page được clamp. Không gọi status là xóa mềm.

### 4.5 Quyền và responsive

Route dưới AdminRoute; sidebar chỉ Admin. Reuse guard hiện có (role/systemRole, case-insensitive), không dùng GET public để suy ra người khác có quyền vào trang quản trị. Backend là nơi thực thi quyền write.

375px: toolbar wrap, nút đọc được, modal không tràn viewport; table cuộn ngang thay vì ép cột. 768px/desktop giữ layout MainLayout. Không thay theme/global layout.

## 5. Giới hạn BE phải biết

1. GET public thấy Inactive khi không filter; không cam kết đây là dữ liệu bí mật hay chỉ Admin xem được.
2. Không pagination server, lịch sử thay đổi, optimistic concurrency/version check hoặc audit actor. Có thể lost update giữa hai Admin; FE chỉ giảm stale data bằng fetch detail/refetch, không đảm bảo locking.
3. Duplicate precheck case-insensitive, nhưng DB compound index `{ category, name }` không khai báo collation case-insensitive. Không hứa chống được mọi race case khác chữ hoa/thường; không sửa BE trong task FE.
4. Service model có min duration 0 trong khi API validator yêu cầu 5–480 integer: FE theo API validator cho write, đọc dữ liệu legacy an toàn.
5. Model không có field deleted/soft-delete. DELETE luôn 403. Ngừng cung cấp bằng Inactive, có thể kích hoạt lại bằng PATCH.
6. Không có max basePrice hay precision tiền trong contract. Nếu sản phẩm cần VND nguyên, đó là quyết định cần thống nhất với BE, không tự siết ở FE.

Các giới hạn này không chặn UI Admin cơ bản. Nếu yêu cầu sản phẩm đổi sang hard/soft delete, danh mục khách riêng hoặc phân trang server thì phải cập nhật contract/phạm vi trước code.

## 6. Acceptance

1. Admin vào `/admin/services` qua menu và URL trực tiếp; non-admin bị guard và không mount page/API quản trị.
2. List đúng shape, search đúng 3 field theo BE, filter đúng enum; không gửi page/limit; phân trang client đúng.
3. Tạo với name trim 3–100, duration 5–480 nguyên, giá >=0, description <=500; code chỉ từ BE.
4. Duplicate 409, field 400, detail 404, permission 401/403 và network có feedback riêng, không mất form.
5. PUT luôn đủ editable required fields, `description: ''` xóa mô tả, omit status; PATCH riêng để đổi status.
6. Không có nút/hàm DELETE, upload, booking, payment hoặc category CRUD.
7. Sau mutation dữ liệu nhất quán với filter, page/detail; chống double-submit và stale request.
8. Check unit/lint/build và browser/network theo [Phase 03](phase-03-verification.md); ghi rõ blocked nếu thiếu môi trường/tài khoản.
