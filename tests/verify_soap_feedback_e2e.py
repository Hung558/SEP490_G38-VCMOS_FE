"""Browser regression tests; run against Vite with VITE_API_ROOT=/api."""
import os
import re
import unittest
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

BASE_URL = os.getenv("FE_BASE_URL", "http://localhost:3000")
SERVICE = "6ad96d4a9664da6b2c0d8b01"
ORDER = "6ad96d4a9664da6b2c0d8a01"
PET = "6ad96d4a9664da6b2c0d8d70"
VET = "6ad96d4a9664da6b2c0d8d61"
PRODUCT = "6ad96d4a9664da6b2c0d8c51"
MEDIUM_CAGE = "6ad96d4a9664da6b2c0d8c02"
RECORD_PATH = f"/api/medical-records/service/{SERVICE}"
SUBTASK_ERROR = "Còn chỉ định cận lâm sàng chưa hoàn thành"
SOAP = {
    "subjectiveNote": "Triệu chứng đã lưu",
    "objectiveNote": "Kết quả khám đã lưu",
    "assessment": "Chẩn đoán đã lưu",
    "plan": "Điều trị đã lưu",
}
USER = {
    "_id": VET,
    "email": "vet@example.test",
    "fullName": "Bác sĩ kiểm thử",
    "role": "Veterinarian",
    "status": "Active",
    "isEmailVerified": True,
}


class SoapFeedbackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        channel = os.getenv("PLAYWRIGHT_CHANNEL")
        cls.browser = cls.playwright.chromium.launch(
            **({"channel": channel} if channel else {})
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        context = self.browser.new_context(viewport={"width": 1440, "height": 900})
        self.addCleanup(context.close)
        self.page = context.new_page()
        self.page.set_default_timeout(10000)
        self.pet = {"_id": PET, "name": "Milo", "species": "Chó", "weight": 8.5}
        self.record = {
            "_id": "6ad96d4a9664da6b2c0d8f01",
            "appointmentServiceId": SERVICE,
            "petId": self.pet,
            "prescriptions": [],
            "status": "Draft",
            "createdAt": "2026-11-10T08:00:00.000Z",
            **SOAP,
        }
        self.service_status = "InProgress"
        self.order_status = "InProgress"
        self.complete_error = None
        self.save_error = None
        self.cage_error = False
        self.writes = []
        context.route(f"{BASE_URL}/api/**", self.api)
        self.page.goto(BASE_URL)
        self.page.evaluate(
            "user => { localStorage.setItem('user-info', JSON.stringify(user));"
            "localStorage.setItem('token', 'mock-veterinarian-token'); }",
            USER,
        )

    def api(self, route):
        path = urlparse(route.request.url).path
        method = route.request.method
        if path in ("/api/auth/me", "/api/users/me"):
            body = {"success": True, "data": USER}
        elif path == "/api/appointment-services/my-queue":
            body = {"data": [{
                "_id": SERVICE,
                "status": self.service_status,
                "serviceId": {"_id": SERVICE, "name": "Khám tổng quát", "category": "Examination"},
                "orderId": {"_id": ORDER, "code": "APT-SOAP", "date": "2026-11-10",
                            "petId": PET, "derivedStatus": self.order_status},
            }]}
        elif path == RECORD_PATH and method == "GET":
            if self.service_status == "Waiting":
                return route.fulfill(status=404, json={"message": "Chưa có bệnh án"})
            body = self.record
        elif path == f"{RECORD_PATH}/start" and method == "POST":
            self.writes.append(("start", route.request.post_data_json))
            self.service_status = self.order_status = "InProgress"
            body = {"appointmentService": {"status": self.service_status}, "medicalRecord": self.record}
        elif path == RECORD_PATH and method == "PUT":
            payload = route.request.post_data_json
            self.writes.append(("save", payload))
            if self.save_error:
                status, error = self.save_error
                return route.fulfill(status=status, json=error)
            self.record = {**self.record, **payload}
            body = self.record
        elif path == f"{RECORD_PATH}/complete" and method == "POST":
            payload = route.request.post_data_json
            self.writes.append(("complete", payload))
            if self.complete_error:
                status, error = self.complete_error
                return route.fulfill(status=status, json=error)
            self.service_status, self.order_status = "Done", "WaitOwner"
            if "weight" in payload:
                self.pet = {**self.pet, "weight": payload["weight"]}
            self.record = {**self.record, **payload, "petId": self.pet}
            body = {
                "medicalRecord": self.record,
                "appointmentService": {"_id": SERVICE, "status": self.service_status},
                "appointmentOrder": {"_id": ORDER, "derivedStatus": self.order_status},
            }
        elif path == f"/api/medical-records/pet/{PET}":
            body = {"pet": self.pet, "records": [{
                **self.record, "_id": "past-record", "subjectiveNote": "Ghi chú lần khám cũ",
                "appointmentServiceId": "previous-service",
            }]}
        elif path == "/api/cages":
            if self.cage_error:
                return route.fulfill(status=503, json={"message": "Danh sách chuồng tạm gián đoạn"})
            body = {"data": {"items": [
                {"_id": "small", "label": "W-S01", "size": "S", "status": "Available"},
                {"_id": MEDIUM_CAGE, "label": "W-M01", "size": "M", "status": "Available"},
                {"_id": "occupied", "label": "W-L01", "size": "L", "status": "Occupied"},
            ]}}
        elif path == "/api/products":
            query = urlparse(route.request.url).query
            items = [] if "category=Vaccine" in query else [{
                "_id": PRODUCT, "name": "Thuốc kiểm thử", "category": "Medicine",
                "status": "Active", "unit": "viên",
            }]
            body = {"data": {"items": items}}
        else:
            return route.fulfill(status=404, json={"message": "Mock không có endpoint này"})
        return route.fulfill(status=200, json=body)

    def open_exam(self):
        self.page.goto(f"{BASE_URL}/clinic/exam/{SERVICE}")

    def button(self, name):
        return self.page.get_by_role("button", name=re.compile(rf"(?:^| ){re.escape(name)}$"))

    def open_complete(self):
        self.button("Hoàn tất ca khám").click()
        dialog = self.page.get_by_role("dialog", name="Hoàn tất ca khám?")
        expect(dialog).to_be_visible()
        return dialog

    def test_start_missing_soap_conflict_and_retry(self):
        self.service_status = "Waiting"
        self.open_exam()
        self.button("Bắt đầu khám").click()
        plan = self.page.get_by_label("P · Phác đồ điều trị")
        expect(plan).to_have_value(SOAP["plan"])
        self.assertEqual(self.writes, [("start", None)])
        plan.fill("")
        self.button("Hoàn tất ca khám").click()
        expect(self.page.get_by_text("Bắt buộc nhập khi hoàn tất ca khám (BR-13)")).to_be_visible()
        self.assertEqual(len(self.writes), 1)
        plan.fill("Phác đồ chưa lưu")
        self.button("Thêm thuốc").click()
        self.page.get_by_label("Thuốc 1").click()
        self.page.locator(".ant-select-item-option").filter(has_text="Thuốc kiểm thử").click()
        self.page.get_by_label("Liều mỗi lần").fill("Một viên")
        self.page.get_by_label("Tần suất").fill("Hai lần")
        self.complete_error = (409, {"message": SUBTASK_ERROR})
        self.open_complete().get_by_role("button", name="Hoàn tất", exact=True).click()
        expect(self.page.get_by_role("alert").filter(has_text=SUBTASK_ERROR)).to_be_visible()
        expect(plan).to_be_enabled()
        expect(plan).to_have_value("Phác đồ chưa lưu")
        expect(self.page.get_by_label("Liều mỗi lần")).to_have_value("Một viên")
        self.assertEqual([kind for kind, _ in self.writes], ["start", "complete"])
        self.assertIsNone(self.writes[-1][1]["waitingCageId"])
        self.complete_error = None
        self.open_complete().get_by_role("button", name="Hoàn tất", exact=True).click()
        expect(self.page.get_by_text("Lịch hẹn: Chờ chủ đón", exact=True)).to_be_visible()
        expect(self.button("Hoàn tất ca khám")).to_have_count(0)
        expect(self.button("Lưu nháp")).to_be_enabled()
        self.assertEqual(self.writes[-1][1]["prescriptions"][0]["productId"], PRODUCT)
        self.assertEqual(self.writes[-1][1]["plan"], "Phác đồ chưa lưu")

    def test_cage_error_retry_and_eligible_selection(self):
        self.cage_error = True
        self.open_exam()
        dialog = self.open_complete()
        expect(dialog.get_by_text("Không thể tải chuồng trống.", exact=False)).to_be_visible()
        confirm = dialog.get_by_role("button", name="Hoàn tất", exact=True)
        expect(confirm).to_be_enabled()
        self.cage_error = False
        dialog.get_by_role("button", name="Tải lại chuồng").click()
        dialog.get_by_role("combobox", name="Chuồng chờ đón sau khám").click()
        options = self.page.locator(".ant-select-item-option")
        expect(options.filter(has_text="W-S01")).to_have_class(
            re.compile(r"\bant-select-item-option-disabled\b")
        )
        expect(options.filter(has_text="W-L01")).to_have_count(0)
        options.filter(has_text="W-M01").click()
        confirm.click()
        expect(self.page.get_by_text("Lịch hẹn: Chờ chủ đón", exact=True)).to_be_visible()
        self.assertEqual(self.writes[0][1]["waitingCageId"], MEDIUM_CAGE)
        self.assertEqual(len(self.writes), 1)

    def test_save_validation_and_server_finalized_view_with_history(self):
        self.open_exam()
        plan = self.page.get_by_label("P · Phác đồ điều trị")
        plan.fill("Phác đồ đang nhập")
        self.save_error = (400, {"message": "Kiểm tra bệnh án", "errors": {"plan": "Lỗi phác đồ"}})
        self.button("Lưu nháp").click()
        expect(self.page.get_by_text("Lỗi phác đồ", exact=True)).to_be_visible()
        expect(plan).to_have_value("Phác đồ đang nhập")
        self.assertNotIn("waitingCageId", self.writes[-1][1])
        self.save_error = None
        self.button("Lưu nháp").click()
        expect(self.page.get_by_text("Đã lưu nháp bệnh án", exact=True)).to_be_visible()
        self.assertEqual(self.record["plan"], "Phác đồ đang nhập")
        plan.fill("Thay đổi chưa lưu trước khi khóa")
        self.record["status"] = "Finalized"
        self.service_status = "Done"
        self.save_error = (409, {"message": "Bệnh án đã khóa"})
        self.button("Lưu nháp").click()
        expect(self.page.get_by_text("Phác đồ đang nhập", exact=True)).to_be_visible()
        expect(plan).to_have_count(0)
        expect(self.button("Lưu nháp")).to_have_count(0)
        expect(self.button("Hoàn tất ca khám")).to_have_count(0)
        self.button("Tiền sử bệnh").click()
        expect(self.page.get_by_text("Ghi chú lần khám cũ", exact=True)).to_be_visible()


if __name__ == "__main__":
    unittest.main(verbosity=2)
