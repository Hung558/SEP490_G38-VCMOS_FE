import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAddToBillPatch,
  buildBestSellingQuery,
  clearPayosPayment,
  getInvoiceMethodLabel,
  getPayosCheckoutUrl,
  getPayosStatusLabel,
  hasPendingPayosCode,
  INVOICE_METHODS,
  isPayosCodeClosed,
  PAYOS_CACHE_PREFIX,
  PAYOS_CHECK_UNREACHABLE,
  readPayosError,
  readPayosPayment,
  savePayosPayment,
} from '../src/services/InvoiceService/helpers.ts';
import {
  apiBestSellingProducts,
  apiInvoicePayosStatus,
  apiInvoicePayosUrl,
} from '../src/services/InvoiceService/urls.ts';
import {
  countRangeDays,
  formatReportRange,
  getPeriodRange,
  getShareOfTop,
  isReportRangeValid,
  matchReportPeriod,
} from '../src/pages/AdminReports/components/reportRange.ts';

// Wednesday 18/11/2026, 15:30 local time
const WED = new Date(2026, 10, 18, 15, 30);

test('P1: PayOS uses the QR payment label while legacy methods remain available', () => {
  assert.equal(getInvoiceMethodLabel('PayOS'), 'Thanh toán QR');
  assert.equal(getInvoiceMethodLabel('Cash'), 'Tiền mặt');
  assert.equal(getInvoiceMethodLabel('VNPay'), 'VNPay');
  assert.deepEqual(INVOICE_METHODS, ['Cash', 'VNPay', 'PayOS']);
});

test('P2: PayOS URLs match the BE routes', () => {
  assert.equal(apiInvoicePayosUrl('i1'), '/invoices/i1/payos-url');
  assert.equal(apiInvoicePayosStatus('a/b'), '/invoices/a%2Fb/payos-status');
});

test('P2: PayOS statuses read in Vietnamese; unknown ones stay as sent', () => {
  assert.equal(getPayosStatusLabel('PENDING'), 'Đang chờ khách chuyển khoản');
  assert.equal(
    getPayosStatusLabel('PROCESSING'),
    'Đang xử lý giao dịch thanh toán QR'
  );
  assert.equal(getPayosStatusLabel('CANCELLED'), 'Giao dịch đã bị hủy');
  assert.equal(getPayosStatusLabel('SOMETHING_NEW'), 'SOMETHING_NEW');
  assert.equal(getPayosStatusLabel(undefined), '-');
});

test('P2: only a cancelled, expired or failed code is safe to replace', () => {
  for (const status of ['CANCELLED', 'EXPIRED', 'FAILED']) {
    assert.equal(isPayosCodeClosed(status), true, status);
  }
  for (const status of [
    'PENDING',
    'PROCESSING',
    'PAID',
    'UNDERPAID',
    undefined,
  ]) {
    assert.equal(isPayosCodeClosed(status), false, String(status));
  }
});

test('P2: an Unpaid bill with a PayOS order code has a code to check first', () => {
  assert.equal(
    hasPendingPayosCode({
      paymentStatus: 'Unpaid',
      payosOrderCode: 1763447000123,
    }),
    true
  );
  assert.equal(
    hasPendingPayosCode({
      paymentStatus: 'Paid',
      payosOrderCode: 1763447000123,
    }),
    false
  );
  assert.equal(
    hasPendingPayosCode({ paymentStatus: 'Unpaid', payosOrderCode: null }),
    false
  );
  assert.equal(hasPendingPayosCode({ paymentStatus: 'Unpaid' }), false);
  assert.equal(hasPendingPayosCode(undefined), false);
});

test('P3: the report query drops empty values and keeps limit within 1..50', () => {
  assert.equal(
    apiBestSellingProducts,
    '/invoices/reports/best-selling-products'
  );
  assert.deepEqual(
    buildBestSellingQuery({
      from: ' 2026-11-16 ',
      to: '2026-11-18',
      category: undefined,
      sortBy: 'revenue',
      limit: 99,
    }),
    { from: '2026-11-16', to: '2026-11-18', sortBy: 'revenue', limit: 50 }
  );
  assert.deepEqual(buildBestSellingQuery({ limit: 0 }), { limit: 1 });
  assert.deepEqual(buildBestSellingQuery({ limit: 12.7 }), { limit: 12 });
  assert.deepEqual(buildBestSellingQuery(), {});
});

test('P3: today, this week from Monday and this month from the 1st, up to today', () => {
  assert.deepEqual(getPeriodRange('day', WED), {
    from: '2026-11-18',
    to: '2026-11-18',
  });
  assert.deepEqual(getPeriodRange('week', WED), {
    from: '2026-11-16',
    to: '2026-11-18',
  });
  assert.deepEqual(getPeriodRange('month', WED), {
    from: '2026-11-01',
    to: '2026-11-18',
  });
  // Sunday still belongs to the week that began on Monday
  const SUN = new Date(2026, 10, 22, 9, 0);
  assert.deepEqual(getPeriodRange('week', SUN), {
    from: '2026-11-16',
    to: '2026-11-22',
  });
  // Across a month and a year boundary
  const JAN1 = new Date(2027, 0, 1, 8, 0);
  assert.deepEqual(getPeriodRange('week', JAN1), {
    from: '2026-12-28',
    to: '2027-01-01',
  });
});

test('P3: a picked range is matched back to its period, or is custom', () => {
  assert.equal(
    matchReportPeriod({ from: '2026-11-16', to: '2026-11-18' }, WED),
    'week'
  );
  assert.equal(
    matchReportPeriod({ from: '2026-11-01', to: '2026-11-18' }, WED),
    'month'
  );
  assert.equal(
    matchReportPeriod({ from: '2026-11-10', to: '2026-11-18' }, WED),
    undefined
  );
});

test('P3: the BE accepts 1 to 366 days with from not after to', () => {
  assert.equal(countRangeDays({ from: '2026-11-18', to: '2026-11-18' }), 1);
  assert.equal(countRangeDays({ from: '2026-11-19', to: '2026-11-18' }), 0);
  assert.equal(
    isReportRangeValid({ from: '2025-11-18', to: '2026-11-18' }),
    true
  ); // 366 days
  assert.equal(
    isReportRangeValid({ from: '2025-11-17', to: '2026-11-18' }),
    false
  ); // 367
  assert.equal(
    isReportRangeValid({ from: '2026-11-19', to: '2026-11-18' }),
    false
  );
});

test('P3: ranges and bars read as on screen', () => {
  assert.equal(
    formatReportRange({ from: '2026-11-18', to: '2026-11-18' }),
    '18/11/2026'
  );
  assert.equal(
    formatReportRange({ from: '2026-11-16', to: '2026-11-18' }),
    '16/11/2026 – 18/11/2026'
  );
  assert.equal(getShareOfTop(60, 120), 50);
  assert.equal(getShareOfTop(120, 120), 100);
  assert.equal(getShareOfTop(5, 0), 0);
});

// ---- the live code is kept in the browser between two openings of the bill ----
const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    key: i => [...data.keys()][i] ?? null,
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: k => data.delete(k),
    keys: () => [...data.keys()],
  };
};
const NOW = Date.parse('2026-11-18T15:00:00Z');
const payment = (over = {}) => ({
  invoiceId: 'inv1',
  invoiceCode: 'INV-K8M2PX',
  orderCode: 1763447000123,
  paymentLinkId: '0bac53aa220544c79a4fd42113a64194',
  amount: 20000,
  checkoutUrl: 'https://pay.payos.vn/web/0bac53aa220544c79a4fd42113a64194',
  paymentUrl: 'https://pay.payos.vn/web/0bac53aa220544c79a4fd42113a64194',
  qrCode: '00020101021238570010A000000727',
  accountName: 'HA DUY HUNG',
  accountNumber: 'VQR123',
  bin: '970422',
  expiresAt: new Date(NOW + 10 * 60000).toISOString(),
  ...over,
});
const bill = (over = {}) => ({
  _id: 'inv1',
  paymentStatus: 'Unpaid',
  payosOrderCode: 1763447000123,
  totalAmount: 20000,
  ...over,
});

test('P2 keep: a saved code comes back while it is the BE code, same total, not expired', () => {
  const store = memoryStorage();
  savePayosPayment(payment(), store, NOW);
  assert.deepEqual(store.keys(), [`${PAYOS_CACHE_PREFIX}inv1`]);
  assert.equal(
    readPayosPayment(bill(), store, NOW + 60000)?.qrCode,
    '00020101021238570010A000000727'
  );
});

test('P2 keep: a replaced, re-totalled, paid or expired code is dropped', () => {
  const cases = [
    ['code replaced elsewhere', bill({ payosOrderCode: 1763447999999 }), NOW],
    ['lines changed the total', bill({ totalAmount: 25000 }), NOW],
    ['bill paid', bill({ paymentStatus: 'Paid' }), NOW],
    ['expired', bill(), NOW + 11 * 60000],
  ];
  for (const [label, invoice, now] of cases) {
    const store = memoryStorage();
    savePayosPayment(payment(), store, NOW);
    assert.equal(readPayosPayment(invoice, store, now), undefined, label);
    assert.equal(store.length, 0, `${label}: removed from storage`);
  }
});

test('P2 keep: broken JSON, no storage or a throwing storage never break the panel', () => {
  const broken = memoryStorage({ [`${PAYOS_CACHE_PREFIX}inv1`]: '{not json' });
  assert.equal(readPayosPayment(bill(), broken, NOW), undefined);
  assert.equal(broken.length, 0);
  assert.equal(readPayosPayment(bill(), undefined, NOW), undefined);
  const throwing = {
    length: 0,
    key: () => null,
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };
  assert.doesNotThrow(() => savePayosPayment(payment(), throwing, NOW));
  assert.equal(readPayosPayment(bill(), throwing, NOW), undefined);
  assert.doesNotThrow(() => clearPayosPayment('inv1', throwing));
});

test('P2 keep: saving a code prunes expired codes of other bills', () => {
  const store = memoryStorage({
    [`${PAYOS_CACHE_PREFIX}old`]: JSON.stringify(
      payment({
        invoiceId: 'old',
        expiresAt: new Date(NOW - 1000).toISOString(),
      })
    ),
    'other-app-key': 'kept',
  });
  savePayosPayment(payment(), store, NOW);
  assert.deepEqual(
    store.keys().sort(),
    ['other-app-key', `${PAYOS_CACHE_PREFIX}inv1`].sort()
  );
});

test('P2 keep: the PayOS page of a code made elsewhere comes from its link id', () => {
  assert.equal(
    getPayosCheckoutUrl('0bac53aa220544c79a4fd42113a64194'),
    'https://pay.payos.vn/web/0bac53aa220544c79a4fd42113a64194'
  );
  assert.equal(getPayosCheckoutUrl(null), undefined);
  assert.equal(getPayosCheckoutUrl('../evil'), undefined);
});

test('P2: when the BE cannot reach PayOS the message says so; other errors stay', () => {
  const err = (status, message) => ({
    response: { status, data: { message } },
  });
  const read = e =>
    readPayosError(e, 'fallback', PAYOS_CHECK_UNREACHABLE).message;
  assert.equal(
    read(err(504, 'Kết nối tới PayOS quá thời gian chờ')),
    PAYOS_CHECK_UNREACHABLE
  );
  assert.equal(
    read(err(502, 'Lỗi kết nối cổng thanh toán PayOS (503)')),
    PAYOS_CHECK_UNREACHABLE
  );
  assert.equal(
    read(err(500, 'Lỗi máy chủ khi xử lý hóa đơn và thanh toán')),
    PAYOS_CHECK_UNREACHABLE
  );
  const keys =
    'Chưa cấu hình đầy đủ PAYOS_CLIENT_ID, PAYOS_API_KEY và PAYOS_CHECKSUM_KEY trong .env';
  assert.equal(read(err(500, keys)), keys);
  assert.equal(
    read(err(400, 'Hóa đơn này chưa khởi tạo giao dịch thanh toán PayOS')),
    'Hóa đơn này chưa khởi tạo giao dịch thanh toán PayOS'
  );
  assert.equal(read(new Error('Network Error')), 'fallback');
});

// ---- adding a product the issued bill already has ----
const line = (over = {}) => ({
  _id: 'l1',
  type: 'Product',
  refId: 'p1',
  unitPriceSnapshot: 35000,
  quantity: 1,
  ...over,
});
const para = { _id: 'p1', unitPrice: 35000 };

test('K1 merge: a product not on the bill is simply added', () => {
  assert.deepEqual(buildAddToBillPatch([line({ refId: 'p2' })], para, 2), {
    payload: { addItems: [{ productId: 'p1', quantity: 2 }] },
    overLimit: false,
  });
});

test('K1 merge: the same product at the same price ends on one line with the sum', () => {
  // The user's bill: Paracetamol three times at 1 each, then 1 more
  const items = [
    {
      _id: 's1',
      type: 'Service',
      refId: 'svc',
      unitPriceSnapshot: 320000,
      quantity: 1,
    },
    line({ _id: 'a' }),
    line({ _id: 'x', refId: 'p9', unitPriceSnapshot: 20 }),
    line({ _id: 'b' }),
    line({ _id: 'c' }),
  ];
  assert.deepEqual(buildAddToBillPatch(items, para, 1), {
    payload: {
      removeItemIds: ['a', 'b', 'c'],
      addItems: [{ productId: 'p1', quantity: 4 }],
    },
    mergedQuantity: 4,
    overLimit: false,
  });
});

test('K1 merge: a line at an older price keeps its price (BR-16)', () => {
  const patch = buildAddToBillPatch(
    [line({ _id: 'old', unitPriceSnapshot: 30000 }), line({ _id: 'now' })],
    para,
    2
  );
  assert.deepEqual(patch.payload, {
    removeItemIds: ['now'],
    addItems: [{ productId: 'p1', quantity: 3 }],
  });
});

test('K1 merge: a sum above the BE limit of 99 is added as its own line', () => {
  const patch = buildAddToBillPatch([line({ quantity: 98 })], para, 5);
  assert.deepEqual(patch, {
    payload: { addItems: [{ productId: 'p1', quantity: 5 }] },
    overLimit: true,
  });
  assert.equal(
    buildAddToBillPatch([line({ quantity: 98 })], para, 1).mergedQuantity,
    99
  );
});
