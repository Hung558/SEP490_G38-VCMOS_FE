// Pure helpers of the cage status board (SCR-19). Relative imports only, so
// node:test can load this file directly.
import type { Cage } from '../../../types/api/cage.api.ts';
import type { CageAssignment } from '../../../types/api/cage-assignment.api.ts';
import type {
  AppointmentStatus,
  StaffAppointment,
} from '../../../types/api/appointment.api.ts';
import { canCageHoldPet } from '../../../services/CageService/helpers.ts';

/** SRS SCR-19: the board refreshes within 5 seconds of any change */
export const CAGE_BOARD_REFRESH_MS = 5000;

/** Orders whose pet is at the clinic and may sit in a holding cage (BR-10) */
export const CAGE_HOLDING_ORDER_STATUSES: AppointmentStatus[] = [
  'CheckedIn',
  'InProgress',
  'WaitOwner',
];

const refId = (ref: unknown): string | undefined => {
  if (typeof ref === 'string') return ref.trim() || undefined;
  if (ref && typeof ref === 'object' && '_id' in ref) {
    const id = (ref as { _id?: unknown })._id;
    return typeof id === 'string' && id.trim() ? id.trim() : undefined;
  }
  return undefined;
};

/** Natural order by label: "C-2" before "C-10" */
export const sortCagesForBoard = (cages: readonly Cage[]): Cage[] =>
  [...cages].sort((a, b) =>
    a.label.localeCompare(b.label, 'vi', { numeric: true })
  );

export const summarizeCages = (cages: readonly Cage[]) => {
  const available = cages.filter(c => c.status === 'Available').length;
  return { total: cages.length, available, occupied: cages.length - available };
};

/**
 * The open assignment of each cage. A cage holds one open assignment at a time
 * (unique index on the BE); the list is newest first, so the first one wins.
 */
export const indexOpenAssignmentsByCage = (
  assignments: readonly CageAssignment[]
): Map<string, CageAssignment> => {
  const byCage = new Map<string, CageAssignment>();
  for (const assignment of assignments) {
    if (!assignment || assignment.releasedAt != null) continue;
    const cageId = refId(assignment.cageId);
    if (cageId && !byCage.has(cageId)) byCage.set(cageId, assignment);
  }
  return byCage;
};

/** The order of an assignment when the BE populated it, otherwise only its id */
export const getAssignmentOrder = (
  assignment: Pick<CageAssignment, 'orderId'> | null | undefined
): { id?: string; order?: StaffAppointment } => {
  const ref = assignment?.orderId;
  if (ref && typeof ref === 'object') return { id: refId(ref), order: ref };
  return { id: refId(ref) };
};

export const getOrderPetId = (
  order: Pick<StaffAppointment, 'petId'> | undefined
): string | undefined => refId(order?.petId);

/** "12 phút", "2 giờ 5 phút": how long the pet has been in the cage */
export const formatTimeInCage = (
  assignedAt: string | null | undefined,
  now: number = Date.now()
): string | undefined => {
  if (!assignedAt) return undefined;
  const start = new Date(assignedAt).getTime();
  if (!Number.isFinite(start)) return undefined;
  const minutes = Math.max(0, Math.floor((now - start) / 60000));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `${days} ngày ${hours % 24} giờ`;
};

/**
 * Checked-in orders that can be placed in a cage now: the pet is at the clinic
 * and the order holds no open cage yet (one cage per order).
 */
export const pickOrdersWithoutCage = (
  orders: readonly StaffAppointment[],
  assignments: readonly CageAssignment[]
): StaffAppointment[] => {
  const caged = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.releasedAt != null) continue;
    const id = getAssignmentOrder(assignment).id;
    if (id) caged.add(id);
  }
  const seen = new Set<string>();
  return orders.filter(order => {
    if (!CAGE_HOLDING_ORDER_STATUSES.includes(order.derivedStatus))
      return false;
    if (caged.has(order._id) || seen.has(order._id)) return false;
    seen.add(order._id);
    return true;
  });
};

/**
 * Why a pet cannot go into this cage, or undefined when it can (BR-11): the size
 * must hold the pet's weight, a pet that needs isolation goes only into an
 * isolation cage and every other pet only into a standard one. POST
 * /cage-assignments checks neither, so this is the only guard.
 */
export const getCageBlockReason = (
  cage: Pick<Cage, 'size' | 'isIsolated' | 'maxWeightKg' | 'zone' | 'status'>,
  petWeight?: number | null,
  requiresIsolation = false
): string | undefined => {
  if (cage.status !== 'Available') return 'Chuồng đang có thú cưng';
  if (cage.isIsolated && !requiresIsolation) {
    return 'Chuồng cách ly chỉ dành cho thú cưng nghi mắc bệnh lây (BR-11)';
  }
  if (!cage.isIsolated && requiresIsolation) {
    return 'Thú cưng cần cách ly phải vào chuồng cách ly (BR-11)';
  }
  if (!canCageHoldPet(cage, petWeight, requiresIsolation)) {
    return `Chuồng cỡ ${cage.size} không đủ cho thú cưng ${petWeight} kg`;
  }
  return undefined;
};
