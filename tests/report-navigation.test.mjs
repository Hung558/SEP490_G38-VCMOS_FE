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

test('front-desk report is registered inside the exact Admin/Receptionist role boundary', async () => {
  const router = await source('src/routerMap/AppRouter.tsx');
  const boundary = router.indexOf(
    "element: <RoleRoute allowRoles={['Admin', 'Receptionist']} />"
  );
  const nextBoundary = router.indexOf('// Work queue:', boundary);
  assert.ok(boundary > 0 && nextBoundary > boundary);
  assert.match(
    router.slice(boundary, nextBoundary),
    /path: ROUTER\.FRONT_DESK_DASHBOARD/
  );
  assert.match(
    router.slice(boundary, nextBoundary),
    /<FrontDeskDashboardPage\s*\/>/
  );
});

test('report links exist for receptionist and admin without replacing intake links', async () => {
  const menu = await source('src/routerMap/MenuItem.tsx');
  for (const name of ['MenuItemReceptionist', 'MenuItemAdmin']) {
    const start = menu.indexOf(`export const ${name}`);
    const end = menu.indexOf('\n};', start);
    const body = menu.slice(start, end);
    assert.match(body, /ROUTER\.FRONT_DESK_DASHBOARD/);
    assert.match(body, /ROUTER\.CLINIC_APPOINTMENTS/);
    assert.match(body, /ROUTER\.CLINIC_INVOICES/);
  }
});
