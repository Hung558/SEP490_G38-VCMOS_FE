import test from 'node:test';
import assert from 'node:assert/strict';

const walkInUrls = await import('../src/services/WalkInService/urls.ts');
const walkIn = await import('../src/services/WalkInService/helpers.ts');
const staffUrls = await import('../src/services/StaffService/urls.ts');
const staff = await import('../src/services/StaffService/helpers.ts');
const orderServiceUrls = await import(
  '../src/services/AppointmentServiceService/urls.ts'
);
const orderServices = await import(
  '../src/services/AppointmentServiceService/helpers.ts'
);

const SVC_EXAM = '6ad96d4a9664da6b2c0d8e01';
const SVC_SPA = '6ad96d4a9664da6b2c0d8e02';
const VET = '6ad96d4a9664da6b2c0d8d61';
const VET_2 = '6ad96d4a9664da6b2c0d8d62';
const PET = '6ad96d4a9664da6b2c0d8d70';
const CAGE = '6ad96d4a9664da6b2c0d9a01';

test('walk-in, staff and order-service URLs match the BE routes', () => {
  assert.equal(
    walkInUrls.apiWalkInCustomerLookup,
    '/appointment-orders/walk-in/customer-lookup'
  );
  assert.equal(walkInUrls.apiWalkInBooking, '/appointment-orders/walk-in');
  assert.equal(staffUrls.apiStaffList, '/users/staff');
  assert.equal(orderServiceUrls.apiOrderServices, '/appointment-services');
  assert.equal(
    orderServiceUrls.apiAssignStaff(SVC_EXAM),
    `/appointment-services/${SVC_EXAM}/assign-staff`
  );
});

test('validateWalkInPhone accepts 10 digits starting with 0, typed with spaces or dots', () => {
  for (const phone of ['0988111222', ' 0988 111 222 ', '0988.111.222']) {
    assert.equal(walkIn.validateWalkInPhone(phone), undefined, phone);
  }
  assert.equal(walkIn.normalizeWalkInPhone(' 0988-111 222 '), '0988111222');
  assert.equal(
    walkIn.validateWalkInPhone(''),
    'Vui lòng nhập số điện thoại khách hàng'
  );
  for (const phone of [
    '988111222',
    '09881112223',
    '1988111222',
    '09881l1222',
  ]) {
    assert.equal(
      walkIn.validateWalkInPhone(phone),
      walkIn.MSG_WALK_IN_PHONE,
      phone
    );
  }
});

test('buildWalkInPayload for a new customer sends the name, email and a new pet', () => {
  const payload = walkIn.buildWalkInPayload({
    phone: ' 0988 111 222 ',
    isNewCustomer: true,
    fullName: '  Trần Thị B ',
    email: ' KHACH@Example.com ',
    petMode: 'new',
    petId: PET,
    petInfo: {
      name: ' Milo ',
      species: 'Chó',
      breed: '   ',
      weight: 4.5,
      coatColor: '',
      dob: '2024-05-10',
      notes: ' Hơi nhát ',
    },
    services: [
      { serviceId: SVC_EXAM, assignedStaffId: VET, isEmergency: true },
      { serviceId: SVC_SPA, assignedStaffId: '' },
    ],
    cageId: '',
    note: '   ',
  });

  assert.deepEqual(payload, {
    phone: '0988111222',
    fullName: 'Trần Thị B',
    email: 'khach@example.com',
    petInfo: {
      name: 'Milo',
      species: 'Chó',
      weight: 4.5,
      dob: '2024-05-10',
      notes: 'Hơi nhát',
    },
    services: [
      { serviceId: SVC_EXAM, assignedStaffId: VET, isEmergency: true },
      { serviceId: SVC_SPA, isEmergency: false },
    ],
  });
});

test('buildWalkInPayload for a known customer sends only the phone, the chosen pet, cage and note', () => {
  const payload = walkIn.buildWalkInPayload({
    phone: '0988111222',
    isNewCustomer: false,
    fullName: 'Không được gửi',
    email: 'khong@guiduoc.vn',
    petMode: 'existing',
    petId: ` ${PET} `,
    petInfo: { name: 'Bỏ qua' },
    services: [{ serviceId: SVC_EXAM }],
    cageId: CAGE,
    note: ' Tái khám ',
  });

  assert.deepEqual(payload, {
    phone: '0988111222',
    petId: PET,
    services: [{ serviceId: SVC_EXAM, isEmergency: false }],
    cageId: CAGE,
    note: 'Tái khám',
  });
  // The BE fills in today (Vietnam time) for a walk-in
  assert.equal('date' in payload, false);
});

test('findDuplicateServiceRows flags each repeat of a service, not its first row', () => {
  assert.deepEqual(
    walkIn.findDuplicateServiceRows([
      { serviceId: SVC_EXAM },
      { serviceId: SVC_SPA },
      { serviceId: SVC_EXAM },
      {},
      { serviceId: ` ${SVC_SPA} ` },
    ]),
    [2, 4]
  );
  assert.deepEqual(walkIn.findDuplicateServiceRows(undefined), []);
});

test('toWalkInFieldPath maps BE error keys onto the form fields', () => {
  assert.deepEqual(walkIn.toWalkInFieldPath('phone'), ['phone']);
  assert.deepEqual(walkIn.toWalkInFieldPath('petInfo.name'), [
    'petInfo',
    'name',
  ]);
  assert.deepEqual(walkIn.toWalkInFieldPath('petInfo.dob'), ['petInfo', 'dob']);
  assert.deepEqual(walkIn.toWalkInFieldPath('services[1].assignedStaffId'), [
    'services',
    1,
    'assignedStaffId',
  ]);
  // Errors about the whole request have no field and are listed in the alert
  for (const key of ['pet', 'services', 'services[0]', 'body', 'petInfo']) {
    assert.equal(walkIn.toWalkInFieldPath(key), null, key);
  }
});

test('walk-in display helpers', () => {
  assert.equal(
    walkIn.describeWalkInPet({ species: 'Chó', breed: 'Poodle', weight: 4.5 }),
    'Chó · Poodle · 4.5 kg'
  );
  assert.equal(
    walkIn.describeWalkInPet({ species: null, breed: null, weight: null }),
    'Chưa có thông tin loài, giống'
  );
  assert.equal(
    walkIn.getWalkInCustomerStatus('Inactive').label,
    'Chưa kích hoạt'
  );
  assert.equal(walkIn.getWalkInCustomerStatus('Active').label, 'Hoạt động');
  assert.equal(walkIn.getWalkInCustomerStatus(undefined).label, 'Chưa rõ');
});

test('grooming goes to a groomer, every other category to a veterinarian', () => {
  assert.equal(staff.getRequiredStaffRole('Grooming'), 'Groomer');
  for (const category of [
    'Examination',
    'Vaccination',
    'Paraclinical',
    'Inpatient',
    undefined,
  ]) {
    assert.equal(
      staff.getRequiredStaffRole(category),
      'Veterinarian',
      category
    );
  }
});

test('buildStaffQuery keeps only the parameters the BE accepts', () => {
  assert.deepEqual(
    staff.buildStaffQuery({
      role: 'Groomer',
      status: 'Active',
      search: '  an ',
      page: 2,
      limit: 100,
    }),
    { role: 'Groomer', status: 'Active', search: 'an', page: 2, limit: 100 }
  );
  assert.deepEqual(
    staff.buildStaffQuery({
      role: 'Admin',
      status: 'Deleted',
      search: '   ',
      page: 1.5,
      limit: 101,
    }),
    {}
  );
  assert.deepEqual(staff.buildStaffQuery(undefined), {});
});

test('getAssignableStaff keeps active staff of the needed role only', () => {
  const list = [
    {
      _id: VET,
      code: 'VET001',
      fullName: 'BS An',
      role: 'Veterinarian',
      status: 'Active',
    },
    {
      _id: VET_2,
      code: 'VET002',
      fullName: 'BS Bình',
      role: 'Veterinarian',
      status: 'Locked',
    },
    {
      _id: SVC_SPA,
      code: 'GRM001',
      fullName: 'Chi',
      role: 'Groomer',
      status: 'Active',
    },
  ];
  assert.deepEqual(
    staff.getAssignableStaff(list, 'Veterinarian').map(s => s.code),
    ['VET001']
  );
  assert.deepEqual(staff.getAssignableStaff(null, 'Groomer'), []);
  assert.equal(staff.formatStaffOption(list[0]), 'BS An (VET001)');
});

test('staff assignment is blocked once the appointment or the service is closed', () => {
  for (const orderStatus of ['Done', 'Cancelled', 'Overdue']) {
    assert.ok(
      orderServices.getAssignStaffBlockReason('Booked', orderStatus),
      orderStatus
    );
  }
  for (const serviceStatus of ['InProgress', 'Done', 'Cancelled', 'Overdue']) {
    assert.ok(
      orderServices.getAssignStaffBlockReason(serviceStatus, 'CheckedIn'),
      serviceStatus
    );
  }
  for (const [serviceStatus, orderStatus] of [
    ['Booked', 'Booked'],
    ['Booked', 'CheckedIn'],
    ['Waiting', 'CheckedIn'],
    ['Waiting', 'InProgress'],
  ]) {
    assert.equal(
      orderServices.getAssignStaffBlockReason(serviceStatus, orderStatus),
      undefined,
      `${serviceStatus}/${orderStatus}`
    );
  }
});

test('only a checked-in or in-progress appointment queues a service on assignment', () => {
  assert.equal(orderServices.isQueueingOrder('CheckedIn'), true);
  assert.equal(orderServices.isQueueingOrder('InProgress'), true);
  for (const status of ['Booked', 'Done', 'Cancelled', 'Overdue', undefined]) {
    assert.equal(orderServices.isQueueingOrder(status), false, status);
  }
});

test('canSubmitAssignment needs a person other than the one already assigned', () => {
  const waiting = {
    status: 'Waiting',
    assignedStaffId: { _id: VET, fullName: 'BS An' },
  };
  assert.equal(
    orderServices.canSubmitAssignment(waiting, 'CheckedIn', undefined),
    false
  );
  // Re-sending the same person would only push the service to the back of the queue
  assert.equal(
    orderServices.canSubmitAssignment(waiting, 'CheckedIn', VET),
    false
  );
  assert.equal(
    orderServices.canSubmitAssignment(waiting, 'CheckedIn', VET_2),
    true
  );
  assert.equal(
    orderServices.canSubmitAssignment(
      { status: 'Booked', assignedStaffId: VET },
      'Booked',
      VET
    ),
    false
  );
  assert.equal(
    orderServices.canSubmitAssignment(
      { status: 'Booked', assignedStaffId: null },
      'Booked',
      VET
    ),
    true
  );
  assert.equal(
    orderServices.canSubmitAssignment(waiting, 'Done', VET_2),
    false
  );
});

test('getStaffRefId and getServiceRefCategory read populated and raw refs', () => {
  assert.equal(orderServices.getStaffRefId(VET), VET);
  assert.equal(
    orderServices.getStaffRefId({ _id: VET, fullName: 'BS An' }),
    VET
  );
  assert.equal(orderServices.getStaffRefId(null), undefined);
  assert.equal(
    orderServices.getServiceRefCategory({
      _id: SVC_SPA,
      name: 'Tắm',
      category: 'Grooming',
    }),
    'Grooming'
  );
  assert.equal(orderServices.getServiceRefCategory(SVC_SPA), undefined);
});
