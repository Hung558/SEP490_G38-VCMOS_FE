import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePath } from 'react-router-dom';

const { default: ROUTER } = await import('../src/routerMap/ROUTER.ts');

test('ROUTER exposes the pet profile page (SCR-08) with a petId param', () => {
  assert.equal(ROUTER.PET_PROFILE, '/pets/:petId');
  assert.equal(
    generatePath(ROUTER.PET_PROFILE, { petId: '6b1f0c2e9a3d4e5f60718293' }),
    '/pets/6b1f0c2e9a3d4e5f60718293'
  );
});

test('breadcrumbMap labels the pets segment in Vietnamese', async () => {
  const { breadcrumbMap } = await import('../src/routerMap/breadcrumbMap.ts');
  assert.equal(breadcrumbMap.pets, 'Hồ sơ thú cưng');
});
