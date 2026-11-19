import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPostFormData,
  canManagePost,
  createPostDraft,
  isCalendarDate,
  MAX_IMAGE_BYTES,
  POST_STATUS_LABELS,
  readCommunityPostError,
  safePostImageUrl,
  validatePostDraft,
  validatePostImage,
} from '../src/services/CommunityPostService/helpers.ts';
import { createCommunityPostService } from '../src/services/CommunityPostService/client.ts';

const PET_ID = '665f1c2e9a1b2c3d4e5f6a7b';
const POST_ID = '6671aa00bb11cc22dd33ee44';
const COVER = 'https://res.cloudinary.com/demo/cover.jpg';
const PHOTO = 'https://res.cloudinary.com/demo/day1.jpg';
const image = (name = 'photo.webp') =>
  new File(['image'], name, { type: 'image/webp' });
const post = (override = {}) => ({
  _id: POST_ID,
  authorId: 'owner',
  petId: { _id: PET_ID, name: 'Milo' },
  postType: 'TimelineShare',
  content: 'Milo lớn lên',
  imageUrl: COVER,
  timelineItems: [
    { _id: 'item1', date: '2026-11-19', title: 'Về nhà', imageUrl: PHOTO },
  ],
  status: 'PendingReview',
  likeCount: 0,
  commentCount: 0,
  createdAt: '2026-11-19T03:00:00Z',
  updatedAt: '2026-11-19T03:00:00Z',
  ...override,
});
const discussion = () => ({
  ...createPostDraft(),
  content: ' Xin lời khuyên chăm sóc mèo. ',
});
const timeline = () => ({
  ...createPostDraft(),
  postType: 'TimelineShare',
  petId: PET_ID,
  timelineItems: [
    { key: 'a', date: '2024-02-29', title: ' Ngày đầu về nhà ', image: {} },
  ],
});

// BE PR53: only owned pending-review records can be mutated.
test('edit/delete policy is fail closed for every status including unknown', () => {
  for (const status of [
    'PendingReview',
    'Published',
    'Hidden',
    'Removed',
    'Rejected',
    undefined,
  ]) {
    assert.equal(canManagePost({ status }), status === 'PendingReview');
  }
  assert.deepEqual(Object.keys(POST_STATUS_LABELS), [
    'PendingReview',
    'Published',
    'Hidden',
    'Removed',
  ]);
});

test('draft retains complete editable state and URLs, but creates stable independent item keys', () => {
  const original = post();
  const draft = createPostDraft(original);
  assert.equal(draft.petId, PET_ID);
  assert.equal(draft.image.existingUrl, COVER);
  assert.equal(draft.timelineItems[0].image.existingUrl, PHOTO);
  assert.equal(createPostDraft({ ...original, petId: PET_ID }).petId, PET_ID);
  draft.timelineItems[0].title = 'Đổi';
  assert.equal(original.timelineItems[0].title, 'Về nhà');
  assert.notEqual(
    draft.timelineItems[0].key,
    createPostDraft(original).timelineItems[0].key
  );
});

test('discussion requires nonblank content, both types enforce trimmed max 5000', () => {
  assert.ok(validatePostDraft({ ...discussion(), content: ' \n ' }).content);
  assert.deepEqual(
    validatePostDraft({ ...discussion(), content: 'x'.repeat(5000) }),
    {}
  );
  assert.ok(
    validatePostDraft({ ...discussion(), content: 'x'.repeat(5001) }).content
  );
  assert.deepEqual(validatePostDraft(timeline()), {});
});

test('timeline requires a pet ID, 1–50 manual items and titles 1–200 characters', () => {
  assert.ok(validatePostDraft({ ...timeline(), petId: '' }).petId);
  assert.ok(validatePostDraft({ ...timeline(), petId: 'bad' }).petId);
  assert.ok(
    validatePostDraft({ ...timeline(), timelineItems: [] }).timelineItems
  );
  assert.deepEqual(
    validatePostDraft({
      ...timeline(),
      timelineItems: Array.from(
        { length: 50 },
        () => timeline().timelineItems[0]
      ),
    }),
    {}
  );
  assert.ok(
    validatePostDraft({
      ...timeline(),
      timelineItems: Array.from(
        { length: 51 },
        () => timeline().timelineItems[0]
      ),
    }).timelineItems
  );
  for (const title of ['', '  ', 'x'.repeat(201)]) {
    assert.ok(
      validatePostDraft({
        ...timeline(),
        timelineItems: [{ ...timeline().timelineItems[0], title }],
      })['timelineItems.0.title']
    );
  }
});

test('calendar dates reject rollover and time strings, accept real leap days', () => {
  for (const date of ['2024-02-29', '2026-11-19', '2000-02-29'])
    assert.equal(isCalendarDate(date), true, date);
  for (const date of [
    '2026-02-29',
    '2026-02-31',
    '1900-02-29',
    '2026-13-01',
    '2026-1-1',
    '2026-11-19T00:00:00Z',
    '',
  ])
    assert.equal(isCalendarDate(date), false, date);
});

test('image MIME and inclusive size limit match multer, including WebP', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validatePostImage({ type, size: MAX_IMAGE_BYTES }), undefined);
    assert.ok(validatePostImage({ type, size: MAX_IMAGE_BYTES + 1 }));
  }
  for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', ''])
    assert.ok(validatePostImage({ type, size: 1 }));
});

test('create always uses multipart including without photos; never sends moderation/ownership/counters', () => {
  const form = buildPostFormData({
    ...discussion(),
    status: 'Published',
    authorId: 'attacker',
    orderId: 'order',
    likeCount: 50,
  });
  assert.ok(form instanceof FormData);
  assert.deepEqual([...form.keys()], ['postType', 'content']);
  assert.equal(form.get('content'), 'Xin lời khuyên chăm sóc mèo.');
});

test('timeline upload imageIndex refers only to packed files, not item position', () => {
  const draft = timeline();
  draft.image = { file: image('cover.webp') };
  draft.timelineItems = [
    ...draft.timelineItems,
    {
      key: 'b',
      date: '2026-01-01',
      title: 'Tiêm phòng',
      image: { file: image('vaccine.webp') },
    },
    { key: 'c', date: '2026-02-01', title: 'Vui chơi', image: {} },
    {
      key: 'd',
      date: '2026-03-01',
      title: 'Đi dạo',
      image: { file: image('walk.webp') },
    },
  ];
  const form = buildPostFormData(draft);
  const items = JSON.parse(form.get('timelineItems'));
  assert.deepEqual(
    items.map(item => item.imageIndex),
    [undefined, 0, undefined, 1]
  );
  assert.deepEqual(
    form.getAll('timelineImages').map(file => file.name),
    ['vaccine.webp', 'walk.webp']
  );
  assert.equal(form.getAll('image').length, 1);
  assert.deepEqual(items[0], { date: '2024-02-29', title: 'Ngày đầu về nhà' });
  assert.equal(form.has('orderId'), false);
});

test('up to ten new timeline images plus independent cover; eleven are blocked', () => {
  const draft = timeline();
  draft.image = { file: image() };
  draft.timelineItems = Array.from({ length: 10 }, (_, index) => ({
    ...timeline().timelineItems[0],
    key: String(index),
    image: { file: image() },
  }));
  assert.deepEqual(validatePostDraft(draft), {});
  assert.equal(buildPostFormData(draft).getAll('timelineImages').length, 10);
  draft.timelineItems.push({ ...draft.timelineItems[0], key: '11' });
  assert.ok(validatePostDraft(draft).timelineItems);
  assert.throws(() => buildPostFormData(draft), /10 ảnh/);
});

test('update explicitly keeps original main and item URLs and sends full text/pet/type', () => {
  const original = post();
  const form = buildPostFormData(createPostDraft(original), original);
  assert.equal(form.get('imageUrl'), COVER);
  assert.equal(form.get('petId'), PET_ID);
  assert.equal(form.get('content'), original.content);
  assert.equal(form.get('postType'), original.postType);
  assert.deepEqual(JSON.parse(form.get('timelineItems')), [
    { date: '2026-11-19', title: 'Về nhà', imageUrl: PHOTO },
  ]);
});

test('removing an existing image omits keep URL and file; replacing sends only file/index', () => {
  const original = post();
  const draft = createPostDraft(original);
  draft.image = {};
  draft.timelineItems[0].image = {};
  const removed = buildPostFormData(draft, original);
  assert.equal(removed.has('imageUrl'), false);
  assert.equal(removed.has('image'), false);
  assert.equal(JSON.parse(removed.get('timelineItems'))[0].imageUrl, undefined);
  draft.image = { existingUrl: COVER, file: image() };
  draft.timelineItems[0].image = { existingUrl: PHOTO, file: image() };
  const replaced = buildPostFormData(draft, original);
  assert.equal(replaced.has('imageUrl'), false);
  assert.ok(replaced.get('image') instanceof File);
  assert.deepEqual(JSON.parse(replaced.get('timelineItems'))[0], {
    date: '2026-11-19',
    title: 'Về nhà',
    imageIndex: 0,
  });
});

test('no arbitrary image URLs, no prior post URL reused during create', () => {
  assert.ok(
    validatePostDraft({ ...discussion(), image: { existingUrl: COVER } }).image
  );
  const original = post();
  const draft = createPostDraft(original);
  draft.image.existingUrl = 'https://attacker.example/image.png';
  draft.timelineItems[0].image.existingUrl =
    'https://attacker.example/item.png';
  const errors = validatePostDraft(draft, original);
  assert.ok(errors.image);
  assert.ok(errors['timelineItems.0.image']);
  assert.throws(() => buildPostFormData(draft, original));
});

test('switching to discussion omits all hidden timeline images and timeline items', () => {
  const draft = {
    ...timeline(),
    postType: 'Discussion',
    content: 'Chào bạn',
    timelineItems: [
      { ...timeline().timelineItems[0], image: { file: image() } },
    ],
  };
  const form = buildPostFormData(draft);
  assert.equal(form.has('timelineImages'), false);
  assert.equal(form.has('timelineItems'), false);
});

test('locked update is blocked even when service is called directly', () => {
  for (const status of ['Published', 'Hidden', 'Removed']) {
    const original = post({ status });
    assert.throws(
      () => buildPostFormData(createPostDraft(original), original),
      /chờ duyệt/
    );
  }
});

test('server field errors flatten sparse item arrays without losing other fields', () => {
  const result = readCommunityPostError(
    {
      response: {
        status: 400,
        data: {
          message: 'Dữ liệu không hợp lệ',
          errors: {
            petId: 'Không tìm thấy thú cưng',
            timelineItems: [null, { date: 'Ngày sai', imageIndex: 'Ảnh sai' }],
          },
        },
      },
    },
    'fallback'
  );
  assert.equal(result.status, 400);
  assert.deepEqual(result.fields, {
    petId: 'Không tìm thấy thú cưng',
    'timelineItems.1.date': 'Ngày sai',
    'timelineItems.1.imageIndex': 'Ảnh sai',
  });
});

test('409 gives actionable lock message, network and upload failures retain useful messages', () => {
  const result = readCommunityPostError(
    { response: { status: 409, data: { message: 'Conflict' } } },
    'fallback'
  );
  assert.match(result.message, /không còn chờ duyệt/);
  assert.match(result.message, /giữ lại/);
  assert.equal(
    readCommunityPostError(undefined, 'Mạng lỗi').message,
    'Mạng lỗi'
  );
  assert.equal(
    readCommunityPostError(
      { response: { status: 502, data: { message: 'Không thể tải ảnh lên' } } },
      'fallback'
    ).message,
    'Không thể tải ảnh lên'
  );
});

test('transport uses exact owner-only CRUD paths, filters, signal and multipart PUT (not PATCH)', async () => {
  const calls = [];
  const transport = Object.fromEntries(
    ['get', 'post', 'put', 'delete'].map(method => [
      method,
      async (...args) => {
        calls.push([method, ...args]);
        return { post: post(), message: 'ok' };
      },
    ])
  );
  const service = createCommunityPostService(transport);
  const signal = new AbortController().signal;
  const query = {
    page: 2,
    limit: 10,
    status: 'Hidden',
    postType: 'TimelineShare',
  };
  await service.listMine(query, signal);
  await service.getMine(POST_ID, signal);
  await service.create(discussion());
  await service.update(post(), createPostDraft(post()));
  await service.remove(POST_ID);
  assert.deepEqual(calls[0], [
    'get',
    '/community-posts',
    { params: query, signal },
  ]);
  assert.deepEqual(calls[1], [
    'get',
    `/community-posts/${POST_ID}`,
    { signal },
  ]);
  assert.equal(calls[2][0], 'post');
  assert.equal(calls[2][1], '/community-posts');
  assert.ok(calls[2][2] instanceof FormData);
  assert.equal(calls[3][0], 'put');
  assert.equal(calls[3][1], `/community-posts/${POST_ID}`);
  assert.ok(calls[3][2] instanceof FormData);
  assert.deepEqual(calls[4], ['delete', `/community-posts/${POST_ID}`]);
  await service.getMine('a/b?x');
  assert.equal(calls[5][1], '/community-posts/a%2Fb%3Fx');
});

test('transport propagates conflict unchanged and never mutates input draft on failed save', async () => {
  const draft = createPostDraft(post());
  draft.image = { file: image() };
  const before = JSON.stringify(draft);
  const failure = { response: { status: 409 } };
  const service = createCommunityPostService({
    put: async () => {
      throw failure;
    },
  });
  await assert.rejects(
    service.update(post(), draft),
    error => error === failure
  );
  assert.equal(JSON.stringify(draft), before);
  assert.ok(draft.image.file instanceof File);
});

test('remote image display rejects script, data, blob, relative and invalid URLs', () => {
  assert.equal(safePostImageUrl(COVER), COVER);
  assert.equal(
    safePostImageUrl('http://localhost/photo.png'),
    'http://localhost/photo.png'
  );
  for (const url of [
    'javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    'blob:https://example.com/id',
    '//example.com/a.png',
    '/a.png',
    '',
    null,
    undefined,
  ]) {
    assert.equal(safePostImageUrl(url), undefined);
  }
});
