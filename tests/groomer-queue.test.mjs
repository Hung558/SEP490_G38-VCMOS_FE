import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import {
  buildGroomingNotePayload,
  getGroomingActions,
  GROOMING_NOTE_TEXT_MAX,
  GROOMING_PHOTO_MAX_BYTES,
} from '../src/services/AppointmentServiceService/grooming.ts';
import {
  apiCompleteAppointmentService,
  apiGroomingNote,
  apiMyGroomingNotes,
  apiStartAppointmentService,
} from '../src/services/AppointmentServiceService/urls.ts';

const queueItem = (status, derivedStatus, extras = {}) => ({
  status,
  serviceId: { category: 'Grooming' },
  orderId: { derivedStatus },
  ...extras,
});

test('Groomer endpoints match the service, not the appointment order', () => {
  assert.equal(
    apiStartAppointmentService('s1'),
    '/appointment-services/s1/start'
  );
  assert.equal(
    apiCompleteAppointmentService('s1'),
    '/appointment-services/s1/complete'
  );
  assert.equal(apiGroomingNote('s1'), '/appointment-services/s1/grooming-note');
  assert.equal(apiMyGroomingNotes, '/appointment-services/my-grooming-notes');
});

test('Groomer starts only a Waiting service of a checked-in order', () => {
  for (const orderStatus of ['CheckedIn', 'InProgress']) {
    assert.equal(
      getGroomingActions(queueItem('Waiting', orderStatus), 'Groomer').start,
      true
    );
  }
  for (const orderStatus of [
    'Booked',
    'Done',
    'Cancelled',
    'Overdue',
    undefined,
  ]) {
    assert.equal(
      getGroomingActions(queueItem('Waiting', orderStatus), 'Groomer').start,
      false
    );
  }
  assert.equal(
    getGroomingActions(queueItem('Booked', 'Booked'), 'Groomer').waitForCheckIn,
    true
  );
  assert.equal(
    getGroomingActions(queueItem('Booked', 'CheckedIn'), 'Groomer').start,
    false
  );
  assert.equal(
    getGroomingActions(queueItem('Waiting', 'CheckedIn'), 'Veterinarian'),
    null
  );
  assert.equal(
    getGroomingActions(
      queueItem('Waiting', 'CheckedIn', {
        serviceId: { category: 'Examination' },
      }),
      'Groomer'
    ),
    null
  );
});

test('complete never requires a note and note creation remains available after completion', () => {
  const active = getGroomingActions(
    queueItem('InProgress', 'InProgress'),
    'Groomer'
  );
  assert.equal(active.complete, true);
  assert.equal(active.note, 'create');
  const done = getGroomingActions(queueItem('Done', 'WaitOwner'), 'Groomer');
  assert.equal(done.complete, false);
  assert.equal(done.note, 'create');
  assert.equal(
    getGroomingActions(queueItem('InProgress', 'Done'), 'Groomer').complete,
    false
  );
  assert.equal(
    getGroomingActions(queueItem('Waiting', 'CheckedIn'), 'Groomer').note,
    null
  );
  assert.equal(
    getGroomingActions(
      queueItem('Done', 'Done', { groomingNote: { beforeNote: 'Miu' } }),
      'Groomer'
    ).note,
    'view'
  );
});

test('text-only note uses trimmed JSON and does not send blank fields or server metadata', () => {
  assert.deepEqual(
    buildGroomingNotePayload({
      beforeNote: '  Lông rối  ',
      afterNote: ' \n ',
      beforePhotoUrl: 'ignored',
      createdAt: 'ignored',
    }),
    { beforeNote: 'Lông rối' }
  );
  assert.throws(
    () => buildGroomingNotePayload({ beforeNote: '   ' }),
    /ít nhất một/
  );
  const limit = 'a'.repeat(GROOMING_NOTE_TEXT_MAX);
  assert.deepEqual(
    buildGroomingNotePayload({ recommendations: ` ${limit} ` }),
    { recommendations: limit }
  );
  assert.throws(
    () => buildGroomingNotePayload({ afterNote: `${limit}a` }),
    /1000/
  );
});

test('multipart accepts a photo alone or one photo per slot with trimmed text', () => {
  const before = new File(['image'], 'before.jpg', { type: 'image/jpeg' });
  const after = new File(
    [new Uint8Array(GROOMING_PHOTO_MAX_BYTES - 1)],
    'after.webp',
    { type: 'image/webp' }
  );
  const photoOnly = buildGroomingNotePayload({ beforePhoto: before });
  assert.ok(photoOnly instanceof FormData);
  assert.equal(photoOnly.get('beforePhoto').name, 'before.jpg');
  const form = buildGroomingNotePayload({
    beforePhoto: before,
    afterPhoto: after,
    afterNote: ' Đã tắm ',
  });
  assert.deepEqual(
    [...form.keys()],
    ['afterNote', 'beforePhoto', 'afterPhoto']
  );
  assert.equal(form.get('afterNote'), 'Đã tắm');
  assert.equal(form.get('afterPhoto').size, GROOMING_PHOTO_MAX_BYTES - 1);
});

test('multipart rejects unsupported, oversized, and empty photos', () => {
  const gif = new File(['image'], 'image.gif', { type: 'image/gif' });
  const large = new File(
    [new Uint8Array(GROOMING_PHOTO_MAX_BYTES + 1)],
    'big.png',
    { type: 'image/png' }
  );
  const empty = new File([], 'empty.png', { type: 'image/png' });
  const atLimit = new File(
    [new Uint8Array(GROOMING_PHOTO_MAX_BYTES)],
    'at-limit.png',
    { type: 'image/png' }
  );
  assert.throws(
    () => buildGroomingNotePayload({ beforePhoto: gif }),
    /JPEG, PNG hoặc WebP/
  );
  assert.throws(() => buildGroomingNotePayload({ afterPhoto: large }), /5 MiB/);
  assert.throws(
    () => buildGroomingNotePayload({ afterPhoto: atLimit }),
    /5 MiB/
  );
  assert.throws(
    () => buildGroomingNotePayload({ beforePhoto: empty }),
    /không được để trống/
  );
});
