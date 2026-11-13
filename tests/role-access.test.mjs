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

test('each role has its own working page', () => {
  assert.equal(access.getLandingPath('PetOwner'), '/dashboard');
  assert.equal(access.getLandingPath('Admin'), '/admin/users');
  // Clinic staff work on reception (SCR-16, SCR-18) and the work queue of
  // vets and groomers (SCR-22, SCR-26)
  assert.equal(access.getLandingPath('Receptionist'), '/clinic/appointments');
  assert.equal(access.getLandingPath('receptionist'), '/clinic/appointments');
  for (const role of ['Veterinarian', 'Groomer', 'groomer']) {
    assert.equal(access.getLandingPath(role), '/clinic/my-queue', role);
  }
  assert.equal(access.getLandingPath(undefined), '/dashboard');
});

test('"Đặt lịch khám" opens the booking form of the roles that can book', () => {
  assert.equal(
    access.getBookingPath('PetOwner'),
    '/dashboard?tab=appointments&book=new'
  );
  // LoginForm falls back to 'user' when the BE sends no role
  assert.equal(
    access.getBookingPath('user'),
    '/dashboard?tab=appointments&book=new'
  );
  assert.equal(
    access.getBookingPath('receptionist'),
    '/clinic/appointments?walkin=new'
  );
  for (const role of ['Admin', 'Veterinarian', 'Groomer']) {
    assert.equal(access.getBookingPath(role), undefined, role);
  }
});

test('only Admin, Receptionist and Veterinarian start on their working page after login', () => {
  assert.equal(access.getPostLoginPath('Admin'), '/admin/users');
  assert.equal(access.getPostLoginPath('receptionist'), '/clinic/appointments');
  assert.equal(access.getPostLoginPath('Veterinarian'), '/clinic/my-queue');
  // Pet owners, groomers and an unknown role (LoginForm falls back to 'user') start on the home page
  for (const role of ['PetOwner', 'Groomer', 'user', undefined]) {
    assert.equal(access.getPostLoginPath(role), '/', String(role));
  }
});

test('the landing link is named after the page it opens', () => {
  assert.equal(access.getLandingLabel('PetOwner'), 'Bảng điều khiển');
  assert.equal(access.getLandingLabel('Admin'), 'Trang quản trị');
  assert.equal(access.getLandingLabel('Receptionist'), 'Tiếp nhận lịch hẹn');
  assert.equal(access.getLandingLabel('Veterinarian'), 'Hàng đợi khám');
  assert.equal(access.getLandingLabel('Groomer'), 'Hàng đợi spa');
});
