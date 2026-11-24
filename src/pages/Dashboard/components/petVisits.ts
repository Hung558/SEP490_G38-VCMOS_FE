// Owner dashboard (24/11): each pet shows its visits of today or, when it has
// none, its latest finished visits. Relative .ts import (no @/ alias) so
// node:test can load this file directly.
import type {
  PetTimelineMilestone,
  PetTimelineRefValue,
} from '../../../services/PetTimelineService/types.ts';

/** How many finished visits a pet without a visit today shows */
export const RECENT_VISITS = 2;

type Visit = Pick<
  PetTimelineMilestone,
  'date' | 'derivedStatus' | 'slotStart' | 'slotEnd' | 'services'
>;

/** Visits on the given day; a cancelled one is no visit */
export const pickTodayVisits = <T extends Visit>(
  milestones: T[],
  today: string
): T[] =>
  milestones.filter(m => m.date === today && m.derivedStatus !== 'Cancelled');

/** Latest finished visits up to the given day, newest first */
export const pickRecentVisits = <T extends Visit>(
  milestones: T[],
  today: string,
  size = RECENT_VISITS
): T[] =>
  [...milestones]
    .filter(m => m.derivedStatus === 'Done' && m.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, size);

/** "08:00–08:30", "08:00" or "" when the visit has no time slot */
export const formatVisitTime = (visit: Pick<Visit, 'slotStart' | 'slotEnd'>) =>
  visit.slotStart
    ? visit.slotEnd
      ? `${visit.slotStart}–${visit.slotEnd}`
      : visit.slotStart
    : '';

/** YYYY-MM-DD to DD/MM/YYYY */
export const formatVisitDate = (date: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
};

const refName = (ref: PetTimelineRefValue) =>
  ref && typeof ref === 'object' ? ref.name || ref.label || '' : '';

/** Service names of the visit in order, cancelled services left out */
export const getVisitServiceNames = (visit: Pick<Visit, 'services'>) =>
  visit.services
    .filter(service => service.status !== 'Cancelled')
    .map(service => refName(service.service))
    .filter(Boolean);
