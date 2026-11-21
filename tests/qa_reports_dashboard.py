"""Full-router desktop Chromium QA with intercepted contract-shaped APIs, never live BE."""
import re
from copy import deepcopy
import unittest
from urllib.parse import parse_qs
from playwright.sync_api import expect
from qa_web_fixtures import BASE, install_auth, install_network_guard, launch_browser
from report_dashboard_fixtures import REPORTS, REVENUE, OPERATIONS, FRONT_DESK, empty_front_desk, empty_revenue, echo_report_range

if BASE != 'http://127.0.0.2:3000':
    raise SystemExit('Use the isolated production preview http://127.0.0.2:3000')

class ReportsDashboardE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw, cls.browser = launch_browser()
        cls.addClassCleanup(cls.pw.stop)
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.payloads = {'revenue': REVENUE, 'operations': OPERATIONS, 'front-desk': FRONT_DESK}
        self.requests, self.unhandled, self.errors = [], [], []
        self.failures = set()
        self.best_selling_failure = False
        self.ctx = None

    def tearDown(self):
        if self.ctx:
            self.ctx.close()
        self.assertEqual(self.unhandled, [], 'Unmatched requests must never reach real APIs')
        self.assertEqual(self.errors, [], 'Uncaught browser errors')

    def route(self, route, parsed):
        name = parsed.path.removeprefix(REPORTS + '/')
        if route.request.method == 'GET' and name in self.payloads:
            query = parse_qs(parsed.query)
            self.requests.append((name, query))
            if name in self.failures:
                return route.fulfill(status=500, json={'message': 'fixture temporary failure'})
            return route.fulfill(json=echo_report_range(self.payloads[name], query, revenue=name == 'revenue'))
        if route.request.method == 'GET' and parsed.path == '/api/invoices/reports/best-selling-products':
            if self.best_selling_failure:
                return route.fulfill(status=500, json={'message': 'best-selling fixture failure'})
            return route.fulfill(json={'period': 'month', 'from': '2026-11-01', 'to': '2026-11-30',
                                      'sortBy': 'quantity', 'category': None, 'items': [{'rank': 1, 'productId': 'synthetic-product', 'name': 'Thức ăn dinh dưỡng cho mèo', 'category': 'Retail', 'unit': 'Hộp', 'totalQuantity': 2, 'totalRevenue': 123000, 'invoiceCount': 1}], 'total': 1})
        if route.request.method == 'GET' and parsed.path == '/api/pets':
            return route.fulfill(json={'items': [], 'total': 0, 'page': 1, 'limit': 100, 'totalPages': 0})
        if route.request.method == 'GET' and parsed.path == '/api/appointment-orders/me':
            return route.fulfill(json={'data': [], 'pagination': {'page': 1, 'limit': 10, 'total': 0}})
        if route.request.method == 'GET' and parsed.path == '/api/appointment-services/my-queue':
            return route.fulfill(json={'items': [], 'total': 0})
        self.unhandled.append((route.request.method, parsed.path))
        route.fulfill(status=501, json={'message': 'Missing isolated fixture'})

    def visit(self, path='/admin/reports', role='Admin'):
        if self.ctx:
            self.ctx.close()
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 1000},
                                           timezone_id='Asia/Ho_Chi_Minh', service_workers='block')
        install_auth(self.ctx, role)
        install_network_guard(self.ctx, self.route, self.unhandled)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(8000)
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.goto(BASE + path)

    def card(self, title):
        return self.page.locator('.ant-card').filter(has=self.page.locator('.ant-card-head-title').get_by_text(title, exact=True)).first

    def loaded_admin(self):
        expect(self.card('Doanh thu').get_by_text('800.000', exact=False).first).to_be_visible()
        expect(self.card('Hoạt động & lịch hẹn').get_by_text('Khám tổng quát', exact=True)).to_be_visible()
        expect(self.card('Quầy lễ tân').get_by_text('800.000', exact=False).first).to_be_visible()

    def select_front(self, value):
        combo = self.page.get_by_role('combobox', name='Chọn kỳ', exact=True)
        combo.focus()
        combo.press('ArrowDown')
        self.page.get_by_title(value, exact=True).last.click()

    def test_admin_aggregate_endpoints_and_revenue_only_grouping(self):
        self.visit()
        self.loaded_admin()
        self.assertEqual({name for name, _ in self.requests}, {'revenue', 'operations', 'front-desk'})
        for name, query in self.requests:
            self.assertEqual(query['period'], ['month'])
            self.assertEqual('groupBy' in query, name == 'revenue')
            self.assertNotIn('from', query)
        initial = len(self.requests)
        self.page.locator('[aria-label="Nhóm doanh thu theo"]').get_by_text('Tháng', exact=True).click()
        expect(self.card('Doanh thu').get_by_text('800.000', exact=False).first).to_be_visible()
        self.page.wait_for_function('document.querySelectorAll(".ant-spin-spinning").length === 0')
        self.assertTrue(any(n == 'revenue' and q.get('groupBy') == ['month'] for n, q in self.requests[initial:]))
        self.assertTrue(all('groupBy' not in q for n, q in self.requests[initial:] if n != 'revenue'))

    def test_admin_presets_omit_custom_date_params(self):
        self.visit()
        self.loaded_admin()
        with self.page.expect_request('**/api/reports/operations?*period=day*'):
            self.page.locator('[aria-label="Kỳ báo cáo"]').first.get_by_text('Hôm nay', exact=True).click()
        expect(self.card('Hoạt động & lịch hẹn').get_by_text('Khám tổng quát', exact=True)).to_be_visible()
        for name, query in self.requests[-3:]:
            self.assertEqual(query['period'], ['day'])
            self.assertNotIn('from', query)
            self.assertNotIn('to', query)

    def test_admin_api_failure_does_not_show_old_revenue_and_can_retry(self):
        self.visit()
        self.loaded_admin()
        self.failures.add('revenue')
        self.page.get_by_role('button', name=re.compile('Làm mới$')).first.click()
        revenue = self.card('Doanh thu')
        expect(revenue.get_by_text('fixture temporary failure', exact=True)).to_be_visible()
        expect(revenue.get_by_text('800.000', exact=False)).to_have_count(0)
        expect(self.card('Quầy lễ tân').get_by_text('800.000', exact=False).first).to_be_visible()
        self.failures.clear()
        revenue.get_by_role('button', name='Thử lại', exact=True).click()
        expect(revenue.get_by_text('800.000', exact=False).first).to_be_visible()

    def test_admin_empty_revenue_is_zero_not_missing(self):
        self.payloads['revenue'] = empty_revenue()
        self.visit()
        revenue = self.card('Doanh thu')
        expect(revenue.get_by_text('Doanh thu đã thu', exact=True)).to_be_visible()
        expect(revenue.get_by_text('800.000', exact=False)).to_have_count(0)
        expect(revenue.get_by_text(re.compile('VNPay')).first).to_be_visible()
        self.assertEqual(self.errors, [])

    def test_receptionist_defaults_today_and_does_not_fetch_admin_apis(self):
        self.visit('/clinic/dashboard', 'Receptionist')
        expect(self.page.get_by_role('heading', name='Trực tiếp tại quầy', exact=True)).to_be_visible()
        expect(self.page.get_by_text('Lịch đặt hôm nay chưa tiếp nhận', exact=True)).to_be_visible()
        expect(self.page.get_by_text('Tổng tiền đã thu trong kỳ', exact=True)).to_be_visible()
        self.assertTrue(self.requests)
        self.assertTrue(all(n == 'front-desk' and q == {'period': ['day']} for n, q in self.requests))
        self.page.screenshot(path='tests/screenshots/reports-front-desk-desktop.png', full_page=True)

    def test_receptionist_custom_filter_validation_then_submit(self):
        self.visit('/clinic/dashboard', 'Receptionist')
        expect(self.page.get_by_role('heading', name='Trực tiếp tại quầy', exact=True)).to_be_visible()
        self.select_front('Khoảng ngày tùy chọn')
        before = len(self.requests)
        self.page.get_by_role('button', name='Áp dụng kỳ thống kê', exact=True).click()
        expect(self.page.get_by_text('Khoảng ngày chưa hợp lệ. Báo cáo chưa được thay đổi.', exact=True)).to_be_visible()
        self.assertEqual(before, len(self.requests))
        self.page.locator('#front-desk-from').fill('2026-11-10')
        self.page.locator('#front-desk-to').fill('2026-11-12')
        with self.page.expect_request('**/api/reports/front-desk?*period=custom*'):
            self.page.get_by_role('button', name='Áp dụng kỳ thống kê', exact=True).click()
        expect(self.page.get_by_role('heading', name='Trực tiếp tại quầy', exact=True)).to_be_visible()
        self.assertEqual(self.requests[-1][1], {'period': ['custom'], 'from': ['2026-11-10'], 'to': ['2026-11-12']})
        self.assertTrue(all(n == 'front-desk' for n, _ in self.requests))

    def test_receptionist_null_wait_and_current_counters_remain_separate(self):
        payload = empty_front_desk()
        payload['todayCounters'].update(expectedToday=7, checkedInNow=8, inProgressNow=9, waitingForPickup=10)
        self.payloads['front-desk'] = payload
        self.visit('/clinic/dashboard', 'Receptionist')
        expect(self.page.get_by_role('heading', name='Trực tiếp tại quầy', exact=True)).to_be_visible()
        expect(self.page.get_by_text('Chưa có dữ liệu', exact=True)).to_be_visible()
        section = self.page.locator('section[aria-labelledby="front-desk-live-title"]')
        for value in ('7', '8', '9', '10'):
            expect(section.locator('.ant-statistic-content').get_by_text(value, exact=True)).to_be_visible()
        expect(section.get_by_text('Không phụ thuộc kỳ thống kê', exact=True)).to_be_visible()

    def test_receptionist_error_retry(self):
        self.failures.add('front-desk')
        self.visit('/clinic/dashboard', 'Receptionist')
        expect(self.page.get_by_text('fixture temporary failure', exact=True)).to_be_visible()
        expect(self.page.get_by_role('heading', name='Trực tiếp tại quầy', exact=True)).to_have_count(0)
        self.failures.clear()
        self.page.get_by_role('button', name='Thử lại', exact=True).click()
        expect(self.page.get_by_role('heading', name='Trực tiếp tại quầy', exact=True)).to_be_visible()

    def test_admin_can_open_front_desk_without_receptionist_only_action(self):
        self.visit('/clinic/dashboard', 'Admin')
        expect(self.page.get_by_role('heading', name='Trực tiếp tại quầy', exact=True)).to_be_visible()
        expect(self.page.get_by_role('button', name='Tiếp nhận khách tại quầy', exact=True)).to_have_count(0)
        expect(self.page.get_by_role('button', name='Xem hóa đơn và chờ đón', exact=True)).to_be_visible()
        self.assertTrue(all(n == 'front-desk' for n, _ in self.requests))

    def test_admin_desktop_snapshot(self):
        self.visit()
        self.loaded_admin()
        expect(self.card('Hoạt động & lịch hẹn').locator('img[src="x"]')).to_have_count(0)
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        self.page.screenshot(path='tests/screenshots/reports-admin-desktop.png', full_page=True)

    def test_service_name_is_escaped_not_executed(self):
        self.payloads['operations'] = deepcopy(OPERATIONS)
        name = 'Khám tổng quát <img src=x onerror=alert(1)>'
        self.payloads['operations']['topServices'][0]['name'] = name
        self.visit()
        card = self.card('Hoạt động & lịch hẹn')
        expect(card.get_by_text(name, exact=True)).to_be_visible()
        expect(card.locator('img[src="x"]')).to_have_count(0)

    def test_old_best_selling_rows_disappear_on_failed_filter_and_retry(self):
        self.visit()
        self.loaded_admin()
        card = self.card('Sản phẩm bán chạy')
        expect(card.get_by_text('Thức ăn dinh dưỡng cho mèo', exact=True)).to_be_visible()
        self.best_selling_failure = True
        card.get_by_text('Theo doanh thu', exact=True).click()
        expect(card.get_by_text('best-selling fixture failure', exact=True)).to_be_visible()
        expect(card.get_by_text('Thức ăn dinh dưỡng cho mèo', exact=True)).to_have_count(0)
        self.best_selling_failure = False
        card.get_by_role('button', name=re.compile('Làm mới$')).click()
        expect(card.get_by_text('Thức ăn dinh dưỡng cho mèo', exact=True)).to_be_visible()

    def test_forbidden_roles_redirect_without_report_fetch(self):
        for role, target in [('PetOwner', '/dashboard'), ('Veterinarian', '/clinic/my-queue'), ('Groomer', '/clinic/my-queue')]:
            for path in ['/admin/reports', '/clinic/dashboard']:
                with self.subTest(role=role, path=path):
                    self.visit(path, role)
                    expect(self.page).to_have_url(BASE + target)
                    expect(self.page.locator('.ant-spin-spinning')).to_have_count(0)
                    self.assertEqual(self.requests, [], 'Unauthorized users must not request reports')

if __name__ == '__main__':
    unittest.main(verbosity=2)
