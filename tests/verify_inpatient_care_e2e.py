"""Desktop Chromium E2E for FE inpatient care, using BE #46 (b9d476a) fixtures.

Run against the integrated FE, not the pre-feature checkout. Start Vite
with VITE_API_ROOT=/api on a dedicated loopback listener at port 3000
(--strictPort) and set FE_BASE_URL to that origin. No request writes live data.
Run: python tests/verify_inpatient_care_e2e.py -v
"""
import json
import math
import os
import re
import unittest
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('FE_BASE_URL', 'http://[::1]:3000').rstrip('/')
if BASE not in {'http://[::1]:3000', 'http://127.0.0.1:3000', 'http://127.0.0.2:3000'}:
    raise SystemExit('FE_BASE_URL must be a dedicated loopback Vite listener on port 3000.')

(
    VET, OWNER, OTHER, PET, DELETED, FOREIGN, EXAM_PET, ORDER, EXAM_ORDER, EXAM, MEDICAL, SERVICE,
    RECORD, NEW_RECORD, OLD_RECORD, LOG, NEW_LOG, OLD_LOG, WARD, WARD_FIRST, WARD_BACKUP, WARD_SMALL, WARD_BUSY, HOLD,
) = (f'{i:024x}' for i in range(460, 484))
DAY, NOW = '2026-11-16', '2026-11-16T02:30:00.000Z'
ADMITTED_AT = '2026-11-15T03:00:00.000Z'
ORIGIN_STAY = '/clinic/inpatient'
STAYS = '/api/inpatient-records'
DETAIL = f'{STAYS}/{RECORD}'
LOGS = f'{DETAIL}/daily-logs'
DISCHARGE = f'{DETAIL}/discharge'
PET_LOGS = f'{STAYS}/pets/{PET}/daily-logs'
TOKEN = 'inpatient-qa-synthetic-token'
PET_NAME, EXAM_PET_NAME = 'Milo', 'Bông'
INITIAL_DIAGNOSIS, TREATMENT = 'Mất nước nhẹ, cần theo dõi', 'Bù dịch và theo dõi thể trạng'
LOG_TEXT, LOG_NOTES = 'Tỉnh táo, đã ăn sáng', 'Theo dõi thêm vào chiều'
OWNER_LOG_NOTES, OLD_LOG_NOTES = 'Nhật ký riêng của Milo', 'Nhật ký đợt trước của Milo'
CAGE_CONFLICT = 'Lồng đã có thú cưng khác'
VETERINARIAN = {'_id': VET, 'code': 'VET-DQ01', 'fullName': 'Bác sĩ Đặng Quang'}
SOAP = {'subjectiveNote': 'Triệu chứng SOAP', 'objectiveNote': 'Khám SOAP',
        'assessment': 'Đánh giá SOAP', 'plan': 'Kế hoạch SOAP'}


def make_pet(pet_id, name, *, owner=OWNER, status='Active', weight=8):
    return {'_id': pet_id, 'ownerId': owner, 'name': name, 'code': f'PET-{pet_id[-4:]}',
            'species': 'Chó', 'weight': weight, 'status': status, 'createdAt': ADMITTED_AT, 'updatedAt': NOW}


def make_cage(cage_id, label, *, zone='InpatientWard', status='Available', weight=15):
    return {'_id': cage_id, 'label': label, 'zone': zone, 'status': status,
            'isIsolated': False, 'size': 'M', 'maxWeightKg': weight}


def action(scope, label):
    return scope.get_by_role('button', name=re.compile(rf'(?:^| ){re.escape(label)}$'))


def heading(scope, fragment):
    return scope.get_by_role('heading', name=re.compile(fragment, re.I))


def field(scope, fragment):
    return scope.get_by_role('textbox', name=re.compile(fragment, re.I))


def paginate(items, query, default=20):
    page, limit = int(query.get('page', ['1'])[0]), int(query.get('limit', [str(default)])[0])
    return {'items': items[(page - 1) * limit:page * limit], 'total': len(items),
            'page': page, 'limit': limit, 'totalPages': math.ceil(len(items) / limit)}


class InpatientCareE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.addClassCleanup(cls.playwright.stop)
        cls.browser = cls.playwright.chromium.launch()
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.role = 'Veterinarian'
        self.reads, self.writes, self.unhandled, self.page_errors = [], [], [], []
        self.admission_conflict = False
        self.owner_log_failures = 0
        self.cage_failures = 0
        self.exam_status, self.exam_order_status = 'Done', 'WaitOwner'
        self.pets = {
            PET: make_pet(PET, PET_NAME),
            EXAM_PET: make_pet(EXAM_PET, EXAM_PET_NAME),
            DELETED: make_pet(DELETED, 'Pet đã xóa', status='Deleted'),
            FOREIGN: make_pet(FOREIGN, 'Pet người khác', owner=OTHER),
        }
        self.cages = {c['_id']: c for c in (
            make_cage(WARD, 'Nội trú A-01', status='Occupied'),
            make_cage(WARD_FIRST, 'Nội trú A-02'),
            make_cage(WARD_BACKUP, 'Nội trú A-03', weight=8),
            make_cage(WARD_SMALL, 'Nội trú B-01', weight=7),
            make_cage(WARD_BUSY, 'Nội trú B-02', status='Occupied'),
            make_cage(HOLD, 'Khu chờ A-01', zone='Holding'),
        )}
        seed = self.make_record(RECORD, PET, ORDER, WARD)
        seed['dailyLogs'] = [self.make_log(LOG, '2026-11-15', observations=OWNER_LOG_NOTES)]
        self.records = {RECORD: seed}
        # An earlier stay of the same pet: owner logs span stays, vet default list does not.
        old = self.make_record(OLD_RECORD, PET, ORDER, WARD)
        old.update(status='Discharged', dischargedAt=ADMITTED_AT, initialDiagnosis='Hồ sơ cũ')
        old['dailyLogs'] = [self.make_log(OLD_LOG, '2026-11-14', notes=OLD_LOG_NOTES)]
        self.records[OLD_RECORD] = old
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 900},
                                               timezone_id='Asia/Ho_Chi_Minh', service_workers='block')
        self.addCleanup(self.context.close)
        self.context.route('**/*', self.route)
        self.page = self.context.new_page()
        self.page.set_default_timeout(8000)
        self.page.clock.set_fixed_time(datetime(2026, 11, 16, 2, 30, tzinfo=timezone.utc))
        self.page.on('pageerror', lambda error: self.page_errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [], 'Unexpected API/network requests (blocked, never forwarded)')
        self.assertEqual(self.page_errors, [], 'Uncaught browser exceptions')

    def make_record(self, record_id, pet_id, order_id, cage_id, diagnosis=INITIAL_DIAGNOSIS, plan=TREATMENT):
        saved_cage = self.cages[cage_id]
        return {'_id': record_id, 'petId': self.pets[pet_id], 'orderId': self.order(order_id, pet_id),
                'cageId': {key: saved_cage[key] for key in ('_id', 'label', 'size', 'zone', 'status', 'isIsolated')},
                'attendingVetId': VETERINARIAN, 'status': 'Admitted', 'admittedAt': ADMITTED_AT,
                'dischargedAt': None, 'initialDiagnosis': diagnosis, 'treatmentPlan': plan, 'dailyLogs': []}

    def order(self, order_id, pet_id):
        code = 'APT-ABW23Q' if order_id == EXAM_ORDER else 'APT-KLM67P'
        return {'_id': order_id, 'code': code, 'date': DAY, 'petId': pet_id, 'ownerId': OWNER,
                'derivedStatus': self.exam_order_status if order_id == EXAM_ORDER else 'WaitOwner', 'isOnline': True}

    def exam(self):
        return {'_id': EXAM, 'orderId': self.order(EXAM_ORDER, EXAM_PET),
                'serviceId': {'_id': SERVICE, 'name': 'Khám tổng quát', 'category': 'Examination'},
                'assignedStaffId': {**VETERINARIAN, 'role': 'Veterinarian'},
                'status': self.exam_status, 'sequenceNo': 1, 'queueNo': 1}

    def make_log(self, identifier, date, *, observations='', notes=''):
        return {'_id': identifier, 'date': date, 'observations': observations, 'notes': notes,
                'createdAt': NOW, 'recordedById': VETERINARIAN}

    def route(self, route):
        req = route.request
        url = urlsplit(req.url)
        origin, path, method = f'{url.scheme}://{url.netloc}', url.path, req.method
        api_like = path.startswith('/api/') or req.resource_type in ('xhr', 'fetch')
        if origin != BASE or not path.startswith('/api/'):
            if origin == BASE and method in ('GET', 'HEAD') and not api_like:
                return route.continue_()
            if api_like or method not in ('GET', 'HEAD'):
                self.unhandled.append((method, origin, path))
            return route.abort()
        if req.header_value('authorization') != f'Bearer {TOKEN}':
            self.unhandled.append((method, path, 'missing fixture token'))
            return route.fulfill(status=401, json={'message': 'Thiếu phiên'})
        query = parse_qs(url.query)
        try:
            body = None
            if method == 'GET':
                self.reads.append((path, query))
            elif method != 'HEAD':
                body = json.loads(req.post_data_buffer) if req.post_data_buffer else None
                self.writes.append((method, path, body))
            status, payload = self.fixture(method, path, query, body)
        except (TypeError, ValueError, KeyError) as err:
            self.unhandled.append((method, path, f'Invalid fixture input: {err}'))
            status, payload = 400, {'message': 'Dữ liệu fixture không hợp lệ'}
        return route.fulfill(status=status, json=payload)

    def fixture(self, method, path, query, body):
        owner_path = re.fullmatch(rf'{STAYS}/pets/([0-9a-f]{{24}})/daily-logs', path)
        if owner_path and method == 'GET':
            pet_id = owner_path[1]
            pet = self.pets.get(pet_id)
            if self.role != 'PetOwner':
                self.unhandled.append((method, path, 'owner logs called as staff'))
                return 403, {'message': 'Không có quyền'}
            if not pet or pet['ownerId'] != OWNER or pet['status'] != 'Active':
                return 404, {'message': 'Không tìm thấy thú cưng'}
            if self.owner_log_failures:
                self.owner_log_failures -= 1
                return 503, {'message': 'Nhật ký tạm thời không tải được'}
            items = []
            for stay in self.records.values():
                if stay['petId']['_id'] != pet_id or query.get('recordId', [stay['_id']]) != [stay['_id']]:
                    continue
                items.extend({**log, 'inpatientRecordId': stay['_id'],
                              'recordedById': {'_id': VET, 'fullName': VETERINARIAN['fullName']}}
                             for log in stay['dailyLogs'])
            return 200, paginate(self.filter_logs(items, query), query)
        if path == STAYS or path.startswith(STAYS + '/'):
            if self.role != 'Veterinarian':
                self.unhandled.append((method, path, 'vet API called by non-vet'))
                return 403, {'message': 'Không có quyền'}
            return self.vet_fixture(method, path, query, body)
        if method == 'GET' and path == '/api/appointment-services/my-queue' and self.role == 'Veterinarian':
            return 200, {'data': [self.exam()]}
        if method == 'GET' and path == f'/api/subtask-requests/service/{EXAM}' and self.role == 'Veterinarian':
            return 200, {'data': []}
        if method == 'GET' and path == f'/api/medical-records/service/{EXAM}' and self.role == 'Veterinarian':
            return 200, {'_id': MEDICAL, 'petId': self.pets[EXAM_PET], 'orderId': EXAM_ORDER,
                         'appointmentServiceId': EXAM, 'status': 'Draft', 'prescriptions': [], 'createdAt': NOW, **SOAP}
        if method == 'GET' and path.startswith('/api/medical-records/pet/'):
            pet_id = path.rsplit('/', 1)[-1]
            if pet_id in self.pets:
                return 200, {'pet': self.pets[pet_id], 'records': []}
        if method == 'GET' and path == '/api/cages' and self.role == 'Veterinarian':
            if self.cage_failures:
                self.cage_failures -= 1
                return 503, {'message': 'Không tải được chuồng'}
            items = [c for c in self.cages.values() if query.get('status', [c['status']]) == [c['status']]]
            return 200, {'success': True, 'data': paginate(items, query)}
        if method == 'GET' and path == '/api/products':
            return 200, {'data': {'items': []}}
        if method == 'GET' and path == '/api/pets' and self.role == 'PetOwner':
            items = [p for p in self.pets.values() if p['ownerId'] == OWNER and
                     query.get('status', ['Active'])[0] in ('All', p['status'])]
            return 200, paginate(items, query)
        timeline_path = re.fullmatch(r'/api/pets/([0-9a-f]{24})/timeline', path)
        if method == 'GET' and timeline_path:
            pet = self.pets.get(timeline_path[1])
            if not pet or (self.role == 'PetOwner' and pet['ownerId'] != OWNER):
                return 404, {'message': 'Không tìm thấy thú cưng'}
            # BE #54 bare timeline response; this regression suite targets the
            # separate, paginated owner daily-log section rather than timeline.
            return 200, {'pet': pet, 'summary': {'totalVisits': 0, 'completedVisits': 0,
                         'activeVisits': 0, 'totalMedicalRecords': 0, 'totalGroomingNotes': 0,
                         'totalInpatientStays': 0, 'hasActiveInpatient': False},
                         'activeInpatient': None, 'sharedPosts': [], 'timeline': [],
                         'pagination': {'page': 1, 'limit': 10, 'total': 0, 'totalPages': 0}}
        if method == 'GET' and path.startswith('/api/pets/'):
            pet = self.pets.get(path.rsplit('/', 1)[-1])
            if not pet or (self.role == 'PetOwner' and pet['ownerId'] != OWNER):
                return 404, {'message': 'Không tìm thấy thú cưng'}
            return 200, {'pet': pet, 'appointmentNotes': []}
        if method == 'GET' and path == '/api/appointment-orders/me' and self.role == 'PetOwner':
            return 200, {'data': [], 'pagination': {'page': 1, 'limit': 20, 'total': 0, 'totalPages': 0}}
        self.unhandled.append((method, path, query))
        return 501, {'message': f'Fixture thiếu {method} {path}'}

    @staticmethod
    def filter_logs(items, query):
        return sorted((log for log in items if query.get('date', [log['date']]) == [log['date']] and
                       query.get('from', [''])[0] <= log['date'] <= query.get('to', ['9999'])[0]),
                      key=lambda log: (log['date'], log['createdAt']), reverse=True)

    def vet_fixture(self, method, path, query, body):
        if method == 'GET' and path == STAYS:
            items = [{k: v for k, v in record.items() if k != 'dailyLogs'} for record in self.records.values()
                     if query.get('status', [record['status']]) == [record['status']]]
            return 200, paginate(items, query)
        if method == 'POST' and path == STAYS:
            cage = self.cages.get(body['cageId'])
            if body['petId'] != EXAM_PET or body['orderId'] != EXAM_ORDER or not cage:
                return 400, {'message': 'Thông tin nhập viện không khớp'}
            if cage['zone'] != 'InpatientWard' or cage['maxWeightKg'] < self.pets[EXAM_PET]['weight']:
                return 400, {'message': 'Lồng không phù hợp'}
            if self.admission_conflict and cage['_id'] == WARD_FIRST:
                cage['status'] = 'Occupied'  # Simulate another person claiming the chosen cage.
            if cage['status'] != 'Available':
                return 409, {'message': CAGE_CONFLICT}
            cage['status'] = 'Occupied'
            record = self.make_record(NEW_RECORD, EXAM_PET, EXAM_ORDER, cage['_id'],
                                      body.get('initialDiagnosis', ''), body.get('treatmentPlan', ''))
            record['admittedAt'] = NOW
            self.records[NEW_RECORD] = record
            return 201, record  # No {data: ...} envelope in BE #46.
        match = re.fullmatch(rf'{STAYS}/([0-9a-f]{{24}})(?:/(daily-logs|discharge))?', path)
        record = self.records.get(match[1]) if match else None
        if match and not record:
            return 404, {'message': 'Không tìm thấy hồ sơ nội trú'}
        if match and method == 'GET' and not match[2]:
            return 200, record
        if match and method == 'GET' and match[2] == 'daily-logs':
            items = self.filter_logs(record['dailyLogs'], query)
            return 200, {'items': items, 'total': len(items)}
        if match and method == 'POST' and match[2] == 'daily-logs':
            if record['status'] != 'Admitted' or not (body.get('observations') or body.get('notes')):
                return 400, {'message': 'Nhật ký không hợp lệ'}
            log = self.make_log(NEW_LOG, body.get('date', DAY), observations=body.get('observations', ''),
                                notes=body.get('notes', ''))
            record['dailyLogs'].append(log)
            return 201, log
        if match and method == 'PATCH' and match[2] == 'discharge':
            if record['status'] != 'Admitted':
                return 409, {'message': 'Hồ sơ nội trú đã xuất viện'}
            record.update(status='Discharged', dischargedAt=NOW)
            return 200, record  # A successful discharge does not alter cage or cage assignment.
        self.unhandled.append((method, path, query))
        return 501, {'message': f'Fixture thiếu {method} {path}'}

    def login(self, role='Veterinarian'):
        self.role = role
        profile = VETERINARIAN if role == 'Veterinarian' else {'_id': OWNER, 'fullName': 'Nguyễn Minh Anh'}
        user = {**profile, 'email': 'inpatient@example.test', 'role': role, 'status': 'Active', 'isEmailVerified': True}
        self.context.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                                     f"localStorage.setItem('token', {json.dumps(TOKEN)});"
                                     "sessionStorage.setItem('hasLoadedBefore', 'true');")

    def response(self, method, path):
        return self.page.expect_response(lambda res: res.request.method == method and urlsplit(res.url).path == path)

    def open_vet_detail(self):
        self.login()
        with self.response('GET', STAYS) as listed:
            self.page.goto(BASE + ORIGIN_STAY)
        self.assertEqual(listed.value.status, 200)
        self.assertEqual(parse_qs(urlsplit(listed.value.url).query).get('status'), ['Admitted'])
        expect(heading(self.page, '^Nội trú$')).to_be_visible()
        row = self.page.get_by_role('row').filter(has_text=PET_NAME)
        expect(row).to_have_count(1)
        with self.response('GET', DETAIL) as detail:
            action(row, 'Xem hồ sơ').click()
        self.assertEqual(detail.value.status, 200)
        drawer = self.page.get_by_role('dialog').filter(has_text=f'Hồ sơ nội trú · {PET_NAME}')
        expect(drawer.get_by_text(INITIAL_DIAGNOSIS, exact=True)).to_be_visible()
        return drawer

    def test_vet_reads_detail_and_adds_daily_log(self):
        drawer = self.open_vet_detail()
        expect(drawer.get_by_text(f'Tình trạng: {OWNER_LOG_NOTES}', exact=True)).to_be_visible()
        action(drawer, 'Ghi nhật ký').click()
        field(drawer, '^Tình trạng ghi nhận$').fill('  ' + LOG_TEXT + '  ')
        field(drawer, '^Ghi chú$').fill('  ' + LOG_NOTES + '  ')
        with self.response('POST', LOGS) as saved:
            action(drawer, 'Lưu nhật ký').click()
        self.assertEqual(saved.value.status, 201)
        self.assertEqual(len(self.writes), 1)
        method, path, payload = self.writes[0]
        self.assertEqual((method, path), ('POST', LOGS))
        # The valid default is either an explicit Vietnam date or omission (BE supplies today VN).
        self.assertEqual(payload.get('date', DAY), DAY)
        self.assertEqual({k: v for k, v in payload.items() if k != 'date'}, {'observations': LOG_TEXT, 'notes': LOG_NOTES})
        expect(drawer.get_by_text(f'Tình trạng: {LOG_TEXT}', exact=True)).to_be_visible()
        expect(drawer.get_by_text(f'Ghi chú: {LOG_NOTES}', exact=True)).to_be_visible()

    def test_discharge_requires_confirmation_and_does_not_release_cage(self):
        drawer = self.open_vet_detail()
        discharge = action(drawer, 'Xuất viện')
        discharge.click()
        confirm = self.page.locator('.ant-popconfirm').filter(has_text='Xác nhận xuất viện')
        expect(confirm).to_be_visible()
        expect(confirm.get_by_text(re.compile(r'(vẫn|giữ).*(lồng|chuồng).*(đón|bàn giao)', re.I))).to_be_visible()
        self.assertEqual(self.writes, [])
        confirm.get_by_role('button', name=re.compile('Hủy|Quay lại', re.I)).click()
        expect(confirm).to_be_hidden()
        self.assertEqual(self.writes, [])
        discharge.click()
        with self.response('PATCH', DISCHARGE) as result:
            action(confirm, 'Xác nhận xuất viện').click()
        self.assertEqual(result.value.status, 200)
        expect(drawer.get_by_text('Đã xuất viện', exact=True)).to_be_visible()
        expect(drawer.get_by_text(self.cages[WARD]['label'], exact=True)).to_be_visible()
        expect(drawer.get_by_text(re.compile('không tự giải phóng chuồng', re.I))).to_be_visible()
        expect(action(drawer, 'Ghi nhật ký')).to_have_count(0)
        expect(action(drawer, 'Xuất viện')).to_have_count(0)
        self.assertEqual([(method, path) for method, path, _ in self.writes], [('PATCH', DISCHARGE)])
        self.assertIn(self.writes[0][2], (None, {}))

    def open_exam(self):
        self.login()
        self.page.goto(f'{BASE}/clinic/exam/{EXAM}')
        expect(self.page.get_by_role('textbox', name='P · Phác đồ điều trị')).to_have_value(SOAP['plan'])

    def test_admission_filters_cages_and_preserves_inputs_after_409(self):
        self.admission_conflict = True
        self.open_exam()
        action(self.page, 'Nhập viện nội trú').click()
        modal = self.page.get_by_role('dialog', name=re.compile('Nhập viện nội trú', re.I))
        combo = modal.get_by_role('combobox', name=re.compile('Chuồng nội trú', re.I))
        diagnosis = field(modal, 'Chẩn đoán ban đầu')
        plan = field(modal, 'Kế hoạch điều trị')
        diagnosis.fill('Theo dõi mất nước')
        plan.fill('Bù dịch và theo dõi')
        expect(combo).to_be_enabled()
        combo.press('ArrowDown')
        options = self.page.locator('.ant-select-dropdown:visible .ant-select-item-option')
        expect(options.filter(has_text=self.cages[WARD_FIRST]['label'])).to_be_visible()
        for cage_id in (HOLD, WARD_SMALL, WARD_BUSY):
            excluded = options.filter(has_text=self.cages[cage_id]['label'])
            if excluded.count():
                expect(excluded).to_have_attribute('aria-disabled', 'true')
        options.filter(has_text=self.cages[WARD_FIRST]['label']).click()
        with self.response('POST', STAYS) as first:
            action(modal, 'Nhập viện').click()
        self.assertEqual(first.value.status, 409)
        expected = {'petId': EXAM_PET, 'orderId': EXAM_ORDER, 'initialDiagnosis': 'Theo dõi mất nước',
                    'treatmentPlan': 'Bù dịch và theo dõi'}
        self.assertEqual(self.writes, [('POST', STAYS, {**expected, 'cageId': WARD_FIRST})])
        expect(modal.get_by_text(CAGE_CONFLICT, exact=True).first).to_be_visible()
        expect(diagnosis).to_have_value(expected['initialDiagnosis'])
        expect(plan).to_have_value(expected['treatmentPlan'])
        expect(combo).to_be_enabled()
        combo.press('ArrowDown')
        expect(options.filter(has_text=self.cages[WARD_BACKUP]['label'])).to_be_visible()
        unavailable = options.filter(has_text=self.cages[WARD_FIRST]['label'])
        if unavailable.count():
            expect(unavailable).to_have_attribute('aria-disabled', 'true')
        options.filter(has_text=self.cages[WARD_BACKUP]['label']).click()
        with self.response('POST', STAYS) as second:
            action(modal, 'Nhập viện').click()
        self.assertEqual(second.value.status, 201)
        expect(modal).to_have_count(0)
        expect(action(self.page, 'Xem hồ sơ nội trú')).to_be_visible()
        self.assertEqual(self.writes, [('POST', STAYS, {**expected, 'cageId': WARD_FIRST}),
                                       ('POST', STAYS, {**expected, 'cageId': WARD_BACKUP})])

    def open_admission(self):
        self.open_exam()
        action(self.page, 'Nhập viện nội trú').click()
        return self.page.get_by_role('dialog', name=re.compile('Nhập viện nội trú', re.I))

    def test_admission_explains_holding_and_unclassified_then_refreshes(self):
        legacy = make_cage(WARD_FIRST, 'Nội trú A-02')
        legacy.pop('zone')
        self.cages = {HOLD: make_cage(HOLD, 'Khu chờ A-01', zone='Holding'), WARD_FIRST: legacy}
        modal = self.open_admission()
        expect(modal.get_by_text('Chưa tìm thấy chuồng trống được xác nhận thuộc khu nội trú.', exact=True)).to_be_visible()
        expect(modal.get_by_text(re.compile('1 chuồng khu chờ, 1 chuồng chưa xác định khu vực'))).to_be_visible()
        expect(action(modal, 'Nhập viện')).to_be_disabled()
        self.assertEqual(self.writes, [])
        self.page.screenshot(path='tests/screenshots/inpatient-cage-classification.png', full_page=True)
        self.cages[WARD_FIRST]['zone'] = 'InpatientWard'
        action(modal, 'Làm mới').click()
        expect(modal.get_by_text(re.compile('1 chuồng phù hợp để chọn'))).to_be_visible()
        combo = modal.get_by_role('combobox', name=re.compile('Chuồng nội trú', re.I))
        combo.press('ArrowDown')
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='Nội trú A-02').click()
        expect(action(modal, 'Nhập viện')).to_be_enabled()

    def test_admission_explains_weight_limit(self):
        self.cages = {WARD_SMALL: make_cage(WARD_SMALL, 'Nội trú B-01', weight=7)}
        modal = self.open_admission()
        expect(modal.get_by_text('Chưa có chuồng nội trú trống đủ tải trọng cho thú cưng.', exact=True)).to_be_visible()
        expect(modal.get_by_text(re.compile('cân nặng 8 kg'))).to_be_visible()
        expect(action(modal, 'Nhập viện')).to_be_disabled()
        self.assertEqual(self.writes, [])

    def test_admission_loads_valid_ward_on_second_page(self):
        self.cages = {f'{900 + i:024x}': make_cage(f'{900 + i:024x}', f'Khu chờ A-{i+1:03}', zone='Holding') for i in range(100)}
        self.cages[WARD_FIRST] = make_cage(WARD_FIRST, 'Nội trú A-02')
        modal = self.open_admission()
        expect(modal.get_by_text(re.compile('101 chuồng trống, trong đó 1 chuồng nội trú'))).to_be_visible()
        self.assertTrue(any(path == '/api/cages' and q.get('page') == ['2'] for path, q in self.reads))
        modal.get_by_role('combobox', name=re.compile('Chuồng nội trú', re.I)).press('ArrowDown')
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='Nội trú A-02').click()
        with self.response('POST', STAYS) as saved:
            action(modal, 'Nhập viện').click()
        self.assertEqual(saved.value.status, 201)
        expect(modal).to_have_count(0)

    def test_admission_load_failure_is_not_empty_inventory(self):
        self.cage_failures = 1
        modal = self.open_admission()
        expect(modal.get_by_text('Không tải được chuồng', exact=True)).to_be_visible()
        expect(modal.get_by_text(re.compile('Chưa tìm thấy chuồng trống'))).to_have_count(0)
        expect(action(modal, 'Nhập viện')).to_be_disabled()
        action(modal, 'Thử lại').click()
        expect(modal.get_by_text(re.compile('chuồng phù hợp để chọn'))).to_be_visible()
        self.assertEqual(self.writes, [])

    def test_admission_cta_absent_while_order_still_in_progress(self):
        self.exam_order_status = 'InProgress'  # Exam itself is Done, but another service remains.
        self.open_exam()
        expect(action(self.page, 'Nhập viện nội trú')).to_have_count(0)
        self.assertEqual(self.writes, [])

    def test_owner_reads_only_own_active_pet_logs(self):
        self.login('PetOwner')
        self.page.goto(f'{BASE}/pets/{PET}')
        expect(heading(self.page, PET_NAME)).to_be_visible()
        panel = self.page.get_by_role('region', name='Nhật ký nội trú', exact=True)
        expect(heading(panel, '^Nhật ký nội trú$')).to_be_visible()
        expect(panel.get_by_text(f'Quan sát: {OWNER_LOG_NOTES}', exact=True)).to_be_visible()
        expect(panel.get_by_text(f'Ghi chú: {OLD_LOG_NOTES}', exact=True)).to_be_visible()
        self.assertIn(PET_LOGS, [path for path, _ in self.reads])
        expect(action(self.page, 'Ghi nhật ký')).to_have_count(0)
        expect(action(self.page, 'Xuất viện')).to_have_count(0)
        self.assertEqual(self.writes, [])

    def test_owner_log_failure_retry_and_pagination(self):
        self.owner_log_failures = 1
        self.records[RECORD]['dailyLogs'].extend(
            self.make_log(f'{600 + i:024x}', DAY, observations=f'Ghi nhận trang đầu {i}')
            for i in range(10)
        )
        self.login('PetOwner')
        self.page.goto(f'{BASE}/pets/{PET}#inpatient-logs')
        panel = self.page.get_by_role('region', name='Nhật ký nội trú', exact=True)
        expect(panel.get_by_role('alert')).to_contain_text('Không tải được nhật ký nội trú')
        with self.response('GET', PET_LOGS) as retried:
            action(panel, 'Thử lại').click()
        self.assertEqual(retried.value.status, 200)
        expect(panel.get_by_text('Ghi nhận trang đầu 0', exact=False)).to_be_visible()
        expect(panel.get_by_text(OLD_LOG_NOTES, exact=False)).to_have_count(0)
        with self.response('GET', PET_LOGS) as next_page:
            panel.locator('.ant-pagination-item-2').click()
        self.assertEqual(parse_qs(urlsplit(next_page.value.url).query)['page'], ['2'])
        expect(panel.get_by_text(OLD_LOG_NOTES, exact=False)).to_be_visible()
        expect(panel.get_by_text('Ghi nhận trang đầu 0', exact=False)).to_have_count(0)
        self.assertEqual(self.writes, [])

    def test_owner_inactive_or_foreign_pet_does_not_fetch_inpatient_logs(self):
        self.login('PetOwner')
        for pet_id in (DELETED, FOREIGN):
            with self.subTest(pet_id=pet_id):
                self.page.goto(f'{BASE}/pets/{pet_id}')
                if pet_id == DELETED:
                    expect(heading(self.page, self.pets[pet_id]['name'])).to_be_visible()
                else:
                    expect(self.page.get_by_text('Không tìm thấy hồ sơ thú cưng', exact=True)).to_be_visible()
                expect(self.page.get_by_text('Nhật ký nội trú', exact=True)).to_have_count(0)
        self.assertFalse(any(path.startswith(STAYS) for path, _ in self.reads))
        self.assertEqual(self.writes, [])

    def test_owner_cannot_visit_vet_inpatient_route(self):
        self.login('PetOwner')
        self.page.goto(BASE + ORIGIN_STAY)
        expect(self.page).to_have_url(re.compile(re.escape(BASE) + r'/dashboard(?:\?|$)'))
        expect(action(self.page, 'Xem hồ sơ')).to_have_count(0)
        self.assertFalse(any(path.startswith(STAYS) for path, _ in self.reads))
        self.assertEqual(self.writes, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
