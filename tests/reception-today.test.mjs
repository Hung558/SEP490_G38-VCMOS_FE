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

test('today count requests use limit 1 and only the exact day and group status', () => {
  assert.deepEqual(
    RECEPTION_TODAY_GROUPS.map(({ status }) =>
      buildStaffAppointmentFilterQuery(getReceptionTodayCountQuery(day, status))
    ),
    [
      { ...today, page: 1, limit: 1 },
      { ...today, page: 1, limit: 1, status: 'Booked' },
      { ...today, page: 1, limit: 1, status: 'CheckedIn' },
      { ...today, page: 1, limit: 1, status: 'WaitOwner' },
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
  assert.equal(
    getSelectedReceptionTodayGroup(day, { ...today, status: 'WaitOwner' }),
    'waitOwner'
  );
  assert.equal(
    getSelectedReceptionTodayGroup(day, { ...today, status: 'InProgress' }),
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
  assert.deepEqual(getReceptionNextAction('WaitOwner'), {
    kind: 'detail',
    hint: 'Kiểm tra trước khi bàn giao',
  });
  for (const status of ['Done', 'Cancelled', 'Overdue'])
    assert.equal(getReceptionNextAction(status), undefined);
});
