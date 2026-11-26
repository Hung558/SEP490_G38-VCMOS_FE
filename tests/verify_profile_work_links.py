"""Profile work links: read-only browser checks with fully intercepted APIs.
Run: python -B tests/verify_profile_work_links.py
"""
import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import expect, sync_playwright
from report_dashboard_fixtures import FRONT_DESK

BASE = 'http://127.0.0.1:3000'
SCREENS = {
    'Receptionist': [
        ('Bảng điều khiển lễ tân', '/clinic/dashboard'),
        ('Lịch chung của phòng khám', '/clinic/appointments?tab=schedule'),
        ('Tiếp nhận khách vãng lai', '/clinic/appointments?walkin=new'),
        ('Sơ đồ chuồng', '/cages'),
        ('Thu ngân và thanh toán', '/clinic/invoices'),
        ('Danh bạ khách hàng và thú cưng', '/clinic/appointments?tab=lookup'),
    ],
    'Veterinarian': [
        ('Lịch làm việc và hàng đợi khám', '/clinic/my-queue'),
        ('Bệnh án SOAP', '/clinic/my-queue'),
        ('Chỉ định và kết quả cận lâm sàng', '/clinic/my-queue'),
        ('Khu nội trú và nhật ký hằng ngày', '/clinic/inpatient'),
    ],
    'Groomer': [
        ('Lịch làm việc và hàng đợi spa', '/clinic/my-queue'),
        ('Thực hiện grooming và ghi chú chăm sóc', '/clinic/my-queue'),
        ('Dịch vụ phụ được giao (ví dụ tắm thuốc)', '/clinic/my-queue'),
    ],
}

class ProfileWorkLinks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.errors, self.writes, self.unexpected = [], [], []

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.assertEqual(self.writes, [])
        self.assertEqual(self.unexpected, [])

    def open_browser(self, role, system_only=False):
        ctx = self.__class__.browser.new_context(viewport={'width': 1440, 'height': 1100}, service_workers='block')
        self.addCleanup(ctx.close)
        user = {'_id': '000000000000000000000053', 'fullName': 'Nguyễn Minh Anh',
                'phone': '0901234567', 'email': 'minhanh@example.test',
                'status': 'Active', 'isEmailVerified': True,
                ('systemRole' if system_only else 'role'): role}
        ctx.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});localStorage.setItem('token','fictional-profile-token');sessionStorage.setItem('hasLoadedBefore','true');")
        def guard(route):
            req = route.request
            path = urlsplit(req.url).path
            if path.startswith('/api/') or req.resource_type in ('fetch', 'xhr'):
                if req.method != 'GET':
                    self.writes.append((req.method, path))
                    return route.fulfill(status=501, json={})
                if path in ('/api/users/me', '/api/auth/me'):
                    return route.fulfill(json={'user': user, 'data': user})
                if path == '/api/reports/front-desk':
                    return route.fulfill(json=FRONT_DESK)
                allowed = ('/api/appointment-orders', '/api/appointment-services', '/api/cages',
                           '/api/cage-assignments', '/api/staff-schedules', '/api/users/staff',
                           '/api/services', '/api/invoices', '/api/subtask-requests', '/api/inpatient-records')
                if not any(path == p or path.startswith(p + '/') for p in allowed):
                    self.unexpected.append(path)
                return route.fulfill(json={'data': [], 'items': [], 'services': [], 'users': [],
                    'staff': [], 'pets': [], 'total': 0,
                    'pagination': {'page': 1, 'limit': 10, 'total': 0, 'totalPages': 0}})
            if req.url.startswith(BASE + '/') and req.method == 'GET':
                return route.continue_()
            return route.abort()
        ctx.route('**/*', guard)
        page = ctx.new_page()
        page.set_default_timeout(8000)
        page.on('pageerror', lambda error: self.errors.append(str(error)))
        return page

    def profile(self, page):
        page.goto(BASE + '/profile')
        expect(page.get_by_role('heading', name='Công việc của bạn', exact=True)).to_be_visible()
        expect(page.locator('.screen-list').get_by_text('Đang phát triển')).to_have_count(0)
        expect(page.get_by_text('Chưa có dữ liệu ca làm việc.', exact=False)).to_have_count(0)

    def work_links(self, role):
        page = self.open_browser(role)
        for name, path in SCREENS[role]:
            with self.subTest(role=role, screen=name):
                self.profile(page)
                link = page.get_by_role('link', name='Mở ' + name, exact=True)
                expect(link).to_have_attribute('href', path)
                link.click()
                if 'walkin=new' in path:
                    expect(page).to_have_url(BASE + '/clinic/appointments')
                    expect(page.get_by_role('dialog')).to_be_visible()
                else:
                    expect(page).to_have_url(BASE + path)
                if 'tab=' in path:
                    tab = 'Lịch chung' if 'schedule' in path else 'Tra cứu khách hàng'
                    expect(page.get_by_role('tab', name=re.compile(tab))).to_have_attribute('aria-selected', 'true')
                    page.reload()
                    expect(page.get_by_role('tab', name=re.compile(tab))).to_have_attribute('aria-selected', 'true')
                elif path == '/clinic/my-queue':
                    title = 'Hàng đợi khám' if role == 'Veterinarian' else 'Hàng đợi spa'
                    expect(page.get_by_role('heading', name=title, exact=True)).to_be_visible()
                elif path == '/clinic/inpatient':
                    expect(page.get_by_role('heading', name='Nội trú', exact=True)).to_be_visible()
        self.profile(page)
        folder = Path(__file__).parent / 'screenshots'
        folder.mkdir(exist_ok=True)
        page.locator('.screen-list').scroll_into_view_if_needed()
        page.screenshot(path=str(folder / f'profile-work-links-{role}.png'), full_page=True)

    def test_receptionist_work_links(self):
        self.work_links('Receptionist')

    def test_veterinarian_work_links(self):
        self.work_links('Veterinarian')

    def test_groomer_work_links(self):
        self.work_links('Groomer')

    def test_work_schedule_shortcut_for_all_staff(self):
        for role in SCREENS:
            with self.subTest(role=role):
                page = self.open_browser(role, system_only=True)
                self.profile(page)
                page.get_by_role('link', name='Xem lịch làm việc', exact=True).click()
                expect(page).to_have_url(BASE + '/staff-schedules')
                title = 'Ca làm việc' if role == 'Receptionist' else 'Lịch làm việc của tôi'
                expect(page.get_by_role('heading', name=title, exact=True)).to_be_visible()

    def test_reception_tab_navigation_preserves_back_and_invalid_fallback(self):
        page = self.open_browser('Receptionist')
        page.goto(BASE + '/clinic/appointments?tab=schedule')
        schedule = page.get_by_role('tab', name=re.compile('Lịch chung'))
        lookup = page.get_by_role('tab', name=re.compile('Tra cứu khách hàng'))
        expect(schedule).to_have_attribute('aria-selected', 'true')
        lookup.click()
        expect(page).to_have_url(BASE + '/clinic/appointments?tab=lookup')
        page.go_back()
        expect(schedule).to_have_attribute('aria-selected', 'true')
        page.goto(BASE + '/clinic/appointments?tab=unknown')
        expect(page.get_by_role('tab', name=re.compile('Danh sách lịch hẹn'))).to_have_attribute('aria-selected', 'true')

if __name__ == '__main__':
    unittest.main()

