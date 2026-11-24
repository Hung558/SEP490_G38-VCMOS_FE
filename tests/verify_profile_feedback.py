"""Desktop account feedback checks, isolated fixture traffic only."""
import json
import re
import unittest
from pathlib import Path
from playwright.sync_api import expect
from qa_web_fixtures import BASE, OWNER, install_auth, install_network_guard, launch_browser


class ProfileFeedback(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw, cls.browser = launch_browser()
        cls.addClassCleanup(cls.pw.stop)
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.role = 'PetOwner'
        self.profile = {**OWNER, 'code': 'USR-1024', 'email': 'minhanh@example.com', 'phone': '0901234567', 'createdAt': '2026-10-10T08:00:00Z'}
        self.blocked, self.writes, self.errors = [], [], []
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 1100}, service_workers='block')
        self.addCleanup(self.ctx.close)
        install_auth(self.ctx)
        install_network_guard(self.ctx, self.route, self.blocked)
        self.page = self.ctx.new_page()
        self.page.on('pageerror', lambda err: self.errors.append(str(err)))

    def route(self, route, parsed):
        method, path = route.request.method, parsed.path
        if path == '/api/users/me':
            if method == 'PUT':
                self.writes.append((method, path))
                self.profile.update(route.request.post_data_json)
            return route.fulfill(json={'user': {**self.profile, 'role': self.role}})
        if method == 'GET' and path == '/api/pets':
            return route.fulfill(json={'items': [], 'page': 1, 'limit': 100, 'total': 0, 'totalPages': 0})
        if method == 'GET' and path == '/api/admin/users':
            return route.fulfill(json={'users': [self.profile]})
        if method == 'GET' and path == '/api/services':
            return route.fulfill(json={'services': []})
        if method == 'POST' and path in ('/api/users/me/email/send-otp', '/api/users/me/email/verify'):
            self.writes.append((method, path))
            if path.endswith('/verify'):
                self.profile['isEmailVerified'] = True
                return route.fulfill(json={'user': {**self.profile, 'role': self.role}})
            return route.fulfill(json={'message': 'Mã xác thực đã được gửi'})
        if method == 'POST' and path in ('/api/users/me/password/send-otp', '/api/users/me/password'):
            self.writes.append((method, path))
            return route.fulfill(json={'message': 'Thành công'})
        self.blocked.append((method, path))
        return route.fulfill(status=501, json={'message': 'Chưa có dữ liệu mô phỏng'})

    def tearDown(self):
        self.assertEqual(self.blocked, [])
        self.assertEqual(self.errors, [])

    def test_single_heading_and_role_sections_for_all_five_roles(self):
        for role in ('PetOwner', 'Receptionist', 'Veterinarian', 'Groomer', 'Admin'):
            with self.subTest(role=role):
                self.role = role
                install_auth(self.ctx, role)
                self.page.goto(BASE + '/profile')
                expect(self.page.get_by_role('heading', name='Thông tin tài khoản', exact=True)).to_have_count(1)
                expect(self.page.locator('h1')).to_have_count(1)
                expect(self.page.get_by_role('button', name=re.compile('Chỉnh sửa thông tin$'))).to_be_visible()
                expect(self.page.get_by_role('button', name=re.compile('Đổi mật khẩu$'))).to_be_visible()
                section = 'Thú cưng của tôi' if role == 'PetOwner' else 'Tổng quan quản trị' if role == 'Admin' else 'Công việc của bạn'
                expect(self.page.get_by_role('heading', name=section, exact=True)).to_be_visible()
                if role == 'PetOwner':
                    Path('tests/screenshots').mkdir(exist_ok=True)
                    self.page.screenshot(path='tests/screenshots/feedback-2-1-account.png', full_page=True)

    def test_edit_and_password_otp_modals_remain_usable(self):
        self.page.goto(BASE + '/profile')
        self.page.get_by_role('button', name=re.compile('Chỉnh sửa thông tin$')).click()
        dialog = self.page.get_by_role('dialog')
        dialog.get_by_label('Họ và tên', exact=True).fill('Nguyễn Minh Anh')
        dialog.get_by_label('Số điện thoại', exact=True).fill('0909876543')
        dialog.get_by_role('button', name='Lưu thay đổi').click()
        expect(dialog).to_have_count(0)
        self.assertIn(('PUT', '/api/users/me'), self.writes)
        self.page.get_by_role('button', name=re.compile('Đổi mật khẩu$')).click()
        dialog = self.page.get_by_role('dialog')
        expect(dialog.get_by_placeholder('Nhập mật khẩu hiện tại')).to_be_visible()
        expect(dialog.get_by_placeholder('Ít nhất 8 ký tự, 1 chữ hoa và 1 chữ số')).to_be_visible()
        dialog.get_by_role('button', name=re.compile('Lấy mã OTP')).click()
        expect(dialog.get_by_text('Gửi lại sau', exact=False)).to_be_visible()
        self.assertIn(('POST', '/api/users/me/password/send-otp'), self.writes)


    def test_email_verification_otp_flow_remains_usable(self):
        self.profile['isEmailVerified'] = False
        self.ctx.add_init_script("sessionStorage.setItem('email-notice-dismissed', 'true');")
        self.page.goto(BASE + '/profile')
        self.page.get_by_role('button', name=re.compile('Xác thực ngay')).click()
        dialog = self.page.get_by_role('dialog')
        expect(dialog.get_by_placeholder('------')).to_be_visible()
        dialog.get_by_placeholder('------').fill('123456')
        dialog.get_by_role('button', name='Xác nhận kích hoạt Email').click()
        expect(dialog).to_have_count(0)
        expect(self.page.get_by_text('Đã xác thực', exact=True)).to_be_visible()
        self.assertIn(('POST', '/api/users/me/email/send-otp'), self.writes)
        self.assertIn(('POST', '/api/users/me/email/verify'), self.writes)


if __name__ == '__main__':
    unittest.main(verbosity=2)
