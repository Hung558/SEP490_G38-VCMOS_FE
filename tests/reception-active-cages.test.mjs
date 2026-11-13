import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectActiveCageOrderIds,
  getActiveCageOrderId,
  indexActiveCagesByOrder,
} from '../src/pages/AppointmentReception/components/activeCageAssignments.ts';

const ORDER = '6ad96d4a9664da6b2c0d8a01';
const OTHER_ORDER = '6ad96d4a9664da6b2c0d8a02';

test('active cage assignment can reference a populated order or an ID', () => {
  assert.equal(
    getActiveCageOrderId({ orderId: { _id: ORDER }, releasedAt: null }),
    ORDER
  );
  assert.equal(getActiveCageOrderId({ orderId: ` ${ORDER} ` }), ORDER);
});

test('released, missing and invalid cage assignments never mark an order', () => {
  assert.equal(getActiveCageOrderId(null), undefined);
  assert.equal(getActiveCageOrderId({ orderId: null }), undefined);
  assert.equal(getActiveCageOrderId({ orderId: {} }), undefined);
  assert.equal(getActiveCageOrderId({ orderId: '   ' }), undefined);
  assert.equal(
    getActiveCageOrderId({ orderId: ORDER, releasedAt: '' }),
    undefined
  );
  assert.deepEqual(
    [
      ...collectActiveCageOrderIds([
        { orderId: ORDER, releasedAt: null },
        { orderId: { _id: ORDER } },
        { orderId: OTHER_ORDER, releasedAt: '2026-11-12T01:30:00Z' },
      ]),
    ],
    [ORDER]
  );
});

test('each order maps to its latest open assignment for the cage actions', () => {
  // GET /cage-assignments returns the newest assignment first
  const latest = { _id: 'a2', orderId: { _id: ORDER }, releasedAt: null };
  const older = { _id: 'a1', orderId: ORDER, releasedAt: null };
  const released = {
    _id: 'a3',
    orderId: OTHER_ORDER,
    releasedAt: '2026-11-12T01:30:00Z',
  };
  const byOrder = indexActiveCagesByOrder([latest, older, released]);
  assert.equal(byOrder.size, 1);
  assert.equal(byOrder.get(ORDER), latest);
  assert.equal(byOrder.has(OTHER_ORDER), false);
});
