"""Desktop SOAP gate regression. Vite on 127.0.0.1:3185, VITE_API_ROOT=/api; synthetic requests only."""
import json
import re
import unittest
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

BASE = 'http://127.0.0.1:3185'
ID, ORDER, PET, VET, TASK = [f'{n:024x}' for n in range(90, 95)]
RECORD = f'/api/medical-records/service/{ID}'
GATE = 'Không thể hoàn tất ca khám khi vẫn còn chỉ định cận lâm sàng (Sub-task) chưa hoàn thành'


class SubtaskSoapTest(unittest.TestCase):
    def test_conflict_preserves_unsaved_soap_and_completed_result_allows_retry(self):
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block')
            user = {'_id': VET, 'role': 'Veterinarian', 'fullName': 'Bác sĩ QA', 'isEmailVerified': True, 'status': 'Active'}
            ctx.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                                "localStorage.setItem('token', 'qa-fixture-only');"
                                "sessionStorage.setItem('hasLoadedBefore', 'true');")
            page = ctx.new_page()
            page.set_default_timeout(8500)
            writes, unexpected, errors = [], [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            completed, exam_done = False, False
            soap = {'subjectiveNote': 'Đã hỏi bệnh', 'objectiveNote': 'Đã quan sát', 'assessment': 'Đánh giá', 'plan': 'Theo dõi'}
            record = {'_id': ID, 'appointmentServiceId': ID, 'petId': {'_id': PET, 'name': 'Milo'},
                      'status': 'Draft', 'prescriptions': [], **soap}

            def handle(route):
                nonlocal exam_done
                req = route.request
                url = urlsplit(req.url)
                path, method = url.path, req.method
                if f'{url.scheme}://{url.netloc}' != BASE:
                    return route.abort()
                if not path.startswith('/api/') and method == 'GET' and req.resource_type not in ('xhr', 'fetch'):
                    return route.continue_()
                if method == 'GET':
                    if path == '/api/appointment-services/my-queue':
                        return route.fulfill(json={'data': [{'_id': ID, 'status': 'Done' if exam_done else 'InProgress',
                            'assignedStaffId': VET, 'serviceId': {'name': 'Khám QA', 'category': 'Examination'},
                            'orderId': {'_id': ORDER, 'petId': PET, 'code': 'APT-QA', 'date': '2026-11-13', 'derivedStatus': 'InProgress'}}]})
                    if path == RECORD:
                        return route.fulfill(json=record)
                    if path == '/api/products':
                        return route.fulfill(json={'data': {'items': []}})
                    if path == '/api/cages':
                        return route.fulfill(json={'data': []})
                    if path == '/api/users/staff':
                        return route.fulfill(json={'items': [], 'pagination': {'totalPages': 0}})
                    task = {'_id': TASK, 'requestedById': VET, 'taskType': 'Xét nghiệm QA',
                            'status': 'Completed' if completed else 'InProgress', 'resultText': 'Đã có kết quả QA'}
                    if path == f'/api/subtask-requests/service/{ID}':
                        return route.fulfill(json={'data': [task]})
                    if path == f'/api/subtask-requests/{TASK}':
                        return route.fulfill(json={'data': task})
                if method == 'POST' and path == f'{RECORD}/complete':
                    writes.append(req.post_data_json)
                    if not completed:
                        return route.fulfill(status=409, json={'message': GATE})
                    exam_done = True
                    return route.fulfill(json={'medicalRecord': {**record, **writes[-1]}, 'appointmentService': {'status': 'Done'},
                        'appointmentOrder': {'derivedStatus': 'WaitOwner'}})
                unexpected.append((method, path))
                return route.fulfill(status=501, json={'message': 'Unexpected fixture request'})

            ctx.route('**/*', handle)
            page.goto(f'{BASE}/clinic/exam/{ID}')
            draft = page.locator('textarea').first
            draft.fill('Bản nháp chưa lưu — QA')

            def finish_exam():
                page.get_by_role('button', name=re.compile(r'Hoàn tất ca khám$')).click()
                dialog = page.get_by_role('dialog', name=re.compile('Hoàn tất ca khám'))
                with page.expect_response(lambda res: urlsplit(res.url).path == f'{RECORD}/complete' and res.request.method == 'POST') as event:
                    dialog.get_by_role('button', name='Hoàn tất', exact=True).click()
                return event.value.status

            self.assertEqual(finish_exam(), 409)
            expect(page.get_by_role('alert').filter(has_text=GATE)).to_be_visible()
            expect(draft).to_have_value('Bản nháp chưa lưu — QA')
            completed = True  # Completion in another staff session
            page.get_by_role('button', name='Cận lâm sàng', exact=True).click()
            tasks = page.get_by_role('dialog', name='Cận lâm sàng và dịch vụ phụ')
            tasks.get_by_role('button', name='Xem chi tiết').click()
            detail = page.get_by_role('dialog', name='Chi tiết chỉ định')
            expect(detail.get_by_text('Đã có kết quả QA', exact=True)).to_be_visible()
            detail.get_by_role('button', name='Close').click()
            tasks.get_by_role('button', name='Close').click()
            self.assertEqual(finish_exam(), 200)
            expect(page.get_by_text('Ca khám đã hoàn tất.', exact=True)).to_be_visible()
            self.assertEqual([item['subjectiveNote'] for item in writes], ['Bản nháp chưa lưu — QA'] * 2)
            self.assertEqual(unexpected, [])
            self.assertEqual(errors, [])
            browser.close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
