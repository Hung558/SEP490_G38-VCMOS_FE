# Spec — FE đặt lịch online và lịch hẹn của chủ nuôi

## 1. Mục tiêu

Nối FE với BE online appointment vừa có trong `SEP490_G38-VCMOS_BE` để chủ nuôi có thể:

- Đặt một lịch hẹn cho một thú cưng vào một ngày (`YYYY-MM-DD`), kèm ghi chú.
- Xem danh sách lịch hẹn online của chính mình, lọc theo trạng thái/khoảng ngày và phân trang.
- Mở chi tiết một lịch hẹn.
- Nhận mã lịch hẹn do BE sinh (`APT-XXXXXX`) và trạng thái ban đầu `Booked`.

Đây là implementation theo contract BE hiện tại, không phải thiết kế lại nghiệp vụ đặt dịch vụ nhiều bước.

## 2. Evidence và baseline

- BE HEAD local: `d169f1c` (`Notify Receptionist`), sau các commit `4beebf1` (`Online booking`) và `f4ddb55` (`List staff`).
- FE HEAD local: `b9a83c5`.
- BE docs: `SEP490_G38-VCMOS_BE/api/appointment-orders/create-online-booking.md`, `list-my-online-booking.md`, `get-my-online-booking-by-id.md`, `api/users/list-staff.md`.
- FE flow hiện tại: `src/pages/Home/components/QuickBookingSection.tsx` đang dùng dữ liệu mock cho pet/staff/time slot và `setTimeout` giả lập submit; `src/pages/Dashboard/index.tsx` đang để `appointments` là mảng rỗng.
- FE đã có `PetService`, axios interceptor tự gắn Bearer token, `ROUTER.DASHBOARD`, layout và role route.

## 3. API contract

Base path là `/api` theo `VITE_API_ROOT`; service chỉ dùng path tương đối `/appointment-orders` và `/users` như convention hiện tại.

### 3.1 Tạo lịch

`POST /api/appointment-orders/online`, auth Bearer, role `PetOwner`.

```json
{
  "petId": "<24-hex-mongo-id>",
  "date": "2026-11-20",
  "note": "Khám tổng quát và tiêm phòng"
}
```

Success `201`:

```json
{
  "message": "Đặt lịch thành công",
  "data": {
    "_id": "...",
    "code": "APT-K7M2QX",
    "petId": "...",
    "ownerId": "...",
    "date": "2026-11-20",
    "note": "...",
    "isOnline": true,
    "checkedInAt": null,
    "derivedStatus": "Booked",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Validation: `petId` bắt buộc MongoId; `date` là ngày thật, không ở quá khứ theo múi giờ Việt Nam; `note` optional, trim, tối đa 500 ký tự.

Business errors: `401`, `403`, `404` thú cưng không thuộc user, `409` thú cưng đã có lịch không cancelled cùng ngày, `500`.

### 3.2 Danh sách lịch của tôi

`GET /api/appointment-orders/me`, auth Bearer, role `PetOwner`.

Query optional: `status` in `Booked | CheckedIn | InProgress | WaitOwner | Done | Cancelled | Overdue`; `from`, `to` dạng `YYYY-MM-DD`; `page >= 1`; `limit 1..100`, default `page=1, limit=10`.

Success `200` trả `{ data: Appointment[], pagination: { page, limit, total, totalPages } }`, sort ngày mới nhất trước.

### 3.3 Chi tiết lịch

`GET /api/appointment-orders/me/:id`, auth Bearer, role `PetOwner`.

Success `200`: `{ data: Appointment }`; id sai `400`; không thuộc user/not online `404`.

### 3.4 Danh sách staff — chỉ làm nền cho contract, không đưa vào booking payload

`GET /api/users/staff`, auth Bearer, mọi role đăng nhập được middleware hiện tại. Query `role=Veterinarian|Groomer`, `status=Active|Inactive|Locked`, `search`, `page`, `limit`; response `{ items, pagination }`.

BE AppointmentOrder không có `staffId`, `serviceId`, time slot hoặc time field. Vì vậy FE không được gửi các field đó và không được hiển thị rằng staff/slot đã được đặt. Nếu product muốn chỉ định staff/giờ, phải có BE contract mới trước.

## 4. UX và scope

### 4.1 Quick booking trên Home

Giữ visual language hiện tại nhưng thay wizard mock bằng flow đúng contract:

1. Chọn pet từ `PetService.listPets({ status: 'Active', page: 1, limit: 100 })`.
2. Chọn ngày bằng DatePicker; disable ngày trước hôm nay theo ngày Việt Nam ở UI, nhưng BE vẫn là source of truth.
3. Nhập ghi chú tối đa 500 ký tự.
4. Summary gồm pet, ngày, ghi chú; không hiển thị dịch vụ/staff/slot như dữ liệu đã đặt. Thay cả nội dung giới thiệu đang hứa chọn bác sĩ, tự xếp slot liên tiếp hoặc không phải chờ bằng mô tả đặt hẹn theo ngày; không giữ những lời hứa chưa có API hỗ trợ.
5. Submit một lần, disabled/loading khi pending; gọi `AppointmentOrderService.createOnlineBooking`.
6. Success hiển thị mã `APT-...`, ngày và trạng thái `Đã đặt`; reset form sau khi user đóng success hoặc chuyển tới lịch sử.
7. Nếu chưa login, giữ login prompt hiện tại và không gọi API. Với user đã đăng nhập, kiểm tra `normalizeRole(useAuth().user.role) === 'PetOwner'` trước khi load owner pets hoặc cho submit. Không dùng `getRoleGroup` làm kiểm tra quyền này vì role không biết hiện được fallback thành owner.
8. Nếu chưa có pet active, hiển thị CTA “Thêm thú cưng” dẫn Dashboard, không gửi request lỗi.

### 4.2 Lịch hẹn trong Dashboard

Thay mảng `appointments` hardcode/rỗng bằng `AppointmentOrderService.listMyOnlineBookings`:

- Cập nhật hoặc bỏ các consumer cũ: `activeAppointments`, `completedAppointments`, stats và live stepper. Dùng `derivedStatus`; không đọc `status`, `doctor`, `service`, `stepIndex` vốn không có trong response. Không tính tổng toàn Dashboard từ một trang dữ liệu đang lọc. Nếu chưa có API tổng hợp, bỏ/chuyển nhãn các chỉ số liên quan thành phạm vi dữ liệu thực tế; không gọi số lịch `Done` là số bệnh án SOAP. Không dựng tiến trình chi tiết từ field không tồn tại.

- Table/card responsive gồm mã, pet name, ngày hẹn, ghi chú rút gọn, trạng thái, action “Chi tiết”.
- Vì API chỉ trả `petId`, map tên pet từ danh sách pet đã tải; nếu không map được hiển thị petId ngắn/“Không xác định”, không crash.
- Filter status; filter from/to; clear filters; pagination server-side theo response.
- Empty state riêng cho không có lịch và không có kết quả filter; loading/error + retry.
- Click detail gọi endpoint detail, không lấy object table làm source cuối; hiển thị Descriptions: mã, pet, ngày, ghi chú, trạng thái, createdAt/updatedAt, checkedInAt nếu có.
- Status map: `Booked` “Đã đặt”, `CheckedIn` “Đã tiếp nhận”, `InProgress` “Đang thực hiện”, `WaitOwner` “Chờ chủ đón”, `Done` “Hoàn tất”, `Cancelled` “Đã hủy”, `Overdue` “Quá hạn”.
- Không thêm nút cancel vì BE chưa cung cấp endpoint cancel.

### 4.3 Error UX

- `400`: map `errors[]` theo field vào form/filter; fallback message.
- `401`: để interceptor xử lý redirect; page không toast trùng.
- `403`: “Tài khoản hiện tại không có quyền đặt lịch.”
- `404`: “Không tìm thấy thú cưng/lịch hẹn”; giữ form nếu create.
- `409`: giữ form, highlight ngày/pet, “Thú cưng này đã có lịch trong ngày đã chọn.”
- Network/500: toast tiếng Việt, giữ input, cho retry chủ động.
- Chống stale response khi đổi filter/detail và chống double submit.

## 5. Types đề xuất

```ts
export type AppointmentStatus =
  | 'Booked'
  | 'CheckedIn'
  | 'InProgress'
  | 'WaitOwner'
  | 'Done'
  | 'Cancelled'
  | 'Overdue';

export interface OnlineAppointment {
  _id: string;
  code: string;
  petId: string;
  ownerId: string;
  date: string;
  note?: string;
  isOnline: boolean;
  derivedStatus: AppointmentStatus;
  checkedInAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOnlineBookingPayload {
  petId: string;
  date: string;
  note?: string;
}

export interface ListOnlineBookingsParams {
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
```

Service return shape must match axios interceptor: `create -> { message, data }`, `list -> { data, pagination }`, `detail -> { data }`.

## 6. Non-goals / BE limitations

- Không build payment, service line items, bác sĩ, ca/slot, availability calendar.
- Không gửi ownerId từ client.
- Không tự suy diễn email notification; BE gửi email cho receptionist asynchronously, FE chỉ báo tạo thành công khi API `201`.
- Không sửa BE, không gọi trực tiếp axios trong component, không thêm thư viện state/fetch.

## 7. Acceptance criteria

1. Chủ nuôi active chọn pet + ngày hợp lệ + note và tạo thành công qua POST thật; UI hiển thị code BE trả về.
2. Request không chứa `ownerId`, `serviceId`, `staffId`, slot hoặc field ngoài contract.
3. Past date, missing pet, note >500 bị chặn ở UI; server errors vẫn hiển thị đúng.
4. Duplicate booking `409` giữ nguyên form và giải thích được lỗi.
5. Dashboard list gọi đúng query, hiển thị pagination/status/filter và không còn appointments mock.
6. Detail gọi đúng endpoint và không lộ lịch của user khác.
7. Guest/non-owner không thể submit; 401/403 không toast trùng interceptor.
8. No pet, empty list, loading, network error, stale detail và double click đều có hành vi an toàn.
9. Responsive 375px/768px/desktop; build/lint/typecheck pass; browser/network smoke với BE local được ghi nhận.
10. Không có thay đổi staff picker để giả vờ chỉ định nhân viên; `GET /users/staff` chỉ là API nền cho scope tương lai.
