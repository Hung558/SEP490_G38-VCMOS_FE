import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkRows,
  filterWorkRows,
  getSubtaskDay,
  summarizeWork,
  toVietnamDay,
} from '../src/pages/StaffQueue/components/groomerWork.ts';

const service = (id, status, date) => ({
  _id: id,
  status,
  orderId: { _id: `o-${id}`, code: `APT-${id}`, date },
});
const task = (id, status, date, createdAt) => ({
  _id: id,
  status,
  taskType: 'Tắm',
  createdAt,
  appointmentServiceId: date ? { _id: `as-${id}`, orderId: { date } } : null,
  requestedById: { _id: 'vet', fullName: 'BS Trần Minh' },
  assignedStaffId: 'groomer',
});

const services = [
  service('s1', 'Waiting', '2026-11-24'),
  service('s2', 'Done', '2026-11-24'),
  service('s3', 'Booked', '2026-11-24'), // not checked in yet: left out
  service('s4', 'InProgress', '2026-11-25'),
];
const tasks = [
  task('t2', 'Completed', '2026-11-24', '2026-11-24T03:00:00Z'),
  task('t1', 'Pending', '2026-11-24', '2026-11-24T02:00:00Z'),
  task('t3', 'InProgress', null, '2026-11-24T18:30:00Z'), // 25/11 in Vietnam
];
const day = { from: '2026-11-24', to: '2026-11-24' };

test('a task is dated by its appointment, else by the Vietnam day it was handed over', () => {
  assert.equal(getSubtaskDay(tasks[0]), '2026-11-24');
  assert.equal(getSubtaskDay(tasks[2]), '2026-11-25');
  assert.equal(toVietnamDay('2026-11-24T16:59:59Z'), '2026-11-24');
  assert.equal(toVietnamDay('2026-11-24T17:00:00Z'), '2026-11-25');
  assert.equal(toVietnamDay(undefined), undefined);
});

test('one list: services in BE order, then tasks oldest first, by date; Booked left out', () => {
  const rows = buildWorkRows(services, tasks);
  assert.deepEqual(
    rows.map(row => row.key),
    [
      'service:s1',
      'service:s2',
      'subtask:t1',
      'subtask:t2',
      'service:s4',
      'subtask:t3',
    ]
  );
  assert.deepEqual(
    rows.map(row => row.state),
    ['waiting', 'done', 'waiting', 'done', 'doing', 'doing']
  );
});

test('filters by period, state and source', () => {
  const rows = buildWorkRows(services, tasks);
  const keys = filter => filterWorkRows(rows, filter).map(row => row.key);
  assert.deepEqual(keys({ view: 'active', source: 'all', range: day }), [
    'service:s1',
    'subtask:t1',
  ]);
  assert.deepEqual(keys({ view: 'done', source: 'assigned', range: day }), [
    'subtask:t2',
  ]);
  assert.deepEqual(keys({ view: 'all', source: 'booked', range: undefined }), [
    'service:s1',
    'service:s2',
    'service:s4',
  ]);
});

test('summary counts the period; source counts ignore the source filter', () => {
  const rows = buildWorkRows(services, tasks);
  const all = summarizeWork(rows, day, 'all');
  assert.equal(all.total, 4);
  assert.deepEqual([all.waiting, all.doing, all.done], [2, 0, 2]);
  assert.deepEqual(all.views, { active: 2, done: 2, all: 4 });
  assert.deepEqual(all.sources, { all: 4, booked: 2, assigned: 2 });
  const assigned = summarizeWork(rows, day, 'assigned');
  assert.equal(assigned.total, 2);
  assert.deepEqual(assigned.views, { active: 1, done: 1, all: 2 });
  assert.deepEqual(assigned.sources, { all: 4, booked: 2, assigned: 2 });
});
