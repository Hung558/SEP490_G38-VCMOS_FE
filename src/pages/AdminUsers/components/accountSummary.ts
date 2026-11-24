// Account counts shown above the "Quản lý tài khoản" table (moved there from the
// admin profile on 24/11). Relative .ts import (no @/ alias) so node:test can
// load this file directly.
import { normalizeRole } from '../../../constants/roles.ts';

export interface AccountSummary {
  total: number;
  locked: number;
  byRole: Record<string, number>;
}

/** Counts accounts per role and the locked ones */
export const summarizeAccounts = (
  users: { role?: string; status?: string }[]
): AccountSummary => {
  const byRole: Record<string, number> = {};
  let locked = 0;
  for (const user of users) {
    const key = normalizeRole(user.role) || user.role || 'Khác';
    byRole[key] = (byRole[key] || 0) + 1;
    if (user.status === 'Locked') locked++;
  }
  return { total: users.length, locked, byRole };
};
