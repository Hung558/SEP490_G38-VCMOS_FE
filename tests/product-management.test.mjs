import test from 'node:test';
import assert from 'node:assert/strict';

const helpers = await import('../src/services/ProductService/helpers.ts');
const urls = await import('../src/services/ProductService/urls.ts');

test('ProductService urls match backend /api/products endpoints', () => {
  assert.equal(urls.apiProducts, '/products');
  assert.equal(urls.apiProductDetail('prd123'), '/products/prd123');
  assert.equal(urls.apiProductActivate('prd123'), '/products/prd123/activate');
  assert.equal(urls.apiProductInactivate('prd123'), '/products/prd123/inactivate');
});

test('ROUTER exposes the admin products route under /admin', async () => {
  const { default: ROUTER } = await import('../src/routerMap/ROUTER.ts');
  assert.equal(ROUTER.ADMIN_PRODUCTS, '/admin/products');
});

test('breadcrumbMap labels the products segment in Vietnamese', async () => {
  const { breadcrumbMap } = await import('../src/routerMap/breadcrumbMap.ts');
  assert.equal(breadcrumbMap.products, 'Quản lý sản phẩm');
  assert.equal(breadcrumbMap.services, 'Quản lý dịch vụ');
  assert.equal(breadcrumbMap.users, 'Quản lý tài khoản');
});

test('product categories and statuses match backend enums', () => {
  assert.deepEqual(helpers.PRODUCT_CATEGORIES, [
    'Medicine',
    'Vaccine',
    'Retail',
  ]);
  assert.deepEqual(helpers.PRODUCT_STATUSES, ['Active', 'Inactive']);
});

test('validateProductName trims and enforces 1-200 characters', () => {
  assert.equal(helpers.validateProductName('  Paracetamol 500mg  '), undefined);
  assert.match(helpers.validateProductName('   '), /bắt buộc/);
  assert.match(helpers.validateProductName(undefined), /bắt buộc/);
  assert.match(helpers.validateProductName('a'.repeat(201)), /vượt quá 200/);
  assert.equal(helpers.validateProductName('a'.repeat(200)), undefined);
});

test('validateProductCategory requires valid category', () => {
  assert.equal(helpers.validateProductCategory('Medicine'), undefined);
  assert.equal(helpers.validateProductCategory('Vaccine'), undefined);
  assert.equal(helpers.validateProductCategory('Retail'), undefined);
  assert.match(helpers.validateProductCategory(''), /bắt buộc/);
  assert.match(helpers.validateProductCategory('Other'), /một trong/);
});

test('validateProductUnit trims and enforces 1-50 characters', () => {
  assert.equal(helpers.validateProductUnit('  Hộp  '), undefined);
  assert.match(helpers.validateProductUnit('   '), /bắt buộc/);
  assert.match(helpers.validateProductUnit(undefined), /bắt buộc/);
  assert.match(helpers.validateProductUnit('u'.repeat(51)), /vượt quá 50/);
  assert.equal(helpers.validateProductUnit('u'.repeat(50)), undefined);
});

test('validateProductUnitPrice allows undefined, 0, decimals but rejects negatives/non-finite', () => {
  assert.equal(helpers.validateProductUnitPrice(undefined), undefined);
  assert.equal(helpers.validateProductUnitPrice(null), undefined);
  assert.equal(helpers.validateProductUnitPrice(''), undefined);
  assert.equal(helpers.validateProductUnitPrice(0), undefined);
  assert.equal(helpers.validateProductUnitPrice(15000), undefined);
  assert.equal(helpers.validateProductUnitPrice('25000.5'), undefined);
  assert.match(helpers.validateProductUnitPrice(-10), /không âm/);
  assert.match(helpers.validateProductUnitPrice(Infinity), /không âm/);
  assert.match(helpers.validateProductUnitPrice('invalid'), /không âm/);
});

test('validateProductForm reports all invalid fields at once', () => {
  const errors = helpers.validateProductForm({
    name: '  ',
    category: 'Invalid',
    unit: '',
    unitPrice: -500,
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    'category',
    'name',
    'unit',
    'unitPrice',
  ]);

  const valid = helpers.validateProductForm({
    name: 'Kháng sinh Amoxicillin',
    category: 'Medicine',
    unit: 'Lọ',
    unitPrice: 85000,
  });
  assert.deepEqual(valid, {});
});

test('buildProductPayload trims fields and includes unitPrice only when provided', () => {
  const payload = helpers.buildProductPayload({
    name: '  Vắc xin dại  ',
    category: 'Vaccine',
    unit: '  Liều  ',
    unitPrice: 120000,
  });
  assert.deepEqual(payload, {
    name: 'Vắc xin dại',
    category: 'Vaccine',
    unit: 'Liều',
    unitPrice: 120000,
  });

  const withoutPrice = helpers.buildProductPayload({
    name: 'Vòng cổ trị ve',
    category: 'Retail',
    unit: 'Cái',
  });
  assert.deepEqual(withoutPrice, {
    name: 'Vòng cổ trị ve',
    category: 'Retail',
    unit: 'Cái',
  });
});

test('buildProductUpdatePayload only includes provided fields and never status or code', () => {
  const update = helpers.buildProductUpdatePayload({
    name: '  Tên mới  ',
    unitPrice: 50000,
  });
  assert.deepEqual(update, {
    name: 'Tên mới',
    unitPrice: 50000,
  });
  assert.equal(update.code, undefined);
  assert.equal(update.status, undefined);
});

test('buildProductQuery formats search, category, status, page, limit', () => {
  const query = helpers.buildProductQuery({
    search: '  para  ',
    category: 'Medicine',
    status: 'Active',
    page: 2,
    limit: 10,
  });
  assert.deepEqual(query, {
    search: 'para',
    category: 'Medicine',
    status: 'Active',
    page: 2,
    limit: 10,
  });

  const empty = helpers.buildProductQuery(undefined);
  assert.deepEqual(empty, {});
});

test('formatProductPrice renders VND format or fallback dash', () => {
  assert.equal(helpers.formatProductPrice(undefined), '—');
  assert.equal(helpers.formatProductPrice(null), '—');
  assert.match(helpers.formatProductPrice(50000), /50[.,]000\s*đ/);
});

test('extractApiError reads message and field errors from BE shape', () => {
  const err = {
    response: {
      data: {
        message: 'Dữ liệu không hợp lệ',
        errors: [
          { field: 'name', message: 'Tên sản phẩm là bắt buộc' },
          { field: 'unit', message: 'Đơn vị tính là bắt buộc' },
        ],
      },
    },
  };
  const parsed = helpers.extractApiError(err);
  assert.equal(parsed.message, 'Dữ liệu không hợp lệ');
  assert.equal(parsed.fieldErrors.name, 'Tên sản phẩm là bắt buộc');
  assert.equal(parsed.fieldErrors.unit, 'Đơn vị tính là bắt buộc');
});
