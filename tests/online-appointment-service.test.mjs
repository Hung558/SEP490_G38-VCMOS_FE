import test from 'node:test';
import assert from 'node:assert/strict';

const urls = await import(
  '../src/services/AppointmentServiceService/urls.ts'
);
const helpers = await import(
  '../src/services/AppointmentServiceService/helpers.ts'
);
const serviceHelpers = await import(
  '../src/services/ServiceService/helpers.ts'
);
const roles = await import('../src/constants/roles.ts');

test('AppointmentServiceService URLs match BE endpoint without /api prefix', () => {
  assert.equal(
    urls.apiOnlineAppointmentService,
    '/appointment-services/online'
  );
});

test('isValidMongoObjectId correctly validates 24-character hexadecimal IDs', () => {
  assert.equal(helpers.isValidMongoObjectId('6ad96d4a9664da6b2c0d8d70'), true);
  assert.equal(helpers.isValidMongoObjectId('6AD96D4A9664DA6B2C0D8D70'), true);
  assert.equal(helpers.isValidMongoObjectId(' 6ad96d4a9664da6b2c0d8d70 '), true);

  assert.equal(helpers.isValidMongoObjectId(''), false);
  assert.equal(helpers.isValidMongoObjectId('invalid-id'), false);
  assert.equal(helpers.isValidMongoObjectId('6ad96d4a9664da6b2c0d8d7'), false); // 23 chars
  assert.equal(helpers.isValidMongoObjectId('6ad96d4a9664da6b2c0d8d701'), false); // 25 chars
  assert.equal(helpers.isValidMongoObjectId('6ad96d4a9664da6b2c0d8d7z'), false); // non-hex
  assert.equal(helpers.isValidMongoObjectId(null), false);
  assert.equal(helpers.isValidMongoObjectId(undefined), false);
  assert.equal(helpers.isValidMongoObjectId(12345), false);
});

test('isAppointmentEligibleForService checks isOnline and non-terminal statuses', () => {
  // Eligible: online and Booked / CheckedIn / InProgress / WaitOwner
  assert.equal(
    helpers.isAppointmentEligibleForService({
      isOnline: true,
      derivedStatus: 'Booked',
    }),
    true
  );
  assert.equal(
    helpers.isAppointmentEligibleForService({
      isOnline: true,
      derivedStatus: 'CheckedIn',
    }),
    true
  );
  assert.equal(
    helpers.isAppointmentEligibleForService({
      isOnline: true,
      derivedStatus: 'InProgress',
    }),
    true
  );
  assert.equal(
    helpers.isAppointmentEligibleForService({
      isOnline: true,
      derivedStatus: 'WaitOwner',
    }),
    true
  );

  // Ineligible: terminal / blocked statuses
  assert.equal(
    helpers.isAppointmentEligibleForService({
      isOnline: true,
      derivedStatus: 'Done',
    }),
    false
  );
  assert.equal(
    helpers.isAppointmentEligibleForService({
      isOnline: true,
      derivedStatus: 'Cancelled',
    }),
    false
  );
  assert.equal(
    helpers.isAppointmentEligibleForService({
      isOnline: true,
      derivedStatus: 'Overdue',
    }),
    false
  );

  // Ineligible: offline appointments
  assert.equal(
    helpers.isAppointmentEligibleForService({
      isOnline: false,
      derivedStatus: 'Booked',
    }),
    false
  );

  // Ineligible: missing appointment object
  assert.equal(helpers.isAppointmentEligibleForService(null), false);
  assert.equal(helpers.isAppointmentEligibleForService(undefined), false);
});

test('validateAppointmentServiceForm requires valid orderId and serviceId', () => {
  const result = helpers.validateAppointmentServiceForm({});
  assert.equal(result.isValid, false);
  assert.match(result.errors.orderId || '', /bắt buộc/);
  assert.match(result.errors.serviceId || '', /bắt buộc/);

  const invalidIds = helpers.validateAppointmentServiceForm({
    orderId: 'not-an-id',
    serviceId: 'also-not-an-id',
  });
  assert.equal(invalidIds.isValid, false);
  assert.match(invalidIds.errors.orderId || '', /không hợp lệ/);
  assert.match(invalidIds.errors.serviceId || '', /không hợp lệ/);
});

test('validateAppointmentServiceForm validates sequenceNo and isEmergency when provided', () => {
  const valid = helpers.validateAppointmentServiceForm({
    orderId: '6ad96d4a9664da6b2c0d8d70',
    serviceId: '6ad96d4a9664da6b2c0d8d55',
    sequenceNo: 1,
    isEmergency: false,
  });
  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.errors, {});

  // sequenceNo must be positive integer
  const invalidSeqZero = helpers.validateAppointmentServiceForm({
    orderId: '6ad96d4a9664da6b2c0d8d70',
    serviceId: '6ad96d4a9664da6b2c0d8d55',
    sequenceNo: 0,
  });
  assert.equal(invalidSeqZero.isValid, false);
  assert.match(invalidSeqZero.errors.sequenceNo || '', /số nguyên dương/);

  const invalidSeqNegative = helpers.validateAppointmentServiceForm({
    orderId: '6ad96d4a9664da6b2c0d8d70',
    serviceId: '6ad96d4a9664da6b2c0d8d55',
    sequenceNo: -3,
  });
  assert.equal(invalidSeqNegative.isValid, false);
  assert.match(invalidSeqNegative.errors.sequenceNo || '', /số nguyên dương/);

  const invalidSeqDecimal = helpers.validateAppointmentServiceForm({
    orderId: '6ad96d4a9664da6b2c0d8d70',
    serviceId: '6ad96d4a9664da6b2c0d8d55',
    sequenceNo: 1.5,
  });
  assert.equal(invalidSeqDecimal.isValid, false);
  assert.match(invalidSeqDecimal.errors.sequenceNo || '', /số nguyên dương/);

  // isEmergency must be boolean
  const invalidEmergency = helpers.validateAppointmentServiceForm({
    orderId: '6ad96d4a9664da6b2c0d8d70',
    serviceId: '6ad96d4a9664da6b2c0d8d55',
    isEmergency: 'true',
  });
  assert.equal(invalidEmergency.isValid, false);
  assert.match(invalidEmergency.errors.isEmergency || '', /true hoặc false/);
});

test('buildCreateOnlineAppointmentServicePayload trims fields and whitelists payload', () => {
  const payload = helpers.buildCreateOnlineAppointmentServicePayload({
    orderId: '  6ad96d4a9664da6b2c0d8d70  ',
    serviceId: '  6ad96d4a9664da6b2c0d8d55  ',
    sequenceNo: 2,
    isEmergency: true,
    // Forbidden fields that must be dropped:
    ownerId: '6ad96d4a9664da6b2c0d8d61',
    preferredStaffId: '6ad96d4a9664da6b2c0d8d99',
    assignedStaffId: '6ad96d4a9664da6b2c0d8d98',
    status: 'InProgress',
    queueNo: 5,
    enqueueAt: '2026-11-06T00:00:00.000Z',
    dequeueAt: '2026-11-06T00:30:00.000Z',
    groomingNote: { beforeNote: 'note' },
    extraForbiddenKey: 'danger',
  });

  assert.deepEqual(payload, {
    orderId: '6ad96d4a9664da6b2c0d8d70',
    serviceId: '6ad96d4a9664da6b2c0d8d55',
    sequenceNo: 2,
    isEmergency: true,
  });

  // Verify forbidden fields are not present in payload
  assert.equal('ownerId' in payload, false);
  assert.equal('preferredStaffId' in payload, false);
  assert.equal('assignedStaffId' in payload, false);
  assert.equal('status' in payload, false);
  assert.equal('queueNo' in payload, false);
  assert.equal('enqueueAt' in payload, false);
  assert.equal('dequeueAt' in payload, false);
  assert.equal('groomingNote' in payload, false);
  assert.equal('extraForbiddenKey' in payload, false);
});

test('buildCreateOnlineAppointmentServicePayload omits optional fields when undefined or empty', () => {
  const payload = helpers.buildCreateOnlineAppointmentServicePayload({
    orderId: '6ad96d4a9664da6b2c0d8d70',
    serviceId: '6ad96d4a9664da6b2c0d8d55',
    sequenceNo: undefined,
    isEmergency: undefined,
  });

  assert.deepEqual(payload, {
    orderId: '6ad96d4a9664da6b2c0d8d70',
    serviceId: '6ad96d4a9664da6b2c0d8d55',
  });
  assert.equal('sequenceNo' in payload, false);
  assert.equal('isEmergency' in payload, false);
});

test('extractApiError extracts status code and Vietnamese messages', () => {
  const err400 = {
    response: {
      status: 400,
      data: { message: 'orderId không hợp lệ' },
    },
  };
  assert.deepEqual(helpers.extractApiError(err400), {
    message: 'orderId không hợp lệ',
    statusCode: 400,
    fieldErrors: undefined,
  });

  const err409 = {
    response: {
      status: 409,
      data: { message: 'Số thứ tự dịch vụ đã tồn tại trong lịch hẹn này' },
    },
  };
  assert.deepEqual(helpers.extractApiError(err409), {
    message: 'Số thứ tự dịch vụ đã tồn tại trong lịch hẹn này',
    statusCode: 409,
    fieldErrors: undefined,
  });

  const errFallback = {
    response: {
      status: 500,
      data: {},
    },
  };
  assert.equal(
    helpers.extractApiError(errFallback).message,
    'Đã có lỗi xảy ra. Vui lòng thử lại sau.'
  );
});

test('normalizeRole matches PetOwner correctly', () => {
  assert.equal(roles.normalizeRole('PetOwner'), 'PetOwner');
  assert.equal(roles.normalizeRole('petowner'), 'PetOwner');
  assert.equal(roles.normalizeRole('Admin'), 'Admin');
  assert.equal(roles.normalizeRole('Receptionist'), 'Receptionist');
  assert.equal(roles.normalizeRole('Veterinarian'), 'Veterinarian');
  assert.equal(roles.normalizeRole('Groomer'), 'Groomer');
});

test('ServiceService buildServiceQuery filters by Active status correctly', () => {
  const query = serviceHelpers.buildServiceQuery({ status: 'Active' });
  assert.deepEqual(query, { status: 'Active' });
});

test('isUserPetOwner safely validates PetOwner from role or systemRole with case-insensitivity', () => {
  // role variations
  assert.equal(helpers.isUserPetOwner({ role: 'PetOwner' }), true);
  assert.equal(helpers.isUserPetOwner({ role: 'petowner' }), true);
  assert.equal(helpers.isUserPetOwner({ role: '  PetOwner  ' }), true);

  // systemRole variations (e.g. when user only has systemRole or during hydration)
  assert.equal(helpers.isUserPetOwner({ systemRole: 'PetOwner' }), true);
  assert.equal(helpers.isUserPetOwner({ systemRole: 'petowner' }), true);
  assert.equal(helpers.isUserPetOwner({ role: undefined, systemRole: 'PetOwner' }), true);

  // Both present
  assert.equal(
    helpers.isUserPetOwner({ role: 'PetOwner', systemRole: 'PetOwner' }),
    true
  );

  // Non-PetOwner roles
  assert.equal(helpers.isUserPetOwner({ role: 'Admin' }), false);
  assert.equal(helpers.isUserPetOwner({ systemRole: 'Receptionist' }), false);
  assert.equal(helpers.isUserPetOwner({ role: 'Veterinarian' }), false);
  assert.equal(helpers.isUserPetOwner({ systemRole: 'Groomer' }), false);

  // Empty or invalid values
  assert.equal(helpers.isUserPetOwner(null), false);
  assert.equal(helpers.isUserPetOwner(undefined), false);
  assert.equal(helpers.isUserPetOwner({}), false);
  assert.equal(helpers.isUserPetOwner('string'), false);
  assert.equal(helpers.isUserPetOwner(123), false);
});


