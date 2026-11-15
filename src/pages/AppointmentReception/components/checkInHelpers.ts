import type {
  Cage,
  CheckInServiceAssignment,
  OnlineAppointmentService,
  OrderCageRef,
} from '@/types';
import { canCageHoldPet } from '../../../services/CageService/helpers.ts';
import { getAssignStaffBlockReason } from '../../../services/AppointmentServiceService/helpers.ts';

const refId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value || undefined;
  if (value && typeof value === 'object' && '_id' in value) {
    const id = (value as { _id?: unknown })._id;
    return typeof id === 'string' && id ? id : undefined;
  }
  return undefined;
};

export interface CheckInCageChoice {
  cage: Cage;
  /** The cage this order reserved at booking (A1: pre-selected at check-in) */
  reservedForThis: boolean;
}

/** Available cages the pet fits (BR-11), in natural label order */
export const getCheckInCageChoices = (
  cages: readonly Cage[],
  options: {
    reservedCageId?: string;
    petWeight?: number | null;
    requiresIsolation: boolean;
  }
): CheckInCageChoice[] =>
  cages
    .filter(
      cage =>
        cage.status === 'Available' &&
        canCageHoldPet(cage, options.petWeight, options.requiresIsolation)
    )
    .map(cage => ({
      cage,
      reservedForThis: cage._id === options.reservedCageId,
    }))
    .sort((a, b) =>
      a.cage.label.localeCompare(b.cage.label, 'vi', { numeric: true })
    );

/** The reserved cage when it is still a valid choice, else nothing */
export const getDefaultCheckInCageId = (
  choices: readonly CheckInCageChoice[]
): string | undefined => choices.find(c => c.reservedForThis)?.cage._id;

/** Why the reserved cage can't be used any more, for the receptionist */
export const getReservedCageProblem = (
  reserved: OrderCageRef | undefined,
  choices: readonly CheckInCageChoice[],
  requiresIsolation: boolean
): string | undefined => {
  if (!reserved || choices.some(c => c.cage._id === reserved._id))
    return undefined;
  if (requiresIsolation && !reserved.isIsolated)
    return `Chuồng giữ chỗ ${reserved.label} không phải chuồng cách ly, hãy chọn chuồng cách ly.`;
  return `Chuồng giữ chỗ ${reserved.label} hiện không trống hoặc không vừa thú cưng, hãy chọn chuồng khác.`;
};

/** Services still open for assignment at check-in, in visit order */
export const getCheckInServices = (
  services: readonly OnlineAppointmentService[] | undefined
): OnlineAppointmentService[] =>
  (services || [])
    .filter(s => !getAssignStaffBlockReason(s.status, 'CheckedIn'))
    .sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));

/** Pre-select whoever already has the service, else the owner's preferred staff */
export const getDefaultCheckInStaffId = (
  service: Pick<
    OnlineAppointmentService,
    'assignedStaffId' | 'preferredStaffId'
  >
): string | undefined =>
  refId(service.assignedStaffId) || refId(service.preferredStaffId);

/**
 * Send only services whose person changes: the BE already queues services that
 * kept their staff, and re-sending the same person would give a new queue number.
 */
export const buildCheckInAssignments = (
  services: readonly OnlineAppointmentService[],
  selected: Readonly<Record<string, string | undefined>> | undefined
): CheckInServiceAssignment[] =>
  services.flatMap(service => {
    const staffId = selected?.[service._id];
    if (!staffId || staffId === refId(service.assignedStaffId)) return [];
    return [{ appointmentServiceId: service._id, assignedStaffId: staffId }];
  });
