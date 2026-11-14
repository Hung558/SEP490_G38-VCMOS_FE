"""Desktop reception QA for BE #42 (a2535bb); every API call is intercepted.

In the integrated FE checkout, run Vite with VITE_API_ROOT=/api,
VITE_ENABLE_RECEPTION_INTAKE=false (or true), and --strictPort on a dedicated
loopback listener at port 3000. Match the mode in VCMOS_QA_INTAKE=off|on.
Then run `python tests/verify_be42_reception_e2e.py -v`.
"""
import json
import math
import os
import re
import unittest
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('FE_BASE_URL', 'http://[::1]:3000').rstrip('/')
MODE = os.getenv('VCMOS_QA_INTAKE', 'off')
if BASE not in ('http://[::1]:3000', 'http://127.0.0.2:3000', 'http://127.0.0.1:3000') or MODE not in ('off', 'on'):
    raise SystemExit('Use a dedicated loopback Vite listener on port 3000 and VCMOS_QA_INTAKE=off|on.')
INTAKE_ON = MODE == 'on'

DAY, NOW = '2026-11-14', '2026-11-14T02:30:00.000Z'
ORDER, CONTROL, WALK_ORDER, PET, OWNER, REC, SERVICE, PLAIN, ISO, BACKUP, SMALL = (
    f'{i:024x}' for i in range(410, 421))
APPTS = '/api/appointment-orders'
CHECK = f'{APPTS}/{ORDER}/check-in'
WALK = f'{APPTS}/walk-in'
CAGES = '/api/cages'
ASSIGN = '/api/cage-assignments'
CODE, CONTROL_CODE, WALK_CODE = 'APT-BE42-BOOKED', 'APT-BE42-OTHER', 'APT-BE42-WALK'
NORMAL_LABEL, ISO_LABEL, BACKUP_LABEL, SMALL_LABEL = 'QA-STD-42', 'QA-ISO-42', 'QA-ISO-BACKUP', 'QA-ISO-SMALL'
TOKEN = 'be42-reception-synthetic-token'
PHONE, NOTE = '0988111222', 'Ghi chú giữ nguyên khi thử lại (QA)'
INTAKE = {'symptoms': 'Triệu chứng kiểm thử QA', 'initialCondition': 'Tình trạng ban đầu QA'}
CAGE_LABEL = re.compile(r'Chuồng (?:chờ|lưu giữ).*không bắt buộc', re.I)
ISOLATION_LABEL = 'Yêu cầu chuồng cách ly'
CONFLICT = 'Chuồng vừa được phân công cho lịch hẹn khác (QA)'
BADGE = 'Đã phân chuồng'
WALK_OK = 'Đăng ký khám vãng lai tại quầy thành công'


def query_of(url):
    return parse_qs(urlsplit(url).query)


def button(scope, label):
    return scope.get_by_role('button', name=re.compile(rf'(?:^| ){re.escape(label)}$'))


def cage(identifier, label, isolated, max_weight=15):
    return {'_id': identifier, 'label': label, 'size': 'M', 'status': 'Available',
            'isIsolated': isolated, 'maxWeightKg': max_weight}


CAGE_FIXTURES = [cage(PLAIN, NORMAL_LABEL, False), cage(ISO, ISO_LABEL, True),
                 cage(BACKUP, BACKUP_LABEL, True), cage(SMALL, SMALL_LABEL, True, 2)]
PET_INFO = {'_id': PET, 'name': 'Milo BE42 QA', 'species': 'Chó', 'weight': 6}
CUSTOMER = {'_id': OWNER, 'code': 'USR-BE42', 'fullName': 'Khách hàng BE42 QA', 'phone': PHONE, 'status': 'Active'}
SERVICE_INFO = {'_id': SERVICE, 'name': 'Khám tổng quát BE42 QA', 'category': 'Examination',
                'basePrice': 150000, 'status': 'Active'}


def order(identifier, code, *, online=True, status='Booked'):
    return {'_id': identifier, 'code': code, 'date': DAY, 'slotStart': '09:00', 'slotEnd': '09:30',
            'isOnline': online, 'derivedStatus': status, 'petId': PET_INFO, 'ownerId': CUSTOMER,
            'checkedInAt': NOW if status == 'CheckedIn' else None}


class ReceptionBE42E2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.addClassCleanup(cls.playwright.stop)
        cls.browser = cls.playwright.chromium.launch()
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.orders = [order(ORDER, CODE), order(CONTROL, CONTROL_CODE)]
        self.assignments = []
        self.available = [dict(c) for c in CAGE_FIXTURES]
        self.reads, self.mutations, self.unhandled, self.page_errors = [], [], [], []
        self.walk_conflict = False
        self.hold_active_refresh = False
        self.held_active = []
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 900},
                                            timezone_id='Asia/Ho_Chi_Minh', service_workers='block')
        self.addCleanup(self.ctx.close)
        self.ctx.route('**/*', self.route)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(8000)
        self.page.clock.set_fixed_time(datetime(2026, 11, 14, 2, 30, tzinfo=timezone.utc))
        self.page.on('pageerror', lambda error: self.page_errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [], 'Unexpected API/network request (never forwarded)')
        self.assertEqual(self.page_errors, [], 'Uncaught browser exception')

    def assignment(self, order_id, cage_id):
        data = next(c for c in self.available if c['_id'] == cage_id)
        assigned = {'_id': f'{950 + len(self.assignments):024x}', 'cageId': {**data, 'status': 'Occupied'},
                    'orderId': next(o for o in self.orders if o['_id'] == order_id),
                    'assignedById': {'_id': REC, 'role': 'Receptionist'}, 'assignedAt': NOW, 'releasedAt': None}
        self.assignments.append(assigned)
        self.available = [c for c in self.available if c['_id'] != cage_id]
        return assigned

    def route(self, route):
        req = route.request
        url = urlsplit(req.url)
        origin, method, path = f'{url.scheme}://{url.netloc}', req.method, url.path
        if origin != BASE or not path.startswith('/api/'):
            api_like = path.startswith('/api/') or req.resource_type in ('xhr', 'fetch')
            if origin == BASE and method in ('GET', 'HEAD') and not api_like:
                return route.continue_()
            if api_like or method not in ('GET', 'HEAD'):
                self.unhandled.append((method, origin, path))
            return route.abort()
        if req.header_value('authorization') != f'Bearer {TOKEN}':
            self.unhandled.append((method, path, 'missing fixture token'))
            return route.fulfill(status=401, json={'message': 'Thiếu phiên QA'})
        q = parse_qs(url.query)
        if method == 'GET':
            self.reads.append((path, q))
            if path == ASSIGN and q.get('active') == ['true'] and self.hold_active_refresh:
                self.held_active.append(route)
                return  # Prove badge is applied from the mutation response, not this refresh.
        try:
            if method not in ('GET', 'HEAD'):
                body = json.loads(req.post_data_buffer) if req.post_data_buffer else None
                self.mutations.append((method, path, body))
            else:
                body = None
            status, payload = self.fixture(method, path, q, body)
        except (ValueError, TypeError, KeyError, StopIteration) as exc:
            self.unhandled.append((method, path, f'Invalid fixture input: {exc}'))
            status, payload = 400, {'message': 'Dữ liệu fixture không hợp lệ'}
        return route.fulfill(status=status, json=payload)

    def fixture(self, method, path, q, body):
        if method == 'GET' and path == APPTS:
            selected = [o for o in self.orders if q.get('from', [''])[0] <= o['date'] <= q.get('to', ['9999'])[0]
                        and (not q.get('status') or o['derivedStatus'] == q['status'][0])]
            page, limit = int(q.get('page', ['1'])[0]), int(q.get('limit', ['10'])[0])
            start = (page - 1) * limit
            return 200, {'data': selected[start:start+limit], 'pagination': {
                'page': page, 'limit': limit, 'total': len(selected), 'totalPages': math.ceil(len(selected)/limit)}}
        if method == 'GET' and path == ASSIGN:
            return 200, {'data': self.assignments, 'count': len(self.assignments)}
        if method == 'GET' and path == CAGES:
            return 200, {'success': True, 'data': {'items': self.available, 'pagination': {'totalPages': 1}}}
        if method == 'GET' and path == f'/api/pets/{PET}':
            return 200, {'pet': PET_INFO, 'data': PET_INFO}
        if method == 'GET' and path == '/api/services':
            return 200, {'services': [SERVICE_INFO]}
        if method == 'GET' and path == '/api/users/staff':
            return 200, {'items': [], 'pagination': {'totalPages': 1}}
        if method == 'GET' and path == f'{WALK}/customer-lookup' and q.get('phone') == [PHONE]:
            return 200, {'data': {'found': True, 'customer': CUSTOMER, 'pets': [PET_INFO]}}
        if method == 'PATCH' and path == CHECK:
            body = body or {}
            appointment = self.orders[0]
            if appointment['derivedStatus'] != 'Booked':
                return 409, {'message': 'Lịch hẹn không còn chờ tiếp nhận'}
            if body.get('cageId') and not self.accepts_cage(body):
                return 400, {'message': 'Chuồng không đáp ứng cấu hình QA'}
            appointment.update(derivedStatus='CheckedIn', checkedInAt=NOW)
            if 'intake' in body:
                appointment['intake'] = {**body['intake'], 'recordedAt': NOW, 'recordedBy': REC}
            # BE returns cageAssignment within response.data only when a cage was requested.
            data = dict(appointment)
            if body.get('cageId'):
                data['cageAssignment'] = self.assignment(ORDER, body['cageId'])
            return 200, {'message': 'Check-in thành công', 'data': data}
        if method == 'POST' and path == WALK:
            if any(o['_id'] == WALK_ORDER for o in self.orders):
                return 409, {'message': 'Đã có walk-in QA'}
            if body.get('cageId') and not self.accepts_cage(body):
                return 400, {'message': 'Chuồng không đáp ứng cấu hình QA'}
            if self.walk_conflict and body.get('cageId') == ISO:
                self.available = [c for c in self.available if c['_id'] != ISO]
                return 409, {'message': CONFLICT}
            appointment = order(WALK_ORDER, WALK_CODE, online=False, status='CheckedIn')
            self.orders.append(appointment)
            assigned = self.assignment(WALK_ORDER, body['cageId']) if body.get('cageId') else None
            return 201, {'message': WALK_OK, 'data': {'isNewCustomer': False, 'customer': CUSTOMER,
                'isNewPet': False, 'pet': PET_INFO, 'appointment': appointment,
                'services': [{'serviceId': SERVICE_INFO}], 'cageAssignment': assigned}}
        self.unhandled.append((method, path, q))
        return 501, {'message': f'Fixture thiếu {method} {path}'}

    def accepts_cage(self, body):
        flag = body.get('requiresIsolation', False)
        return isinstance(flag, bool) and any(c['_id'] == body['cageId'] and c['maxWeightKg'] >= PET_INFO['weight']
                    and c['isIsolated'] == flag for c in self.available)

    def open(self):
        user = {'_id': REC, 'fullName': 'Lễ tân BE42 QA', 'role': 'Receptionist',
                'status': 'Active', 'isEmailVerified': True}
        self.ctx.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                                 f"localStorage.setItem('token', {json.dumps(TOKEN)});"
                                 "sessionStorage.setItem('hasLoadedBefore', 'true');")
        self.page.goto(f'{BASE}/clinic/appointments')
        expect(self.row(CODE)).to_be_visible()
        expect(self.page.get_by_text('Đang tải trạng thái phân chuồng…', exact=True)).to_have_count(0)
        expect(self.row(CODE).get_by_text(BADGE, exact=True)).to_have_count(0)

    def row(self, code):
        return self.page.get_by_role('row').filter(has_text=code)

    def checkin_modal(self):
        button(self.row(CODE), 'Check-in').click()
        modal = self.page.get_by_role('dialog', name=re.compile('Xác nhận tiếp nhận lịch hẹn'))
        expect(modal).to_be_visible()
        symptoms = modal.get_by_role('textbox', name=re.compile('Triệu chứng', re.I))
        if INTAKE_ON:
            symptoms.fill(INTAKE['symptoms'])
            modal.get_by_role('textbox', name=re.compile('Tình trạng ban đầu', re.I)).fill(INTAKE['initialCondition'])
        else:
            expect(symptoms).to_have_count(0)
        return modal

    def walkin_modal(self):
        button(self.page, 'Tiếp nhận khách vãng lai (Walk-in)').click()
        modal = self.page.get_by_role('dialog', name=re.compile('Tiếp nhận khách vãng lai', re.I))
        with self.response('GET', f'{WALK}/customer-lookup'):
            modal.get_by_placeholder('Ví dụ: 0988111222').fill(PHONE)
        self.select(modal.get_by_role('combobox', name='Dịch vụ 1'), SERVICE_INFO['name'])
        modal.get_by_role('textbox', name=re.compile(r'Ghi chú triệu chứng')).fill(NOTE)
        return modal

    def select(self, combo, text):
        combo.press('ArrowDown')
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text=text).click()

    def cage_combo(self, modal):
        return modal.get_by_role('combobox', name=CAGE_LABEL)

    def isolation(self, modal):
        return modal.get_by_role('checkbox', name=ISOLATION_LABEL).or_(
            modal.get_by_role('switch', name=ISOLATION_LABEL))

    def choose_isolated_cage(self, modal, label):
        toggle = self.isolation(modal)
        toggle.click()
        expect(toggle).to_be_checked()
        combo = self.cage_combo(modal)
        combo.press('ArrowDown')
        options = self.page.locator('.ant-select-dropdown:visible .ant-select-item-option')
        expect(options.filter(has_text=label)).to_be_visible()
        # Filtering or disabling incompatible cages are both valid ways to block selection.
        for text in (NORMAL_LABEL, SMALL_LABEL):
            incompatible = options.filter(has_text=text)
            if incompatible.count():
                expect(incompatible).to_have_class(re.compile('ant-select-item-option-disabled'))
        options.filter(has_text=label).click()

    def response(self, method, path):
        return self.page.expect_response(lambda res: res.request.method == method and urlsplit(res.url).path == path)

    def active_read(self, req):
        return req.method == 'GET' and urlsplit(req.url).path == ASSIGN and query_of(req.url).get('active') == ['true']

    def assert_checked_in(self, code, *, badge=True):
        row = self.row(code)
        expect(row.get_by_text('Đã tiếp nhận', exact=True)).to_be_visible()
        if badge:
            expect(row.get_by_text(BADGE, exact=True)).to_be_visible()
        else:
            expect(row.get_by_text(BADGE, exact=True)).to_have_count(0)
        expect(self.row(CONTROL_CODE).get_by_text(BADGE, exact=True)).to_have_count(0)

    def assert_walk_payload(self, cage_id=None):
        self.assertEqual(self.mutations[-1][:2], ('POST', WALK))
        body = self.mutations[-1][2]
        expected = {'phone': PHONE, 'petId': PET, 'note': NOTE,
                    'services': [{'serviceId': SERVICE, 'isEmergency': False}]}
        for key, value in expected.items():
            self.assertEqual(body.get(key), value, key)
        self.assertNotIn('intake', body)
        if cage_id:
            self.assertEqual(body.get('cageId'), cage_id)
            self.assertIs(body.get('requiresIsolation'), True)
        else:
            self.assertFalse(body.get('cageId'))
            self.assertIs(body.get('requiresIsolation', False), False)

    def test_checkin_sends_cage_and_isolation_in_one_patch_and_updates_badge_before_get(self):
        self.open()
        modal = self.checkin_modal()
        self.choose_isolated_cage(modal, ISO_LABEL)
        self.hold_active_refresh = True
        with self.page.expect_request(self.active_read):
            with self.response('PATCH', CHECK) as result:
                button(modal, 'Xác nhận Check-in').click()
        self.assertEqual(result.value.status, 200)
        expected = {'cageId': ISO, 'requiresIsolation': True}
        if INTAKE_ON:
            expected['intake'] = INTAKE
        self.assertEqual(self.mutations, [('PATCH', CHECK, expected)])
        expect(modal).to_have_count(0)
        self.assert_checked_in(CODE)
        self.assertTrue(self.held_active, 'Expected a pending authoritative active assignment refresh')
        self.hold_active_refresh = False
        with self.page.expect_response(lambda res: self.active_read(res.request)):
            self.held_active[-1].fulfill(json={'data': self.assignments, 'count': 1})
        self.assert_checked_in(CODE)
        self.assertEqual(len(self.mutations), 1, 'Must not POST a separate cage assignment')

    def test_checkin_without_cage_keeps_legacy_request_and_no_badge(self):
        self.open()
        modal = self.checkin_modal()
        with self.response('PATCH', CHECK) as result:
            button(modal, 'Xác nhận Check-in').click()
        self.assertEqual(result.value.status, 200)
        expect(modal).to_have_count(0)
        self.assert_checked_in(CODE, badge=False)
        self.assertEqual(self.mutations, [('PATCH', CHECK, {'intake': INTAKE} if INTAKE_ON else None)])

    def test_walkin_conflict_preserves_data_and_retries_with_available_isolation_cage(self):
        self.walk_conflict = True
        self.open()
        modal = self.walkin_modal()
        self.choose_isolated_cage(modal, ISO_LABEL)
        submit = button(modal, 'Hoàn tất Tiếp nhận & Check-in')
        with self.response('POST', WALK) as first:
            submit.click()
        self.assertEqual(first.value.status, 409)
        self.assert_walk_payload(ISO)
        expect(modal.get_by_role('alert').filter(has_text=CONFLICT)).to_be_visible()
        expect(self.page.get_by_text(WALK_OK, exact=True)).to_have_count(0)
        expect(self.row(WALK_CODE)).to_have_count(0)
        expect(modal.get_by_placeholder('Ví dụ: 0988111222')).to_have_value(PHONE)
        expect(modal.get_by_role('textbox', name=re.compile(r'Ghi chú triệu chứng'))).to_have_value(NOTE)
        expect(self.isolation(modal)).to_be_checked()
        expect(submit).to_be_enabled()  # Fresh availability finished loading after the 409.
        self.cage_combo(modal).press('ArrowDown')
        choices = self.page.locator('.ant-select-dropdown:visible .ant-select-item-option')
        expect(choices.filter(has_text=ISO_LABEL)).to_have_count(0)
        choices.filter(has_text=BACKUP_LABEL).click()
        with self.response('POST', WALK) as retry:
            submit.click()
        self.assertEqual(retry.value.status, 201)
        self.assert_walk_payload(BACKUP)
        expect(modal).to_have_count(0)
        self.assert_checked_in(WALK_CODE)
        expect(self.row(CODE).get_by_text(BADGE, exact=True)).to_have_count(0)
        self.assertEqual([(m, p) for m, p, _ in self.mutations], [('POST', WALK), ('POST', WALK)])

    def test_walkin_without_cage_is_still_valid(self):
        self.open()
        modal = self.walkin_modal()
        with self.response('POST', WALK) as result:
            button(modal, 'Hoàn tất Tiếp nhận & Check-in').click()
        self.assertEqual(result.value.status, 201)
        self.assert_walk_payload()
        expect(modal).to_have_count(0)
        self.assert_checked_in(WALK_CODE, badge=False)
        self.assertEqual(len(self.mutations), 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
