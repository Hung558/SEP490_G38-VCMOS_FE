import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportQuery, fillRevenueSeries, isCalendarDate, validateReportFilters } from '../src/services/ReportService/helpers.ts';

test('query builder only includes supplied fields and keeps preset period', () => {
  assert.deepEqual(buildReportQuery({ period: 'custom', from: '2026-01-01', to: '2026-01-02', groupBy: 'day' }), { period: 'custom', from: '2026-01-01', to: '2026-01-02', groupBy: 'day' });
  assert.deepEqual(buildReportQuery({ period: 'month' }), { period: 'month' });
});

test('custom range validates real dates and inclusive 366 day maximum', () => {
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2024-02-29'), true);
  assert.match(validateReportFilters({ period: 'custom', from: '2026-01-01', to: '2026-01-01' }) || '', /^$/);
  assert.match(validateReportFilters({ period: 'custom', from: '2026-01-01', to: '2027-01-02' }) || '', /366 ngày/);
  assert.match(validateReportFilters({ period: 'custom', from: '2026-02-02', to: '2026-02-01' }) || '', /trước/);
  assert.ok(validateReportFilters({ period: 'custom', from: '2026-02-30', to: '2026-03-01' }));
  assert.equal(validateReportFilters({ period: 'month' }), undefined);
});

test('revenue series fills missing daily buckets from server-echoed inclusive range', () => {
  const filled = fillRevenueSeries({ from: '2026-11-10', to: '2026-11-12', groupBy: 'day', revenueSeries: [{ period: '2026-11-10', revenue: 12, invoiceCount: 1 }, { period: '2026-11-12', revenue: 4, invoiceCount: 1 }] });
  assert.deepEqual(filled, [{ period: '2026-11-10', revenue: 12, invoiceCount: 1 }, { period: '2026-11-11', revenue: 0, invoiceCount: 0 }, { period: '2026-11-12', revenue: 4, invoiceCount: 1 }]);
});

test('revenue series fills monthly buckets while preserving echoed data', () => {
  const filled = fillRevenueSeries({ from: '2026-01-15', to: '2026-03-02', groupBy: 'month', revenueSeries: [{ period: '2026-01', revenue: 9, invoiceCount: 2 }, { period: '2026-03', revenue: 1, invoiceCount: 1 }] });
  assert.deepEqual(filled.map(x => x.period), ['2026-01', '2026-02', '2026-03']);
  assert.equal(filled[1].revenue, 0);
});
