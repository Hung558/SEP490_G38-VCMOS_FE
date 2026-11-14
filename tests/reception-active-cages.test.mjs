import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectActiveCageOrderIds,
  getActiveCageOrderId,
  indexActiveCagesByOrder,
  matchesActiveCageAssignment,
} from '../src/pages/AppointmentReception/components/activeCageAssignments.ts';
import { getReceptionCageChoices } from '../src/pages/AppointmentReception/components/receptionCages.ts';

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

test('check-in assignment acknowledgement must match the requested order and cage and be open', () => {
  const assignment = {
    orderId: { _id: ORDER },
    cageId: { _id: 'cage' },
    releasedAt: null,
  };
  assert.equal(matchesActiveCageAssignment(assignment, ORDER, 'cage'), true);
  assert.equal(
    matchesActiveCageAssignment(
      { ...assignment, orderId: ORDER, cageId: 'cage' },
      ORDER,
      'cage'
    ),
    true
  );
  assert.equal(
    matchesActiveCageAssignment(assignment, OTHER_ORDER, 'cage'),
    false
  );
  assert.equal(
    matchesActiveCageAssignment(assignment, ORDER, 'different-cage'),
    false
  );
  assert.equal(
    matchesActiveCageAssignment(
      { ...assignment, releasedAt: '2026-11-14T01:00:00Z' },
      ORDER,
      'cage'
    ),
    false
  );
  assert.equal(matchesActiveCageAssignment(null, ORDER, 'cage'), false);
});

test('reception cage choices match availability, holding zone, capacity and isolation', () => {
  const base = {
    status: 'Available',
    zone: 'Holding',
    size: 'M',
    isIsolated: false,
  };
  const cages = [
    { ...base, _id: 'normal' },
    { ...base, _id: 'small', size: 'S' },
    { ...base, _id: 'isolation', isIsolated: true, maxWeightKg: 8 },
    { ...base, _id: 'larger-isolation', isIsolated: true, size: 'L' },
    { ...base, _id: 'inpatient', isIsolated: true, zone: 'InpatientWard' },
    { ...base, _id: 'occupied', isIsolated: true, status: 'Occupied' },
  ];
  const ids = (weight, isolation) =>
    getReceptionCageChoices(cages, weight, isolation).map(cage => cage._id);
  assert.deepEqual(ids(8, false), ['normal']);
  assert.deepEqual(ids(8, true), ['isolation', 'larger-isolation']);
  assert.deepEqual(ids(9, true), ['larger-isolation']);
  assert.deepEqual(ids(undefined, false), ['normal', 'small']);
});
