"""Invoice feedback browser regression tests against localhost:3000 only.

Run: python -B tests/verify_invoice_feedback.py
All fetch/XHR/API requests are fulfilled locally; unexpected APIs fail closed.
Only same-origin document/static GETs reach the FE. No real BE calls or writes,
external navigation, extra fixture files, or live payment links are used.
The two requested screenshots are generated in tests/screenshots/.
ROUTER.MY_INVOICES is /invoices (not /my-invoices).
"""
import copy
import json
import re
import unittest
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = 'http://localhost:3000'
ROOT = Path(__file__).resolve().parents[1]
FIXED = datetime(2026, 11, 24, 18, 30, tzinfo=timezone.utc)  # Nov 25 in Vietnam
RANGES = {'Ngày': ('2026-11-25', '2026-11-25'),
          'Tuần': ('2026-11-23', '2026-11-29'),
          'Tháng': ('2026-11-01', '2026-11-30')}
OWNER = {'_id': '000000000000000000000071', 'fullName': 'Trần Ngọc Mai',
         'phone': '0901234567', 'role': 'PetOwner', 'status': 'Active',
         'isEmailVerified': True}
PETS = [{'_id': '000000000000000000000081', 'code': 'PET-MAY', 'name': 'Mây',
         'ownerId': OWNER['_id'], 'species': 'Cat', 'status': 'Active'},
        {'_id': '000000000000000000000082', 'code': 'PET-BONG', 'name': 'Bông',
         'ownerId': OWNER['_id'], 'species': 'Dog', 'status': 'Active'}]


def invoice(index, date='2026-11-25', status='Unpaid', method=None):
    return {'_id': f'{index:024x}', 'code': f'INV-MAI{index:03}',
            'orderId': {'_id': f'{100 + index:024x}', 'code': f'APT-MAI{index:03}',
                        'petId': PETS[index % 2], 'ownerId': OWNER},
            'items': [{'_id': f'{200 + index:024x}', 'type': 'Service',
                       'itemNameSnapshot': 'Khám sức khỏe cho bé',
                       'unitPriceSnapshot': 20000, 'quantity': 1, 'subtotal': 20000}],
            'totalAmount': 20000, 'paymentMethod': method, 'paymentStatus': status,
            'issuedAt': date + 'T03:00:00Z', 'createdAt': date + 'T03:00:00Z'}


class InvoiceFeedbackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.api_total = cls.write_total = 0
        cls.pw = sync_playwright().start()
        cls.addClassCleanup(cls.pw.stop)
        cls.browser = cls.pw.chromium.launch()
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.requests, self.unexpected, self.errors, self.external = [], [], [], []
        self.bills = [invoice(i) for i in range(1, 13)] + [
            invoice(20, '2026-11-23', 'Paid', 'PayOS'),
            invoice(21, '2026-11-10', 'Paid', 'VNPay'),
            invoice(22, '2026-10-31', 'Paid', 'Cash')]
        self.qr_status = 'PENDING'
        self.qr_creations = 0
        self.ctx = self.browser.new_context(viewport={'width': 1500, 'height': 1100},
                                            timezone_id=('America/Los_Angeles'
                                                if 'day_week_month' in self._testMethodName
                                                else 'Asia/Ho_Chi_Minh'),
                                            service_workers='block')
        self.addCleanup(self.ctx.close)
        self.ctx.route('**/*', self.guard)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(8000)
        self.page.clock.install(time=FIXED)
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.unexpected, [], 'Unmatched API requests were blocked')
        self.assertEqual(self.errors, [], 'Browser runtime errors')
        self.assertFalse(any('/vnpay-url' in r['path'] for r in self.requests))
        writes = [r for r in self.requests if r['method'] not in ('GET', 'HEAD', 'OPTIONS')]
        self.assertTrue(all(r['path'].endswith(('/payos-url', '/pay-cash')) for r in writes))
        self.__class__.api_total += len(self.requests)
        self.__class__.write_total += len(writes)
        print(f'  Isolation: {len(self.requests)} API requests locally fulfilled; '
              f'{len(writes)} simulated writes; {len(self.external)} external resources blocked', flush=True)

    def guard(self, route):
        req = route.request
        parsed = urlsplit(req.url)
        is_api = parsed.path.startswith('/api/') or req.resource_type in ('fetch', 'xhr')
        if is_api:
            entry = {'path': parsed.path, 'method': req.method,
                     'query': {k: v[-1] for k, v in parse_qs(parsed.query).items()}}
            self.requests.append(entry)
            # All API-like traffic is intercepted, including localhost:9999.
            if parsed.hostname != 'localhost' or not parsed.path.startswith('/api/'):
                self.unexpected.append(entry)
                return route.fulfill(status=501, json={'message': 'API ngoài dữ liệu kiểm thử'})
            if req.method == 'OPTIONS':
                return route.fulfill(status=204)
            return self.api(route, entry)
        if req.url.startswith(BASE + '/') and req.method in ('GET', 'HEAD'):
            return route.continue_()
        self.external.append((req.method, req.url))
        return route.abort()

    def api(self, route, req):
        path, method, query = req['path'], req['method'], req['query']
        if method == 'GET' and path in ('/api/auth/me', '/api/users/me'):
            return route.fulfill(json={'user': self.user, 'data': self.user})
        if method == 'GET' and path == '/api/pets':
            return route.fulfill(json={'items': PETS, 'total': 2, 'page': 1, 'limit': 100, 'totalPages': 1})
        if method == 'GET' and path.startswith('/api/pets/'):
            pet = next((pet for pet in PETS if path.endswith(pet['_id'])), None)
            if pet:
                return route.fulfill(json={'pet': pet, 'appointmentNotes': []})
        if method == 'GET' and path == '/api/reports/front-desk':
            return route.fulfill(json={'todayCounters': {'waitingForPickup': 0},
                                      'periodStats': {'invoices': {'issuedCount': 12, 'paidCount': 0,
                                                                   'totalCollected': 0}}})
        if method == 'GET' and path == '/api/appointment-orders':
            return route.fulfill(json={'data': [], 'pagination': {'total': 0, 'page': 1,
                                                                  'limit': 10, 'totalPages': 0}})
        if method == 'GET' and path == '/api/products':
            return route.fulfill(json={'success': True, 'data': {'items': [], 'total': 0}})
        if method == 'GET' and path in ('/api/invoices', '/api/invoices/me'):
            rows = copy.deepcopy(self.bills)
            for key in ('paymentStatus', 'paymentMethod', 'code'):
                if key in query:
                    rows = [row for row in rows if row[key] == query[key]]
            for key, predicate in [('from', lambda day, bound: day >= bound),
                                   ('to', lambda day, bound: day <= bound)]:
                if key in query:
                    rows = [row for row in rows if predicate(row['issuedAt'][:10], query[key])]
            # /me intentionally ignores petId, as documented in InvoiceService.
            limit, page = int(query.get('limit', 10)), int(query.get('page', 1))
            total = len(rows)
            rows = rows[(page - 1) * limit:page * limit]
            return route.fulfill(json={'items': rows, 'pagination': {'total': total, 'page': page,
                                          'limit': limit, 'totalPages': (total + limit - 1) // limit}})
        match = re.fullmatch(r'/api/invoices/([a-f0-9]{24})(?:/(payos-url|payos-status|pay-cash))?', path)
        if match:
            bill = next((row for row in self.bills if row['_id'] == match[1]), None)
            action = match[2]
            if bill and method == 'GET' and action is None:
                return route.fulfill(json={'data': bill})
            if bill and method == 'POST' and action == 'payos-url':
                self.qr_creations += 1
                bill.update(payosOrderCode=1764009000000 + self.qr_creations,
                            payosPaymentLinkId=f'maiqr{self.qr_creations}')
                payment = {'invoiceId': bill['_id'], 'invoiceCode': bill['code'],
                           'orderCode': bill['payosOrderCode'], 'paymentLinkId': bill['payosPaymentLinkId'],
                           'amount': bill['totalAmount'], 'qrCode': f'MAI-FICTIONAL-QR-{self.qr_creations}',
                           'checkoutUrl': 'https://pay.payos.vn/web/maifixture',
                           'paymentUrl': 'https://pay.payos.vn/web/maifixture',
                           'accountName': 'TRAN NGOC MAI', 'accountNumber': '000123456',
                           'bin': '970422', 'expiresAt': '2026-11-24T18:45:00Z'}
                return route.fulfill(json={'message': 'Đã tạo mã QR mô phỏng', 'data': payment})
            if bill and method == 'GET' and action == 'payos-status':
                if self.qr_status == 'PAID':
                    bill.update(paymentStatus='Paid', paymentMethod='PayOS', paidAt=FIXED.isoformat())
                return route.fulfill(json={'data': bill, 'payosStatus': self.qr_status})
            if bill and method == 'PATCH' and action == 'pay-cash':
                req['body'] = route.request.post_data_json
                cash = req['body']['cashReceived']
                bill.update(paymentStatus='Paid', paymentMethod='Cash', paidAt=FIXED.isoformat())
                return route.fulfill(json={'message': 'Thanh toán thành công', 'data': bill,
                                          'cashReceived': cash, 'changeAmount': cash - bill['totalAmount']})
        self.unexpected.append(req)
        return route.fulfill(status=501, json={'message': 'Thiếu dữ liệu kiểm thử'})

    def open_page(self, role='PetOwner'):
        self.user = {**OWNER, 'role': role,
                     'fullName': 'Lê Hoàng Yến' if role == 'Receptionist' else OWNER['fullName']}
        self.ctx.add_init_script(
            f"localStorage.setItem('user-info', {json.dumps(json.dumps(self.user))});"
            "localStorage.setItem('token', 'invoice-fictional-token');"
            "sessionStorage.setItem('hasLoadedBefore', 'true');")
        path = '/invoices' if role == 'PetOwner' else '/clinic/invoices'
        self.page.goto(BASE + path)
        expect(self.page).to_have_url(BASE + path)
        if role == 'PetOwner':
            expect(self.page.get_by_role('heading', name='Hóa đơn của tôi', exact=True)).to_be_visible()
        else:
            self.page.get_by_role('tab', name='Hóa đơn đã lập').click()
        expect(self.page.locator('.ant-segmented-item-selected:visible')).to_have_text('Ngày')
        self.assert_query(*RANGES['Ngày'])

    def list_queries(self):
        endpoint = '/api/invoices/me' if self.user['role'] == 'PetOwner' else '/api/invoices'
        return [r['query'] for r in self.requests if r['path'] == endpoint and
                r['method'] == 'GET' and r['query'].get('limit') in ('10', '100') and
                ('from' in r['query'] or r['query'].get('page') is not None)]

    def latest_query(self):
        return self.list_queries()[-1]

    def assert_query(self, start=None, end=None, **filters):
        # A browser condition drains pending network events; assertions inspect actual requests.
        expect(self.page.locator('.ant-spin-spinning')).to_have_count(0)
        query = self.latest_query()
        for key, value in {'from': start, 'to': end, **filters}.items():
            if value is None:
                self.assertNotIn(key, query)
            else:
                self.assertEqual(query.get(key), str(value), (key, query))
        return query

    def choose(self, label, option):
        select = self.page.locator('.ant-select').filter(
            has=self.page.get_by_role('combobox', name=label, exact=True))
        select.locator('.ant-select-selector').click()
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option-content').get_by_text(
            option, exact=True).click()
        expect(self.page.locator('.ant-spin-spinning')).to_have_count(0)

    def periods_and_pagination(self, role):
        self.open_page(role)
        # The browser is still Nov 24 in Los Angeles; business dates must use Vietnam's Nov 25.
        self.assertEqual(self.page.evaluate('new Date().getDate()'), 24)
        self.assert_query(*RANGES['Ngày'], page=1, limit=10)
        self.assertEqual(self.page.locator('input[placeholder="Từ ngày"]:visible').input_value(), '25/11/2026')
        self.assertEqual(self.page.locator('input[placeholder="Đến ngày"]:visible').input_value(), '25/11/2026')
        self.page.locator('.ant-pagination-item-2').click()
        self.assert_query(*RANGES['Ngày'], page=2)
        for label in ('Tuần', 'Tháng', 'Ngày'):
            self.page.locator('.ant-segmented:visible').get_by_text(label, exact=True).click()
            expect(self.page.locator('.ant-segmented-item-selected:visible')).to_have_text(label)
            self.assert_query(*RANGES[label], page=1)
            start, end = RANGES[label]
            self.assertEqual(self.page.locator('input[placeholder="Từ ngày"]:visible').input_value(),
                             datetime.fromisoformat(start).strftime('%d/%m/%Y'))
            self.assertEqual(self.page.locator('input[placeholder="Đến ngày"]:visible').input_value(),
                             datetime.fromisoformat(end).strftime('%d/%m/%Y'))

    def custom_and_clear(self, role):
        self.open_page(role)
        self.page.locator('.ant-segmented:visible').get_by_text('Tháng', exact=True).click()
        self.assert_query(*RANGES['Tháng'])
        start, end = self.page.locator('input[placeholder="Từ ngày"]:visible'), self.page.locator('input[placeholder="Đến ngày"]:visible')
        start.fill('10/11/2026')
        start.press('Tab')
        end.fill('12/11/2026')
        end.press('Enter')
        expect(self.page.locator('.ant-segmented-item-selected:visible')).to_have_text('Tùy chọn')
        self.assert_query('2026-11-10', '2026-11-12', page=1)
        self.page.locator('.ant-picker-range:visible').hover()
        self.page.locator('.ant-picker-clear:visible').click()
        expect(start).to_have_value('')
        expect(end).to_have_value('')
        self.assert_query(page=1)

    def checkout(self, zero=False):
        if zero:
            self.bills[0]['totalAmount'] = 0
            self.bills[0]['items'] = []
        self.open_page('Receptionist')
        self.page.get_by_role('row').filter(has_text='INV-MAI001').get_by_role('button', name='Thu tiền').click()
        dialog = self.page.get_by_role('dialog')
        expect(dialog.get_by_role('radio', name='Tiền mặt', exact=True)).to_be_checked()
        return dialog

    def create_qr(self, dialog):
        dialog.get_by_text('Thanh toán QR', exact=True).click()
        dialog.get_by_role('button', name=re.compile(r'Tạo mã QR$')).click()
        expect(dialog.locator('.ant-qrcode')).to_be_visible()
        self.assertEqual(self.qr_creations, 1)
        return dialog.locator('.ant-qrcode')

    def save_screenshot(self, filename):
        self.assertIn(filename, ('feedback-25-invoices.png', 'feedback-25-checkout.png'))
        directory = ROOT / 'tests/screenshots'
        directory.mkdir(exist_ok=True)
        self.page.set_viewport_size({'width': 1500, 'height': 1500})
        self.page.screenshot(path=str(directory / filename), full_page=True)

    @classmethod
    def tearDownClass(cls):
        print(f'\nTOTAL ISOLATION: {cls.api_total} locally fulfilled API requests; '
              f'{cls.write_total} simulated writes; zero real BE calls/writes.', flush=True)

    def test_01_owner_route_is_exact_router_constant(self):
        router = (ROOT / 'src/routerMap/ROUTER.ts').read_text(encoding='utf-8')
        self.assertRegex(router, r"MY_INVOICES:\s*'/invoices'")
        self.open_page()
        self.assertNotEqual(urlsplit(self.page.url).path, '/my-invoices')

    def test_02_owner_vietnam_day_week_month_queries_and_page_reset(self):
        self.periods_and_pagination('PetOwner')

    def test_03_reception_day_week_month_queries_and_page_reset(self):
        self.periods_and_pagination('Receptionist')

    def test_04_owner_pet_and_status_filters_keep_date_range(self):
        self.open_page()
        self.page.locator('.ant-segmented:visible').get_by_text('Tháng', exact=True).click()
        self.choose('Trạng thái', 'Đã thanh toán')
        self.assert_query(*RANGES['Tháng'], paymentStatus='Paid', page=1)
        self.choose('Thú cưng', 'Mây')
        self.assert_query(*RANGES['Tháng'], paymentStatus='Paid', petId=PETS[0]['_id'], page=1, limit=100)
        expect(self.page.get_by_role('row').filter(has_text='INV-MAI020')).to_be_visible()
        expect(self.page.get_by_role('row').filter(has_text='INV-MAI021')).to_have_count(0)
        self.save_screenshot('feedback-25-invoices.png')

    def test_05_reception_status_method_and_code_query_preserves_legacy_filter(self):
        self.open_page('Receptionist')
        self.page.locator('.ant-segmented:visible').get_by_text('Tháng', exact=True).click()
        self.choose('Trạng thái', 'Đã thanh toán')
        self.choose('Phương thức', 'Thanh toán QR')
        self.assert_query(*RANGES['Tháng'], paymentStatus='Paid', paymentMethod='PayOS', page=1)
        expect(self.page.get_by_role('row').filter(has_text='INV-MAI020')).to_be_visible()
        self.choose('Phương thức', 'VNPay')
        self.assert_query(*RANGES['Tháng'], paymentMethod='VNPay')
        expect(self.page.get_by_role('row').filter(has_text='INV-MAI021')).to_be_visible()
        field = self.page.get_by_role('searchbox', name='Số hóa đơn', exact=True)
        field.fill(' inv-mai021 ')
        field.press('Enter')
        self.assert_query(*RANGES['Tháng'], code='INV-MAI021', paymentStatus='Paid', paymentMethod='VNPay', page=1)

    def test_06_owner_custom_range_and_clear_omit_query_dates(self):
        self.custom_and_clear('PetOwner')

    def test_07_reception_custom_range_and_clear_omit_query_dates(self):
        self.custom_and_clear('Receptionist')

    def test_08_checkout_cash_qr_only_and_cash_safety(self):
        dialog = self.checkout()
        self.assertEqual(dialog.locator('.ant-segmented-item-label').all_text_contents(), ['Tiền mặt', 'Thanh toán QR'])
        self.assertNotRegex(dialog.inner_text(), r'VNPay|PayOS|VietQR')
        cash = dialog.get_by_role('spinbutton', name='Số tiền khách đưa')
        cash.fill('10000')
        cash.press('Tab')
        expect(dialog.get_by_role('button', name=re.compile(r'Xác nhận thanh toán$'))).to_be_disabled()
        cash.fill('30000')
        cash.press('Tab')
        expect(dialog.get_by_text('10.000 đ', exact=True)).to_be_visible()
        dialog.get_by_role('button', name=re.compile(r'Xác nhận thanh toán$')).click()
        self.assertFalse(any(r['method'] == 'PATCH' for r in self.requests))
        self.page.get_by_role('button', name='Xác nhận', exact=True).click()
        expect(dialog.get_by_text('Thanh toán thành công. Đơn đã hoàn tất.', exact=True)).to_be_visible()
        writes = [r for r in self.requests if r['path'].endswith('/pay-cash')]
        self.assertEqual(len(writes), 1)
        self.assertEqual(writes[0]['body'], {'cashReceived': 30000})
        self.assertEqual(self.qr_creations, 0)

    def test_09_qr_stays_mounted_polls_restores_and_recreation_confirms(self):
        dialog = self.checkout()
        qr = self.create_qr(dialog)
        self.save_screenshot('feedback-25-checkout.png')
        before = sum(r['path'].endswith('/payos-status') for r in self.requests)
        self.page.clock.run_for(6000)
        self.assertGreater(sum(r['path'].endswith('/payos-status') for r in self.requests), before)
        qr.evaluate("el => el.dataset.invoiceFeedbackSentinel = 'same-node'")
        snapshot = qr.locator('canvas').evaluate('el => el.toDataURL()')
        cache_key = 'vcmos.payos.' + self.bills[0]['_id']
        saved = self.page.evaluate('key => JSON.parse(localStorage.getItem(key))', cache_key)
        self.assertEqual(saved['qrCode'], 'MAI-FICTIONAL-QR-1')
        dialog.get_by_text('Tiền mặt', exact=True).click()
        expect(qr).to_have_count(1)
        expect(qr).to_be_hidden()
        before = sum(r['path'].endswith('/payos-status') for r in self.requests)
        self.page.clock.run_for(16000)
        self.assertGreater(sum(r['path'].endswith('/payos-status') for r in self.requests), before)
        dialog.get_by_text('Thanh toán QR', exact=True).click()
        expect(qr).to_be_visible()
        self.assertEqual(qr.get_attribute('data-invoice-feedback-sentinel'), 'same-node')
        self.assertEqual(qr.locator('canvas').evaluate('el => el.toDataURL()'), snapshot)
        self.assertEqual(self.qr_creations, 1)
        dialog.get_by_role('button', name='Đóng', exact=True).click()
        expect(dialog).to_have_count(0)
        self.page.get_by_role('row').filter(has_text='INV-MAI001').get_by_role('button', name='Thu tiền').click()
        expect(dialog.get_by_role('radio', name='Thanh toán QR', exact=True)).to_be_checked()
        expect(dialog.get_by_text('Đang hiện lại mã QR đã tạo lúc trước cho hóa đơn này.')).to_be_visible()
        self.assertEqual(self.qr_creations, 1)
        dialog.get_by_role('button', name=re.compile(r'Tạo mã mới$')).click()
        expect(self.page.get_by_text('Khách chưa chuyển khoản bằng mã hiện tại?', exact=True)).to_be_visible()
        self.assertEqual(self.qr_creations, 1)
        self.page.get_by_role('button', name='Không', exact=True).click()
        self.assertEqual(self.qr_creations, 1)
        dialog.get_by_role('button', name=re.compile(r'Tạo mã mới$')).click()
        self.page.locator('.ant-popconfirm:visible').get_by_role('button', name=re.compile(r'Tạo mã mới$')).click()
        expect(dialog.get_by_role('button', name=re.compile(r'Tạo mã mới$'))).to_be_enabled()
        self.assertEqual(self.qr_creations, 2)

    def test_10_zero_invoice_has_no_qr_creation(self):
        dialog = self.checkout(zero=True)
        dialog.get_by_text('Thanh toán QR', exact=True).click()
        expect(dialog.get_by_text('Hóa đơn 0 đ không thanh toán bằng mã QR. Hãy xác nhận ở mục Tiền mặt.')).to_be_visible()
        expect(dialog.get_by_role('button', name=re.compile(r'Tạo mã QR$'))).to_have_count(0)
        self.assertEqual(self.qr_creations, 0)
        dialog.get_by_text('Tiền mặt', exact=True).click()
        expect(dialog.get_by_role('button', name=re.compile(r'Xác nhận thanh toán$'))).to_be_enabled()

    def test_11_qr_paid_status_finishes_checkout_and_clears_cache(self):
        dialog = self.checkout()
        self.create_qr(dialog)
        self.qr_status = 'PAID'
        dialog.get_by_role('button', name=re.compile(r'Kiểm tra trạng thái$')).click()
        expect(dialog.get_by_text('Hóa đơn đã thanh toán', exact=True)).to_be_visible()
        expect(dialog.get_by_role('radio')).to_have_count(0)
        self.assertIsNone(self.page.evaluate('key => localStorage.getItem(key)',
                                            'vcmos.payos.' + self.bills[0]['_id']))
        expect(dialog.get_by_text('Thanh toán QR', exact=True)).to_be_visible()


if __name__ == '__main__':
    unittest.main(verbosity=2)
