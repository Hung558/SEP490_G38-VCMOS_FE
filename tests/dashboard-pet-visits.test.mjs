import test from 'node:test';
import assert from 'node:assert/strict';

const visits = await import('../src/pages/Dashboard/components/petVisits.ts');

const service = (name, status = 'Done') => ({
  _id: name,
  sequenceNo: 1,
  status,
  isEmergency: false,
  service: { _id: name, name },
  assignedStaff: null,
  medicalRecord: null,
  groomingNote: null,
  subtasks: [],
});
const visit = (date, derivedStatus, extra = {}) => ({
  date,
  derivedStatus,
  slotStart: null,
  slotEnd: null,
  services: [],
  ...extra,
});

test("today's visits leave out cancelled ones and other days", () => {
  const list = [
    visit('2026-11-24', 'Booked', { slotStart: '09:00' }),
    visit('2026-11-24', 'Cancelled'),
    visit('2026-11-23', 'Done'),
  ];
  const today = visits.pickTodayVisits(list, '2026-11-24');
  assert.equal(today.length, 1);
  assert.equal(today[0].slotStart, '09:00');
  assert.deepEqual(visits.pickTodayVisits(list, '2026-11-25'), []);
});

test('recent visits are the latest finished ones, at most two, none in the future', () => {
  const list = [
    visit('2026-11-30', 'Done'),
    visit('2026-11-02', 'Done'),
    visit('2026-11-20', 'Done'),
    visit('2026-11-21', 'Cancelled'),
    visit('2026-11-10', 'Done'),
    visit('2026-11-22', 'WaitOwner'),
  ];
  assert.deepEqual(
    visits.pickRecentVisits(list, '2026-11-24').map(v => v.date),
    ['2026-11-20', '2026-11-10']
  );
  assert.equal(visits.pickRecentVisits(list, '2026-11-24', 1).length, 1);
  assert.deepEqual(visits.pickRecentVisits([], '2026-11-24'), []);
});

test('visit time, date and services read as shown on the card', () => {
  assert.equal(
    visits.formatVisitTime({ slotStart: '08:00', slotEnd: '08:30' }),
    '08:00–08:30'
  );
  assert.equal(visits.formatVisitTime({ slotStart: '08:00' }), '08:00');
  assert.equal(visits.formatVisitTime({ slotStart: null }), '');
  assert.equal(visits.formatVisitDate('2026-11-04'), '04/11/2026');
  assert.deepEqual(
    visits.getVisitServiceNames({
      services: [
        service('Khám tổng quát'),
        service('Tắm sấy', 'Cancelled'),
        { ...service('x'), service: 'only-an-id' },
        service('Tiêm dại'),
      ],
    }),
    ['Khám tổng quát', 'Tiêm dại']
  );
});
