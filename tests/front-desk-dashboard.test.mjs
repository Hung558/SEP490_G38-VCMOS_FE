import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPOINTMENT_STATUSES,
  buildFrontDeskFilters,
  formatAverageWait,
  formatReportDate,
  formatReportMoney,
  frontDeskIdentityKey,
  hasPeriodActivity,
  isFrontDeskRole,
  isRealCalendarDate,
  PAYMENT_LABELS,
  readFrontDeskError,
  validateFrontDeskFilters,
} from '../src/pages/FrontDeskDashboard/components/helpers.ts';

const custom = (from, to) => ({ period: 'custom', from, to });
test('only exact Receptionist/Admin roles may mount the data-fetching dashboard', () => {
  for (const role of ['Receptionist', 'Admin'])
    assert.equal(isFrontDeskRole(role), true);
  for (const role of [
    'PetOwner',
    'Veterinarian',
    'Groomer',
    'receptionist',
    'admin',
    'Staff',
    '',
    null,
    undefined,
  ])
    assert.equal(isFrontDeskRole(role), false);
});
test('identity key changes on account, role and token changes, not object reference', () => {
  const user = { _id: 'one', role: 'Receptionist', token: 'session-one' };
  assert.equal(frontDeskIdentityKey(user), frontDeskIdentityKey({ ...user }));
  for (const patch of [
    { _id: 'two' },
    { role: 'Admin' },
    { token: 'session-two' },
    { email: 'new@example.test' },
    { systemRole: 'Admin' },
  ]) {
    assert.notEqual(
      frontDeskIdentityKey(user),
      frontDeskIdentityKey({ ...user, ...patch })
    );
  }
});
test('real date validation rejects rollover, locale strings, timestamps and partial dates', () => {
  for (const value of ['2024-02-29', '2026-11-20', '2000-02-29'])
    assert.equal(isRealCalendarDate(value), true, value);
  for (const value of [
    '2026-02-29',
    '2026-02-31',
    '1900-02-29',
    '2026-13-01',
    '2026-1-1',
    '20/11/2026',
    '2026-11-20T00:00:00Z',
    '',
  ])
    assert.equal(isRealCalendarDate(value), false, value);
});
test('custom requires BOTH dates and keeps invalid selections from reaching API', () => {
  for (const draft of [
    custom('', ''),
    custom('2026-11-20', ''),
    custom('', '2026-11-20'),
    custom('2026-02-31', '2026-03-01'),
  ]) {
    assert.ok(Object.keys(validateFrontDeskFilters(draft)).length);
    assert.equal(buildFrontDeskFilters(draft).filters, undefined);
  }
});
test('custom ordering is inclusive and permits a single day', () => {
  assert.deepEqual(
    validateFrontDeskFilters(custom('2026-11-20', '2026-11-20')),
    {}
  );
  assert.ok(validateFrontDeskFilters(custom('2026-11-21', '2026-11-20')).from);
});
test('exactly 366 inclusive days accepted; 367 rejected across leap and normal years', () => {
  assert.deepEqual(
    validateFrontDeskFilters(custom('2024-01-01', '2024-12-31')),
    {}
  );
  assert.ok(validateFrontDeskFilters(custom('2024-01-01', '2025-01-01')).to);
  assert.deepEqual(
    validateFrontDeskFilters(custom('2025-01-01', '2026-01-01')),
    {}
  );
  assert.ok(validateFrontDeskFilters(custom('2025-01-01', '2026-01-02')).to);
});
test('preset filters omit stale custom dates and let BE resolve the Vietnam calendar', () => {
  for (const period of ['day', 'week', 'month']) {
    assert.deepEqual(
      buildFrontDeskFilters({ period, from: 'bad', to: 'bad' }),
      { errors: {}, filters: { period } }
    );
  }
  assert.equal(
    buildFrontDeskFilters({ period: 'year', from: '', to: '' }).filters,
    undefined
  );
  assert.equal(
    buildFrontDeskFilters({ period: '__proto__', from: '', to: '' }).filters,
    undefined
  );
});
test('custom filters preserve exact dates without browser timezone shifting', () => {
  assert.deepEqual(
    buildFrontDeskFilters(custom('2026-11-01', '2026-11-20')).filters,
    { period: 'custom', from: '2026-11-01', to: '2026-11-20' }
  );
  assert.equal(formatReportDate('2026-11-20'), '20/11/2026');
  assert.equal(formatReportDate('2026-02-31'), '—');
});
test('no samples is not a fake zero wait; an actual zero-minute wait is shown', () => {
  assert.equal(formatAverageWait(null), 'Chưa có dữ liệu');
  assert.equal(formatAverageWait(0), '0 phút');
  assert.equal(formatAverageWait(20.5), '20,5 phút');
});
test('empty-period detection includes invoices independently of appointment dates', () => {
  const empty = {
    totalAppointments: 0,
    invoices: { issuedCount: 0, paidCount: 0 },
  };
  assert.equal(hasPeriodActivity(empty), false);
  assert.equal(hasPeriodActivity({ ...empty, totalAppointments: 1 }), true);
  assert.equal(
    hasPeriodActivity({ ...empty, invoices: { issuedCount: 1, paidCount: 0 } }),
    true
  );
  // A payment for an older invoice does not require any issued invoice this period.
  assert.equal(
    hasPeriodActivity({ ...empty, invoices: { issuedCount: 0, paidCount: 3 } }),
    true
  );
});
test('every BE appointment status and payment method has a Vietnamese label', () => {
  assert.deepEqual(
    APPOINTMENT_STATUSES.map(([key]) => key),
    [
      'Booked',
      'CheckedIn',
      'InProgress',
      'WaitOwner',
      'Done',
      'Overdue',
      'Cancelled',
    ]
  );
  assert.deepEqual(Object.keys(PAYMENT_LABELS), ['Cash', 'VNPay', 'PayOS']);
  assert.equal(formatReportMoney(800000), '800.000 đ');
  assert.equal(formatReportMoney(0), '0 đ');
});
test('server validation/auth/network errors remain errors and do not create metrics', () => {
  assert.match(
    readFrontDeskError({ response: { status: 403 } }),
    /không có quyền/
  );
  assert.match(readFrontDeskError({ response: { status: 401 } }), /hết hạn/);
  assert.equal(
    readFrontDeskError({
      response: {
        status: 400,
        data: { errors: { from: 'Ngày sai', to: 'Quá 366 ngày' } },
      },
    }),
    'Ngày sai Quá 366 ngày'
  );
  assert.equal(
    readFrontDeskError({
      response: { status: 500, data: { message: 'Máy chủ bận' } },
    }),
    'Máy chủ bận'
  );
  assert.match(readFrontDeskError(undefined), /Không tải được/);
});

// Optional browser verification, using only mocked API data and no new dependency.
// FRONT_DESK_BROWSER_QA=1 and FRONT_DESK_PLAYWRIGHT_MODULE=<Playwright index.mjs>.
test(
  'desktop UI: live/period semantics, filters, failures, auth identity and stale responses',
  {
    skip: process.env.FRONT_DESK_BROWSER_QA !== '1',
    timeout: 120000,
  },
  async () => {
    const { resolve } = await import('node:path');
    const { pathToFileURL } = await import('node:url');
    const { createServer } = await import('vite');
    const playwright = process.env.FRONT_DESK_PLAYWRIGHT_MODULE;
    const { chromium } = await import(
      playwright ? pathToFileURL(playwright).href : 'playwright'
    );
    const entryId = resolve('__front-desk-qa-entry.jsx').replaceAll('\\', '/');
    const serviceId = resolve('__front-desk-qa-service.js').replaceAll(
      '\\',
      '/'
    );
    const fixture = {
      today: '2026-11-20',
      period: 'day',
      from: '2026-11-20',
      to: '2026-11-20',
      todayCounters: {
        expectedToday: 9,
        checkedInNow: 27,
        inProgressNow: 31,
        waitingForPickup: 8,
        cages: { total: 10, occupied: 4, available: 6, occupancyRate: 40 },
      },
      periodStats: {
        totalAppointments: 17,
        appointmentsByStatus: {
          Booked: 3,
          CheckedIn: 2,
          InProgress: 2,
          WaitOwner: 2,
          Done: 5,
          Overdue: 1,
          Cancelled: 2,
        },
        onlineCount: 10,
        walkInCount: 7,
        averageWaitMinutes: 0,
        waitTimeSampleCount: 6,
        invoices: {
          issuedCount: 2,
          unpaidCount: 1,
          paidCount: 5,
          totalCollected: 800000,
          byPaymentMethod: [
            { paymentMethod: 'Cash', revenue: 300000, invoiceCount: 2 },
            { paymentMethod: 'VNPay', revenue: 0, invoiceCount: 0 },
            { paymentMethod: 'PayOS', revenue: 500000, invoiceCount: 3 },
          ],
        },
        cageOccupancy: {
          total: 10,
          occupied: 4,
          available: 6,
          occupancyRate: 40,
          byZone: {
            Holding: {
              total: 6,
              occupied: 1,
              available: 5,
              occupancyRate: 16.7,
            },
            InpatientWard: {
              total: 4,
              occupied: 3,
              available: 1,
              occupancyRate: 75,
            },
          },
          isolatedCages: { total: 3, occupied: 2, available: 1 },
        },
      },
    };
    const source = `
    import React, { useEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import { BrowserRouter, useLocation } from 'react-router-dom';
    import { AuthProvider, useAuth } from '/src/contexts/routerProvider/authContext.tsx';
    import FrontDesk from '/src/pages/FrontDeskDashboard/index.tsx';
    import '/src/styles/_index.scss'; import '/src/styles/globals.css';
    function Harness() {
      const { setUser } = useAuth(); const location = useLocation();
      useEffect(() => { window.__setFrontDeskUser = setUser; setUser({ _id: 'owner-one', role: 'Receptionist' }); }, []);
      return <><output data-testid="qa-location">{location.pathname + location.search}</output><FrontDesk /></>;
    }
    createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><Harness /></AuthProvider></BrowserRouter>);
  `;
    // Deliberately ignore abort in the mock transport to test the UI's own stale guard.
    const mockService = `export default { getFrontDesk: (filters, signal) => {
    window.__frontDeskSignals = [...(window.__frontDeskSignals || []), signal];
    return fetch('/__front-desk-data?' + new URLSearchParams(filters)).then(async response => {
      const data = await response.json(); if (!response.ok) throw { response: { status: response.status, data } }; return data;
    });
  }};`;
    const server = await createServer({
      server: { host: '127.0.0.1', port: 3104, strictPort: true, open: false },
      plugins: [
        {
          name: 'front-desk-isolated-qa',
          enforce: 'pre',
          transform(code, id) {
            if (
              id
                .replaceAll('\\', '/')
                .endsWith('/src/pages/FrontDeskDashboard/index.tsx')
            ) {
              return code
                .replaceAll(
                  "'@/services/ReportService'",
                  "'/__front-desk-service.js'"
                )
                .replaceAll(
                  '"@/services/ReportService"',
                  '"/__front-desk-service.js"'
                );
            }
          },
          resolveId(id) {
            if (id === '/__front-desk-entry.jsx') return entryId;
            if (id === '/__front-desk-service.js') return serviceId;
          },
          load(id) {
            if (id === entryId) return source;
            if (id === serviceId) return mockService;
          },
          configureServer(vite) {
            vite.middlewares.use(async (req, res, next) => {
              if (req.url?.split('?')[0] !== '/__front-desk-qa') return next();
              res.setHeader('Content-Type', 'text/html');
              res.end(
                await vite.transformIndexHtml(
                  req.url,
                  '<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/__front-desk-entry.jsx"></script></body></html>'
                )
              );
            });
          },
        },
      ],
    });
    let browser;
    try {
      await server.listen();
      browser = await chromium.launch({
        headless: true,
        channel: process.env.FRONT_DESK_BROWSER_CHANNEL || 'chrome',
      });
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
      });
      page.setDefaultTimeout(12000);
      const pageErrors = [];
      const requests = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      let mode = 'success';
      let late;
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'http://127.0.0.1:3104') return route.abort();
        if (url.pathname !== '/__front-desk-data') return route.continue();
        requests.push(Object.fromEntries(url.searchParams));
        if (mode === 'late') {
          mode = 'success';
          late = async () =>
            route.fulfill({
              json: {
                ...fixture,
                todayCounters: { ...fixture.todayCounters, expectedToday: 999 },
              },
            });
          return;
        }
        if (mode === 'error')
          return route.fulfill({
            status: 500,
            json: { message: 'Máy chủ tạm bận' },
          });
        const data = structuredClone(fixture);
        if (mode === 'empty') {
          data.periodStats.totalAppointments = 0;
          data.periodStats.appointmentsByStatus = Object.fromEntries(
            Object.keys(data.periodStats.appointmentsByStatus).map(key => [
              key,
              0,
            ])
          );
          data.periodStats.onlineCount = 0;
          data.periodStats.walkInCount = 0;
          data.periodStats.averageWaitMinutes = null;
          data.periodStats.waitTimeSampleCount = 0;
          data.periodStats.invoices = {
            issuedCount: 0,
            paidCount: 0,
            unpaidCount: 0,
            totalCollected: 0,
            byPaymentMethod: [],
          };
        }
        if (url.searchParams.get('period') === 'custom') {
          data.period = 'custom';
          data.from = url.searchParams.get('from');
          data.to = url.searchParams.get('to');
        }
        return route.fulfill({ json: data });
      });
      await page.goto('http://127.0.0.1:3104/__front-desk-qa');
      await page
        .getByRole('heading', { name: 'Trực tiếp tại quầy', exact: true })
        .waitFor()
        .catch(async error => {
          console.error('QA_DIAGNOSTIC', {
            pageErrors,
            requests,
            body: await page.locator('body').innerText(),
          });
          throw error;
        });
      assert.deepEqual(requests[0], { period: 'day' });
      await page
        .getByText('Lịch đặt hôm nay chưa tiếp nhận', { exact: true })
        .waitFor();
      await page.getByText('0 phút', { exact: true }).waitFor();
      await page.getByText(/6 lịch có mẫu hợp lệ/).waitFor();
      await page
        .getByRole('row', { name: /Chuyển khoản VietQR.*500.000/ })
        .waitFor();
      await page
        .getByRole('row', { name: /Khu nội trú.*4.*3.*1.*75%/ })
        .waitFor();
      await page
        .getByRole('row', { name: /Trong đó: chuồng cách ly.*3.*2.*1/ })
        .waitFor();
      // Paid (5) may exceed issued (2); UI must not calculate any paid/issued ratio.
      await page
        .getByText(/Không dùng hai số này để tính tỷ lệ thanh toán/)
        .waitFor();
      if (process.env.FRONT_DESK_SCREENSHOT)
        await page.screenshot({
          path: process.env.FRONT_DESK_SCREENSHOT,
          fullPage: true,
        });
      const beforeCustom = requests.length;
      await page
        .getByRole('combobox', { name: 'Chọn kỳ', exact: true })
        .focus();
      await page
        .getByRole('combobox', { name: 'Chọn kỳ', exact: true })
        .press('ArrowDown');
      await page.getByTitle('Khoảng ngày tùy chọn', { exact: true }).click();
      await page.getByRole('button', { name: 'Áp dụng kỳ thống kê' }).click();
      await page.getByText(/Hãy nhập ngày bắt đầu có thật/).waitFor();
      assert.equal(requests.length, beforeCustom);
      await page.getByLabel('Từ ngày (bắt buộc)').fill('2024-01-01');
      await page.getByLabel('Đến ngày (bắt buộc)').fill('2025-01-01');
      await page.getByRole('button', { name: 'Áp dụng kỳ thống kê' }).click();
      await page.getByText(/Khoảng ngày tối đa 366 ngày/).waitFor();
      assert.equal(requests.length, beforeCustom);
      await page.getByLabel('Từ ngày (bắt buộc)').fill('2026-10-01');
      await page.getByLabel('Đến ngày (bắt buộc)').fill('2026-10-31');
      await page.getByRole('button', { name: 'Áp dụng kỳ thống kê' }).click();
      await page
        .getByText('01/10/2026 – 31/10/2026', { exact: true })
        .waitFor();
      assert.deepEqual(requests.at(-1), {
        period: 'custom',
        from: '2026-10-01',
        to: '2026-10-31',
      });
      // Server's today remains November even while October is selected.
      await page.getByText(/Ngày vận hành: 20\/11\/2026/).waitFor();
      mode = 'error';
      await page.getByRole('button', { name: 'Làm mới số liệu' }).click();
      await page.getByText('Máy chủ tạm bận', { exact: true }).waitFor();
      assert.equal(
        await page
          .getByText('Lịch đặt hôm nay chưa tiếp nhận', { exact: true })
          .count(),
        0
      );
      mode = 'empty';
      await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
      await page
        .getByText('Chưa có lịch hẹn hoặc hóa đơn trong kỳ này.', {
          exact: true,
        })
        .waitFor();
      await page.getByText('Chưa có dữ liệu', { exact: true }).waitFor();
      await page
        .getByText('Lịch đặt hôm nay chưa tiếp nhận', { exact: true })
        .waitFor();
      // Late response after auth switch is ignored even if transport ignores abort.
      mode = 'late';
      await page.getByRole('button', { name: 'Làm mới số liệu' }).click();
      await page.waitForFunction(() => window.__frontDeskSignals.length >= 5);
      const deadline = Date.now() + 12000;
      while (!late && Date.now() < deadline)
        await new Promise(resolve => setTimeout(resolve, 10));
      assert.ok(late);
      await page.evaluate(() =>
        window.__setFrontDeskUser({ _id: 'owner-two', role: 'Admin' })
      );
      await page
        .getByRole('heading', { name: 'Trực tiếp tại quầy', exact: true })
        .waitFor();
      await late();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.getByText('999', { exact: true }).count(), 0);
      assert.equal(
        await page.evaluate(() =>
          window.__frontDeskSignals.slice(0, -1).every(signal => signal.aborted)
        ),
        true
      );
      assert.equal(
        await page
          .getByRole('button', {
            name: 'Tiếp nhận khách tại quầy',
            exact: true,
          })
          .count(),
        0
      );
      await page
        .getByRole('button', { name: 'Xem hóa đơn và chờ đón', exact: true })
        .click();
      await page
        .getByTestId('qa-location')
        .filter({ hasText: '/clinic/invoices' })
        .waitFor();
      assert.equal(
        await page.getByTestId('qa-location').textContent(),
        '/clinic/invoices'
      );
      const authorizedCalls = requests.length;
      for (const role of ['PetOwner', 'Veterinarian', 'Groomer']) {
        await page.evaluate(
          role => window.__setFrontDeskUser({ _id: role, role }),
          role
        );
        await page
          .getByText(
            'Tổng quan quầy lễ tân chỉ dành cho Lễ tân và Quản trị viên đã đăng nhập.',
            { exact: true }
          )
          .waitFor();
        assert.equal(requests.length, authorizedCalls);
        assert.equal(
          await page
            .getByRole('heading', { name: 'Trực tiếp tại quầy', exact: true })
            .count(),
          0
        );
      }
      await page.evaluate(() =>
        window.__setFrontDeskUser({ _id: 'owner-three', role: 'Receptionist' })
      );
      await page
        .getByRole('heading', { name: 'Trực tiếp tại quầy', exact: true })
        .waitFor();
      await page
        .getByRole('button', { name: 'Tiếp nhận khách tại quầy', exact: true })
        .click();
      await page
        .getByTestId('qa-location')
        .filter({ hasText: '/clinic/appointments?walkin=new' })
        .waitFor();
      assert.equal(
        await page.getByTestId('qa-location').textContent(),
        '/clinic/appointments?walkin=new'
      );
      assert.deepEqual(pageErrors, []);
      console.log(
        'Desktop Chrome QA passed: full metrics, custom validation, server ranges, error/retry/empty/null, identity remount, abort+late guard, role guard, safe shortcuts.'
      );
    } finally {
      await browser?.close();
      await server.close();
    }
  }
);
