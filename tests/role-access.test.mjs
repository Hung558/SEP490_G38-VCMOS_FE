import test from 'node:test';
import assert from 'node:assert/strict';

const roles = await import('../src/constants/roles.ts');
const access = await import('../src/routerMap/roleAccess.ts');

test('normalizeRole returns the BE role key whatever the casing', () => {
  assert.equal(roles.normalizeRole('veterinarian'), 'Veterinarian');
  assert.equal(roles.normalizeRole('ADMIN'), 'Admin');
  assert.equal(roles.normalizeRole('PetOwner'), 'PetOwner');
  assert.equal(roles.normalizeRole('user'), '');
  assert.equal(roles.normalizeRole(undefined), '');
});

test('getRoleGroup splits Admin, clinic staff and pet owners', () => {
  assert.equal(roles.getRoleGroup('Admin'), 'admin');
  assert.equal(roles.getRoleGroup('admin'), 'admin');
  for (const role of ['Receptionist', 'Veterinarian', 'Groomer']) {
    assert.equal(roles.getRoleGroup(role), 'staff', role);
  }
  assert.equal(roles.getRoleGroup('PetOwner'), 'owner');
  // LoginForm falls back to 'user' when the BE sends no role
  assert.equal(roles.getRoleGroup('user'), 'owner');
  assert.equal(roles.getRoleGroup(undefined), 'owner');
});

test('each role lands on its own page after login', () => {
  assert.equal(access.getLandingPath('PetOwner'), '/dashboard');
  assert.equal(access.getLandingPath('Admin'), '/admin/users');
  // Clinic staff start on their working page: reception (SCR-16, SCR-18) and
  // the work queue of vets and groomers (SCR-22, SCR-26)
  assert.equal(access.getLandingPath('Receptionist'), '/clinic/appointments');
  assert.equal(access.getLandingPath('receptionist'), '/clinic/appointments');
  for (const role of ['Veterinarian', 'Groomer', 'groomer']) {
    assert.equal(access.getLandingPath(role), '/clinic/my-queue', role);
  }
  assert.equal(access.getLandingPath(undefined), '/dashboard');
});

test('the landing link is named after the page it opens', () => {
  assert.equal(access.getLandingLabel('PetOwner'), 'Bảng điều khiển');
  assert.equal(access.getLandingLabel('Admin'), 'Trang quản trị');
  assert.equal(access.getLandingLabel('Receptionist'), 'Tiếp nhận lịch hẹn');
  assert.equal(access.getLandingLabel('Veterinarian'), 'Hàng đợi khám');
  assert.equal(access.getLandingLabel('Groomer'), 'Hàng đợi spa');
});
