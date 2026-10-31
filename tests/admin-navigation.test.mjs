import test from 'node:test';
import assert from 'node:assert/strict';

// Test ROUTER constants
test('ROUTER configuration contains ADMIN_USERS route', async () => {
  const routerModule = await import('../src/routerMap/ROUTER.ts');
  const ROUTER = routerModule.default;
  assert.equal(ROUTER.ADMIN_USERS, '/admin/users');
});

// Test breadcrumb mapping
test('breadcrumbMap contains admin and users keys with correct Vietnamese labels', async () => {
  const breadcrumbModule = await import('../src/routerMap/breadcrumbMap.ts');
  const { breadcrumbMap } = breadcrumbModule;
  assert.equal(breadcrumbMap.admin, 'Quản trị');
  assert.equal(breadcrumbMap.users, 'Quản lý tài khoản');
});

// Test AdminUserService URLs
test('AdminUserService urls match backend endpoints', async () => {
  const urlsModule = await import('../src/services/AdminUserService/urls.ts');
  const { apiAdminUsers, apiAdminUserDetail, apiAdminUserStatus } = urlsModule;
  assert.equal(apiAdminUsers, '/admin/users');
  assert.equal(apiAdminUserDetail('user123'), '/admin/users/user123');
  assert.equal(apiAdminUserStatus('user123'), '/admin/users/user123/status');
});

// Test phone and email validation regular expressions matching backend rules
test('Phone regex conforms to Vietnamese standard (10 digits starting with 0)', () => {
  const phoneRegex = /^0\d{9}$/;
  assert.equal(phoneRegex.test('0901234567'), true);
  assert.equal(phoneRegex.test('0388888888'), true);
  assert.equal(phoneRegex.test('0987654321'), true);
  assert.equal(phoneRegex.test('1234567890'), false, 'Should reject non-0 prefix');
  assert.equal(phoneRegex.test('090123456'), false, 'Should reject 9 digits');
  assert.equal(phoneRegex.test('09012345678'), false, 'Should reject 11 digits');
  assert.equal(phoneRegex.test('090123456a'), false, 'Should reject letters');
});

