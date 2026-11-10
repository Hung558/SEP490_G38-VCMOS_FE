// Tabs of the pet owner dashboard. Relative .ts import (no @/ alias) so
// node:test can load this file directly.
import ROUTER from '../../routerMap/ROUTER.ts';

export type DashboardTab = 'pets' | 'appointments' | 'ai';

export const DASHBOARD_TABS: readonly DashboardTab[] = [
  'pets',
  'appointments',
  'ai',
];

/** The `tab` query value, or the first tab when it is missing or unknown */
export const parseDashboardTab = (value?: string | null): DashboardTab =>
  DASHBOARD_TABS.includes(value as DashboardTab)
    ? (value as DashboardTab)
    : 'pets';

/**
 * Link that opens the booking form in the "Quản lí lịch đặt" tab, with the pet
 * already chosen when one is given
 */
export const getBookingLink = (petId?: string): string =>
  `${ROUTER.DASHBOARD}?tab=appointments&book=${petId ? encodeURIComponent(petId) : 'new'}`;
