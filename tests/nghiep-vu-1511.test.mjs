import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCheckInRequest,
  getOrderStatusText,
  getReservedCage,
} from '../src/services/AppointmentOrderService/helpers.ts';
import {
  QUEUE_VIEWS,
  countMyQueue,
  filterMyQueue,
  getAppointmentServiceStatusLabel,
  getQueueCustomerNote,
  getQueueItemTime,
  getQueuePeriodRange,
} from '../src/services/AppointmentServiceService/helpers.ts';
import { GROOMING_NOTE_FIELDS } from '../src/services/AppointmentServiceService/grooming.ts';
import {
  buildCheckInAssignments,
  getCheckInCageChoices,
  getCheckInServices,
  getDefaultCheckInCageId,
  getDefaultCheckInStaffId,
  getReservedCageProblem,
} from '../src/pages/AppointmentReception/components/checkInHelpers.ts';
import {
  buildPetMilestones,
  getActiveVisitRange,
} from '../src/pages/PetProfile/components/petTimelineHelpers.ts';

const SVC_1 = '6ad96d4a9664da6b2c0d9a01';
const SVC_2 = '6ad96d4a9664da6b2c0d9a02';
const VET = '6ad96d4a9664da6b2c0d9b01';
const GROOMER = '6ad96d4a9664da6b2c0d9b02';

const cage = (label, extra = {}) => ({
  _id: `c-${label}`,
  label,
  size: 'M',
  isIsolated: false,
  status: 'Available',
  ...extra,
});

test('check-in body carries the cage and per-service staff, never a note (A10)', () => {
  assert.equal(buildCheckInRequest(), undefined);
  assert.equal(buildCheckInRequest({ serviceAssignments: [] }), undefined);
  assert.deepEqual(
    buildCheckInRequest({
      cageId: 'c1',
      // The BE would replace the owner's note, which the vet has to read
      note: '  Bé sợ tiếng ồn ',
      serviceAssignments: [
        { appointmentServiceId: SVC_1, assignedStaffId: VET },
        // Duplicates and half-filled rows are dropped (BE rejects them)
        { appointmentServiceId: SVC_1, assignedStaffId: GROOMER },
        { appointmentServiceId: SVC_2, assignedStaffId: '' },
      ],
    }),
    {
      cageId: 'c1',
      serviceAssignments: [
        { appointmentServiceId: SVC_1, assignedStaffId: VET },
      ],
    }
  );
  assert.equal(buildCheckInRequest({ note: 'Ghi chú' }), undefined);
});

test('nghiệp vụ 8.2: an order In progress reads "Đang + tên dịch vụ"', () => {
  const running = name => ({
    derivedStatus: 'InProgress',
    currentService: { status: 'InProgress', serviceId: { name } },
  });
  assert.equal(
    getOrderStatusText(running('Khám tổng quát')),
    'Đang khám tổng quát'
  );
  assert.equal(
    getOrderStatusText(running('SPA thư giãn')),
    'Đang SPA thư giãn'
  );
  // Between two services nothing is running: keep the generic label
  assert.equal(
    getOrderStatusText({
      derivedStatus: 'InProgress',
      currentService: { status: 'Waiting', serviceId: { name: 'Tắm' } },
    }),
    'Đang thực hiện'
  );
  assert.equal(
    getOrderStatusText({ derivedStatus: 'InProgress' }),
    'Đang thực hiện'
  );
  assert.equal(
    getOrderStatusText({ derivedStatus: 'WaitOwner' }),
    'Chờ chủ đón'
  );
});

test('A1: the cage reserved at booking is read only when the BE populated it', () => {
  const ref = { _id: 'c1', label: 'A-01', size: 'M' };
  assert.deepEqual(getReservedCage({ reservedCageId: ref }), ref);
  assert.equal(getReservedCage({ reservedCageId: 'c1' }), undefined);
  assert.equal(getReservedCage({}), undefined);
  assert.equal(getReservedCage(undefined), undefined);
});

test('check-in cages: fitting Available cages in label order, the reserved one pre-selected', () => {
  const cages = [
    cage('A2'),
    cage('A10'),
    cage('A1'),
    cage('S1', { size: 'S' }),
    cage('ISO', { isIsolated: true }),
    cage('X', { status: 'Occupied' }),
  ];
  const choices = getCheckInCageChoices(cages, {
    reservedCageId: 'c-A2',
    petWeight: 12,
    requiresIsolation: false,
  });
  // A11 removed: no "held for another order" marks or ordering
  assert.deepEqual(
    choices.map(c => [c.cage.label, c.reservedForThis]),
    [
      ['A1', false],
      ['A2', true],
      ['A10', false],
    ]
  );
  assert.equal('heldBy' in choices[0], false);
  assert.equal(getDefaultCheckInCageId(choices), 'c-A2');

  // Isolation needed: the reserved standard cage no longer fits
  const iso = getCheckInCageChoices(cages, {
    reservedCageId: 'c-A2',
    petWeight: 12,
    requiresIsolation: true,
  });
  assert.deepEqual(
    iso.map(c => c.cage.label),
    ['ISO']
  );
  assert.equal(getDefaultCheckInCageId(iso), undefined);
  assert.match(
    getReservedCageProblem(
      { _id: 'c-A2', label: 'A2', size: 'M', isIsolated: false },
      iso,
      true
    ),
    /không phải chuồng cách ly/
  );
  assert.match(
    getReservedCageProblem(
      { _id: 'c-X', label: 'X', size: 'M' },
      choices,
      false
    ),
    /không trống/
  );
  assert.equal(
    getReservedCageProblem(
      { _id: 'c-A2', label: 'A2', size: 'M' },
      choices,
      false
    ),
    undefined
  );
  assert.equal(getReservedCageProblem(undefined, [], false), undefined);
});

test('check-in staff: open services in order, preset person, only changes are sent', () => {
  const svc = (id, sequenceNo, status, extra = {}) => ({
    _id: id,
    sequenceNo,
    status,
    ...extra,
  });
  const services = getCheckInServices([
    svc('b', 2, 'Booked', {
      preferredStaffId: { _id: GROOMER, fullName: 'G' },
    }),
    svc('a', 1, 'Booked', { assignedStaffId: VET }),
    svc('done', 3, 'Done'),
    svc('cancel', 4, 'Cancelled'),
    svc('run', 5, 'InProgress'),
  ]);
  assert.deepEqual(
    services.map(s => s._id),
    ['a', 'b']
  );
  assert.equal(getDefaultCheckInStaffId(services[0]), VET);
  assert.equal(getDefaultCheckInStaffId(services[1]), GROOMER);
  assert.equal(getDefaultCheckInStaffId({}), undefined);
  assert.deepEqual(buildCheckInAssignments(services, { a: VET, b: GROOMER }), [
    { appointmentServiceId: 'b', assignedStaffId: GROOMER },
  ]);
  assert.deepEqual(buildCheckInAssignments(services, undefined), []);
});

test('nghiệp vụ 5, 6: the queue filters by day, Monday–Sunday week, or month', () => {
  assert.deepEqual(getQueuePeriodRange('day', '2026-11-15'), {
    from: '2026-11-15',
    to: '2026-11-15',
  });
  // 15/11/2026 is a Sunday: the week runs from Monday 09/11
  assert.deepEqual(getQueuePeriodRange('week', '2026-11-15'), {
    from: '2026-11-09',
    to: '2026-11-15',
  });
  assert.deepEqual(getQueuePeriodRange('week', '2026-11-16'), {
    from: '2026-11-16',
    to: '2026-11-22',
  });
  assert.deepEqual(getQueuePeriodRange('month', '2028-02-10'), {
    from: '2028-02-01',
    to: '2028-02-29',
  });
  assert.equal(getQueuePeriodRange('all', '2026-11-15'), undefined);
  assert.equal(getQueuePeriodRange('day', '15/11/2026'), undefined);

  const item = (status, date) => ({
    status,
    orderId: { _id: date, code: date, date },
  });
  const items = [
    item('Waiting', '2026-11-08'),
    item('Waiting', '2026-11-09'),
    item('InProgress', '2026-11-15'),
    item('Waiting', '2026-11-16'),
    item('Waiting'),
  ];
  const week = getQueuePeriodRange('week', '2026-11-12');
  assert.deepEqual(
    filterMyQueue(items, 'active', week, '2026-11-12').map(i => i.orderId.date),
    ['2026-11-09', '2026-11-15']
  );
  assert.equal(
    filterMyQueue(items, 'active', undefined, '2026-11-12').length,
    5
  );
});

test('pet timeline: one milestone per visit with its latest status and SOAP records', () => {
  const notes = [
    {
      _id: 'o3',
      code: 'APT-3',
      date: '2026-11-15',
      slotStart: '09:00',
      isOnline: true,
      derivedStatus: 'CheckedIn',
      note: ' Bé ho ',
    },
    {
      _id: 'o2',
      code: 'APT-2',
      date: '2026-11-10',
      isOnline: false,
      derivedStatus: 'Done',
      intake: { symptoms: 'Bỏ ăn', initialCondition: 'Mệt' },
    },
    {
      _id: 'o1',
      code: 'APT-1',
      date: '2026-10-01',
      isOnline: true,
      derivedStatus: 'Done',
    },
  ];
  // The owner's order list is fresher: the visit has moved on to a running service
  const orders = [
    {
      _id: 'o3',
      derivedStatus: 'InProgress',
      currentService: {
        status: 'InProgress',
        serviceId: { name: 'Khám tổng quát' },
      },
      services: [
        {
          _id: 's2',
          sequenceNo: 2,
          status: 'Booked',
          serviceId: { name: 'Tắm' },
        },
        {
          _id: 's1',
          sequenceNo: 1,
          status: 'InProgress',
          serviceId: { name: 'Khám tổng quát' },
        },
        {
          _id: 's0',
          sequenceNo: 3,
          status: 'Cancelled',
          serviceId: { name: 'Cắt móng' },
        },
      ],
    },
  ];
  const milestones = buildPetMilestones(
    notes,
    orders,
    new Map([['APT-2', ['r1', 'r2']]])
  );
  assert.deepEqual(
    milestones.map(m => [
      m.code,
      m.status,
      m.statusText,
      m.active,
      m.recordIds.length,
    ]),
    [
      ['APT-3', 'InProgress', 'Đang khám tổng quát', true, 0],
      ['APT-2', 'Done', 'Hoàn tất', false, 2],
      ['APT-1', 'Done', 'Hoàn tất', false, 0],
    ]
  );
  assert.deepEqual(milestones[0].services, ['Khám tổng quát', 'Tắm']);
  assert.equal(milestones[0].note, 'Bé ho');
  assert.equal(milestones[1].symptoms, 'Bỏ ăn');
  assert.deepEqual(buildPetMilestones(null), []);

  assert.deepEqual(getActiveVisitRange(notes), {
    from: '2026-11-15',
    to: '2026-11-15',
  });
  assert.equal(getActiveVisitRange([notes[1]]), undefined);
});

test('S2: the queue only holds services of checked-in orders', () => {
  assert.deepEqual(
    QUEUE_VIEWS.map(v => v.key),
    ['active', 'done', 'all']
  );
  const item = (status, date) => ({
    status,
    orderId: { _id: date, code: date, date },
  });
  const items = [
    item('Booked', '2026-11-15'),
    item('Waiting', '2026-11-15'),
    item('Done', '2026-11-15'),
  ];
  assert.deepEqual(
    filterMyQueue(items, 'all', undefined, '2026-11-15').map(i => i.status),
    ['Waiting', 'Done']
  );
  assert.deepEqual(countMyQueue(items, undefined, '2026-11-15'), {
    active: 1,
    done: 1,
    all: 2,
  });
});

test("S3: each queue row shows the time and the owner's note", () => {
  const order = { _id: 'o', code: 'APT-1', date: '2026-11-15' };
  assert.equal(
    getQueueItemTime({ scheduledStart: '09:30', scheduledEnd: '10:00' }),
    '09:30–10:00'
  );
  assert.equal(getQueueItemTime({ scheduledStart: '09:30' }), '09:30');
  // No time for the service yet: the time the owner comes in
  assert.equal(
    getQueueItemTime({ orderId: { ...order, slotStart: '09:00' } }),
    '09:00'
  );
  assert.equal(getQueueItemTime({ orderId: order }), undefined);
  assert.equal(
    getQueueCustomerNote({ orderId: { ...order, note: '  Bé ho, bỏ ăn ' } }),
    'Bé ho, bỏ ăn'
  );
  assert.equal(
    getQueueCustomerNote({ orderId: { ...order, note: '  ' } }),
    undefined
  );
  assert.equal(getQueueCustomerNote({ orderId: 'o' }), undefined);
});

test('S4: a running service reads "Đang khám" for vets and "Đang spa" for groomers', () => {
  assert.equal(
    getAppointmentServiceStatusLabel('InProgress', 'Examination'),
    'Đang khám'
  );
  assert.equal(
    getAppointmentServiceStatusLabel('InProgress', 'Vaccination'),
    'Đang khám'
  );
  assert.equal(
    getAppointmentServiceStatusLabel('InProgress', 'Grooming'),
    'Đang spa'
  );
  assert.equal(
    getAppointmentServiceStatusLabel('InProgress'),
    'Đang thực hiện'
  );
  assert.equal(
    getAppointmentServiceStatusLabel('Waiting', 'Grooming'),
    'Chờ thực hiện'
  );
  assert.equal(
    getAppointmentServiceStatusLabel('Done', 'Examination'),
    'Hoàn tất'
  );
});

test('S5: the spa result fields use the spec wording, field names unchanged', () => {
  assert.deepEqual(GROOMING_NOTE_FIELDS, [
    ['beforeNote', 'Ghi chú trước khi spa'],
    ['afterNote', 'Tình trạng da, lông'],
    ['recommendations', 'Lưu ý cho lần sau'],
  ]);
});
