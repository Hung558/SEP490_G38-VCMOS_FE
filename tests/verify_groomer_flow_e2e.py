"""Desktop Groomer E2E for BE contract 67445fb. No live API, DB or upload.

Start the integrated FE with VITE_API_ROOT=/api and a dedicated Vite listener
on 127.0.0.2:3000. Run: python tests/verify_groomer_flow_e2e.py
FE_BASE_URL may select a different dedicated loopback listener on port 3000.
"""
import base64
import json
import os
import re
import unittest
from datetime import datetime, timezone
from email import policy
from email.parser import BytesParser
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('FE_BASE_URL', 'http://127.0.0.2:3000').rstrip('/')
if BASE not in ('http://127.0.0.2:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000', 'http://localhost:3000'):
    raise SystemExit('FE_BASE_URL must be a dedicated loopback listener on port 3000.')
DAY = '2026-11-13'
NOW = f'{DAY}T02:30:00.000Z'
GROOMER, VET, OTHER, PET, APPT, SERVICE, CATALOG, OLD, RECORD = [f'{i:024x}' for i in range(700, 709)]
TOKEN = 'local-fixture-no-real-credentials'
ORDER_CODE = 'APT-GROOM-QA'
PFX = '/api/appointment-services'
QUEUE = '/clinic/my-queue'
VET_RECORD = f'/api/medical-records/service/{SERVICE}'
START, COMPLETE, NOTE = (f'{PFX}/{SERVICE}/{suffix}' for suffix in ('start', 'complete', 'grooming-note'))
HISTORY = f'{PFX}/my-grooming-notes'
PHOTO = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQaij4DwADzAIK3rKpugAAAABJRU5ErkJggg==')
PHOTO_HOST = 'https://grooming-fixture.invalid'
NOTE_OK = 'Tạo ghi chú chăm sóc thành công'
UPLOAD_ERR = 'Không thể tải ảnh lên, vui lòng thử lại sau'
NOTE_CONFLICT = 'Dịch vụ này đã có ghi chú chăm sóc'
COMPLETE_CONFLICT = 'Chỉ có thể hoàn thành dịch vụ đang thực hiện (InProgress), hiện tại: "Done"'
SOAP = {'subjectiveNote': 'Triệu chứng SOAP QA', 'objectiveNote': 'Kết quả SOAP QA',
        'assessment': 'Chẩn đoán SOAP QA', 'plan': 'Kế hoạch SOAP QA'}


def button(scope, name):
    return scope.get_by_role('button', name=re.compile(rf'(?:^| ){re.escape(name)}$'))


def capture_body(request):
    """Decode actual bytes and headers, not assumptions from input values."""
    raw = request.post_data_buffer
    content_type = request.headers.get('content-type', '')
    if not raw:
        return None, {}
    if content_type.startswith('application/json'):
        return json.loads(raw), {}
    if not content_type.startswith('multipart/form-data'):
        raise ValueError(f'Unexpected content-type: {content_type}')
    msg = BytesParser(policy=policy.default).parsebytes(
        f'MIME-Version: 1.0\r\nContent-Type: {content_type}\r\n\r\n'.encode('ascii') + raw
    )
    if not msg.is_multipart():
        raise ValueError('Missing multipart boundary or parts')
    fields, files = {}, {}
    for part in msg.iter_parts():
        key = part.get_param('name', header='content-disposition')
        if not key or key in fields or key in files:
            raise ValueError(f'Unnamed or duplicate part: {key!r}')
        blob = part.get_payload(decode=True)
        filename = part.get_filename()
        if filename:
            files[key] = (filename, part.get_content_type(), blob)
        else:
            fields[key] = blob.decode('utf-8')
    return fields, files


class GroomerFlowE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.addClassCleanup(cls.pw.stop)
        cls.browser = cls.pw.chromium.launch()
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 900},
                                            timezone_id='Asia/Ho_Chi_Minh', service_workers='block')
        self.addCleanup(self.ctx.close)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(9000)
        self.page.clock.set_fixed_time(datetime(2026, 11, 13, 2, 30, tzinfo=timezone.utc))
        self.ctx.route('**/*', self.route)
        self.role = 'Groomer'
        self.service_status = 'InProgress'
        self.order_status = 'InProgress'
        self.assigned = GROOMER
        self.pet = {'_id': PET, 'name': 'Milo QA', 'species': 'Chó', 'weight': 8}
        self.note = None
        self.note_responses = []
        self.complete_responses = []
        self.complete_order_status = 'WaitOwner'
        self.older_note = None
        self.requests = []
        self.writes = []
        self.unhandled = []
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [], 'Unmocked API or nonlocal request (blocked)')
        self.assertEqual(self.errors, [], 'Uncaught JS exception')

    def staff(self, uid=None):
        uid = uid or (VET if self.role == 'Veterinarian' else GROOMER)
        return {'_id': uid, 'fullName': f'{self.role} QA', 'email': 'grooming@example.test',
                'role': self.role, 'status': 'Active', 'isEmailVerified': True}

    def item(self, *, populated=True):
        order = {'_id': APPT, 'code': ORDER_CODE, 'date': DAY, 'petId': PET,
                 'derivedStatus': self.order_status, 'isOnline': True}
        return {'_id': SERVICE, 'orderId': order if populated else APPT,
                'serviceId': {'_id': CATALOG, 'name': 'Dịch vụ QA',
                              'category': 'Examination' if self.role == 'Veterinarian' else 'Grooming'},
                'assignedStaffId': self.staff(self.assigned), 'status': self.service_status,
                'sequenceNo': 1, 'queueNo': 2, 'groomingNote': self.note,
                'scheduledStart': '09:00', 'scheduledEnd': '09:30'}

    def record(self):
        return {'_id': RECORD, 'appointmentServiceId': SERVICE, 'petId': self.pet,
                'status': 'Draft', 'prescriptions': [], 'createdAt': NOW, **SOAP}

    def route(self, route):
        req = route.request
        url = urlsplit(req.url)
        path, method = url.path, req.method
        origin = f'{url.scheme}://{url.netloc}'
        api_request = path.startswith('/api/') or req.resource_type in ('fetch', 'xhr')
        if origin == PHOTO_HOST and method == 'GET' and req.resource_type == 'image':
            return route.fulfill(status=200, content_type='image/png', body=PHOTO)
        if origin != BASE or not path.startswith('/api/'):
            if origin == BASE and method in ('GET', 'HEAD') and not api_request:
                return route.continue_()
            if api_request or method not in ('GET', 'HEAD'):
                self.unhandled.append((method, origin, path))
            return route.abort()
        self.requests.append((method, path, url.query))
        status, data = 200, None
        if req.headers.get('authorization') != f'Bearer {TOKEN}':
            return route.fulfill(status=401, json={'message': 'Chưa đăng nhập'})
        if method == 'GET' and path == f'{PFX}/my-queue':
            data = {'data': [self.item()] if self.assigned == self.staff()['_id'] else []}
        elif method == 'GET' and path in ('/api/users/me', '/api/auth/me', '/api/users/profile'):
            data = {'user': self.staff(), 'data': self.staff()}
        elif method == 'GET' and path in (f'/api/pets/{PET}', f'/api/medical-records/pet/{PET}'):
            data = {'data': self.pet, 'pet': self.pet, 'records': []}
        elif method == 'GET' and path == '/api/products':
            data = {'data': {'items': []}}
        elif method == 'GET' and path == VET_RECORD:
            if self.service_status == 'Waiting':
                status, data = 404, {'message': 'Chưa có bệnh án'}
            else:
                data = self.record()
        elif method == 'POST' and path == f'{VET_RECORD}/start' and self.role == 'Veterinarian':
            self.writes.append((method, path, req.post_data_buffer, {}))
            self.service_status = self.order_status = 'InProgress'
            data = {'medicalRecord': self.record(), 'appointmentService': self.item(populated=False)}
        elif self.role != 'Groomer' and path in (START, COMPLETE, NOTE, HISTORY):
            self.unhandled.append((method, 'non-groomer invoked grooming endpoint', path))
            status, data = 403, {'message': 'Bạn không có quyền thực hiện chức năng này'}
        elif method == 'PATCH' and path == START:
            self.writes.append((method, path, req.post_data_buffer, {}))
            self.service_status = self.order_status = 'InProgress'
            data = {'message': 'Cập nhật trạng thái dịch vụ thành công', 'data': self.item(populated=False)}
        elif method == 'PATCH' and path == COMPLETE:
            self.writes.append((method, path, req.post_data_buffer, {}))
            if self.complete_responses:
                status, message, status_after_error = self.complete_responses.pop(0)
                self.service_status = status_after_error
                data = {'message': message}
            else:
                self.service_status, self.order_status = 'Done', self.complete_order_status
                data = {'message': 'Cập nhật trạng thái dịch vụ thành công', 'data': self.item(populated=False)}
        elif method == 'POST' and path == NOTE:
            fields, files = capture_body(req)
            self.writes.append((method, path, fields, files))
            if self.note_responses:
                status, message, note_after_error = self.note_responses.pop(0)
                self.note = note_after_error
                data = {'message': message}
            else:
                status = 201
                self.note = {**fields, 'createdAt': NOW}
                for name in files:
                    self.note[f'{name}Url'] = f'{PHOTO_HOST}/{name}.png'
                data = {'message': NOTE_OK, 'data': self.item()}
        elif method == 'GET' and path == NOTE:
            if self.note:
                data = {'message': 'Lấy ghi chú chăm sóc thành công', 'data': self.item()}
            else:
                status, data = 404, {'message': 'Dịch vụ này chưa có ghi chú chăm sóc'}
        elif method == 'GET' and path == HISTORY:
            data = {'data': [{**self.item(), 'assignedStaffId': self.assigned}] if self.note else []}
            if self.older_note:
                data['data'].append({**self.item(), '_id': OLD, 'groomingNote': self.older_note,
                                     'assignedStaffId': self.assigned,
                                     'orderId': {**self.item()['orderId'], 'code': 'APT-GROOM-OLDER'}})
        else:
            self.unhandled.append((method, origin, path))
            status, data = 501, {'message': f'Missing fixture: {method} {path}'}
        return route.fulfill(status=status, json=data)

    def open_queue(self, role='Groomer'):
        self.role = role
        if role == 'Veterinarian':
            self.assigned = VET
        user = json.dumps(self.staff(), ensure_ascii=False)
        self.ctx.add_init_script(f"localStorage.setItem('user-info', {json.dumps(user)});"
                                 f"localStorage.setItem('token', {json.dumps(TOKEN)});"
                                 "sessionStorage.setItem('hasLoadedBefore', 'true');")
        self.page.goto(f'{BASE}{QUEUE}')
        title = 'Hàng đợi khám của tôi' if role == 'Veterinarian' else 'Hàng đợi spa của tôi'
        expect(self.page.get_by_role('heading', name=title)).to_be_visible()

    def row(self):
        return self.page.get_by_role('row').filter(has_text=ORDER_CODE)

    def filter_rows(self, label):
        self.page.get_by_text(re.compile(rf'^{re.escape(label)} \(\d+\)$')).click()

    def open_note(self):
        button(self.row(), 'Tạo ghi chú spa').click()
        dialog = self.page.get_by_role('dialog').filter(has=button(self.page, 'Lưu ghi chú'))
        expect(dialog).to_be_visible()
        return dialog

    def set_photo(self, dialog, label, filename):
        payload = {'name': filename, 'mimeType': 'image/png', 'buffer': PHOTO}
        # Native labeled file inputs and custom upload buttons are both valid UI.
        inputs = dialog.get_by_label(label, exact=True).and_(dialog.locator('input[type=file]'))
        if inputs.count():
            inputs.set_input_files(payload)
        else:
            area = dialog.locator('.ant-form-item').filter(has_text=label).locator('input[type=file]')
            if area.count() == 1:
                area.set_input_files(payload)
            else:
                with self.page.expect_file_chooser() as chooser:
                    button(dialog, label).click()
                chooser.value.set_files(payload)

    def close_note(self):
        modal = self.page.get_by_role('dialog', name='Xem ghi chú spa')
        button(modal, 'Đóng').click()
        expect(modal).to_have_count(0)

    def complete(self):
        button(self.row(), 'Hoàn thành spa').click()

    def test_waiting_starts_via_existing_patch_and_completes_without_note(self):
        self.service_status, self.order_status = 'Waiting', 'CheckedIn'
        self.open_queue()
        expect(button(self.row(), 'Hoàn thành spa')).to_have_count(0)
        with self.page.expect_response(lambda r: r.request.method == 'PATCH' and urlsplit(r.url).path == START) as response:
            button(self.row(), 'Bắt đầu spa').click()
        self.assertEqual(response.value.status, 200)
        expect(self.row().get_by_text('Đang thực hiện', exact=True)).to_be_visible()
        expect(button(self.row(), 'Tạo ghi chú spa')).to_be_visible()
        self.assertEqual(self.writes, [('PATCH', START, None, {})])
        with self.page.expect_response(lambda r: r.request.method == 'PATCH' and urlsplit(r.url).path == COMPLETE) as response:
            self.complete()
        self.assertEqual(response.value.status, 200)
        self.filter_rows('Đã xong')
        expect(self.row().get_by_text('Hoàn tất', exact=True)).to_be_visible()
        expect(self.row().get_by_text(re.compile('Chờ chủ đón'))).to_be_visible()
        expect(button(self.row(), 'Tạo ghi chú spa')).to_be_visible()
        expect(button(self.row(), 'Hoàn thành spa')).to_have_count(0)
        self.assertEqual(self.writes, [('PATCH', START, None, {}), ('PATCH', COMPLETE, None, {})])

    def test_text_json_detail_and_history(self):
        self.older_note = {'afterNote': 'Nội dung lịch sử cũ QA', 'createdAt': '2026-11-12T02:30:00Z'}
        self.open_queue()
        dialog = self.open_note()
        dialog.get_by_label('Ghi chú trước khi spa', exact=True).fill('  Lông hơi rối  ')
        dialog.get_by_label('Ghi chú sau khi spa', exact=True).fill('Đã cắt tỉa')
        dialog.get_by_label('Khuyến nghị', exact=True).fill('  Chải lông mỗi ngày  ')
        with self.page.expect_response(lambda r: r.request.method == 'POST' and urlsplit(r.url).path == NOTE) as response:
            button(dialog, 'Lưu ghi chú').click()
        self.assertEqual(response.value.status, 201)
        self.assertTrue(response.value.request.headers['content-type'].startswith('application/json'))
        self.assertEqual(self.writes, [('POST', NOTE, {'beforeNote': 'Lông hơi rối',
            'afterNote': 'Đã cắt tỉa', 'recommendations': 'Chải lông mỗi ngày'}, {})])
        expect(self.page.get_by_text('Đã lưu ghi chú spa.', exact=True)).to_be_visible()
        expect(button(self.row(), 'Tạo ghi chú spa')).to_have_count(0)
        self.close_note()
        with self.page.expect_response(lambda r: r.request.method == 'GET' and urlsplit(r.url).path == NOTE):
            button(self.row(), 'Xem ghi chú spa').click()
        view = self.page.get_by_role('dialog')
        expect(view.get_by_text('Đã cắt tỉa', exact=True)).to_be_visible()
        expect(view.get_by_text('Chải lông mỗi ngày', exact=True)).to_be_visible()
        self.close_note()
        with self.page.expect_response(lambda r: r.request.method == 'GET' and urlsplit(r.url).path == HISTORY) as response:
            button(self.page, 'Lịch sử ghi chú spa').click()
        self.assertEqual(urlsplit(response.value.url).query, '')
        history = self.page.get_by_role('dialog', name='Lịch sử ghi chú spa')
        entries = history.locator('[aria-expanded]').filter(has_text='APT-GROOM-')
        expect(entries).to_have_count(2)
        expect(entries.nth(0)).to_contain_text(ORDER_CODE)
        expect(entries.nth(1)).to_contain_text('APT-GROOM-OLDER')
        entries.nth(1).click()
        expect(history.get_by_text(self.older_note['afterNote'], exact=True)).to_be_visible()

    def test_multipart_photos_from_done_with_upload_retry(self):
        self.service_status, self.order_status = 'Done', 'WaitOwner'
        self.note_responses.append((502, UPLOAD_ERR, None))
        self.open_queue()
        self.filter_rows('Đã xong')
        dialog = self.open_note()
        dialog.get_by_label('Ghi chú sau khi spa', exact=True).fill('Ảnh QA')
        self.set_photo(dialog, 'Ảnh trước', 'before.png')
        self.set_photo(dialog, 'Ảnh sau', 'after.png')
        for expected_status in (502, 201):
            with self.page.expect_response(lambda r: r.request.method == 'POST' and urlsplit(r.url).path == NOTE) as response:
                button(dialog, 'Lưu ghi chú').click()
            self.assertEqual(response.value.status, expected_status)
            self.assertIn('boundary=', response.value.request.headers['content-type'])
            if expected_status == 502:
                expect(self.page.get_by_text(UPLOAD_ERR, exact=True).first).to_be_visible()
                expect(dialog.get_by_label('Ghi chú sau khi spa', exact=True)).to_have_value('Ảnh QA')
                self.assertEqual(len(self.writes), 1, 'Upload must not retry automatically')
                expect(self.page.locator('[data-sonner-toast][data-type=success]')).to_have_count(0)
        wanted = ('POST', NOTE, {'afterNote': 'Ảnh QA'}, {'beforePhoto': ('before.png', 'image/png', PHOTO),
                                                        'afterPhoto': ('after.png', 'image/png', PHOTO)})
        self.assertEqual(self.writes, [wanted, wanted])
        self.close_note()
        with self.page.expect_response(lambda r: r.request.method == 'GET' and urlsplit(r.url).path == NOTE):
            button(self.row(), 'Xem ghi chú spa').click()
        for name in ('beforePhoto', 'afterPhoto'):
            image = self.page.get_by_role('dialog').locator(f'img[src="{PHOTO_HOST}/{name}.png"]')
            expect(image).to_be_visible()
            self.page.wait_for_function('(src) => [...document.images].some(img => img.src === src && img.naturalWidth > 0)', arg=f'{PHOTO_HOST}/{name}.png')

    def test_note_409_shows_server_note_without_duplicate_write(self):
        saved = {'afterNote': 'Ghi chú đã lưu từ nơi khác QA', 'createdAt': NOW}
        self.note_responses.append((409, NOTE_CONFLICT, saved))
        self.open_queue()
        dialog = self.open_note()
        dialog.get_by_label('Ghi chú sau khi spa', exact=True).fill('Bản nhập bị xung đột QA')
        button(dialog, 'Lưu ghi chú').click()
        existing = self.page.get_by_role('dialog', name='Xem ghi chú spa')
        expect(existing.get_by_text(re.compile(rf'^{re.escape(NOTE_CONFLICT)}'))).to_be_visible()
        expect(existing.get_by_text(saved['afterNote'], exact=True)).to_be_visible()
        expect(button(existing, 'Lưu ghi chú')).to_have_count(0)
        expect(self.page.locator('[data-sonner-toast][data-type=success]')).to_have_count(0)
        self.close_note()
        expect(button(self.row(), 'Xem ghi chú spa')).to_be_visible()
        self.assertEqual(len(self.writes), 1)

    def test_complete_409_reconciles_done_without_false_success(self):
        self.complete_responses.append((409, COMPLETE_CONFLICT, 'Done'))
        self.open_queue()
        self.complete()
        expect(self.page.get_by_text(COMPLETE_CONFLICT, exact=True).first).to_be_visible()
        expect(self.page.locator('[data-sonner-toast][data-type=success]')).to_have_count(0)
        self.filter_rows('Đã xong')
        expect(self.row().get_by_text('Hoàn tất', exact=True)).to_be_visible()
        expect(button(self.row(), 'Hoàn thành spa')).to_have_count(0)
        self.assertEqual(self.writes, [('PATCH', COMPLETE, None, {})])

    def test_guards_booked_and_non_assigned(self):
        self.service_status, self.order_status = 'Booked', 'Booked'
        self.open_queue()
        self.filter_rows('Tất cả')
        expect(self.row()).to_be_visible()
        for name in ('Bắt đầu spa', 'Hoàn thành spa', 'Tạo ghi chú spa'):
            expect(button(self.row(), name)).to_have_count(0)
        self.assigned = OTHER
        button(self.page, 'Làm mới').click()
        expect(self.row()).to_have_count(0)
        self.assertEqual(self.writes, [])
        self.page.goto(f'{BASE}/clinic/exam/{SERVICE}')
        expect(self.page).not_to_have_url(re.compile(r'/clinic/exam/'))
        self.assertFalse(any(path == VET_RECORD for _, path, _ in self.requests))

    def test_vet_still_starts_soap_without_groomer_controls(self):
        self.service_status, self.order_status = 'Waiting', 'CheckedIn'
        self.open_queue('Veterinarian')
        expect(button(self.page, 'Lịch sử ghi chú spa')).to_have_count(0)
        for name in ('Bắt đầu spa', 'Hoàn thành spa', 'Tạo ghi chú spa', 'Xem ghi chú spa'):
            expect(button(self.row(), name)).to_have_count(0)
        with self.page.expect_response(lambda r: r.request.method == 'POST' and urlsplit(r.url).path == f'{VET_RECORD}/start') as response:
            button(self.row(), 'Bắt đầu khám').click()
        self.assertEqual(response.value.status, 200)
        expect(self.page).to_have_url(f'{BASE}/clinic/exam/{SERVICE}')
        self.page.wait_for_function("value => [...document.querySelectorAll('textarea')].some(el => el.value === value)", arg=SOAP['assessment'])
        self.assertEqual(self.writes, [('POST', f'{VET_RECORD}/start', None, {})])


if __name__ == '__main__':
    unittest.main(verbosity=2)
