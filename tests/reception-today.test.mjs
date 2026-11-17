import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getReceptionNextAction,
  getReceptionTodayCountQuery,
  getSelectedReceptionTodayGroup,
  readReceptionTodayCount,
  RECEPTION_TODAY_GROUPS,
} from '../src/pages/AppointmentReception/components/receptionToday.ts';
import {
  buildStaffAppointmentFilterQuery,
  getVietnamTodayString,
} from '../src/services/AppointmentOrderService/helpers.ts';

const day = '2026-11-13';
const today = { from: day, to: day };

test('Vietnam date changes at 17:00 UTC independently of the host date', () => {
  assert.equal(
    getVietnamTodayString(new Date('2026-11-12T16:59:59Z')),
    '2026-11-12'
  );
  assert.equal(getVietnamTodayString(new Date('2026-11-12T17:00:00Z')), day);
});

test('today count requests use limit 1; pets at the clinic count on every appointment date', () => {
  // Nghiệp vụ 4.3 (17/11): early or late check-in, so a pet booked for another
  // day can be checked in, served and waiting for pick-up today
  assert.deepEqual(
    RECEPTION_TODAY_GROUPS.map(({ status }) =>
      buildStaffAppointmentFilterQuery(getReceptionTodayCountQuery(day, status))
    ),
    [
      { ...today, page: 1, limit: 1 },
      { ...today, page: 1, limit: 1, status: 'Booked' },
      { page: 1, limit: 1, status: 'CheckedIn' },
      { page: 1, limit: 1, status: 'InProgress' },
      { page: 1, limit: 1, status: 'WaitOwner' },
    ]
  );
});

test('reads the paginated total, never a page length or a fabricated zero', () => {
  assert.equal(
    readReceptionTodayCount({ data: [{}], pagination: { total: 37 } }),
    37
  );
  assert.equal(readReceptionTodayCount({ pagination: { total: 0 } }), 0);
  for (const total of [undefined, null, '0', NaN, -1, 3.5]) {
    assert.throws(
      () => readReceptionTodayCount({ pagination: { total } }),
      /tổng số/
    );
  }
  assert.throws(() => readReceptionTodayCount({ data: [] }), /tổng số/);
});

test('selected group is derived from the current day and exact table filters', () => {
  assert.equal(getSelectedReceptionTodayGroup(day, today), 'total');
  assert.equal(
    getSelectedReceptionTodayGroup(day, { ...today, status: 'Booked' }),
    'booked'
  );
  // At-clinic groups are selected with no date; today's date alone is a manual filter
  assert.equal(
    getSelectedReceptionTodayGroup(day, { status: 'WaitOwner' }),
    'waitOwner'
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { status: 'InProgress' }),
    'inProgress'
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { status: 'CheckedIn' }),
    'checkedIn'
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { ...today, status: 'WaitOwner' }),
    undefined
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { status: 'Booked' }),
    undefined
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { ...today, status: 'Done' }),
    undefined
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { ...today, isOnline: false }),
    undefined
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { ...today, code: 'APT-123456' }),
    undefined
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { ...today, from: '2026-11-12' }),
    undefined
  );
});

test('next action preserves Check-in and uses Detail with status-specific guidance', () => {
  assert.deepEqual(getReceptionNextAction('Booked'), { kind: 'checkIn' });
  assert.deepEqual(getReceptionNextAction('CheckedIn'), {
    kind: 'detail',
    hint: 'Kiểm tra dịch vụ và phân công',
  });
  assert.deepEqual(getReceptionNextAction('InProgress'), {
    kind: 'detail',
    hint: 'Theo dõi tiến độ dịch vụ',
  });
  // Nghiệp vụ 4.6 (17/11): Wait Owner now leads to billing, see invoice.test.mjs
  assert.deepEqual(getReceptionNextAction('WaitOwner'), {
    kind: 'checkout',
    hint: 'Lập hóa đơn và thu tiền khi chủ đến đón',
  });
  for (const status of ['Done', 'Cancelled', 'Overdue'])
    assert.equal(getReceptionNextAction(status), undefined);
});
