import test from 'node:test';
import assert from 'node:assert/strict';

const math = await import('../src/components/dashboard/chartMath.ts');

test('trend: columns up to 14 points, a line past that', () => {
  assert.equal(math.trendAsLine(7), false);
  assert.equal(math.trendAsLine(14), false);
  assert.equal(math.trendAsLine(15), true);
  assert.equal(math.trendAsLine(30), true);
});

test('donut arcs: shares, a 2px gap between parts, zero parts skipped', () => {
  const arcs = math.donutArcs(
    [
      { key: 'cash', value: 50 },
      { key: 'vnpay', value: 0 },
      { key: 'payos', value: 50 },
    ],
    100,
    2
  );
  assert.deepEqual(
    arcs.map(a => [a.key, a.start, a.length, a.share]),
    [
      ['cash', 0, 48, 0.5],
      ['payos', 50, 48, 0.5],
    ]
  );
  // one part alone is a full ring, no gap
  assert.deepEqual(
    math.donutArcs([{ key: 'cash', value: 10 }], 100, 2).map(a => a.length),
    [100]
  );
  assert.deepEqual(math.donutArcs([{ key: 'a', value: 0 }], 100, 2), []);
  assert.deepEqual(math.donutArcs([], 100, 2), []);
});

test('donut parts past the colour slots fold into "Khác"', () => {
  const parts = ['a', 'b', 'c', 'd'].map((key, i) => ({
    key,
    label: key,
    value: i + 1,
    display: String(i + 1),
  }));
  const folded = math.foldParts(parts, 3, v => `${v}đ`);
  assert.deepEqual(
    folded.map(p => [p.key, p.value]),
    [
      ['a', 1],
      ['b', 2],
      ['other', 7],
    ]
  );
  assert.equal(folded[2].label, 'Khác');
  assert.equal(folded[2].display, '7đ');
  assert.equal(math.foldParts(parts.slice(0, 3), 3, String).length, 3);
});

test('parts keep a fixed order whatever their size, unknown ones last', () => {
  const items = [
    { k: 'PayOS', v: 900 },
    { k: 'Other', v: 5 },
    { k: 'Cash', v: 10 },
    { k: 'VNPay', v: 50 },
  ];
  assert.deepEqual(
    math.orderedBy(items, i => i.k, ['Cash', 'VNPay', 'PayOS']).map(i => i.k),
    ['Cash', 'VNPay', 'PayOS', 'Other']
  );
});

test('axis labels: every n-th and the last, never two touching at the end', () => {
  const shown = length =>
    Array.from({ length }, (_, i) => i).filter(i =>
      math.showTick(i, length, 4)
    );
  assert.deepEqual(shown(30), [0, 4, 8, 12, 16, 20, 24, 29]);
  assert.deepEqual(shown(29), [0, 4, 8, 12, 16, 20, 24, 28]);
  assert.deepEqual(shown(5), [0, 4]);
  assert.deepEqual(shown(1), [0]);
});

test('the trend stops at today: later days or months are not data yet', () => {
  const days = ['2026-11-23', '2026-11-24', '2026-11-25'].map(period => ({
    period,
  }));
  assert.deepEqual(
    math.upToToday(days, '2026-11-24').map(p => p.period),
    ['2026-11-23', '2026-11-24']
  );
  const months = ['2026-10', '2026-11', '2026-12'].map(period => ({ period }));
  assert.deepEqual(
    math.upToToday(months, '2026-11-24').map(p => p.period),
    ['2026-10', '2026-11']
  );
});

test('share text and trend paths', () => {
  assert.equal(math.shareText(1 / 3), '33,3%');
  assert.equal(math.shareText(1), '100%');
  const { line, area } = math.trendPaths([0, 50, 100], 100, 300, 100);
  assert.equal(line, 'M50,100 L150,50 L250,0');
  assert.equal(area, 'M50,100 L50,100 L150,50 L250,0 L250,100 Z');
  assert.deepEqual(math.trendPaths([], 100, 300, 100), { line: '', area: '' });
});
