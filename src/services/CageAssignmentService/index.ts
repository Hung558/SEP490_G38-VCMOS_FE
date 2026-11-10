import api from '../01_axios';
import {
  apiCageAssignments,
  apiCageAssignmentDetail,
  apiCageAssignmentByOrder,
  apiReleaseCageAssignment,
} from './urls';
import {
  buildCageAssignmentQuery,
  buildCreateCageAssignmentPayload,
} from './helpers';
import type {
  CageAssignmentDetailResponse,
  CreateCageAssignmentPayload,
  CreateCageAssignmentResponse,
  ListCageAssignmentsParams,
  ListCageAssignmentsResponse,
} from './types';

const listCageAssignments = (
  params?: ListCageAssignmentsParams,
  options?: { signal?: AbortSignal }
): Promise<ListCageAssignmentsResponse> => {
  const query = buildCageAssignmentQuery(params);
  return api.get(apiCageAssignments, {
    params: query,
    signal: options?.signal,
  });
};

const getCageAssignment = (
  id: string,
  options?: { signal?: AbortSignal }
): Promise<CageAssignmentDetailResponse> => {
  return api.get(apiCageAssignmentDetail(id), {
    signal: options?.signal,
  });
};

const createCageAssignment = (
  data: CreateCageAssignmentPayload
): Promise<CreateCageAssignmentResponse> => {
  const payload = buildCreateCageAssignmentPayload(data);
  return api.post(apiCageAssignments, payload);
};

/**
 * Bác sĩ / Groomer xem chuồng thú cưng của một lịch hẹn đang nằm (404 khi không ở chuồng nào)
 * GET /api/cage-assignments/order/:orderId
 */
const getOpenAssignmentByOrder = (
  orderId: string,
  options?: { signal?: AbortSignal }
): Promise<CageAssignmentDetailResponse> =>
  api.get(apiCageAssignmentByOrder(orderId), { signal: options?.signal });

/**
 * Bác sĩ / Groomer đưa thú cưng ra khỏi chuồng, chuồng trở lại Available
 * PATCH /api/cage-assignments/:id/release
 */
const releaseAssignment = (id: string): Promise<CageAssignmentDetailResponse> =>
  api.patch(apiReleaseCageAssignment(id));

const CageAssignmentService = {
  listCageAssignments,
  getCageAssignment,
  createCageAssignment,
  getOpenAssignmentByOrder,
  releaseAssignment,
};

export default CageAssignmentService;
export * from './urls';
export * from './helpers';
export * from './types';
