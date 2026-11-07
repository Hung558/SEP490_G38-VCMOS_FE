import os
import sys
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Asus\.gemini\antigravity\brain\2b391f3f-33be-4539-96e0-85cb3445bf25"

OWNER_USER = {
    "_id": "6ad96d4a9664da6b2c0d8d61",
    "email": "exampleuserupdated@gmail.com",
    "fullName": "Example User",
    "role": "PetOwner",
    "status": "Active",
    "isEmailVerified": True,
}
TOKEN = "fake-jwt-token-petowner"

MOCK_PETS = [
    {
        "_id": "6ad96d4a9664da6b2c0d8d70",
        "name": "Mimi",
        "species": "Mèo",
        "breed": "Anh lông ngắn",
        "weight": 4.5,
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8d71",
        "name": "Lu",
        "species": "Chó",
        "breed": "Poodle",
        "weight": 6.2,
        "ownerId": "6ad96d4a9664da6b2c0d8d61",
        "status": "Active",
    },
]

MOCK_SERVICES = [
    {
        "_id": "6ad96d4a9664da6b2c0d8e01",
        "name": "Khám tổng quát",
        "category": "VeterinaryCare",
        "defaultDuration": 30,
        "basePrice": 150000,
        "status": "Active",
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8e02",
        "name": "Tiêm phòng dại",
        "category": "Vaccination",
        "defaultDuration": 20,
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
        "defaultDuration": 15,
        "basePrice": 50000,
        "status": "Inactive",
    },
]

def run_tests():
    print("[START] Combined Online Booking E2E Verification")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        recorded_booking_requests = []
        recorded_add_service_requests = []

        def handle_route(route):
            url = route.request.url
            method = route.request.method

            # Pets mock
            if "/api/pets" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({"items": MOCK_PETS, "pagination": {"total": 2, "page": 1, "limit": 100}}),
                )
                return

            # Services mock
            if "/api/services" in url:
                # Return only Active services as backend does when status=Active is requested
                active_only = [s for s in MOCK_SERVICES if s["status"] == "Active"]
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({"services": active_only}),
                )
                return

            # Combined Online Booking endpoint
            if "/api/appointment-services/online-booking" in url and method == "POST":
                body = route.request.post_data_json
                recorded_booking_requests.append(body)
                print(f"[NET] POST /appointment-services/online-booking -> {body}")

                # Simulate conflict if date is 2026-11-25
                if body.get("date") == "2026-11-25":
                    route.fulfill(
                        status=409,
                        content_type="application/json",
                        body=json.dumps({"message": "Thú cưng này đã có lịch hẹn trong ngày đã chọn"}),
                    )
                    return

                # Success response
                created_res = {
                    "message": "Đặt lịch online thành công",
                    "data": {
                        "appointment": {
                            "_id": "6ad96d4a9664da6b2c0d8f10",
                            "code": "APT-K7M2QX",
                            "petId": body.get("petId"),
                            "ownerId": OWNER_USER["_id"],
                            "date": body.get("date"),
                            "note": body.get("note", ""),
                            "isOnline": True,
                            "derivedStatus": "Booked",
                            "checkedInAt": None,
                            "createdAt": "2026-11-07T05:00:00.000Z",
                            "updatedAt": "2026-11-07T05:00:00.000Z",
                        },
                        "services": [
                            {
                                "_id": f"6ad96d4a9664da6b2c0d8f{idx+1}",
                                "orderId": "6ad96d4a9664da6b2c0d8f10",
                                "serviceId": s["serviceId"],
                                "sequenceNo": s.get("sequenceNo", idx + 1),
                                "status": "Booked",
                                "isEmergency": s.get("isEmergency", False),
                                "preferredStaffId": None,
                                "assignedStaffId": None,
                                "createdAt": "2026-11-07T05:00:00.000Z",
                                "updatedAt": "2026-11-07T05:00:00.000Z",
                            }
                            for idx, s in enumerate(body.get("services", []))
                        ],
                    },
                }
                route.fulfill(status=201, content_type="application/json", body=json.dumps(created_res))
                return

            # Existing Single Service Add endpoint
            if "/api/appointment-services/online" in url and method == "POST":
                body = route.request.post_data_json
                recorded_add_service_requests.append(body)
                print(f"[NET] POST /appointment-services/online -> {body}")
                route.fulfill(
                    status=201,
                    content_type="application/json",
                    body=json.dumps({
                        "message": "Thêm dịch vụ thành công",
                        "data": {
                            "_id": "6ad96d4a9664da6b2c0d8f99",
                            "orderId": body.get("orderId"),
                            "serviceId": body.get("serviceId"),
                            "sequenceNo": body.get("sequenceNo", 3),
                            "status": "Booked",
                            "isEmergency": body.get("isEmergency", False),
                            "createdAt": "2026-11-07T05:05:00.000Z",
                            "updatedAt": "2026-11-07T05:05:00.000Z",
                        },
                    }),
                )
                return

            # Owner appointments list mock
            if "/api/appointment-orders/me" in url and method == "GET":
                if "/api/appointment-orders/me/" in url:
                    # Detail endpoint
                    apt_id = url.split("/api/appointment-orders/me/")[1].split("?")[0]
                    detail_data = {
                        "data": {
                            "_id": apt_id,
                            "code": "APT-K7M2QX",
                            "petId": "6ad96d4a9664da6b2c0d8d70",
                            "ownerId": OWNER_USER["_id"],
                            "date": "2026-11-20",
                            "note": "Khám tổng quát và tiêm phòng",
                            "isOnline": True,
                            "checkedInAt": None,
                            "derivedStatus": "Booked",
                            "createdAt": "2026-11-07T05:00:00.000Z",
                            "updatedAt": "2026-11-07T05:00:00.000Z",
                            "services": [
                                {
                                    "_id": "6ad96d4a9664da6b2c0d8f1",
                                    "orderId": apt_id,
                                    "serviceId": {
                                        "_id": "6ad96d4a9664da6b2c0d8e01",
                                        "name": "Khám tổng quát",
                                        "category": "VeterinaryCare",
                                        "defaultDuration": 30,
                                        "basePrice": 150000,
                                    },
                                    "sequenceNo": 1,
                                    "preferredStaffId": {
                                        "_id": "6ad96d4a9664da6b2c0d8b05",
                                        "fullName": "Bác sĩ Nguyễn Văn A",
                                    },
                                    "assignedStaffId": {
                                        "_id": "6ad96d4a9664da6b2c0d8b06",
                                        "fullName": "BS. Trần Thị B",
                                    },
                                    "status": "Booked",
                                    "isEmergency": False,
                                    "createdAt": "2026-11-07T05:00:00.000Z",
                                    "updatedAt": "2026-11-07T05:00:00.000Z",
                                },
                                {
                                    "_id": "6ad96d4a9664da6b2c0d8f2",
                                    "orderId": apt_id,
                                    "serviceId": {
                                        "_id": "6ad96d4a9664da6b2c0d8e02",
                                        "name": "Tiêm phòng dại",
                                        "category": "Vaccination",
                                        "defaultDuration": 20,
                                        "basePrice": 200000,
                                    },
                                    "sequenceNo": 2,
                                    "preferredStaffId": None,
                                    "assignedStaffId": None,
                                    "status": "Booked",
                                    "isEmergency": True,
                                    "createdAt": "2026-11-07T05:00:00.000Z",
                                    "updatedAt": "2026-11-07T05:00:00.000Z",
                                },
                            ],
                        }
                    }
                    route.fulfill(status=200, content_type="application/json", body=json.dumps(detail_data))
                    return

                # List endpoint
                list_data = {
                    "data": [
                        {
                            "_id": "6ad96d4a9664da6b2c0d8f10",
                            "code": "APT-K7M2QX",
                            "petId": "6ad96d4a9664da6b2c0d8d70",
                            "ownerId": OWNER_USER["_id"],
                            "date": "2026-11-20",
                            "note": "Khám tổng quát và tiêm phòng",
                            "isOnline": True,
                            "derivedStatus": "Booked",
                            "checkedInAt": None,
                            "createdAt": "2026-11-07T05:00:00.000Z",
                            "updatedAt": "2026-11-07T05:00:00.000Z",
                        }
                    ],
                    "pagination": {"total": 1, "page": 1, "limit": 10, "totalPages": 1},
                }
                route.fulfill(status=200, content_type="application/json", body=json.dumps(list_data))
                return

            route.continue_()

        page.route("**/api/**", handle_route)

        print("[TEST] 1. Setting up PetOwner auth...")
        page.goto("http://localhost:3000")
        page.evaluate(f"""() => {{
            localStorage.setItem('token', '{TOKEN}');
            localStorage.setItem('user-info', JSON.stringify({json.dumps(OWNER_USER)}));
            localStorage.setItem('USER', JSON.stringify({json.dumps(OWNER_USER)}));
        }}""")
        page.reload()
        page.wait_for_selector("#quick-booking", timeout=10000)
        page.wait_for_selector(".ant-select", timeout=8000)
        time.sleep(1)

        # Step 0: Check pet selection
        print("[TEST] 2. Wizard Step 0: Pet Selection...")
        page.wait_for_selector(".wizard-steps", timeout=5000)
        # Advance to step 1
        page.locator("button.btn-next").click()
        time.sleep(0.8)

        # Step 1: Active Services Selection
        print("[TEST] 3. Wizard Step 1: Services Selection & Validation...")
        # Check that empty services blocks "Tiếp tục"
        page.locator("button.btn-next").click()
        time.sleep(0.5)
        assert page.locator("text=Lịch hẹn phải có ít nhất một dịch vụ").is_visible(), "Empty service selection must show validation error"
        print("-> Confirmed: Empty service selection is blocked")

        # Select two services: "Khám tổng quát" and "Tiêm phòng dại"
        select_box = page.locator(".ant-select-multiple").first
        select_box.click()
        page.wait_for_selector(".ant-select-dropdown", timeout=5000)
        time.sleep(0.5)

        # Verify inactive service is NOT present in options
        assert not page.locator(".ant-select-item-option:has-text('Dịch vụ đã ngừng hoạt động')").is_visible(), "Inactive services must not be selectable"
        print("-> Confirmed: Inactive services excluded from catalog")

        page.locator(".ant-select-item-option:has-text('Khám tổng quát')").click()
        time.sleep(0.3)
        page.locator(".ant-select-item-option:has-text('Tiêm phòng dại')").click()
        time.sleep(0.3)
        # Close select dropdown
        page.keyboard.press("Escape")
        time.sleep(0.5)

        # Toggle emergency on second service
        emergency_switches = page.locator(".service-item-card .ant-switch")
        assert emergency_switches.count() == 2, f"Expected 2 service item cards, got {emergency_switches.count()}"
        emergency_switches.nth(1).click()
        time.sleep(0.3)
        print("-> Toggled emergency switch on service #2")

        p_services = os.path.join(ARTIFACT_DIR, "combined_booking_01_services_step.png")
        page.screenshot(path=p_services)
        print(f"-> Saved screenshot: {p_services}")

        # Advance to Step 2: Date & Note
        page.locator("button.btn-next").click()
        time.sleep(0.8)

        print("[TEST] 4. Wizard Step 2: Date & Note...")
        # Select date
        page.locator(".ant-picker input").first.click()
        time.sleep(0.3)
        page.locator(".ant-picker input").first.fill("20/11/2026")
        page.keyboard.press("Enter")
        time.sleep(0.3)

        page.locator("textarea").first.fill("Bé hơi nhát, nhờ bác sĩ khám nhẹ nhàng")
        time.sleep(0.3)

        p_date = os.path.join(ARTIFACT_DIR, "combined_booking_02_date_step.png")
        page.screenshot(path=p_date)
        print(f"-> Saved screenshot: {p_date}")

        # Advance to Step 3: Confirmation Summary
        page.locator("button.btn-next").click()
        time.sleep(0.8)

        print("[TEST] 5. Wizard Step 3: Confirmation Summary...")
        assert page.locator(".summary-box:has-text('Bé Mimi')").is_visible(), "Pet name must show in summary"
        assert page.locator(".summary-box:has-text('Khám tổng quát')").is_visible(), "Selected service 1 must show in summary"
        assert page.locator(".summary-box:has-text('Tiêm phòng dại')").is_visible(), "Selected service 2 must show in summary"

        p_summary = os.path.join(ARTIFACT_DIR, "combined_booking_03_confirmation_step.png")
        page.screenshot(path=p_summary)
        print(f"-> Saved screenshot: {p_summary}")

        # Submit combined booking
        print("[TEST] 6. Submitting Combined Online Booking...")
        page.locator("button.btn-submit").click()
        time.sleep(1.5)

        # Check recorded POST request
        assert len(recorded_booking_requests) > 0, "Combined booking endpoint must have been called"
        last_req = recorded_booking_requests[-1]
        print(f"-> Captured combined booking body: {last_req}")
        assert last_req.get("petId") == "6ad96d4a9664da6b2c0d8d70", "petId must match"
        assert last_req.get("date") == "2026-11-20", "date must match"
        assert "ownerId" not in last_req, "ownerId MUST NOT be in request body"
        assert "code" not in last_req, "code MUST NOT be in request body"
        assert "derivedStatus" not in last_req, "derivedStatus MUST NOT be in request body"
        assert len(last_req.get("services", [])) == 2, "services array must have 2 items"
        assert last_req["services"][0]["serviceId"] == "6ad96d4a9664da6b2c0d8e01"
        assert last_req["services"][1]["serviceId"] == "6ad96d4a9664da6b2c0d8e02"
        assert last_req["services"][1]["isEmergency"] is True, "service #2 must have isEmergency=True"
        assert "orderId" not in last_req["services"][0], "orderId MUST NOT be in service item"
        assert "status" not in last_req["services"][0], "status MUST NOT be in service item"

        # Verify success screen
        page.wait_for_selector(".appointment-code-box", timeout=5000)
        assert page.locator("text=APT-K7M2QX").is_visible(), "Created appointment code must be displayed"
        p_success = os.path.join(ARTIFACT_DIR, "combined_booking_04_success_card.png")
        page.screenshot(path=p_success)
        print(f"-> Saved screenshot: {p_success}")

        # -------------------------------------------------------------
        # 7. Check Dashboard Appointment Detail with Services Section
        # -------------------------------------------------------------
        print("\n[TEST] 7. Verifying Dashboard Appointment Detail Modal with Services...")
        page.goto("http://localhost:3000/dashboard")
        page.wait_for_selector(".ant-table", timeout=10000)
        time.sleep(1)

        # Open Detail Modal
        page.locator("button:has-text('Chi tiết')").first.click()
        page.wait_for_selector(".ant-modal-content", timeout=5000)
        time.sleep(1)

        assert page.locator(".ant-modal-content:has-text('Danh Sách Dịch Vụ Khám')").is_visible(), "Modal must have 'Danh Sách Dịch Vụ Khám'"
        assert page.locator(".ant-modal-content:has-text('Khám tổng quát')").is_visible(), "Populated service name must be displayed"
        assert page.locator(".ant-modal-content:has-text('Tiêm phòng dại')").is_visible(), "Populated service #2 must be displayed"
        assert page.locator(".ant-modal-content:has-text('Bác sĩ Nguyễn Văn A')").is_visible(), "Preferred staff name must be displayed"
        assert page.locator(".ant-modal-content:has-text('BS. Trần Thị B')").is_visible(), "Assigned staff name must be displayed"

        p_detail = os.path.join(ARTIFACT_DIR, "combined_booking_05_detail_services.png")
        page.screenshot(path=p_detail)
        print(f"-> Saved screenshot: {p_detail}")

        # -------------------------------------------------------------
        # 8. Check Existing Add Service Modal (Phase 04)
        # -------------------------------------------------------------
        print("\n[TEST] 8. Verifying Existing Add Service Modal (POST /appointment-services/online)...")
        # Click "Thêm dịch vụ" inside detail modal
        page.locator(".ant-modal-footer button:has-text('Thêm dịch vụ')").click()
        page.wait_for_selector("text=Thêm Dịch Vụ Vào Lịch Hẹn", timeout=5000)
        time.sleep(0.5)

        # Select service in AddAppointmentServiceModal
        page.locator(".ant-modal-content .ant-select").last.click()
        time.sleep(0.4)
        page.locator(".ant-select-item-option:has-text('Tắm spa cơ bản')").click()
        time.sleep(0.4)

        page.locator(".ant-modal-footer button.ant-btn-primary:has-text('Thêm dịch vụ')").last.click()
        time.sleep(1)

        assert len(recorded_add_service_requests) > 0, "Single add service must call POST /appointment-services/online"
        last_add_req = recorded_add_service_requests[-1]
        print(f"-> Captured single service add body: {last_add_req}")
        assert last_add_req["serviceId"] == "6ad96d4a9664da6b2c0d8e03", "serviceId must match Tắm spa"
        assert "orderId" in last_add_req, "orderId must be present in single service add"

        # -------------------------------------------------------------
        # 9. Responsive layout captures (Phase 06)
        # -------------------------------------------------------------
        print("\n[TEST] 9. Capturing responsive layouts at 375px, 768px, 1440px...")
        page.goto("http://localhost:3000/#quick-booking")
        page.wait_for_selector("#quick-booking", timeout=10000)
        time.sleep(1)

        # Mobile 375px
        page.set_viewport_size({"width": 375, "height": 812})
        time.sleep(0.5)
        p_mob = os.path.join(ARTIFACT_DIR, "combined_booking_06_mobile_375px.png")
        page.screenshot(path=p_mob)
        print(f"-> Saved mobile screenshot: {p_mob}")

        # Tablet 768px
        page.set_viewport_size({"width": 768, "height": 1024})
        time.sleep(0.5)
        p_tab = os.path.join(ARTIFACT_DIR, "combined_booking_07_tablet_768px.png")
        page.screenshot(path=p_tab)
        print(f"-> Saved tablet screenshot: {p_tab}")

        # Desktop 1440px
        page.set_viewport_size({"width": 1440, "height": 900})
        time.sleep(0.5)
        p_desk = os.path.join(ARTIFACT_DIR, "combined_booking_08_desktop_1440px.png")
        page.screenshot(path=p_desk)
        print(f"-> Saved desktop screenshot: {p_desk}")

        browser.close()
        print("\n[SUCCESS] ALL COMBINED ONLINE BOOKING E2E TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
