import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCommentToThread,
  appendCommentPage,
  authorName,
  buildCommentBody,
  buildReportBody,
  buildTimelineSharePayload,
  canInteractInCommunity,
  canWithdrawPost,
  COMMENT_MAX_LENGTH,
  FEED_TABS,
  feedTabFromParam,
  feedTabToParam,
  formatMilestoneDate,
  isOwnContent,
  pageFromParam,
  readCommunityError,
  removeCommentFromThread,
  REPORT_REASON_MAX_LENGTH,
  validateShareSelection,
} from '../src/services/CommunityService/helpers.ts';
import {
  apiCommunityComment,
  apiCommunityPostComments,
  apiCommunityPostLike,
  apiCommunityPostLikeStatus,
  apiCommunityPostWithdraw,
  apiCommunityReports,
  apiPublicCommunityPost,
  apiPublicCommunityPosts,
  apiTimelineShare,
  apiTimelineSharePreview,
} from '../src/services/CommunityService/urls.ts';
import {
  buildModerationBody,
  buildModerationPostsQuery,
  buildReportsQuery,
  buildResolveBody,
  isReportedComment,
  isResolveNoteRequired,
  MODERATION_POST_FILTERS,
  REPORT_DECISIONS,
  validateModerationNote,
  validateResolveNote,
} from '../src/services/CommunityModerationService/helpers.ts';
import {
  apiModeratePost,
  apiModerationPosts,
  apiModerationReports,
  apiResolveReport,
} from '../src/services/CommunityModerationService/urls.ts';

const POST_ID = '6671aa00bb11cc22dd33ee44';
const ROOT_ID = '6671aa00bb11cc22dd33ee01';
const REPLY_ID = '6671aa00bb11cc22dd33ee02';
const OWNER_ID = '665f1c2e9a1b2c3d4e5f6a7b';
const comment = (id, override = {}) => ({
  _id: id,
  postId: POST_ID,
  authorId: { _id: OWNER_ID, fullName: 'Chủ nuôi A' },
  parentCommentId: null,
  content: `Bình luận ${id}`,
  status: 'Published',
  createdAt: '2026-11-21T03:00:00.000Z',
  ...override,
});

// Nghiệp vụ 3.4: tab 1 = shared timelines, tab 2 = discussions
test('the two community tabs map to the BE postType and back through ?tab=', () => {
  assert.deepEqual(
    FEED_TABS.map(tab => tab.key),
    ['TimelineShare', 'Discussion']
  );
  for (const tab of FEED_TABS)
    assert.equal(feedTabFromParam(feedTabToParam(tab.key)), tab.key);
  assert.equal(feedTabFromParam(null), 'TimelineShare');
  assert.equal(feedTabFromParam('Discussion'), 'TimelineShare');
  assert.equal(pageFromParam('3'), 3);
  for (const bad of [null, '', '0', '-2', '1.5', 'abc']) {
    assert.equal(pageFromParam(bad), 1);
  }
});

// BE: authorize('PetOwner') on like, comment, report, withdraw and share
test('only a pet owner interacts; guests and clinic staff read only', () => {
  assert.equal(canInteractInCommunity('PetOwner'), true);
  assert.equal(canInteractInCommunity(' petowner '), true);
  for (const role of [
    undefined,
    null,
    '',
    'Admin',
    'Receptionist',
    'Veterinarian',
    'Groomer',
  ]) {
    assert.equal(canInteractInCommunity(role), false);
  }
});

test('own content is recognised by author id, populated or not', () => {
  assert.equal(isOwnContent({ _id: OWNER_ID }, OWNER_ID), true);
  assert.equal(isOwnContent(OWNER_ID, OWNER_ID), true);
  assert.equal(isOwnContent({ _id: 'other' }, OWNER_ID), false);
  assert.equal(isOwnContent({ _id: OWNER_ID }, undefined), false);
  assert.equal(isOwnContent(null, OWNER_ID), false);
  assert.equal(authorName({ _id: 'x', fullName: '  ' }), 'Thành viên VCMOS');
  assert.equal(authorName(null), 'Thành viên VCMOS');
  assert.equal(authorName({ _id: 'x', fullName: 'Lan' }), 'Lan');
});

// Withdraw (UC-50) is for a Published post; a pending one is deleted instead
test('only a Published post offers withdraw', () => {
  assert.equal(canWithdrawPost('Published'), true);
  for (const status of ['PendingReview', 'Hidden', 'Removed', undefined])
    assert.equal(canWithdrawPost(status), false);
});

test('comment body is trimmed, 1-500 characters, and a reply names its root', () => {
  assert.deepEqual(buildCommentBody('  Chúc bé khỏe!  '), {
    content: 'Chúc bé khỏe!',
  });
  assert.deepEqual(buildCommentBody('Cảm ơn', ROOT_ID), {
    content: 'Cảm ơn',
    parentCommentId: ROOT_ID,
  });
  assert.throws(() => buildCommentBody('   '), RangeError);
  assert.throws(
    () => buildCommentBody('a'.repeat(COMMENT_MAX_LENGTH + 1)),
    /tối đa 500/
  );
  assert.equal(
    buildCommentBody('a'.repeat(COMMENT_MAX_LENGTH)).content.length,
    500
  );
});

test('report body accepts Post or Comment with a 1-200 character reason', () => {
  assert.deepEqual(buildReportBody('Post', POST_ID, '  Spam quảng cáo '), {
    targetType: 'Post',
    targetId: POST_ID,
    reason: 'Spam quảng cáo',
  });
  assert.equal(buildReportBody('Comment', ROOT_ID, 'x').targetType, 'Comment');
  assert.throws(() => buildReportBody('User', POST_ID, 'x'), RangeError);
  assert.throws(() => buildReportBody('Post', POST_ID, ' '), /lý do/);
  assert.throws(
    () =>
      buildReportBody(
        'Post',
        POST_ID,
        'a'.repeat(REPORT_REASON_MAX_LENGTH + 1)
      ),
    /tối đa 200/
  );
});

// BR-18: the BE rebuilds milestones from Done orders; the FE only sends ids the owner saw
test('timeline share payload keeps preview order, drops unknown ids and empty text', () => {
  const milestones = [
    { orderId: 'o1', date: '2026-10-01', title: 'Khám', services: ['Khám'] },
    { orderId: 'o2', date: '2026-11-01', title: 'Spa', services: ['Spa'] },
    { orderId: 'o3', date: '2026-11-20', title: 'Tiêm', services: ['Tiêm'] },
  ];
  assert.deepEqual(
    buildTimelineSharePayload(
      'pet1',
      ['o3', 'o1', 'zz', 'o1'],
      milestones,
      '  '
    ),
    { petId: 'pet1', orderIds: ['o1', 'o3'] }
  );
  assert.deepEqual(
    buildTimelineSharePayload('pet1', ['o2'], milestones, ' Bé khỏe rồi '),
    { petId: 'pet1', orderIds: ['o2'], content: 'Bé khỏe rồi' }
  );
  assert.throws(
    () => buildTimelineSharePayload('pet1', ['zz'], milestones, ''),
    /ít nhất 1 mốc/
  );
  assert.throws(
    () =>
      buildTimelineSharePayload('pet1', ['o1'], milestones, 'a'.repeat(5001)),
    /5.000/
  );
  assert.match(
    validateShareSelection(
      Array.from({ length: 51 }, (_, i) => `o${i}`),
      ''
    ),
    /tối đa 50/
  );
});

test('milestone dates read as DD/MM/YYYY', () => {
  assert.equal(formatMilestoneDate('2026-11-20'), '20/11/2026');
  assert.equal(formatMilestoneDate('Hôm nay'), 'Hôm nay');
  assert.equal(formatMilestoneDate(undefined), '');
});

// BR-19: one level of replies; the BE lists roots newest first, replies oldest first
test('comment thread updates: new root on top, reply last under its root, delete hides replies', () => {
  const root = comment(ROOT_ID, {
    replies: [comment(REPLY_ID, { parentCommentId: ROOT_ID })],
  });
  const other = comment('other-root', { replies: [] });
  let thread = [root, other];

  const newRoot = comment('new-root');
  thread = addCommentToThread(thread, newRoot);
  assert.deepEqual(
    thread.map(item => item._id),
    ['new-root', ROOT_ID, 'other-root']
  );
  assert.deepEqual(thread[0].replies, []);

  const reply = comment('reply-2', { parentCommentId: ROOT_ID });
  thread = addCommentToThread(thread, reply);
  assert.deepEqual(
    thread[1].replies.map(item => item._id),
    [REPLY_ID, 'reply-2']
  );
  assert.equal(addCommentToThread(thread, reply)[1].replies.length, 2);

  const withoutReply = removeCommentFromThread(thread, REPLY_ID);
  assert.deepEqual(
    withoutReply[1].replies.map(item => item._id),
    ['reply-2']
  );
  const withoutRoot = removeCommentFromThread(thread, ROOT_ID);
  assert.deepEqual(
    withoutRoot.map(item => item._id),
    ['new-root', 'other-root']
  );
  assert.equal(thread.length, 3, 'helpers never mutate the current list');
});

test('"Xem thêm" skips roots already on screen', () => {
  const merged = appendCommentPage(
    [comment('a'), comment('b')],
    [comment('b'), comment('c')]
  );
  assert.deepEqual(
    merged.map(item => item._id),
    ['a', 'b', 'c']
  );
});

test('API errors give the BE message, the first field error on 400, or the fallback', () => {
  const failure = (status, data) => ({ response: { status, data } });
  assert.deepEqual(
    readCommunityError(
      failure(400, {
        message: 'Dữ liệu không hợp lệ',
        errors: { content: 'Nội dung bình luận là bắt buộc' },
      }),
      'x'
    ),
    {
      status: 400,
      message: 'Nội dung bình luận là bắt buộc',
      fields: { content: 'Nội dung bình luận là bắt buộc' },
    }
  );
  assert.equal(
    readCommunityError(
      failure(409, { message: 'Bạn đã báo cáo nội dung này trước đó' }),
      'x'
    ).message,
    'Bạn đã báo cáo nội dung này trước đó'
  );
  assert.equal(
    readCommunityError(new Error('Network Error'), 'Thử lại sau').message,
    'Thử lại sau'
  );
  assert.equal(readCommunityError(undefined, 'Thử lại sau').status, undefined);
});

test('community URLs encode ids and keep the static BE paths', () => {
  assert.equal(apiPublicCommunityPosts, '/community-posts/public');
  assert.equal(
    apiPublicCommunityPost(POST_ID),
    `/community-posts/public/${POST_ID}`
  );
  assert.equal(
    apiCommunityPostComments('a/b'),
    '/community-posts/a%2Fb/comments'
  );
  assert.equal(
    apiCommunityComment(ROOT_ID),
    `/community-posts/comments/${ROOT_ID}`
  );
  assert.equal(
    apiCommunityPostLike(POST_ID),
    `/community-posts/${POST_ID}/like`
  );
  assert.equal(
    apiCommunityPostLikeStatus(POST_ID),
    `/community-posts/${POST_ID}/like-status`
  );
  assert.equal(
    apiCommunityPostWithdraw(POST_ID),
    `/community-posts/${POST_ID}/withdraw`
  );
  assert.equal(apiCommunityReports, '/community-posts/reports');
  assert.equal(
    apiTimelineSharePreview,
    '/community-posts/timeline-share/preview'
  );
  assert.equal(apiTimelineShare, '/community-posts/timeline-share');
  assert.equal(apiModerationPosts, '/admin/community/posts');
  assert.equal(
    apiModeratePost(POST_ID),
    `/admin/community/posts/${POST_ID}/moderate`
  );
  assert.equal(apiModerationReports, '/admin/community/reports');
  assert.equal(
    apiResolveReport('r?1'),
    '/admin/community/reports/r%3F1/resolve'
  );
});

// UC-58, MSG22: a rejection needs a reason; an approval does not
test('moderation body: Reject requires a reason up to 500 characters', () => {
  assert.deepEqual(buildModerationBody('Approve'), { decision: 'Approve' });
  assert.deepEqual(buildModerationBody('Approve', ' Hợp lệ '), {
    decision: 'Approve',
    moderationNote: 'Hợp lệ',
  });
  assert.deepEqual(buildModerationBody('Reject', ' Có giá dịch vụ '), {
    decision: 'Reject',
    moderationNote: 'Có giá dịch vụ',
  });
  assert.throws(() => buildModerationBody('Reject', '   '), /lý do từ chối/);
  assert.match(validateModerationNote('Approve', 'a'.repeat(501)), /500/);
  assert.equal(validateModerationNote('Approve', ''), undefined);
});

// UC-59, nghiệp vụ 7.1: keep, hide or delete; hide and delete need a note
test('resolve body: Hide and Delete need a note, Keep does not', () => {
  assert.deepEqual(
    REPORT_DECISIONS.map(item => item.value),
    ['Keep', 'Hide', 'Delete']
  );
  assert.equal(isResolveNoteRequired('Keep'), false);
  assert.equal(isResolveNoteRequired('Hide'), true);
  assert.equal(isResolveNoteRequired('Delete'), true);
  assert.deepEqual(buildResolveBody('Keep'), { decision: 'Keep' });
  assert.deepEqual(buildResolveBody('Delete', ' Spam '), {
    decision: 'Delete',
    note: 'Spam',
  });
  for (const decision of ['Hide', 'Delete'])
    assert.throws(() => buildResolveBody(decision, ''), /lý do/);
  assert.match(validateResolveNote('Keep', 'a'.repeat(501)), /500/);
});

test('moderation queries drop empty filters and default to page 1 of 10', () => {
  assert.equal(MODERATION_POST_FILTERS[0].value, 'PendingReview');
  assert.deepEqual(buildModerationPostsQuery({}), { page: 1, limit: 10 });
  assert.deepEqual(
    buildModerationPostsQuery({
      page: 2,
      status: 'All',
      postType: 'Discussion',
    }),
    { page: 2, limit: 10, status: 'All', postType: 'Discussion' }
  );
  assert.deepEqual(
    buildReportsQuery({ status: 'Pending', targetType: undefined }),
    {
      page: 1,
      limit: 10,
      status: 'Pending',
    }
  );
  assert.equal(
    isReportedComment({ targetType: 'Comment', target: { _id: 'c' } }),
    true
  );
  assert.equal(
    isReportedComment({ targetType: 'Comment', target: null }),
    false
  );
  assert.equal(
    isReportedComment({ targetType: 'Post', target: { _id: 'p' } }),
    false
  );
});
