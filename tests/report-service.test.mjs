import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildReportQuery,
  isCalendarDate,
  validateReportFilters,
} from '../src/services/ReportService/helpers.ts';
import {
  apiReportRevenue,
  apiReportOperations,
  apiReportFrontDesk,
} from '../src/services/ReportService/urls.ts';

test('report URLs match BE56 bare JSON endpoints', () => {
  assert.equal(apiReportRevenue, '/reports/revenue');
  assert.equal(apiReportOperations, '/reports/operations');
  assert.equal(apiReportFrontDesk, '/reports/front-desk');
});

test('query builder sends custom range and revenue grouping', () => {
  assert.deepEqual(
    buildReportQuery({
      period: 'custom',
      from: '2026-01-01',
      to: '2026-01-02',
      groupBy: 'day',
    }),
    { period: 'custom', from: '2026-01-01', to: '2026-01-02', groupBy: 'day' }
  );
  assert.deepEqual(buildReportQuery({ period: 'month' }), { period: 'month' });
});

test('presets strip stale dates instead of accidentally overriding server Vietnam periods', () => {
  for (const period of ['day', 'week', 'month']) {
    assert.deepEqual(
      buildReportQuery({ period, from: '2026-11-10', to: '2026-11-12' }),
      { period }
    );
  }
});

test('operations and front-desk omit revenue-only groupBy', () => {
  assert.deepEqual(
    buildReportQuery({ period: 'month', groupBy: 'day' }, false),
    { period: 'month' }
  );
});

test('custom range validates real dates, both boundaries and inclusive 366 day maximum', () => {
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2026-02-31'), false);
  assert.equal(isCalendarDate('2024-02-29'), true);
  assert.equal(isCalendarDate('2026-2-01'), false);
  assert.equal(isCalendarDate('not-a-date'), false);
  assert.equal(
    validateReportFilters({
      period: 'custom',
      from: '2026-01-01',
      to: '2026-01-01',
    }),
    undefined
  );
  assert.equal(
    validateReportFilters({
      period: 'custom',
      from: '2026-01-01',
      to: '2027-01-01',
    }),
    undefined
  );
  assert.match(
    validateReportFilters({
      period: 'custom',
      from: '2026-01-01',
      to: '2027-01-02',
    }),
    /366 ngày/
  );
  assert.match(
    validateReportFilters({
      period: 'custom',
      from: '2026-02-02',
      to: '2026-02-01',
    }),
    /trước/
  );
  for (const filters of [
    { period: 'custom' },
    { period: 'custom', from: '2026-11-20' },
    { period: 'custom', to: '2026-11-20' },
  ]) {
    assert.ok(validateReportFilters(filters));
  }
  assert.equal(validateReportFilters({ period: 'month' }), undefined);
});

test('revenue preserves server-zero-filled buckets without client recomputation', async () => {
  const service = await readFile(
    new URL('../src/services/ReportService/index.ts', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(service, /fillRevenueSeries|\.reduce\(/);
  assert.equal(
    (service.match(/signal,/g) || []).length,
    3,
    'each endpoint accepts request cancellation'
  );
});
