import type { CageAssignment } from '@/types';

/** The list and create responses can return either a populated order or its ID. */
export const getActiveCageOrderId = (
  assignment: Pick<CageAssignment, 'orderId' | 'releasedAt'> | null | undefined
): string | undefined => {
  if (!assignment || assignment.releasedAt != null) return undefined;
  const order = assignment.orderId;
  const id = typeof order === 'string' ? order : order?._id;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
};

/**
 * Open assignments keyed by order ID. `GET /cage-assignments` sorts by
 * assignedAt descending, so the first assignment seen for an order is its latest.
 */
export const indexActiveCagesByOrder = (
  assignments: readonly CageAssignment[]
): ReadonlyMap<string, CageAssignment> => {
  const byOrder = new Map<string, CageAssignment>();
  for (const assignment of assignments) {
    const orderId = getActiveCageOrderId(assignment);
    if (orderId && !byOrder.has(orderId)) byOrder.set(orderId, assignment);
  }
  return byOrder;
};

/** Confirm a specific cage from the mutation response, never from the submitted values alone. */
export const matchesActiveCageAssignment = (
  assignment: CageAssignment | null | undefined,
  orderId: string,
  cageId: string
): assignment is CageAssignment => {
  const assignedCage = assignment?.cageId;
  const assignedCageId =
    typeof assignedCage === 'string' ? assignedCage : assignedCage?._id;
  return (
    getActiveCageOrderId(assignment) === orderId && assignedCageId === cageId
  );
};

export const collectActiveCageOrderIds = (
  assignments: readonly CageAssignment[]
): ReadonlySet<string> => new Set(indexActiveCagesByOrder(assignments).keys());
