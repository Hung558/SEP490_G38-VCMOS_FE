import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEDULE_VIEWS,
  UNASSIGNED_ROW_KEY,
  buildScheduleEntries,
  buildScheduleRows,
  buildTimeSlots,
  getScheduleView,
  hourTicksInView,
  indexBusyShifts,
  layoutBlocksInView,
  offBandsInView,
  shiftBandsInView,
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

test('SCR-17 grid: 08:00–21:00 in 15-minute columns (evening shift, BE 0ac184d)', () => {
  const slots = buildTimeSlots();
  assert.equal(slots.length, 52);
  assert.equal(slots[0], '08:00');
  assert.ok(slots.includes('18:30'));
  assert.equal(slots.at(-1), '20:45');
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
      start: 21 * 60 + 30,
      end: 22 * 60,
    },
    {
      order: o,
      service: service('cross', 3),
      start: 20 * 60 + 30,
      end: 21 * 60 + 30,
    },
    // An evening service is inside the day now, at its own time
    {
      order: o,
      service: service('evening', 4),
      start: 18 * 60 + 30,
      end: 19 * 60,
    },
  ];
  const [row] = buildScheduleRows([], entries);
  const byKey = Object.fromEntries(
    row.blocks.map(b => [b.key, [b.column, b.span]])
  );
  assert.deepEqual(byKey.early, [0, 1]);
  assert.deepEqual(byKey.late, [51, 1]);
  assert.deepEqual(byKey.cross, [50, 2]);
  assert.deepEqual(byKey.evening, [42, 2]);
});

const close = (a, b) => Math.abs(a - b) < 1e-9;
const blockAt = (key, from, to) => ({
  key,
  start: toMinutes(from),
  end: toMinutes(to),
  order: order(key),
  service: service(key, 1),
  column: 0,
  span: 1,
  lane: 0,
});

test('views: the whole day 08:00–21:00 and the three shifts of the staff schedule', () => {
  assert.deepEqual(
    SCHEDULE_VIEWS.map(v => [v.key, v.start / 60, v.end / 60]),
    [
      ['day', 8, 21],
      ['MORNING', 8, 12],
      ['AFTERNOON', 12, 17],
      ['EVENING', 17, 21],
    ]
  );
  assert.equal(getScheduleView('nope').key, 'day');

  // The band above the hours: three shifts across the day, the evening last
  const day = shiftBandsInView(getScheduleView('day'));
  assert.deepEqual(
    day.map(b => [b.label, b.time]),
    [
      ['Ca sáng', '08:00–12:00'],
      ['Ca chiều', '12:00–17:00'],
      ['Ca tối', '17:00–21:00'],
    ]
  );
  assert.ok(close(day[2].leftPct, (9 / 13) * 100));
  assert.ok(close(day[2].leftPct + day[2].widthPct, 100));
  const evening = shiftBandsInView(getScheduleView('EVENING'));
  assert.equal(evening.length, 1);
  assert.ok(close(evening[0].leftPct, 0) && close(evening[0].widthPct, 100));

  const ticks = hourTicksInView(getScheduleView('EVENING'));
  assert.deepEqual(
    ticks.map(t => t.label),
    ['17:00', '18:00', '19:00', '20:00']
  );
  assert.ok(close(ticks[2].leftPct, 50));
  assert.equal(hourTicksInView(getScheduleView('day')).length, 13);
});

test('blocks are placed in percent of the view, in lanes, and cut at its edges', () => {
  const day = getScheduleView('day');
  const { blocks, lanes } = layoutBlocksInView(
    [
      blockAt('a', '19:00', '19:30'),
      blockAt('b', '19:15', '19:45'),
      blockAt('c', '19:30', '20:00'),
    ],
    day
  );
  const byKey = Object.fromEntries(blocks.map(b => [b.key, b]));
  assert.ok(close(byKey.a.leftPct, (11 / 13) * 100));
  assert.ok(close(byKey.a.widthPct, (0.5 / 13) * 100));
  // b overlaps a: second lane; c starts when a ends: back in the first lane
  assert.deepEqual([byKey.a.lane, byKey.b.lane, byKey.c.lane], [0, 1, 0]);
  assert.equal(lanes, 2);

  // The evening view only keeps evening work, at its own place
  const eve = layoutBlocksInView(
    [
      blockAt('morning', '09:00', '09:30'),
      blockAt('late', '20:30', '21:00'),
      blockAt('cross', '16:30', '17:30'),
      blockAt('after', '21:30', '22:00'),
    ],
    getScheduleView('EVENING')
  );
  const e = Object.fromEntries(eve.blocks.map(b => [b.key, b]));
  assert.equal(e.morning, undefined);
  assert.ok(close(e.late.leftPct, 87.5) && close(e.late.widthPct, 12.5));
  // Started in the afternoon: cut at 17:00 and marked so
  assert.ok(close(e.cross.leftPct, 0) && close(e.cross.widthPct, 12.5));
  assert.equal(e.cross.cutStart, true);
  // After closing: kept in the evening, pinned to the right edge, never zero wide
  assert.ok(
    e.after.widthPct > 0 && close(e.after.leftPct + e.after.widthPct, 100)
  );
  assert.equal(e.after.cutEnd, true);

  // The afternoon view also shows the part of a service crossing into it
  const aft = layoutBlocksInView(
    [blockAt('cross', '16:30', '17:30')],
    getScheduleView('AFTERNOON')
  );
  assert.equal(aft.blocks[0].cutEnd, true);
  assert.equal(layoutBlocksInView([], day).lanes, 1);
});

test('off shifts of the staff schedule shade their part of the row', () => {
  const off = indexBusyShifts([
    {
      _id: '1',
      staffId: { _id: 'v1', fullName: 'An' },
      date: 'd',
      shift: 'EVENING',
    },
    { _id: '2', staffId: 'v1', date: 'd', shift: 'MORNING' },
    { _id: '3', staffId: 'v1', date: 'd', shift: 'MORNING' },
    { _id: '4', staffId: 'g1', date: 'd', shift: 'AFTERNOON' },
  ]);
  assert.deepEqual(off.get('v1'), ['EVENING', 'MORNING']);
  assert.deepEqual(off.get('g1'), ['AFTERNOON']);
  assert.equal(indexBusyShifts(null).size, 0);

  const dayBands = offBandsInView(off.get('v1'), getScheduleView('day'));
  assert.deepEqual(
    dayBands.map(b => b.key),
    ['MORNING', 'EVENING']
  );
  assert.deepEqual(
    offBandsInView(off.get('v1'), getScheduleView('AFTERNOON')),
    []
  );
  const eve = offBandsInView(off.get('v1'), getScheduleView('EVENING'));
  assert.ok(eve.length === 1 && close(eve[0].widthPct, 100));
  assert.deepEqual(offBandsInView(undefined, getScheduleView('day')), []);
});
