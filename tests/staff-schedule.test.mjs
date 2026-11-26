import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUSY_REASON_MAX,
  SHIFT_INFO,
  buildBusySchedulePayload,
  busyKey,
  collectOrderWork,
  collectQueueWork,
  describeShiftCell,
  describeShiftHint,
  findBusyConflicts,
  getScheduleAccess,
  getShiftOfTime,
  getShiftPhase,
  getWeekDates,
  indexBusySchedules,
  indexShiftWork,
  isPastDay,
  shiftWeek,
  validateClearBusy,
  validateMarkBusy,
} from '../src/services/StaffScheduleService/helpers.ts';
import { buildStaffQuery } from '../src/services/StaffService/helpers.ts';
import { getServiceRefId } from '../src/services/AppointmentServiceService/helpers.ts';
import { buildServicePayload } from '../src/services/ServiceService/helpers.ts';

const SERVICE = '6ad96d4a9664da6b2c0d9a01';

test('B3: who may use the shift screen follows the SRS permission matrix', () => {
  assert.equal(getScheduleAccess('Admin'), 'manage');
  assert.equal(getScheduleAccess('Receptionist'), 'viewAll');
  assert.equal(getScheduleAccess('Veterinarian'), 'viewOwn');
  assert.equal(getScheduleAccess('Groomer'), 'viewOwn');
  assert.equal(getScheduleAccess('PetOwner'), undefined);
  assert.equal(getScheduleAccess(undefined), undefined);
});

test('B3: the week runs Monday to Sunday and moves by 7 days', () => {
  // 16/11/2026 is a Monday, 22/11 a Sunday
  assert.deepEqual(getWeekDates('2026-11-18'), [
    '2026-11-16',
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
    '2026-11-20',
    '2026-11-21',
    '2026-11-22',
  ]);
  assert.equal(getWeekDates('2026-11-22')[0], '2026-11-16');
  assert.equal(getWeekDates('2026-11-23')[0], '2026-11-23');
  assert.deepEqual(getWeekDates('bad'), []);
  assert.equal(shiftWeek('2026-11-18', 1), '2026-11-25');
  assert.equal(shiftWeek('2026-11-18', -1), '2026-11-11');
  assert.equal(shiftWeek('2026-12-30', 1), '2027-01-06');
});

test('B3: busy records are found by staff, date and shift', () => {
  const map = indexBusySchedules([
    {
      _id: 'b1',
      staffId: { _id: 'v1', fullName: 'An' },
      date: '2026-11-18',
      shift: 'MORNING',
    },
    { _id: 'b2', staffId: 'g1', date: '2026-11-18', shift: 'EVENING' },
  ]);
  assert.equal(map.get(busyKey('v1', '2026-11-18', 'MORNING'))._id, 'b1');
  assert.equal(map.get(busyKey('g1', '2026-11-18', 'EVENING'))._id, 'b2');
  assert.equal(map.get(busyKey('v1', '2026-11-18', 'AFTERNOON')), undefined);
  assert.equal(indexBusySchedules(null).size, 0);
  assert.equal(isPastDay('2026-11-15', '2026-11-16'), true);
  assert.equal(isPastDay('2026-11-16', '2026-11-16'), false);
});

test('B3: the busy payload trims the reason and keeps it within the BE limit', () => {
  const base = { staffId: 'v1', date: '2026-11-18', shift: 'MORNING' };
  assert.deepEqual(
    buildBusySchedulePayload({ ...base, reason: '  Nghỉ phép ' }),
    {
      ...base,
      reason: 'Nghỉ phép',
    }
  );
  assert.deepEqual(buildBusySchedulePayload({ ...base, reason: '   ' }), base);
  assert.throws(() =>
    buildBusySchedulePayload({
      ...base,
      reason: 'x'.repeat(BUSY_REASON_MAX + 1),
    })
  );
});

test('B2: the staff query passes service, date, time and shift, and drops bad values', () => {
  assert.deepEqual(
    buildStaffQuery({
      status: 'Active',
      date: '2026-11-18',
      time: '09:30',
      serviceId: ` ${SERVICE} `,
      limit: 100,
    }),
    {
      status: 'Active',
      date: '2026-11-18',
      time: '09:30',
      serviceId: SERVICE,
      limit: 100,
    }
  );
  assert.deepEqual(buildStaffQuery({ shift: 'EVENING' }), { shift: 'EVENING' });
  assert.deepEqual(
    buildStaffQuery({
      date: '18/11/2026',
      time: '25:00',
      shift: 'NIGHT',
      serviceId: 'abc',
    }),
    {}
  );
  assert.equal(getServiceRefId({ _id: SERVICE, name: 'Khám' }), SERVICE);
  assert.equal(getServiceRefId(SERVICE), SERVICE);
  assert.equal(getServiceRefId(null), undefined);
});

test('B4: the service payload sends the role chosen by the Admin', () => {
  const values = {
    name: ' Tắm thuốc ',
    category: 'Examination',
    defaultDuration: 30,
    basePrice: 100000,
  };
  assert.equal(
    buildServicePayload({ ...values, requiredRole: 'Groomer' }).requiredRole,
    'Groomer'
  );
  assert.equal('requiredRole' in buildServicePayload(values), false);
  assert.equal(
    'requiredRole' in buildServicePayload({ ...values, requiredRole: 'Nurse' }),
    false
  );
});

const [MORNING, AFTERNOON, EVENING] = SHIFT_INFO;
const VET = 'a1b2c3d4e5f6a1b2c3d4e5f6';

test('Ca làm việc: a shift is past once it ends, running between its hours, else upcoming', () => {
  const today = '2026-11-26';
  // Earlier days are over whatever the time
  assert.equal(getShiftPhase('2026-11-25', 'EVENING', today, '07:00'), 'past');
  assert.equal(
    getShiftPhase('2026-11-27', 'MORNING', today, '23:59'),
    'upcoming'
  );
  // Before opening every shift of today is still to come
  assert.equal(getShiftPhase(today, 'MORNING', today, '07:59'), 'upcoming');
  assert.equal(getShiftPhase(today, 'MORNING', today, '08:00'), 'current');
  assert.equal(getShiftPhase(today, 'MORNING', today, '11:59'), 'current');
  // 12:00 ends the morning and starts the afternoon
  assert.equal(getShiftPhase(today, 'MORNING', today, '12:00'), 'past');
  assert.equal(getShiftPhase(today, 'AFTERNOON', today, '12:00'), 'current');
  assert.equal(getShiftPhase(today, 'EVENING', today, '16:59'), 'upcoming');
  assert.equal(getShiftPhase(today, 'EVENING', today, '21:00'), 'past');
  assert.equal(getShiftPhase(today, 'EVENING', today, '9:05'), 'upcoming');
});

test('Ca làm việc: a service time falls in a shift the way the BE checks busy staff', () => {
  assert.equal(getShiftOfTime('07:30'), 'MORNING');
  assert.equal(getShiftOfTime('11:59'), 'MORNING');
  assert.equal(getShiftOfTime('12:00'), 'AFTERNOON');
  assert.equal(getShiftOfTime('16:59'), 'AFTERNOON');
  assert.equal(getShiftOfTime('17:00'), 'EVENING');
  assert.equal(getShiftOfTime('8:15'), 'MORNING');
  assert.equal(getShiftOfTime('25:00'), undefined);
  assert.equal(getShiftOfTime(''), undefined);
  assert.equal(getShiftOfTime(null), undefined);
});

const order = (over = {}) => ({
  _id: 'o1',
  code: 'APT-AAA111',
  petId: { _id: 'p1', name: 'Mít' },
  ownerId: 'u1',
  date: '2026-11-26',
  slotStart: '09:00',
  isOnline: true,
  derivedStatus: 'CheckedIn',
  services: [],
  ...over,
});
const service = (over = {}) => ({
  _id: 's1',
  orderId: 'o1',
  serviceId: { _id: 'c1', name: 'Khám tổng quát', category: 'Examination' },
  sequenceNo: 1,
  assignedStaffId: { _id: VET, fullName: 'Bá' },
  status: 'Waiting',
  isEmergency: false,
  ...over,
});
const workItem = (over = {}) => ({
  id: 'w1',
  orderCode: 'APT-1',
  serviceName: 'Khám',
  status: 'Waiting',
  statusLabel: 'Chờ thực hiện',
  time: '09:00',
  ...over,
});

test('Ca làm việc: only assigned, not cancelled services count as work, in the shift of their time', () => {
  const entries = collectOrderWork([
    order({
      services: [
        service(),
        // Its own start wins over the booking slot
        service({ _id: 's2', scheduledStart: '13:30', status: 'Done' }),
        service({ _id: 's3', status: 'Cancelled' }),
        service({ _id: 's4', status: 'Overdue' }),
        service({ _id: 's5', assignedStaffId: null }),
      ],
    }),
    // A walk-in without any time is placed at its check-in (17:40 in Vietnam)
    order({
      _id: 'o2',
      code: 'APT-BBB222',
      slotStart: null,
      checkedInAt: '2026-11-26T10:40:00.000Z',
      services: [service({ _id: 's6', orderId: 'o2', assignedStaffId: VET })],
    }),
    // No time at all: it cannot be placed in a shift
    order({
      _id: 'o3',
      slotStart: null,
      services: [service({ _id: 's7', orderId: 'o3' })],
    }),
  ]);
  assert.deepEqual(
    entries.map(e => [e.work.id, e.shift, e.work.time]),
    [
      ['s1', 'MORNING', '09:00'],
      ['s2', 'AFTERNOON', '13:30'],
      ['s6', 'EVENING', '17:40'],
    ]
  );
  assert.equal(entries[0].work.statusLabel, 'Chờ thực hiện');
  assert.equal(entries[0].work.petName, 'Mít');
  assert.equal(entries[0].work.serviceName, 'Khám tổng quát');
  assert.deepEqual(collectOrderWork(null), []);
});

test('Ca làm việc: a vet reads only their own queue items of the week', () => {
  const item = (id, date, over = {}) =>
    service({
      _id: id,
      orderId: { _id: `o-${id}`, code: `APT-${id}`, date, slotStart: '14:00' },
      ...over,
    });
  const entries = collectQueueWork(
    [
      item('q1', '2026-11-23'),
      item('q2', '2026-11-30'),
      item('q3', '2026-11-29', { status: 'InProgress' }),
      { ...item('q4', '2026-11-25'), orderId: 'not-populated' },
    ],
    VET,
    '2026-11-23',
    '2026-11-29'
  );
  assert.deepEqual(
    entries.map(e => [e.work.id, e.staffId, e.date, e.shift]),
    [
      ['q1', VET, '2026-11-23', 'AFTERNOON'],
      ['q3', VET, '2026-11-29', 'AFTERNOON'],
    ]
  );
  assert.equal(entries[1].work.statusLabel, 'Đang khám');
});

test('Ca làm việc: a cell has only the two BE states, shown as "Đi làm" and "Nghỉ", past shifts included', () => {
  const work = [
    workItem(),
    workItem({ id: 'w2', status: 'Done', statusLabel: 'Hoàn tất' }),
  ];
  const busy = {
    _id: 'b1',
    staffId: VET,
    date: '2026-11-27',
    shift: 'MORNING',
    reason: 'Nghỉ phép',
  };
  const cells = [];
  for (const phase of ['past', 'current', 'upcoming']) {
    for (const withBusy of [false, true]) {
      for (const withWork of [false, true]) {
        const cell = describeShiftCell({
          shift: MORNING,
          phase,
          busy: withBusy ? busy : undefined,
          work: withWork ? work : [],
          canManage: true,
        });
        cells.push(cell);
        // Assigned work never makes a third state; a past shift is never blank
        assert.equal(cell.status, withBusy ? 'Nghỉ' : 'Đi làm', `${phase}`);
        assert.equal(cell.tone, withBusy ? 'busy' : 'free');
      }
    }
  }
  const withWork = describeShiftCell({
    shift: MORNING,
    phase: 'upcoming',
    work,
  });
  assert.equal(withWork.work.length, 2);
  assert.equal(withWork.openWork.length, 1);
  assert.equal(withWork.editable, false, 'only the Admin edits');
  for (const cell of cells) {
    const hint = describeShiftHint(cell).join(' ');
    assert.ok(!/Đang làm việc|Rảnh|Bận|báo bận/.test(hint), hint);
  }
});

test('Ca làm việc: the Admin may mark a shift busy until it ends, but not a running one that has work', () => {
  const work = [workItem({ status: 'Done', statusLabel: 'Hoàn tất' })];
  const busy = {
    _id: 'b1',
    staffId: VET,
    date: '2026-11-26',
    shift: 'MORNING',
  };
  const cell = (phase, over = {}) =>
    describeShiftCell({ shift: MORNING, phase, canManage: true, ...over });

  assert.equal(cell('upcoming').canMark, true);
  assert.equal(cell('current').canMark, true);
  // A shift still to come with work: allowed, the modal warns first
  assert.equal(cell('upcoming', { work }).canMark, true);
  // Running with work, even done work: the person is at work
  const running = cell('current', { work });
  assert.equal(running.canMark, false);
  assert.equal(running.editable, false);
  assert.match(running.markBlock, /đang diễn ra và đã có việc/);
  // Over: read-only, no reason shown
  assert.equal(cell('past').editable, false);
  assert.equal(cell('past').markBlock, undefined);
  // Busy: it can be freed until it ends, including a running one with work
  assert.equal(cell('current', { busy, work }).canClear, true);
  assert.equal(cell('upcoming', { busy }).canMark, false);
  assert.equal(cell('past', { busy }).canClear, false);
  // Receptionist and staff: nothing to click, no reason lines
  const readOnly = describeShiftCell({
    shift: MORNING,
    phase: 'current',
    work,
  });
  assert.equal(readOnly.editable, false);
  assert.equal(readOnly.markBlock, undefined);

  assert.equal(validateMarkBusy({ phase: 'upcoming' }), undefined);
  assert.equal(validateMarkBusy({ phase: 'current' }), undefined);
  assert.equal(validateMarkBusy({ phase: 'upcoming', work }), undefined);
  assert.match(validateMarkBusy({ phase: 'current', work }), /đã có việc/);
  assert.match(validateMarkBusy({ phase: 'past' }), /đã kết thúc/);
  assert.match(
    validateMarkBusy({ phase: 'upcoming', busy }),
    /đã được báo nghỉ/
  );
  assert.equal(validateClearBusy({ phase: 'upcoming', busy }), undefined);
  assert.equal(validateClearBusy({ phase: 'current', busy }), undefined);
  assert.match(validateClearBusy({ phase: 'past', busy }), /đã kết thúc/);
  assert.match(validateClearBusy({ phase: 'upcoming' }), /chưa được báo nghỉ/);
});

test('Ca làm việc: the hover text tells the time, the assigned work and what a click does', () => {
  const work = [workItem({ petName: 'Mít' })];
  // A past shift without a busy record says the person was on shift
  assert.deepEqual(
    describeShiftHint(describeShiftCell({ shift: MORNING, phase: 'past' })),
    [
      'Ca sáng 08:00–12:00, đã kết thúc.',
      'Không có việc được giao.',
      'Không báo nghỉ: đi làm ca này.',
    ]
  );

  assert.deepEqual(
    describeShiftHint(
      describeShiftCell({
        shift: AFTERNOON,
        phase: 'upcoming',
        work,
        canManage: true,
      })
    ),
    [
      'Ca chiều 12:00–17:00.',
      '1 việc được giao:',
      '• 09:00 · APT-1 · Mít · Khám · Chờ thực hiện',
      'Lễ tân phân công được người này trong ca.',
      'Bấm để báo nghỉ.',
    ]
  );

  // Running with work: the Admin reads why it cannot be marked busy
  const running = describeShiftHint(
    describeShiftCell({
      shift: AFTERNOON,
      phase: 'current',
      work,
      canManage: true,
    })
  );
  assert.equal(running[0], 'Ca chiều 12:00–17:00, đang diễn ra.');
  assert.equal(
    running.at(-1),
    'Ca đang diễn ra và đã có việc được giao, không báo nghỉ được nữa.'
  );

  const busyCell = describeShiftCell({
    shift: EVENING,
    phase: 'upcoming',
    busy: {
      _id: 'b',
      staffId: VET,
      date: '2026-11-27',
      shift: 'EVENING',
      reason: 'Đi học',
      createdBy: { _id: 'a', fullName: 'Admin A' },
    },
    work,
    canManage: true,
  });
  assert.equal(describeShiftHint(busyCell).at(-1), 'Bấm để bỏ báo nghỉ.');
  const lines = describeShiftHint(busyCell, { action: false });
  assert.equal(lines[1], 'Đã báo nghỉ: Đi học (ghi bởi Admin A).');
  assert.ok(
    lines.includes(
      'Còn 1 việc chưa xong: đổi người phụ trách ở Tiếp nhận lịch hẹn.'
    )
  );
  assert.ok(!lines.some(l => l.startsWith('Bấm')));

  const many = Array.from({ length: 8 }, (_, i) => workItem({ id: `w${i}` }));
  const capped = describeShiftHint(
    describeShiftCell({ shift: MORNING, phase: 'upcoming', work: many }),
    { limit: 3 }
  );
  assert.equal(capped.filter(l => l.startsWith('•')).length, 3);
  assert.ok(capped.includes('… và 5 việc khác.'));
});

test('Ca làm việc: busy shifts not over yet that still hold unfinished work are listed', () => {
  const today = '2026-11-26';
  const workByKey = indexShiftWork(
    collectOrderWork([
      order({
        date: today,
        slotStart: '18:00',
        services: [service(), service({ _id: 's2', status: 'Done' })],
      }),
      order({
        _id: 'o2',
        date: '2026-11-25',
        slotStart: '18:00',
        services: [service({ _id: 's3' })],
      }),
      order({
        _id: 'o3',
        date: '2026-11-27',
        slotStart: '09:00',
        services: [service({ _id: 's4', status: 'Done' })],
      }),
    ])
  );
  assert.equal(workByKey.get(busyKey(VET, today, 'EVENING')).length, 2);
  const tonight = { _id: 'b1', staffId: VET, date: today, shift: 'EVENING' };
  const conflicts = findBusyConflicts({
    busy: [
      tonight,
      // Over: history, nothing to fix
      { _id: 'b2', staffId: VET, date: '2026-11-25', shift: 'EVENING' },
      // Only finished work
      { _id: 'b3', staffId: VET, date: '2026-11-27', shift: 'MORNING' },
    ],
    workByKey,
    staffNames: new Map([[VET, 'Nguyễn Văn Bá']]),
    today,
    now: '15:00',
  });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].staffName, 'Nguyễn Văn Bá');
  assert.equal(conflicts[0].shift.key, 'EVENING');
  assert.deepEqual(
    conflicts[0].openWork.map(w => w.id),
    ['s1']
  );
  // Once the evening is over the same record is history
  assert.equal(
    findBusyConflicts({ busy: [tonight], workByKey, today, now: '21:00' })
      .length,
    0
  );
});
