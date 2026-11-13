"""Reception list regression tests against Vite with VITE_API_ROOT=/api."""
import json
import os
import unittest
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import Error, expect, sync_playwright

BASE_URL = os.getenv('FE_BASE_URL', 'http://localhost:3000')
TODAY = '2026-11-12'
TOMORROW = '2026-11-13'
RECEPTIONIST = '6ad96d4a9664da6b2c0d8d61'
PET = '6ad96d4a9664da6b2c0d8d70'
ORDER = '6ad96d4a9664da6b2c0d8a01'
OTHER_ORDER = '6ad96d4a9664da6b2c0d8a02'
FUTURE_ORDER = '6ad96d4a9664da6b2c0d8a03'
CAGE = '6ad96d4a9664da6b2c0d8c01'
WALK_IN_ORDER = '6ad96d4a9664da6b2c0d8a04'
SERVICE = {'_id': '6ad96d4a9664da6b2c0d8e01', 'name': 'Khám tổng quát',
           'category': 'Examination', 'basePrice': 150000, 'status': 'Active'}
BADGE = 'Đã phân chuồng'


def is_active_cage_list(request):
    url = urlparse(request.url)
    return request.method == 'GET' and url.path == '/api/cage-assignments' and parse_qs(url.query) == {'active': ['true']}


class ReceptionListFeedbackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        channel = os.getenv('PLAYWRIGHT_CHANNEL')
        cls.browser = cls.playwright.chromium.launch(**({'channel': channel} if channel else {}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        context = self.browser.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles')
        self.addCleanup(context.close)
        self.page = context.new_page()
        self.page.set_default_timeout(9000)
        self.page.clock.set_fixed_time(datetime(2026, 11, 11, 18, 0, tzinfo=timezone.utc))  # 01:00 Nov 12 in Vietnam
        self.orders = [self.order(ORDER, 'APT-TODAY', TODAY), self.order(OTHER_ORDER, 'APT-SECOND', TODAY), self.order(FUTURE_ORDER, 'APT-TOMORROW', TOMORROW)]
        self.assignments = []
        self.active_cage_reads = 0
        self.appointment_queries = []
        self.assignments_created = []
        self.fail_cage_list = False
        self.hold_cage_reads = False
        self.held_cage_routes = []
        self.page.route(f'{BASE_URL}/api/**', self.api)

    def order(self, oid, code, date):
        return {'_id': oid, 'code': code, 'date': date, 'petId': {'_id': PET, 'name': 'Milo'},
                'ownerId': {'_id': RECEPTIONIST, 'fullName': 'Chủ nuôi'}, 'derivedStatus': 'Booked', 'isOnline': True}

    def login(self, role):
        user = {'_id': RECEPTIONIST, 'fullName': 'Kiểm thử tiếp nhận', 'role': role,
                'status': 'Active', 'isEmailVerified': True}
        self.page.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                                  "localStorage.setItem('token', 'mock-access-token');")
        self.page.goto(f'{BASE_URL}/clinic/appointments')

    def row(self, code):
        return self.page.get_by_role('row').filter(has_text=code)

    def api(self, route):
        url = urlparse(route.request.url)
        path = url.path
        query = parse_qs(url.query)
        method = route.request.method
        if path == '/api/appointment-orders' and method == 'GET':
            self.appointment_queries.append(query)
            orders = [row for row in self.orders
                      if query.get('from', [''])[0] <= row['date'] <= query.get('to', ['9999'])[0]]
            route.fulfill(json={'data': orders, 'pagination': {'page': 1, 'limit': 10, 'total': len(orders)}})
        elif is_active_cage_list(route.request):
            self.active_cage_reads += 1
            if self.hold_cage_reads:
                self.held_cage_routes.append(route)
            elif self.fail_cage_list:
                route.fulfill(status=500, json={'message': 'Không tải được phân chuồng'})
            else:
                route.fulfill(json={'data': self.assignments, 'count': len(self.assignments)})
        elif path == '/api/cage-assignments' and method == 'POST':
            self.assignments_created.append(route.request.post_data_json)
            assignment = {'orderId': {'_id': ORDER}, 'cageId': CAGE, 'releasedAt': None}
            self.assignments = [assignment]
            route.fulfill(status=201, json={'data': assignment, 'message': 'Phân công chuồng thành công'})
        elif path == f'/api/appointment-orders/{ORDER}/check-in' and method == 'PATCH':
            self.orders[0]['derivedStatus'] = 'CheckedIn'
            self.assignments = [{'orderId': ORDER, 'cageId': CAGE, 'releasedAt': None}]
            route.fulfill(json={'data': self.orders[0]})
        elif path == '/api/appointment-orders/walk-in/customer-lookup':
            route.fulfill(json={'data': {'found': True,
                'customer': {'_id': RECEPTIONIST, 'fullName': 'Chủ nuôi', 'code': 'USR-001'},
                'pets': [{'_id': PET, 'name': 'Milo', 'species': 'Chó', 'weight': 4}],
            }})
        elif path == '/api/appointment-orders/walk-in' and method == 'POST':
            payload = route.request.post_data_json
            appointment = {**self.order(WALK_IN_ORDER, 'APT-WALKIN', TODAY),
                           'derivedStatus': 'CheckedIn', 'isOnline': False}
            assignment = {'orderId': WALK_IN_ORDER, 'cageId': payload['cageId'], 'releasedAt': None}
            self.orders.append(appointment)
            self.assignments.append(assignment)
            route.fulfill(status=201, json={'data': {'appointment': appointment,
                'services': [{'serviceId': SERVICE}], 'cageAssignment': assignment}})
        elif path == '/api/services':
            route.fulfill(json={'services': [SERVICE]})
        elif path == '/api/users/staff':
            route.fulfill(json={'items': []})
        elif path == '/api/cages':
            route.fulfill(json={'data': {'items': [{'_id': CAGE, 'label': 'C01', 'size': 'M', 'status': 'Available'}]}})
        else:
            route.fulfill(status=404, json={'message': f'Unmocked: {path}'})

    def test_reception_defaults_to_vietnam_day_and_allows_change_clear_and_reset(self):
        self.login('Receptionist')
        picker = self.page.get_by_placeholder('Ngày hẹn', exact=True)
        expect(picker).to_have_value(TODAY)
        expect(self.row('APT-TODAY')).to_be_visible()
        expect(self.row('APT-TOMORROW')).to_have_count(0)
        self.assertEqual(self.appointment_queries[0].get('from'), [TODAY])
        self.assertEqual(self.appointment_queries[0].get('to'), [TODAY])

        picker.fill(TOMORROW)
        picker.press('Enter')
        expect(self.row('APT-TOMORROW')).to_be_visible()
        expect(self.row('APT-TODAY')).to_have_count(0)
        self.assertEqual(self.appointment_queries[-1].get('from'), [TOMORROW])
        self.assertEqual(self.appointment_queries[-1].get('to'), [TOMORROW])

        picker.hover()
        self.page.locator('.ant-picker-clear').click()
        expect(picker).to_have_value('')
        expect(self.row('APT-TODAY')).to_be_visible()
        expect(self.row('APT-TOMORROW')).to_be_visible()
        self.assertNotIn('from', self.appointment_queries[-1])
        self.assertNotIn('to', self.appointment_queries[-1])
        self.page.get_by_role('button', name='Đặt lại').click()
        expect(picker).to_have_value(TODAY)
        expect(self.row('APT-TOMORROW')).to_have_count(0)

    def test_admin_does_not_get_date_default_or_cage_requests(self):
        self.login('Admin')
        expect(self.row('APT-TOMORROW')).to_be_visible()
        expect(self.page.get_by_placeholder('Từ ngày')).to_have_value('')
        expect(self.page.get_by_placeholder('Đến ngày')).to_have_value('')
        self.assertNotIn('from', self.appointment_queries[0])
        self.assertNotIn('to', self.appointment_queries[0])
        self.assertEqual(self.active_cage_reads, 0)

    def test_assignment_response_updates_badge_before_get_and_release_removes_it(self):
        # FE #34 only allows cage assignment after the pet has arrived.
        self.orders[0]['derivedStatus'] = 'CheckedIn'
        self.login('Receptionist')
        expect(self.row('APT-TODAY')).to_be_visible()
        expect(self.page.get_by_text('Đang tải trạng thái phân chuồng…')).to_have_count(0)
        self.hold_cage_reads = True
        with self.page.expect_request(is_active_cage_list):
            self.page.get_by_role('button', name='Làm mới').click()
        self.row('APT-TODAY').get_by_role('button', name='Phân chuồng').click()
        modal = self.page.get_by_role('dialog', name='Phân công chuồng cho lịch hẹn')
        modal.get_by_role('combobox').press('ArrowDown')
        self.page.locator('.ant-select-item-option').filter(has_text='C01').click()
        with self.page.expect_request(is_active_cage_list):
            modal.get_by_role('button', name='Xác nhận phân chuồng').click()
        expect(self.row('APT-TODAY').get_by_text('Đã tiếp nhận')).to_be_visible()
        expect(self.row('APT-TODAY').get_by_text(BADGE)).to_be_visible()
        self.assertEqual(self.assignments_created, [{'cageId': CAGE, 'orderId': ORDER}])
        self.assertEqual(len(self.held_cage_routes), 2)
        try:
            self.held_cage_routes[0].fulfill(json={'data': [{'orderId': OTHER_ORDER, 'releasedAt': None}]})
        except Error:
            pass  # Browser already discarded the aborted request.
        with self.page.expect_response(lambda response: is_active_cage_list(response.request)):
            self.held_cage_routes[1].fulfill(json={'data': self.assignments})
        expect(self.row('APT-TODAY').get_by_text(BADGE)).to_be_visible()
        expect(self.row('APT-SECOND').get_by_text(BADGE)).to_have_count(0)

        self.hold_cage_reads = False
        self.assignments = [{'orderId': ORDER, 'releasedAt': '2026-11-12T02:00:00Z'}]
        with self.page.expect_response(lambda response: is_active_cage_list(response.request)):
            self.page.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(self.row('APT-TODAY').get_by_text(BADGE)).to_have_count(0)

    def test_check_in_rechecks_cages_and_failed_refresh_clears_stale_badges(self):
        self.assignments = [{'orderId': OTHER_ORDER, 'releasedAt': '2026-11-12T02:00:00Z'}]
        self.login('Receptionist')
        self.row('APT-TODAY').get_by_role('button', name='Check-in').click()
        self.page.get_by_role('button', name='Xác nhận Check-in').click()
        expect(self.row('APT-TODAY').get_by_text('Đã tiếp nhận')).to_be_visible()
        expect(self.row('APT-TODAY').get_by_text(BADGE)).to_be_visible()
        expect(self.row('APT-SECOND').get_by_text(BADGE)).to_have_count(0)

        self.fail_cage_list = True
        self.page.get_by_role('button', name='Làm mới').click()
        expect(self.page.get_by_text('Chưa xác định trạng thái phân chuồng')).to_be_visible()
        expect(self.row('APT-TODAY').get_by_text(BADGE)).to_have_count(0)
        self.fail_cage_list = False
        self.page.get_by_role('button', name='Tải lại chuồng').click()
        expect(self.row('APT-TODAY').get_by_text(BADGE)).to_be_visible()
        expect(self.page.get_by_text('Chưa xác định trạng thái phân chuồng')).to_have_count(0)

    def test_walk_in_with_cage_shows_badge_on_new_order(self):
        self.login('Receptionist')
        self.page.get_by_role('button', name='Tiếp nhận khách vãng lai (Walk-in)').click()
        modal = self.page.get_by_role('dialog', name='Tiếp nhận khách vãng lai')
        modal.get_by_placeholder('Ví dụ: 0988111222').fill('0988111222')
        modal.locator('#services_0_serviceId').click()
        self.page.locator('.ant-select-item-option').filter(has_text='Khám tổng quát').click()
        modal.get_by_role('combobox', name='Chuồng lưu giữ (không bắt buộc)').click()
        self.page.locator('.ant-select-item-option').filter(has_text='C01').click()
        with self.page.expect_response(lambda response: is_active_cage_list(response.request)):
            modal.get_by_role('button', name='Hoàn tất Tiếp nhận & Check-in').click()
        expect(self.row('APT-WALKIN').get_by_text('Đã tiếp nhận')).to_be_visible()
        expect(self.row('APT-WALKIN').get_by_text(BADGE)).to_be_visible()
        expect(self.row('APT-TODAY').get_by_text(BADGE)).to_have_count(0)


if __name__ == '__main__':
    unittest.main()
