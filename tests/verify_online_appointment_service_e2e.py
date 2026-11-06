import os
import sys
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Asus\.gemini\antigravity\brain\2b391f3f-33be-4539-96e0-85cb3445bf25"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

OWNER = {
    "_id": "6ad96d4a9664da6b2c0d8d61",
    "email": "petowner@gmail.com",
    "fullName": "Nguyễn Văn Chủ Nuôi",
    "role": "PetOwner",
    "status": "Active",
    "isEmailVerified": True,
}
TOKEN_OWNER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZDk2ZDRhOTY2NGRhNmIyYzBkOGQ2MSIsInJvbGUiOiJQZXRPd25lciIsImlhdCI6MTc5MzcwMTQ2MCwiZXhwIjoxNzk0MzA2MjYwfQ.QPzj5EFKB_5Ub2pwyCz-p1ALb4wYu9x9WJiTeZJylxY"

PETS = [
    {
        "_id": "6ad96d4a9664da6b2c0d8d11",
        "name": "Mimi",
        "species": "Mèo",
        "breed": "Anh lông ngắn",
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d12",
        "name": "Lu",
        "species": "Chó",
        "breed": "Poodle",
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "status": "Active",
    },
]

APPOINTMENTS = [
    {
        "_id": "6ad96d4a9664da6b2c0d8d71",
        "code": "APT-BOOKED-01",
        "petId": "6ad96d4a9664da6b2c0d8d11",
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "date": "2026-11-20",
        "note": "Mimi bị ngứa tai và bỏ ăn 2 ngày nay",
        "isOnline": True,
        "derivedStatus": "Booked",
        "createdAt": "2026-11-06T02:00:00.000Z",
        "updatedAt": "2026-11-06T02:00:00.000Z",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d72",
        "code": "APT-CHECKEDIN-02",
        "petId": "6ad96d4a9664da6b2c0d8d12",
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "date": "2026-11-15",
        "note": "Lu đi tiêm phòng định kỳ",
        "isOnline": True,
        "derivedStatus": "CheckedIn",
        "checkedInAt": "2026-11-15T08:30:00.000Z",
        "createdAt": "2026-11-06T01:00:00.000Z",
        "updatedAt": "2026-11-06T01:30:00.000Z",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d73",
        "code": "APT-DONE-03",
        "petId": "6ad96d4a9664da6b2c0d8d11",
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "date": "2026-10-10",
        "note": "Đã khám hoàn tất tháng trước",
        "isOnline": True,
        "derivedStatus": "Done",
        "createdAt": "2026-10-10T02:00:00.000Z",
        "updatedAt": "2026-10-10T05:00:00.000Z",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d74",
        "code": "APT-CANCELLED-04",
        "petId": "6ad96d4a9664da6b2c0d8d12",
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "date": "2026-10-05",
        "note": "Chủ nuôi bận nên hủy lịch",
        "isOnline": True,
        "derivedStatus": "Cancelled",
        "createdAt": "2026-10-05T02:00:00.000Z",
        "updatedAt": "2026-10-05T03:00:00.000Z",
    },
]

SERVICES = [
    {
        "_id": "6ad96d4a9664da6b2c0d8d51",
        "code": "SVC-KHAM-01",
        "name": "Khám tổng quát thú cưng",
        "category": "Examination",
        "defaultDuration": 30,
        "basePrice": 200000,
        "description": "Bác sĩ kiểm tra tai, mắt, mũi, răng miệng, tim phổi và lông da.",
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d52",
        "code": "SVC-TIEM-01",
        "name": "Tiêm vaccine 4 bệnh cho mèo",
        "category": "Vaccination",
        "defaultDuration": 20,
        "basePrice": 250000,
        "description": "Phòng ngừa giảm bạch cầu, viêm mũi khí quản, Calicivirus và Chlamydia.",
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d53",
        "code": "SVC-SPA-01",
        "name": "Combo tắm sấy vệ sinh toàn diện",
        "category": "Grooming",
        "defaultDuration": 60,
        "basePrice": 300000,
        "description": "Tắm thảo dược, sấy lông, cắt móng, vệ sinh tai và vắt tuyến hôi.",
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d54",
        "code": "SVC-INACTIVE-01",
        "name": "Dịch vụ đã ngừng cung cấp",
        "category": "Examination",
        "defaultDuration": 15,
        "basePrice": 50000,
        "description": "Không được hiển thị trong danh sách chọn",
        "status": "Inactive",
    },
]

console_errors = []

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))

        # Track POST requests to /api/appointment-services/online
        captured_posts = []
        conflict_flag = {"trigger": False}

        def handle_route(route):
            url = route.request.url
            method = route.request.method

            if "/api/pets" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"items": PETS, "total": 2}))
            elif "/api/appointment-orders/me" in url and method == "GET":
                if any(apt["_id"] in url for apt in APPOINTMENTS):
                    apt_id = url.split("/")[-1].split("?")[0]
                    target = next((a for a in APPOINTMENTS if a["_id"] == apt_id), APPOINTMENTS[0])
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": target}))
                else:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({
                        "data": APPOINTMENTS,
                        "pagination": {"page": 1, "limit": 10, "total": len(APPOINTMENTS), "totalPages": 1}
                    }))
            elif "/api/services" in url and method == "GET":
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"services": SERVICES}))
            elif "/api/appointment-services/online" in url and method == "POST":
                post_data = json.loads(route.request.post_data or "{}")
                captured_posts.append(post_data)

                if conflict_flag["trigger"]:
                    conflict_flag["trigger"] = False
                    route.fulfill(
                        status=409,
                        content_type="application/json",
                        body=json.dumps({"message": "Số thứ tự dịch vụ đã tồn tại trong lịch hẹn này"})
                    )
                else:
                    route.fulfill(
                        status=201,
                        content_type="application/json",
                        body=json.dumps({
                            "message": "Tạo dịch vụ cho lịch hẹn online thành công",
                            "data": {
                                "_id": "6ad96d4a9664da6b2c0d8d99",
                                "orderId": post_data.get("orderId"),
                                "serviceId": post_data.get("serviceId"),
                                "sequenceNo": post_data.get("sequenceNo", 1),
                                "preferredStaffId": None,
                                "assignedStaffId": None,
                                "status": "Booked",
                                "isEmergency": post_data.get("isEmergency", False),
                                "queueNo": None,
                                "enqueueAt": None,
                                "dequeueAt": None,
                                "groomingNote": None,
                                "createdAt": "2026-11-06T06:00:00.000Z",
                                "updatedAt": "2026-11-06T06:00:00.000Z"
                            }
                        })
                    )
            else:
                route.continue_()

        page.route("**/api/**", handle_route)

        print("[TEST] 1. Setting up PetOwner auth...")
        page.goto("http://localhost:3000")
        page.evaluate(f"""() => {{
            localStorage.setItem('token', '{TOKEN_OWNER}');
            localStorage.setItem('user-info', JSON.stringify({json.dumps(OWNER)}));
            localStorage.setItem('USER', JSON.stringify({json.dumps(OWNER)}));
        }}""")

        print("[TEST] 2. Navigating to PetOwner Dashboard...")
        page.goto("http://localhost:3000/dashboard")
        page.wait_for_selector("table", timeout=8000)
        time.sleep(1)

        # Stage 1: Verify Appointments Table eligibility actions
        print("[TEST] 3. Verifying appointment rows and 'Thêm dịch vụ' buttons...")
        # The appointments table is identified by the header 'Mã lượt hẹn'
        apt_table = page.locator(".ant-table", has=page.locator("th", has_text="Mã lượt hẹn"))
        rows = apt_table.locator("tbody tr.ant-table-row")
        row_count = rows.count()
        print(f"-> Found {row_count} appointment rows in table")
        assert row_count == 4, f"Expected 4 appointment rows, got {row_count}"

        # APT-BOOKED-01 (Row 0): Booked -> should have "Thêm dịch vụ"
        row1 = rows.nth(0)
        assert row1.locator("text=Thêm dịch vụ").is_visible(), "Row 0 (Booked) must have 'Thêm dịch vụ'"

        # APT-CHECKEDIN-02 (Row 1): CheckedIn -> should have "Thêm dịch vụ"
        row2 = rows.nth(1)
        assert row2.locator("text=Thêm dịch vụ").is_visible(), "Row 1 (CheckedIn) must have 'Thêm dịch vụ'"

        # APT-DONE-03 (Row 2): Done -> MUST NOT have "Thêm dịch vụ"
        row3 = rows.nth(2)
        assert not row3.locator("text=Thêm dịch vụ").is_visible(), "Row 2 (Done) must NOT have 'Thêm dịch vụ'"

        # APT-CANCELLED-04 (Row 3): Cancelled -> MUST NOT have "Thêm dịch vụ"
        row4 = rows.nth(3)
        assert not row4.locator("text=Thêm dịch vụ").is_visible(), "Row 3 (Cancelled) must NOT have 'Thêm dịch vụ'"

        # Stage 1b: Verify fallback when user object only has systemRole: 'PetOwner'
        print("[TEST] 3b. Verifying user with systemRole: 'PetOwner' only (safe role fallback)...")
        page.evaluate("""() => {
            const userWithSystemRoleOnly = {
                _id: "6ad96d4a9664da6b2c0d8d61",
                email: "petowner@gmail.com",
                fullName: "Chủ nuôi systemRole",
                systemRole: "PetOwner",
                status: "Active"
            };
            localStorage.setItem('user-info', JSON.stringify(userWithSystemRoleOnly));
            localStorage.setItem('USER', JSON.stringify(userWithSystemRoleOnly));
        }""")
        page.reload()
        page.wait_for_selector(".ant-table", timeout=8000)
        time.sleep(1)
        apt_table = page.locator(".ant-table", has=page.locator("th", has_text="Mã lượt hẹn"))
        row1 = apt_table.locator("tbody tr.ant-table-row").nth(0)
        assert row1.locator("text=Thêm dịch vụ").is_visible(), "Row 1 must still have 'Thêm dịch vụ' when user only has systemRole: 'PetOwner'"
        print("-> Verified: systemRole 'PetOwner' without user.role correctly displays 'Thêm dịch vụ'")

        p1 = os.path.join(ARTIFACT_DIR, "service_01_dashboard_eligible_action.png")
        page.screenshot(path=p1)
        print(f"-> Saved screenshot: {p1}")

        # Stage 2: Open Add Service Modal
        print("[TEST] 4. Opening 'Thêm dịch vụ' modal for APT-BOOKED-01...")
        row1.locator("text=Thêm dịch vụ").click()
        page.wait_for_selector(".ant-modal-content", timeout=5000)
        time.sleep(0.5)

        # Verify appointment summary in modal
        modal = page.locator(".ant-modal-content")
        assert modal.locator("text=APT-BOOKED-01").is_visible(), "Modal must show appointment code"
        assert modal.locator("text=Bé Mimi").is_visible(), "Modal must show pet name"
        assert modal.locator("text=Đã đặt").is_visible(), "Modal must show status"

        p2 = os.path.join(ARTIFACT_DIR, "service_02_add_service_modal_opened.png")
        page.screenshot(path=p2)
        print(f"-> Saved screenshot: {p2}")

        # Stage 3: Verify Inactive service is excluded and select Active service
        print("[TEST] 5. Selecting active service...")
        modal.locator(".ant-select").click()
        page.wait_for_selector(".ant-select-dropdown", timeout=5000)
        time.sleep(0.5)

        # Check dropdown items
        dropdown_text = page.locator(".ant-select-dropdown").inner_text()
        assert "Khám tổng quát thú cưng" in dropdown_text, "Active service must appear"
        assert "Tiêm vaccine 4 bệnh" in dropdown_text, "Active service must appear"
        assert "Dịch vụ đã ngừng cung cấp" not in dropdown_text, "Inactive service must NEVER appear in options"

        # Select "Khám tổng quát thú cưng"
        page.locator(".ant-select-dropdown .ant-select-item-option", has_text="Khám tổng quát thú cưng").click()
        time.sleep(0.5)

        # Verify service preview card
        assert modal.locator(".service-preview-card").is_visible(), "Service preview card must show"
        assert modal.locator(".service-preview-card strong", has_text="200.000 đ").is_visible(), "Base price must show"
        assert modal.locator(".service-preview-card", has_text="30 phút").is_visible(), "Duration must show"

        # Toggle emergency switch
        modal.locator(".ant-switch").click()
        time.sleep(0.3)

        # Enter sequence number 1
        seq_input = modal.locator("input.ant-input-number-input")
        seq_input.fill("1")

        p3 = os.path.join(ARTIFACT_DIR, "service_03_service_selected_preview.png")
        page.screenshot(path=p3)
        print(f"-> Saved screenshot: {p3}")

        # Stage 4: Trigger 409 Conflict
        print("[TEST] 6. Testing 409 Conflict handling...")
        conflict_flag["trigger"] = True
        modal.locator("button", has_text="Thêm dịch vụ").click()
        page.wait_for_selector(".ant-alert-error", timeout=5000)
        time.sleep(0.5)

        error_alert = modal.locator(".ant-alert-error")
        assert "Số thứ tự dịch vụ đã tồn tại trong lịch hẹn này" in error_alert.inner_text()
        print("-> 409 Conflict alert displayed correctly")

        # Verify form selections are preserved
        assert modal.locator(".service-title", has_text="Khám tổng quát thú cưng").is_visible(), "Service must remain selected on conflict"

        p4 = os.path.join(ARTIFACT_DIR, "service_04_conflict_409_state.png")
        page.screenshot(path=p4)
        print(f"-> Saved screenshot: {p4}")

        # Stage 5: Fix sequence to 2 and submit successfully
        print("[TEST] 7. Submitting with corrected sequence...")
        seq_input.fill("2")
        modal.locator("button", has_text="Thêm dịch vụ").click()

        # Wait for modal to close
        page.wait_for_selector(".ant-modal-content", state="hidden", timeout=5000)
        time.sleep(1)

        # Verify POST payload
        assert len(captured_posts) >= 2, "Expected at least 2 POST requests"
        last_post = captured_posts[-1]
        print(f"-> Captured POST body: {last_post}")
        assert last_post.get("orderId") == "6ad96d4a9664da6b2c0d8d71"
        assert last_post.get("serviceId") == "6ad96d4a9664da6b2c0d8d51"
        assert last_post.get("sequenceNo") == 2
        assert last_post.get("isEmergency") is True
        # Verify no forbidden fields sent
        forbidden = ["ownerId", "preferredStaffId", "assignedStaffId", "status", "queueNo", "enqueueAt", "dequeueAt", "groomingNote"]
        for f in forbidden:
            assert f not in last_post, f"Forbidden field '{f}' must NOT be in POST payload"

        p5 = os.path.join(ARTIFACT_DIR, "service_05_create_success_toast.png")
        page.screenshot(path=p5)
        print(f"-> Saved screenshot: {p5}")

        # Stage 6: Verify AppointmentDetailModal also has "Thêm dịch vụ" button for eligible orders
        print("[TEST] 8. Checking AppointmentDetailModal has 'Thêm dịch vụ' button...")
        row1.locator("text=Chi tiết").click()
        page.wait_for_selector(".ant-modal-content", timeout=5000)
        time.sleep(0.5)

        detail_modal = page.locator(".ant-modal-content")
        add_btn_in_detail = detail_modal.locator("button", has_text="Thêm dịch vụ")
        assert add_btn_in_detail.is_visible(), "Detail modal must have 'Thêm dịch vụ' button for eligible appointment"

        p6 = os.path.join(ARTIFACT_DIR, "service_06_detail_modal_with_add_service_btn.png")
        page.screenshot(path=p6)
        print(f"-> Saved screenshot: {p6}")

        # Close detail modal
        detail_modal.locator("button", has_text="Đóng").click()
        time.sleep(1)

        # Stage 7: Responsive layouts
        print("[TEST] 9. Capturing responsive layouts...")
        # Open modal again for responsive checks
        row1.locator("text=Thêm dịch vụ").click()
        page.wait_for_selector(".ant-modal-content:visible", timeout=5000)
        time.sleep(0.5)

        # Mobile 375px
        page.set_viewport_size({"width": 375, "height": 667})
        time.sleep(0.5)
        p7 = os.path.join(ARTIFACT_DIR, "service_07_mobile_375px.png")
        page.screenshot(path=p7)
        print(f"-> Saved screenshot: {p7}")

        # Tablet 768px
        page.set_viewport_size({"width": 768, "height": 1024})
        time.sleep(0.5)
        p8 = os.path.join(ARTIFACT_DIR, "service_08_tablet_768px.png")
        page.screenshot(path=p8)
        print(f"-> Saved screenshot: {p8}")

        # Desktop 1440px
        page.set_viewport_size({"width": 1440, "height": 900})
        time.sleep(0.5)
        p9 = os.path.join(ARTIFACT_DIR, "service_09_desktop_1440px.png")
        page.screenshot(path=p9)
        print(f"-> Saved screenshot: {p9}")

        browser.close()

    print("[SUCCESS] ALL BROWSER E2E TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
