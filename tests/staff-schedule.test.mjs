import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUSY_REASON_MAX,
  buildBusySchedulePayload,
  busyKey,
  getScheduleAccess,
  getWeekDates,
  indexBusySchedules,
  isPastDay,
  shiftWeek,
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
