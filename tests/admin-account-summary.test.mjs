import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { summarizeAccounts } from '../src/pages/AdminUsers/components/accountSummary.ts';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('summarizeAccounts counts accounts per role and locked ones', () => {
  const summary = summarizeAccounts([
    { role: 'PetOwner', status: 'Active' },
    { role: 'PetOwner', status: 'Locked' },
    { role: 'Veterinarian', status: 'Active' },
    { role: 'admin', status: 'Active' },
  ]);
  assert.equal(summary.total, 4);
  assert.equal(summary.locked, 1);
  assert.deepEqual(summary.byRole, { PetOwner: 2, Veterinarian: 1, Admin: 1 });
  assert.deepEqual(summarizeAccounts([]), { total: 0, locked: 0, byRole: {} });
});

// 24/11: the admin's account and service counts moved from the profile page to
// the pages they describe
test('account and service counts live on their management pages, not the profile', async () => {
  const profile = await source('src/pages/Profile/index.tsx');
  assert.doesNotMatch(profile, /AdminOverviewSection/);
  const users = await source('src/pages/AdminUsers/index.tsx');
  assert.match(users, /<AccountSummaryBar/);
  const services = await source('src/pages/AdminServices/index.tsx');
  assert.match(services, /<ServiceSummaryBar/);
});
