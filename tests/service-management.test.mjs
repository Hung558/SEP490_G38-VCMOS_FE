import test from 'node:test';
import assert from 'node:assert/strict';

const helpers = await import('../src/services/ServiceService/helpers.ts');
const urls = await import('../src/services/ServiceService/urls.ts');

test('ServiceService urls match backend /api/services endpoints', () => {
  assert.equal(urls.apiServices, '/services');
  assert.equal(urls.apiServiceDetail('abc123'), '/services/abc123');
  assert.equal(urls.apiServiceStatus('abc123'), '/services/abc123/status');
});

test('ROUTER exposes the admin services route under /admin', async () => {
  const { default: ROUTER } = await import('../src/routerMap/ROUTER.ts');
  assert.equal(ROUTER.ADMIN_SERVICES, '/admin/services');
});

test('breadcrumbMap labels the services segment in Vietnamese', async () => {
  const { breadcrumbMap } = await import('../src/routerMap/breadcrumbMap.ts');
  assert.equal(breadcrumbMap.services, 'Quản lý dịch vụ');
  assert.equal(breadcrumbMap.users, 'Quản lý tài khoản');
});

test('service categories and statuses match backend enums', () => {
  assert.deepEqual(helpers.SERVICE_CATEGORIES, [
    'Examination',
    'Vaccination',
    'Grooming',
    'Paraclinical',
    'Inpatient',
  ]);
  assert.deepEqual(helpers.SERVICE_STATUSES, ['Active', 'Inactive']);
});

test('validateServiceName trims and enforces 3-100 characters', () => {
  assert.equal(helpers.validateServiceName('  Khám tổng quát  '), undefined);
  assert.match(helpers.validateServiceName('   '), /bắt buộc/);
  assert.match(helpers.validateServiceName(undefined), /bắt buộc/);
  assert.match(helpers.validateServiceName('ab'), /ít nhất 3/);
  assert.match(helpers.validateServiceName('a'.repeat(101)), /vượt quá 100/);
  assert.equal(helpers.validateServiceName('a'.repeat(100)), undefined);
});

test('validateServiceDuration requires integer 5-480 minutes', () => {
  assert.equal(helpers.validateServiceDuration(5), undefined);
  assert.equal(helpers.validateServiceDuration(480), undefined);
  assert.equal(helpers.validateServiceDuration('30'), undefined);
  assert.match(helpers.validateServiceDuration(4), /số nguyên từ 5 đến 480/);
  assert.match(helpers.validateServiceDuration(481), /số nguyên từ 5 đến 480/);
  assert.match(helpers.validateServiceDuration(30.5), /số nguyên/);
  assert.match(helpers.validateServiceDuration(null), /bắt buộc/);
  assert.match(helpers.validateServiceDuration(''), /bắt buộc/);
});

test('validateServicePrice allows 0 and decimals but rejects negatives/non-finite', () => {
  assert.equal(helpers.validateServicePrice(0), undefined);
  assert.equal(helpers.validateServicePrice(150000), undefined);
  assert.equal(helpers.validateServicePrice(1999.5), undefined);
  assert.match(helpers.validateServicePrice(-1), /lớn hơn hoặc bằng 0/);
  assert.match(helpers.validateServicePrice(Infinity), /lớn hơn hoặc bằng 0/);
  assert.match(helpers.validateServicePrice('abc'), /lớn hơn hoặc bằng 0/);
  assert.match(helpers.validateServicePrice(undefined), /bắt buộc/);
});

test('validateServiceDescription caps trimmed length at 500', () => {
  assert.equal(helpers.validateServiceDescription(''), undefined);
  assert.equal(helpers.validateServiceDescription(undefined), undefined);
  assert.equal(helpers.validateServiceDescription('a'.repeat(500)), undefined);
  assert.match(
    helpers.validateServiceDescription(`  ${'a'.repeat(501)}  `),
    /vượt quá 500/
  );
});

test('validateServiceForm reports every invalid field at once', () => {
  const { isValid, errors } = helpers.validateServiceForm({
    name: 'ab',
    category: 'Unknown',
    defaultDuration: 0,
    basePrice: -5,
    description: 'x'.repeat(501),
  });
  assert.equal(isValid, false);
  assert.deepEqual(Object.keys(errors).sort(), [
    'basePrice',
    'category',
    'defaultDuration',
    'description',
    'name',
  ]);

  const valid = helpers.validateServiceForm({
    name: 'Khám tổng quát',
    category: 'Examination',
    defaultDuration: 30,
    basePrice: 150000,
  });
  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.errors, {});
});

test('buildServicePayload trims fields and only sends whitelisted keys', () => {
  const payload = helpers.buildServicePayload({
    name: '  Khám tổng quát  ',
    category: 'Examination',
    defaultDuration: '30',
    basePrice: '150000',
    description: '  Mô tả  ',
    status: 'Inactive',
    // @ts-expect-error extra form-only fields must not leak into the payload
    _id: 'should-not-be-sent',
  });
  assert.deepEqual(payload, {
    name: 'Khám tổng quát',
    category: 'Examination',
    defaultDuration: 30,
    basePrice: 150000,
    description: 'Mô tả',
  });
});

test('buildServicePayload keeps empty description to clear it, and omits status on update', () => {
  const cleared = helpers.buildServicePayload({
    name: 'Khám tổng quát',
    category: 'Examination',
    defaultDuration: 30,
    basePrice: 0,
    description: '',
    status: 'Inactive',
  });
  assert.equal(cleared.description, '');
  assert.equal(cleared.status, undefined);
  assert.equal('status' in cleared, false);

  const created = helpers.buildServicePayload(
    {
      name: 'Khám tổng quát',
      category: 'Examination',
      defaultDuration: 30,
      basePrice: 0,
      status: 'Active',
    },
    { includeStatus: true }
  );
  assert.equal(created.status, 'Active');
});

test('buildServiceQuery drops empty filters and trims search', () => {
  assert.deepEqual(
    helpers.buildServiceQuery({ search: '  khám  ', category: undefined, status: undefined }),
    { search: 'khám' }
  );
  assert.deepEqual(helpers.buildServiceQuery({ search: '   ' }), {});
  assert.deepEqual(
    helpers.buildServiceQuery({ category: 'Grooming', status: 'Active' }),
    { category: 'Grooming', status: 'Active' }
  );
});

test('formatServicePrice renders VND and never fakes missing prices as 0', () => {
  assert.match(helpers.formatServicePrice(150000), /150\.000/);
  assert.match(helpers.formatServicePrice(150000), /đ$/);
  assert.equal(helpers.formatServicePrice(undefined), '—');
  assert.equal(helpers.formatServicePrice(null), '—');
  assert.equal(helpers.formatServiceDuration(undefined), '—');
  assert.equal(helpers.formatServiceDuration(30), '30 phút');
});

test('extractApiError reads message and field errors from BE error shape', () => {
  const result = helpers.extractApiError(
    {
      response: {
        status: 400,
        data: {
          message: 'Tên dịch vụ đã tồn tại trong danh mục này',
          errors: { name: 'Tên dịch vụ đã tồn tại trong danh mục này' },
        },
      },
    },
    'fallback'
  );
  assert.equal(result.message, 'Tên dịch vụ đã tồn tại trong danh mục này');
  assert.deepEqual(result.fieldErrors, {
    name: 'Tên dịch vụ đã tồn tại trong danh mục này',
  });
});

test('extractApiError falls back when the error has no response', () => {
  assert.deepEqual(helpers.extractApiError(new Error('Network Error'), 'fallback'), {
    message: 'Network Error',
    fieldErrors: {},
  });
  assert.deepEqual(helpers.extractApiError(undefined, 'fallback'), {
    message: 'fallback',
    fieldErrors: {},
  });
});
