"""Desktop E2E for pet deletion conflict. Run against loopback Vite with VITE_API_ROOT=/api."""
import json
import os
import re
import unittest
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('FE_BASE_URL', 'http://127.0.0.2:3000').rstrip('/')
if not re.fullmatch(r'http://127\.0\.0\.[12]:3\d{3}', BASE):
    raise SystemExit('Desktop fixture requires a dedicated loopback Vite URL.')

PET = '000000000000000000000042'
OWNER = {'_id': '000000000000000000000041', 'fullName': 'Chủ nuôi QA',
         'role': 'PetOwner', 'status': 'Active', 'isEmailVerified': True}
CONFLICT = 'Không thể xóa thú cưng đang có lịch hẹn hoặc ca khám chưa hoàn tất'


class PetProfileE2E(unittest.TestCase):
    def test_delete_conflict_keeps_dialog_and_confirmation(self):
        writes = []
        pet = {'_id': PET, 'name': 'Milo QA', 'code': 'PET-42', 'status': 'Active'}
        with sync_playwright() as pw, pw.chromium.launch() as browser:
            context = browser.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block')
            context.add_init_script(f"localStorage.setItem('user-info', JSON.stringify({json.dumps(OWNER)}));"
                                    "localStorage.setItem('token', 'fixture-token');"
                                    "sessionStorage.setItem('hasLoadedBefore', 'true');")

            def route(r):
                req = r.request
                url = urlsplit(req.url)
                if f'{url.scheme}://{url.netloc}' != BASE:
                    return r.abort()
                path = url.path
                if path == f'/api/pets/{PET}':
                    if req.method == 'DELETE':
                        writes.append((req.method, path))
                        return r.fulfill(status=409, json={'message': CONFLICT})
                    return r.fulfill(json={'pet': pet})
                if path == f'/api/medical-records/pet/{PET}':
                    return r.fulfill(json={'pet': pet, 'records': []})
                if path in ('/api/users/me', '/api/auth/me', '/api/users/profile'):
                    return r.fulfill(json={'data': OWNER, 'user': OWNER})
                if path.startswith('/api/') or req.method not in ('GET', 'HEAD'):
                    return r.abort()
                return r.continue_()

            context.route('**/*', route)
            page = context.new_page()
            page.goto(f'{BASE}/pets/{PET}')
            page.get_by_role('button', name=re.compile(r'(?:^| )Xóa$')).click()
            dialog = page.get_by_role('dialog', name='Xóa thú cưng')
            confirm = dialog.get_by_label('Tên thú cưng cần xóa')
            confirm.fill('Milo QA')
            dialog.get_by_role('button', name=re.compile(r'Xóa thú cưng$')).click()
            expect(dialog.get_by_text(CONFLICT, exact=True)).to_be_visible()
            expect(dialog.get_by_text('Hãy kiểm tra mục Lịch hẹn', exact=False)).to_be_visible()
            expect(confirm).to_have_value('Milo QA')
            expect(page).to_have_url(f'{BASE}/pets/{PET}')
            expect(page.locator('[data-sonner-toast][data-type=success]')).to_have_count(0)
            self.assertEqual(writes, [('DELETE', f'/api/pets/{PET}')])


if __name__ == '__main__':
    unittest.main(verbosity=2)
