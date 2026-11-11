import test from 'node:test';
import assert from 'node:assert/strict';

const helpers = await import('../src/services/AppointmentOrderService/helpers.ts');
const urls = await import('../src/services/AppointmentOrderService/urls.ts');

test('AppointmentOrderService urls match backend endpoints', () => {
  assert.equal(urls.apiOnlineBooking, '/appointment-orders/online');
  assert.equal(urls.apiMyBookings, '/appointment-orders/me');
  assert.equal(urls.apiMyBookingDetail('apt123'), '/appointment-orders/me/apt123');
  assert.equal(urls.apiCancelAppointment('apt123'), '/appointment-orders/apt123/cancel');
});

test('Appointment statuses match backend contract', () => {
  assert.deepEqual(helpers.APPOINTMENT_STATUSES, [
    'Booked',
    'CheckedIn',
    'InProgress',
    'WaitOwner',
    'Done',
    'Cancelled',
    'Overdue',
  ]);
});

test('getAppointmentStatusLabel maps known statuses to Vietnamese labels', () => {
  assert.equal(helpers.getAppointmentStatusLabel('Booked'), 'Đã đặt');
  assert.equal(helpers.getAppointmentStatusLabel('CheckedIn'), 'Đã tiếp nhận');
  assert.equal(helpers.getAppointmentStatusLabel('InProgress'), 'Đang thực hiện');
  assert.equal(helpers.getAppointmentStatusLabel('WaitOwner'), 'Chờ chủ đón');
  assert.equal(helpers.getAppointmentStatusLabel('Done'), 'Hoàn tất');
  assert.equal(helpers.getAppointmentStatusLabel('Cancelled'), 'Đã hủy');
  assert.equal(helpers.getAppointmentStatusLabel('Overdue'), 'Quá hạn');
  assert.equal(helpers.getAppointmentStatusLabel('Unknown'), 'Unknown');
  assert.equal(helpers.getAppointmentStatusLabel(undefined), 'Không xác định');
});

test('getAppointmentStatusColor maps statuses to AntD tag colors', () => {
  assert.equal(helpers.getAppointmentStatusColor('Booked'), 'blue');
  assert.equal(helpers.getAppointmentStatusColor('CheckedIn'), 'cyan');
  assert.equal(helpers.getAppointmentStatusColor('InProgress'), 'orange');
  assert.equal(helpers.getAppointmentStatusColor('WaitOwner'), 'purple');
  assert.equal(helpers.getAppointmentStatusColor('Done'), 'green');
  assert.equal(helpers.getAppointmentStatusColor('Cancelled'), 'red');
  assert.equal(helpers.getAppointmentStatusColor('Overdue'), 'default');
  assert.equal(helpers.getAppointmentStatusColor('Unknown'), 'default');
});

test('validateBookingDate validates YYYY-MM-DD, calendar truth, and past dates', () => {
  assert.match(helpers.validateBookingDate(''), /bắt buộc/);
  assert.match(helpers.validateBookingDate('   '), /bắt buộc/);
  assert.match(helpers.validateBookingDate(undefined), /bắt buộc/);
  assert.match(helpers.validateBookingDate('2026/12/01'), /đúng định dạng/);
  assert.match(helpers.validateBookingDate('invalid-date'), /đúng định dạng/);
  assert.match(helpers.validateBookingDate('2026-02-31'), /hợp lệ/);
  assert.match(helpers.validateBookingDate('2020-01-01'), /quá khứ/);

  // Future valid date should pass
  assert.equal(helpers.validateBookingDate('2099-12-31'), undefined);

  // Today in Vietnam should pass
  const today = helpers.getVietnamTodayString();
  assert.equal(helpers.validateBookingDate(today), undefined);
});

test('validateBookingNote allows empty note and caps length at 500', () => {
  assert.equal(helpers.validateBookingNote(undefined), undefined);
  assert.equal(helpers.validateBookingNote(''), undefined);
  assert.equal(helpers.validateBookingNote('   '), undefined);
  assert.equal(helpers.validateBookingNote('Khám tổng quát'), undefined);
  assert.equal(helpers.validateBookingNote('a'.repeat(500)), undefined);
  assert.match(helpers.validateBookingNote('a'.repeat(501)), /tối đa 500/);
  assert.match(helpers.validateBookingNote(12345), /phải là chuỗi/);
});

test('validateBookingPetId requires 24-hex MongoId', () => {
  assert.match(helpers.validateBookingPetId(''), /chọn thú cưng/);
  assert.match(helpers.validateBookingPetId(undefined), /chọn thú cưng/);
  assert.match(helpers.validateBookingPetId('invalid-pet-id'), /không hợp lệ/);
  assert.match(helpers.validateBookingPetId('6ad96d4a9664da6b2c0d8d7'), /không hợp lệ/); // 23 chars
  assert.equal(helpers.validateBookingPetId('6ad96d4a9664da6b2c0d8d70'), undefined);
});

test('buildBookingPayload trims fields and omits empty note', () => {
  const p1 = helpers.buildBookingPayload({
    petId: '  6ad96d4a9664da6b2c0d8d70  ',
    date: '  2026-11-20  ',
    note: '   ',
  });
  assert.deepEqual(p1, {
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-11-20',
  });

  const p2 = helpers.buildBookingPayload({
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-11-20',
    slotStart: ' 09:30 ',
    note: '  Khám định kỳ  ',
  });
  assert.deepEqual(p2, {
    petId: '6ad96d4a9664da6b2c0d8d70',
    date: '2026-11-20',
    slotStart: '09:30',
    note: 'Khám định kỳ',
  });
});

test('buildBookingFilterQuery builds valid query and drops empty parameters', () => {
  const q1 = helpers.buildBookingFilterQuery({
    status: 'Booked',
    from: '2026-11-01',
    to: '2026-11-30',
    page: 2,
    limit: 20,
  });
  assert.deepEqual(q1, {
    status: 'Booked',
    from: '2026-11-01',
    to: '2026-11-30',
    page: 2,
    limit: 20,
  });

  const q2 = helpers.buildBookingFilterQuery({
    status: undefined,
    from: '',
    to: '   ',
  });
  assert.deepEqual(q2, {});
});

test('extractApiError extracts status, message, and fieldErrors', () => {
  const errWithFields = {
    response: {
      status: 400,
      data: {
        message: 'Dữ liệu không hợp lệ',
        errors: [
          { field: 'petId', message: 'petId không hợp lệ' },
          { field: 'date', message: 'Ngày hẹn không được ở trong quá khứ' },
        ],
      },
    },
  };
  const res1 = helpers.extractApiError(errWithFields);
  assert.equal(res1.status, 400);
  assert.equal(res1.message, 'Dữ liệu không hợp lệ');
  assert.equal(res1.fieldErrors.petId, 'petId không hợp lệ');
  assert.equal(res1.fieldErrors.date, 'Ngày hẹn không được ở trong quá khứ');

  const fallbackRes = helpers.extractApiError(new Error('Network disconnected'), 'Lỗi mạng');
  assert.equal(fallbackRes.message, 'Network disconnected');
  assert.deepEqual(fallbackRes.fieldErrors, {});
});

