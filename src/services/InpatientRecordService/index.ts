import api from '../01_axios';
import type {
  AdmitInpatientPayload,
  InpatientLog,
  InpatientLogPayload,
  InpatientPage,
  InpatientRecord,
  InpatientRecordsQuery,
  OwnerInpatientLog,
  OwnerInpatientLogsQuery,
} from './types';

const root = '/inpatient-records';
const detail = (id: string) => `${root}/${encodeURIComponent(id)}`;

export const listInpatientRecords = (
  query: InpatientRecordsQuery,
  signal?: AbortSignal
): Promise<InpatientPage<InpatientRecord>> =>
  api.get(root, { params: query, signal });

export const getInpatientRecord = (
  id: string,
  signal?: AbortSignal
): Promise<InpatientRecord> => api.get(detail(id), { signal });

export const admitInpatient = (
  payload: AdmitInpatientPayload
): Promise<InpatientRecord> => api.post(root, payload);

export const dischargeInpatient = (id: string): Promise<InpatientRecord> =>
  api.patch(`${detail(id)}/discharge`);

export const listInpatientLogs = (
  id: string,
  signal?: AbortSignal
): Promise<{ items: InpatientLog[]; total: number }> =>
  api.get(`${detail(id)}/daily-logs`, { signal });

export const addInpatientLog = (
  id: string,
  payload: InpatientLogPayload
): Promise<InpatientLog> => api.post(`${detail(id)}/daily-logs`, payload);

export const listMyPetDailyLogs = (
  petId: string,
  query?: OwnerInpatientLogsQuery,
  signal?: AbortSignal
): Promise<InpatientPage<OwnerInpatientLog>> =>
  api.get(`${root}/pets/${encodeURIComponent(petId)}/daily-logs`, {
    params: query,
    signal,
  });

export type * from './types';
