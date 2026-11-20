import api from '../01_axios';
import { buildReportQuery, validateReportFilters } from './helpers';
import {
  apiReportFrontDesk,
  apiReportOperations,
  apiReportRevenue,
} from './urls';
import type {
  FrontDeskReport,
  OperationsReport,
  ReportFilters,
  RevenueReport,
} from './types';

const assertValid = (filters: ReportFilters) => {
  const message = validateReportFilters(filters);
  if (message) throw new RangeError(message);
};
const getRevenue = (
  filters: ReportFilters,
  signal?: AbortSignal
): Promise<RevenueReport> => {
  assertValid(filters);
  // The interceptor unwraps the bare JSON. Preserve server buckets and range verbatim.
  return api.get<RevenueReport>(apiReportRevenue, {
    params: buildReportQuery(filters),
    signal,
  }) as unknown as Promise<RevenueReport>;
};
const getOperations = (
  filters: ReportFilters,
  signal?: AbortSignal
): Promise<OperationsReport> => {
  assertValid(filters);
  return api.get<OperationsReport>(apiReportOperations, {
    params: buildReportQuery(filters, false),
    signal,
  }) as unknown as Promise<OperationsReport>;
};
const getFrontDesk = (
  filters: ReportFilters,
  signal?: AbortSignal
): Promise<FrontDeskReport> => {
  assertValid(filters);
  return api.get<FrontDeskReport>(apiReportFrontDesk, {
    params: buildReportQuery(filters, false),
    signal,
  }) as unknown as Promise<FrontDeskReport>;
};
const ReportService = { getRevenue, getOperations, getFrontDesk };
export * from './types';
export * from './helpers';
export * from './urls';
export default ReportService;
