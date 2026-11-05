import api from '../01_axios';
import { apiCageDetail, apiCages } from './urls';
import type {
  Cage,
  CageCreatePayload,
  CageListData,
  CageListParams,
  CageUpdatePayload,
} from './types';
import { buildCageQuery } from './helpers';

const listCages = (
  params?: CageListParams,
  config?: { signal?: AbortSignal }
): Promise<{ success: boolean; data: CageListData }> =>
  api.get(apiCages, {
    params: buildCageQuery(params),
    signal: config?.signal,
  });

const getCage = (
  id: string,
  config?: { signal?: AbortSignal }
): Promise<{ success: boolean; data: Cage }> =>
  api.get(apiCageDetail(id), {
    signal: config?.signal,
  });

const createCage = (
  data: CageCreatePayload
): Promise<{ success: boolean; message: string; data: Cage }> =>
  api.post(apiCages, data);

const updateCage = (
  id: string,
  data: CageUpdatePayload
): Promise<{ success: boolean; message: string; data: Cage }> =>
  api.patch(apiCageDetail(id), data);

const CageService = {
  listCages,
  getCage,
  createCage,
  updateCage,
};

export default CageService;
export * from './types';
export * from './helpers';
export * from './urls';
