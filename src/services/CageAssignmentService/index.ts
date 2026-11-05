import api from '../01_axios';
import { apiCageAssignments, apiCageAssignmentDetail } from './urls';
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

const CageAssignmentService = {
  listCageAssignments,
  getCageAssignment,
  createCageAssignment,
};

export default CageAssignmentService;
export * from './urls';
export * from './helpers';
export * from './types';
