"""Browser regression tests against Vite with VITE_API_ROOT=/api."""
import json
import os
import re
import unittest
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

BASE_URL = os.getenv('FE_BASE_URL', 'http://localhost:3000')
DAY = '2026-11-12'
OWNER = '6ad96d4a9664da6b2c0d8d61'
PET = '6ad96d4a9664da6b2c0d8d70'
ORDER = '6ad96d4a9664da6b2c0d8a01'
FIRST = '6ad96d4a9664da6b2c0d8e01'
SECOND = '6ad96d4a9664da6b2c0d8e02'
SHORT = {'_id': FIRST, 'name': 'Khám tổng quát', 'category': 'Examination', 'basePrice': 150000, 'status': 'Active'}
LONG = {'_id': SECOND, 'name': 'Tắm spa cơ bản', 'category': 'Grooming', 'basePrice': 350000, 'status': 'Active', 'defaultDuration': 60}


class AppointmentFeedbackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        channel = os.getenv('PLAYWRIGHT_CHANNEL')
        cls.browser = cls.playwright.chromium.launch(**({'channel': channel} if channel else {}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        context = self.browser.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles')
        self.addCleanup(context.close)
        self.page = context.new_page()
        self.page.set_default_timeout(8000)
        self.page.clock.set_fixed_time(datetime(2026, 11, 12, 2, 30, tzinfo=timezone.utc))  # 09:30 VN
        self.pet = {'_id': PET, 'name': 'Milo', 'species': 'Chó', 'ownerId': OWNER, 'status': 'Active'}
        self.order = {'_id': ORDER, 'code': 'APT-TEST01', 'petId': PET, 'ownerId': OWNER, 'date': DAY,
                      'slotStart': '10:30', 'slotEnd': '13:00', 'derivedStatus': 'Booked', 'isOnline': True}
        self.services = [
            {'_id': FIRST, 'orderId': ORDER, 'serviceId': SHORT, 'sequenceNo': 1, 'status': 'Booked', 'scheduledStart': '10:30', 'scheduledEnd': '11:00'},
            {'_id': SECOND, 'orderId': ORDER, 'serviceId': LONG, 'sequenceNo': 2, 'status': 'Booked', 'scheduledStart': '12:00', 'scheduledEnd': '13:00'},
        ]
        self.bookings = []
        self.other_pet = None
        self.deleted_pet_conflict = False
        self.cancellations = []
        self.refreshes = 0
        self.page.route(f'{BASE_URL}/api/**', self.api)

    def login(self, role, path):
        user = {'_id': OWNER, 'email': 'test@example.test', 'fullName': 'Kiểm thử lịch hẹn',
                'role': role, 'status': 'Active', 'isEmailVerified': True}
        self.page.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
                                  "localStorage.setItem('token', 'mock-access-token');")
        self.page.goto(f'{BASE_URL}{path}')

    def api(self, route):
        url = urlparse(route.request.url)
        path = url.path
        pagination = {'total': 1, 'page': 1, 'limit': 10, 'totalPages': 1}
        if path == '/api/pets':
            route.fulfill(json={'items': [self.pet, self.other_pet] if self.other_pet else [self.pet],
                                'pagination': pagination})
        elif path == '/api/services':
            route.fulfill(json={'services': [SHORT, LONG], 'total': 2})
        elif path in ('/api/appointment-orders', '/api/appointment-orders/me'):
            route.fulfill(json={'data': [self.order], 'pagination': pagination})
        elif path == f'/api/appointment-orders/me/{ORDER}':
            route.fulfill(json={'data': {**self.order, 'services': self.services}})
        elif path == '/api/appointment-services' and parse_qs(url.query).get('orderId') == [ORDER]:
            self.refreshes += 1
            route.fulfill(json={'data': self.services})
        elif path == f'/api/appointment-orders/{ORDER}/cancel':
            self.cancellations.append(route.request.post_data_json)
            reason = self.cancellations[-1]['reason']
            self.order.update(derivedStatus='Cancelled', cancelReason=reason)
            for service in self.services:
                service.update(status='Cancelled', cancelReason=reason)
            route.fulfill(json={'data': self.order, 'message': 'Hủy lịch hẹn thành công'})
        elif path == '/api/appointment-services/online-booking':
            self.bookings.append(route.request.post_data_json)
            payload = self.bookings[-1]
            if self.deleted_pet_conflict and payload['petId'] == PET:
                return route.fulfill(status=400, json={
                    'message': 'Không thể đặt lịch cho thú cưng đã bị xóa khỏi hồ sơ',
                })
            route.fulfill(status=201, json={'message': 'Đặt lịch online thành công', 'data': {
                'appointment': {**self.order, 'date': payload['date'], 'slotStart': payload['slotStart'], 'slotEnd': '18:00'},
                'services': self.services,
            }})
        elif path in ('/api/users/staff', '/api/cages'):
            route.fulfill(json={'items': []})
        else:
            route.fulfill(status=404, json={'message': f'Unmocked: {path}'})

    def pick_date(self, day):
        date = self.page.get_by_placeholder('Chọn ngày hẹn khám (từ hôm nay)')
        date.fill(day)
        date.press('Enter')
        expect(date).to_have_value(day)

    def pick_service(self, name):
        self.page.locator('.ant-select-multiple').click()
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text=name).click()
        self.page.keyboard.press('Escape')

    def test_required_slot_recalculates_and_sends_only_start(self):
        self.login('PetOwner', '/dashboard?tab=appointments&book=new')
        slot = self.page.get_by_role('combobox', name='Giờ hẹn', exact=True)
        submit = self.page.get_by_role('button', name='Xác nhận đặt lịch hẹn')
        expect(slot).to_be_disabled()
        self.pick_service('Khám tổng quát')
        self.pick_date('12/11/2026')
        submit.click()
        expect(self.page.locator('#booking-slot-error')).to_have_text('Vui lòng chọn giờ hẹn')
        self.assertEqual(self.bookings, [])

        slot.press("ArrowDown")
        expect(self.page.get_by_role('option', name=re.compile('^09:30'))).to_have_class(re.compile('ant-select-item-option-disabled'))
        self.page.get_by_role('option', name='17:30', exact=True).click()
        expect(self.page.get_by_text('17:30 – 18:00 (30 phút)')).to_be_visible()
        self.pick_service('Tắm spa cơ bản')
        expect(self.page.locator('#booking-slot-error')).to_contain_text('vượt quá giờ đóng cửa')
        expect(self.page.get_by_text('17:30 – 18:00 (30 phút)')).to_have_count(0)
        submit.click()
        self.assertEqual(self.bookings, [])

        self.pick_date('13/11/2026')
        slot.press("ArrowDown")
        expect(self.page.get_by_role('option', name='09:30', exact=True)).to_be_enabled()
        expect(self.page.get_by_role('option', name=re.compile('^17:00'))).to_have_class(re.compile('ant-select-item-option-disabled'))
        self.page.get_by_role('option', name='16:30', exact=True).click()
        expect(self.page.get_by_text('16:30 – 18:00 (90 phút)')).to_be_visible()
        submit.click()
        expect(self.page.get_by_text('Đặt Lịch Hẹn Thành Công!')).to_be_visible()
        expect(self.page.get_by_text('16:30 - 18:00', exact=True)).to_be_visible()
        self.assertEqual(self.bookings, [{
            'petId': PET, 'date': '2026-11-13', 'slotStart': '16:30', 'services': [
                {'serviceId': FIRST, 'sequenceNo': 1, 'isEmergency': False},
                {'serviceId': SECOND, 'sequenceNo': 2, 'isEmergency': False},
            ],
        }])

    def test_link_to_deleted_pet_requires_explicit_selection(self):
        self.pet['status'] = 'Deleted'
        self.other_pet = {**self.pet, '_id': '000000000000000000000042', 'name': 'Cún QA', 'status': 'Active'}
        self.login('PetOwner', f'/dashboard?tab=appointments&book={PET}')
        expect(self.page.get_by_text('Chọn thú cưng cần đặt lịch', exact=True)).to_be_visible()
        pet = self.page.get_by_role('combobox', name='Thú cưng cần đặt lịch')
        pet.press('ArrowDown')
        expect(self.page.get_by_role('option', name=re.compile('Bé Milo'))).to_have_count(0)
        expect(self.page.get_by_role('option', name=re.compile('Bé Cún QA'))).to_have_count(1)
        self.assertEqual(self.bookings, [])

    def test_deleted_pet_rejection_clears_only_pet_requires_explicit_selection(self):
        self.deleted_pet_conflict = True
        self.other_pet = {**self.pet, '_id': '000000000000000000000042', 'name': 'Cún QA'}
        self.login('PetOwner', f'/dashboard?tab=appointments&book={PET}')
        self.pick_service('Khám tổng quát')
        self.pick_date('13/11/2026')
        slot = self.page.get_by_role('combobox', name='Giờ hẹn', exact=True)
        slot.press('ArrowDown')
        self.page.get_by_role('option', name='16:30', exact=True).click()
        note = self.page.locator('textarea').first
        note.fill('Giữ nguyên ghi chú QA')
        submit = self.page.get_by_role('button', name='Xác nhận đặt lịch hẹn')
        submit.click()
        expect(self.page.get_by_text('Vui lòng chọn lại thú cưng còn hoạt động.')).to_be_visible()
        expect(self.page.get_by_placeholder('Chọn ngày hẹn khám (từ hôm nay)')).to_have_value('13/11/2026')
        expect(self.page.get_by_text('16:30 – 17:00 (30 phút)')).to_be_visible()
        expect(note).to_have_value('Giữ nguyên ghi chú QA')
        self.assertEqual(len(self.bookings), 1, 'Do not submit for another pet automatically')
        pet = self.page.get_by_role('combobox', name='Thú cưng cần đặt lịch')
        pet.press('ArrowDown')
        expect(self.page.get_by_role('option', name=re.compile('Bé Milo'))).to_have_count(0)
        self.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter(has_text='Bé Cún QA').click()
        submit.click()
        expect(self.page.get_by_text('Đặt Lịch Hẹn Thành Công!')).to_be_visible()
        self.assertEqual(self.bookings[-1], {**self.bookings[0], 'petId': self.other_pet['_id']})

    def test_owner_uses_individual_service_cancellation_deadline(self):
        self.login('PetOwner', '/dashboard?tab=appointments')
        row = self.page.get_by_role('row').filter(has_text=self.order['code'])
        expect(row).to_be_visible()
        expect(row.get_by_role('button', name='Hủy lịch')).to_have_count(0)
        row.get_by_role('button', name='Chi tiết').click()
        dialog = self.page.get_by_role('dialog')
        expect(dialog.get_by_text('Tắm spa cơ bản', exact=True)).to_be_visible()
        expect(dialog.get_by_role('button', name='Hủy lịch hẹn', exact=True)).to_have_count(0)
        expect(dialog.get_by_role('button', name='Hủy dịch vụ này', exact=True)).to_have_count(1)

    def test_reception_checks_services_and_refreshes_after_whole_cancellation(self):
        self.order.update(derivedStatus='CheckedIn')
        self.services[0].update(status='InProgress')
        self.services[1].update(status='Waiting')
        self.login('Receptionist', '/clinic/appointments')
        row = self.page.get_by_role('row').filter(has_text=self.order['code'])
        expect(row.get_by_role('button', name='Hủy hẹn')).to_have_count(0)
        row.get_by_role('button', name='Chi tiết').click()
        details = self.page.get_by_role('dialog', name=f"Chi tiết lịch hẹn {self.order['code']}")
        expect(details.get_by_text('1. Khám tổng quát', exact=True)).to_be_visible()
        expect(details.get_by_role('button', name='Hủy hẹn', exact=True)).to_have_count(0)
        expect(details.get_by_role('button', name='Hủy dịch vụ', exact=True)).to_have_count(1)
        self.services[0].update(status='Waiting')
        details.get_by_role('button', name='Close', exact=True).click()
        row.get_by_role('button', name='Chi tiết').click()
        details.get_by_role('button', name='Hủy hẹn', exact=True).click()
        confirm = self.page.get_by_role('dialog', name='Lễ tân hủy lịch hẹn')
        confirm_button = confirm.get_by_role('button', name='Xác nhận hủy')
        expect(confirm_button).to_be_disabled()
        confirm.get_by_placeholder('Vui lòng nhập lý do hủy (1 - 200 ký tự)...').fill('  Khách báo bận  ')
        before = self.refreshes
        confirm_button.click()
        expect(details.get_by_text('Đã hủy', exact=True).first).to_be_visible()
        expect(details.get_by_text('Lý do hủy: Khách báo bận').first).to_be_visible()
        expect(details.get_by_role('button', name='Hủy dịch vụ', exact=True)).to_have_count(0)
        self.assertGreater(self.refreshes, before)
        self.assertEqual(self.cancellations, [{'reason': 'Khách báo bận'}])


if __name__ == '__main__':
    unittest.main()
