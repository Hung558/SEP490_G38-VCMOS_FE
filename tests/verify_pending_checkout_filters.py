"""Pending checkout calendar filters, all APIs intercepted; no live BE writes.
Run: python -B tests/verify_pending_checkout_filters.py
"""
import json
import re
import unittest
from pathlib import Path
from playwright.sync_api import expect
from verify_invoice_feedback import InvoiceFeedbackTests, BASE, OWNER, PETS, RANGES, invoice


class PendingCheckoutTests(InvoiceFeedbackTests):
    def setUp(self):
        super().setUp()
        self.orders = [self.order(i, '2026-11-25') for i in range(1, 13)] + [
            self.order(20, '2026-11-23'), self.order(21, '2026-11-10'), self.order(22, '2026-10-31')]
        # Bills can be issued before the appointment day and must still be matched.
        self.bills = [invoice(1, '2026-11-10')]
        self.fail_orders = False

    def order(self, index, date):
        return {'_id': f'{100 + index:024x}', 'code': f'APT-MAI{index:03}',
                'date': date, 'petId': PETS[index % 2], 'ownerId': OWNER,
                'isOnline': True, 'derivedStatus': 'WaitOwner',
                'createdAt': date + 'T03:00:00Z', 'updatedAt': date + 'T03:00:00Z'}

    def api(self, route, req):
        if req['path'] == '/api/appointment-orders' and req['method'] == 'GET':
            if self.fail_orders:
                return route.fulfill(status=503, json={'message': 'Chưa tải được lịch hẹn'})
            q = req['query']
            rows = [o for o in self.orders if (not q.get('from') or o['date'] >= q['from'])
                    and (not q.get('to') or o['date'] <= q['to'])]
            page, limit, total = int(q.get('page', 1)), int(q.get('limit', 10)), len(rows)
            return route.fulfill(json={'data': rows[(page-1)*limit:page*limit],
                'pagination': {'page': page, 'limit': limit, 'total': total, 'totalPages': (total+limit-1)//limit}})
        return super().api(route, req)

    def pending(self, role='Receptionist'):
        self.user = {**OWNER, 'role': role}
        self.ctx.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(self.user))});localStorage.setItem('token', 'fictional-filter-token');sessionStorage.setItem('hasLoadedBefore','true');")
        self.page.goto(BASE + '/clinic/invoices')
        expect(self.page.get_by_role('tab', name='Chờ thanh toán')).to_have_attribute('aria-selected', 'true')
        expect(self.page.locator('.ant-spin-spinning')).to_have_count(0)

    def query(self, start=None, end=None, page=1):
        expect(self.page.locator('.ant-spin-spinning')).to_have_count(0)
        q = [r['query'] for r in self.requests if r['path'] == '/api/appointment-orders'][-1]
        self.assertEqual(q['status'], 'WaitOwner')
        self.assertEqual(q['page'], str(page))
        self.assertEqual(q['limit'], '10')
        for key, value in [('from', start), ('to', end)]:
            if value is None:
                self.assertNotIn(key, q)
            else:
                self.assertEqual(q[key], value)
        for r in self.requests:
            if r['path'] == '/api/invoices':
                self.assertNotIn('from', r['query'])
                self.assertNotIn('to', r['query'])
        self.assertFalse(any(r['method'] != 'GET' for r in self.requests))

    def test_pending_day_week_month_page_reset(self):
        self.pending()
        self.query(*RANGES['Ngày'])
        expect(self.page.get_by_role('row').filter(has_text='APT-MAI001')).to_contain_text('INV-MAI001')
        self.page.locator('.ant-pagination-item-2').click()
        self.query(*RANGES['Ngày'], page=2)
        for period in ['Tuần', 'Tháng', 'Ngày']:
            self.page.locator('.ant-segmented:visible').get_by_text(period, exact=True).click()
            self.query(*RANGES[period])
        self.page.locator('.ant-segmented:visible').get_by_text('Tháng', exact=True).click()
        self.query(*RANGES['Tháng'])
        folder = Path(__file__).parent / 'screenshots'
        folder.mkdir(exist_ok=True)
        self.page.screenshot(path=str(folder / 'feedback-25-pending-filters.png'), full_page=True)

    def test_pending_custom_clear_and_refresh(self):
        self.pending()
        start, end = self.page.get_by_placeholder('Từ ngày'), self.page.get_by_placeholder('Đến ngày')
        start.fill('10/11/2026'); start.press('Tab')
        end.fill('23/11/2026'); end.press('Enter')
        self.query('2026-11-10', '2026-11-23')
        expect(self.page.locator('.ant-segmented-item-selected')).to_have_text('Tùy chọn')
        self.page.get_by_role('button', name=re.compile('Làm mới$')).click()
        self.query('2026-11-10', '2026-11-23')
        self.page.locator('.ant-picker-range').hover()
        self.page.locator('.ant-picker-clear').click()
        self.query()
        self.page.locator('.ant-pagination-item-2').click()
        expect(self.page.get_by_role('row').filter(has_text='APT-MAI022')).to_be_visible()
        self.query(page=2)

    def test_pending_admin_can_filter_without_payment_permission(self):
        self.pending('Admin')
        self.query(*RANGES['Ngày'])
        expect(self.page.get_by_role('button', name='Thanh toán', exact=True)).to_have_count(0)
        expect(self.page.get_by_role('button', name=re.compile('Xem$'))).to_have_count(10)
        self.page.locator('.ant-segmented:visible').get_by_text('Tuần', exact=True).click()
        self.query(*RANGES['Tuần'])

    def test_pending_empty_range_and_error_retry(self):
        self.orders = []
        self.pending()
        expect(self.page.get_by_text('Không có ca chờ thanh toán trong khoảng ngày đã chọn.', exact=False)).to_be_visible()
        self.fail_orders = True
        self.page.get_by_role('button', name=re.compile('Làm mới$')).click()
        expect(self.page.get_by_text('Chưa tải được lịch hẹn', exact=True)).to_be_visible()
        self.fail_orders = False
        self.orders = [self.order(1, '2026-11-25')]
        self.page.get_by_role('button', name='Thử lại', exact=True).click()
        expect(self.page.get_by_role('row').filter(has_text='APT-MAI001')).to_be_visible()
        self.query(*RANGES['Ngày'])


if __name__ == '__main__':
    suite = unittest.TestSuite(PendingCheckoutTests(name) for name in dir(PendingCheckoutTests) if name.startswith('test_pending_'))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(not result.wasSuccessful())
