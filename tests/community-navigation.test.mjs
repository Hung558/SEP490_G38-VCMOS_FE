import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ROUTER from '../src/routerMap/ROUTER.ts';

const source = async path =>
  readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const block = (text, start, end) => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `${start} … ${end} not found`);
  return text.slice(from, to);
};

test('community paths do not clash with the owner page "Bài viết của tôi"', () => {
  assert.equal(ROUTER.COMMUNITY, '/community');
  assert.equal(ROUTER.COMMUNITY_POST, '/community/posts/:postId');
  assert.equal(ROUTER.MY_COMMUNITY_POSTS, '/community/my-posts');
  assert.equal(
    ROUTER.ADMIN_COMMUNITY_MODERATION,
    '/admin/community-moderation'
  );
});

// K1 kept (21/11): guests and every role read the feed, so it sits beside the
// home page under PublicRouters, not behind a role guard
test('feed and post pages are public; moderation is inside the Admin guard', async () => {
  const router = await source('src/routerMap/AppRouter.tsx');
  const publicBlock = block(
    router,
    'element: <PublicRouters />',
    'path: ROUTER.LOGIN'
  );
  assert.match(publicBlock, /path: ROUTER\.COMMUNITY,/);
  assert.match(publicBlock, /path: ROUTER\.COMMUNITY_POST,/);
  const adminBlock = block(
    router,
    'element: <AdminRoute />',
    '// Cage management'
  );
  assert.match(adminBlock, /path: ROUTER\.ADMIN_COMMUNITY_MODERATION/);
  assert.match(adminBlock, /<AdminCommunityModerationPage \/>/);
});

// 24/11: the feed lives in the home layout, so a sidebar link to it threw the
// owner out of the dashboard; owners reach it from the home header instead
test('pet owners get "Bài viết của tôi" but no feed link in the sidebar, Admin gets moderation', async () => {
  const menu = await source('src/routerMap/MenuItem.tsx');
  const owner = block(menu, 'export const MenuItemCommon', '\n};');
  assert.doesNotMatch(owner, /ROUTER\.COMMUNITY,/);
  assert.match(owner, /ROUTER\.MY_COMMUNITY_POSTS/);
  const admin = block(menu, 'export const MenuItemAdmin', '\n};');
  assert.match(admin, /ROUTER\.ADMIN_COMMUNITY_MODERATION/);
});

test('the home page shows the community section and the header links to the feed', async () => {
  const home = await source('src/pages/Home/index.tsx');
  assert.match(home, /<CommunitySection \/>/);
  const header = await source(
    'src/components/layout/HomeLayout/components/HomeHeader.tsx'
  );
  assert.match(header, /to=\{ROUTER\.COMMUNITY\}/);
});

// K4: milestones come from the BE (timeline-share), never typed in the editor
test('the post editor no longer offers hand-typed timeline milestones', async () => {
  const editor = await source('src/pages/CommunityPosts/PostEditor.tsx');
  assert.doesNotMatch(editor, /Thêm mốc thời gian/);
  assert.doesNotMatch(editor, /id="post-type"/);
});
