import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAppointmentProgress,
  getOwnerCancelState,
} from '../src/services/AppointmentOrderService/helpers.ts';
import { countOpenSubtasks } from '../src/services/SubtaskRequestService/helpers.ts';

test('SCR-13 stepper follows Booked → Checked In → In Progress → Wait Owner → Done', () => {
  assert.deepEqual(getAppointmentProgress({ derivedStatus: 'Booked' }), {
    current: 0,
    status: 'process',
  });
  assert.deepEqual(getAppointmentProgress({ derivedStatus: 'CheckedIn' }), {
    current: 1,
    status: 'process',
  });
  assert.deepEqual(getAppointmentProgress({ derivedStatus: 'InProgress' }), {
    current: 2,
    status: 'process',
  });
  assert.deepEqual(getAppointmentProgress({ derivedStatus: 'WaitOwner' }), {
    current: 3,
    status: 'process',
  });
  assert.deepEqual(getAppointmentProgress({ derivedStatus: 'Done' }), {
    current: 4,
    status: 'finish',
  });
});

test('cancelled orders stop where they were; overdue orders never arrived', () => {
  assert.deepEqual(getAppointmentProgress({ derivedStatus: 'Cancelled' }), {
    current: 0,
    status: 'error',
  });
  assert.deepEqual(
    getAppointmentProgress({
      derivedStatus: 'Cancelled',
      checkedInAt: '2026-11-14T02:00:00Z',
    }),
    { current: 1, status: 'error' }
  );
  assert.deepEqual(getAppointmentProgress({ derivedStatus: 'Overdue' }), {
    current: 0,
    status: 'error',
  });
});

test('BR-07 / MSG20: cancel is enabled in the window, disabled after it, hidden when closed', () => {
  const now = new Date('2026-11-14T01:00:00Z'); // 08:00 in Vietnam
  const booked = { derivedStatus: 'Booked', date: '2026-11-14' };
  assert.equal(
    getOwnerCancelState({ ...booked, slotStart: '10:30' }, undefined, now),
    'enabled'
  );
  // Less than 2 hours before the slot
  assert.equal(
    getOwnerCancelState({ ...booked, slotStart: '09:30' }, undefined, now),
    'disabled'
  );
  // After check-in the owner has to call the clinic
  assert.equal(
    getOwnerCancelState(
      { derivedStatus: 'CheckedIn', date: '2026-11-14', slotStart: '10:30' },
      undefined,
      now
    ),
    'disabled'
  );
  for (const derivedStatus of [
    'InProgress',
    'WaitOwner',
    'Done',
    'Cancelled',
    'Overdue',
  ]) {
    assert.equal(
      getOwnerCancelState(
        { derivedStatus, date: '2026-11-14', slotStart: '10:30' },
        undefined,
        now
      ),
      'hidden',
      derivedStatus
    );
  }
});

test('per-service cancel: open services show the control, finished ones do not', () => {
  const now = new Date('2026-11-14T01:00:00Z');
  const order = {
    derivedStatus: 'Booked',
    date: '2026-11-14',
    slotStart: '10:30',
  };
  assert.equal(
    getOwnerCancelState(
      order,
      { status: 'Booked', scheduledStart: '10:30' },
      now
    ),
    'enabled'
  );
  assert.equal(
    getOwnerCancelState(
      order,
      { status: 'Booked', scheduledStart: '09:00' },
      now
    ),
    'disabled'
  );
  assert.equal(
    getOwnerCancelState(order, { status: 'Cancelled' }, now),
    'hidden'
  );
});

test('MSG26: Pending and InProgress sub-tasks block finishing the exam', () => {
  assert.equal(
    countOpenSubtasks([
      { status: 'Pending' },
      { status: 'InProgress' },
      { status: 'Completed' },
    ]),
    2
  );
  assert.equal(countOpenSubtasks([]), 0);
});
