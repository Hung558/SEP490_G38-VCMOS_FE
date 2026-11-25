import test from 'node:test';
import assert from 'node:assert/strict';
import { getInvoicePeriodRange, getTodayRange, INVOICE_PERIOD_OPTIONS } from '../src/components/invoice/invoiceRange.ts';
import { getVietnamTodayString } from '../src/services/AppointmentOrderService/helpers.ts';
const dates = (period, date) => getInvoicePeriodRange(period, date).map(value => value.format('YYYY-MM-DD'));

test('invoice filter defaults to the current Vietnam calendar day', () => {
  const today = getVietnamTodayString();
  assert.deepEqual(getTodayRange().map(value => value.format('YYYY-MM-DD')), [today, today]);
  assert.deepEqual(INVOICE_PERIOD_OPTIONS.map(option => option.value), ['day', 'week', 'month', 'custom']);
  assert.deepEqual(dates('day', '2026-11-25'), ['2026-11-25', '2026-11-25']);
});

test('invoice weeks run Monday to Sunday, including year boundaries', () => {
  assert.deepEqual(dates('week', '2026-11-25'), ['2026-11-23', '2026-11-29']);
  assert.deepEqual(dates('week', '2026-11-29'), ['2026-11-23', '2026-11-29']);
  assert.deepEqual(dates('week', '2026-11-30'), ['2026-11-30', '2026-12-06']);
  assert.deepEqual(dates('week', '2027-01-01'), ['2026-12-28', '2027-01-03']);
});

test('invoice month filter includes complete calendar months and leap day', () => {
  assert.deepEqual(dates('month', '2026-11-25'), ['2026-11-01', '2026-11-30']);
  assert.deepEqual(dates('month', '2028-02-10'), ['2028-02-01', '2028-02-29']);
  assert.deepEqual(dates('month', '2026-12-31'), ['2026-12-01', '2026-12-31']);
});
