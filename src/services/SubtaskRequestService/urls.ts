export const subtaskRequests = '/subtask-requests';
export const subtaskQueue = `${subtaskRequests}/my-queue`;
export const subtasksByService = (id: string) =>
  `${subtaskRequests}/service/${encodeURIComponent(id)}`;
export const subtaskById = (id: string) =>
  `${subtaskRequests}/${encodeURIComponent(id)}`;
