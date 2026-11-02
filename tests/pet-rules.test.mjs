import test from 'node:test';
import assert from 'node:assert/strict';

const pet = await import('../src/constants/pet.ts');
const MB = 1024 * 1024;

test('pet weight is optional but must be 0.1–100 kg when given', () => {
  for (const ok of [0.1, 4.5, 100, null, undefined]) {
    assert.equal(pet.isValidPetWeight(ok), true, `weight ${ok}`);
  }
  for (const bad of [0, 0.09, -1, 100.1, 500, Number.NaN]) {
    assert.equal(pet.isValidPetWeight(bad), false, `weight ${bad}`);
  }
  assert.equal(pet.MSG_PET_WEIGHT, 'Cân nặng phải từ 0.1 đến 100 kg.');
});

test('pet photo accepts only JPG or PNG up to 5 MB (MSG35)', () => {
  assert.equal(pet.isValidPetPhoto({ type: 'image/jpeg', size: MB }), true);
  assert.equal(pet.isValidPetPhoto({ type: 'image/png', size: 5 * MB }), true);
  assert.equal(
    pet.isValidPetPhoto({ type: 'image/png', size: 5 * MB + 1 }),
    false
  );
  assert.equal(pet.isValidPetPhoto({ type: 'image/webp', size: MB }), false);
  assert.equal(pet.isValidPetPhoto({ type: 'image/gif', size: MB }), false);
  assert.equal(
    pet.MSG_INVALID_PHOTO,
    'Chỉ chấp nhận file JPG hoặc PNG, tối đa 5 MB.'
  );
});

test('pet name and notes limits follow the SRS', () => {
  assert.equal(pet.PET_NAME_MAX_LENGTH, 50);
  assert.equal(pet.PET_NOTES_MAX_LENGTH, 500);
  assert.deepEqual(pet.PET_PHOTO_TYPES, ['image/jpeg', 'image/png']);
});
