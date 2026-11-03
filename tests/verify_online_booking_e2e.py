import os
import sys
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

OWNER_0 = {
    "_id": "6ad96d4a9664da6b2c0d8d61",
    "email": "exampleuserupdated@gmail.com",
    "fullName": "Example User",
    "role": "PetOwner",
    "status": "Active",
    "isEmailVerified": True,
}
TOKEN_OWNER_0 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZDk2ZDRhOTY2NGRhNmIyYzBkOGQ2MSIsInJvbGUiOiJQZXRPd25lciIsImlhdCI6MTc5MzcwMTQ2MCwiZXhwIjoxNzk0MzA2MjYwfQ.QPzj5EFKB_5Ub2pwyCz-p1ALb4wYu9x9WJiTeZJylxY"

OWNER_NO_PET = {
    "_id": "6ad97cd2a1914248c8963636",
    "email": "exampleuser1@gmail.com",
    "fullName": "Example User 1",
    "role": "PetOwner",
    "status": "Active",
    "isEmailVerified": True,
}
TOKEN_NO_PET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZDk3Y2QyYTE5MTQyNDhjODk2MzYzNiIsInJvbGUiOiJQZXRPd25lciIsImlhdCI6MTc5MzcwMTQ2MCwiZXhwIjoxNzk0MzA2MjYwfQ.j6aCeD2Th3q2DMBRptYeOCI4ZqIRmId5TbjoZu-AXa4"

ADMIN_USER = {
    "_id": "6724628d39f4000000000001",
    "email": "hungminh19952005@gmail.com",
    "fullName": "Administrator",
    "role": "Admin",
    "status": "Active",
    "isEmailVerified": True,
}
TOKEN_ADMIN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MjQ2MjhkMzlmNDAwMDAwMDAwMDAwMSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc5MzcwMTQ2MCwiZXhwIjoxNzk0MzA2MjYwfQ.BvvmWYqKjJtN2cOunlBJgewkUrUBdOVgPFNGm0x23as"

screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(screenshot_dir, exist_ok=True)

console_errors = []

def on_console(msg):
    if msg.type in ["error"]:
        console_errors.append(msg.text)
        print(f"[BROWSER ERROR]: {msg.text}")

def on_page_error(err):
    console_errors.append(str(err))
    print(f"[PAGE UNCAUGHT ERROR]: {err}")

def setup_auth(page, user, token):
    page.goto("http://localhost:3000")
    if user and token:
        page.evaluate(f"""() => {{
            localStorage.setItem('token', '{token}');
            localStorage.setItem('user-info', JSON.stringify({json.dumps(user)}));
        }}""")
    else:
        page.evaluate("""() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user-info');
        }""")
    page.reload()

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on("console", on_console)
        page.on("pageerror", on_page_error)

        recorded_requests = []
        def on_request(req):
            if "appointment-orders" in req.url:
                post_data = req.post_data
                recorded_requests.append({
                    "method": req.method,
                    "url": req.url,
                    "post_data": post_data,
                })
                print(f"[NETWORK REQ] {req.method} {req.url} -> {post_data}")

        page.on("request", on_request)

        # -------------------------------------------------------------
        # 1. SCENARIO 1: Guest User on Homepage
        # -------------------------------------------------------------
        print("\n--- TEST 1: Guest User on Homepage ---")
        setup_auth(page, None, None)
        page.goto("http://localhost:3000/#quick-booking")
        page.wait_for_selector("#quick-booking", timeout=10000)
        time.sleep(1)

        guest_notice = page.locator("text=Bạn đang thao tác với tư cách Khách.")
        assert guest_notice.is_visible(), "Guest notice should be visible for unauthenticated user"

        prompt_box = page.locator("text=Vui lòng đăng nhập để xem danh sách thú cưng")
        assert prompt_box.is_visible(), "Prompt box for login should be visible on step 0"

        sc1 = os.path.join(screenshot_dir, "01_guest_quick_booking.png")
        page.screenshot(path=sc1)
        print(f"Captured: {sc1}")

        # -------------------------------------------------------------
        # 2. SCENARIO 2: Non-owner User (Admin) on Homepage
        # -------------------------------------------------------------
        print("\n--- TEST 2: Non-owner User (Admin) on Homepage ---")
        setup_auth(page, ADMIN_USER, TOKEN_ADMIN)
        page.goto("http://localhost:3000/#quick-booking")
        page.wait_for_selector("#quick-booking", timeout=10000)
        time.sleep(1)

        admin_warning = page.locator("text=Chỉ dành cho chủ nuôi")
        assert admin_warning.is_visible(), "Admin warning should be visible when logged in as Admin"

        sc2 = os.path.join(screenshot_dir, "02_non_owner_warning.png")
        page.screenshot(path=sc2)
        print(f"Captured: {sc2}")

        # -------------------------------------------------------------
        # 3. SCENARIO 3: Owner with No Pets on Homepage
        # -------------------------------------------------------------
        print("\n--- TEST 3: Owner with No Pets on Homepage ---")
        setup_auth(page, OWNER_NO_PET, TOKEN_NO_PET)
        page.goto("http://localhost:3000/#quick-booking")
        page.wait_for_selector("#quick-booking", timeout=10000)
        time.sleep(1.5)

        no_pet_msg = page.locator("text=Bạn chưa có hồ sơ thú cưng nào")
        assert no_pet_msg.is_visible(), "No-pet notice should be visible for owner with 0 pets"

        add_pet_btn = page.locator("button:has-text('Thêm thú cưng trong Dashboard')")
        assert add_pet_btn.is_visible(), "Add pet CTA should be visible"

        # Verify clicking 'Tiếp tục' displays helpful feedback instead of doing nothing
        page.click("button:has-text('Tiếp tục')")
        time.sleep(0.5)
        inline_pet_err = page.locator(".field-error:has-text('Vui lòng thêm hồ sơ thú cưng')")
        assert inline_pet_err.is_visible(), "Inline guidance error should appear when clicking Tiếp tục without pets"

        sc3 = os.path.join(screenshot_dir, "03_no_pets_owner.png")
        page.screenshot(path=sc3)
        print(f"Captured: {sc3}")

        # -------------------------------------------------------------
        # 4. SCENARIO 4: Valid Owner - Pet Selection & 409 Conflict
        # -------------------------------------------------------------
        print("\n--- TEST 4: Valid Owner - Pet Selection & 409 Conflict ---")
        setup_auth(page, OWNER_0, TOKEN_OWNER_0)
        page.goto("http://localhost:3000/#quick-booking")
        page.wait_for_selector("#quick-booking", timeout=10000)
        time.sleep(1.5)

        # Wait for pets to finish loading and pet select to be visible
        page.wait_for_selector(".ant-select", state="visible", timeout=15000)
        pet_selector = page.locator(".ant-select")
        assert pet_selector.is_visible(), "Pet select should be visible"
        print("Selected pet select visible, moving to step 1...")

        # Click Next to step 1
        page.click("button:has-text('Tiếp tục')")
        time.sleep(0.5)

        # Step 1: Pick Date 2026-11-20 (known conflicting date)
        date_picker = page.locator(".ant-picker")
        assert date_picker.is_visible(), "Date picker should be visible"
        date_picker.click()
        time.sleep(0.5)

        # Type date or click input
        picker_input = page.locator(".ant-picker input")
        picker_input.fill("20/11/2026")
        picker_input.press("Enter")
        time.sleep(0.5)

        # Enter note
        note_input = page.locator("textarea")
        note_input.fill("Ghi chú kiểm tra đặt lịch online E2E - Khám tổng quát")
        time.sleep(0.5)

        # Click Next to step 2 (Confirmation)
        page.click("button:has-text('Tiếp tục')")
        time.sleep(0.5)

        # Verify summary
        summary = page.locator("text=Xác nhận thông tin đặt hẹn:")
        assert summary.is_visible(), "Summary should be visible on step 2"

        # Submit
        print("Submitting booking on 2026-11-20 to trigger 409...")
        page.click("button:has-text('Xác nhận đặt lịch hẹn')")
        time.sleep(1.5)

        # Check 409 alert
        conflict_msg = page.locator(".ant-alert-message:has-text('Thú cưng này đã có lịch trong ngày đã chọn.')")
        assert conflict_msg.is_visible(), "409 duplicate booking alert must be visible"
        print("409 Conflict handled correctly!")

        sc4 = os.path.join(screenshot_dir, "04_duplicate_409_handled.png")
        page.screenshot(path=sc4)
        print(f"Captured: {sc4}")

        # -------------------------------------------------------------
        # 5. SCENARIO 5: Valid Owner - Change Date & Success 201
        # -------------------------------------------------------------
        import random
        random_day = f"{random.randint(1, 28):02d}"
        free_date_dmy = f"{random_day}/12/2026"
        print(f"\n--- TEST 5: Valid Owner - Change Date & Success 201 (using {free_date_dmy}) ---")
        # Click Quay lại
        page.click("button:has-text('Quay lại')")
        time.sleep(0.5)

        # Change date to free future date
        picker_input = page.locator(".ant-picker input")
        picker_input.click()
        picker_input.press("Control+a")
        picker_input.fill(free_date_dmy)
        picker_input.press("Enter")
        time.sleep(0.5)

        # Click Tiếp tục
        page.click("button:has-text('Tiếp tục')")
        time.sleep(0.5)

        # Submit
        print("Submitting booking on 2026-11-28...")
        page.click("button:has-text('Xác nhận đặt lịch hẹn')")
        time.sleep(2)

        # Verify Success Screen
        success_title = page.locator("text=Đặt Lịch Hẹn Thành Công!")
        assert success_title.is_visible(), "Success card title should be visible"

        code_elem = page.locator(".code-val")
        appointment_code = code_elem.text_content().strip()
        print(f"Created Online Appointment Code: {appointment_code}")
        assert appointment_code.startswith("APT-"), f"Appointment code should start with APT-, got {appointment_code}"

        sc5 = os.path.join(screenshot_dir, "05_booking_success_201.png")
        page.screenshot(path=sc5)
        print(f"Captured: {sc5}")

        # -------------------------------------------------------------
        # 6. SCENARIO 6: Dashboard - Appointment List & Filters
        # -------------------------------------------------------------
        print("\n--- TEST 6: Dashboard - Appointment List & Filters ---")
        page.click("button:has-text('Xem trong Dashboard')")
        page.wait_for_url("**/dashboard", timeout=10000)
        time.sleep(2)

        # Verify Appointments Section Card
        apt_title = page.locator("text=Danh Sách Lịch Hẹn Khám Trực Tuyến")
        assert apt_title.is_visible(), "Appointments table section should be visible in Dashboard"

        # Verify newly created code is in the table
        new_code_in_table = page.locator(f"text={appointment_code}")
        assert new_code_in_table.is_visible(), f"Newly created appointment {appointment_code} should be in table"

        # Verify pet name is mapped
        pet_name_in_table = page.locator("text=Bé Example").first
        assert pet_name_in_table.is_visible(), "Pet name 'Bé Example' should be mapped in table"

        # StatCard check
        stat_label = page.locator(".stat-header:has-text('Lịch hẹn trực tuyến')")
        assert stat_label.is_visible(), "StatCard 'Lịch hẹn trực tuyến' should be visible"

        sc6 = os.path.join(screenshot_dir, "06_dashboard_appointments_table.png")
        page.screenshot(path=sc6)
        print(f"Captured: {sc6}")

        # -------------------------------------------------------------
        # 7. SCENARIO 7: Dashboard - Appointment Detail Modal
        # -------------------------------------------------------------
        print("\n--- TEST 7: Dashboard - Appointment Detail Modal ---")
        # Click 'Chi tiết' button on first appointment row
        page.wait_for_selector(".ant-table-row", state="visible", timeout=10000)
        detail_btn = page.locator(".ant-table-row button:has-text('Chi tiết')").first
        detail_btn.click()
        time.sleep(1.5)

        modal_title = page.locator("text=Chi Tiết Lịch Hẹn Khám Trực Tuyến")
        assert modal_title.is_visible(), "Appointment Detail Modal title should be visible"

        modal_code = page.locator(".ant-modal .code-val")
        assert modal_code.is_visible(), "Appointment code in modal should be visible"

        modal_pet = page.locator(".ant-modal").get_by_text("Bé Example").first
        assert modal_pet.is_visible(), "Pet name 'Bé Example' should be visible in modal"

        sc7 = os.path.join(screenshot_dir, "07_appointment_detail_modal.png")
        page.screenshot(path=sc7)
        print(f"Captured: {sc7}")

        # Close modal
        page.click(".ant-modal button:has-text('Đóng')")
        time.sleep(0.5)

        # -------------------------------------------------------------
        # 8. SCENARIO 8: Responsive Layout Verification
        # -------------------------------------------------------------
        print("\n--- TEST 8: Responsive Layout Verification ---")
        # Mobile 375x812
        context_mobile = browser.new_context(viewport={"width": 375, "height": 812})
        page_m = context_mobile.new_page()
        setup_auth(page_m, OWNER_0, TOKEN_OWNER_0)
        page_m.goto("http://localhost:3000/#quick-booking")
        page_m.wait_for_selector("#quick-booking", timeout=10000)
        time.sleep(1)
        sc8 = os.path.join(screenshot_dir, "08_mobile_quick_booking.png")
        page_m.screenshot(path=sc8)
        print(f"Captured: {sc8}")

        # Tablet 768x1024 Dashboard
        context_tablet = browser.new_context(viewport={"width": 768, "height": 1024})
        page_t = context_tablet.new_page()
        setup_auth(page_t, OWNER_0, TOKEN_OWNER_0)
        page_t.goto("http://localhost:3000/dashboard")
        page_t.wait_for_selector(".dashboard-header", timeout=10000)
        time.sleep(1.5)
        sc9 = os.path.join(screenshot_dir, "09_tablet_dashboard.png")
        page_t.screenshot(path=sc9)
        print(f"Captured: {sc9}")

        # Verify Network payloads were clean
        print("\n--- Network Payloads Analysis ---")
        for req in recorded_requests:
            if req["method"] == "POST" and "online" in req["url"]:
                payload = json.loads(req["post_data"]) if req["post_data"] else {}
                print(f"POST payload: {payload}")
                assert "petId" in payload, "petId must be in payload"
                assert "date" in payload, "date must be in payload"
                # Ensure no forbidden fields
                for forbidden in ["ownerId", "serviceId", "staffId", "slot", "doctorId", "time"]:
                    assert forbidden not in payload, f"Forbidden field '{forbidden}' found in POST payload!"
                print("Payload contract 100% verified!")

        browser.close()
        print("\nALL E2E BROWSER TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
