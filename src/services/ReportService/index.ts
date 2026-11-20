import api from '../01_axios';
import {
  buildReportQuery,
  fillRevenueSeries,
  validateReportFilters,
} from './helpers';
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
const getRevenue = async (
  filters: ReportFilters,
  signal?: AbortSignal
): Promise<RevenueReport> => {
  assertValid(filters);
  const report = await api.get<RevenueReport>(apiReportRevenue, {
    params: buildReportQuery(filters),
    signal,
  });
  const data = report as unknown as RevenueReport;
  return { ...data, revenueSeries: fillRevenueSeries(data) };
};
const getOperations = (
  filters: ReportFilters,
  signal?: AbortSignal
): Promise<OperationsReport> => {
  assertValid(filters);
  return api.get<OperationsReport>(apiReportOperations, {
    params: buildReportQuery(filters),
    signal,
  }) as unknown as Promise<OperationsReport>;
};
const getFrontDesk = (
  filters: ReportFilters,
  signal?: AbortSignal
): Promise<FrontDeskReport> => {
  assertValid(filters);
  return api.get<FrontDeskReport>(apiReportFrontDesk, {
    params: buildReportQuery(filters),
    signal,
  }) as unknown as Promise<FrontDeskReport>;
};
const ReportService = { getRevenue, getOperations, getFrontDesk };
export * from './types';
export * from './helpers';
export * from './urls';
export default ReportService;
