import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSubtaskCreate,
  buildSubtaskResult,
  filterSubtaskPerformers,
  resolveSubtaskTarget,
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

const { getServiceStaffRole } = await import(
  '../src/services/StaffService/helpers.ts'
);

test('a catalogue service sets the role as the BE does and is sent as serviceId', () => {
  const services = [
    { _id: 'spa', name: 'Tắm sấy', category: 'Grooming' },
    { _id: 'xray', name: 'Chụp X-quang ngực', category: 'Paraclinical' },
    // Admin moved this medical-sounding service to the groomers
    {
      _id: 'bath',
      name: 'Tắm thuốc trị nấm',
      category: 'Examination',
      requiredRole: 'Groomer',
    },
  ];
  assert.deepEqual(resolveSubtaskTarget('  tắm SẤY ', services), {
    role: 'Groomer',
    serviceId: 'spa',
  });
  assert.deepEqual(resolveSubtaskTarget('Chụp X-quang ngực', services), {
    role: 'Veterinarian',
    serviceId: 'xray',
  });
  assert.deepEqual(resolveSubtaskTarget('Tắm thuốc trị nấm', services), {
    role: 'Groomer',
    serviceId: 'bath',
  });
  assert.equal(getServiceStaffRole({ category: 'Grooming' }), 'Groomer');
  assert.equal(
    getServiceStaffRole({ category: 'Grooming', requiredRole: 'Veterinarian' }),
    'Veterinarian'
  );
  assert.equal(
    getServiceStaffRole({ category: 'Vaccination', requiredRole: 'Nurse' }),
    'Veterinarian'
  );
});

test('usual task types map to a role; free text keeps every performer', () => {
  assert.deepEqual(resolveSubtaskTarget('Cạo lông', []), { role: 'Groomer' });
  assert.deepEqual(resolveSubtaskTarget('Tắm thuốc', []), { role: 'Groomer' });
  assert.deepEqual(resolveSubtaskTarget('Siêu âm', []), {
    role: 'Veterinarian',
  });
  assert.deepEqual(resolveSubtaskTarget('Siêu âm ổ bụng', []), {});
  assert.deepEqual(resolveSubtaskTarget('   ', []), {});
  assert.deepEqual(resolveSubtaskTarget(undefined, []), {});

  const staff = [
    { _id: 'v1', role: 'Veterinarian' },
    { _id: 'g1', role: 'Groomer' },
    { _id: 'v2', role: 'Veterinarian' },
  ];
  assert.deepEqual(
    filterSubtaskPerformers(staff, 'Groomer').map(s => s._id),
    ['g1']
  );
  assert.deepEqual(
    filterSubtaskPerformers(staff, 'Veterinarian').map(s => s._id),
    ['v1', 'v2']
  );
  assert.deepEqual(
    filterSubtaskPerformers(staff).map(s => s._id),
    ['v1', 'g1', 'v2']
  );
});

test('the create body carries serviceId only when a catalogue service was picked', () => {
  const base = {
    appointmentServiceId: 'service',
    assignedStaffId: 'staff',
    taskType: 'Tắm sấy',
  };
  assert.deepEqual(buildSubtaskCreate({ ...base, serviceId: ' spa ' }), {
    ...base,
    serviceId: 'spa',
  });
  assert.deepEqual(buildSubtaskCreate({ ...base, serviceId: undefined }), base);
});
