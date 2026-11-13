"""Desktop Chromium, VITE_API_ROOT=/api, loopback only; API requests are mocked."""
import json
import os
import re
import unittest
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('VCMOS_QA_BASE', 'http://127.0.0.1:3186')
FLAG = os.environ.get('VCMOS_QA_INTAKE')
if not re.fullmatch(r'http://127\.0\.0\.1:31\d{2}', BASE) or FLAG not in ('on', 'off'):
    raise SystemExit('Set VCMOS_QA_BASE to loopback :31xx and VCMOS_QA_INTAKE to on or off.')
ON = FLAG == 'on'
DAY, TIMESTAMP = '2026-11-13', '2026-11-13T02:00:00Z'
RECEPTION, VET, OWNER, PET, PET2, ORDER, SERVICE, ITEM = [f'{i:024x}' for i in range(1, 9)]
EXISTING_PHONE, NEW_PHONE = '0988111222', '0988111333'
PET_DATA = {'_id': PET, 'name': 'Milo QA', 'status': 'Active'}
CUSTOMER = {'_id': OWNER, 'fullName': 'Chủ nuôi QA', 'phone': EXISTING_PHONE, 'status': 'Active'}
DOCTOR = {'_id': VET, 'fullName': 'Bác sĩ QA', 'role': 'Veterinarian', 'status': 'Active'}
EXAM = {'_id': SERVICE, 'name': 'Khám tổng quát QA', 'category': 'Examination', 'status': 'Active'}
INTAKE = {'symptoms': 'Ho nhẹ QA', 'initialCondition': 'Tỉnh táo QA'}
NOTE, SUBJECTIVE = 'Ghi chú lịch riêng QA', 'Nội dung SOAP đã lưu QA'
SAVED = {**INTAKE, 'recordedBy': RECEPTION, 'recordedAt': TIMESTAMP}


class IntakeContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pw = sync_playwright().start()
        cls.addClassCleanup(pw.stop)
        cls.browser = pw.chromium.launch()
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        context = self.browser.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block')
        self.addCleanup(context.close)
        self.page = context.new_page()
        self.page.set_default_timeout(6500)
        self.page.clock.set_fixed_time(datetime(2026, 11, 13, 2, tzinfo=timezone.utc))
        self.unmocked, self.page_errors, self.walk_ins = [], [], []
        self.page.on('pageerror', lambda err: self.page_errors.append(str(err)))
        self.order = {'_id': ORDER, 'code': 'APT-CONTRACT', 'date': DAY, 'isOnline': False,
                      'derivedStatus': 'CheckedIn', 'checkedInAt': TIMESTAMP,
                      'ownerId': CUSTOMER, 'petId': PET_DATA, 'note': NOTE}
        self.item = {'_id': ITEM, 'orderId': ORDER, 'serviceId': EXAM, 'status': 'Waiting', 'sequenceNo': 1}
        self.fail_walk_in = False
        self.echo_intake = True
        self.record_intake = SAVED
        self.queue_intake = None
        self.user = None
        context.route('**/*', self.route)

    def tearDown(self):
        self.assertEqual(self.unmocked, [])
        self.assertEqual(self.page_errors, [])

    def route(self, route):
        req = route.request
        url = urlsplit(req.url)
        path, method = url.path, req.method
        if f'{url.scheme}://{url.netloc}' != BASE:
            if req.resource_type in ('xhr', 'fetch'):
                self.unmocked.append(req.url)
            return route.abort()
        if not path.startswith('/api/') and req.resource_type not in ('xhr', 'fetch'):
            return route.continue_()
        status = 200
        if method == 'GET' and path in ('/api/users/me', '/api/auth/me', '/api/users/profile'):
            data = {'user': self.user, 'data': self.user}
        elif method == 'GET' and path == '/api/appointment-orders':
            data = {'data': [self.order], 'pagination': {'total': 1, 'page': 1, 'limit': 10, 'totalPages': 1}}
        elif method == 'GET' and path == '/api/appointment-services':
            data = {'data': [self.item]}
        elif method == 'GET' and path == '/api/cage-assignments':
            data = {'data': [], 'count': 0}
        elif method == 'GET' and path == '/api/cages':
            data = {'data': {'items': [], 'total': 0}}
        elif method == 'GET' and path == '/api/services':
            data = {'services': [EXAM]}
        elif method == 'GET' and path == '/api/users/staff':
            data = {'items': [DOCTOR]}
        elif method == 'GET' and path == '/api/appointment-orders/walk-in/customer-lookup':
            found = parse_qs(url.query)['phone'] == [EXISTING_PHONE]
            data = {'data': {'found': found, 'customer': CUSTOMER if found else None,
                             'pets': [PET_DATA, {'_id': PET2, 'name': 'Bông QA'}] if found else []}}
        elif method == 'POST' and path == '/api/appointment-orders/walk-in':
            payload = req.post_data_json
            self.walk_ins.append(payload)
            if self.fail_walk_in:
                return route.fulfill(status=400, json={'message': 'Phiếu không hợp lệ QA', 'errors': {
                    'intake.initialCondition': 'Tình trạng bị từ chối QA', 'intake': 'Lỗi toàn phiếu QA'}})
            self.order = {**self.order, 'code': 'APT-WALKIN', 'note': payload.get('note')}
            if payload.get('intake') and self.echo_intake:
                self.order['intake'] = {**payload['intake'], 'recordedBy': RECEPTION, 'recordedAt': TIMESTAMP}
            status, data = 201, {'message': 'Đã tiếp nhận QA', 'data': {
                'appointment': self.order, 'services': [self.item], 'cageAssignment': None}}
        elif method == 'GET' and path == '/api/appointment-services/my-queue':
            data = {'data': [{**self.item, 'status': 'InProgress', 'orderId': {
                **self.order, 'note': None, 'petId': PET, 'intake': self.queue_intake}}]}
        elif method == 'GET' and path == f'/api/medical-records/service/{ITEM}':
            data = {'_id': 'record', 'status': 'Draft', 'petId': PET_DATA, 'prescriptions': [],
                    'subjectiveNote': SUBJECTIVE, 'createdAt': TIMESTAMP, 'updatedAt': TIMESTAMP,
                    'appointmentServiceId': {**self.item, 'orderId': {
                        '_id': ORDER, 'code': self.order['code'], 'date': DAY,
                        'note': NOTE, 'intake': self.record_intake}}}
        elif method == 'GET' and path == '/api/products':
            data = {'data': {'items': []}}
        else:
            self.unmocked.append(f'{method} {path}')
            return route.fulfill(status=404, json={'message': 'API not mocked'})
        return route.fulfill(status=status, json=data)

    def login(self, role='Receptionist'):
        self.user = {'_id': RECEPTION, 'fullName': 'Lễ tân QA', 'role': role,
                     'isEmailVerified': True, 'status': 'Active'} if role == 'Receptionist' else {**DOCTOR, 'isEmailVerified': True}
        self.page.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(self.user))});"
                                  "localStorage.setItem('token', 'mock-only');"
                                  "sessionStorage.setItem('hasLoadedBefore', 'true');")
        path = '/clinic/appointments' if role == 'Receptionist' else f'/clinic/exam/{ITEM}'
        self.page.goto(BASE + path)

    def walk_in(self, phone=EXISTING_PHONE):
        self.login()
        self.page.get_by_role('button', name='Tiếp nhận khách vãng lai (Walk-in)').click()
        modal = self.page.get_by_role('dialog', name='Tiếp nhận khách vãng lai')
        modal.get_by_placeholder('Ví dụ: 0988111222').fill(phone)
        modal.locator('#services_0_serviceId').click()
        self.option(EXAM['name']).click()
        if phone == EXISTING_PHONE:
            modal.get_by_role('radio', name=re.compile('Milo QA')).check()
        return modal

    def option(self, text):
        return self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text=text)

    def detail(self, code):
        self.page.get_by_role('row').filter(has_text=code).get_by_role('button', name=re.compile('Chi tiết$')).click()
        return self.page.get_by_role('dialog', name=re.compile('Chi tiết lịch hẹn'))

    def add_intake(self, modal):
        modal.get_by_role('checkbox', name=re.compile('Ghi phiếu tiếp nhận')).check()
        modal.get_by_label('Triệu chứng', exact=True).fill(f"  {INTAKE['symptoms']}  ")
        modal.get_by_label('Tình trạng ban đầu', exact=True).fill(f"  {INTAKE['initialCondition']}  ")

    def submit(self, modal):
        modal.get_by_role('button', name=re.compile('Hoàn tất Tiếp nhận & Check-in')).click()

    def test_optional_walk_in_keeps_legacy_payload_and_note(self):
        modal = self.walk_in()
        toggle = modal.get_by_role('checkbox', name=re.compile('Ghi phiếu tiếp nhận'))
        if ON:
            expect(toggle).not_to_be_checked()
            self.add_intake(modal)
            toggle.uncheck()
        else:
            expect(toggle).to_have_count(0)
        expect(modal.get_by_label('Triệu chứng', exact=True)).to_have_count(0)
        modal.get_by_label(re.compile('Ghi chú triệu chứng')).fill(f' {NOTE} ')
        self.submit(modal)
        expect(modal).to_be_hidden()
        self.assertEqual(self.walk_ins, [{'phone': EXISTING_PHONE, 'petId': PET, 'note': NOTE,
                                         'services': [{'serviceId': SERVICE, 'isEmergency': False}]}])

    @unittest.skipUnless(ON, 'intake write flag off')
    def test_existing_pet_pair_validation_and_api_errors_then_success(self):
        modal = self.walk_in()
        toggle = modal.get_by_role('checkbox', name=re.compile('Ghi phiếu tiếp nhận'))
        self.add_intake(modal)
        modal.get_by_role('radio', name=re.compile('Bông QA')).check()
        expect(toggle).not_to_be_checked()
        toggle.check()
        condition = modal.get_by_label('Tình trạng ban đầu', exact=True)
        symptoms = modal.get_by_label('Triệu chứng', exact=True)
        expect(symptoms).to_have_value('')
        expect(condition).to_have_value('')
        expect(condition).to_have_attribute('maxlength', '500')
        symptoms.fill(INTAKE['symptoms'])
        condition.fill('   ')
        self.submit(modal)
        expect(modal.get_by_text('Vui lòng nhập tình trạng ban đầu.')).to_be_visible()
        self.assertEqual(self.walk_ins, [])
        condition.fill(INTAKE['initialCondition'])
        self.fail_walk_in = True
        self.submit(modal)
        expect(modal.locator('.ant-form-item').filter(has=self.page.get_by_label('Tình trạng ban đầu', exact=True)).get_by_text('Tình trạng bị từ chối QA')).to_be_visible()
        expect(modal.get_by_role('alert').filter(has_text='Phiếu không hợp lệ QA')).to_contain_text('Lỗi toàn phiếu QA')
        self.fail_walk_in = False
        modal.get_by_label(re.compile('Ghi chú triệu chứng')).fill(NOTE)
        self.submit(modal)
        expect(modal).to_be_hidden()
        self.assertEqual(self.walk_ins[-1]['intake'], INTAKE)
        self.assertEqual(self.walk_ins[-1]['petId'], PET2)
        self.assertEqual(self.walk_ins[-1]['note'], NOTE)
        detail = self.detail('APT-WALKIN')
        expect(detail.get_by_text(INTAKE['symptoms'], exact=True)).to_be_visible()
        expect(detail.get_by_text(INTAKE['initialCondition'], exact=True)).to_be_visible()
        expect(detail.get_by_text(NOTE, exact=True)).to_be_visible()

    @unittest.skipUnless(ON, 'intake write flag off')
    def test_existing_customer_with_new_pet_starts_fresh(self):
        modal = self.walk_in()
        self.add_intake(modal)
        modal.get_by_role('button', name=re.compile('Thêm thú cưng mới')).click()
        toggle = modal.get_by_role('checkbox', name=re.compile('Ghi phiếu tiếp nhận'))
        expect(toggle).not_to_be_checked()
        modal.get_by_label('Tên thú cưng').fill('Bé mới QA')
        self.add_intake(modal)
        self.submit(modal)
        expect(modal).to_be_hidden()
        payload, = self.walk_ins
        self.assertEqual(payload['phone'], EXISTING_PHONE)
        self.assertEqual(payload['petInfo']['name'], 'Bé mới QA')
        self.assertEqual(payload['intake'], INTAKE)
        self.assertNotIn('petId', payload)
        self.assertNotIn('fullName', payload)

    @unittest.skipUnless(ON, 'intake write flag off')
    def test_new_customer_and_pet_no_echo_warns_and_refreshes(self):
        modal = self.walk_in(NEW_PHONE)
        modal.get_by_label('Họ tên khách hàng').fill('Khách mới QA')
        modal.get_by_label('Tên thú cưng').fill('Mèo mới QA')
        self.add_intake(modal)
        self.echo_intake = False
        self.submit(modal)
        expect(modal).to_be_hidden()
        expect(self.page.get_by_text('Đã tạo lịch hẹn nhưng chưa xác nhận lưu phiếu tiếp nhận.')).to_be_visible()
        expect(self.page.get_by_role('row').filter(has_text='APT-WALKIN')).to_be_visible()
        self.assertEqual(len(self.walk_ins), 1)
        self.assertEqual(self.walk_ins[0]['intake'], INTAKE)
        self.assertEqual(self.walk_ins[0]['fullName'], 'Khách mới QA')
        self.assertEqual(self.walk_ins[0]['petInfo']['name'], 'Mèo mới QA')
        self.assertNotIn('petId', self.walk_ins[0])

    def test_saved_reception_intake_and_assignment_without_specialty(self):
        self.order['intake'] = SAVED
        self.login()
        detail = self.detail('APT-CONTRACT')
        expect(detail.get_by_text(INTAKE['symptoms'], exact=True)).to_be_visible()
        detail.get_by_role('button', name=re.compile('Phân công')).click()
        expect(detail.get_by_role('combobox', name='Chuyên môn của ca khám')).to_have_count(0)
        detail.get_by_role('combobox', name='Bác sĩ phụ trách').press('ArrowDown')
        expect(self.option(DOCTOR['fullName'])).to_be_visible()

    def test_vet_reads_record_and_queue_fallback_without_prefilling_soap(self):
        self.login('Veterinarian')
        expect(self.page.get_by_text(INTAKE['symptoms'], exact=True)).to_be_visible()
        expect(self.page.get_by_text(NOTE, exact=True)).to_be_visible()
        subjective = self.page.get_by_label(re.compile('S ·'))
        expect(subjective).to_have_value(SUBJECTIVE)
        expect(self.page.get_by_label('Triệu chứng', exact=True)).to_have_count(0)
        self.record_intake = None
        self.queue_intake = SAVED
        self.page.reload()
        expect(self.page.get_by_text(INTAKE['initialCondition'], exact=True)).to_be_visible()
        expect(subjective).to_have_value(SUBJECTIVE)
        self.queue_intake = None
        self.page.reload()
        expect(subjective).to_have_value(SUBJECTIVE)
        expect(self.page.get_by_text('Phiếu tiếp nhận', exact=True)).to_have_count(0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
