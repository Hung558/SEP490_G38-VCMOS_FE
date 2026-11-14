import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimeInCage,
  getCageBlockReason,
  indexOpenAssignmentsByCage,
  pickOrdersWithoutCage,
  sortCagesForBoard,
  summarizeCages,
} from '../src/pages/Cages/components/cageBoardHelpers.ts';

const cage = (label, extra = {}) => ({
  _id: `id-${label}`,
  label,
  size: 'M',
  isIsolated: false,
  status: 'Available',
  ...extra,
});

test('SCR-19 board: cages in natural label order', () => {
  assert.deepEqual(
    sortCagesForBoard([cage('C-10'), cage('C-2'), cage('C-1')]).map(
      c => c.label
    ),
    ['C-1', 'C-2', 'C-10']
  );
});

test('summary counts available and occupied cages', () => {
  assert.deepEqual(
    summarizeCages([cage('A'), cage('B', { status: 'Occupied' }), cage('C')]),
    { total: 3, available: 2, occupied: 1 }
  );
});

test('each cage keeps its newest open assignment, released ones are ignored', () => {
  const newest = {
    _id: 'a2',
    cageId: { _id: 'id-A' },
    orderId: 'o2',
    releasedAt: null,
  };
  const older = { _id: 'a1', cageId: 'id-A', orderId: 'o1', releasedAt: null };
  const released = {
    _id: 'a3',
    cageId: 'id-B',
    orderId: 'o3',
    releasedAt: '2026-11-14T01:00:00Z',
  };
  const byCage = indexOpenAssignmentsByCage([newest, older, released]);
  assert.equal(byCage.size, 1);
  assert.equal(byCage.get('id-A'), newest);
});

test('only checked-in orders without an open cage can be placed', () => {
  const order = (id, derivedStatus) => ({ _id: id, code: id, derivedStatus });
  const orders = [
    order('booked', 'Booked'),
    order('in', 'CheckedIn'),
    order('caged', 'CheckedIn'),
    order('running', 'InProgress'),
    order('pickup', 'WaitOwner'),
    order('done', 'Done'),
    order('in', 'CheckedIn'),
  ];
  const assignments = [
    { orderId: { _id: 'caged' }, releasedAt: null },
    { orderId: 'running', releasedAt: '2026-11-14T02:00:00Z' },
  ];
  assert.deepEqual(
    pickOrdersWithoutCage(orders, assignments).map(o => o._id),
    ['in', 'running', 'pickup']
  );
});

test('BR-11: block reasons for occupied and too small cages', () => {
  assert.equal(
    getCageBlockReason(cage('A', { status: 'Occupied' }), 3),
    'Chuồng đang có thú cưng'
  );
  assert.match(getCageBlockReason(cage('S', { size: 'S' }), 8), /cỡ S/);
  assert.equal(getCageBlockReason(cage('S', { size: 'S' }), 4), undefined);
  // maxWeightKg overrides the size limit; unknown weight is not blocked
  assert.equal(
    getCageBlockReason(cage('S', { size: 'S', maxWeightKg: 10 }), 8),
    undefined
  );
  assert.equal(getCageBlockReason(cage('S', { size: 'S' })), undefined);
});

test('BR-11: isolation cages only for pets that need isolation, and only them', () => {
  const iso = cage('ISO', { isIsolated: true });
  assert.match(
    getCageBlockReason(iso, 3),
    /chỉ dành cho thú cưng nghi mắc bệnh lây/
  );
  assert.equal(getCageBlockReason(iso, 3, true), undefined);
  assert.match(
    getCageBlockReason(cage('A'), 3, true),
    /phải vào chuồng cách ly/
  );
  // Size still applies to isolation cages
  assert.match(
    getCageBlockReason(cage('ISO-S', { isIsolated: true, size: 'S' }), 8, true),
    /cỡ S/
  );
});

test('time in cage reads in minutes, hours and days', () => {
  const now = Date.parse('2026-11-14T10:00:00Z');
  assert.equal(formatTimeInCage('2026-11-14T09:48:00Z', now), '12 phút');
  assert.equal(formatTimeInCage('2026-11-14T07:55:00Z', now), '2 giờ 5 phút');
  assert.equal(formatTimeInCage('2026-11-14T08:00:00Z', now), '2 giờ');
  assert.equal(formatTimeInCage('2026-11-12T09:00:00Z', now), '2 ngày 1 giờ');
  assert.equal(formatTimeInCage(null, now), undefined);
  assert.equal(formatTimeInCage('not a date', now), undefined);
});
