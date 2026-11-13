"""Desktop Playwright tests for BE #41's FE workflows, without a live API.

Start the matching FE checkout with VITE_API_ROOT=/api and Vite --strictPort
on a dedicated loopback address at port 3000. Run this file with Python.
Set FE_BASE_URL when using a different loopback listener than the default.
"""
import base64
import json
import os
import re
import unittest
from datetime import datetime, timezone
from email import policy
from email.parser import BytesParser
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('FE_BASE_URL', 'http://[::1]:3000').rstrip('/')
if BASE not in ('http://[::1]:3000', 'http://127.0.0.2:3000', 'http://127.0.0.1:3000'):
    raise SystemExit('FE_BASE_URL must be a dedicated loopback Vite listener on port 3000.')

DAY = '2026-11-13'
NOW = DAY + 'T02:30:00.000Z'
VET, GROOM, OTHER, PET, OWNER, ORDER, EXAM, CATALOG, PENDING, IMAGE_TASK, FOREIGN, MADE = (
    f'{i:024x}' for i in range(310, 322))
SUB = '/api/subtask-requests'
SUB_QUEUE = SUB + '/my-queue'
BY_EXAM = f'{SUB}/service/{EXAM}'
RECORD = f'/api/medical-records/service/{EXAM}'
QUEUE = '/clinic/my-queue'
TOKEN = 'subtask-qa-synthetic-token'
PHOTO_URL = 'https://subtask-result-fixture.invalid/result.png'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQaij4DwADzAIK3rKpugAAAABJRU5ErkJggg==')
UPLOAD_ERROR = 'Không thể tải ảnh kết quả lên, vui lòng thử lại sau'
START_CONFLICT = 'Chỉ có thể bắt đầu yêu cầu đang ở trạng thái Pending (QA)'
SOAP_CONFLICT = 'Không thể hoàn tất ca khám khi vẫn còn chỉ định cận lâm sàng (Sub-task) chưa hoàn thành'
TITLE, IMAGE_TITLE, VET_TITLE = 'Xét nghiệm sinh hóa QA', 'Ảnh siêu âm QA', 'Chỉ định giao riêng bác sĩ QA'
SOAP = {'subjectiveNote': 'Triệu chứng SOAP QA', 'objectiveNote': 'Kết quả SOAP QA',
        'assessment': 'Chẩn đoán SOAP QA', 'plan': 'Kế hoạch SOAP QA'}
PEOPLE = {
    'Veterinarian': {'_id': VET, 'fullName': 'Bác sĩ phụ trách QA', 'code': 'VET-QA', 'role': 'Veterinarian'},
    'Groomer': {'_id': GROOM, 'fullName': 'Groomer nhận việc QA', 'code': 'GROOM-QA', 'role': 'Groomer'},
    'Receptionist': {'_id': OTHER, 'fullName': 'Lễ tân QA', 'role': 'Receptionist'},
}
PET_DATA = {'_id': PET, 'name': 'Milo Cận lâm sàng QA', 'species': 'Chó', 'weight': 8}
ORDER_DATA = {'_id': ORDER, 'code': 'APT-SUBTASK-QA', 'date': DAY, 'derivedStatus': 'InProgress', 'petId': PET}
CATALOG_DATA = {'_id': CATALOG, 'name': 'Khám tổng quát QA', 'category': 'Examination'}


def ctl(scope, label):
    return scope.get_by_role('button', name=re.compile(rf'(?:^| ){re.escape(label)}$'))


def decode(request):
    """Parse exact wire format and preserve uploaded bytes for assertions."""
    raw = request.post_data_buffer
    header = request.header_value('content-type') or ''
    media = header.split(';', 1)[0]
    if not raw:
        return media, None, {}
    if media == 'application/json':
        return media, json.loads(raw), {}
    if media != 'multipart/form-data':
        raise ValueError(f'Unexpected content type: {header}')
    mime = BytesParser(policy=policy.default).parsebytes(
        f'MIME-Version: 1.0\r\nContent-Type: {header}\r\n\r\n'.encode('ascii') + raw)
    if not mime.is_multipart():
        raise ValueError('Multipart upload has no valid boundary')
    fields, files = {}, {}
    for part in mime.iter_parts():
        key = part.get_param('name', header='content-disposition')
        if not key or key in fields or key in files:
            raise ValueError(f'Missing or duplicate multipart field: {key!r}')
        value = part.get_payload(decode=True)
        if part.get_filename():
            files[key] = (part.get_filename(), part.get_content_type(), value)
        else:
            fields[key] = value.decode('utf-8')
    return media, fields, files


class SubtaskRequestsE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.addClassCleanup(cls.pw.stop)
        cls.browser = cls.pw.chromium.launch()
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.role = 'Groomer'
        self.reads, self.writes, self.unhandled, self.page_errors = [], [], [], []
        self.start_conflict = self.upload_error = self.queue_error = False
        self.tasks = {task['_id']: task for task in (
            self.task(PENDING, TITLE, 'Pending'),
            self.task(IMAGE_TASK, IMAGE_TITLE, 'Pending'),
            self.task(FOREIGN, VET_TITLE, 'Pending', 'Veterinarian'),
        )}
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 900},
                                                timezone_id='Asia/Ho_Chi_Minh', service_workers='block')
        self.addCleanup(self.context.close)
        self.context.route('**/*', self.route)
        self.page = self.context.new_page()
        self.page.set_default_timeout(8000)
        self.page.clock.set_fixed_time(datetime(2026, 11, 13, 2, 30, tzinfo=timezone.utc))
        self.page.on('pageerror', lambda error: self.page_errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [], 'Fixture blocked unhandled API/network requests')
        self.assertEqual(self.page_errors, [], 'Uncaught browser exceptions')

    def exam(self):
        return {'_id': EXAM, 'orderId': ORDER_DATA, 'serviceId': CATALOG_DATA, 'status': 'InProgress',
                'assignedStaffId': PEOPLE['Veterinarian'], 'sequenceNo': 1, 'queueNo': 1}

    def task(self, identifier, title, status, assignee='Groomer', instructions='Hướng dẫn tổng quát QA'):
        return {'_id': identifier, 'appointmentServiceId': {**self.exam(), 'orderId': {
                    **ORDER_DATA, 'petId': PET_DATA, 'ownerId': {'_id': OWNER, 'fullName': 'Chủ nuôi QA'}}},
                'assignedStaffId': PEOPLE[assignee], 'requestedById': PEOPLE['Veterinarian'],
                'taskType': title, 'status': status, 'instructions': instructions,
                'resultText': '', 'resultImageUrl': '', 'completedAt': None, 'createdAt': NOW}

    def route(self, route):
        request = route.request
        url = urlsplit(request.url)
        origin, path, method = f'{url.scheme}://{url.netloc}', url.path, request.method
        if request.url == PHOTO_URL and method == 'GET' and request.resource_type == 'image':
            return route.fulfill(content_type='image/png', body=PNG)
        if origin != BASE or not path.startswith('/api/'):
            api_like = path.startswith('/api/') or request.resource_type in ('xhr', 'fetch')
            if origin == BASE and method in ('GET', 'HEAD') and not api_like:
                return route.continue_()
            if api_like or method not in ('GET', 'HEAD'):
                self.unhandled.append((method, origin, path))
            return route.abort()
        if request.header_value('authorization') != f'Bearer {TOKEN}':
            self.unhandled.append((method, 'missing fixture authorization', path))
            return route.fulfill(status=401, json={'message': 'Thiếu phiên QA'})
        if method == 'GET':
            self.reads.append((path, parse_qs(url.query)))
        try:
            code, body = self.fixture(request, path, method, parse_qs(url.query))
        except (TypeError, ValueError, KeyError) as error:
            self.unhandled.append((method, path, str(error)))
            code, body = 400, {'message': 'Payload fixture không hợp lệ'}
        return route.fulfill(status=code, json=body)

    def fixture(self, request, path, method, query):
        if method == 'GET' and path == '/api/appointment-services/my-queue':
            return 200, {'data': [self.exam()] if self.role == 'Veterinarian' else []}
        if method == 'GET' and path == f'/api/medical-records/pet/{PET}':
            return 200, {'pet': PET_DATA, 'records': []}
        if method == 'GET' and path == RECORD:
            return 200, {'_id': f'{499:024x}', 'appointmentServiceId': EXAM, 'petId': PET_DATA,
                         'status': getattr(self, 'record_status', 'Draft'), 'prescriptions': [], 'createdAt': NOW, **SOAP}
        if method == 'GET' and path in ('/api/products', '/api/cages'):
            return 200, {'data': {'items': []}, 'items': []}
        if method == 'GET' and path == '/api/users/staff':
            members = [{**PEOPLE[role], 'status': 'Active'} for role in ('Veterinarian', 'Groomer')]
            return 200, {'items': members, 'pagination': {'page': 1, 'totalPages': 1, 'total': len(members)}}
        if method == 'GET' and path == '/api/appointment-orders' and self.role == 'Receptionist':
            return 200, {'data': [], 'pagination': {'total': 0, 'page': 1, 'limit': 10}}
        if method == 'GET' and path == '/api/cage-assignments' and self.role == 'Receptionist':
            return 200, {'data': [], 'count': 0}
        if path == SUB_QUEUE and method == 'GET' and self.role in ('Groomer', 'Veterinarian'):
            if self.queue_error:
                return 503, {'message': 'Danh sách việc QA tạm thời gián đoạn'}
            return 200, {'data': [t for t in self.tasks.values() if t['assignedStaffId']['role'] == self.role
                                  and (not query.get('status') or [t['status']] == query['status'])]}
        if path == BY_EXAM and method == 'GET' and self.role == 'Veterinarian':
            return 200, {'data': list(self.tasks.values())}
        if method == 'GET' and path.startswith(SUB + '/') and path.rsplit('/', 1)[-1] in self.tasks:
            return 200, {'data': self.tasks[path.rsplit('/', 1)[-1]]}
        if method == 'POST' and path == f'{RECORD}/complete' and self.role == 'Veterinarian':
            self.writes.append((method, path, *decode(request)))
            return 409, {'message': SOAP_CONFLICT}
        if method == 'POST' and path == SUB and self.role == 'Veterinarian':
            media, fields, files = decode(request)
            self.writes.append((method, path, media, fields, files))
            if fields.get('appointmentServiceId') != EXAM or fields.get('assignedStaffId') != GROOM:
                return 400, {'message': 'Sai định danh ca khám hoặc nhân sự (QA)'}
            self.tasks[MADE] = self.task(MADE, fields['taskType'], 'Pending', instructions=fields.get('instructions', ''))
            return 201, {'message': 'Tạo chỉ định thành công', 'data': self.tasks[MADE]}
        match = re.fullmatch(rf'{SUB}/([0-9a-f]{{24}})(?:/(start|complete))?', path)
        if match and match[1] in self.tasks:
            task = self.tasks[match[1]]
            if method == 'DELETE' and not match[2] and self.role == 'Veterinarian':
                self.writes.append((method, path, *decode(request)))
                if task['status'] != 'Pending':
                    return 409, {'message': 'Chỉ hủy khi còn chờ thực hiện'}
                del self.tasks[match[1]]
                return 200, {'message': 'Hủy yêu cầu thành công'}
            if method == 'PATCH' and task['assignedStaffId']['role'] == self.role:
                media, fields, files = decode(request)
                self.writes.append((method, path, media, fields, files))
                if match[2] == 'start':
                    task['status'] = 'InProgress'
                    if self.start_conflict:
                        return 409, {'message': START_CONFLICT}
                    return 200, {'data': task}
                if match[2] == 'complete':
                    if self.upload_error:
                        return 502, {'message': UPLOAD_ERROR}
                    if not (fields or {}).get('resultText') and 'resultImage' not in files:
                        return 400, {'message': 'Cần kết quả hoặc ảnh (QA)'}
                    task.update(status='Completed', completedAt=NOW, resultText=fields.get('resultText', ''),
                                resultImageUrl=PHOTO_URL if files else '')
                    return 200, {'data': task}
        self.unhandled.append((method, path, self.role))
        return 501, {'message': f'Fixture thiếu {method} {path}'}

    def open_queue(self, role='Groomer'):
        self.role = role
        user = {**PEOPLE[role], 'status': 'Active', 'isEmailVerified': True, 'email': 'subtask@example.test'}
        self.context.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                                     f"localStorage.setItem('token', {json.dumps(TOKEN)});"
                                     "sessionStorage.setItem('hasLoadedBefore', 'true');")
        self.page.goto(f'{BASE}{QUEUE}')

    def assigned(self):
        self.page.get_by_role('tab', name='Việc được giao').click()
        return self.page.get_by_role('tabpanel', name='Việc được giao')

    def row(self, title):
        return self.page.get_by_role('row').filter(has_text=title)

    def response(self, method, path):
        return self.page.expect_response(lambda r: r.request.method == method and urlsplit(r.url).path == path)

    def set_status(self, label, api_status):
        with self.page.expect_response(lambda r: urlsplit(r.url).path == SUB_QUEUE
                                      and parse_qs(urlsplit(r.url).query) == {'status': [api_status]}):
            self.page.get_by_role('combobox', name='Trạng thái chỉ định').press('ArrowDown')
            self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(
                has_text=re.compile(f'^{re.escape(label)}$')).click()

    def result_dialog(self, row):
        ctl(row, 'Gửi kết quả').click()
        return self.page.get_by_role('dialog', name=re.compile('Gửi kết quả'))

    def result_field(self, dialog):
        return dialog.get_by_role('textbox', name=re.compile('Kết quả', re.I))

    def test_groomer_filters_starts_and_submits_text_json(self):
        self.open_queue()
        self.assigned()
        self.set_status('Chờ thực hiện', 'Pending')
        expect(self.row(TITLE)).to_be_visible()
        expect(self.row(VET_TITLE)).to_have_count(0)
        path = f'{SUB}/{PENDING}/start'
        with self.response('PATCH', path) as started:
            ctl(self.row(TITLE), 'Bắt đầu').click()
        self.assertEqual(started.value.status, 200)
        expect(self.row(TITLE)).to_have_count(0)
        self.set_status('Đang thực hiện', 'InProgress')
        expect(ctl(self.row(TITLE), 'Bắt đầu')).to_have_count(0)
        dialog = self.result_dialog(self.row(TITLE))
        expect(ctl(dialog, 'Hoàn tất yêu cầu')).to_be_disabled()
        text = 'ALT và ure trong giới hạn QA'
        self.result_field(dialog).fill('  ' + text + '  ')
        path = f'{SUB}/{PENDING}/complete'
        with self.response('PATCH', path) as sent:
            ctl(dialog, 'Hoàn tất yêu cầu').click()
        self.assertEqual(sent.value.status, 200)
        self.assertEqual(self.writes[-1], ('PATCH', path, 'application/json', {'resultText': text}, {}))
        self.assertEqual([(m, p) for m, p, *_ in self.writes], [
            ('PATCH', f'{SUB}/{PENDING}/start'), ('PATCH', path)])
        self.set_status('Đã hoàn tất', 'Completed')
        expect(self.row(TITLE)).to_be_visible()
        expect(ctl(self.row(TITLE), 'Gửi kết quả')).to_have_count(0)
        ctl(self.row(TITLE), 'Xem chi tiết').click()
        expect(self.page.get_by_role('dialog').get_by_text(text, exact=True)).to_be_visible()

    def test_image_upload_keeps_input_on_502_and_retries_multipart(self):
        self.open_queue()
        self.assigned()
        dialog = self.result_dialog(self.row(IMAGE_TITLE))  # BE also allows completion directly from Pending
        text = 'Kết quả kèm ảnh QA'
        self.result_field(dialog).fill(text)
        dialog.get_by_label('Ảnh kết quả', exact=True).set_input_files({'name': 'result.png', 'mimeType': 'image/png', 'buffer': PNG})
        path = f'{SUB}/{IMAGE_TASK}/complete'
        for status in (502, 200):
            self.upload_error = status == 502
            with self.response('PATCH', path) as sent:
                ctl(dialog, 'Hoàn tất yêu cầu').click()
            self.assertEqual(sent.value.status, status)
            self.assertEqual(self.writes[-1], ('PATCH', path, 'multipart/form-data',
                             {'resultText': text}, {'resultImage': ('result.png', 'image/png', PNG)}))
            if status == 502:
                expect(dialog.get_by_text(UPLOAD_ERROR, exact=True)).to_be_visible()
                expect(self.result_field(dialog)).to_have_value(text)
                self.assertEqual(self.tasks[IMAGE_TASK]['status'], 'Pending')
        expect(dialog).to_have_count(0)
        self.assertEqual(len(self.writes), 2)
        ctl(self.row(IMAGE_TITLE), 'Xem chi tiết').click()
        result = self.page.get_by_role('img', name='Ảnh kết quả cận lâm sàng')
        expect(result).to_have_attribute('src', PHOTO_URL)
        self.page.wait_for_function("url => Array.from(document.images).some(i => i.src === url && i.complete && i.naturalWidth > 0)", arg=PHOTO_URL)

    def test_vet_can_submit_image_only_but_invalid_file_never_sends(self):
        self.open_queue('Veterinarian')
        self.assigned()
        expect(self.row(TITLE)).to_have_count(0)
        dialog = self.result_dialog(self.row(VET_TITLE))
        attachment = dialog.get_by_label('Ảnh kết quả', exact=True)
        submit = ctl(dialog, 'Hoàn tất yêu cầu')
        attachment.set_input_files({'name': 'result.txt', 'mimeType': 'text/plain', 'buffer': b'not an image'})
        expect(dialog.get_by_role('alert')).to_contain_text('Chọn ảnh JPEG, PNG hoặc WebP')
        expect(submit).to_be_disabled()
        self.assertEqual(self.writes, [])
        attachment.set_input_files({'name': 'image-only.png', 'mimeType': 'image/png', 'buffer': PNG})
        path = f'{SUB}/{FOREIGN}/complete'
        with self.response('PATCH', path) as sent:
            submit.click()
        self.assertEqual(sent.value.status, 200)
        self.assertEqual(self.writes, [('PATCH', path, 'multipart/form-data', {},
                                       {'resultImage': ('image-only.png', 'image/png', PNG)})])
        expect(self.row(VET_TITLE).get_by_text('Đã hoàn tất', exact=True)).to_be_visible()

    def test_start_conflict_refreshes_queue_without_false_success(self):
        self.start_conflict = True
        self.open_queue()
        self.assigned()
        self.set_status('Chờ thực hiện', 'Pending')
        with self.response('PATCH', f'{SUB}/{PENDING}/start') as started:
            ctl(self.row(TITLE), 'Bắt đầu').click()
        self.assertEqual(started.value.status, 409)
        expect(self.page.get_by_text(START_CONFLICT, exact=True)).to_be_visible()
        expect(self.page.get_by_text('Đã bắt đầu thực hiện.', exact=True)).to_have_count(0)
        expect(self.row(TITLE)).to_have_count(0)
        self.set_status('Đang thực hiện', 'InProgress')
        expect(ctl(self.row(TITLE), 'Gửi kết quả')).to_be_visible()
        expect(ctl(self.row(TITLE), 'Bắt đầu')).to_have_count(0)
        self.assertEqual(len(self.writes), 1)

    def test_assigned_list_failure_can_retry(self):
        self.queue_error = True
        self.open_queue()
        panel = self.assigned()
        expect(panel.get_by_text('Danh sách việc QA tạm thời gián đoạn', exact=True)).to_be_visible()
        self.queue_error = False
        with self.response('GET', SUB_QUEUE):
            ctl(panel, 'Thử lại').click()
        expect(self.row(TITLE)).to_be_visible()
        self.assertEqual(self.writes, [])

    def test_vet_creates_reads_completed_and_cancels_pending_only(self):
        self.tasks[IMAGE_TASK].update(status='Completed', resultText='Kết quả đã lưu từ máy chủ QA', completedAt=NOW)
        self.open_queue('Veterinarian')
        ctl(self.row('APT-SUBTASK-QA'), 'Cận lâm sàng').click()
        modal = self.page.get_by_role('dialog', name='Cận lâm sàng và dịch vụ phụ')
        expect(modal.get_by_text(TITLE, exact=True)).to_be_visible()
        self.assertIn((BY_EXAM, {}), self.reads)
        completed = modal.locator('.ant-list-item').filter(has_text=IMAGE_TITLE)
        expect(ctl(completed, 'Hủy chỉ định')).to_have_count(0)
        ctl(completed, 'Xem chi tiết').click()
        details = self.page.get_by_role('dialog', name='Chi tiết chỉ định')
        expect(details.get_by_text('Kết quả đã lưu từ máy chủ QA', exact=True)).to_be_visible()
        ctl(details, 'Close').click()
        name = 'Siêu âm ổ bụng mới QA'
        modal.get_by_role('textbox', name='Tên chỉ định').fill('  ' + name + '  ')
        modal.get_by_role('combobox', name='Nhân sự thực hiện').fill('Groomer nhận việc QA')
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='Groomer nhận việc QA').click()
        modal.get_by_role('textbox', name=re.compile('Hướng dẫn')).fill('  Nhịn ăn theo chỉ định QA  ')
        with self.response('POST', SUB) as created:
            ctl(modal, 'Tạo chỉ định').click()
        self.assertEqual(created.value.status, 201)
        self.assertEqual(self.writes[0], ('POST', SUB, 'application/json', {
            'appointmentServiceId': EXAM, 'assignedStaffId': GROOM, 'taskType': name,
            'instructions': 'Nhịn ăn theo chỉ định QA'}, {}))
        new_row = modal.locator('.ant-list-item').filter(has_text=name)
        ctl(new_row, 'Hủy chỉ định').click()
        confirm = self.page.locator('.ant-popconfirm:visible').filter(has_text='Hủy chỉ định đang chờ?')
        with self.response('DELETE', f'{SUB}/{MADE}') as removed:
            ctl(confirm, 'Hủy chỉ định').click()
        self.assertEqual(removed.value.status, 200)
        expect(new_row).to_have_count(0)
        self.assertEqual([(m, p) for m, p, *_ in self.writes], [('POST', SUB), ('DELETE', f'{SUB}/{MADE}')])

    def test_finalized_record_cannot_create_from_queue(self):
        self.record_status = 'Finalized'
        self.open_queue('Veterinarian')
        ctl(self.row('APT-SUBTASK-QA'), 'Cận lâm sàng').click()
        modal = self.page.get_by_role('dialog', name='Cận lâm sàng và dịch vụ phụ')
        expect(modal.get_by_text('Bệnh án đã khóa, không thể tạo thêm chỉ định.', exact=True)).to_be_visible()
        expect(modal.get_by_text(TITLE, exact=True)).to_be_visible()
        expect(ctl(modal, 'Tạo chỉ định')).to_have_count(0)
        self.assertEqual(self.writes, [])

    def test_soap_conflict_stays_on_exam_and_keeps_unsaved_draft(self):
        self.open_queue('Veterinarian')
        ctl(self.row('APT-SUBTASK-QA'), 'Tiếp tục khám').click()
        expect(self.page).to_have_url(f'{BASE}/clinic/exam/{EXAM}')
        subjective = self.page.get_by_role('textbox', name=re.compile(r'^S\s*·'))
        draft = 'Ghi chú chưa lưu QA'
        subjective.fill(draft)
        ctl(self.page, 'Cận lâm sàng').click()
        modal = self.page.get_by_role('dialog', name='Cận lâm sàng và dịch vụ phụ')
        expect(modal.get_by_text(TITLE, exact=True)).to_be_visible()
        ctl(modal, 'Close').click()
        expect(subjective).to_have_value(draft)
        ctl(self.page, 'Hoàn tất ca khám').click()
        confirm = self.page.get_by_role('dialog', name=re.compile('Hoàn tất ca khám'))
        with self.response('POST', f'{RECORD}/complete') as result:
            ctl(confirm, 'Hoàn tất').click()
        self.assertEqual(result.value.status, 409)
        expect(self.page.get_by_role('alert').get_by_text(SOAP_CONFLICT, exact=True)).to_be_visible()
        expect(self.page).to_have_url(f'{BASE}/clinic/exam/{EXAM}')
        expect(subjective).to_have_value(draft)
        self.assertEqual(self.writes[0][3]['subjectiveNote'], draft)

    def test_receptionist_cannot_enter_staff_queue_or_fetch_subtasks(self):
        self.open_queue('Receptionist')
        expect(self.page).to_have_url(f'{BASE}/clinic/appointments')
        expect(self.page.get_by_role('heading', name='Tiếp nhận lịch hẹn phòng khám')).to_be_visible()
        expect(self.page.get_by_role('tab', name='Việc được giao')).to_have_count(0)
        self.assertFalse(any(path.startswith(SUB) for path, _ in self.reads))
        self.assertEqual(self.writes, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
