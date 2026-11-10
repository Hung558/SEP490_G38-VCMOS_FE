export const apiCageAssignments = '/cage-assignments';
export const apiCageAssignmentDetail = (id: string) =>
  `/cage-assignments/${id}`;
export const apiCageAssignmentByOrder = (orderId: string) =>
  `/cage-assignments/order/${orderId}`;
export const apiReleaseCageAssignment = (id: string) =>
  `/cage-assignments/${id}/release`;
