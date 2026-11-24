import test from 'node:test';
import assert from 'node:assert/strict';

test('getRoleLabel maps known roles to Vietnamese display names', async () => {
  const rolesModule = await import('../src/constants/roles.ts');
  const { getRoleLabel, USER_ROLE_LABELS } = rolesModule;

  assert.equal(USER_ROLE_LABELS.Admin, 'Quản trị viên');
  assert.equal(USER_ROLE_LABELS.Veterinarian, 'Bác sĩ thú y');
  assert.equal(USER_ROLE_LABELS.Receptionist, 'Lễ tân');
  // 24/11: the Groomer role reads "Nhân viên spa" everywhere
  assert.equal(USER_ROLE_LABELS.Groomer, 'Nhân viên spa');
  assert.equal(USER_ROLE_LABELS.PetOwner, 'Khách hàng');

  assert.equal(getRoleLabel('Admin'), 'Quản trị viên');
  assert.equal(getRoleLabel('admin'), 'Quản trị viên');
  assert.equal(getRoleLabel('Veterinarian'), 'Bác sĩ thú y');
  assert.equal(getRoleLabel('Receptionist'), 'Lễ tân');
  assert.equal(getRoleLabel('Groomer'), 'Nhân viên spa');
  assert.equal(getRoleLabel('groomer'), 'Nhân viên spa');
  assert.equal(getRoleLabel('PetOwner'), 'Khách hàng');
  assert.equal(getRoleLabel(undefined), 'Khách hàng');
  assert.equal(getRoleLabel('CustomRole'), 'CustomRole');
});
