# Đặc tả FE — Tổng quan ca hôm nay cho lễ tân

## Tổng quan

- Khối **Lịch hẹn hôm nay** nằm ngay phía trên bộ lọc trong tab danh sách; có ngày theo giờ Việt Nam. Dùng API `GET /appointment-orders`, `from=to=YYYY-MM-DD`, `page=1&limit=1`, và lấy `pagination.total` (không đếm hàng trên trang hoặc đếm từ filter đang mở). Tổng số gồm mọi trạng thái, kể cả hủy; ghi rõ ngay dưới số. Ba số phụ lấy riêng `Booked` (Chờ tiếp nhận), `CheckedIn` (Đã tiếp nhận), `WaitOwner` (Chờ chủ đón).
- Mỗi số là nút có tên rõ ràng. Bấm sẽ lọc bảng về ngày hôm nay và trạng thái tương ứng, xóa lọc mã/hình thức và về trang 1. Bấm Tổng lịch hôm nay xóa trạng thái. Dùng semantics button, focus bàn phím và thể hiện nhóm được chọn; không điều hướng sang trang khác.
- Summary độc lập với bảng, có loading, lỗi và nút thử lại. Chỉ hiện 0 khi API xác nhận; không hiển thị số cũ dưới ngày mới. Nếu chỉ một truy vấn lỗi, có thể hiển thị lỗi riêng cho ô đó hoặc báo toàn khối chưa tải được; bảng vẫn sử dụng bình thường. Hủy/bỏ qua request cũ khi remount hoặc đổi ngày. Làm mới cùng nút Làm mới hiện tại và sau check-in, walk-in, hủy hoặc cập nhật dịch vụ; tránh polling quá dày, có thể làm mới khi quay lại tab/focus để thấy ca spa chuyển sang chờ chủ đón.

## Thao tác theo trạng thái

- `Booked`: **Check-in** là nút chính, giữ hành vi và modal hiện có.
- `CheckedIn` / `InProgress`: **Chi tiết** là nút chính, kèm lời dẫn ngắn “Kiểm tra dịch vụ và phân công” / “Theo dõi tiến độ dịch vụ”. Không tự suy ca chưa phân công từ trạng thái đơn.
- `WaitOwner`: **Chi tiết** là nút chính, lời dẫn “Kiểm tra trước khi bàn giao”. Không thêm nút thanh toán hay đổi trạng thái khi chưa có API.
- Trạng thái kết thúc: không có CTA xử lý; giữ Chi tiết để xem lại và giữ chính sách hiện có của các thao tác khác. Nút Chi tiết, hủy, phân chuồng, badge và quy tắc phân quyền của hiện tại không bị mất.

## Nghiệm thu

1. Lễ tân mở danh sách thấy số toàn ngày chính xác kể cả khi bảng chỉ có một trang hoặc đang xem ngày khác, và phân biệt được ca Booked với WaitOwner.
2. Bấm ô Chờ tiếp nhận/Chờ chủ đón đổi query, về trang 1, bỏ lọc xung đột; nút hành động mở đúng modal. Admin không thấy khối mới hoặc CTA lễ tân.
3. Lỗi summary không hiện số 0 giả hoặc chặn bảng; thử lại tải đúng. Check-in thành công đồng bộ số liệu và CTA, phân chuồng vẫn hiện badge đúng. Không đổi phiếu intake mặc định.
4. Chạy unit, lint, build; Playwright desktop cổng 3000 với fixture paginated và regression tiếp nhận. Không dùng tài khoản/dữ liệu production.
