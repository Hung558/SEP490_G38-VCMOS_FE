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

export const collectActiveCageOrderIds = (
  assignments: readonly CageAssignment[]
): ReadonlySet<string> => {
  const orderIds = new Set<string>();
  for (const assignment of assignments) {
    const orderId = getActiveCageOrderId(assignment);
    if (orderId) orderIds.add(orderId);
  }
  return orderIds;
};
