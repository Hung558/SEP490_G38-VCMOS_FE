// Isolated mocked browser QA; does not start the app on port 3000 or contact BE.
// Set COMMUNITY_POST_PLAYWRIGHT_MODULE to a Playwright ESM entry if not installed locally.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const playwrightModule = process.env.COMMUNITY_POST_PLAYWRIGHT_MODULE;
const { chromium } = await import(
  playwrightModule ? pathToFileURL(playwrightModule).href : 'playwright'
);
const entryId = resolve('__community-post-qa-entry.jsx').replaceAll('\\', '/');
const source = `
  import React, { useEffect } from 'react';
  import { createRoot } from 'react-dom/client';
  import { AuthProvider, useAuth } from '/src/contexts/routerProvider/authContext.tsx';
  import CommunityPosts from '/src/pages/CommunityPosts/index.tsx';
  import '/src/styles/_index.scss';
  import '/src/styles/globals.css';
  function Harness() {
    const { login } = useAuth();
    useEffect(() => { login({ _id: 'owner', role: new URLSearchParams(location.search).get('role') || 'PetOwner' }); }, []);
    return <CommunityPosts />;
  }
  createRoot(document.getElementById('root')).render(<AuthProvider><Harness /></AuthProvider>);
`;
const server = await createServer({
  define: { 'import.meta.env.VITE_API_ROOT': JSON.stringify('') },
  server: { host: '127.0.0.1', port: 3103, strictPort: true, open: false },
  plugins: [
    {
      name: 'community-post-isolated-qa',
      resolveId(id) {
        if (id === '/__community-post-entry.jsx') return entryId;
      },
      load(id) {
        if (id === entryId) return source;
      },
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/__community-post-qa')) return next();
          const html = await vite.transformIndexHtml(
            req.url,
            '<!doctype html><html lang="vi"><head><meta charset="utf-8" /></head><body><div id="root"></div><script type="module" src="/__community-post-entry.jsx"></script></body></html>'
          );
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        });
      },
    },
  ],
});
let browser;
const passed = [];
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    ...(process.env.COMMUNITY_POST_BROWSER_CHANNEL
      ? { channel: process.env.COMMUNITY_POST_BROWSER_CHANNEL }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  page.on('dialog', dialog => dialog.accept());
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const post = {
    _id: '6671aa00bb11cc22dd33ee44',
    authorId: 'owner',
    postType: 'Discussion',
    content: 'Bài viết đã gửi',
    timelineItems: [],
    status: 'PendingReview',
    likeCount: 0,
    commentCount: 0,
    createdAt: '2026-11-19T03:00:00Z',
    updatedAt: '2026-11-19T03:00:00Z',
  };
  let detailStatus = 'PendingReview';
  let putMode = '409';
  let deleteMode = '409';
  let calls = [];
  let filters = [];
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== 'http://127.0.0.1:3103') return route.abort();
    if (url.pathname === '/pets')
      return route.fulfill({
        json: {
          items: [
            {
              _id: '665f1c2e9a1b2c3d4e5f6a7b',
              name: 'Milo',
              code: 'PET001',
              status: 'Active',
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        },
      });
    if (!/^\/community-posts(?:\/|$)/.test(url.pathname))
      return route.continue();
    calls.push({
      method: req.method(),
      path: url.pathname,
      body: req.postData() || '',
      contentType: req.headers()['content-type'],
    });
    if (req.method() === 'GET' && url.pathname === '/community-posts') {
      filters.push(Object.fromEntries(url.searchParams));
      return route.fulfill({
        json: {
          posts: [{ ...post, status: detailStatus }],
          pagination: {
            page: Number(url.searchParams.get('page')) || 1,
            limit: 10,
            total: 25,
            totalPages: 3,
          },
        },
      });
    }
    if (req.method() === 'GET')
      return route.fulfill({
        json: { post: { ...post, status: detailStatus } },
      });
    if (req.method() === 'PUT') {
      if (putMode === '409')
        return route.fulfill({
          status: 409,
          json: { message: 'Chỉ có thể thao tác với bài viết đang chờ duyệt' },
        });
      return route.fulfill({
        status: 400,
        json: {
          message: 'Dữ liệu không hợp lệ',
          errors: { content: 'Nội dung cần kiểm tra lại' },
        },
      });
    }
    if (req.method() === 'DELETE') {
      if (deleteMode === '409')
        return route.fulfill({
          status: 409,
          json: { message: 'Chỉ có thể thao tác với bài viết đang chờ duyệt' },
        });
      detailStatus = 'Removed';
      return route.fulfill({ json: { message: 'Đã xóa bài viết' } });
    }
    if (req.method() === 'POST')
      return route.fulfill({ json: { message: 'Đã gửi bài viết', post } });
    return route.abort();
  });
  const go = async (role = 'PetOwner') => {
    await page.goto(`http://127.0.0.1:3103/__community-post-qa?role=${role}`);
    await page.getByRole('heading', { name: 'Bài viết của tôi' }).waitFor();
    await page.getByRole('button', { name: /Xem bài/ }).waitFor();
  };
  const openDetail = async () => {
    await page.getByRole('button', { name: /Xem bài/ }).click();
    await page
      .getByRole('dialog', { name: 'Chi tiết bài viết của tôi' })
      .getByText('Nội dung', { exact: true })
      .waitFor();
  };
  await go();
  await page.getByTitle('2', { exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('.ant-pagination-item-active')?.textContent === '2'
  );
  await page
    .getByRole('combobox', { name: 'Lọc trạng thái duyệt bài' })
    .click();
  const filterResponse = page.waitForResponse(response =>
    response.url().includes('status=Hidden')
  );
  await page.getByTitle('Đã ẩn', { exact: true }).click();
  await filterResponse;
  assert.equal(filters.at(-1).page, '1');
  assert.equal(filters.at(-1).status, 'Hidden');
  passed.push('server pagination; status filter resets page to 1');

  await openDetail();
  await page.getByRole('button', { name: 'Sửa bài viết', exact: true }).click();
  const editor = page.getByRole('dialog', {
    name: 'Sửa bài viết đang chờ duyệt',
  });
  await editor
    .getByLabel('Nội dung (bắt buộc)', { exact: true })
    .fill('Nội dung chưa lưu cần giữ lại');
  await editor
    .getByLabel('Ảnh bìa (không bắt buộc)', { exact: true })
    .setInputFiles({
      name: 'retained.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8l0AAAAASUVORK5CYII=',
        'base64'
      ),
    });
  await editor.getByText('Ảnh mới: retained.png', { exact: true }).waitFor();
  await editor.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await editor
    .getByText(/Bài viết không còn chờ duyệt nên không thể sửa hoặc xóa/)
    .waitFor();
  assert.equal(
    await editor
      .getByLabel('Nội dung (bắt buộc)', { exact: true })
      .inputValue(),
    'Nội dung chưa lưu cần giữ lại'
  );
  assert.equal(
    await editor.getByRole('button', { name: 'Lưu thay đổi' }).isDisabled(),
    true
  );
  assert.equal(
    await editor
      .getByText('Ảnh mới: retained.png', { exact: true })
      .isVisible(),
    true
  );
  assert.match(
    calls.find(call => call.method === 'PUT').contentType,
    /multipart\/form-data; boundary=/
  );
  passed.push(
    '409 keeps editor, draft and selected photo, locks resubmit, PUT has multipart boundary'
  );

  putMode = '400';
  await go();
  await openDetail();
  await page.getByRole('button', { name: 'Sửa bài viết', exact: true }).click();
  await editor
    .getByLabel('Nội dung (bắt buộc)', { exact: true })
    .fill('Nội dung còn nguyên sau lỗi validation');
  await editor.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await editor
    .getByText('Nội dung cần kiểm tra lại', { exact: true })
    .waitFor();
  assert.equal(
    await editor
      .getByLabel('Nội dung (bắt buộc)', { exact: true })
      .inputValue(),
    'Nội dung còn nguyên sau lỗi validation'
  );
  assert.equal(
    await editor.getByRole('button', { name: 'Lưu thay đổi' }).isEnabled(),
    true
  );
  passed.push(
    '400 shows inline field errors; draft retained and retry enabled'
  );

  await go();
  await openDetail();
  await page.getByRole('button', { name: 'Xóa bài viết', exact: true }).click();
  assert.equal(calls.filter(call => call.method === 'DELETE').length, 0);
  await page.getByRole('button', { name: 'Giữ bài viết', exact: true }).click();
  assert.equal(calls.filter(call => call.method === 'DELETE').length, 0);
  await page.getByRole('button', { name: 'Xóa bài viết', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Xóa bài viết đang chờ duyệt?' })
    .getByText(/Bài viết không còn chờ duyệt/)
    .waitFor();
  assert.equal(
    await page
      .getByRole('button', { name: 'Xác nhận xóa', exact: true })
      .isDisabled(),
    true
  );
  passed.push(
    'delete requires explicit confirmation; cancel does not call API; 409 locks retry'
  );

  detailStatus = 'Published';
  await go();
  await openDetail();
  assert.equal(
    await page
      .getByRole('button', { name: 'Sửa bài viết', exact: true })
      .count(),
    0
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'Xóa bài viết', exact: true })
      .count(),
    0
  );
  passed.push('published detail is read-only');

  detailStatus = 'PendingReview';
  deleteMode = 'ok';
  await go();
  await openDetail();
  await page.getByRole('button', { name: 'Xóa bài viết', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Đã xóa', { exact: true }).first().waitFor();
  passed.push('successful soft-delete refreshes list as Removed');

  await go();
  await page.getByRole('button', { name: 'Viết bài mới', exact: true }).focus();
  await page.keyboard.press('Enter');
  const create = page.getByRole('dialog', { name: 'Viết bài mới' });
  await create.getByRole('button', { name: 'Gửi bài chờ duyệt' }).click();
  await create
    .getByText('Hãy nhập nội dung thảo luận.', { exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.activeElement?.id === 'post-content'
  );
  assert.equal(calls.filter(call => call.method === 'POST').length, 0);
  await create
    .getByLabel('Loại bài viết', { exact: true })
    .selectOption('TimelineShare');
  await create
    .getByLabel('Thú cưng (bắt buộc)', { exact: true })
    .selectOption('665f1c2e9a1b2c3d4e5f6a7b');
  await create
    .getByLabel('Ngày (bắt buộc)', { exact: true })
    .fill('2026-11-19');
  await create
    .getByLabel('Tiêu đề (bắt buộc, tối đa 200 ký tự)', { exact: true })
    .fill('Milo về nhà');
  await create.getByRole('button', { name: 'Gửi bài chờ duyệt' }).click();
  await page
    .getByText('Đã gửi bài viết, vui lòng chờ duyệt.', { exact: true })
    .waitFor();
  const created = calls.find(call => call.method === 'POST');
  assert.match(created.body, /name="postType"\r\n\r\nTimelineShare/);
  assert.match(created.body, /Milo về nhà/);
  assert.doesNotMatch(created.body, /orderId|appointmentServiceId/);
  passed.push(
    'keyboard opens create; validation focuses field; manual timeline multipart creates without order IDs'
  );

  const before = calls.length;
  await page.goto('http://127.0.0.1:3103/__community-post-qa?role=Groomer');
  await page
    .getByText('Bài viết của tôi chỉ dành cho chủ nuôi đã đăng nhập.', {
      exact: true,
    })
    .waitFor();
  assert.equal(calls.length, before);
  passed.push('non-owner does not mount or request owner APIs');
  assert.deepEqual(pageErrors, []);
  console.log(
    JSON.stringify(
      { passed: passed.length, checks: passed, pageErrors },
      null,
      2
    )
  );
} finally {
  await browser?.close();
  await server.close();
}
