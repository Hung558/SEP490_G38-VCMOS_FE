import api from '../01_axios';
import { buildSubtaskCreate, buildSubtaskResult } from './helpers';
import type {
  CreateSubtask,
  SubtaskRequest,
  SubtaskResult,
  SubtaskStatus,
} from './types';
import {
  subtaskById,
  subtaskQueue,
  subtaskRequests,
  subtasksByService,
} from './urls';

type Response<T> = Promise<{ message: string; data: T }>;

const SubtaskRequestService = {
  listMine: (
    status?: SubtaskStatus,
    signal?: AbortSignal
  ): Response<SubtaskRequest[]> =>
    api.get(subtaskQueue, { params: status ? { status } : undefined, signal }),
  listForService: (
    id: string,
    signal?: AbortSignal
  ): Response<SubtaskRequest[]> => api.get(subtasksByService(id), { signal }),
  get: (id: string, signal?: AbortSignal): Response<SubtaskRequest> =>
    api.get(subtaskById(id), { signal }),
  create: (body: CreateSubtask): Response<SubtaskRequest> =>
    api.post(subtaskRequests, buildSubtaskCreate(body)),
  start: (id: string): Response<SubtaskRequest> =>
    api.patch(`${subtaskById(id)}/start`),
  complete: (id: string, body: SubtaskResult): Response<SubtaskRequest> =>
    api.patch(`${subtaskById(id)}/complete`, buildSubtaskResult(body)),
  remove: (id: string): Promise<{ message: string }> =>
    api.delete(subtaskById(id)),
};

export * from './helpers';
export type * from './types';
export default SubtaskRequestService;
