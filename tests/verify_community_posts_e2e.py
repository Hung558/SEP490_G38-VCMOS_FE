"""Desktop Chromium E2E for BE #53 community-post owner self-management.

Run against integrated FE only: Vite --host ::1 --port 3000 --strictPort,
VITE_API_ROOT=/api; python tests/verify_community_posts_e2e.py -v.
All BE calls are intercepted and cross-origin/unexpected calls are blocked.
"""
import json
import re
import unittest
from urllib.parse import parse_qs

from playwright.sync_api import expect
from qa_web_fixtures import BASE, OWNER, OTHER_OWNER, PET, TOKEN, fixture_file, install_auth, install_network_guard, launch_browser, parse_multipart

ROOT = '/api/community-posts'
PAGE = '/community/my-posts'
OTHER = '000000000000000000000057'
POST_PENDING = '000000000000000000000058'
POST_PUBLISHED = '000000000000000000000059'
POST_OTHER = '000000000000000000000060'
PET_DATA = {'_id': PET, 'ownerId': OWNER['_id'], 'name': 'Milo Community QA', 'code': 'PET-COM-55', 'species': 'Dog', 'status': 'Active'}


def post(identifier, *, status='PendingReview', text='Bài cộng đồng QA', post_type='Discussion', pet=True):
    return {'_id': identifier, 'authorId': OWNER['_id'], 'petId': PET_DATA if pet else None,
            'postType': post_type, 'content': text, 'imageUrl': None, 'timelineItems': [],
            'status': status, 'moderationNote': '', 'likeCount': 0, 'commentCount': 0,
            'createdAt': '2026-11-18T12:00:00.000Z', 'updatedAt': '2026-11-18T12:00:00.000Z'}


class CommunityPostsE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw, cls.browser = launch_browser()
        cls.addClassCleanup(cls.pw.stop)
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.posts = {POST_PENDING: post(POST_PENDING),
                      POST_PUBLISHED: post(POST_PUBLISHED, status='Published', text='Bài đã duyệt QA'),
                      POST_OTHER: post(POST_OTHER, text='Bài của người khác QA')}
        self.posts[POST_OTHER]['authorId'] = OTHER_OWNER
        self.writes, self.reads, self.unhandled, self.page_errors = [], [], [], []
        self.fail_next_list = False
        self.conflict_create = False
        self.conflict_update = False
        self.conflict_delete = False
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block')
        self.addCleanup(self.ctx.close)
        install_auth(self.ctx)
        install_network_guard(self.ctx, self.route, self.unhandled)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(8000)
        self.page.on('pageerror', lambda err: self.page_errors.append(str(err)))

    def tearDown(self):
        self.assertEqual(self.unhandled, [], 'Unmatched or cross-origin requests are blocked, never forwarded')
        self.assertEqual(self.page_errors, [], 'Uncaught browser exceptions')

    def route(self, route, parsed):
        req, method, path = route.request, route.request.method, parsed.path
        if path == '/api/pets' and method == 'GET':
            self.reads.append((path, parsed.query))
            return route.fulfill(json={'items': [PET_DATA], 'total': 1, 'page': 1, 'limit': 100, 'totalPages': 1})
        if path == ROOT and method == 'GET':
            self.reads.append((path, parsed.query))
            if self.fail_next_list:
                self.fail_next_list = False
                return route.fulfill(status=500, json={})
            query = parse_qs(parsed.query)
            items = list(self.posts.values())
            if query.get('status'):
                items = [p for p in items if p['status'] == query['status'][0]]
            if query.get('postType'):
                items = [p for p in items if p['postType'] == query['postType'][0]]
            items = [p for p in items if p['authorId'] == OWNER['_id']]
            page, limit = int(query.get('page', ['1'])[0]), int(query.get('limit', ['10'])[0])
            start = (page - 1) * limit
            return route.fulfill(json={'posts': items[start:start+limit],
                'pagination': {'page': page, 'limit': limit, 'total': len(items),
                               'totalPages': (len(items)+limit-1)//limit}})
        detail = re.fullmatch(ROOT + r'/([0-9a-f]{24})', path)
        if detail and method == 'GET':
            identifier = detail[1]
            value = self.posts.get(identifier)
            self.reads.append((path, parsed.query))
            if not value or value['authorId'] != OWNER['_id']:
                return route.fulfill(status=404, json={'message': 'Không tìm thấy bài viết'})
            return route.fulfill(json={'post': value})
        if path == ROOT and method == 'POST':
            fields, files = parse_multipart(req)
            self.writes.append((method, path, fields, files))
            if self.conflict_create:
                return route.fulfill(status=409, json={'message': 'Xung đột trạng thái'})
            new = post(OTHER, text=fields.get('content', ''), post_type=fields.get('postType', 'Discussion'), pet=bool(fields.get('petId')))
            new['petId'] = PET_DATA if fields.get('petId') == PET else None
            if fields.get('timelineItems'):
                new['timelineItems'] = json.loads(fields['timelineItems'])
                for item in new['timelineItems']:
                    if 'imageIndex' in item:
                        item['imageUrl'] = f'https://images.example.test/timeline-{item["imageIndex"]}.png'
                        del item['imageIndex']
            if any(name == 'image' for name, _, _ in files):
                new['imageUrl'] = 'https://images.example.test/cover.png'
            self.posts[OTHER] = new
            return route.fulfill(status=201, json={'message': 'Đã gửi bài viết, vui lòng chờ duyệt', 'post': new})
        if detail and method == 'PUT':
            fields, files = parse_multipart(req)
            self.writes.append((method, path, fields, files))
            current = self.posts.get(detail[1])
            if not current or current['authorId'] != OWNER['_id']:
                return route.fulfill(status=404, json={'message': 'Không tìm thấy bài viết'})
            if self.conflict_update or current['status'] != 'PendingReview':
                return route.fulfill(status=409, json={'message': 'Chỉ có thể thao tác với bài viết đang chờ duyệt'})
            current['content'] = fields.get('content', '')
            if 'image' in [name for name, _, _ in files]: current['imageUrl'] = 'https://images.example.test/updated.png'
            elif fields.get('imageUrl') == current.get('imageUrl'): pass
            else: current['imageUrl'] = None
            if fields.get('timelineItems'): current['timelineItems'] = json.loads(fields['timelineItems'])
            return route.fulfill(json={'message': 'Cập nhật bài viết thành công', 'post': current})
        if detail and method == 'DELETE':
            self.writes.append((method, path, None, []))
            current = self.posts.get(detail[1])
            if not current or current['authorId'] != OWNER['_id']:
                return route.fulfill(status=404, json={'message': 'Không tìm thấy bài viết'})
            if self.conflict_delete or current['status'] != 'PendingReview':
                return route.fulfill(status=409, json={'message': 'Chỉ có thể thao tác với bài viết đang chờ duyệt'})
            current['status'] = 'Removed'
            return route.fulfill(json={'message': 'Đã xoá bài viết'})
        self.unhandled.append((method, path, parsed.query))
        return route.fulfill(status=501, json={'message': f'Fixture thiếu {method} {path}'})

    def open_page(self):
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith(ROOT)) as response:
            self.page.goto(BASE + PAGE)
        self.assertEqual(response.value.status, 200)
        expect(self.page.get_by_role('heading', name='Bài viết của tôi')).to_be_visible()

    def test_list_filters_own_posts_and_details_lock_non_pending(self):
        self.open_page()
        expect(self.page.get_by_text('Bài cộng đồng QA', exact=True)).to_be_visible()
        expect(self.page.get_by_text('Bài đã duyệt QA', exact=True)).to_be_visible()
        expect(self.page.get_by_text('Bài của người khác QA', exact=True)).to_have_count(0)
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith(ROOT + '/' + POST_PUBLISHED)) as detail_resp:
            self.page.get_by_role('button', name='Xem bài Bài đã duyệt QA').click()
        self.assertEqual(detail_resp.value.status, 200)
        dialog = self.page.get_by_role('dialog', name='Chi tiết bài viết của tôi')
        expect(dialog.get_by_text('Bài không còn chờ duyệt nên không thể chỉnh sửa hoặc xóa.')).to_be_visible()
        expect(dialog.get_by_role('button', name='Sửa bài viết')).to_have_count(0)
        expect(dialog.get_by_role('button', name='Xóa bài viết')).to_have_count(0)
        self.assertTrue(any(path == ROOT and 'page=1' in q and 'limit=10' in q for path, q in self.reads))

    def test_filters_are_server_side_and_start_at_first_page(self):
        self.open_page()
        status = self.page.get_by_role('combobox', name='Lọc trạng thái duyệt bài')
        status.click()
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith(ROOT)) as filtered:
            status.press('ArrowDown')
            status.press('Enter')
        query = parse_qs(filtered.value.url.split('?', 1)[1])
        self.assertEqual(query.get('status'), ['Published'])
        self.assertEqual(query.get('page'), ['1'])
        expect(self.page.get_by_text('Bài đã duyệt QA', exact=True)).to_be_visible()
        expect(self.page.get_by_text('Bài cộng đồng QA', exact=True)).to_have_count(0)

    def test_update_conflict_keeps_existing_draft_without_resubmitting(self):
        self.conflict_update = True
        self.open_page()
        self.page.get_by_role('button', name='Xem bài Bài cộng đồng QA').click()
        detail = self.page.get_by_role('dialog', name='Chi tiết bài viết của tôi')
        detail.get_by_role('button', name='Sửa bài viết').click()
        editor = self.page.get_by_role('dialog', name='Sửa bài viết đang chờ duyệt')
        content = editor.get_by_label(re.compile('Nội dung'))
        content.fill('Nội dung đã sửa nhưng conflict vẫn phải giữ QA')
        with self.page.expect_response(lambda r: r.request.method == 'PUT' and r.url.endswith(ROOT + '/' + POST_PENDING)) as response:
            editor.get_by_role('button', name='Lưu thay đổi').click()
        self.assertEqual(response.value.status, 409)
        expect(editor.get_by_text(re.compile('Bài viết không còn chờ duyệt'))).to_be_visible()
        expect(content).to_have_value('Nội dung đã sửa nhưng conflict vẫn phải giữ QA')
        self.assertEqual([row[0] for row in self.writes], ['PUT'])

    def test_list_error_can_be_retried_without_leaving_page(self):
        self.fail_next_list = True
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith(ROOT)) as first:
            self.page.goto(BASE + PAGE)
        self.assertEqual(first.value.status, 500)
        expect(self.page.get_by_role('alert').get_by_text('Không tải được bài viết.')).to_be_visible()
        with self.page.expect_response(lambda r: r.request.method == 'GET' and r.url.split('?')[0].endswith(ROOT)) as retry:
            self.page.get_by_role('button', name='Thử lại').click()
        self.assertEqual(retry.value.status, 200)
        expect(self.page.get_by_text('Bài cộng đồng QA', exact=True)).to_be_visible()

    def test_create_discussion_uses_multipart_and_waiting_state(self):
        self.open_page()
        self.page.get_by_role('button', name='Viết bài mới').click()
        dialog = self.page.get_by_role('dialog', name='Viết bài mới')
        dialog.get_by_label(re.compile('Nội dung')).fill('  Nội dung thảo luận E2E  ')
        with self.page.expect_response(lambda r: r.request.method == 'POST' and r.url.endswith(ROOT)) as response:
            dialog.get_by_role('button', name='Gửi bài chờ duyệt').click()
        self.assertEqual(response.value.status, 201)
        method, path, fields, files = self.writes[-1]
        self.assertEqual((method, path), ('POST', ROOT))
        self.assertEqual(fields, {'postType': 'Discussion', 'content': 'Nội dung thảo luận E2E'})
        self.assertEqual(files, [])
        expect(self.page.get_by_role('status').get_by_text('Đã gửi bài viết, vui lòng chờ duyệt')).to_be_visible()
        self.assertNotIn('status', fields)
        self.assertNotIn('authorId', fields)

    def test_timeline_share_maps_uploaded_image_by_index(self):
        self.open_page()
        self.page.get_by_role('button', name='Viết bài mới').click()
        dialog = self.page.get_by_role('dialog', name='Viết bài mới')
        dialog.get_by_label('Loại bài viết').select_option(label='Chia sẻ hành trình')
        dialog.get_by_label(re.compile('Thú cưng')).select_option(PET)
        dialog.get_by_label(re.compile('Nội dung')).fill('Hành trình QA')
        dialog.get_by_label('Ảnh bìa (không bắt buộc)').set_input_files(fixture_file('cover.png'))
        dialog.get_by_label('Ngày (bắt buộc)').fill('2026-11-18')
        dialog.get_by_label(re.compile('Tiêu đề')).fill('Ngày đầu tiên QA')
        dialog.get_by_label('Ảnh mốc 1 (không bắt buộc)').set_input_files(fixture_file('day-one.png'))
        with self.page.expect_response(lambda r: r.request.method == 'POST' and r.url.endswith(ROOT)) as response:
            dialog.get_by_role('button', name='Gửi bài chờ duyệt').click()
        self.assertEqual(response.value.status, 201)
        _, _, fields, files = self.writes[-1]
        self.assertEqual(fields['postType'], 'TimelineShare')
        self.assertEqual(fields['petId'], PET)
        self.assertEqual(json.loads(fields['timelineItems']), [{'date': '2026-11-18', 'title': 'Ngày đầu tiên QA', 'imageIndex': 0}])
        self.assertEqual([name for name, _, _ in files], ['image', 'timelineImages'])

    def test_conflict_preserves_draft_and_does_not_retry_automatically(self):
        self.conflict_create = True
        self.open_page()
        self.page.get_by_role('button', name='Viết bài mới').click()
        dialog = self.page.get_by_role('dialog', name='Viết bài mới')
        content = dialog.get_by_label(re.compile('Nội dung'))
        content.fill('Giữ nguyên nội dung khi server conflict QA')
        with self.page.expect_response(lambda r: r.request.method == 'POST' and r.url.endswith(ROOT)) as response:
            dialog.get_by_role('button', name='Gửi bài chờ duyệt').click()
        self.assertEqual(response.value.status, 409)
        expect(dialog.get_by_text(re.compile('Bài viết không còn chờ duyệt'))).to_be_visible()
        expect(content).to_have_value('Giữ nguyên nội dung khi server conflict QA')
        self.assertEqual(len(self.writes), 1)

    def test_delete_requires_confirmation_and_soft_removes(self):
        self.open_page()
        self.page.get_by_role('button', name='Xem bài Bài cộng đồng QA').click()
        dialog = self.page.get_by_role('dialog', name='Chi tiết bài viết của tôi')
        dialog.get_by_role('button', name='Xóa bài viết').click()
        confirm = self.page.get_by_role('dialog', name='Xóa bài viết đang chờ duyệt?')
        expect(confirm).to_be_visible()
        self.assertEqual(self.writes, [])
        confirm.get_by_role('button', name='Giữ bài viết').click()
        expect(confirm).to_have_count(0)
        self.assertEqual(self.writes, [])
        dialog.get_by_role('button', name='Xóa bài viết').click()
        confirm = self.page.get_by_role('dialog', name='Xóa bài viết đang chờ duyệt?')
        with self.page.expect_response(lambda r: r.request.method == 'DELETE' and r.url.endswith(ROOT + '/' + POST_PENDING)) as response:
            confirm.get_by_role('button', name='Xác nhận xóa').click()
        self.assertEqual(response.value.status, 200)
        self.assertEqual(self.posts[POST_PENDING]['status'], 'Removed')
        self.assertEqual([row[0] for row in self.writes], ['DELETE'])

    def test_non_owner_cannot_use_my_posts_route(self):
        self.ctx.clear_cookies()
        install_auth(self.ctx, 'Veterinarian')
        self.page.goto(BASE + PAGE)
        expect(self.page).not_to_have_url(BASE + PAGE)
        expect(self.page.get_by_role('button', name='Viết bài mới')).to_have_count(0)
        self.assertFalse(any(path.startswith(ROOT) for path, _ in self.reads))
        self.assertEqual(self.writes, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
