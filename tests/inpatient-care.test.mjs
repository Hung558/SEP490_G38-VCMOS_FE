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

test('admission availability explains free holding cages instead of claiming all cages are full', async () => {
  const { getInpatientCageAvailability } = await import(
    '../src/services/InpatientRecordService/helpers.ts'
  );
  const result = getInpatientCageAvailability(
    [
      {
        _id: 'holding',
        label: 'Khu chờ A-01',
        zone: 'Holding',
        status: 'Available',
      },
      { _id: 'legacy', label: 'Nội trú A-02', status: 'Available' },
      {
        _id: 'busy',
        label: 'Nội trú A-03',
        zone: 'InpatientWard',
        status: 'Occupied',
      },
    ],
    8
  );
  assert.equal(result.availableCount, 2);
  assert.equal(result.wardCount, 0);
  assert.equal(result.holdingCount, 1);
  assert.equal(result.unclassifiedCount, 1);
  assert.deepEqual(result.choices, []);
  assert.match(result.emptyMessage, /khu nội trú/);
  assert.match(result.description, /1 chuồng khu chờ/);
  assert.match(result.description, /1 chuồng chưa xác định khu vực/);
});

test('admission explains weight rejection but keeps equal, unlimited and isolated ward cages', async () => {
  const { getInpatientCageAvailability } = await import(
    '../src/services/InpatientRecordService/helpers.ts'
  );
  const cage = {
    _id: 'ward',
    label: 'Nội trú B-01',
    zone: 'InpatientWard',
    status: 'Available',
    maxWeightKg: 7,
  };
  const rejected = getInpatientCageAvailability([cage], 8);
  assert.equal(rejected.wardCount, 1);
  assert.equal(rejected.overweightCount, 1);
  assert.match(rejected.emptyMessage, /tải trọng/);
  assert.match(rejected.description, /8 kg/);
  assert.equal(getInpatientCageAvailability([cage], 7).choices.length, 1);
  assert.equal(
    getInpatientCageAvailability(
      [{ ...cage, maxWeightKg: null, isIsolated: true }],
      40
    ).choices.length,
    1
  );
  assert.equal(getInpatientCageAvailability([cage], null).choices.length, 1);
  assert.match(
    getInpatientCageAvailability([], 8).emptyMessage,
    /Chưa có chuồng trống/
  );
  assert.equal(getInpatientCageAvailability([cage], 7).emptyMessage, undefined);
});
