import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCheckInPayload,
  readReceptionIntake,
  RECEPTION_INTAKE_FIELD_LIMIT,
} from '../src/services/AppointmentOrderService/intake.ts';
import { pickSpecialtyAssignment } from '../src/services/StaffService/specialty.ts';
import {
  buildCheckInRequest,
  isReceptionCageError,
} from '../src/services/AppointmentOrderService/helpers.ts';

test('legacy check-in has no body; intake check-in only sends the two trimmed fields', () => {
  assert.equal(buildCheckInPayload(), undefined);
  assert.deepEqual(
    buildCheckInPayload({
      symptoms: ' Ho nhẹ  ',
      initialCondition: '\n Tỉnh táo \t',
      note: 'Không thuộc phiếu tiếp nhận',
    }),
    { intake: { symptoms: 'Ho nhẹ', initialCondition: 'Tỉnh táo' } }
  );
});

test('intake validation rejects blank, malformed or oversized fields', () => {
  const maxLength = 'a'.repeat(RECEPTION_INTAKE_FIELD_LIMIT);
  for (const malformed of [
    null,
    { symptoms: ' ', initialCondition: 'Tỉnh táo' },
    { symptoms: 'Ho nhẹ' },
    { symptoms: 'Ho nhẹ', initialCondition: 123 },
  ]) {
    assert.throws(() => buildCheckInPayload(malformed));
    assert.equal(readReceptionIntake(malformed), undefined);
  }
  assert.equal(readReceptionIntake(undefined), undefined);
  assert.throws(() =>
    buildCheckInPayload({
      symptoms: 'Ho nhẹ',
      initialCondition: `${maxLength}a`,
    })
  );
  assert.equal(
    buildCheckInPayload({
      symptoms: ` ${maxLength} `,
      initialCondition: 'Tỉnh',
    }).intake.symptoms,
    maxLength
  );
});

test('check-in includes a cage and isolation in the same request without changing intake-only or legacy bodies', () => {
  const cageId = '6ad96d4a9664da6b2c0d9a01';
  const intake = { symptoms: 'Ho nhẹ', initialCondition: 'Tỉnh táo' };
  assert.equal(buildCheckInRequest(), undefined);
  assert.equal(buildCheckInRequest({ requiresIsolation: true }), undefined);
  assert.deepEqual(buildCheckInRequest({ intake }), { intake });
  assert.deepEqual(buildCheckInRequest({ cageId, requiresIsolation: false }), {
    cageId,
  });
  assert.deepEqual(
    buildCheckInRequest({
      intake,
      cageId: ` ${cageId} `,
      requiresIsolation: true,
      staffId: 'ignored',
    }),
    {
      intake,
      cageId,
      requiresIsolation: true,
    }
  );
  assert.throws(() =>
    buildCheckInRequest({ cageId, intake: { symptoms: 'Ho nhẹ' } })
  );
});

test('cage errors are distinct from non-cage order conflicts and general failures', () => {
  assert.equal(
    isReceptionCageError(409, 'Chuồng không ở trạng thái trống (Available)'),
    true
  );
  assert.equal(
    isReceptionCageError(404, 'Không tìm thấy chuồng lưu giữ'),
    true
  );
  assert.equal(
    isReceptionCageError(400, 'Dữ liệu không hợp lệ', {
      requiresIsolation: 'Cờ không hợp lệ',
    }),
    true
  );
  assert.equal(
    isReceptionCageError(
      409,
      'Không thể check-in lịch hẹn đang ở trạng thái "CheckedIn"'
    ),
    false
  );
  assert.equal(
    isReceptionCageError(
      409,
      'Địa chỉ email này đã được sử dụng bởi tài khoản khác'
    ),
    false
  );
  assert.equal(isReceptionCageError(500, 'Lỗi hệ thống khi gán chuồng'), false);
});

const staffMember = (_id, specialty, overrides = {}) => ({
  _id,
  code: _id,
  fullName: _id,
  role: 'Veterinarian',
  status: 'Active',
  specialty,
  ...overrides,
});

test('routing uses real specialties and accepts only active matching veterinarians', () => {
  const active = staffMember('active', '  Da   liễu ');
  const other = staffMember('other', 'Ngoại khoa');
  const duplicate = staffMember('duplicate', 'DA LIỄU');
  const all = [
    active,
    other,
    duplicate,
    staffMember('unknown', null),
    staffMember('disabled', 'Chẩn đoán', { status: 'Inactive' }),
    staffMember('groomer', 'Cắt tỉa', { role: 'Groomer' }),
  ];
  const onDuty = [active, other];
  assert.deepEqual(pickSpecialtyAssignment(onDuty, all).staff, []);
  assert.deepEqual(pickSpecialtyAssignment(onDuty, all).specialties, [
    { value: 'da liễu', label: 'Da liễu' },
    { value: 'ngoại khoa', label: 'Ngoại khoa' },
  ]);
  assert.deepEqual(pickSpecialtyAssignment(onDuty, all, 'da liễu').staff, [
    active,
  ]);
});

test('routing does not substitute a different specialty or an unscheduled vet when vets are on duty', () => {
  const duty = staffMember('duty', 'Ngoại khoa');
  const offDuty = staffMember('offDuty', 'Da liễu');
  const noSpecialty = staffMember('noSpecialty', '   ');
  assert.deepEqual(
    pickSpecialtyAssignment([duty], [duty, offDuty], 'da liễu').staff,
    []
  );
  assert.deepEqual(
    pickSpecialtyAssignment([], [duty, offDuty, noSpecialty], 'da liễu').staff,
    [offDuty]
  );
  assert.deepEqual(pickSpecialtyAssignment([], [duty], 'da liễu').staff, []);
  assert.deepEqual(
    pickSpecialtyAssignment([noSpecialty], [], 'da liễu').specialties,
    []
  );
});
