import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNASSIGNED_ROW_KEY,
  buildScheduleEntries,
  buildScheduleRows,
  buildTimeSlots,
  toMinutes,
} from '../src/pages/AppointmentReception/components/clinicScheduleHelpers.ts';

const order = (id, extra = {}) => ({
  _id: id,
  code: `APT-${id}`,
  derivedStatus: 'Booked',
  slotStart: null,
  ...extra,
});
const service = (id, sequenceNo, extra = {}) => ({
  _id: id,
  orderId: 'o',
  sequenceNo,
  status: 'Booked',
  serviceId: { _id: `s-${id}`, name: `Dịch vụ ${id}`, defaultDuration: 30 },
  assignedStaffId: null,
  ...extra,
});
const vet = (id, name) => ({
  _id: id,
  code: id,
  fullName: name,
  role: 'Veterinarian',
  status: 'Active',
});
const groomer = (id, name) => ({
  _id: id,
  code: id,
  fullName: name,
  role: 'Groomer',
  status: 'Active',
});

test('SCR-17 grid: 08:00–18:00 in 15-minute columns', () => {
  const slots = buildTimeSlots();
  assert.equal(slots.length, 40);
  assert.equal(slots[0], '08:00');
  assert.equal(slots.at(-1), '17:45');
  assert.equal(toMinutes('09:30'), 570);
  assert.ok(Number.isNaN(toMinutes('25:00')));
  assert.ok(Number.isNaN(toMinutes(null)));
});

test('services use the BE schedule, else follow each other from the order slot', () => {
  const withSlot = order('a', { slotStart: '09:00' });
  const noTime = order('b');
  const services = new Map([
    // Sequence order wins over array order; the second has no stored time
    [
      'a',
      [
        service('2', 2),
        service('1', 1, {
          serviceId: { _id: 's', name: 'Khám', defaultDuration: 45 },
        }),
      ],
    ],
    ['b', [service('3', 1)]],
  ]);
  const { entries, unscheduled } = buildScheduleEntries(
    [withSlot, noTime],
    services
  );
  assert.deepEqual(
    entries.map(e => [e.service._id, e.start, e.end]),
    [
      ['1', 540, 585],
      ['2', 585, 615],
    ]
  );
  assert.deepEqual(
    unscheduled.map(o => o._id),
    ['b']
  );

  const stored = buildScheduleEntries(
    [order('c')],
    new Map([
      [
        'c',
        [service('4', 1, { scheduledStart: '10:15', scheduledEnd: '11:00' })],
      ],
    ])
  );
  assert.deepEqual(
    stored.entries.map(e => [e.start, e.end]),
    [[615, 660]]
  );
});

test('rows: vets then groomers, unassigned last, off-shift staff with work added', () => {
  const o = order('a', { slotStart: '09:00' });
  const entries = [
    {
      order: o,
      service: service('x', 1, {
        assignedStaffId: { _id: 'v2', fullName: 'An', role: 'Veterinarian' },
      }),
      start: 540,
      end: 570,
    },
    {
      order: o,
      service: service('y', 2, { assignedStaffId: 'v9' }),
      start: 570,
      end: 600,
    },
    { order: o, service: service('z', 3), start: 600, end: 630 },
  ];
  const rows = buildScheduleRows(
    [groomer('g1', 'Bình'), vet('v2', 'An')],
    entries
  );
  assert.deepEqual(
    rows.map(r => r.key),
    ['v2', 'g1', 'v9', UNASSIGNED_ROW_KEY]
  );
  const v2 = rows.find(r => r.key === 'v2');
  assert.equal(v2.onShift, true);
  assert.deepEqual([v2.blocks[0].column, v2.blocks[0].span], [4, 2]);
  assert.equal(rows.find(r => r.key === 'v9').onShift, false);
});

test('overlapping blocks of one staff get separate lanes; cancelled ones hide by default', () => {
  const o = order('a');
  const staffRef = { _id: 'v1', fullName: 'An', role: 'Veterinarian' };
  const entries = [
    {
      order: o,
      service: service('1', 1, { assignedStaffId: staffRef }),
      start: 540,
      end: 600,
    },
    {
      order: o,
      service: service('2', 1, { assignedStaffId: staffRef }),
      start: 570,
      end: 630,
    },
    {
      order: o,
      service: service('3', 1, { assignedStaffId: staffRef }),
      start: 600,
      end: 615,
    },
    {
      order: o,
      service: service('4', 1, {
        assignedStaffId: staffRef,
        status: 'Cancelled',
      }),
      start: 540,
      end: 570,
    },
  ];
  const [row] = buildScheduleRows([vet('v1', 'An')], entries);
  assert.equal(row.lanes, 2);
  assert.deepEqual(
    row.blocks.map(b => [b.key, b.lane]),
    [
      ['1', 0],
      ['2', 1],
      ['3', 0],
    ]
  );
  const [withCancelled] = buildScheduleRows([vet('v1', 'An')], entries, {
    showCancelled: true,
  });
  assert.equal(withCancelled.blocks.length, 4);
});

test('blocks outside working hours stay visible at the edge of the day', () => {
  const o = order('a');
  const entries = [
    { order: o, service: service('early', 1), start: 7 * 60, end: 7 * 60 + 30 },
    {
      order: o,
      service: service('late', 2),
      start: 18 * 60 + 30,
      end: 19 * 60,
    },
    {
      order: o,
      service: service('cross', 3),
      start: 17 * 60 + 30,
      end: 18 * 60 + 30,
    },
  ];
  const [row] = buildScheduleRows([], entries);
  const byKey = Object.fromEntries(
    row.blocks.map(b => [b.key, [b.column, b.span]])
  );
  assert.deepEqual(byKey.early, [0, 1]);
  assert.deepEqual(byKey.late, [39, 1]);
  assert.deepEqual(byKey.cross, [38, 2]);
});
