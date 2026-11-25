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
  assert.equal(access.getLandingPath('Admin'), '/admin/reports');
  // Clinic staff work on reception (SCR-16, SCR-18) and the work queue of
  // vets and groomers (SCR-22, SCR-26)
  assert.equal(access.getLandingPath('Receptionist'), '/clinic/dashboard');
  assert.equal(access.getLandingPath('receptionist'), '/clinic/dashboard');
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

test('"Đặt dịch vụ này" pre-selects the service in the owner booking form', () => {
  assert.equal(
    access.getBookingPath('PetOwner', '665f1c2a9b1e8a0012345678'),
    '/dashboard?tab=appointments&book=new&service=665f1c2a9b1e8a0012345678'
  );
  // The walk-in form has no pre-selected service
  assert.equal(
    access.getBookingPath('Receptionist', '665f1c2a9b1e8a0012345678'),
    '/clinic/appointments?walkin=new'
  );
});

test('all authenticated roles start on their working page after login', () => {
  assert.equal(access.getPostLoginPath('Admin'), '/admin/reports');
  assert.equal(access.getPostLoginPath('receptionist'), '/clinic/dashboard');
  assert.equal(access.getPostLoginPath('Veterinarian'), '/clinic/my-queue');
  // 24/11: the spa staff go straight to "Hàng đợi spa" too
  assert.equal(access.getPostLoginPath('Groomer'), '/clinic/my-queue');
  // Owner and legacy role fallback both start in the owner dashboard
  for (const role of ['PetOwner', 'petowner', 'user', undefined]) {
    assert.equal(access.getPostLoginPath(role), '/dashboard', String(role));
  }
});

test('the landing link is named after the page it opens', () => {
  assert.equal(access.getLandingLabel('PetOwner'), 'Bảng điều khiển');
  assert.equal(access.getLandingLabel('Admin'), 'Tổng quan quản trị');
  assert.equal(access.getLandingLabel('Receptionist'), 'Tổng quan lễ tân');
  assert.equal(access.getLandingLabel('Veterinarian'), 'Hàng đợi khám');
  assert.equal(access.getLandingLabel('Groomer'), 'Hàng đợi spa');
});

test('only a signed-in PetOwner can also visit the homepage', () => {
  assert.equal(access.canVisitHomepage('PetOwner'), true);
  assert.equal(access.canVisitHomepage('petowner'), true);
  for (const role of ['Receptionist', 'Veterinarian', 'Groomer', 'Admin', undefined]) {
    assert.equal(access.canVisitHomepage(role), false, role);
  }
});

test('community sidebar belongs to owners and receptionists', () => {
  for (const role of ['PetOwner', 'Receptionist', 'receptionist']) {
    assert.equal(access.usesCommunitySidebar(role), true, role);
  }
  for (const role of ['Veterinarian', 'Groomer', 'Admin', undefined]) {
    assert.equal(access.usesCommunitySidebar(role), false, role);
  }
});

test('sidebar selects the journey tab and community detail consistently', async () => {
  const { getSidebarSelection } = await import('../src/routerMap/sidebarSelection.ts');
  assert.equal(getSidebarSelection('/dashboard', '?tab=journey'), '/dashboard?tab=journey');
  assert.equal(getSidebarSelection('/dashboard', '?tab=pets'), '/dashboard');
  assert.equal(getSidebarSelection('/dashboard'), '/dashboard');
  assert.equal(getSidebarSelection('/community/posts/post-123'), '/community');
  assert.equal(getSidebarSelection('/community'), '/community');
  assert.equal(getSidebarSelection('/community/my-posts'), '/community/my-posts');
  assert.equal(getSidebarSelection('/clinic/dashboard'), '/clinic/dashboard');
});
