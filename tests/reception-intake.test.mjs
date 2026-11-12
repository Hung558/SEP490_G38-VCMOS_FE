import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCheckInPayload,
  readReceptionIntake,
  RECEPTION_INTAKE_FIELD_LIMIT,
} from '../src/services/AppointmentOrderService/intake.ts';
import { pickSpecialtyAssignment } from '../src/services/StaffService/specialty.ts';

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
