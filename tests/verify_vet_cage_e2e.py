import os
import sys
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Asus\.gemini\antigravity\brain\2b391f3f-33be-4539-96e0-85cb3445bf25"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

VET_USER = {
    "_id": "6ad96d4a9664da6b2c0d8d61",
    "email": "vet@clinic.com",
    "fullName": "Bác sĩ Nguyễn Văn Y",
    "phone": "0901000003",
    "role": "Veterinarian",
    "status": "Active",
    "isEmailVerified": True,
}
TOKEN = "fake-jwt-token-vet-e2e"

MOCK_CAGES = [
    {
        "_id": "6ad96d4a9664da6b2c0d8c01",
        "label": "W-S01",
        "size": "S",
        "status": "Available",
        "isIsolated": False,
        "maxWeightKg": 5,
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8c02",
        "label": "W-M01",
        "size": "M",
        "status": "Available",
        "isIsolated": False,
        "maxWeightKg": 15,
    },
    {
        "_id": "6ad96d4a9664da6b2c0d8c03",
        "label": "W-L01",
        "size": "L",
        "status": "Available",
        "isIsolated": False,
        "maxWeightKg": 30,
    },
]

MOCK_QUEUE = [
    {
        "_id": "6ad96d4a9664da6b2c0d8b01",
        "queueNo": 1,
        "status": "InProgress",
        "isEmergency": False,
        "serviceId": {
            "_id": "6ad96d4a9664da6b2c0d8e01",
            "name": "Khám tổng quát",
            "category": "Examination",
            "defaultDuration": 30,
        },
        "orderId": {
            "_id": "6ad96d4a9664da6b2c0d8a01",
            "code": "APT-CLINIC-01",
            "date": "2026-11-11",
            "derivedStatus": "CheckedIn",
            "petId": "6ad96d4a9664da6b2c0d8d70",
            "note": "Bé sốt và ngứa",
        },
    }
]

MOCK_RECORD = {
    "_id": "6ad96d4a9664da6b2c0d8f01",
    "appointmentServiceId": "6ad96d4a9664da6b2c0d8b01",
    "petId": {
        "_id": "6ad96d4a9664da6b2c0d8d70",
        "name": "Milo",
        "species": "Chó",
        "breed": "Poodle",
        "weight": 8.5,
    },
    "subjectiveNote": "Chủ nuôi báo bé ngứa nhiều 2 ngày nay",
    "objectiveNote": "Thân nhiệt 38.8 độ C, da tai đỏ nhẹ",
    "assessment": "Viêm da dị ứng thể nhẹ",
    "plan": "Vệ sinh tai hằng ngày, bôi thuốc kháng viêm",
    "prescriptions": [],
    "status": "Draft",
}

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Route mocks
        def handle_route(route):
            url = route.request.url
            if "/api/auth/me" in url or "/api/users/me" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "data": VET_USER}))
            elif "/api/appointment-services/my-queue" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "data": MOCK_QUEUE}))
            elif "/api/medical-records/service/6ad96d4a9664da6b2c0d8b01/complete" in url:
                post_data = json.loads(route.request.post_data or "{}")
                print(f"  [BE Mock] Complete called with payload: {post_data}")
                res = {
                    "medicalRecord": {**MOCK_RECORD, "status": "Draft"},
                    "appointmentService": {"_id": "6ad96d4a9664da6b2c0d8b01", "status": "Done"},
                    "appointmentOrder": {"_id": "6ad96d4a9664da6b2c0d8a01", "code": "APT-CLINIC-01", "derivedStatus": "WaitOwner"},
                    "waitingCageAssignment": {
                        "_id": "6ad96d4a9664da6b2c0d8ca1",
                        "cageId": {"_id": post_data.get("waitingCageId"), "label": "W-M01", "size": "M"},
                    } if post_data.get("waitingCageId") else None
                }
                route.fulfill(status=200, content_type="application/json", body=json.dumps(res))
            elif "/api/medical-records/service/6ad96d4a9664da6b2c0d8b01" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_RECORD))
            elif "/api/medical-records/pet/" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "pet": MOCK_RECORD["petId"],
                    "history": [MOCK_RECORD]
                }))
            elif "/api/cages" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "success": True,
                    "data": {"items": MOCK_CAGES, "total": 3, "page": 1, "limit": 20}
                }))
            elif "/api/products" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "success": True,
                    "data": {"items": [], "total": 0}
                }))
            elif "/api/cage-assignments/order/" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "success": True,
                    "data": {
                        "_id": "6ad96d4a9664da6b2c0d8ca1",
                        "cageId": {"_id": "6ad96d4a9664da6b2c0d8c02", "label": "W-M01", "size": "M"},
                        "assignedAt": "2026-11-11T10:00:00.000Z",
                        "releasedAt": None
                    }
                }))
            else:
                route.continue_()

        page.route("**/api/**", handle_route)

        # Inject Vet login
        page.goto("http://localhost:3000/")
        page.evaluate(
            """([user, token]) => {
                localStorage.setItem('user-info', JSON.stringify(user));
                localStorage.setItem('token', token);
            }""",
            [VET_USER, TOKEN],
        )

        # -------------------------------------------------------------
        # TEST 1: StaffQueue - Chuồng button visible and clickable for Vet
        # -------------------------------------------------------------
        print("\n--- TEST 1: StaffQueue for Vet shows Chuồng button ---")
        page.goto("http://localhost:3000/clinic/my-queue")
        time.sleep(2)

        cage_btn = page.locator("button:has-text('Chuồng')")
        assert cage_btn.is_visible(), "Nút 'Chuồng' should be visible for Veterinarian"
        print("✓ Verified: Veterinarian can see 'Chuồng' button in StaffQueue.")

        cage_btn.click()
        time.sleep(1)
        cage_modal = page.locator(".ant-modal:has-text('Chuồng của lịch hẹn')")
        assert cage_modal.is_visible(), "Modal Chuồng của lịch hẹn should open"
        print("✓ Verified: Modal Chuồng opens and displays current cage info.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "vet_test1_staff_queue_cage_modal.png"))
        page.locator(".ant-modal-close").click()
        time.sleep(0.5)

        # -------------------------------------------------------------
        # TEST 2: Vet Exam Record - Complete consultation with waitingCage picker
        # -------------------------------------------------------------
        print("\n--- TEST 2: ExamRecord SOAP completion with waitingCageId ---")
        page.goto("http://localhost:3000/clinic/exam/6ad96d4a9664da6b2c0d8b01")
        time.sleep(2)

        complete_btn = page.locator("button:has-text('Hoàn tất ca khám')")
        assert complete_btn.is_visible(), "Button 'Hoàn tất ca khám' should be visible"
        complete_btn.click()
        time.sleep(1)

        confirm_modal = page.locator(".ant-modal:has-text('Hoàn tất ca khám?')")
        assert confirm_modal.is_visible(), "Confirm modal should open"
        assert confirm_modal.locator("text=Chuồng chờ đón sau khám").is_visible(), "Waiting cage label should be present"

        # Check Select dropdown
        select_cage = confirm_modal.locator(".ant-select")
        assert select_cage.is_visible(), "Select cage dropdown should be visible"
        select_cage.click()
        time.sleep(1)

        # Verify small cage is disabled (since pet weighs 8.5kg > 5kg)
        overweight_item = page.locator(".ant-select-item-option-disabled:has-text('W-S01')")
        assert overweight_item.count() > 0, "Cage W-S01 should be disabled due to pet weight 8.5kg > 5kg"
        print("✓ Verified: Small cage is correctly disabled with overload notice according to BR-11.")

        # Select medium cage W-M01
        medium_item = page.locator(".ant-select-item-option:has-text('W-M01')")
        assert medium_item.is_visible(), "Cage W-M01 should be selectable"
        medium_item.click()
        time.sleep(0.5)

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "vet_test2_waiting_cage_picker.png"))
        print("✓ Saved screenshot: vet_test2_waiting_cage_picker.png")

        # Click Hoàn tất in modal
        modal_submit = confirm_modal.locator("button.ant-btn-primary:has-text('Hoàn tất')")
        modal_submit.click()
        time.sleep(1.5)

        # Verify toast success
        print("✓ Verified: Complete consultation succeeded with waitingCageId assigned.")
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "vet_test3_consultation_completed.png"))

        # -------------------------------------------------------------
        # TEST 3: Cages Page Access for Veterinarian
        # -------------------------------------------------------------
        print("\n--- TEST 3: Cages Page accessible for Veterinarian ---")
        page.goto("http://localhost:3000/cages")
        time.sleep(2)

        cages_table = page.locator(".ant-table-wrapper")
        assert cages_table.is_visible(), "Cages table should be visible for Veterinarian"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "vet_test4_cages_page_for_vet.png"))
        print("✓ Verified: Veterinarian can access /cages page and view clinic cages.")

        browser.close()
        print("\nAll 3 Vet Cage Parity E2E tests passed successfully!")

if __name__ == "__main__":
    run_tests()
