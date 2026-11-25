"""Read-only browser checks: all API traffic is intercepted, no live BE writes."""
import json
import re
import unittest
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
from report_dashboard_fixtures import REVENUE, OPERATIONS, FRONT_DESK

BASE = 'http://localhost:3000'
LANDINGS = {'PetOwner': '/dashboard', 'Veterinarian': '/clinic/my-queue',
            'Receptionist': '/clinic/dashboard', 'Groomer': '/clinic/my-queue',
            'Admin': '/admin/reports'}

class RoleLandingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def context(self, role, signed_in=False, system_role_only=False):
        context = self.browser.new_context()
        self.addCleanup(context.close)
        user = {'_id': '000000000000000000000053', 'fullName': 'Nguyễn Minh Anh',
                'status': 'Active', 'isEmailVerified': True,
                ('systemRole' if system_role_only else 'role'): role}
        if signed_in:
            context.add_init_script(
                f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                "localStorage.setItem('token', 'local-fixture-token');"
                "sessionStorage.setItem('hasLoadedBefore', 'true');")
        def handler(route):
            request = route.request
            path = urlsplit(request.url).path
            if path.startswith('/api/') or request.resource_type in ('fetch', 'xhr'):
                reports = {'/api/reports/revenue': REVENUE, '/api/reports/operations': OPERATIONS, '/api/reports/front-desk': FRONT_DESK}
                if path in reports:
                    return route.fulfill(json=reports[path])
                if path == '/api/auth/login':
                    return route.fulfill(json={'token': 'local-fixture-token', 'user': user})
                if path in ('/api/auth/me', '/api/users/me'):
                    return route.fulfill(json={'user': user, 'data': user})
                return route.fulfill(json={'data': [], 'items': [], 'pets': [],
                                           'orders': [], 'services': [], 'total': 0})
            if request.url.startswith(BASE) and request.method == 'GET':
                return route.continue_()
            return route.abort()
        context.route('**/*', handler)
        return context

    def test_login_goes_to_role_workspace(self):
        for role, target in LANDINGS.items():
            with self.subTest(role=role):
                page = self.context(role).new_page()
                page.goto(BASE + '/login')
                page.get_by_placeholder('Nhập số điện thoại hoặc email').fill('0901234567')
                page.get_by_placeholder('Nhập mật khẩu của bạn').fill('fixture-password')
                page.get_by_role('button', name='Đăng nhập', exact=True).click()
                expect(page).to_have_url(re.compile(re.escape(BASE + target) + r'(?:\?.*)?$'))
                expect(page.locator('.ant-layout-sider')).to_be_visible()

    def test_signed_in_home_and_reload_redirect_to_workspace(self):
        for role, target in LANDINGS.items():
            with self.subTest(role=role):
                page = self.context(role, signed_in=True).new_page()
                page.goto(BASE + '/')
                expect(page).to_have_url(BASE + target)
                page.reload()
                expect(page).to_have_url(BASE + target)
                expect(page.locator('.ant-layout-sider')).to_be_visible()

    def test_system_role_login_fallback(self):
        page = self.context('Veterinarian', system_role_only=True).new_page()
        page.goto(BASE + '/login')
        page.get_by_placeholder('Nhập số điện thoại hoặc email').fill('0901234567')
        page.get_by_placeholder('Nhập mật khẩu của bạn').fill('fixture-password')
        page.get_by_role('button', name='Đăng nhập', exact=True).click()
        expect(page).to_have_url(BASE + LANDINGS['Veterinarian'])

    def test_guest_stays_home(self):
        page = self.context('PetOwner').new_page()
        page.goto(BASE + '/')
        expect(page).to_have_url(BASE + '/')
        expect(page.locator('.ant-layout-sider')).to_have_count(0)
        expect(page.get_by_role('banner').get_by_role('button', name='Đăng nhập', exact=True)).to_be_visible()

    def test_community_remains_public_for_signed_in_users(self):
        page = self.context('PetOwner', signed_in=True).new_page()
        page.goto(BASE + '/community')
        expect(page).to_have_url(BASE + '/community')

if __name__ == '__main__':
    unittest.main()
