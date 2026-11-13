"""Desktop browser QA for the reception summary; all API traffic is fixture-only.

From an integrated FE checkout, set VITE_API_ROOT=/api and
VITE_ENABLE_RECEPTION_INTAKE=false, then run Vite on 127.0.0.2:3000.
Run `python tests/verify_reception_today_e2e.py` (FE_BASE_URL optionally
selects a different dedicated loopback listener on port 3000).
"""
import json
import math
import os
import re
import unittest
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('FE_BASE_URL', 'http://127.0.0.2:3000').rstrip('/')
if BASE not in ('http://127.0.0.2:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000', 'http://localhost:3000'):
    raise SystemExit('FE_BASE_URL must be a dedicated loopback listener on port 3000.')

TODAY, TOMORROW, YESTERDAY = '2026-11-13', '2026-11-14', '2026-11-12'
LIST = '/api/appointment-orders'
CAGES = '/api/cage-assignments'
TOKEN = 'reception-today-qa-fixture-no-real-token'
METRICS = {'all': 'Tổng lịch hôm nay', 'Booked': 'Chờ tiếp nhận',
           'CheckedIn': 'Đã tiếp nhận', 'WaitOwner': 'Chờ chủ đón'}
ERROR = 'QA: dịch vụ tổng quan tạm thời gián đoạn'


def oid(number):
    return f'{number:024x}'


def item(number, date, state, online=True):
    return {'_id': oid(number), 'code': f'APT-{number:06d}', 'date': date,
            'slotStart': '09:00', 'slotEnd': '09:30', 'derivedStatus': state,
            'checkedInAt': None, 'isOnline': online,
            'petId': {'_id': oid(900), 'name': 'Milo QA', 'species': 'Chó'},
            'ownerId': {'_id': oid(901), 'fullName': 'Chủ nuôi QA', 'phone': '0990000000'}}


def button(scope, name):
    return scope.get_by_role('button', name=re.compile(rf'(?:^| ){re.escape(name)}$'))


def read_query(url):
    return {key: values[0] for key, values in parse_qs(urlsplit(url).query).items()}


class ReceptionTodayE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.addClassCleanup(cls.pw.stop)
        cls.browser = cls.pw.chromium.launch()
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        # Today has 21 fixtures; summary page size is 1 and the table page size is 10.
        self.orders = [item(100, TODAY, 'Booked'), item(101, TODAY, 'CheckedIn'),
                       item(102, TODAY, 'InProgress'), item(103, TODAY, 'WaitOwner'),
                       item(104, TODAY, 'Cancelled'), item(105, TODAY, 'Done')]
        self.orders += [item(i, TODAY, 'Booked', online=i % 2 == 0) for i in range(106, 115)]
        self.orders += [item(i, TODAY, 'CheckedIn') for i in range(115, 119)]
        self.orders += [item(i, TODAY, 'WaitOwner', online=False) for i in range(119, 121)]
        self.orders += [item(i, TOMORROW, 'Booked') for i in range(200, 214)]
        self.orders += [item(300, YESTERDAY, 'Booked')]
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 900},
                                            timezone_id='America/Los_Angeles', service_workers='block')
        self.addCleanup(self.ctx.close)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(9000)
        self.page.clock.set_fixed_time(datetime(2026, 11, 12, 17, 0, 1, tzinfo=timezone.utc))
        self.ctx.route('**/*', self.route)
        self.role = 'Receptionist'
        self.queries = []
        self.writes = []
        self.assignments = []
        self.unhandled = []
        self.errors = []
        self.summary_fails = False
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [], 'Unexpected application API/mutation; network blocked')
        self.assertEqual(self.errors, [], 'Uncaught browser exception')

    def route(self, route):
        req = route.request
        url = urlsplit(req.url)
        origin = f'{url.scheme}://{url.netloc}'
        method, path = req.method, url.path
        is_api = path.startswith('/api/') or req.resource_type in ('xhr', 'fetch')
        if origin != BASE or not path.startswith('/api/'):
            if origin == BASE and method in ('GET', 'HEAD') and not is_api:
                return route.continue_()
            if is_api or method not in ('GET', 'HEAD'):
                self.unhandled.append((method, origin, path))
            return route.abort()
        if req.headers.get('authorization') != f'Bearer {TOKEN}':
            return route.fulfill(status=401, json={'message': 'Chưa đăng nhập'})
        if method == 'GET' and path == LIST:
            q = read_query(req.url)
            self.queries.append(q)
            if self.summary_fails and self.is_summary(q):
                return route.fulfill(status=503, json={'message': ERROR})
            orders = [o for o in self.orders if q.get('from', '') <= o['date'] <= q.get('to', '9999')
                      and (not q.get('status') or o['derivedStatus'] == q['status'])
                      and (not q.get('code') or o['code'] == q['code'])
                      and (not q.get('isOnline') or str(o['isOnline']).lower() == q['isOnline'])]
            page, limit = int(q.get('page', 1)), int(q.get('limit', 10))
            start = (page - 1) * limit
            return route.fulfill(json={'data': orders[start:start+limit], 'pagination': {
                'page': page, 'limit': limit, 'total': len(orders), 'totalPages': math.ceil(len(orders)/limit)}})
        if method == 'GET' and path == CAGES:
            return route.fulfill(json={'data': self.assignments, 'count': len(self.assignments)})
        if method == 'GET' and path in ('/api/appointment-services', '/api/users/staff'):
            return route.fulfill(json={'data': [], 'items': []})
        if method == 'PATCH' and path == f'{LIST}/{oid(100)}/check-in' and self.role == 'Receptionist':
            self.writes.append((method, path, req.post_data_buffer))
            self.orders[0].update(derivedStatus='CheckedIn', checkedInAt=f'{TODAY}T02:30:00Z')
            self.assignments = [{'_id': oid(902), 'orderId': oid(100), 'cageId': oid(903), 'releasedAt': None}]
            return route.fulfill(json={'message': 'Check-in thành công', 'data': self.orders[0]})
        self.unhandled.append((method, origin, path))
        return route.fulfill(status=501, json={'message': f'Missing fixture: {method} {path}'})

    @staticmethod
    def is_summary(q):
        return q.get('limit') == '1' and 'code' not in q

    @classmethod
    def table_response(cls, response, **wanted):
        q = read_query(response.url)
        return (response.request.method == 'GET' and urlsplit(response.url).path == LIST
                and not cls.is_summary(q) and all(q.get(key) == val for key, val in wanted.items()))

    def open(self, role='Receptionist'):
        self.role = role
        user = {'_id': oid(904), 'fullName': 'Tiếp nhận QA', 'role': role, 'status': 'Active', 'isEmailVerified': True}
        self.ctx.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                                 f"localStorage.setItem('token', {json.dumps(TOKEN)});"
                                 "sessionStorage.setItem('hasLoadedBefore', 'true');")
        self.page.goto(f'{BASE}/clinic/appointments')
        expect(self.page.get_by_text('Tiếp nhận lịch hẹn phòng khám', exact=True)).to_be_visible()

    def row(self, number):
        return self.page.get_by_role('row').filter(has_text=f'APT-{number:06d}')

    def overview(self):
        return self.page.get_by_role('region', name='Lịch hẹn hôm nay')

    def metric(self, group):
        return self.overview().get_by_role('button', name=re.compile(re.escape(METRICS[group]), re.I))

    def expect_metric(self, group, value):
        ctl = self.metric(group)
        expect(ctl).to_be_visible()
        number = re.compile(rf'(?<!\d){value}(?!\d)')
        with self.subTest(metric=group, expected=value):
            # Accept a number in the button content or in its accessible name.
            match = ctl.filter(has_text=number).or_(self.overview().get_by_role('button', name=re.compile(
                rf'(?=.*{re.escape(METRICS[group])})(?=.*(?<!\d){value}(?!\d))', re.I)))
            expect(match).to_be_visible()

    def expect_totals(self, total=21, booked=10, checked=5, wait=3):
        for key, expected in (('all', total), ('Booked', booked), ('CheckedIn', checked), ('WaitOwner', wait)):
            self.expect_metric(key, expected)

    def change_day(self, day):
        field = self.page.get_by_placeholder('Ngày hẹn', exact=True)
        with self.page.expect_response(lambda r: self.table_response(r, **{'from': day, 'to': day})):
            field.fill(day)
            field.press('Enter')

    def select_online(self):
        self.page.get_by_role('combobox', name='Hình thức đặt', exact=True).click()
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='Đặt trực tuyến (Online)').click()

    def test_summary_uses_vietnam_day_and_paginated_total_even_with_other_table_filters(self):
        self.open()
        expect(self.row(100)).to_be_visible()
        expect(self.row(119)).to_have_count(0)
        expect(self.overview().locator('time')).to_have_attribute('datetime', TODAY)
        expect(self.overview().get_by_text('Mọi trạng thái, kể cả lịch đã hủy', exact=True)).to_be_visible()
        self.expect_totals()
        queries = [q for q in self.queries if self.is_summary(q)]
        self.assertEqual({q.get('status', 'all') for q in queries}, set(METRICS))
        for q in queries:
            wanted = {'from': TODAY, 'to': TODAY, 'page': '1', 'limit': '1'}
            if q.get('status'):
                wanted['status'] = q['status']
            self.assertEqual(q, wanted)
        self.change_day(TOMORROW)
        self.select_online()
        expect(self.row(200)).to_be_visible()
        expect(self.row(100)).to_have_count(0)
        self.expect_totals()

    def test_summary_buttons_reset_page_date_code_online_and_status(self):
        self.open()
        self.expect_totals()
        self.change_day(TOMORROW)
        with self.page.expect_response(lambda r: self.table_response(r, isOnline='true')):
            self.select_online()
        with self.page.expect_response(lambda r: self.table_response(r, page='2', isOnline='true')):
            self.page.locator('.ant-pagination-item-2').click()
        expect(self.row(210)).to_be_visible()
        origin_url = self.page.url
        with self.page.expect_response(lambda r: self.table_response(r, status='Booked', page='1')) as changed:
            self.metric('Booked').focus()
            expect(self.metric('Booked')).to_be_focused()
            self.metric('Booked').press('Enter')
        q = read_query(changed.value.url)
        self.assertEqual((q.get('from'), q.get('to')), (TODAY, TODAY))
        self.assertNotIn('isOnline', q)
        expect(self.row(100)).to_be_visible()
        expect(self.row(103)).to_have_count(0)
        expect(self.metric('Booked')).to_have_attribute('aria-pressed', 'true')
        expect(self.metric('all')).to_have_attribute('aria-pressed', 'false')
        expect(self.page).to_have_url(origin_url)

        code = self.page.get_by_placeholder(re.compile('Mã lịch hẹn'))
        with self.page.expect_response(lambda r: self.table_response(r, code='APT-000100')):
            code.fill('APT-000100')
        with self.page.expect_response(lambda r: self.table_response(r, status='WaitOwner', page='1')) as changed:
            self.metric('WaitOwner').click()
        q = read_query(changed.value.url)
        self.assertEqual((q.get('from'), q.get('to')), (TODAY, TODAY))
        self.assertNotIn('code', q)
        expect(code).to_have_value('')
        expect(self.row(103)).to_be_visible()
        expect(self.row(100)).to_have_count(0)
        expect(self.metric('WaitOwner')).to_have_attribute('aria-pressed', 'true')
        with self.page.expect_response(lambda r: self.table_response(r, status=None, page='1')) as changed:
            self.metric('all').click()
        self.assertEqual(read_query(changed.value.url).get('from'), TODAY)
        expect(self.metric('all')).to_have_attribute('aria-pressed', 'true')
        expect(self.row(100)).to_be_visible()
        expect(self.row(103)).to_be_visible()

    def test_row_cta_opens_matching_modal_and_terminal_row_stays_read_only(self):
        self.open()
        button(self.row(100), 'Check-in').click()
        modal = self.page.get_by_role('dialog', name=re.compile('Xác nhận tiếp nhận lịch hẹn'))
        expect(modal.get_by_text('APT-000100', exact=True)).to_be_visible()
        button(modal, 'Hủy bỏ').click()
        expect(modal).to_have_count(0)
        for number, hint in ((101, 'Kiểm tra dịch vụ và phân công'),
                             (102, 'Theo dõi tiến độ dịch vụ'),
                             (103, 'Kiểm tra trước khi bàn giao')):
            expect(self.row(number).get_by_text(hint, exact=True)).to_be_visible()
            button(self.row(number), 'Chi tiết').click()
            details = self.page.get_by_role('dialog', name=re.compile(f'Chi tiết lịch hẹn.*APT-{number:06d}'))
            expect(details).to_be_visible()
            button(details, 'Close').click()
            expect(details).to_have_count(0)
        for number in (104, 105):
            expect(button(self.row(number), 'Chi tiết')).to_be_visible()
            expect(button(self.row(number), 'Check-in')).to_have_count(0)
            expect(button(self.row(number), 'Hủy hẹn')).to_have_count(0)
        self.assertEqual(self.writes, [])

    def test_summary_failure_is_not_zero_and_retry_keeps_table_available(self):
        self.summary_fails = True
        self.open()
        expect(self.row(100)).to_be_visible()
        retry = button(self.overview(), 'Thử lại')
        expect(self.overview().get_by_role('alert')).to_be_visible()
        expect(retry).to_be_visible()
        for group in METRICS:
            zero = re.compile(r'(?<!\d)0(?!\d)')
            expect(self.metric(group).filter(has_text=zero)).to_have_count(0)
        self.summary_fails = False
        with self.page.expect_response(lambda r: urlsplit(r.url).path == LIST and self.is_summary(read_query(r.url)) and r.status == 200):
            retry.click()
        self.expect_totals()
        expect(retry).to_have_count(0)
        expect(self.row(100)).to_be_visible()

    def test_zero_counts_only_after_successful_summary_responses(self):
        self.orders = [row for row in self.orders if row['date'] != TODAY]
        self.open()
        self.expect_totals(total=0, booked=0, checked=0, wait=0)
        expect(self.overview().get_by_role('alert')).to_have_count(0)
        self.assertEqual({q.get('status', 'all') for q in self.queries if self.is_summary(q)}, set(METRICS))

    def test_checkin_refreshes_summary_and_switches_cta_without_intake(self):
        self.open()
        self.expect_totals()
        before = len([q for q in self.queries if self.is_summary(q)])
        button(self.row(100), 'Check-in').click()
        modal = self.page.get_by_role('dialog', name=re.compile('Xác nhận tiếp nhận lịch hẹn'))
        expect(modal.get_by_text('Phiếu tiếp nhận', exact=True)).to_have_count(0)
        button(modal, 'Xác nhận Check-in').click()
        expect(self.row(100).get_by_text('Đã tiếp nhận', exact=True)).to_be_visible()
        expect(button(self.row(100), 'Check-in')).to_have_count(0)
        expect(button(self.row(100), 'Chi tiết')).to_be_visible()
        expect(self.row(100).get_by_text('Đã phân chuồng', exact=True)).to_be_visible()
        self.expect_totals(booked=9, checked=6)
        self.assertGreater(len([q for q in self.queries if self.is_summary(q)]), before)
        self.assertEqual(self.writes, [('PATCH', f'{LIST}/{oid(100)}/check-in', None)])

    def test_manual_refresh_shows_order_newly_waiting_for_pickup(self):
        self.open()
        self.expect_totals()
        self.orders[2]['derivedStatus'] = 'WaitOwner'
        button(self.page, 'Làm mới').click()
        self.expect_totals(wait=4)
        expect(self.row(102).get_by_text('Kiểm tra trước khi bàn giao', exact=True)).to_be_visible()
        self.metric('WaitOwner').click()
        expect(self.row(102)).to_be_visible()
        expect(self.row(100)).to_have_count(0)
        self.assertEqual(self.writes, [])

    def test_admin_has_no_summary_no_summary_requests_and_no_reception_ctas(self):
        self.open('Admin')
        expect(self.row(100)).to_be_visible()
        expect(self.page.get_by_text('Lịch hẹn hôm nay', exact=True)).to_have_count(0)
        for group in METRICS:
            expect(self.metric(group)).to_have_count(0)
        expect(button(self.row(100), 'Check-in')).to_have_count(0)
        expect(button(self.row(100), 'Phân chuồng')).to_have_count(0)
        expect(button(self.row(100), 'Chi tiết')).to_be_visible()
        self.assertFalse(any(self.is_summary(q) for q in self.queries))
        self.assertEqual(self.writes, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
