// Tabs of the pet owner dashboard. Relative .ts import (no @/ alias) so
// node:test can load this file directly.
import ROUTER from '../../routerMap/ROUTER.ts';

// 24/11: the AI check moved to its own page; the pets' journeys moved in
export type DashboardTab = 'pets' | 'appointments' | 'journey';

export const DASHBOARD_TABS: readonly DashboardTab[] = [
  'pets',
  'appointments',
  'journey',
];

/** The `tab` query value, or the first tab when it is missing or unknown */
export const parseDashboardTab = (value?: string | null): DashboardTab =>
  DASHBOARD_TABS.includes(value as DashboardTab)
    ? (value as DashboardTab)
    : 'pets';

/**
 * Link that opens the booking form in the "Quản lí lịch đặt" tab, with the pet
 * (and services) already chosen when given. Several services go in one
 * ?service= as ids joined by commas (the AI page's ticked suggestions).
 */
export const getBookingLink = (
  petId?: string,
  serviceIds?: string | string[]
): string => {
  const params = new URLSearchParams({
    tab: 'appointments',
    book: petId || 'new',
  });
  const ids = (Array.isArray(serviceIds) ? serviceIds : [serviceIds]).filter(
    (id): id is string => !!id
  );
  if (ids.length > 0) params.set('service', ids.join(','));
  return `${ROUTER.DASHBOARD}?${params.toString()}`;
};

/** The service ids of a ?service= value, without blanks and repeats */
export const parseServiceParam = (value?: string | null): string[] => [
  ...new Set(
    (value || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
  ),
];

/** Link to the journey tab, on one pet when given; `hash` opens a section */
export const getJourneyLink = (petId?: string, hash = ''): string => {
  const params = new URLSearchParams({ tab: 'journey' });
  if (petId) params.set('pet', petId);
  return `${ROUTER.DASHBOARD}?${params.toString()}${hash}`;
};

type JourneyPet = { _id: string; status?: string };

/** Pets of the journey tab: active ones first, archived ones after */
export const sortJourneyPets = <T extends JourneyPet>(pets: T[]): T[] => [
  ...pets.filter(pet => pet.status !== 'Deleted'),
  ...pets.filter(pet => pet.status === 'Deleted'),
];

/** The pet named in ?pet=, else the first active pet, else the first one */
export const pickJourneyPet = <T extends JourneyPet>(
  pets: T[],
  petId?: string | null
): T | undefined =>
  pets.find(pet => pet._id === petId) ??
  pets.find(pet => pet.status !== 'Deleted') ??
  pets[0];
