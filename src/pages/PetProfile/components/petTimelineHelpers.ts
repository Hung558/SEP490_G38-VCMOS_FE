import type { OnlineAppointment, PetAppointmentNote } from '@/types';
import {
  getAppointmentStatusLabel,
  getOrderStatusText,
} from '../../../services/AppointmentOrderService/helpers.ts';

/** Visits still moving: the timeline keeps refreshing while one of these is open */
export const ACTIVE_VISIT_STATUSES = [
  'Booked',
  'CheckedIn',
  'InProgress',
  'WaitOwner',
] as const;

export const isActiveVisit = (status?: string): boolean =>
  (ACTIVE_VISIT_STATUSES as readonly string[]).includes(status || '');

export interface PetMilestone {
  id: string;
  code: string;
  date: string;
  slotStart?: string | null;
  isOnline?: boolean;
  status: string;
  /** "Đang + tên dịch vụ" while a service runs, else the order status */
  statusText: string;
  active: boolean;
  note?: string;
  symptoms?: string;
  /** Service names in visit order, when the owner's order list has them */
  services: string[];
  /** Medical records (SOAP) of this visit */
  recordIds: string[];
}

const serviceName = (ref: unknown): string | undefined =>
  ref && typeof ref === 'object' && 'name' in ref
    ? String((ref as { name?: unknown }).name || '').trim() || undefined
    : undefined;

/**
 * One milestone per visit (nghiệp vụ 3.3): its latest status from booking to
 * pick-up, with the SOAP records attached once written. `orders` are the
 * owner's online orders, which carry the services and the current one; walk-in
 * visits only have the order status.
 */
export const buildPetMilestones = (
  notes: readonly PetAppointmentNote[] | null | undefined,
  orders: readonly Pick<
    OnlineAppointment,
    '_id' | 'derivedStatus' | 'services' | 'currentService'
  >[] = [],
  recordsByCode: ReadonlyMap<string, readonly string[]> = new Map()
): PetMilestone[] => {
  const byId = new Map(orders.map(o => [o._id, o]));
  return (notes || []).map(note => {
    const order = byId.get(note._id);
    // The order list is fetched later than the pet, so its status is fresher
    const status = order?.derivedStatus || note.derivedStatus;
    const services = [...(order?.services || [])]
      .filter(s => s.status !== 'Cancelled')
      .sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0))
      .map(s => serviceName(s.serviceId))
      .filter((name): name is string => Boolean(name));
    return {
      id: note._id,
      code: note.code,
      date: note.date,
      slotStart: note.slotStart,
      isOnline: note.isOnline,
      status,
      statusText: order
        ? getOrderStatusText({ ...order, derivedStatus: status })
        : getAppointmentStatusLabel(status),
      active: isActiveVisit(status),
      note: note.note?.trim() || undefined,
      symptoms: note.intake?.symptoms?.trim() || undefined,
      services,
      recordIds: [...(recordsByCode.get(note.code) || [])],
    };
  });
};

/** Date range of the open visits, to ask the order list for just those */
export const getActiveVisitRange = (
  notes: readonly Pick<PetAppointmentNote, 'date' | 'derivedStatus'>[]
): { from: string; to: string } | undefined => {
  const dates = notes
    .filter(n => isActiveVisit(n.derivedStatus) && n.date)
    .map(n => n.date)
    .sort();
  return dates.length
    ? { from: dates[0], to: dates[dates.length - 1] }
    : undefined;
};
