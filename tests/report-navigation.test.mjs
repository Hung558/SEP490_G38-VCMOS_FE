import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ROUTER from '../src/routerMap/ROUTER.ts';
import { getLandingPath, getBookingPath } from '../src/routerMap/roleAccess.ts';

const source = async path =>
  readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('reporting landing routes are distinct from the pet-owner dashboard', () => {
  assert.equal(ROUTER.FRONT_DESK_DASHBOARD, '/clinic/dashboard');
  assert.equal(getLandingPath('Receptionist'), ROUTER.FRONT_DESK_DASHBOARD);
  assert.equal(getLandingPath('Admin'), ROUTER.ADMIN_REPORTS);
  assert.equal(getLandingPath('PetOwner'), ROUTER.DASHBOARD);
  for (const role of ['Veterinarian', 'Groomer']) {
    assert.equal(getLandingPath(role), ROUTER.STAFF_QUEUE);
  }
  assert.equal(
    getBookingPath('Receptionist'),
    `${ROUTER.CLINIC_APPOINTMENTS}?walkin=new`
  );
});

// 24/11: the front-desk overview is Receptionist only; Admin reads the same
// figures in the "Quầy lễ tân" tab of /admin/reports
test('front-desk report is registered inside the Receptionist-only role boundary', async () => {
  const router = await source('src/routerMap/AppRouter.tsx');
  const boundary = router.indexOf(
    "element: <RoleRoute allowRoles={['Receptionist']} />"
  );
  const nextBoundary = router.indexOf(
    '// Clinic appointments intake',
    boundary
  );
  assert.ok(boundary > 0 && nextBoundary > boundary);
  const block = router.slice(boundary, nextBoundary);
  assert.match(block, /path: ROUTER\.FRONT_DESK_DASHBOARD/);
  assert.match(block, /<FrontDeskDashboardPage\s*\/>/);
  // Not also reachable through the Admin/Receptionist intake boundary
  const intake = router.indexOf(
    "element: <RoleRoute allowRoles={['Admin', 'Receptionist']} />"
  );
  const intakeEnd = router.indexOf('// Work queue:', intake);
  assert.doesNotMatch(
    router.slice(intake, intakeEnd),
    /ROUTER\.FRONT_DESK_DASHBOARD/
  );
});

test('receptionist has the report link; admin keeps intake links without it', async () => {
  const menu = await source('src/routerMap/MenuItem.tsx');
  const body = name => {
    const start = menu.indexOf(`export const ${name}`);
    return menu.slice(start, menu.indexOf('\n};', start));
  };
  const receptionist = body('MenuItemReceptionist');
  assert.match(receptionist, /ROUTER\.FRONT_DESK_DASHBOARD/);
  assert.match(receptionist, /ROUTER\.CLINIC_APPOINTMENTS/);
  assert.match(receptionist, /ROUTER\.CLINIC_INVOICES/);
  const admin = body('MenuItemAdmin');
  assert.doesNotMatch(admin, /key: ROUTER\.FRONT_DESK_DASHBOARD/);
  assert.match(admin, /ROUTER\.ADMIN_REPORTS/);
  assert.match(admin, /ROUTER\.CLINIC_APPOINTMENTS/);
  assert.match(admin, /ROUTER\.CLINIC_INVOICES/);
});
