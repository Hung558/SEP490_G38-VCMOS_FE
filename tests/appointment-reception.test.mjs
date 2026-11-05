import test from 'node:test';
import assert from 'node:assert/strict';

const appointmentUrls = await import(
  '../src/services/AppointmentOrderService/urls.ts'
);
const appointmentHelpers = await import(
  '../src/services/AppointmentOrderService/helpers.ts'
);
const cageAssignmentUrls = await import(
  '../src/services/CageAssignmentService/urls.ts'
);
const cageAssignmentHelpers = await import(
  '../src/services/CageAssignmentService/helpers.ts'
);
const router = await import('../src/routerMap/ROUTER.ts');
const breadcrumb = await import('../src/routerMap/breadcrumbMap.ts');
const roles = await import('../src/constants/roles.ts');

test('ROUTER exposes CLINIC_APPOINTMENTS route at /clinic/appointments', () => {
  assert.equal(router.default.CLINIC_APPOINTMENTS, '/clinic/appointments');
});

test('breadcrumbMap labels clinic and appointments segments in Vietnamese', () => {
  assert.equal(breadcrumb.breadcrumbMap.clinic, 'Phòng khám');
  assert.equal(breadcrumb.breadcrumbMap.appointments, 'Tiếp nhận lịch hẹn');
});

test('AppointmentOrderService URLs match BE endpoints without /api/api prefix', () => {
  assert.equal(appointmentUrls.apiStaffAppointments, '/appointment-orders');
  assert.equal(
    appointmentUrls.apiCheckInAppointment('6ad96d4a9664da6b2c0d8d70'),
    '/appointment-orders/6ad96d4a9664da6b2c0d8d70/check-in'
  );
});

test('CageAssignmentService URLs match BE endpoints without /api/api prefix', () => {
  assert.equal(cageAssignmentUrls.apiCageAssignments, '/cage-assignments');
  assert.equal(
    cageAssignmentUrls.apiCageAssignmentDetail('6ad96d4a9664da6b2c0d9a01'),
    '/cage-assignments/6ad96d4a9664da6b2c0d9a01'
  );
});

test('buildStaffAppointmentFilterQuery builds query with whitelisted keys and ignores invalid values', () => {
  const query = appointmentHelpers.buildStaffAppointmentFilterQuery({
    status: 'Booked',
    isOnline: true,
    code: ' apt-k7m2qx ',
    ownerId: '6ad96d4a9664da6b2c0d8d61',
    petId: '6ad96d4a9664da6b2c0d8d70',
    from: '2026-11-01',
    to: '2026-11-30',
    page: 2,
    limit: 20,
  });

  assert.deepEqual(query, {
    status: 'Booked',
    isOnline: true,
    code: 'APT-K7M2QX',
    ownerId: '6ad96d4a9664da6b2c0d8d61',
    petId: '6ad96d4a9664da6b2c0d8d70',
    from: '2026-11-01',
    to: '2026-11-30',
    page: 2,
    limit: 20,
  });
});

test('buildStaffAppointmentFilterQuery rejects partial or invalid appointment codes', () => {
  const query = appointmentHelpers.buildStaffAppointmentFilterQuery({
    code: 'invalid-code',
  });
  assert.equal(query.code, undefined);

  const queryPartial = appointmentHelpers.buildStaffAppointmentFilterQuery({
    code: 'APT-123',
  });
  assert.equal(queryPartial.code, undefined);
});

test('buildStaffAppointmentFilterQuery supports false for isOnline (walk-in)', () => {
  const query = appointmentHelpers.buildStaffAppointmentFilterQuery({
    isOnline: false,
  });
  assert.equal(query.isOnline, false);
});

test('buildCageAssignmentQuery serializes active as string boolean', () => {
  const queryActive = cageAssignmentHelpers.buildCageAssignmentQuery({
    active: true,
  });
  assert.equal(queryActive.active, 'true');

  const queryReleased = cageAssignmentHelpers.buildCageAssignmentQuery({
    active: false,
  });
  assert.equal(queryReleased.active, 'false');

  const queryEmpty = cageAssignmentHelpers.buildCageAssignmentQuery({});
  assert.equal(queryEmpty.active, undefined);
});

test('buildCageAssignmentQuery filters by cageId and orderId only when valid 24-hex', () => {
  const query = cageAssignmentHelpers.buildCageAssignmentQuery({
    cageId: '6ad96d4a9664da6b2c0d8e10',
    orderId: '6ad96d4a9664da6b2c0d8f22',
  });
  assert.equal(query.cageId, '6ad96d4a9664da6b2c0d8e10');
  assert.equal(query.orderId, '6ad96d4a9664da6b2c0d8f22');

  const queryInvalid = cageAssignmentHelpers.buildCageAssignmentQuery({
    cageId: 'invalid-id',
    orderId: 'short',
  });
  assert.equal(queryInvalid.cageId, undefined);
  assert.equal(queryInvalid.orderId, undefined);
});

test('buildCreateCageAssignmentPayload strictly whitelists cageId and orderId and trims them', () => {
  const payload = cageAssignmentHelpers.buildCreateCageAssignmentPayload({
    cageId: '  6ad96d4a9664da6b2c0d8e10  ',
    orderId: '  6ad96d4a9664da6b2c0d8f22  ',
    // @ts-expect-error test extraneous fields are omitted
    assignedById: '6ad96d4a9664da6b2c0d8d61',
    status: 'Occupied',
    createdAt: '2026-11-05',
  });

  assert.deepEqual(payload, {
    cageId: '6ad96d4a9664da6b2c0d8e10',
    orderId: '6ad96d4a9664da6b2c0d8f22',
  });
  assert.equal(Object.keys(payload).length, 2);
});

test('getAppointmentPetName extracts name safely from object or returns string fallback', () => {
  assert.equal(
    appointmentHelpers.getAppointmentPetName({ _id: '123', name: 'Milo' }),
    'Milo'
  );
  assert.equal(
    appointmentHelpers.getAppointmentPetName('6ad96d4a9664da6b2c0d8d70'),
    '6ad96d4a9664da6b2c0d8d70'
  );
  assert.equal(appointmentHelpers.getAppointmentPetName(null), 'Chưa rõ');
  assert.equal(appointmentHelpers.getAppointmentPetName(undefined), 'Chưa rõ');
});

test('getAppointmentOwnerName and getAppointmentOwnerPhone extract info safely', () => {
  const owner = {
    _id: '123',
    fullName: 'Nguyen Van A',
    phone: '0987654321',
  };
  assert.equal(appointmentHelpers.getAppointmentOwnerName(owner), 'Nguyen Van A');
  assert.equal(appointmentHelpers.getAppointmentOwnerPhone(owner), '0987654321');

  assert.equal(appointmentHelpers.getAppointmentOwnerName('123'), '123');
  assert.equal(appointmentHelpers.getAppointmentOwnerPhone('123'), '-');
  assert.equal(appointmentHelpers.getAppointmentOwnerName(null), 'Chưa rõ');
  assert.equal(appointmentHelpers.getAppointmentOwnerPhone(null), '-');
});

test('CageAssignment safe extractors handle populated objects and legacy strings', () => {
  const cage = {
    _id: 'c1',
    label: 'A-01',
    size: 'M',
    isIsolated: false,
    status: 'Occupied',
    createdAt: '',
    updatedAt: '',
  };
  assert.equal(cageAssignmentHelpers.getAssignmentCageLabel(cage), 'A-01');
  assert.equal(cageAssignmentHelpers.getAssignmentCageSize(cage), 'M');

  const order = {
    _id: 'o1',
    code: 'APT-ABC123',
    petId: 'p1',
    ownerId: 'u1',
    date: '2026-11-05',
    isOnline: true,
    derivedStatus: 'CheckedIn',
    createdAt: '',
    updatedAt: '',
  };
  assert.equal(cageAssignmentHelpers.getAssignmentOrderCode(order), 'APT-ABC123');

  const operator = {
    _id: 'u1',
    fullName: 'Receptionist Mai',
  };
  assert.equal(
    cageAssignmentHelpers.getAssignmentOperatorName(operator),
    'Receptionist Mai'
  );

  assert.equal(
    cageAssignmentHelpers.isAssignmentActive({ releasedAt: null }),
    true
  );
  assert.equal(
    cageAssignmentHelpers.isAssignmentActive({
      releasedAt: '2026-11-05T03:30:45.000Z',
    }),
    false
  );
});

test('extractApiError handles both array of strings and array of objects', () => {
  const errWithStrings = {
    response: {
      status: 400,
      data: {
        message: 'Dữ liệu không hợp lệ',
        errors: ['ID chuồng là bắt buộc', 'ID đơn hẹn không hợp lệ'],
      },
    },
  };
  const parsed1 = appointmentHelpers.extractApiError(errWithStrings);
  assert.equal(parsed1.status, 400);
  assert.equal(parsed1.message, 'Dữ liệu không hợp lệ');
  assert.ok(parsed1.fieldErrors.general);

  const errWithObjects = {
    response: {
      status: 400,
      data: {
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: 'id', message: 'id không hợp lệ' }],
      },
    },
  };
  const parsed2 = appointmentHelpers.extractApiError(errWithObjects);
  assert.equal(parsed2.fieldErrors.id, 'id không hợp lệ');
});

test('role normalization verifies Admin and Receptionist exact permissions', () => {
  assert.equal(roles.normalizeRole('Admin'), 'Admin');
  assert.equal(roles.normalizeRole('admin'), 'Admin');
  assert.equal(roles.normalizeRole('Receptionist'), 'Receptionist');
  assert.equal(roles.normalizeRole('receptionist'), 'Receptionist');
  assert.equal(roles.normalizeRole('Veterinarian'), 'Veterinarian');
  assert.equal(roles.normalizeRole('Groomer'), 'Groomer');
  assert.equal(roles.normalizeRole('PetOwner'), 'PetOwner');

  // Verify generic staff group includes Veterinarian and Groomer
  assert.equal(roles.getRoleGroup('Veterinarian'), 'staff');
  assert.equal(roles.getRoleGroup('Groomer'), 'staff');
  assert.equal(roles.getRoleGroup('Receptionist'), 'staff');
  // Admin is distinct
  assert.equal(roles.getRoleGroup('Admin'), 'admin');
});

