import test from 'node:test';
import assert from 'node:assert/strict';

const medicalUrls = await import(
  '../src/services/MedicalRecordService/urls.ts'
);
const medical = await import('../src/services/MedicalRecordService/helpers.ts');
const orderServiceUrls = await import(
  '../src/services/AppointmentServiceService/urls.ts'
);
const orderServices = await import(
  '../src/services/AppointmentServiceService/helpers.ts'
);
const cageAssignmentUrls = await import(
  '../src/services/CageAssignmentService/urls.ts'
);
const cages = await import('../src/services/CageService/helpers.ts');
const staff = await import('../src/services/StaffService/helpers.ts');
const blocked = await import('../src/services/01_axios/blockedAccount.ts');
const dashboardTabs = await import('../src/pages/Dashboard/dashboardTabs.ts');

const SVC = '6ad96d4a9664da6b2c0d8e01';
const PET = '6ad96d4a9664da6b2c0d8d70';
const ORDER = '6ad96d4a9664da6b2c0d8d65';
const PRODUCT = '6ae887e0730397f27ee389f2';
const VET = '6ad96d4a9664da6b2c0d8d61';

test('medical record, queue and cage URLs match the BE routes', () => {
  assert.equal(
    medicalUrls.apiMedicalRecordByService(SVC),
    `/medical-records/service/${SVC}`
  );
  assert.equal(
    medicalUrls.apiStartConsultation(SVC),
    `/medical-records/service/${SVC}/start`
  );
  assert.equal(
    medicalUrls.apiCompleteConsultation(SVC),
    `/medical-records/service/${SVC}/complete`
  );
  assert.equal(
    medicalUrls.apiPetMedicalHistory(PET),
    `/medical-records/pet/${PET}`
  );
  assert.equal(orderServiceUrls.apiMyQueue, '/appointment-services/my-queue');
  assert.equal(
    cageAssignmentUrls.apiCageAssignmentByOrder(ORDER),
    `/cage-assignments/order/${ORDER}`
  );
  assert.equal(
    cageAssignmentUrls.apiReleaseCageAssignment(ORDER),
    `/cage-assignments/${ORDER}/release`
  );
});

test('buildMedicalRecordPayload sends every SOAP field and the prescriptions, trimmed', () => {
  const payload = medical.buildMedicalRecordPayload({
    subjectiveNote: '  Bé gãi tai  ',
    objectiveNote: '',
    assessment: undefined,
    plan: ' Kháng sinh 5 ngày ',
    notes: '   ',
    weight: 8.8,
    prescriptions: [
      {
        productId: ` ${PRODUCT} `,
        dosage: ' 1 viên ',
        frequency: '2 lần/ngày',
        instructions: '  ',
        durationDays: 5,
      },
      { productId: '', dosage: 'bỏ qua', frequency: 'x', durationDays: 1 },
    ],
  });
  assert.deepEqual(payload, {
    subjectiveNote: 'Bé gãi tai',
    objectiveNote: '',
    assessment: '',
    plan: 'Kháng sinh 5 ngày',
    notes: '',
    weight: 8.8,
    prescriptions: [
      {
        productId: PRODUCT,
        dosage: '1 viên',
        frequency: '2 lần/ngày',
        durationDays: 5,
      },
    ],
  });
  // No weight typed: the pet's weight is left alone; an empty list clears the prescriptions
  const empty = medical.buildMedicalRecordPayload({ weight: null });
  assert.equal('weight' in empty, false);
  assert.deepEqual(empty.prescriptions, []);
});

test('findMissingSoapFields lists the empty parts of S-O-A-P (BR-13)', () => {
  assert.deepEqual(
    medical.findMissingSoapFields({
      subjectiveNote: 'S',
      objectiveNote: '  ',
      plan: 'P',
    }),
    ['objectiveNote', 'assessment']
  );
  assert.deepEqual(
    medical.findMissingSoapFields({
      subjectiveNote: 'S',
      objectiveNote: 'O',
      assessment: 'A',
      plan: 'P',
    }),
    []
  );
});

test('toMedicalRecordFieldPath maps BE error keys onto the SOAP form', () => {
  assert.deepEqual(medical.toMedicalRecordFieldPath('plan'), ['plan']);
  assert.deepEqual(medical.toMedicalRecordFieldPath('weight'), ['weight']);
  assert.deepEqual(
    medical.toMedicalRecordFieldPath('prescriptions[2].dosage'),
    ['prescriptions', 2, 'dosage']
  );
  for (const key of [
    'prescriptions',
    'prescriptions[0]',
    'waitingCageId',
    'id',
  ]) {
    assert.equal(medical.toMedicalRecordFieldPath(key), null, key);
  }
});

test('a record is read-only only once Finalized (BR-14), not after the exam is completed', () => {
  assert.equal(medical.isMedicalRecordLocked({ status: 'Finalized' }), true);
  assert.equal(medical.isMedicalRecordLocked({ status: 'Draft' }), false);
  assert.equal(medical.isMedicalRecordLocked(null), false);
  assert.equal(medical.getMedicalRecordStatus('Draft').label, 'Bản nháp');
  assert.equal(medical.getMedicalRecordStatus('Finalized').label, 'Đã khóa');
});

test('recordToFormValues fills the form from a saved record and the pet weight', () => {
  assert.deepEqual(
    medical.recordToFormValues(
      {
        subjectiveNote: 'S',
        objectiveNote: 'O',
        assessment: undefined,
        plan: 'P',
        notes: undefined,
        prescriptions: [
          {
            productId: PRODUCT,
            dosage: '1 viên',
            frequency: '2 lần',
            durationDays: 5,
          },
        ],
      },
      4.2
    ),
    {
      subjectiveNote: 'S',
      objectiveNote: 'O',
      assessment: '',
      plan: 'P',
      notes: '',
      weight: 4.2,
      prescriptions: [
        {
          productId: PRODUCT,
          dosage: '1 viên',
          frequency: '2 lần',
          instructions: '',
          durationDays: 5,
        },
      ],
    }
  );
  assert.equal(medical.recordToFormValues(null, undefined).weight, null);
});

test('record display helpers', () => {
  assert.equal(
    medical.formatPrescription({
      productId: PRODUCT,
      productNameSnapshot: 'Amoxicillin 500mg',
      unitSnapshot: 'viên',
      dosage: '1 viên',
      frequency: '2 lần/ngày',
      durationDays: 5,
    }),
    'Amoxicillin 500mg (viên) · 1 viên · 2 lần/ngày · 5 ngày'
  );
  assert.equal(medical.isMedicalServiceCategory('Examination'), true);
  assert.equal(medical.isMedicalServiceCategory('Grooming'), false);
  assert.equal(medical.isMedicalServiceCategory(undefined), false);

  const record = {
    createdAt: '2026-11-10T03:00:00.000Z',
    appointmentServiceId: {
      _id: SVC,
      serviceId: { _id: 'x', name: 'Khám tổng quát' },
      assignedStaffId: { _id: VET, fullName: 'BS An' },
      orderId: { _id: ORDER, code: 'APT-K7M2QX', date: '2026-11-09' },
    },
  };
  assert.equal(medical.getRecordServiceName(record), 'Khám tổng quát');
  assert.equal(medical.getRecordDoctorName(record), 'BS An');
  assert.equal(medical.getRecordOrderCode(record), 'APT-K7M2QX');
  assert.equal(medical.getRecordVisitDate(record), '2026-11-09');
  assert.equal(
    medical.getRecordVisitDate({
      appointmentServiceId: SVC,
      createdAt: '2026-11-10T03:00:00.000Z',
    }),
    '2026-11-10'
  );
});

const queueItem = (status, date, category = 'Examination', extra = {}) => ({
  status,
  serviceId: { _id: SVC, name: 'Dịch vụ', category },
  orderId: { _id: ORDER, code: 'APT-AAAAAA', date, petId: PET },
  ...extra,
});

test('the work queue filters by status group and by today', () => {
  const items = [
    queueItem('Waiting', '2026-11-10'),
    queueItem('InProgress', '2026-11-10'),
    queueItem('Booked', '2026-11-10'),
    queueItem('Done', '2026-11-09'),
    queueItem('Waiting', '2026-11-11'),
  ];
  const today = '2026-11-10';
  assert.equal(
    orderServices.filterMyQueue(items, 'active', true, today).length,
    2
  );
  assert.equal(
    orderServices.filterMyQueue(items, 'active', false, today).length,
    3
  );
  assert.equal(
    orderServices.filterMyQueue(items, 'done', true, today).length,
    0
  );
  assert.equal(
    orderServices.filterMyQueue(items, 'all', false, today).length,
    5
  );
  assert.deepEqual(orderServices.countMyQueue(items, true, today), {
    active: 2,
    booked: 1,
    done: 0,
    all: 3,
  });
  assert.deepEqual(orderServices.filterMyQueue(null, 'all', false, today), []);
});

test('getExamAction: only a veterinarian examines, and only medical services', () => {
  assert.equal(
    orderServices.getExamAction(queueItem('Booked'), 'Veterinarian'),
    'waitCheckIn'
  );
  assert.equal(
    orderServices.getExamAction(queueItem('Waiting'), 'Veterinarian'),
    'start'
  );
  assert.equal(
    orderServices.getExamAction(queueItem('InProgress'), 'Veterinarian'),
    'continue'
  );
  assert.equal(
    orderServices.getExamAction(queueItem('Done'), 'Veterinarian'),
    'view'
  );
  assert.equal(
    orderServices.getExamAction(queueItem('Cancelled'), 'Veterinarian'),
    null
  );
  assert.equal(
    orderServices.getExamAction(queueItem('Waiting'), 'Groomer'),
    null
  );
  assert.equal(
    orderServices.getExamAction(
      queueItem('Waiting', '2026-11-10', 'Grooming'),
      'Veterinarian'
    ),
    null
  );
});

test('canCageHoldPet follows BR-11 like the BE', () => {
  const cage = (size, extra = {}) => ({
    size,
    isIsolated: false,
    zone: 'Holding',
    ...extra,
  });
  assert.equal(cages.canCageHoldPet(cage('S'), 5), true);
  assert.equal(cages.canCageHoldPet(cage('S'), 5.1), false);
  assert.equal(cages.canCageHoldPet(cage('M'), 15), true);
  assert.equal(cages.canCageHoldPet(cage('L'), 30.5), false);
  assert.equal(cages.canCageHoldPet(cage('XL'), 80), true);
  // A cage's own limit wins over its size
  assert.equal(
    cages.canCageHoldPet(cage('XL', { maxWeightKg: 40 }), 45),
    false
  );
  // Unknown weight: only the isolation flag matters
  assert.equal(cages.canCageHoldPet(cage('S'), null), true);
  assert.equal(cages.canCageHoldPet(cage('M', { isIsolated: true }), 4), false);
  assert.equal(
    cages.canCageHoldPet(cage('M', { isIsolated: true }), 4, true),
    true
  );
  assert.equal(
    cages.canCageHoldPet(cage('M', { zone: 'InpatientWard' }), 4),
    false
  );
});

test('staff for a day: scheduled staff first, everyone of that role when nobody is scheduled', () => {
  assert.deepEqual(
    staff.buildStaffQuery({
      status: 'Active',
      workDate: ' 2026-11-10 ',
      limit: 100,
    }),
    { status: 'Active', workDate: '2026-11-10', limit: 100 }
  );
  assert.deepEqual(staff.buildStaffQuery({ workDate: '10/11/2026' }), {});

  const member = (id, role) => ({
    _id: id,
    code: id,
    fullName: id,
    role,
    status: 'Active',
  });
  const all = [
    member('vet1', 'Veterinarian'),
    member('vet2', 'Veterinarian'),
    member('grm1', 'Groomer'),
  ];
  const onDuty = [member('vet2', 'Veterinarian')];
  assert.deepEqual(
    staff
      .pickAssignableStaff(onDuty, all, 'Veterinarian')
      .staff.map(s => s._id),
    ['vet2']
  );
  assert.equal(
    staff.pickAssignableStaff(onDuty, all, 'Veterinarian').onDutyOnly,
    true
  );
  const groomers = staff.pickAssignableStaff(onDuty, all, 'Groomer');
  assert.deepEqual(
    groomers.staff.map(s => s._id),
    ['grm1']
  );
  assert.equal(groomers.onDutyOnly, false);
});

test('a locked or deactivated account ends the session (BE protect, UC-62)', () => {
  assert.equal(
    blocked.isBlockedAccountError(
      403,
      'Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên'
    ),
    true
  );
  assert.equal(
    blocked.isBlockedAccountError(403, 'Tài khoản đã bị khóa'),
    true
  );
  assert.equal(
    blocked.isBlockedAccountError(403, 'Tài khoản đã bị khoá'.normalize('NFD')),
    true
  );
  assert.equal(
    blocked.isBlockedAccountError(403, 'Tài khoản đã ngừng hoạt động'),
    true
  );
  // Any other 403 is a missing permission, the session stays
  assert.equal(blocked.isBlockedAccountError(403, 'Bạn không có quyền'), false);
  assert.equal(
    blocked.isBlockedAccountError(401, 'Tài khoản đã bị khoá'),
    false
  );
  assert.equal(blocked.isBlockedAccountError(403, undefined), false);
});

test('dashboard tabs and the booking link', () => {
  assert.equal(dashboardTabs.parseDashboardTab('appointments'), 'appointments');
  assert.equal(dashboardTabs.parseDashboardTab('ai'), 'ai');
  assert.equal(dashboardTabs.parseDashboardTab('xyz'), 'pets');
  assert.equal(dashboardTabs.parseDashboardTab(null), 'pets');
  assert.equal(
    dashboardTabs.getBookingLink(PET),
    `/dashboard?tab=appointments&book=${PET}`
  );
  assert.equal(
    dashboardTabs.getBookingLink(),
    '/dashboard?tab=appointments&book=new'
  );
});

test('cage weight limits and canCageHoldPet enforce BR-11 for Vet and Groomer waiting cages', () => {
  assert.equal(cages.CAGE_MAX_WEIGHT_BY_SIZE.S, 5);
  assert.equal(cages.CAGE_MAX_WEIGHT_BY_SIZE.M, 15);
  assert.equal(cages.CAGE_MAX_WEIGHT_BY_SIZE.L, 30);
  assert.equal(cages.CAGE_MAX_WEIGHT_BY_SIZE.XL, Infinity);

  // Cages of size S (<= 5kg) cannot accommodate an 8.5kg pet
  const smallCage = { size: 'S', isIsolated: false, zone: 'ExaminationZone' };
  assert.equal(cages.canCageHoldPet(smallCage, 8.5, false), false);
  assert.equal(cages.canCageHoldPet(smallCage, 4.2, false), true);

  // Medium cage (<= 15kg) accommodates 8.5kg
  const mediumCage = { size: 'M', isIsolated: false, zone: 'ExaminationZone' };
  assert.equal(cages.canCageHoldPet(mediumCage, 8.5, false), true);
  assert.equal(cages.canCageHoldPet(mediumCage, 18.0, false), false);
});

test('completion sends the current SOAP values and a cage ID or explicit null', () => {
  const values = {
    subjectiveNote: ' S ',
    objectiveNote: 'O',
    assessment: 'A',
    plan: 'P',
    weight: 8.5,
  };
  const draft = medical.buildMedicalRecordPayload(values);
  const cageId = '6ad96d4a9664da6b2c0d8c01';
  assert.equal(draft.subjectiveNote, 'S');
  assert.equal('waitingCageId' in draft, false);
  assert.deepEqual(medical.buildCompleteMedicalRecordPayload(values), {
    ...draft,
    waitingCageId: null,
  });
  assert.deepEqual(medical.buildCompleteMedicalRecordPayload(values, cageId), {
    ...draft,
    waitingCageId: cageId,
  });
});

test('only unfinished earlier services from the same order block a waiting appointment service', () => {
  const { getPreviousUnfinishedService, getPreviousServiceMessage } =
    orderServices;
  const current = {
    _id: 'target',
    orderId: { _id: ORDER },
    status: 'Waiting',
    sequenceNo: 4,
  };
  const previous = {
    _id: 'earliest',
    orderId: ORDER,
    status: 'InProgress',
    sequenceNo: 1,
    serviceId: { _id: SVC, name: 'Khám tổng quát' },
  };
  const laterBlocker = {
    ...previous,
    _id: 'later',
    sequenceNo: 3,
    status: 'Booked',
  };
  const unrelated = [
    { ...previous, _id: 'other-order', orderId: 'different' },
    { ...previous, _id: 'done', status: 'Done' },
    { ...previous, _id: 'cancelled', status: 'Cancelled', sequenceNo: 2 },
    { ...previous, _id: 'later-in-order', sequenceNo: 5 },
    { ...previous, _id: 'old-record', sequenceNo: undefined },
    current,
  ];
  assert.equal(getPreviousUnfinishedService(current, unrelated), undefined);
  assert.equal(
    getPreviousUnfinishedService(current, [
      laterBlocker,
      ...unrelated,
      previous,
    ]),
    previous
  );
  assert.match(getPreviousServiceMessage(previous), /#1.*Khám tổng quát/);
  assert.equal(
    getPreviousUnfinishedService({ ...current, status: 'InProgress' }, [
      previous,
    ]),
    undefined
  );
  assert.equal(
    getPreviousUnfinishedService({ ...current, orderId: undefined }, [
      previous,
    ]),
    undefined
  );
});
