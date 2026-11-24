import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDutyMap,
  countByRole,
  DUTY_SHIFT_LABEL,
  DUTY_SHIFTS,
  filterByShift,
  formatDayMonth,
  getStaffDisplayName,
} from '../src/pages/Home/components/staffDuty.ts';

const vetA = {
  _id: 'v1',
  code: 'VET-001',
  fullName: 'A',
  role: 'Veterinarian',
  status: 'Active',
};
const vetB = {
  _id: 'v2',
  code: 'VET-002',
  fullName: 'B',
  role: 'Veterinarian',
  status: 'Active',
};
const groomer = {
  _id: 'g1',
  code: 'GRM-001',
  fullName: 'C',
  role: 'Groomer',
  status: 'Active',
};
const staff = [vetA, vetB, groomer];

// GET /users/staff?workDate&shift leaves out whoever reported busy in that shift
const duty = buildDutyMap(staff, {
  MORNING: [vetA, groomer],
  AFTERNOON: [vetB],
  EVENING: [],
});

test('shifts are the three BE shifts, labelled as on the home page', () => {
  assert.deepEqual(DUTY_SHIFTS, ['MORNING', 'AFTERNOON', 'EVENING']);
  assert.deepEqual(
    DUTY_SHIFTS.map(shift => DUTY_SHIFT_LABEL[shift]),
    ['Sáng', 'Chiều', 'Tối']
  );
});

test('a member missing from a shift list is busy in that shift', () => {
  assert.deepEqual(duty.v1, {
    MORNING: true,
    AFTERNOON: false,
    EVENING: false,
  });
  assert.deepEqual(duty.v2, {
    MORNING: false,
    AFTERNOON: true,
    EVENING: false,
  });
  assert.deepEqual(duty.g1, {
    MORNING: true,
    AFTERNOON: false,
    EVENING: false,
  });
});

test('a missing shift list counts as busy, not as a crash', () => {
  const partial = buildDutyMap([vetA], { MORNING: [vetA] });
  assert.deepEqual(partial.v1, {
    MORNING: true,
    AFTERNOON: false,
    EVENING: false,
  });
});

test('the shift filter keeps only staff free in that shift', () => {
  assert.deepEqual(filterByShift(staff, duty, 'ALL'), staff);
  assert.deepEqual(filterByShift(staff, duty, 'MORNING'), [vetA, groomer]);
  assert.deepEqual(filterByShift(staff, duty, 'AFTERNOON'), [vetB]);
  assert.deepEqual(filterByShift(staff, duty, 'EVENING'), []);
  // Someone the duty map does not know about is not shown as free
  assert.deepEqual(filterByShift([{ ...vetA, _id: 'x' }], duty, 'MORNING'), []);
});

test('tab counts are per role', () => {
  assert.deepEqual(countByRole(staff), { ALL: 3, Veterinarian: 2, Groomer: 1 });
  assert.deepEqual(countByRole(filterByShift(staff, duty, 'AFTERNOON')), {
    ALL: 1,
    Veterinarian: 1,
    Groomer: 0,
  });
});

test('the duty date shows as dd/MM', () => {
  assert.equal(formatDayMonth('2026-11-24'), '24/11');
  assert.equal(formatDayMonth('bad'), 'bad');
});

test('vets get the "BS." title once, groomers keep their name', () => {
  assert.equal(
    getStaffDisplayName({ ...vetA, fullName: 'Trần Minh' }),
    'BS. Trần Minh'
  );
  assert.equal(
    getStaffDisplayName({ ...vetA, fullName: 'BS Trần Minh' }),
    'BS Trần Minh'
  );
  assert.equal(
    getStaffDisplayName({ ...vetA, fullName: 'bs. Đăng Quang' }),
    'bs. Đăng Quang'
  );
  assert.equal(
    getStaffDisplayName({ ...vetA, fullName: 'Bác sĩ An' }),
    'Bác sĩ An'
  );
  // A name that only starts with the letters "Bs" is not a title
  assert.equal(
    getStaffDisplayName({ ...vetA, fullName: 'Bsao Lan' }),
    'BS. Bsao Lan'
  );
  assert.equal(
    getStaffDisplayName({ ...groomer, fullName: 'Hưng Groomer' }),
    'Hưng Groomer'
  );
});
