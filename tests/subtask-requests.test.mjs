import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSubtaskCreate,
  buildSubtaskResult,
  getSubtaskActions,
  safeSubtaskImageUrl,
  SUBTASK_IMAGE_MAX,
  validateSubtaskImage,
} from '../src/services/SubtaskRequestService/helpers.ts';
import {
  subtaskById,
  subtaskQueue,
  subtasksByService,
} from '../src/services/SubtaskRequestService/urls.ts';

const task = {
  assignedStaffId: { _id: 'staff' },
  requestedById: 'vet',
  status: 'Pending',
};

test('workflow gates distinguish assignee from requesting doctor and allow completing Pending', () => {
  assert.deepEqual(getSubtaskActions(task, 'staff'), {
    start: true,
    complete: true,
    remove: false,
  });
  assert.deepEqual(getSubtaskActions(task, 'vet'), {
    start: false,
    complete: false,
    remove: true,
  });
  assert.deepEqual(getSubtaskActions(task), {
    start: false,
    complete: false,
    remove: false,
  });
  assert.deepEqual(
    getSubtaskActions({ ...task, status: 'InProgress' }, 'staff'),
    { start: false, complete: true, remove: false }
  );
  assert.deepEqual(
    getSubtaskActions({ ...task, status: 'Completed' }, 'staff'),
    { start: false, complete: false, remove: false }
  );
});

test('creates only the whitelisted fields and rejects blank and oversize text', () => {
  const input = {
    appointmentServiceId: 'service',
    assignedStaffId: 'staff',
    taskType: '  Siêu âm  ',
    status: 'Completed',
    instructions: '   ',
  };
  assert.deepEqual(buildSubtaskCreate(input), {
    appointmentServiceId: 'service',
    assignedStaffId: 'staff',
    taskType: 'Siêu âm',
  });
  assert.throws(() => buildSubtaskCreate({ ...input, taskType: ' ' }));
  assert.throws(() =>
    buildSubtaskCreate({ ...input, taskType: 'x'.repeat(201) })
  );
  assert.throws(() =>
    buildSubtaskCreate({ ...input, instructions: 'x'.repeat(2001) })
  );
});

test('sends trimmed JSON or one multipart image under the exact BE field name', () => {
  const resultImage = new File(['image bytes'], 'fixture.png', {
    type: 'image/png',
  });
  assert.deepEqual(buildSubtaskResult({ resultText: '  result  ' }), {
    resultText: 'result',
  });
  const body = buildSubtaskResult({ resultImage, resultText: ' result ' });
  assert.deepEqual([...body.keys()], ['resultText', 'resultImage']);
  assert.equal(body.get('resultImage'), resultImage);
  assert.equal(body.get('resultText'), 'result');
  assert.deepEqual(
    [...buildSubtaskResult({ resultImage }).keys()],
    ['resultImage']
  );
  assert.throws(() => buildSubtaskResult({ resultText: '  ' }));
  assert.throws(() =>
    buildSubtaskResult({ resultText: 'x'.repeat(3001), resultImage })
  );
});

test('accepts only nonempty supported images up to 5 MiB and HTTPS result links', () => {
  assert.equal(
    validateSubtaskImage({ size: SUBTASK_IMAGE_MAX - 1, type: 'image/webp' }),
    undefined
  );
  assert.ok(
    validateSubtaskImage({ size: SUBTASK_IMAGE_MAX, type: 'image/webp' })
  );
  assert.ok(validateSubtaskImage({ size: 0, type: 'image/png' }));
  assert.ok(validateSubtaskImage({ size: 1, type: 'image/svg+xml' }));
  for (const url of [
    'data:image/png;base64,eA==',
    'http://example.test/img.png',
    'https://x:y@example.test/a',
    '//example.test/a',
  ])
    assert.equal(safeSubtaskImageUrl(url), undefined);
  assert.equal(
    safeSubtaskImageUrl('https://example.test/a'),
    'https://example.test/a'
  );
});

test('service history, own queue and task IDs use distinct paths', () => {
  assert.equal(subtasksByService('abc'), '/subtask-requests/service/abc');
  assert.equal(subtaskQueue, '/subtask-requests/my-queue');
  assert.equal(subtaskById('abc'), '/subtask-requests/abc');
});
