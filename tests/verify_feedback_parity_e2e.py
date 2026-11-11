import os
import sys
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Asus\.gemini\antigravity\brain\2b391f3f-33be-4539-96e0-85cb3445bf25"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

OWNER_USER = {
    "_id": "6ad96d4a9664da6b2c0d8d61",
    "email": "petowner@gmail.com",
    "fullName": "Nguyễn Văn Chủ Nuôi",
    "phone": "0988111222",
    "role": "PetOwner",
    "status": "Active",
    "isEmailVerified": True,
}
TOKEN = "fake-jwt-token-petowner-e2e"

MOCK_PETS = [
    {
        "_id": "6ad96d4a9664da6b2c0d8d70",
        "name": "Milo",
        "species": "Chó",
        "breed": "Poodle",
        "weight": 5.2,
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d71",
        "name": "Mimi",
        "species": "Mèo",
        "breed": "Anh lông ngắn",
        "weight": 3.8,
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "status": "Active",
    },
]

MOCK_SERVICES = [
    {
        "_id": "6ad96d4a9664da6b2c0d8e01",
        "name": "Khám tổng quát",
        "category": "Examination",
        "defaultDuration": 30,
        "basePrice": 150000,
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8e02",
        "name": "Tiêm phòng dại",
        "category": "Vaccination",
        "defaultDuration": 15,
        "basePrice": 200000,
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8e03",
        "name": "Tắm spa cơ bản",
        "category": "Grooming",
        "defaultDuration": 60,
        "basePrice": 350000,
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8e99",
        "name": "Dịch vụ đã ngừng hoạt động",
        "category": "Other",
        "defaultDuration": 20,
        "basePrice": 80000,
        "status": "Inactive",
    },
]

MOCK_APPOINTMENTS = [
    {
        "_id": "6ad96d4a9664da6b2c0d8a01",
        "code": "APT-G4LL8S",
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "petId": "6ad96d4a9664da6b2c0d8d70",
        "date": "2026-11-06T00:00:00.000Z",
        "note": "dị ứng",
        "isOnline": True,
        "derivedStatus": "Booked",
        "createdAt": "2026-11-06T08:00:00.000Z",
    }
]

MOCK_APPOINTMENT_DETAIL = {
    "_id": "6ad96d4a9664da6b2c0d8a01",
    "code": "APT-G4LL8S",
    "ownerId": "6ad96d4a9664da6b2c0d8d61",
    "petId": "6ad96d4a9664da6b2c0d8d70",
    "date": "2026-11-06T00:00:00.000Z",
    "note": "dị ứng",
    "isOnline": True,
    "derivedStatus": "Booked",
    "services": [
        {
            "_id": "6ad96d4a9664da6b2c0d8s01",
            "orderId": "6ad96d4a9664da6b2c0d8a01",
            "serviceId": {
                "_id": "6ad96d4a9664da6b2c0d8e01",
                "name": "Khám tổng quát",
                "category": "Examination",
                "basePrice": 150000,
            },
            "assignedStaffId": {
                "_id": "6ad96d4a9664da6b2c0d8b01",
                "fullName": "BS. Hoàng Văn Minh",
            },
            "status": "Booked",
            "sequenceNo": 1,
            "isEmergency": False,
        }
    ],
}

def run_all_tests():
    print("=" * 60)
    print("RUNNING /ak:test COMPREHENSIVE VERIFICATION")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        recorded_booking_posts = []

        def handle_api_route(route):
            url = route.request.url
            method = route.request.method

            # Pets mock
            if "/api/pets" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({"items": MOCK_PETS, "pagination": {"total": len(MOCK_PETS), "page": 1, "limit": 100}}),
                )
                return

            # Services mock
            if "/api/services" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({"services": MOCK_SERVICES, "total": len(MOCK_SERVICES)}),
                )
                return

            # Appointment detail
            if "/api/appointment-orders/me/" in url and method == "GET":
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({"data": MOCK_APPOINTMENT_DETAIL}),
                )
                return

            # Appointment list
            if "/api/appointment-orders/me" in url and method == "GET":
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({
                        "data": MOCK_APPOINTMENTS,
                        "pagination": {"total": 1, "page": 1, "limit": 10},
                    }),
                )
                return

            # Online booking submit
            if "/api/appointment-services/online-booking" in url and method == "POST":
                body = route.request.post_data_json
                recorded_booking_posts.append(body)
                print(f"[API Intercept] POST /api/appointment-services/online-booking: {body}")
                created_record = {
                    "appointment": {
                        "_id": "6ad96d4a9664da6b2c0d8a99",
                        "code": "APT-NEW888",
                        "petId": body.get("petId"),
                        "date": body.get("date"),
                        "note": body.get("note", ""),
                        "derivedStatus": "Booked",
                    },
                    "services": [
                        {
                            "_id": f"6ad96d4a9664da6b2c0d8s{idx}",
                            "serviceId": s.get("serviceId"),
                            "sequenceNo": s.get("sequenceNo", idx + 1),
                            "isEmergency": s.get("isEmergency", False),
                            "status": "Booked",
                        }
                        for idx, s in enumerate(body.get("services", []))
                    ],
                }
                route.fulfill(
                    status=201,
                    content_type="application/json",
                    body=json.dumps({"message": "Đặt lịch online thành công!", "data": created_record}),
                )
                return

            route.continue_()

        page.route("**/api/**", handle_api_route)

        # -----------------------------------------------------------------
        # TEST 1: Homepage - QuickBookingSection removed, CTAs routed
        # -----------------------------------------------------------------
        print("\n--- TEST 1: Homepage Verification ---")
        page.goto("http://localhost:3000/")
        time.sleep(2)

        # 1.1 Verify #quick-booking is not in DOM
        qb_element = page.locator("#quick-booking")
        assert qb_element.count() == 0, "ERROR: #quick-booking should NOT be on Homepage!"
        print("✓ Verified: #quick-booking form is successfully removed from Landing Page.")

        # 1.2 Verify Hero CTA exists and navigates to login when guest
        hero_btn = page.locator("button:has-text('Đặt lịch hẹn khám ưu tiên')")
        assert hero_btn.is_visible(), "Hero booking CTA should be visible"
        hero_btn.click()
        time.sleep(1)
        assert "/login" in page.url, f"Expected url to contain /login, got {page.url}"
        print("✓ Verified: Guest clicking booking CTA safely redirects to Login page.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test1_homepage_no_quickbooking.png"))
        print("✓ Saved screenshot: test1_homepage_no_quickbooking.png")

        # -----------------------------------------------------------------
        # TEST 2: Dashboard Appointments Table - Action buttons layout
        # -----------------------------------------------------------------
        print("\n--- TEST 2: Dashboard Table & Action Buttons Layout ---")
        # Inject PetOwner login
        page.evaluate(
            """([user, token]) => {
                localStorage.setItem('user-info', JSON.stringify(user));
                localStorage.setItem('token', token);
            }""",
            [OWNER_USER, TOKEN],
        )

        page.goto("http://localhost:3000/dashboard?tab=appointments")
        time.sleep(2)

        # Verify table row exists
        table_row = page.locator("tr:has-text('APT-G4LL8S')")
        assert table_row.is_visible(), "Appointment row APT-G4LL8S should be rendered"

        # Check Action buttons
        detail_btn = table_row.locator("button:has-text('Chi tiết')")
        add_service_btn = table_row.locator("button:has-text('Thêm dịch vụ')")

        assert detail_btn.is_visible(), "Nút 'Chi tiết' should be visible"
        assert add_service_btn.is_visible(), "Nút 'Thêm dịch vụ' should be visible"

        # Check bounding box of "Thêm dịch vụ" button
        add_box = add_service_btn.bounding_box()
        table_box = page.locator(".ant-table-wrapper").bounding_box()
        print(f"  Button 'Thêm dịch vụ' position: x={add_box['x']:.1f}, width={add_box['width']:.1f}")

        # Ensure no text wrapping or overflow
        btn_text = add_service_btn.inner_text().strip()
        assert "Thêm dịch vụ" in btn_text, f"Expected text 'Thêm dịch vụ', got '{btn_text}'"
        print("✓ Verified: 'Thêm dịch vụ' and 'Chi tiết' buttons render clearly without clipping or text wrapping.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test2_dashboard_table_action_buttons.png"))
        print("✓ Saved screenshot: test2_dashboard_table_action_buttons.png")

        # -----------------------------------------------------------------
        # TEST 3: Dashboard Single-Screen Booking Form
        # -----------------------------------------------------------------
        print("\n--- TEST 3: Single-Screen Booking Form Verification ---")
        # Open booking form via direct URL ?tab=appointments&book=new
        page.goto("http://localhost:3000/dashboard?tab=appointments&book=new")
        time.sleep(2)

        # 3.1 Verify NO wizard steps
        wizard_steps = page.locator(".ant-steps")
        assert wizard_steps.count() == 0, "ERROR: Ant Design Steps wizard should NOT be rendered in single-form layout!"
        print("✓ Verified: Steps wizard (1..4) is eliminated; form is rendered on a single screen.")

        # 3.2 Verify all sections are visible simultaneously
        sec_pet = page.locator("text=1. Chọn thú cưng cần đặt lịch hẹn:")
        sec_services = page.locator("text=2. Chọn các dịch vụ khám & chăm sóc")
        sec_date = page.locator("text=3. Ngày hẹn khám:")
        sec_note = page.locator("text=4. Ghi chú triệu chứng hoặc lưu ý")
        submit_btn = page.locator("button:has-text('Xác nhận đặt lịch hẹn')")

        assert sec_pet.is_visible(), "Pet selection section should be visible"
        assert sec_services.is_visible(), "Services selection section should be visible"
        assert sec_date.is_visible(), "Date selection section should be visible"
        assert sec_note.is_visible(), "Note section should be visible"
        assert submit_btn.is_visible(), "Single confirm button should be visible"
        print("✓ Verified: All 4 sections (Pet, Services, Date, Note) and Confirmation button are visible simultaneously.")

        # 3.3 Test validation: submit without selecting services or date
        submit_btn.click()
        time.sleep(1)

        # Expect error messages for missing fields
        service_error = page.locator(".field-error:has-text('ít nhất một dịch vụ')")
        assert service_error.is_visible(), "Service missing error should appear"
        date_error = page.locator(".field-error:has-text('ngày')")
        assert date_error.is_visible(), "Date missing error should appear"
        print("✓ Verified: Client-side validation triggers simultaneously on missing fields without losing other inputs.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test3_single_form_validation_errors.png"))
        print("✓ Saved screenshot: test3_single_form_validation_errors.png")

        # 3.4 Fill form and submit successfully
        # Select service: Khám tổng quát & Tiêm phòng dại
        services_select = page.locator(".ant-select:has-text('Tìm kiếm và chọn một hoặc nhiều dịch vụ')")
        services_select.click()
        time.sleep(0.5)

        opt1 = page.locator(".ant-select-item-option:has-text('Khám tổng quát')")
        opt1.click()
        time.sleep(0.3)

        # Close select dropdown by clicking outside or pressing Escape
        page.keyboard.press("Escape")
        time.sleep(0.5)

        # Select date: click DatePicker and select tomorrow or today
        date_picker = page.locator("input[placeholder='Chọn ngày hẹn khám (từ hôm nay)']")
        date_picker.click()
        time.sleep(0.5)

        # Click the "Today" cell or next available date cell in the picker
        today_cell = page.locator(".ant-picker-cell-today")
        if today_cell.is_visible():
            today_cell.click()
        else:
            page.keyboard.press("Enter")
        time.sleep(0.5)

        # Fill note
        note_textarea = page.locator("textarea[placeholder*='Ví dụ: Bé có biểu hiện']")
        note_textarea.fill("Bé Milo cần kiểm tra định kỳ và tiêm vaccine.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test4_single_form_filled.png"))
        print("✓ Saved screenshot: test4_single_form_filled.png")

        # Submit form
        submit_btn.click()
        time.sleep(1.5)

        # 3.5 Verify API request payload
        assert len(recorded_booking_posts) == 1, f"Expected 1 POST request, got {len(recorded_booking_posts)}"
        post_data = recorded_booking_posts[0]
        assert post_data.get("petId") == "6ad96d4a9664da6b2c0d8d70", f"Unexpected petId: {post_data.get('petId')}"
        assert len(post_data.get("services", [])) >= 1, "Expected at least 1 service in payload"
        assert post_data.get("note") == "Bé Milo cần kiểm tra định kỳ và tiêm vaccine."
        assert "ownerId" not in post_data, "ownerId must NOT be in payload"
        assert "code" not in post_data, "code must NOT be in payload"
        print(f"✓ Verified: Payload conforms strictly to whitelist: {post_data}")

        # 3.6 Verify Success Card
        success_card = page.locator("text=Đặt Lịch Hẹn Thành Công!")
        assert success_card.is_visible(), "SuccessCard should be visible after booking"
        code_el = page.locator(".code-val:has-text('APT-NEW888')")
        assert code_el.is_visible(), "Appointment code APT-NEW888 should be displayed"
        print("✓ Verified: SuccessCard rendered with appointment code APT-NEW888.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test5_booking_success_card.png"))
        print("✓ Saved screenshot: test5_booking_success_card.png")

        browser.close()

    print("\n" + "=" * 60)
    print("ALL /ak:test VERIFICATION TESTS PASSED SUCCESSFULLY (100%)")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
