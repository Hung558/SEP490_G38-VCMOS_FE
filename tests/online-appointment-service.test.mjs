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
  assert.equal(
    urls.apiCreateOnlineBooking,
    '/appointment-services/online-booking'
  );
  assert.equal(
    urls.apiCancelAppointmentService('svc123'),
    '/appointment-services/svc123/cancel'
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

test('AppointmentServiceService apiCreateOnlineBooking URL matches BE endpoint without /api prefix', () => {
  assert.equal(
    urls.apiCreateOnlineBooking,
    '/appointment-services/online-booking'
  );
  assert.equal(
    urls.apiOnlineAppointmentService,
    '/appointment-services/online'
  );
});

test('buildCreateOnlineBookingPayload trims fields and whitelists combined booking payload', () => {
  const payload = helpers.buildCreateOnlineBookingPayload({
    petId: '  6ad96d4a9664da6b2c0d8d70  ',
    date: '  2026-11-20  ',
    note: '  Bé hơi nhát, nhờ khám nhẹ nhàng  ',
    services: [
      {
        serviceId: '  6ad96d4a9664da6b2c0d8e01  ',
        sequenceNo: 1,
        isEmergency: false,
        // Forbidden fields in service item:
        orderId: '6ad96d4a9664da6b2c0d8f10',
        preferredStaffId: '6ad96d4a9664da6b2c0d8b05',
        assignedStaffId: '6ad96d4a9664da6b2c0d8b06',
        status: 'Booked',
        queueNo: 2,
        enqueueAt: '2026-11-20T08:00:00Z',
        dequeueAt: '2026-11-20T08:30:00Z',
        groomingNote: { beforeNote: 'note' },
      },
      {
        serviceId: '6ad96d4a9664da6b2c0d8e02',
        sequenceNo: 2,
        isEmergency: true,
      },
    ],
    // Forbidden top-level fields:
    ownerId: '6ad96d4a9664da6b2c0d8d61',
    code: 'APT-123456',
    isOnline: true,
    derivedStatus: 'Booked',
    checkedInAt: null,
    extraRandomKey: 'forbidden',
  });

  assert.deepEqual(payload, {
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-11-20',
    note: 'Bé hơi nhát, nhờ khám nhẹ nhàng',
    services: [
      {
        serviceId: '6ad96d4a9664da6b2c0d8e01',
        sequenceNo: 1,
        isEmergency: false,
      },
      {
        serviceId: '6ad96d4a9664da6b2c0d8e02',
        sequenceNo: 2,
        isEmergency: true,
      },
    ],
  });

  // Verify forbidden top-level keys are absent
  assert.equal('ownerId' in payload, false);
  assert.equal('code' in payload, false);
  assert.equal('isOnline' in payload, false);
  assert.equal('derivedStatus' in payload, false);
  assert.equal('checkedInAt' in payload, false);
  assert.equal('extraRandomKey' in payload, false);

  // Verify forbidden service-item keys are absent
  const s1 = payload.services[0];
  assert.equal('orderId' in s1, false);
  assert.equal('preferredStaffId' in s1, false);
  assert.equal('assignedStaffId' in s1, false);
  assert.equal('status' in s1, false);
  assert.equal('queueNo' in s1, false);
  assert.equal('enqueueAt' in s1, false);
  assert.equal('dequeueAt' in s1, false);
  assert.equal('groomingNote' in s1, false);
});

test('buildCreateOnlineBookingPayload omits note when empty and omits sequenceNo/isEmergency when invalid', () => {
  const payload = helpers.buildCreateOnlineBookingPayload({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-11-20',
    note: '   ',
    services: [
      {
        serviceId: '6ad96d4a9664da6b2c0d8e01',
        sequenceNo: undefined,
        isEmergency: undefined,
      },
      {
        serviceId: '6ad96d4a9664da6b2c0d8e02',
        sequenceNo: -1, // invalid -> omitted
        isEmergency: 'not-a-boolean', // invalid -> omitted
      },
    ],
  });

  assert.deepEqual(payload, {
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-11-20',
    services: [
      { serviceId: '6ad96d4a9664da6b2c0d8e01' },
      { serviceId: '6ad96d4a9664da6b2c0d8e02' },
    ],
  });
  assert.equal('note' in payload, false);
  assert.equal('sequenceNo' in payload.services[0], false);
  assert.equal('isEmergency' in payload.services[0], false);
  assert.equal('sequenceNo' in payload.services[1], false);
  assert.equal('isEmergency' in payload.services[1], false);
});

test('validateOnlineBookingForm validates petId, date, services, and duplicate sequence numbers', () => {
  // Empty form
  const emptyRes = helpers.validateOnlineBookingForm({});
  assert.equal(emptyRes.isValid, false);
  assert.match(emptyRes.errors.petId || '', /bắt buộc/);
  assert.match(emptyRes.errors.date || '', /bắt buộc/);
  assert.match(emptyRes.errors.services || '', /ít nhất một dịch vụ/);

  // Empty services array
  const emptyServicesRes = helpers.validateOnlineBookingForm({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-12-15',
    services: [],
  });
  assert.equal(emptyServicesRes.isValid, false);
  assert.match(emptyServicesRes.errors.services || '', /ít nhất một dịch vụ/);

  // Duplicate sequence numbers in services
  const duplicateSeqRes = helpers.validateOnlineBookingForm({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-12-15',
    services: [
      { serviceId: '6ad96d4a9664da6b2c0d8e01', sequenceNo: 1 },
      { serviceId: '6ad96d4a9664da6b2c0d8e02', sequenceNo: 1 }, // duplicate sequence
    ],
  });
  assert.equal(duplicateSeqRes.isValid, false);
  assert.match(
    duplicateSeqRes.errors.serviceErrors?.[1]?.sequenceNo || '',
    /trùng/
  );

  // Valid form
  const validRes = helpers.validateOnlineBookingForm({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-12-15',
    note: 'Khám răng',
    services: [
      { serviceId: '6ad96d4a9664da6b2c0d8e01', sequenceNo: 1, isEmergency: false },
      { serviceId: '6ad96d4a9664da6b2c0d8e02', sequenceNo: 2, isEmergency: true },
    ],
  });
  assert.equal(validRes.isValid, true);
  assert.deepEqual(validRes.errors, {});
});

test('getAppointmentServiceStatusLabel and Color map known statuses correctly', () => {
  assert.equal(helpers.getAppointmentServiceStatusLabel('Booked'), 'Đã đặt');
  assert.equal(helpers.getAppointmentServiceStatusLabel('Waiting'), 'Chờ thực hiện');
  assert.equal(helpers.getAppointmentServiceStatusLabel('InProgress'), 'Đang thực hiện');
  assert.equal(helpers.getAppointmentServiceStatusLabel('Done'), 'Hoàn tất');
  assert.equal(helpers.getAppointmentServiceStatusLabel('Cancelled'), 'Đã hủy');
  assert.equal(helpers.getAppointmentServiceStatusLabel('Overdue'), 'Quá hạn');

  assert.equal(helpers.getAppointmentServiceStatusColor('Booked'), 'blue');
  assert.equal(helpers.getAppointmentServiceStatusColor('Waiting'), 'orange');
  assert.equal(helpers.getAppointmentServiceStatusColor('InProgress'), 'processing');
  assert.equal(helpers.getAppointmentServiceStatusColor('Done'), 'success');
  assert.equal(helpers.getAppointmentServiceStatusColor('Cancelled'), 'error');
  assert.equal(helpers.getAppointmentServiceStatusColor('Overdue'), 'default');
});

test('getAppointmentServiceName and StaffName handle populated and unpopulated refs safely', () => {
  // Populated service
  assert.equal(
    helpers.getAppointmentServiceName({
      _id: '6ad96d4a9664da6b2c0d8c10',
      name: 'Khám tổng quát',
    }),
    'Khám tổng quát'
  );
  // Unpopulated string ID
  assert.equal(
    helpers.getAppointmentServiceName('6ad96d4a9664da6b2c0d8c10'),
    'Dịch vụ (0d8c10)'
  );
  // Null or undefined
  assert.equal(helpers.getAppointmentServiceName(null), '—');
  assert.equal(helpers.getAppointmentServiceName(undefined), '—');

  // Populated staff
  assert.equal(
    helpers.getAppointmentServiceStaffName({
      _id: '6ad96d4a9664da6b2c0d8b05',
      fullName: 'Bác sĩ A',
    }),
    'Bác sĩ A'
  );
  // Unpopulated string ID
  assert.equal(
    helpers.getAppointmentServiceStaffName('6ad96d4a9664da6b2c0d8b05'),
    'Nhân viên (0d8b05)'
  );
  // Null or undefined
  assert.equal(helpers.getAppointmentServiceStaffName(null), '—');
  assert.equal(helpers.getAppointmentServiceStaffName(undefined), '—');
});

test('filterActiveServices strictly filters out inactive, deleted, or invalid services', () => {
  const mixedServices = [
    { _id: 's1', name: 'Khám tổng quát', status: 'Active' },
    { _id: 's2', name: 'Dịch vụ ngừng bán', status: 'Inactive' },
    { _id: 's3', name: 'Tiêm phòng dại', status: 'Active' },
    { _id: 's4', name: 'Dịch vụ cũ', status: 'Deleted' },
    { _id: 's5', name: 'Không rõ trạng thái', status: undefined },
    null,
  ];

  const filtered = helpers.filterActiveServices(mixedServices);
  assert.equal(filtered.length, 2);
  assert.deepEqual(
    filtered.map(s => s._id),
    ['s1', 's3']
  );

  // Edge cases
  assert.deepEqual(helpers.filterActiveServices([]), []);
  assert.deepEqual(helpers.filterActiveServices(null), []);
  assert.deepEqual(helpers.filterActiveServices(undefined), []);
  assert.deepEqual(helpers.filterActiveServices('not an array'), []);
});

test('validateOnlineBookingForm validates all fields simultaneously for single-form submission', () => {
  // Empty form submission: all missing required fields reported together
  const emptyRes = helpers.validateOnlineBookingForm({
    petId: '',
    date: '',
    services: [],
  });

  assert.equal(emptyRes.isValid, false);
  assert.ok(emptyRes.errors.petId, 'petId error should be present');
  assert.ok(emptyRes.errors.services, 'services error should be present');
  assert.ok(emptyRes.errors.date, 'date error should be present');

  // Partial submission: only invalid fields reported, allowing inline field binding
  const partialRes = helpers.validateOnlineBookingForm({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-12-25',
    services: [], // missing services
  });

  assert.equal(partialRes.isValid, false);
  assert.equal(partialRes.errors.petId, undefined);
  assert.equal(partialRes.errors.date, undefined);
  assert.ok(partialRes.errors.services, 'services error should be present');
});

test('buildCreateOnlineBookingPayload adheres strictly to whitelist and omits empty/internal fields', () => {
  const payload = helpers.buildCreateOnlineBookingPayload({
    petId: ' 6ad96d4a9664da6b2c0d8d70 ',
    date: ' 2026-12-25 ',
    note: '  Bé bị cảm cúm  ',
    services: [
      { serviceId: ' 6ad96d4a9664da6b2c0d8e01 ', sequenceNo: 1, isEmergency: true },
    ],
    // extra fields that should never be sent
    ownerId: '6ad96d4a9664da6b2c0d8a01',
    code: 'APT-123456',
    isOnline: true,
  });

  assert.equal(payload.petId, '6ad96d4a9664da6b2c0d8d70');
  assert.equal(payload.date, '2026-12-25');
  assert.equal(payload.note, 'Bé bị cảm cúm');
  assert.equal(payload.services.length, 1);
  assert.equal(payload.services[0].serviceId, '6ad96d4a9664da6b2c0d8e01');
  assert.equal(payload.services[0].sequenceNo, 1);
  assert.equal(payload.services[0].isEmergency, true);

  // Assert no extra or internal fields are present
  assert.equal('ownerId' in payload, false);
  assert.equal('code' in payload, false);
  assert.equal('isOnline' in payload, false);
});

test('buildCreateOnlineBookingPayload supports optional slotStart in whitelist', () => {
  const payload = helpers.buildCreateOnlineBookingPayload({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-12-25',
    slotStart: '  09:00  ',
    services: [
      { serviceId: '6ad96d4a9664da6b2c0d8e01' },
    ],
  });

  assert.equal(payload.slotStart, '09:00');
});

test('validateSlotStart validates format HH:mm and operating hours 08:00 - 18:00', () => {
  // Optional if empty or undefined
  assert.equal(helpers.validateSlotStart(undefined), undefined);
  assert.equal(helpers.validateSlotStart(''), undefined);
  assert.equal(helpers.validateSlotStart('   '), undefined);

  // Invalid format
  assert.match(helpers.validateSlotStart('9:00'), /định dạng/);
  assert.match(helpers.validateSlotStart('09:0'), /định dạng/);
  assert.match(helpers.validateSlotStart('invalid'), /định dạng/);

  // Out of clinic hours (< 08:00 or >= 18:00)
  assert.match(helpers.validateSlotStart('07:30'), /khung giờ làm việc/);
  assert.match(helpers.validateSlotStart('18:00'), /khung giờ làm việc/);
  assert.match(helpers.validateSlotStart('19:30'), /khung giờ làm việc/);

  // Future valid time
  assert.equal(helpers.validateSlotStart('09:00', '2099-12-31'), undefined);
  assert.equal(helpers.validateSlotStart('17:30', '2099-12-31'), undefined);
});

test('validateCancelReason requires non-empty string and caps length at 200', () => {
  assert.match(helpers.validateCancelReason(undefined), /bắt buộc/);
  assert.match(helpers.validateCancelReason(''), /bắt buộc/);
  assert.match(helpers.validateCancelReason('   '), /bắt buộc/);
  assert.equal(helpers.validateCancelReason('Bận việc đột xuất'), undefined);
  assert.equal(helpers.validateCancelReason('a'.repeat(200)), undefined);
  assert.match(helpers.validateCancelReason('a'.repeat(201)), /tối đa 200/);
});

test('validateOnlineBookingForm validates slotStart when provided', () => {
  const validRes = helpers.validateOnlineBookingForm({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2099-12-25',
    slotStart: '10:00',
    services: [
      { serviceId: '6ad96d4a9664da6b2c0d8e01', sequenceNo: 1 },
    ],
  });
  assert.equal(validRes.isValid, true);
  assert.equal(validRes.errors.slotStart, undefined);

  const invalidSlotRes = helpers.validateOnlineBookingForm({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2099-12-25',
    slotStart: '06:00',
    services: [
      { serviceId: '6ad96d4a9664da6b2c0d8e01', sequenceNo: 1 },
    ],
  });
  assert.equal(invalidSlotRes.isValid, false);
  assert.match(invalidSlotRes.errors.slotStart, /khung giờ làm việc/);
});





