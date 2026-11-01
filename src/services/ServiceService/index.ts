import api from '../01_axios';
import { apiServiceDetail, apiServiceStatus, apiServices } from './urls';
import type {
  Service,
  ServiceFilters,
  ServiceStatus,
  ServiceWritePayload,
} from './types';
import { buildServiceQuery } from './helpers';

const listServices = (
  filters?: ServiceFilters
): Promise<{ services: Service[] }> =>
  api.get(apiServices, { params: buildServiceQuery(filters) });

const getService = (id: string): Promise<{ service: Service }> =>
  api.get(apiServiceDetail(id));

const createService = (
  data: ServiceWritePayload
): Promise<{ service: Service }> => api.post(apiServices, data);

const updateService = (
  id: string,
  data: ServiceWritePayload
): Promise<{ service: Service }> => api.put(apiServiceDetail(id), data);

const updateServiceStatus = (
  id: string,
  status: ServiceStatus
): Promise<{ service: Service }> => api.patch(apiServiceStatus(id), { status });

const ServiceService = {
  listServices,
  getService,
  createService,
  updateService,
  updateServiceStatus,
};

export default ServiceService;
export * from './types';
export * from './helpers';
