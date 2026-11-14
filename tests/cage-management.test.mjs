import test from 'node:test';
import assert from 'node:assert/strict';

const helpers = await import('../src/services/CageService/helpers.ts');
const urls = await import('../src/services/CageService/urls.ts');
const router = await import('../src/routerMap/ROUTER.ts');
const breadcrumb = await import('../src/routerMap/breadcrumbMap.ts');

test('CageService urls match backend /api/cages endpoints without /api/api prefix', () => {
  assert.equal(urls.apiCages, '/cages');
  assert.equal(
    urls.apiCageDetail('6ad96d4a9664da6b2c0d8d70'),
    '/cages/6ad96d4a9664da6b2c0d8d70'
  );
});

test('ROUTER exposes CAGES route at /cages', () => {
  assert.equal(router.default.CAGES, '/cages');
});

test('breadcrumbMap labels cages segment in Vietnamese', () => {
  assert.equal(breadcrumb.breadcrumbMap.cages, 'Chuồng');
});

test('cage sizes, statuses and sort keys match backend specification', () => {
  assert.deepEqual(helpers.CAGE_SIZES, ['S', 'M', 'L', 'XL']);
  assert.deepEqual(helpers.CAGE_STATUSES, ['Available', 'Occupied']);
  assert.ok(helpers.CAGE_SORTS.includes('label'));
  assert.ok(helpers.CAGE_SORTS.includes('-label'));
  assert.ok(helpers.CAGE_SORTS.includes('size'));
  assert.ok(helpers.CAGE_SORTS.includes('-size'));
  assert.ok(helpers.CAGE_SORTS.includes('status'));
  assert.ok(helpers.CAGE_SORTS.includes('-status'));
  assert.ok(helpers.CAGE_SORTS.includes('createdAt'));
  assert.ok(helpers.CAGE_SORTS.includes('-createdAt'));
  assert.ok(helpers.CAGE_SORTS.includes('updatedAt'));
  assert.ok(helpers.CAGE_SORTS.includes('-updatedAt'));
});

test('validateCageLabel enforces a non-empty trimmed string without adding a length limit', () => {
  assert.equal(helpers.validateCageLabel('  A-01  '), undefined);
  assert.equal(helpers.validateCageLabel('VIP-99'), undefined);
  assert.equal(helpers.validateCageLabel('a'.repeat(51)), undefined);
  assert.match(helpers.validateCageLabel(''), /bắt buộc/);
  assert.match(helpers.validateCageLabel('   '), /bắt buộc/);
  assert.match(helpers.validateCageLabel(undefined), /bắt buộc/);
  assert.match(helpers.validateCageLabel(null), /bắt buộc/);
});

test('validateCageSize enforces S, M, L, XL', () => {
  assert.equal(helpers.validateCageSize('S'), undefined);
  assert.equal(helpers.validateCageSize('M'), undefined);
  assert.equal(helpers.validateCageSize('L'), undefined);
  assert.equal(helpers.validateCageSize('XL'), undefined);
  assert.match(helpers.validateCageSize(''), /bắt buộc/);
  assert.match(helpers.validateCageSize(undefined), /bắt buộc/);
  assert.match(helpers.validateCageSize('XXL'), /một trong: S, M, L, XL/);
  assert.match(helpers.validateCageSize('Small'), /một trong: S, M, L, XL/);
});

test('validateCageIsolation enforces boolean when provided', () => {
  assert.equal(helpers.validateCageIsolation(true), undefined);
  assert.equal(helpers.validateCageIsolation(false), undefined);
  assert.equal(helpers.validateCageIsolation(undefined), undefined);
  assert.equal(helpers.validateCageIsolation(null), undefined);
  assert.match(helpers.validateCageIsolation('true'), /true hoặc false/);
  assert.match(helpers.validateCageIsolation(1), /true hoặc false/);
});

test('validateCageStatus enforces Available or Occupied', () => {
  assert.equal(helpers.validateCageStatus('Available'), undefined);
  assert.equal(helpers.validateCageStatus('Occupied'), undefined);
  assert.equal(helpers.validateCageStatus(undefined), undefined);
  assert.match(
    helpers.validateCageStatus('Unknown'),
    /một trong: Available, Occupied/
  );
});

test('validateCageCreateForm validates all required fields', () => {
  const invalid = helpers.validateCageCreateForm({});
  assert.ok(invalid.label);
  assert.ok(invalid.size);

  const valid = helpers.validateCageCreateForm({
    label: 'A-01',
    size: 'M',
    isIsolated: false,
    status: 'Available',
  });
  assert.deepEqual(valid, {});
});

test('validateCageUpdateForm requires at least one field and validates provided ones', () => {
  const empty = helpers.validateCageUpdateForm({});
  assert.ok(empty._form);

  const invalidField = helpers.validateCageUpdateForm({ label: '   ' });
  assert.ok(invalidField.label);

  const validSingle = helpers.validateCageUpdateForm({ isIsolated: true });
  assert.deepEqual(validSingle, {});

  const validFull = helpers.validateCageUpdateForm({
    label: 'B-02',
    size: 'L',
    status: 'Occupied',
    isIsolated: false,
  });
  assert.deepEqual(validFull, {});
});

test('buildCageCreatePayload whitelists only documented fields', () => {
  const payload = helpers.buildCageCreatePayload({
    label: '  C-03  ',
    size: 'XL',
    isIsolated: true,
    status: 'Occupied',
  });
  assert.deepEqual(payload, {
    label: 'C-03',
    size: 'XL',
    isIsolated: true,
    status: 'Occupied',
  });
  assert.equal(Object.keys(payload).length, 4);
});

test('buildCageUpdatePayload includes only provided fields with trimmed label', () => {
  const partial = helpers.buildCageUpdatePayload({
    label: '  D-04  ',
  });
  assert.deepEqual(partial, { label: 'D-04' });

  const boolOnly = helpers.buildCageUpdatePayload({
    isIsolated: false,
  });
  assert.deepEqual(boolOnly, { isIsolated: false });

  const multi = helpers.buildCageUpdatePayload({
    size: 'S',
    status: 'Available',
  });
  assert.deepEqual(multi, { size: 'S', status: 'Available' });
});

test('buildCageQuery serializes boolean to string and strips empty filters', () => {
  const emptyQuery = helpers.buildCageQuery({});
  assert.deepEqual(emptyQuery, {});

  const fullQuery = helpers.buildCageQuery({
    status: 'Available',
    size: 'M',
    isIsolated: true,
    sort: '-createdAt',
    page: 2,
    limit: 20,
  });
  assert.deepEqual(fullQuery, {
    status: 'Available',
    size: 'M',
    isIsolated: 'true',
    sort: '-createdAt',
    page: 2,
    limit: 20,
  });

  const falseIsolation = helpers.buildCageQuery({
    isIsolated: false,
  });
  assert.equal(falseIsolation.isIsolated, 'false');
});

test('extractApiError extracts 409 duplicate label, 400 validation and 403 messages', () => {
  const dupErr = helpers.extractApiError({
    response: {
      status: 409,
      data: { message: 'Nhãn chuồng đã tồn tại' },
    },
  });
  assert.equal(dupErr.status, 409);
  assert.equal(dupErr.message, 'Nhãn chuồng đã tồn tại');
  assert.equal(dupErr.fieldErrors.label, 'Nhãn chuồng đã tồn tại');

  const valErr = helpers.extractApiError({
    response: {
      status: 400,
      data: {
        message: 'Kích thước chuồng phải là một trong: S, M, L, XL',
        errors: [
          'Nhãn chuồng phải là chuỗi không rỗng',
          'Kích thước chuồng phải là một trong: S, M, L, XL',
        ],
      },
    },
  });
  assert.equal(valErr.status, 400);
  assert.ok(valErr.fieldErrors.label);
  assert.ok(valErr.fieldErrors.size);

  const forbiddenErr = helpers.extractApiError({
    response: { status: 403 },
  });
  assert.equal(forbiddenErr.status, 403);
  assert.match(forbiddenErr.message, /quyền/);
});
