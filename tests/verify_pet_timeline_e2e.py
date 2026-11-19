"""Desktop Chromium E2E for BE #54 unified pet timeline; API is fixture-only.

Start the integrated FE with VITE_API_ROOT=/api on a dedicated loopback
listener at port 3000 using Vite --strictPort, then run this file with unittest.
"""
import asyncio
import json
import re
import unittest
import threading
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright
from playwright.sync_api import expect
from qa_web_fixtures import BASE, OWNER, PET, FOREIGN_PET, TOKEN, install_auth, install_network_guard, launch_browser

TIMELINE = f'/api/pets/{PET}/timeline'
TIMELINE_FOREIGN = f'/api/pets/{FOREIGN_PET}/timeline'
PET_PATH = f'/api/pets/{PET}'
SECOND_PET_PATH = f'/api/pets/{FOREIGN_PET}'
VET_ID = '000000000000000000000061'
ORDER = '000000000000000000000062'
STAY = '000000000000000000000063'
CODE = 'APT-TL-QA-62'
INVOICE_CODE = 'INV-TL-QA-63'
PET_INFO = {'_id': PET, 'code': 'PET-TL-55', 'name': 'Milo Timeline QA', 'species': 'Dog',
            'breed': 'Poodle', 'weight': 6.5, 'status': 'Active',
            'owner': {'_id': OWNER['_id'], 'fullName': OWNER['fullName']}}
INVOICE = {'_id': '000000000000000000000064', 'code': INVOICE_CODE, 'totalAmount': 123456,
           'paymentMethod': 'PayOS', 'paymentStatus': 'Paid', 'items': [
               {'_id': '000000000000000000000065', 'type': 'Service', 'refId': VET_ID,
                'itemNameSnapshot': 'Dịch vụ QA', 'unitPriceSnapshot': 123456, 'quantity': 1, 'subtotal': 123456}]}


def milestone(identifier, code, date, *, category='Examination', invoice=True, inpatient=False):
    stay = {'_id': STAY, 'orderId': ORDER, 'status': 'Admitted', 'initialDiagnosis': 'Chẩn đoán nội trú QA',
            'treatmentPlan': 'Kế hoạch điều trị QA', 'admittedAt': '2026-11-18T02:00:00.000Z',
            'dischargedAt': None, 'daysAdmitted': 2, 'attendingVet': {'_id': VET_ID, 'fullName': 'Bác sĩ Timeline QA'},
            'cage': {'_id': '000000000000000000000066', 'label': 'Ward-TL-QA'}, 'dailyLogsCount': 1,
            'dailyLogs': [{'_id': '000000000000000000000067', 'date': '2026-11-19',
                            'recordedBy': {'_id': VET_ID, 'fullName': 'Bác sĩ Timeline QA'},
                            'observations': 'Quan sát nội trú QA', 'notes': 'Ghi chú đợt chăm sóc QA'}],
            'invoice': dict(INVOICE)} if inpatient else None
    return {'id': identifier, 'orderId': identifier, 'code': code, 'date': date, 'slotStart': '09:00',
            'slotEnd': '09:30', 'isOnline': True, 'derivedStatus': 'Done', 'statusLabel': 'Hoàn tất',
            'checkedInAt': '2026-11-18T02:00:00.000Z', 'note': 'Ghi chú lịch hẹn QA', 'intake': None,
            'cancelReason': None, 'cancelledAt': None, 'categories': [category] + (['Inpatient'] if inpatient else []),
            'currentCage': None,
            'services': [{'_id': VET_ID, 'sequenceNo': 1, 'status': 'Done', 'isEmergency': False,
                          'service': {'_id': '000000000000000000000068', 'name': 'Khám tổng quát QA', 'category': category},
                          'assignedStaff': {'_id': VET_ID, 'fullName': 'Bác sĩ Timeline QA'},
                          'medicalRecord': {'_id': '000000000000000000000069', 'status': 'Finalized',
                                            'subjectiveNote': 'Triệu chứng SOAP QA', 'objectiveNote': 'Khám khách quan QA',
                                            'assessment': 'Đánh giá SOAP QA', 'plan': 'Phác đồ SOAP QA', 'notes': '',
                                            'prescriptions': [{'productId': VET_ID, 'productNameSnapshot': 'Thuốc QA',
                                                               'unitSnapshot': 'viên', 'dosage': '1 viên', 'frequency': 'mỗi ngày',
                                                               'durationDays': 3, 'instructions': 'Sau ăn'}]},
                          'groomingNote': {'beforeNote': 'Trước chăm sóc QA', 'afterNote': 'Sau chăm sóc QA',
                                           'recommendations': 'Khuyến nghị QA'},
                          'subtasks': [{'_id': '000000000000000000000070', 'taskType': 'Xét nghiệm QA',
                                         'instructions': 'Yêu cầu QA', 'resultText': 'Kết quả xét nghiệm QA',
                                         'status': 'Completed', 'service': None, 'assignedStaff': None,
                                         'requestedBy': None}]}],
            'inpatientRecord': stay, 'invoice': dict(INVOICE) if invoice else None,
            'canShareToCommunity': True, 'createdAt': '2026-11-18T01:00:00.000Z'}


def page_fixture(page=1, *, type_filter='All', rows=None):
    rows = rows if rows is not None else [milestone(ORDER, CODE, '2026-11-18', inpatient=True)]
    selected = [row for row in rows if type_filter == 'All' or type_filter in row['categories']]
    size = 20
    start = (page-1)*size
    return {'pet': PET_INFO, 'summary': {'totalVisits': 2, 'completedVisits': 1, 'activeVisits': 1,
            'totalMedicalRecords': 1, 'totalGroomingNotes': 1, 'totalInpatientStays': 1, 'hasActiveInpatient': True},
            'activeInpatient': next((row['inpatientRecord'] for row in rows if row['inpatientRecord']), None),
            'sharedPosts': [], 'timeline': selected[start:start+size],
            'pagination': {'page': page, 'limit': size, 'total': len(selected), 'totalPages': (len(selected) + size - 1) // size}}


class PetTimelineE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw, cls.browser = launch_browser()
        cls.addClassCleanup(cls.pw.stop)
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.role = 'PetOwner'
        self.timeline_requests, self.writes, self.unhandled, self.page_errors = [], [], [], []
        self.fail_next_timeline = False
        self.rows = [milestone(ORDER, CODE, '2026-11-18', inpatient=True)] + [
            milestone(f'{i:024x}', f'APT-TL-QA-{i}', f'2026-11-{(i % 18) + 1:02d}',
                      category='Grooming' if i == 72 else 'Examination', inpatient=False)
            for i in range(72, 92)
        ]
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='Asia/Ho_Chi_Minh', service_workers='block')
        self.addCleanup(self.ctx.close)
        install_auth(self.ctx)
        install_network_guard(self.ctx, self.route, self.unhandled)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(8000)
        self.page.on('pageerror', lambda err: self.page_errors.append(str(err)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [], 'Unmatched and cross-origin traffic was blocked')
        self.assertEqual(self.page_errors, [], 'Uncaught browser exceptions')

    def route(self, route, parsed):
        req, method, path = route.request, route.request.method, parsed.path
        if method not in ('GET', 'HEAD'):
            self.writes.append((method, path))
        if method == 'GET' and path in (PET_PATH, SECOND_PET_PATH):
            pet = dict(PET_INFO, _id=PET if path == PET_PATH else FOREIGN_PET,
                       name='Milo Timeline QA' if path == PET_PATH else 'Bông Timeline QA',
                       ownerId=OWNER['_id'], appointmentNotes=[])
            return route.fulfill(json={'pet': pet, 'appointmentNotes': []})
        if method == 'GET' and path.startswith('/api/inpatient-records/pets/') and path.endswith('/daily-logs'):
            if path == f'/api/inpatient-records/pets/{PET}/daily-logs' or self.role != 'PetOwner':
                return route.fulfill(json={'items': [], 'total': 0, 'page': 1, 'limit': 10, 'totalPages': 0})
            return route.fulfill(status=403, json={'message': 'Forbidden'})
        if method == 'GET' and path in (TIMELINE, TIMELINE_FOREIGN):
            query = parse_qs(parsed.query)
            self.timeline_requests.append((path, query, self.role))
            if self.fail_next_timeline:
                self.fail_next_timeline = False
                return route.fulfill(status=500, json={'message': 'fixture failure'})
            if self.role == 'PetOwner' and path == TIMELINE_FOREIGN:
                return route.fulfill(status=403, json={'message': 'Bạn không có quyền xem dòng thời gian của thú cưng này'})
            page = int(query.get('page', ['1'])[0])
            type_filter = query.get('type', ['All'])[0]
            result = page_fixture(page, type_filter=type_filter, rows=self.rows)
            return route.fulfill(json=result)
        self.unhandled.append((method, path, parsed.query))
        return route.fulfill(status=501, json={'message': f'Fixture thiếu {method} {path}'})

    def open_profile(self, pet_id=PET, role='PetOwner'):
        self.role = role
        if role != 'PetOwner':
            install_auth(self.ctx, role)
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith('/timeline')) as response:
            self.page.goto(f'{BASE}/pets/{pet_id}')
        self.assertEqual(response.value.status, 200)
        expect(self.page.get_by_text('Hành trình chăm sóc tổng hợp', exact=True)).to_be_visible()
        return self.page.get_by_role('region', name='Hành trình chăm sóc tổng hợp')

    def test_owner_sees_active_inpatient_history_soap_and_financials(self):
        self.rows[0]['derivedStatus'] = 'WaitOwner'
        panel = self.open_profile()
        expect(panel.get_by_text('Bé đã xong dịch vụ, mời bạn tới phòng khám đón bé.', exact=True)).to_have_count(0)
        expect(panel.get_by_text('Đang điều trị nội trú', exact=True)).to_be_visible()
        expect(panel.locator('.timeline-active-inpatient').get_by_text(re.compile('Chẩn đoán nội trú QA'))).to_be_visible()
        expect(panel.locator('.timeline-active-inpatient').get_by_text('Quan sát nội trú QA', exact=False)).to_be_visible()
        expect(panel.get_by_text(f'Hóa đơn {INVOICE_CODE}', exact=True).first).to_be_visible()
        expect(panel.get_by_text('123.456 ₫', exact=False).first).to_be_visible()
        expect(panel.get_by_text(CODE, exact=True)).to_be_visible()
        panel.get_by_text('Hồ sơ chi tiết · 1 thuốc', exact=True).first.click()
        expect(panel.get_by_text('Triệu chứng SOAP QA', exact=False)).to_be_visible()
        expect(panel.get_by_text('Thuốc QA', exact=True)).to_be_visible()
        expect(panel.get_by_text('Yêu cầu QA', exact=False)).to_be_visible()
        self.assertTrue(self.timeline_requests and self.timeline_requests[0][0] == TIMELINE)

    def test_vet_and_groomer_never_render_financials(self):
        for role in ('Veterinarian', 'Groomer'):
            with self.subTest(role=role):
                panel = self.open_profile(role=role)
                expect(panel.locator('.timeline-active-inpatient').get_by_text(re.compile('Chẩn đoán nội trú QA'))).to_be_visible()
                expect(panel.get_by_text(CODE, exact=True)).to_be_visible()
                expect(panel.get_by_text(f'Hóa đơn {INVOICE_CODE}', exact=True)).to_have_count(0)
                expect(panel.get_by_text('123.456 ₫', exact=False)).to_have_count(0)
                self.assertEqual(self.writes, [])

    def test_type_and_status_filters_send_server_query_and_reset_page(self):
        panel = self.open_profile()
        # 21 fixture milestones force a real second server page at BE's 20-item limit.
        pager = panel.locator('.ant-pagination-item-2')
        expect(pager).to_be_visible()
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith('/timeline')) as page_two:
            pager.click()
        self.assertEqual(parse_qs(urlsplit(page_two.value.url).query).get('page'), ['2'])
        # Select exposes the request's public category name while query sends backend enum.
        panel.get_by_role('combobox', name='Lọc loại mốc').press('ArrowDown')
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith('/timeline')):
            self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='Điều trị nội trú').click()
        self.assertEqual(self.timeline_requests[-1][1].get('type'), ['Inpatient'])
        self.assertEqual(self.timeline_requests[-1][1].get('page', ['1']), ['1'])
        panel.get_by_role('combobox', name='Lọc trạng thái').press('ArrowDown')
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith('/timeline')):
            self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='Hoàn tất').click()
        self.assertEqual(self.timeline_requests[-1][1].get('status'), ['Done'])
        self.assertEqual(self.timeline_requests[-1][1].get('limit'), ['20'])

    def test_error_retry_and_empty_filter_state(self):
        self.fail_next_timeline = True
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith('/timeline')) as first:
            self.page.goto(f'{BASE}/pets/{PET}')
        self.assertEqual(first.value.status, 500)
        expect(self.page.get_by_role('alert').get_by_text('Không tải được hành trình chăm sóc.')).to_be_visible()
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith('/timeline')) as retry:
            self.page.get_by_role('region', name='Hành trình chăm sóc tổng hợp').get_by_role('button', name='Thử lại').click()
        self.assertEqual(retry.value.status, 200)
        expect(self.page.get_by_text(CODE, exact=True)).to_be_visible()
        self.rows = []
        panel = self.page.get_by_role('region', name='Hành trình chăm sóc tổng hợp')
        panel.get_by_role('combobox', name='Lọc loại mốc').press('ArrowDown')
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='Tiêm phòng').click()
        expect(self.page.get_by_text('Không có mốc nào phù hợp bộ lọc.', exact=True)).to_be_visible()

    def test_refresh_clamps_page_after_result_shrinks(self):
        panel = self.open_profile()
        panel.locator('.ant-pagination-item-2').click()
        expect(panel.locator('.ant-pagination-item-active')).to_have_attribute('title', '2')
        self.rows = self.rows[:1]
        panel.get_by_role('button', name='Làm mới').click()
        expect(panel.get_by_text(CODE, exact=True)).to_be_visible()
        expect(panel.locator('.ant-pagination-item-active')).to_have_attribute('title', '1')
        self.assertEqual(self.timeline_requests[-1][1].get('page'), ['1'])

    def test_late_response_for_previous_pet_cannot_replace_new_pet_state(self):
        async def scenario():
            async with async_playwright() as pw:
                browser = await pw.chromium.launch()
                context = await browser.new_context(viewport={'width': 1440, 'height': 900},
                                                    timezone_id='Asia/Ho_Chi_Minh', service_workers='block')
                await context.add_init_script(
                    f"localStorage.setItem('user-info', {json.dumps(json.dumps(OWNER))});"
                    f"localStorage.setItem('token', {json.dumps(TOKEN)});"
                    "sessionStorage.setItem('hasLoadedBefore', 'true');"
                )
                seen, blocked = [], []
                first_started = asyncio.Event()
                release_first = asyncio.Event()
                first_completed = asyncio.Event()

                async def route(handler):
                    parsed = urlsplit(handler.request.url)
                    req, method, path = handler.request, handler.request.method, parsed.path
                    origin = f'{parsed.scheme}://{parsed.netloc}'
                    api_like = path.startswith('/api/') or req.resource_type in ('xhr', 'fetch')
                    if origin != BASE or not path.startswith('/api/'):
                        if origin == BASE and method in ('GET', 'HEAD') and not api_like:
                            return await handler.continue_()
                        if api_like or method not in ('GET', 'HEAD'):
                            blocked.append((method, origin, path))
                        return await handler.abort()
                    if await req.header_value('authorization') != f'Bearer {TOKEN}':
                        blocked.append((method, path, 'missing token'))
                        return await handler.fulfill(status=401, json={'message': 'Thiếu phiên QA'})
                    if method == 'GET' and path in (PET_PATH, SECOND_PET_PATH):
                        value = dict(PET_INFO, _id=PET if path == PET_PATH else FOREIGN_PET,
                                     name='Milo Timeline QA' if path == PET_PATH else 'Bông Timeline QA',
                                     ownerId=OWNER['_id'], appointmentNotes=[])
                        return await handler.fulfill(json={'pet': value, 'appointmentNotes': []})
                    if method == 'GET' and path in (TIMELINE, TIMELINE_FOREIGN):
                        seen.append(path)
                        if path == TIMELINE:
                            first_started.set()
                            await release_first.wait()
                            try:
                                await handler.fulfill(json=page_fixture(rows=self.rows))
                            finally:
                                first_completed.set()
                            return
                        return await handler.fulfill(status=403, json={'message': 'Bạn không có quyền xem dòng thời gian của thú cưng này'})
                    if method == 'GET' and path.startswith('/api/inpatient-records/pets/') and path.endswith('/daily-logs'):
                        return await handler.fulfill(json={'items': [], 'total': 0, 'page': 1, 'limit': 10, 'totalPages': 0})
                    blocked.append((method, path, parsed.query))
                    return await handler.fulfill(status=501, json={'message': 'Fixture chưa cho phép endpoint này'})

                await context.route('**/*', route)
                page = await context.new_page()
                page.set_default_timeout(8000)
                await page.goto(f'{BASE}/pets/{PET}', wait_until='domcontentloaded')
                await asyncio.wait_for(first_started.wait(), timeout=5)
                await page.evaluate("url => { history.pushState({}, '', url); dispatchEvent(new PopStateEvent('popstate')); }", f'/pets/{FOREIGN_PET}')
                await page.get_by_role('alert').get_by_text('Không tải được hành trình chăm sóc.').wait_for()
                release_first.set()
                await asyncio.wait_for(first_completed.wait(), timeout=5)
                await page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                assert await page.get_by_text(CODE, exact=True).count() == 0, 'stale pet timeline leaked after navigation'
                assert seen == [TIMELINE, TIMELINE_FOREIGN], seen
                assert blocked == [], blocked
                await context.close()
                await browser.close()

        failures = []
        def run():
            try:
                asyncio.run(scenario())
            except BaseException as exc:
                failures.append(exc)
        worker = threading.Thread(target=run, daemon=True)
        worker.start()
        worker.join(timeout=30)
        self.assertFalse(worker.is_alive(), 'async browser race test timed out')
        if failures:
            raise failures[0]

    def test_owner_foreign_pet_is_denied_without_leaking_previous_pet(self):
        self.open_profile()
        self.page.goto(f'{BASE}/pets/{FOREIGN_PET}')
        expect(self.page.get_by_role('alert').get_by_text('Không tải được hành trình chăm sóc.')).to_be_visible()
        expect(self.page.get_by_text(CODE, exact=True)).to_have_count(0)
        self.assertEqual(self.timeline_requests[-1][0], TIMELINE_FOREIGN)
        self.assertEqual(self.timeline_requests[-1][2], 'PetOwner')


if __name__ == '__main__':
    unittest.main(verbosity=2)
