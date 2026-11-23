"""Optional check-in intake QA. Vite: VITE_API_ROOT=/api, intake flag off or unset.
Run on dedicated loopback :3191: python tests/verify_optional_checkin_intake_e2e.py -v.
Every API request is intercepted; no live data is written.
"""
import json
import os
import re
import unittest
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('VCMOS_QA_BASE', 'http://127.0.0.1:3191')
if not re.fullmatch(r'http://127\.0\.0\.1:31\d{2}', BASE):
    raise SystemExit('Use a dedicated loopback Vite listener on :31xx.')
ORDER, PET, OWNER, REC, CAGE, ITEM, SERVICE, VET = [f'{i:024x}' for i in range(1, 9)]
CHECK = f'/api/appointment-orders/{ORDER}/check-in'
INTAKE = {'symptoms': 'Ho nhẹ từ sáng', 'initialCondition': 'Tỉnh táo, vẫn uống nước'}
STAMP = '2026-11-23T02:00:00Z'


class OptionalCheckInIntakeQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pw = sync_playwright().start()
        cls.addClassCleanup(pw.stop)
        cls.browser = pw.chromium.launch()
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.writes, self.errors, self.unhandled = [], [], []
        self.reject, self.echo, self.with_cage = False, True, False
        self.order = {'_id': ORDER, 'code': 'APT-INTAKE-QA', 'date': '2026-11-23',
                      'derivedStatus': 'Booked', 'isOnline': True, 'note': 'Ghi chú chủ nuôi',
                      'petId': {'_id': PET, 'name': 'Milo QA', 'weight': 6},
                      'ownerId': {'_id': OWNER, 'fullName': 'Chủ nuôi QA', 'phone': '0988111222'}}
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block')
        self.addCleanup(self.ctx.close)
        user = {'_id': REC, 'fullName': 'Lễ tân QA', 'role': 'Receptionist', 'status': 'Active', 'isEmailVerified': True}
        self.ctx.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                                 "localStorage.setItem('token', 'synthetic-qa-token');"
                                 "sessionStorage.setItem('hasLoadedBefore', 'true');")
        self.ctx.route('**/*', self.route)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(8000)
        self.page.clock.set_fixed_time(datetime(2026, 11, 23, 2, tzinfo=timezone.utc))
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [])
        self.assertEqual(self.errors, [])

    def route(self, route):
        req, url = route.request, urlsplit(route.request.url)
        path, method = url.path, req.method
        if f'{url.scheme}://{url.netloc}' != BASE:
            if req.resource_type in ('xhr', 'fetch'):
                self.unhandled.append(req.url)
            return route.abort()
        if not path.startswith('/api/') and req.resource_type not in ('xhr', 'fetch'):
            return route.continue_()
        cage = {'_id': CAGE, 'label': 'QA-M01', 'size': 'M', 'maxWeightKg': 15, 'status': 'Available', 'isIsolated': False}
        if method == 'GET' and path == '/api/appointment-orders':
            data = {'data': [self.order], 'pagination': {'page': 1, 'limit': 10, 'total': 1, 'totalPages': 1}}
        elif method == 'GET' and path == '/api/cage-assignments':
            data = {'data': [], 'count': 0}
        elif method == 'GET' and path == '/api/cages':
            data = {'data': {'items': [cage] if self.with_cage else []}}
        elif method == 'GET' and path == '/api/appointment-services':
            data = {'data': [{'_id': ITEM, 'orderId': ORDER, 'status': 'Waiting', 'sequenceNo': 1,
                              'serviceId': {'_id': SERVICE, 'name': 'Khám tổng quát QA', 'category': 'Examination'}}]}
        elif method == 'GET' and path == '/api/users/staff':
            data = {'items': [{'_id': VET, 'fullName': 'Bác sĩ QA', 'role': 'Veterinarian', 'status': 'Active'}]}
        elif method == 'PATCH' and path == CHECK:
            payload = req.post_data_json if req.post_data_buffer else None
            self.writes.append(payload)
            if self.reject:
                return route.fulfill(status=400, json={'message': 'Phiếu không hợp lệ', 'errors': [
                    {'field': 'intake.initialCondition', 'message': 'Tình trạng bị từ chối QA'}]})
            self.order.update(derivedStatus='CheckedIn', checkedInAt=STAMP)
            if self.echo and payload and payload.get('intake'):
                self.order['intake'] = {**payload['intake'], 'recordedBy': REC, 'recordedAt': STAMP}
            data = {'data': self.order, 'message': 'Tiếp nhận thành công QA'}
        else:
            self.unhandled.append((method, path))
            return route.fulfill(status=501, json={'message': 'Missing QA fixture'})
        return route.fulfill(json=data)

    def open_modal(self, navigate=True):
        if navigate:
            self.page.goto(BASE + '/clinic/appointments')
        self.page.get_by_role('row').filter(has_text='APT-INTAKE-QA').get_by_role('button', name=re.compile(r'(?:^| )Check-in$')).click()
        modal = self.page.get_by_role('dialog', name=re.compile('Tiếp nhận lịch hẹn'))
        expect(modal).to_be_visible()
        self.symptoms = modal.get_by_role('textbox', name='Triệu chứng ban đầu', exact=True)
        self.condition = modal.get_by_role('textbox', name='Tình trạng ban đầu', exact=True)
        expect(self.symptoms).to_be_visible()
        expect(self.condition).to_be_visible()
        expect(modal.get_by_text('Đang tải trạng thái phân chuồng…', exact=True)).to_have_count(0)
        return modal

    def submit(self, modal):
        modal.get_by_role('button', name='Xác nhận Check-in', exact=True).click()

    def fill_intake(self):
        self.symptoms.fill('  ' + INTAKE['symptoms'] + '  ')
        self.condition.fill('\n' + INTAKE['initialCondition'] + ' ')

    def test_visible_without_flag_and_blank_submission_omits_intake(self):
        modal = self.open_modal()
        expect(modal.get_by_text(re.compile('Không bắt buộc'))).to_be_visible()
        self.submit(modal)
        expect(modal).not_to_be_visible()
        self.assertEqual(self.writes, [None])

    def test_whitespace_only_is_optional(self):
        modal = self.open_modal()
        self.symptoms.fill('   ')
        self.condition.fill('\n  ')
        self.submit(modal)
        expect(modal).not_to_be_visible()
        self.assertEqual(self.writes, [None])

    def test_partial_requires_other_field_but_clearing_all_allows_checkin(self):
        modal = self.open_modal()
        self.symptoms.fill(INTAKE['symptoms'])
        self.submit(modal)
        expect(modal.get_by_text('Vui lòng nhập tình trạng ban đầu.', exact=True)).to_be_visible()
        self.assertEqual(self.writes, [])
        self.symptoms.fill('')
        self.condition.fill(INTAKE['initialCondition'])
        self.submit(modal)
        expect(modal.get_by_text('Vui lòng nhập triệu chứng ban đầu.', exact=True)).to_be_visible()
        self.assertEqual(self.writes, [])
        self.condition.fill('')
        self.submit(modal)
        expect(modal).not_to_be_visible()
        self.assertEqual(self.writes, [None])

    def test_complete_intake_trimmed_and_api_error_preserves_values_for_retry(self):
        modal = self.open_modal()
        self.fill_intake()
        self.reject = True
        self.submit(modal)
        expect(modal.get_by_text('Tình trạng bị từ chối QA', exact=True)).to_be_visible()
        expect(self.symptoms).to_have_value('  ' + INTAKE['symptoms'] + '  ')
        expect(self.condition).to_have_value('\n' + INTAKE['initialCondition'] + ' ')
        self.reject = False
        self.submit(modal)
        expect(modal).not_to_be_visible()
        self.assertEqual(self.writes, [{'intake': INTAKE}, {'intake': INTAKE}])

    def test_cage_staff_and_intake_share_one_request(self):
        self.with_cage = True
        modal = self.open_modal()
        self.fill_intake()
        for name, label in (('Chuồng lưu giữ', 'QA-M01'), ('Người phụ trách Khám tổng quát QA', 'Bác sĩ QA')):
            modal.get_by_role('combobox', name=name).press('ArrowDown')
            self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text=label).click()
        self.submit(modal)
        expect(modal).not_to_be_visible()
        self.assertEqual(self.writes, [{'cageId': CAGE, 'intake': INTAKE,
                         'serviceAssignments': [{'appointmentServiceId': ITEM, 'assignedStaffId': VET}]}])

    def test_mobile_limit_counter_and_cancel_reset(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        modal = self.open_modal()
        expect(self.symptoms).to_have_attribute('maxlength', '500')
        expect(self.condition).to_have_attribute('maxlength', '500')
        self.symptoms.fill('a' * 500)
        self.condition.fill('b' * 500)
        expect(modal.get_by_text('500 / 500', exact=True)).to_have_count(2)
        Path('tests/screenshots').mkdir(exist_ok=True)
        self.page.screenshot(path='tests/screenshots/optional-checkin-mobile.png', animations='disabled')
        modal.get_by_role('button', name='Hủy bỏ', exact=True).click()
        modal = self.open_modal(navigate=False)
        expect(self.symptoms).to_have_value('')
        expect(self.condition).to_have_value('')
        self.assertEqual(self.writes, [])

    def test_missing_saved_intake_warns_instead_of_reporting_saved(self):
        self.echo = False
        modal = self.open_modal()
        self.fill_intake()
        self.submit(modal)
        expect(modal).not_to_be_visible()
        expect(self.page.get_by_text(re.compile('Không xác nhận được phiếu tiếp nhận đã lưu'))).to_be_visible()
        expect(self.page.get_by_text('Tiếp nhận thành công QA', exact=True)).to_have_count(0)
        self.assertEqual(self.writes, [{'intake': INTAKE}])


if __name__ == '__main__':
    unittest.main(verbosity=2)
