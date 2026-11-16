import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAdmitFromExam,
  canUseInpatientCage,
  clinicDate,
} from '../src/services/InpatientRecordService/helpers.ts';

test('admission does not compete with automatic release on a pending service', () => {
  assert.equal(canAdmitFromExam('Done', 'WaitOwner'), true);
  assert.equal(canAdmitFromExam('InProgress', 'InProgress'), false);
  assert.equal(canAdmitFromExam('Done', 'InProgress'), false);
  assert.equal(canAdmitFromExam('Done', 'Cancelled'), false);
  assert.equal(canAdmitFromExam('Done', undefined), false);
});

test('only available ward cages with acceptable known weight can admit a pet', () => {
  const ward = { zone: 'InpatientWard', status: 'Available', maxWeightKg: 15 };
  assert.equal(canUseInpatientCage(ward, 15), true);
  assert.equal(canUseInpatientCage(ward, 15.01), false);
  assert.equal(canUseInpatientCage(ward), true);
  assert.equal(canUseInpatientCage({ ...ward, maxWeightKg: null }, 30), true);
  assert.equal(canUseInpatientCage({ ...ward, status: 'Occupied' }), false);
  assert.equal(canUseInpatientCage({ ...ward, zone: 'Holding' }), false);
  assert.equal(canUseInpatientCage({ ...ward, zone: undefined }), false);
});

test('log dates roll over at Vietnam midnight, not browser midnight', () => {
  assert.equal(clinicDate('2026-11-15T16:59:59Z'), '2026-11-15');
  assert.equal(clinicDate('2026-11-15T17:00:00Z'), '2026-11-16');
  assert.equal(clinicDate('not a date'), '');
});
