import test from 'node:test';
import assert from 'node:assert/strict';

const content = await import(
  '../src/pages/Profile/components/profileContent.ts'
);

test('profile subtitle follows the role', () => {
  assert.equal(content.getProfileSubtitle('PetOwner'), 'Hồ sơ chủ nuôi');
  assert.equal(content.getProfileSubtitle('Admin'), 'Hồ sơ quản trị viên');
  assert.equal(
    content.getProfileSubtitle('Veterinarian'),
    'Hồ sơ nhân viên · Bác sĩ thú y'
  );
  assert.equal(content.getProfileSubtitle(undefined), 'Hồ sơ chủ nuôi');
});

test('account status shows the real state, not a fixed "Active"', () => {
  assert.deepEqual(content.getAccountStatus('Active'), {
    label: 'Hoạt động',
    color: 'green',
  });
  assert.equal(content.getAccountStatus('Locked').label, 'Đã khóa');
  assert.equal(content.getAccountStatus('Inactive').label, 'Chưa kích hoạt');
  assert.equal(content.getAccountStatus(undefined).label, 'Chưa rõ');
});

test('each clinic role has its own work content; others have none', () => {
  for (const role of ['Receptionist', 'Veterinarian', 'Groomer']) {
    const roleContent = content.getStaffRoleContent(role);
    assert.ok(roleContent?.description, role);
    assert.ok(roleContent.screens.length > 0, role);
    const codes = roleContent.screens.map(s => s.code);
    assert.equal(
      new Set(codes).size,
      codes.length,
      `${role}: duplicate screens`
    );
  }
  assert.equal(
    content.getStaffRoleContent('veterinarian')?.screens[0].code,
    'SCR-22'
  );
  assert.equal(content.getStaffRoleContent('PetOwner'), null);
  assert.equal(content.getStaffRoleContent('Admin'), null);
});

test('screens that exist link to their page; the rest are still in development', () => {
  const linked = screens =>
    Object.fromEntries(screens.filter(s => s.path).map(s => [s.code, s.path]));
  assert.deepEqual(
    linked(content.getStaffRoleContent('Receptionist').screens),
    {
      'SCR-16': '/clinic/appointments',
      'SCR-18': '/clinic/appointments',
      'SCR-19': '/cages',
      'SCR-21': '/clinic/appointments',
    }
  );
  // A SOAP record (SCR-23) is opened from a case in the work queue
  assert.deepEqual(
    linked(content.getStaffRoleContent('Veterinarian').screens),
    {
      'SCR-22': '/clinic/my-queue',
      'SCR-23': '/clinic/my-queue',
    }
  );
  assert.deepEqual(linked(content.getStaffRoleContent('Groomer').screens), {
    'SCR-26': '/clinic/my-queue',
  });
});

test('summarizeAccounts counts accounts per role and locked ones', () => {
  const summary = content.summarizeAccounts([
    { role: 'PetOwner', status: 'Active' },
    { role: 'PetOwner', status: 'Locked' },
    { role: 'Veterinarian', status: 'Active' },
    { role: 'admin', status: 'Active' },
  ]);
  assert.equal(summary.total, 4);
  assert.equal(summary.locked, 1);
  assert.deepEqual(summary.byRole, { PetOwner: 2, Veterinarian: 1, Admin: 1 });
  assert.deepEqual(content.summarizeAccounts([]), {
    total: 0,
    locked: 0,
    byRole: {},
  });
});
