"""Journey sharing regression: API/XHR/fetch fully intercepted, no live BE writes."""
import copy
import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect

BASE = 'http://localhost:3000'
PET_ID = '000000000000000000000055'
ORDER_IDS = ['000000000000000000000061', '000000000000000000000062']
USER = {'_id': '000000000000000000000053', 'fullName': 'Nguyễn Minh Anh', 'role': 'PetOwner', 'status': 'Active', 'isEmailVerified': True}
PET = {'_id': PET_ID, 'code': 'PET-BONG', 'name': 'Bông', 'species': 'Mèo', 'breed': 'Anh lông ngắn', 'status': 'Active', 'owner': USER['_id'], 'createdAt': '2026-11-20T08:00:00Z'}
MILESTONES = [{'orderId': oid, 'date': '2026-11-20', 'title': title, 'services': [title]} for oid, title in zip(ORDER_IDS, ['Tiêm phòng cho Bông', 'Chăm sóc lông cho Bông'])]
PAGE = {'page': 1, 'limit': 10, 'total': 0, 'totalPages': 0}

class JourneySharingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()
        cls.addClassCleanup(cls.pw.stop)
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.pet = copy.deepcopy(PET)
        self.milestones = copy.deepcopy(MILESTONES)
        self.writes, self.errors, self.unexpected, self.feed_queries = [], [], [], []
        self.published, self.fail_share = False, False
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1000}, service_workers='block')
        self.addCleanup(self.context.close)
        self.context.route('**/*', self.guard)
        self.page = self.context.new_page()
        self.page.set_default_timeout(8000)
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.assertEqual(self.unexpected, [])

    def post(self):
        return {'_id': '000000000000000000000071', 'authorId': USER, 'petId': self.pet,
                'postType': 'TimelineShare', 'status': 'Published' if self.published else 'PendingReview',
                'content': 'Những ngày khỏe mạnh của Bông', 'timelineItems': [{'date': '2026-11-20', 'title': MILESTONES[0]['title']}],
                'likeCount': 0, 'commentCount': 0, 'createdAt': '2026-11-25T04:00:00Z', 'updatedAt': '2026-11-25T04:00:00Z'}

    def guard(self, route):
        req = route.request
        parsed = urlsplit(req.url)
        path = parsed.path
        if path.startswith('/api/') or req.resource_type in ('fetch', 'xhr'):
            if req.method == 'POST' and path == '/api/community-posts/timeline-share':
                self.writes.append(req.post_data_json)
                if self.fail_share:
                    return route.fulfill(status=503, json={'message': 'Chưa gửi được bài chia sẻ, vui lòng thử lại.'})
                return route.fulfill(json={'message': 'Đã gửi bài chia sẻ, vui lòng chờ duyệt.', 'post': self.post()})
            if req.method != 'GET':
                self.unexpected.append((req.method, path))
                return route.fulfill(status=501, json={})
            if path == '/api/pets':
                return route.fulfill(json={'items': [self.pet], 'total': 1, 'page': 1, 'totalPages': 1})
            if path == f'/api/pets/{PET_ID}':
                return route.fulfill(json={'pet': self.pet, 'appointmentNotes': []})
            if path == f'/api/pets/{PET_ID}/timeline':
                return route.fulfill(json={'pet': self.pet, 'summary': {'totalVisits': 0, 'completedVisits': 0, 'activeVisits': 0, 'totalMedicalRecords': 0, 'totalGroomingNotes': 0, 'totalInpatientStays': 0, 'hasActiveInpatient': False}, 'activeInpatient': None, 'sharedPosts': [], 'aiAssessments': [], 'timeline': [], 'pagination': PAGE})
            if path == '/api/community-posts/timeline-share/preview':
                self.assertEqual(parse_qs(parsed.query).get('petId'), [PET_ID])
                return route.fulfill(json={'pet': self.pet, 'milestones': self.milestones, 'totalEligible': len(self.milestones), 'truncated': False})
            if path == '/api/community-posts/public':
                self.feed_queries.append(parse_qs(parsed.query))
                posts = [self.post()] if self.published else []
                return route.fulfill(json={'posts': posts, 'pagination': {**PAGE, 'total': len(posts), 'totalPages': len(posts)}})
            if path.endswith('/like-status'):
                return route.fulfill(json={'liked': False, 'likeCount': 0})
            if path in ('/api/auth/me', '/api/users/me'):
                return route.fulfill(json={'user': USER, 'data': USER})
            if path in ('/api/appointment-orders/me', '/api/appointment-orders', '/api/services', '/api/appointment-services'):
                return route.fulfill(json={'items': [], 'data': [], 'services': [], 'pagination': PAGE})
            self.unexpected.append((req.method, path))
            return route.fulfill(status=501, json={})
        if req.url.startswith(BASE + '/') and req.method == 'GET':
            return route.continue_()
        return route.abort()

    def login(self, role='PetOwner'):
        user = {**USER, 'role': role}
        self.context.add_init_script(f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});localStorage.setItem('token', 'fictional-share-token');sessionStorage.setItem('hasLoadedBefore', 'true');")

    def journey(self):
        self.login()
        self.page.goto(BASE + f'/dashboard?tab=journey&pet={PET_ID}')
        expect(self.page.get_by_role('heading', name='Hành trình của Bông', exact=True)).to_be_visible()

    def open_share(self):
        self.page.get_by_role('button', name=re.compile(r'^.*Chia sẻ hành trình$')).click()
        modal = self.page.get_by_role('dialog')
        expect(modal.get_by_text('Tiêm phòng cho Bông', exact=True)).to_be_visible()
        return modal

    def test_community_entry_opens_journey_and_selected_pet_share(self):
        self.login()
        self.page.goto(BASE + '/community?tab=timeline')
        self.page.get_by_role('button', name=re.compile(r'Chia sẻ hành trình của bé$')).click()
        expect(self.page).to_have_url(BASE + '/dashboard?tab=journey')
        modal = self.open_share()
        expect(modal.get_by_text(re.compile('Bệnh án, đơn thuốc và giá tiền không được đăng'))).to_be_visible()
        modal.get_by_role('button', name='Bỏ chọn tất cả', exact=True).click()
        expect(modal.get_by_role('button', name='Đồng ý chia sẻ', exact=True)).to_be_disabled()
        modal.get_by_role('button', name='Hủy', exact=True).click()
        self.assertEqual(self.writes, [])

    def test_selected_milestone_pending_then_published_in_correct_feed(self):
        self.journey()
        modal = self.open_share()
        modal.get_by_role('checkbox', name=re.compile('Chăm sóc lông cho Bông')).uncheck()
        modal.get_by_label('Lời nhắn (không bắt buộc)').fill(' Những ngày khỏe mạnh của Bông ')
        modal.get_by_role('button', name='Đồng ý chia sẻ', exact=True).click()
        expect(modal).to_have_count(0)
        expect(self.page.get_by_text('Đã gửi hành trình lên cộng đồng, đang chờ duyệt', exact=True)).to_be_visible()
        self.assertEqual(self.writes, [{'petId': PET_ID, 'orderIds': [ORDER_IDS[0]], 'content': 'Những ngày khỏe mạnh của Bông'}])
        expect(self.page.get_by_role('link', name='Theo dõi bài viết của tôi', exact=True)).to_have_attribute('href', '/community/my-posts')
        self.page.get_by_role('link', name='Xem hành trình được chia sẻ', exact=True).click()
        expect(self.page).to_have_url(BASE + '/community?tab=timeline')
        expect(self.page.get_by_role('tab', name='Hành trình được chia sẻ', exact=True)).to_have_attribute('aria-selected', 'true')
        expect(self.page.get_by_text('Những ngày khỏe mạnh của Bông', exact=True)).to_have_count(0)
        self.assertEqual(self.feed_queries[-1]['postType'], ['TimelineShare'])
        # Simulate an admin approving the post; no real moderation request is made.
        self.published = True
        self.page.reload()
        expect(self.page.get_by_text('Những ngày khỏe mạnh của Bông', exact=True)).to_be_visible()
        expect(self.page.get_by_role('listitem').filter(has_text='Tiêm phòng cho Bông')).to_be_visible()
        folder = Path(__file__).parent / 'screenshots'
        folder.mkdir(exist_ok=True)
        self.page.screenshot(path=str(folder / 'feedback-25-shared-journey.png'), full_page=True)

    def test_no_completed_visits_disables_submission(self):
        self.milestones = []
        self.journey()
        self.page.get_by_role('button', name=re.compile(r'^.*Chia sẻ hành trình$')).click()
        modal = self.page.get_by_role('dialog')
        expect(modal.get_by_text('Bông chưa có lượt khám hoặc dịch vụ nào hoàn tất để chia sẻ.')).to_be_visible()
        expect(modal.get_by_role('button', name='Đồng ý chia sẻ', exact=True)).to_be_disabled()
        self.assertEqual(self.writes, [])

    def test_failure_keeps_message_and_does_not_claim_success(self):
        self.fail_share = True
        self.journey()
        modal = self.open_share()
        field = modal.get_by_label('Lời nhắn (không bắt buộc)')
        field.fill('Kỷ niệm của Bông')
        modal.get_by_role('button', name='Đồng ý chia sẻ', exact=True).click()
        expect(modal.locator('.ant-alert-error')).to_contain_text('Chưa gửi được bài chia sẻ')
        expect(field).to_have_value('Kỷ niệm của Bông')
        expect(self.page.get_by_text('Đã gửi hành trình lên cộng đồng, đang chờ duyệt', exact=True)).to_have_count(0)
        self.assertEqual(len(self.writes), 1)

    def test_archived_pet_and_staff_have_no_share_action(self):
        self.pet['status'] = 'Deleted'
        self.journey()
        expect(self.page.get_by_role('button', name=re.compile('Chia sẻ hành trình'))).to_have_count(0)
        self.assertEqual(self.writes, [])

    def test_staff_community_remains_read_only(self):
        self.login('Receptionist')
        self.published = True
        self.page.goto(BASE + '/community?tab=timeline')
        expect(self.page.get_by_text('Những ngày khỏe mạnh của Bông', exact=True)).to_be_visible()
        expect(self.page.get_by_role('button', name=re.compile('Chia sẻ hành trình'))).to_have_count(0)
        self.assertEqual(self.writes, [])

if __name__ == '__main__':
    unittest.main()
