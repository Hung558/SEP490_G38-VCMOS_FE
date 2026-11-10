# Nhánh `trung/vet-queue-soap`: ghi chú thay đổi

- **Người làm:** TrungHT (FE). **Ngày:** 10/11/2026.
- **Gốc nhánh:** `main` @ `350e78a` (sau PR #23).
- **BE dùng để kiểm tra:** stage 2 (`a1e9760`).

Nhánh làm theo 3 file góp ý trong thư mục `sửa FE`:

| File | Nội dung                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| (1)  | Sửa màn tiếp nhận khách vãng lai (walk-in) của lễ tân.                                                                                               |
| (2)  | Sửa dashboard chủ nuôi: chia tab, đặt lịch ngay trong tab, xem người phụ trách. Lễ tân chỉ phân công người có lịch làm ngày đó ("không vướng lịch"). |
| (3)  | Làm mới phần khám bệnh: hàng đợi của bác sĩ và groomer, màn bệnh án SOAP kèm kê đơn, lịch sử khám, xem bệnh án cho lễ tân và chủ nuôi.               |

Nhánh cũng cập nhật FE theo các thay đổi của BE stage 2: khóa tài khoản, kiểm tra chuồng BR-11, lọc nhân sự theo ngày.

---

## 1. File (1): walk-in (SCR-18)

File sửa: `pages/AppointmentReception/components/WalkInModal.tsx`.

- Gõ đủ 10 số điện thoại là hệ thống tự tra cứu khách.
- **Bước 1 "Khách hàng và thú cưng"**
  - Khách cũ: báo "Đã tìm thấy hồ sơ khách hàng (mã)", tự điền rồi khóa họ tên và email.
  - Khách mới: báo hệ thống sẽ tự tạo tài khoản khách vãng lai (Inactive).
  - Chọn thú cưng có sẵn (radio) hoặc bấm "Thêm thú cưng mới". Có nút quay lại chọn thú cưng đã có.
- **Bước 2 "Dịch vụ, nhân sự và chuồng"**
  - Mỗi dịch vụ chọn người phụ trách đúng vai trò: Grooming cho Groomer, các dịch vụ khác cho Bác sĩ. Ưu tiên người có lịch làm việc hôm nay.
  - Ô ghi chú đổi tên thành "Ghi chú triệu chứng / Yêu cầu của khách".
  - Chỉ hiện chuồng chứa được bé (BR-11):
    - giới hạn cân nặng theo size: S ≤ 5 kg, M ≤ 15 kg, L ≤ 30 kg, XL không giới hạn; chuồng có `maxWeightKg` thì dùng giá trị này;
    - chuồng cách ly chỉ dành cho ca cần cách ly;
    - bỏ chuồng ở khu nội trú;
    - báo số chuồng đã bị ẩn. Nếu chuồng đang chọn không còn phù hợp thì tự bỏ chọn.
- **Nút "Hoàn tất Tiếp nhận & Check-in"**
  - Thành công: toast hiện mã lịch hẹn, người phụ trách và số thứ tự của từng dịch vụ, rồi đóng modal.
  - Lỗi: tải lại danh sách lịch hẹn.
  - 409 do chuồng: tải lại danh sách chuồng và báo lỗi ngay ở ô chuồng.

## 2. File (2): dashboard chủ nuôi và phân công theo lịch

File sửa: `pages/Dashboard/index.tsx`, `dashboardTabs.ts` (mới), `Home/components/QuickBookingSection.tsx`, `pages/PetProfile`, `AppointmentReception/components/AppointmentServicesPanel.tsx`.

- **3 tab:** "🐾 Quản lí thú cưng", "📅 Quản lí lịch đặt", "🤖 Tính năng AI". Tab đang mở nằm trên URL (`?tab=`), nên tải lại trang vẫn giữ tab.
- **Đặt lịch ngay trong tab "Quản lí lịch đặt"**
  - Dùng `QuickBookingSection` ở chế độ `embedded`, không chuyển về trang chủ nữa.
  - Nút "Đặt lịch" ở từng thú cưng và nút "Đặt lịch khám" ở hồ sơ thú cưng mở form với đúng bé đó (`/dashboard?tab=appointments&book=<petId>`).
- **Cột "Người phụ trách"** trong bảng lịch hẹn: tên bác sĩ hoặc groomer lễ tân đã phân công, hoặc "Chưa phân công".
- **Phân công không vướng lịch** (lễ tân, cả khi tiếp nhận walk-in)
  - Chỉ hiện nhân sự có lịch làm việc đúng ngày hẹn (`GET /users/staff?workDate=YYYY-MM-DD`).
  - Nếu ngày đó chưa ai trong vai trò có lịch thì hiện mọi nhân sự đang hoạt động, kèm ghi chú giải thích.

## 3. File (3): khám bệnh và bệnh án SOAP (mới)

### 3.1 Hàng đợi của tôi

Route `/clinic/my-queue`, thư mục `pages/StaffQueue`, màn SCR-22 (bác sĩ) và SCR-26 (groomer).

- Bác sĩ và groomer đăng nhập là vào thẳng trang này (trước đây vào `/profile`). Menu có mục "Hàng đợi khám" hoặc "Hàng đợi spa".
- Bộ lọc: "Đang chờ và đang làm", "Chờ khách check-in", "Đã xong", "Tất cả". Công tắc "Chỉ lịch hẹn hôm nay". Trang tự làm mới 30 giây một lần khi đang mở.
- **Bác sĩ** có các nút:
  - "Bắt đầu khám": BE tự đưa bé ra khỏi chuồng chờ (BR-10), toast báo tên chuồng;
  - "Tiếp tục khám";
  - "Xem bệnh án";
  - "Chờ khách check-in" (bị khóa, chỉ để báo trạng thái).
- **Groomer** có nút "Chuồng": xem bé đang ở chuồng nào và bấm "Đưa ra khỏi chuồng".

### 3.2 Màn khám

Route `/clinic/exam/:appointmentServiceId`, thư mục `pages/ExamRecord`, màn SCR-23, chỉ bác sĩ được phân công mới mở được.

- Đầu trang hiện thông tin bé, ghi chú lịch hẹn và nút "Tiền sử bệnh" (drawer lịch sử các lần khám).
- **Form SOAP**
  - S, O, A, P, mỗi phần tối đa 3000 ký tự, cùng ghi chú thêm.
  - Cân nặng đo tại phòng khám; khi lưu sẽ cập nhật vào hồ sơ thú cưng.
- **Đơn thuốc**
  - Chỉ chọn được thuốc và vaccine đang Active (BR-16).
  - Mỗi dòng gồm: liều, tần suất, số ngày (1 đến 365), hướng dẫn.
  - Thuốc đã kê trước đó mà nay ngừng bán vẫn hiện tên kèm "(đã ngừng kinh doanh)".
- **Lưu và hoàn tất**
  - "Lưu nháp" bấm được bất cứ lúc nào.
  - "Hoàn tất ca khám" bắt buộc đủ 4 phần S-O-A-P (BR-13): ô nào thiếu sẽ được đánh dấu, đủ rồi mới hiện hộp xác nhận.
  - Theo code BE, hoàn tất xong bệnh án vẫn là nháp và sửa được cho tới khi lễ tân thu tiền (BR-14). Chỉ khóa khi trạng thái là `Finalized`.
  - Có báo "Có thay đổi chưa lưu" và hỏi lại trước khi rời trang.
- **Lỗi từ BE**
  - Lỗi theo field hiện đúng ô, ví dụ `prescriptions[1].productId`.
  - 403, 404, 409: tải lại trạng thái ca khám.

### 3.3 Xem bệnh án và lịch sử

Thư mục `components/medical/`.

- `MedicalRecordModal`: nút "Xem bệnh án" ở chi tiết lịch hẹn của lễ tân và của chủ nuôi, hiện với dịch vụ khám đang làm hoặc đã xong.
- `PetMedicalHistory`: mục "Lịch sử khám bệnh" ở hồ sơ thú cưng (thay khung trống cũ). Component này cũng dùng trong drawer "Tiền sử bệnh" của bác sĩ.

## 4. Cập nhật theo BE stage 2

- **Tài khoản bị khóa hoặc ngừng hoạt động giữa phiên:** BE trả 403 "Tài khoản đã bị khoá…" hoặc "…ngừng hoạt động". FE xử lý như 401: đăng xuất và hiện đúng thông báo của BE (`services/01_axios/blockedAccount.ts`).
- **Check-in và walk-in gửi `cageId`:** FE lọc chuồng theo BR-11 như ở mục 1.
- **Nhân sự theo ngày làm việc:** dùng tham số `workDate` như ở mục 2.

## 5. Sửa thêm khi kiểm tra

- **Widget nổi "Chưa xác minh email" che nút cuối form.** Widget ở góc dưới phải che "Lưu nháp" và "Hoàn tất ca khám"; bấm vào lại trúng nút "Xác minh ngay". Tài khoản nhân viên do admin tạo đều chưa xác minh email nên ai cũng gặp. Đã chừa khoảng trống dưới trang khám (`ExamPageWrapper`).
- **Cảnh báo console ở dashboard.** `AddAppointmentServiceModal` dùng `destroyOnClose` (antd đã bỏ), đã đổi sang `destroyOnHidden`.

## 6. API FE nối mới

| Method | Endpoint                                | Dùng ở                                    |
| ------ | --------------------------------------- | ----------------------------------------- |
| GET    | `/appointment-services/my-queue`        | Hàng đợi, màn khám                        |
| POST   | `/medical-records/service/:id/start`    | "Bắt đầu khám"                            |
| GET    | `/medical-records/service/:id`          | Màn khám, "Xem bệnh án"                   |
| PUT    | `/medical-records/service/:id`          | "Lưu nháp"                                |
| POST   | `/medical-records/service/:id/complete` | "Hoàn tất ca khám"                        |
| GET    | `/medical-records/pet/:petId`           | Lịch sử khám, tên thú cưng trong hàng đợi |
| GET    | `/cage-assignments/order/:orderId`      | Groomer xem chuồng của bé                 |
| PATCH  | `/cage-assignments/:id/release`         | Groomer đưa bé ra khỏi chuồng             |
| GET    | `/users/staff?workDate=` (thêm tham số) | Phân công theo lịch làm việc              |

## 7. Route, menu, quyền

- `ROUTER.STAFF_QUEUE = '/clinic/my-queue'`: Veterinarian, Groomer.
- `ROUTER.EXAM_RECORD = '/clinic/exam/:appointmentServiceId'`: Veterinarian.
- Trang đích sau đăng nhập (`roleAccess.ts`): Bác sĩ và Groomer vào `/clinic/my-queue`.
- Hồ sơ nhân viên: SCR-22, SCR-23, SCR-26 có link "Mở trang".

## 8. Kiểm tra

- `tsc`, `eslint`, `prettier --check --end-of-line auto`, `vite build`: đều qua.
- `npm test`: 138/138. Thêm `tests/clinic.test.mjs`, cập nhật `role-access` và `profile-content`.
- Script API và E2E chạy với BE trên MongoDB local. Script nằm ở thư mục `qa/` trên máy TrungHT, không có trong repo.

| Bộ               | Kết quả | Ghi chú                                              |
| ---------------- | ------- | ---------------------------------------------------- |
| api-check        | 103/103 | Gọi thử mọi nhóm API, kể cả các trường hợp lỗi       |
| e2e-clinic (mới) | 46/46   | Bác sĩ, groomer, lễ tân, chủ nuôi, tài khoản bị khóa |
| e2e-reception    | 58/58   |                                                      |
| e2e-roles        | 69/69   |                                                      |
| e2e-review-2     | 32/32   |                                                      |
| e2e-t24          | 51/54   | Xem bên dưới                                         |
| e2e-review-fixes | 54/56   | Xem bên dưới                                         |

Hai bộ cuối fail vì kỳ vọng cũ, không phải lỗi của nhánh:

- Bước nhận OTP quên mật khẩu và xác minh email: BE stage 2 từ chối quên mật khẩu khi email chưa xác minh (trả 400). Chưa xác minh kỹ.
- Kỳ vọng cũ "khung dòng thời gian trống" ở hồ sơ thú cưng, nay mục này đã hiện lịch sử khám.

## 9. Câu hỏi cho BE (HungHD, QuangTD)

1. `assign-staff` không kiểm tra vai trò của nhân sự so với loại dịch vụ; FE đang tự lọc.
2. `queueNo` được cấp ngay khi dịch vụ còn Booked và không reset theo ngày.
3. Walk-in kiểm tra BR-11 sau khi đã tạo khách, thú cưng và lịch hẹn, nên lỗi 400 vẫn để lại dữ liệu đã tạo.
4. Check-in kèm `cageId` kiểm tra BR-11 sau khi lịch hẹn đã chuyển CheckedIn.
5. Bác sĩ không gọi được `GET /cages`, nên FE chưa cho chọn chuồng chờ (`waitingCageId`) khi hoàn tất ca khám.
6. `my-queue` không trả kèm thông tin thú cưng, nên FE phải gọi lịch sử của từng bé để lấy tên.
7. Tài liệu `my-queue` ghi sắp theo số thứ tự, còn code xếp ca cấp cứu lên trước.
8. File (3) ghi hoàn tất là `Finalized`, nhưng code giữ `Draft` tới khi thanh toán, và chưa có API hóa đơn.
9. `complete` đánh dấu dịch vụ Done trước khi xếp chuồng, nên có thể hỏng giữa chừng.
10. Chưa có API tạo lịch làm việc (StaffSchedule), nên `workDate` chỉ có dữ liệu seed; FE đang tự fallback.
11. API chuồng chưa nhận `maxWeightKg` và `zone`.
12. Lễ tân không giải phóng được chuồng.
13. `/appointment-orders/me` không lọc được theo `petId` và không trả danh sách dịch vụ, nên FE phải gọi chi tiết từng dòng để lấy người phụ trách.
14. `GET /users/staff` bắt buộc đăng nhập.
15. `POST /appointment-orders/online` không còn dùng (đã thay bằng online-booking từ PR #22).
16. `.env` BE đang trỏ `MONGO_URI` vào Atlas dùng chung. Khi chạy test phải ghi đè sang DB local để không ghi vào dữ liệu chung.

## 10. Cho ThanhTD

**File của ThanhTD đã sửa trong nhánh này:**

- `pages/Dashboard/index.tsx`
- `pages/Dashboard/components/AppointmentDetailModal.tsx`
- `pages/Dashboard/components/AddAppointmentServiceModal.tsx`
- `pages/Home/components/QuickBookingSection.tsx`
- `pages/AppointmentReception/`: `index.tsx`, `WalkInModal.tsx`, `AppointmentServicesPanel.tsx`, `useAppointmentReception.ts`, `styles.ts`

**Lỗi có sẵn (không thuộc nhánh này):**

- Sidebar `MainLayout` không tự thu gọn trên điện thoại; ở màn 390px header còn tràn khoảng 15px.
- Widget "Chưa xác minh email" (fixed, z-index 999) che nội dung ở góc dưới phải trên mọi trang, ví dụ phân trang của bảng.
