"""Desktop Chromium E2E for integrated BE #56 reports/dashboard UI.

Do not run on the pre-integration dcad580 feature tree. Start the integrated FE
with VITE_API_ROOT=/api on http://127.0.0.2:3000 using Vite --strictPort, then:
  FE_BASE_URL=http://127.0.0.2:3000 python tests/qa_reports_dashboard.py -v
All API traffic is fixture-only; unexpected or cross-origin traffic is blocked.
"""
import json
import os
import re
import unittest
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect
from qa_web_fixtures import BASE, TOKEN, install_auth, install_network_guard, launch_browser
from report_dashboard_fixtures import REPORTS, REVENUE, OPERATIONS, FRONT_DESK, empty_front_desk, empty_revenue

if BASE != 'http://127.0.0.2:3000':
    raise SystemExit('Dashboard E2E requires isolated integrated preview at http://127.0.0.2:3000')

ADMIN = '/admin/reports'
RECEPTIONIST = '/clinic/dashboard'
TODAY = '2026-11-20'
SERVICE_HAZARD = 'Khám QA <img src=x onerror=alert(1)>'


class ReportsDashboardE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw, cls.browser = launch_browser()
        cls.addClassCleanup(cls.pw.stop)
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.role = 'Admin'
        self.revenue, self.operations, self.front_desk = REVENUE, OPERATIONS, FRONT_DESK
        self.fail_once = set()
        self.requests, self.unhandled, self.page_errors = [], [], []
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 1000},
                                            timezone_id='Asia/Ho_Chi_Minh', service_workers='block')
        self.addCleanup(self.ctx.close)
        install_auth(self.ctx, self.role)
        install_network_guard(self.ctx, self.route, self.unhandled)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(8000)
        self.page.on('pageerror', lambda error: self.page_errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [], 'Unexpected API and cross-origin requests were blocked, never forwarded')
        self.assertEqual(self.page_errors, [], 'Uncaught browser exceptions')

    def route(self, route, parsed):
        method, path = route.request.method, parsed.path
        if method == 'GET' and path == f'{REPORTS}/revenue':
            self.requests.append((path, parse_qs(parsed.query)))
            if path in self.fail_once:
                self.fail_once.remove(path)
                return route.fulfill(status=500, json={'message': 'fixture temporary failure'})
            return route.fulfill(json=self.revenue)
        if method == 'GET' and path == f'{REPORTS}/operations':
            self.requests.append((path, parse_qs(parsed.query)))
            if path in self.fail_once:
                self.fail_once.remove(path)
                return route.fulfill(status=500, json={'message': 'fixture temporary failure'})
            return route.fulfill(json=self.operations)
        if method == 'GET' and path == f'{REPORTS}/front-desk':
            self.requests.append((path, parse_qs(parsed.query)))
            if path in self.fail_once:
                self.fail_once.remove(path)
                return route.fulfill(status=500, json={'message': 'fixture temporary failure'})
            return route.fulfill(json=self.front_desk)
        # Keep the existing best-selling widget fully mocked on /admin/reports.
        if method == 'GET' and path == '/api/invoices/reports/best-selling-products':
            return route.fulfill(json={'period': 'month', 'from': '2026-11-01', 'to': '2026-11-30',
                                       'sortBy': 'quantity', 'category': None, 'items': [], 'total': 0})
        self.unhandled.append((method, path, parsed.query))
        return route.fulfill(status=501, json={'message': f'Fixture thiếu {method} {path}'})

    def visit(self, path, role):
        self.role = role
        # Init scripts run before each navigation and provide a synthetic local session.
        install_auth(self.ctx, role)
        self.page.goto(f'{BASE}{path}')

    def panel(self, title):
        heading = self.page.get_by_role('heading', name=re.compile(title, re.I)).first
        expect(heading).to_be_visible()
        return self.page

    def select_period(self, label, option):
        self.page.get_by_role('combobox', name=re.compile(label, re.I)).click()
        self.page.get_by_role('option', name=re.compile(option, re.I)).click()

    def test_admin_revenue_displays_kpis_series_breakdowns_and_safely_escapes_names(self):
        self.visit(ADMIN, 'Admin')
        self.panel('Doanh thu')
        for text in ('800.000', '2', '400.000', '100%', '2026-11-11', 'VNPay', 'PayOS',
                     'Examination', 'Vaccination', 'Grooming', 'Paraclinical', 'Inpatient',
                     'Service', 'Product', 'InpatientDay', '37,5%', '62,5%'):
            expect(self.page.get_by_text(text, exact=False).first).to_be_visible()
        self.assertTrue(any(path.endswith('/revenue') for path, _ in self.requests))
        self.assertEqual(self.page.locator('img[onerror]').count(), 0)

    def test_admin_operations_displays_every_appointment_service_cage_and_inventory_field(self):
        self.visit(ADMIN, 'Admin')
        self.panel('Vận hành')
        for text in ('4', 'Booked', 'CheckedIn', 'InProgress', 'WaitOwner', 'Done', 'Overdue', 'Cancelled',
                     'Online', 'Walk-in', '50%', '25%', 'Examination', 'Grooming',
                     'Khám QA <img src=x onerror=alert(1)>', 'Tắm QA', 'Holding', 'InpatientWard',
                     'Cách ly', 'Khách hàng đang hoạt động', 'Thú cưng đang hoạt động'):
            expect(self.page.get_by_text(text, exact=False).first).to_be_visible()
        expect(self.page.get_by_text(SERVICE_HAZARD, exact=True)).to_be_visible()
        self.assertEqual(self.page.locator('img[onerror]').count(), 0)
        self.assertTrue(any(path.endswith('/operations') for path, _ in self.requests))

    def test_admin_revenue_custom_range_validation_and_server_query(self):
        self.visit(ADMIN, 'Admin')
        self.select_period('Kỳ', 'Tùy chỉnh')
        start = self.page.get_by_label(re.compile('Từ ngày|Ngày bắt đầu', re.I))
        end = self.page.get_by_label(re.compile('Đến ngày|Ngày kết thúc', re.I))
        start.fill('2026-11-10')
        end.fill('2026-11-12')
        self.page.get_by_role('button', name=re.compile('Áp dụng|Lọc|Xem báo cáo', re.I)).click()
        expect(self.page.get_by_text('2026-11-12', exact=False).first).to_be_visible()
        query = next(query for path, query in reversed(self.requests) if path.endswith('/revenue'))
        self.assertEqual(query.get('from'), ['2026-11-10'])
        self.assertEqual(query.get('to'), ['2026-11-12'])
        # Invalid calendar dates and spans >366 days must be rejected before API access.
        count = len([entry for entry in self.requests if entry[0].endswith('/revenue')])
        start.fill('2026-02-31')
        end.fill('2026-11-12')
        self.page.get_by_role('button', name=re.compile('Áp dụng|Lọc|Xem báo cáo', re.I)).click()
        expect(self.page.get_by_role('alert').filter(has_text=re.compile('ngày|hợp lệ|không', re.I)).first).to_be_visible()
        self.assertEqual(count, len([entry for entry in self.requests if entry[0].endswith('/revenue')]))

    def test_receptionist_live_counters_are_separate_from_filtered_period_and_wait_is_null(self):
        self.front_desk = empty_front_desk()
        self.front_desk['today'] = TODAY
        self.front_desk['todayCounters'].update({'expectedToday': 7, 'checkedInNow': 8, 'inProgressNow': 9, 'waitingForPickup': 10})
        self.front_desk['periodStats']['averageWaitMinutes'] = None
        self.front_desk['periodStats']['totalAppointments'] = 0
        self.visit(RECEPTIONIST, 'Receptionist')
        self.panel('Quầy lễ tân|Tổng quan')
        expect(self.page.get_by_text(TODAY, exact=False).first).to_be_visible()
        for text in ('7', '8', '9', '10', '0', 'Không có dữ liệu'):
            expect(self.page.get_by_text(text, exact=False).first).to_be_visible()
        request = next(query for path, query in reversed(self.requests) if path.endswith('/front-desk'))
        self.assertEqual(request.get('period'), ['month'])

    def test_admin_and_receptionist_front_desk_show_period_statistics_and_daily_counts(self):
        for role, path in [('Admin', ADMIN), ('Receptionist', RECEPTIONIST)]:
            with self.subTest(role=role):
                self.visit(path, role)
                self.panel('Quầy lễ tân|Tổng quan|Doanh thu')
                for text in (TODAY, 'Expected', 'Checked-in', 'In progress', 'Waiting for pickup',
                             '20', '800.000', 'Cash', 'VNPay', 'PayOS', 'Online', 'Walk-in'):
                    expect(self.page.get_by_text(text, exact=False).first).to_be_visible()

    def test_report_errors_offer_retry_and_recover_without_calling_live_api(self):
        self.fail_once = {f'{REPORTS}/revenue'}
        self.visit(ADMIN, 'Admin')
        expect(self.page.get_by_role('alert').filter(has_text=re.compile('lỗi|không tải|thử lại', re.I)).first).to_be_visible()
        with self.page.expect_response(lambda response: response.url.split('?')[0].endswith('/reports/revenue')) as retried:
            self.page.get_by_role('button', name=re.compile('Thử lại', re.I)).click()
        self.assertEqual(retried.value.status, 200)
        expect(self.page.get_by_text('800.000', exact=False).first).to_be_visible()

    def test_staff_roles_are_denied_report_routes_without_protected_report_requests(self):
        for role, path in [('PetOwner', ADMIN), ('Veterinarian', ADMIN), ('Groomer', ADMIN),
                           ('PetOwner', RECEPTIONIST), ('Veterinarian', RECEPTIONIST), ('Groomer', RECEPTIONIST)]:
            with self.subTest(role=role, path=path):
                self.requests.clear()
                self.visit(path, role)
                self.page.wait_for_load_state('domcontentloaded')
                self.assertEqual(self.requests, [], f'{role} unexpectedly requested a reports API at {path}')
                self.assertNotEqual(urlsplit(self.page.url).path, path, f'{role} was not redirected/denied from {path}')

    def test_owner_vet_and_groomer_landing_routes_remain_unchanged(self):
        for role, path in [('PetOwner', '/dashboard'), ('Veterinarian', '/clinic/my-queue'), ('Groomer', '/clinic/my-queue')]:
            with self.subTest(role=role):
                self.requests.clear()
                self.visit(path, role)
                self.assertEqual(self.requests, [])
                self.assertEqual(urlsplit(self.page.url).path, path)

    def test_revenue_empty_dataset_renders_zero_state_and_null_growth_without_comparison_copy(self):
        self.revenue = empty_revenue()
        self.revenue['kpis']['revenueChangePercent'] = None
        self.visit(ADMIN, 'Admin')
        self.panel('Doanh thu')
        expect(self.page.get_by_text('0', exact=False).first).to_be_visible()
        expect(self.page.get_by_text(re.compile('không có dữ liệu|chưa có dữ liệu|chưa đủ dữ liệu', re.I)).first).to_be_visible()


if __name__ == '__main__':
    unittest.main(verbosity=2)

