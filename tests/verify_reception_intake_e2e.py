"""Standalone reception browser QA; loopback Vite only; all API traffic mocked."""
import asyncio
import json
import os
import re
import unittest
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright, expect

BASE = os.environ.get('VCMOS_QA_BASE', '').rstrip('/')
FLAG = os.environ.get('VCMOS_QA_INTAKE')
LOCAL_3000 = {'http://127.0.0.1:3000', 'http://127.0.0.2:3000', 'http://[::1]:3000'}
if (BASE not in LOCAL_3000 and not re.fullmatch(r'http://127\.0\.0\.1:31[0-9]{2}', BASE)) or FLAG not in ('off', 'on'):
    raise SystemExit('Set VCMOS_QA_BASE to the dedicated loopback Vite URL (:3000 or :31xx) and VCMOS_QA_INTAKE=on|off.')
ON = FLAG == 'on'
DAY, OTHER = '2026-11-12', '2026-11-13'
ORD, ORD2, CAGE, ASSIGN, SVC, CAT, REC, OWN, PET, VETA, VETB, GROOM = [f'{i:024x}' for i in range(101, 113)]
CODE, CODE2 = 'APT-QA0112', 'APT-QA0113'
T = '2026-11-11T17:00:01Z'
SYMPTOMS, CONDITION = 'Ho liên tục từ sáng (QA)', 'Tỉnh táo, vẫn ăn uống (QA)'
CAGE_OK, CAGE_ERR = 'QA: đã lưu phân chuồng', 'QA: chuồng vừa hết chỗ'
CHECK_OK, CHECK_ERR = 'QA: đã lưu check-in', 'QA: không thể lưu phiếu tiếp nhận'
STAFF_OK, STAFF_ERR = 'QA: đã chuyển người phụ trách', 'QA: bác sĩ không nhận được ca'
PAT_SYMPTOM = re.compile(r'triệu chứng', re.I)
PAT_CONDITION = re.compile(r'tình trạng ban đầu', re.I)
STAFF = [
    {'_id': VETA, 'fullName': 'Bác sĩ QA An', 'role': 'Veterinarian', 'status': 'Active', 'specialty': 'Nội khoa'},
    {'_id': VETB, 'fullName': 'Bác sĩ QA Bình', 'role': 'Veterinarian', 'status': 'Active', 'specialty': 'Hô hấp'},
    {'_id': GROOM, 'fullName': 'Groomer QA Chi', 'role': 'Groomer', 'status': 'Active', 'specialty': None},
]
USER = {'_id': REC, 'fullName': 'Lễ tân QA', 'role': 'Receptionist', 'status': 'Active', 'isEmailVerified': True, 'email': 'reception@example.test'}
CAGE_ITEM = {'_id': CAGE, 'label': 'QA-CAGE-A', 'size': 'M', 'status': 'Available', 'isIsolated': False}


def order(id_, code, day):
    return {'_id': id_, 'code': code, 'date': day, 'slotStart': '09:00', 'slotEnd': '09:30',
            'derivedStatus': 'Booked', 'isOnline': True, 'checkedInAt': None,
            'petId': {'_id': PET, 'name': 'Milo QA', 'species': 'Chó'},
            'ownerId': {'_id': OWN, 'fullName': 'Chủ nuôi QA', 'phone': '0990000000'}}


class ReceptionQA(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.orders = [order(ORD, CODE, DAY), order(ORD2, CODE2, OTHER)]
        self.item = {'_id': SVC, 'orderId': ORD, 'sequenceNo': 1, 'status': 'Waiting', 'queueNo': 1,
                     'serviceId': {'_id': CAT, 'name': 'Khám hô hấp QA', 'category': 'Examination'},
                     'assignedStaffId': dict(STAFF[0])}
        self.cage_assignment = None
        self.cage_status = 201
        self.check_status = 200
        self.check_returns_intake = True
        self.staff_status = 200
        self.cage_gate = None
        self.cage_seen = asyncio.Event()
        self.requests = {'cage': [], 'check': [], 'staff': [], 'list': []}
        self.unmatched = []
        self.external_api = []
        self.page_errors = []
        self.navs = 0
        pw = await async_playwright().start()
        self.addAsyncCleanup(pw.stop)
        browser = await pw.chromium.launch()
        self.addAsyncCleanup(browser.close)
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', service_workers='block')
        self.addAsyncCleanup(ctx.close)
        await ctx.route('**/*', self.route)
        await ctx.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(USER))});"
                                  "localStorage.setItem('token', 'fixture-token-no-real-credentials');"
                                  "sessionStorage.setItem('hasLoadedBefore', 'true');")
        self.page = await ctx.new_page()
        self.page.set_default_timeout(7000)
        self.page.on('framenavigated', self.nav)
        self.page.on('pageerror', lambda error: self.page_errors.append(str(error)))

    async def asyncTearDown(self):
        if self.cage_gate:
            self.cage_gate.set()
        self.assertEqual(self.external_api, [], 'External API requests blocked')
        self.assertEqual(self.unmatched, [], 'Fixture has no response for an app API request')
        self.assertEqual(self.page_errors, [], 'Uncaught browser exception')

    def nav(self, frame):
        if frame == self.page.main_frame:
            self.navs += 1

    async def route(self, route):
        req = route.request
        url = urlsplit(req.url)
        path, method = url.path, req.method
        same_origin = f'{url.scheme}://{url.netloc}' == BASE
        if not same_origin:
            if req.resource_type in ('xhr', 'fetch'):
                self.external_api.append(f'{method} {url.hostname}{path}')
            await route.abort()
            return
        if not path.startswith('/api/'):
            if method in ('GET', 'HEAD') and req.resource_type not in ('xhr', 'fetch'):
                await route.continue_()
            else:
                self.unmatched.append(f'{method} {path}')
                await route.abort()
            return
        q = parse_qs(url.query)
        status, data = 200, None
        if method == 'GET' and path == '/api/appointment-orders':
            self.requests['list'].append(q)
            rows = [o for o in self.orders if q.get('from', [''])[0] <= o['date'] <= q.get('to', ['9999'])[0]
                    and (not q.get('code') or o['code'] in q['code'])]
            data = {'data': rows, 'pagination': {'total': len(rows), 'page': 1, 'limit': 10, 'totalPages': 1}}
        elif method == 'GET' and path == '/api/appointment-services':
            data = {'data': [self.item] if q.get('orderId') == [ORD] else []}
        elif method == 'GET' and path == '/api/users/staff':
            data = {'items': [s for s in STAFF if (not q.get('role') or s['role'] in q['role'])], 'total': len(STAFF)}
        elif method == 'GET' and path in ('/api/users/me', '/api/users/profile'):
            data = {'user': USER, 'data': USER}
        elif method == 'GET' and path == '/api/cages':
            data = {'data': {'items': [CAGE_ITEM], 'total': 1}}
        elif method == 'GET' and path == '/api/cage-assignments':
            assignments = [self.cage_assignment] if self.cage_assignment and (not q.get('orderId') or ORD in q['orderId']) else []
            data = {'count': len(assignments), 'data': assignments}
        elif method == 'GET' and path.startswith('/api/cage-assignments/order/'):
            if self.cage_assignment and path.endswith('/' + ORD):
                data = {'data': self.cage_assignment}
            else:
                status, data = 404, {'message': 'QA: chưa phân chuồng'}
        elif method == 'POST' and path == '/api/cage-assignments':
            self.requests['cage'].append(req.post_data_json)
            self.cage_seen.set()
            if self.cage_gate:
                await self.cage_gate.wait()
            status = self.cage_status
            if status == 201 and req.post_data_json == {'orderId': ORD, 'cageId': CAGE}:
                self.cage_assignment = {'_id': ASSIGN, 'orderId': self.orders[0], 'cageId': CAGE_ITEM, 'assignedAt': T, 'releasedAt': None}
                data = {'message': CAGE_OK, 'data': self.cage_assignment}
            else:
                status, data = 409, {'message': CAGE_ERR}
        elif method == 'PATCH' and path == f'/api/appointment-orders/{ORD}/check-in':
            body = req.post_data_json
            self.requests['check'].append(body)
            status = self.check_status
            if status == 200 and (not ON or body == {'intake': {'symptoms': SYMPTOMS, 'initialCondition': CONDITION}}):
                self.orders[0].update(derivedStatus='CheckedIn', checkedInAt=T)
                if ON and self.check_returns_intake:
                    self.orders[0]['intake'] = body['intake']
                data = {'message': CHECK_OK, 'data': self.orders[0]}
            else:
                status, data = 400, {'message': CHECK_ERR}
        elif method == 'PATCH' and path == f'/api/appointment-services/{SVC}/assign-staff':
            body = req.post_data_json
            self.requests['staff'].append(body)
            status = self.staff_status
            if status == 200 and body == {'assignedStaffId': VETB}:
                self.item['assignedStaffId'] = dict(STAFF[1])
                data = {'message': STAFF_OK, 'data': self.item}
            else:
                status, data = 409, {'message': STAFF_ERR}
        else:
            self.unmatched.append(f'{method} {path}')
            status, data = 501, {'message': f'Unmatched fixture: {method} {path}'}
        await route.fulfill(status=status, json=data)

    async def open(self, second=1, hour=17, minute=0):
        await self.page.clock.set_fixed_time(datetime(2026, 11, 11, hour, minute, second, tzinfo=timezone.utc))
        await self.page.goto(f'{BASE}/clinic/appointments')
        await expect(self.page.get_by_text('Tiếp nhận lịch hẹn phòng khám', exact=True)).to_be_visible()

    def row(self, code=CODE):
        return self.page.get_by_role('row').filter(has_text=code)

    def toast(self, message):
        return self.page.get_by_text(message, exact=True)

    async def test_vietnam_midnight_before(self):
        self.orders[1]['date'] = '2026-11-11'
        await self.open(second=59, hour=16, minute=59)
        await expect(self.row(CODE2)).to_be_visible()
        await expect(self.row()).to_have_count(0)
        self.assertTrue(self.requests['list'])
        self.assertTrue(all(q.get('from') == ['2026-11-11'] and q.get('to') == ['2026-11-11'] for q in self.requests['list']))

    async def test_vietnam_today_change_and_clear(self):
        await self.open()
        await expect(self.row()).to_be_visible()
        await expect(self.row(CODE2)).to_have_count(0)
        self.assertTrue(all(q.get('from') == [DAY] and q.get('to') == [DAY] for q in self.requests['list']))
        field = self.page.get_by_placeholder('Ngày hẹn', exact=True)
        picker = self.page.locator('.ant-picker').filter(has=field)
        await expect(field).to_have_value(DAY)
        await field.fill(OTHER)
        await field.press('Enter')
        await expect(self.row(CODE2)).to_be_visible()
        await expect(self.row()).to_have_count(0)
        self.assertEqual(self.requests['list'][-1].get('from'), [OTHER])
        self.assertEqual(self.requests['list'][-1].get('to'), [OTHER])
        await picker.hover()
        await picker.locator('.ant-picker-clear').click()
        await expect(self.row()).to_be_visible()
        await expect(self.row(CODE2)).to_be_visible()
        self.assertNotIn('from', self.requests['list'][-1]); self.assertNotIn('to', self.requests['list'][-1])

    async def open_cage(self):
        self.orders[0].update(derivedStatus='CheckedIn', checkedInAt=T)
        await self.open()
        await self.row().get_by_role('button', name=re.compile(r'Phân chuồng$')).click()
        dialog = self.page.get_by_role('dialog', name=re.compile('Phân công chuồng'))
        await dialog.get_by_role('combobox').press('ArrowDown')
        await self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='QA-CAGE-A').click()
        return dialog.get_by_role('button', name='Xác nhận phân chuồng')

    async def test_cage_badge_only_after_success_without_reload(self):
        submit = await self.open_cage()
        badge = self.row().get_by_text('Đã phân chuồng', exact=True)
        await expect(badge).to_have_count(0)
        before = self.navs
        self.cage_gate = asyncio.Event()
        await submit.click()
        await asyncio.wait_for(self.cage_seen.wait(), timeout=7)
        await expect(badge).to_have_count(0)
        self.cage_gate.set()
        await expect(self.toast(CAGE_OK)).to_be_visible()
        await expect(badge).to_be_visible()
        await expect(self.row(CODE2).get_by_text('Đã phân chuồng', exact=True)).to_have_count(0)
        self.assertEqual(self.navs, before)
        self.assertEqual(self.requests['cage'], [{'orderId': ORD, 'cageId': CAGE}])
        await self.page.reload()
        await expect(badge).to_be_visible()

    async def test_cage_409_does_not_show_badge_or_success(self):
        self.cage_status = 409
        submit = await self.open_cage()
        before = self.navs
        await submit.click()
        await expect(self.toast(CAGE_ERR)).to_be_visible()
        await expect(self.row().get_by_text('Đã phân chuồng', exact=True)).to_have_count(0)
        await expect(self.toast(CAGE_OK)).to_have_count(0)
        self.assertEqual(self.navs, before)
        self.assertEqual(self.requests['cage'], [{'orderId': ORD, 'cageId': CAGE}])

    async def test_external_cage_release_refreshes_badge_on_focus(self):
        self.cage_assignment = {'_id': ASSIGN, 'orderId': self.orders[0], 'cageId': CAGE_ITEM,
                                'assignedAt': T, 'releasedAt': None}
        await self.open()
        badge = self.row().get_by_text('Đã phân chuồng', exact=True)
        await expect(badge).to_be_visible()
        before = self.navs
        self.cage_assignment = None  # Active-assignment API no longer returns the released cage.
        async with self.page.expect_response(
            lambda res: res.request.method == 'GET'
            and urlsplit(res.url).path == '/api/cage-assignments'
            and parse_qs(urlsplit(res.url).query).get('active') == ['true']
        ) as refresh:
            await self.page.evaluate("window.dispatchEvent(new Event('focus'))")
        self.assertEqual((await refresh.value).status, 200)
        await expect(badge).to_have_count(0)
        self.assertEqual(self.navs, before)
        self.assertEqual(self.requests['cage'], [])

    async def open_check(self):
        await self.open()
        await self.row().get_by_role('button', name=re.compile(r'Check-in$')).click()
        dialog = self.page.get_by_role('dialog', name=re.compile(r'(tiếp nhận|check-in)', re.I))
        return dialog, dialog.get_by_role('button', name='Xác nhận Check-in')

    async def fill_check(self, dialog, symptoms=SYMPTOMS, condition=CONDITION):
        await dialog.get_by_role('textbox', name=PAT_SYMPTOM).fill(symptoms)
        await dialog.get_by_role('textbox', name=PAT_CONDITION).fill(condition)

    async def test_check_in_mode_contract(self):
        dialog, submit = await self.open_check()
        if ON:
            await self.fill_check(dialog, '   ', CONDITION)
            if await submit.is_enabled():
                await submit.click()
            self.assertEqual(self.requests['check'], [])
            await expect(dialog).to_be_visible()
            await self.fill_check(dialog, SYMPTOMS, '   ')
            if await submit.is_enabled():
                await submit.click()
            self.assertEqual(self.requests['check'], [])
            await expect(dialog).to_be_visible()
            await self.fill_check(dialog, f'  {SYMPTOMS}  ', f'  {CONDITION}  ')
            wanted = {'intake': {'symptoms': SYMPTOMS, 'initialCondition': CONDITION}}
        else:
            await expect(dialog.get_by_role('textbox', name=PAT_SYMPTOM)).to_have_count(0)
            await expect(dialog.get_by_role('textbox', name=PAT_CONDITION)).to_have_count(0)
            wanted = None
        await submit.click()
        await expect(self.toast(CHECK_OK)).to_be_visible()
        await expect(self.row().get_by_text('Đã tiếp nhận', exact=True)).to_be_visible()
        self.assertEqual(self.requests['check'], [wanted])
        if ON:
            await self.page.reload()
            await self.row().get_by_role('button', name=re.compile(r'Chi tiết$')).click()
            details = self.page.get_by_role('dialog', name=re.compile('Chi tiết lịch hẹn'))
            await expect(details.get_by_text(SYMPTOMS, exact=True)).to_be_visible()
            await expect(details.get_by_text(CONDITION, exact=True)).to_be_visible()

    @unittest.skipUnless(ON, 'intake flag off')
    async def test_check_in_400_does_not_show_success(self):
        self.check_status = 400
        dialog, submit = await self.open_check()
        await self.fill_check(dialog)
        await submit.click()
        await expect(self.toast(CHECK_ERR)).to_be_visible()
        await expect(self.row().get_by_text('Đã đặt', exact=True)).to_be_visible()
        await expect(self.toast(CHECK_OK)).to_have_count(0)
        await expect(dialog.get_by_role('textbox', name=PAT_SYMPTOM)).to_have_value(SYMPTOMS)
        await expect(dialog.get_by_role('textbox', name=PAT_CONDITION)).to_have_value(CONDITION)

    @unittest.skipUnless(ON, 'intake flag off')
    async def test_legacy_200_with_no_intake_warns_and_refreshes_order(self):
        self.check_returns_intake = False
        dialog, submit = await self.open_check()
        await self.fill_check(dialog)
        before = len(self.requests['list'])
        async with self.page.expect_response(
            lambda res: res.request.method == 'GET' and urlsplit(res.url).path == '/api/appointment-orders'
        ) as refresh:
            await submit.click()
        self.assertEqual((await refresh.value).status, 200)
        self.assertGreater(len(self.requests['list']), before)
        await expect(self.row().get_by_text('Đã tiếp nhận', exact=True)).to_be_visible()
        warning = re.compile(r'không\s+(?:thể\s+)?xác nhận.{0,100}(?:lưu|phiếu)|chưa xác nhận.{0,100}(?:lưu|phiếu)', re.I)
        await expect(self.page.get_by_text(warning)).to_be_visible()
        await expect(self.toast(CHECK_OK)).to_have_count(0)
        await expect(self.page.locator('[data-sonner-toast][data-type="success"]')).to_have_count(0)
        self.assertEqual(self.requests['check'], [{'intake': {'symptoms': SYMPTOMS, 'initialCondition': CONDITION}}])
        self.assertNotIn('intake', self.orders[0])
        details = await self.open_details()
        await expect(details.get_by_text('Chưa có phiếu tiếp nhận đã lưu.', exact=True)).to_be_visible()
        await expect(details.get_by_text(SYMPTOMS, exact=True)).to_have_count(0)
        await expect(details.get_by_text(CONDITION, exact=True)).to_have_count(0)

    async def open_details(self):
        await self.row().get_by_role('button', name=re.compile(r'Chi tiết$')).click()
        return self.page.get_by_role('dialog', name=re.compile('Chi tiết lịch hẹn'))

    @unittest.skipUnless(ON, 'intake flag off')
    async def test_no_intake_blocks_medical_reassignment(self):
        self.orders[0].update(derivedStatus='CheckedIn', checkedInAt=T)
        await self.open()
        details = await self.open_details()
        await expect(details.get_by_text('Cần có phiếu tiếp nhận đã lưu để phân công hoặc chuyển ca khám.', exact=True)).to_be_visible()
        await expect(details.get_by_role('button', name='Đổi người phụ trách', exact=True)).to_have_count(0)
        self.assertEqual(self.requests['staff'], [])

    async def choose_staff(self):
        self.orders[0].update(derivedStatus='CheckedIn', checkedInAt=T)
        if ON:
            self.orders[0]['intake'] = {'symptoms': SYMPTOMS, 'initialCondition': CONDITION}
        await self.open()
        details = await self.open_details()
        await details.get_by_role('button', name=re.compile(r'Đổi người phụ trách|Chuyển ca')).click()
        specialist = details.get_by_role('combobox', name='Chuyên môn của ca khám')
        doctor = details.get_by_role('combobox', name='Bác sĩ phụ trách')
        options = self.page.locator('.ant-select-dropdown:visible .ant-select-item-option')
        if ON:
            await expect(doctor).to_be_disabled()
            await expect(details.get_by_role('button', name='Lưu', exact=True)).to_be_disabled()
            await specialist.press('ArrowDown')
            await expect(options.filter(has_text='Nội khoa')).to_be_visible()
            await options.filter(has_text='Hô hấp').click()
            await expect(doctor).to_be_enabled()
        else:
            await expect(specialist).to_have_count(0)
        await doctor.press('ArrowDown')
        choice = options.filter(has_text='Bác sĩ QA Bình')
        await expect(choice).to_be_visible()
        if ON:
            await expect(options.filter(has_text='Bác sĩ QA An')).to_have_count(0)
        else:
            await expect(options.filter(has_text='Bác sĩ QA An')).to_be_visible()
        await expect(options.filter(has_text='Groomer QA Chi')).to_have_count(0)
        await choice.click()
        await details.get_by_role('button', name=re.compile(r'^Lưu$|^Xác nhận chuyển')).click()
        return details

    async def test_staff_picker_and_success(self):
        details = await self.choose_staff()
        await expect(self.toast(STAFF_OK)).to_be_visible()
        await expect(details.get_by_text(re.compile('Bác sĩ QA Bình'))).to_be_visible()
        self.assertEqual(self.requests['staff'], [{'assignedStaffId': VETB}])

    @unittest.skipUnless(ON, 'intake flag off')
    async def test_staff_409_does_not_report_transfer(self):
        self.staff_status = 409
        details = await self.choose_staff()
        await expect(self.toast(STAFF_ERR)).to_be_visible()
        await expect(self.toast(STAFF_OK)).to_have_count(0)
        await expect(details.get_by_text(re.compile('Bác sĩ QA An'))).to_be_visible()
        self.assertEqual(self.requests['staff'], [{'assignedStaffId': VETB}])


if __name__ == '__main__':
    unittest.main(verbosity=2)
