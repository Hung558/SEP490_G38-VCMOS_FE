import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addProductLine,
  buildCreateInvoicePayload,
  buildInvoiceListQuery,
  collectBillableSubtasks,
  collectPrescribedProducts,
  filterInvoicesByPet,
  formatCountdown,
  formatVnd,
  getCashChange,
  getInvoiceMethodLabel,
  getInvoiceOrderCode,
  getInvoiceOrderId,
  getInvoiceOwner,
  getInvoicePdfName,
  getInvoicePet,
  getInvoicePetId,
  getInvoiceStatusLabel,
  getSecondsLeft,
  indexInvoicesByOrderCode,
  isRemovableInvoiceLine,
  isStillAdmittedError,
  readInvoiceError,
} from '../src/services/InvoiceService/helpers.ts';
import { getReceptionNextAction } from '../src/pages/AppointmentReception/components/receptionToday.ts';

const PET_A = '6ad96d4a9664da6b2c0d8d70';
const PET_B = '6ad96d4a9664da6b2c0d8d71';
const OWNER = { _id: 'o1', fullName: 'Chủ Pet Một', phone: '0944000004' };

const invoice = (overrides = {}) => ({
  _id: 'i1',
  code: 'INV-K8M2PX',
  orderId: {
    _id: 'ord1',
    code: 'APT-A1B2C3',
    petId: { _id: PET_A, name: 'Bông' },
    ownerId: OWNER,
  },
  inpatientRecordId: null,
  items: [],
  totalAmount: 150000,
  paymentMethod: null,
  paymentStatus: 'Unpaid',
  ...overrides,
});

test('H1: VND amounts use dots and the đ sign', () => {
  assert.equal(formatVnd(150000), '150.000 đ');
  assert.equal(formatVnd(0), '0 đ');
  assert.equal(formatVnd(1234567.4), '1.234.567 đ');
  assert.equal(formatVnd(undefined), '0 đ');
});

test('H1: status and method labels', () => {
  assert.equal(getInvoiceStatusLabel('Unpaid'), 'Chưa thanh toán');
  assert.equal(getInvoiceStatusLabel('Paid'), 'Đã thanh toán');
  assert.equal(getInvoiceMethodLabel('Cash'), 'Tiền mặt');
  assert.equal(getInvoiceMethodLabel(null), '-');
});

test('H1: order, pet and owner come from the order or from the stay', () => {
  const fromOrder = invoice();
  assert.equal(getInvoiceOrderId(fromOrder), 'ord1');
  assert.equal(getInvoiceOrderCode(fromOrder), 'APT-A1B2C3');
  assert.equal(getInvoicePet(fromOrder)?.name, 'Bông');
  assert.equal(getInvoicePetId(fromOrder), PET_A);
  assert.equal(getInvoiceOwner(fromOrder)?.phone, '0944000004');

  const stayOnly = invoice({
    orderId: null,
    inpatientRecordId: {
      _id: 'inp1',
      petId: { _id: PET_B, name: 'Mực', ownerId: OWNER },
    },
  });
  assert.equal(getInvoiceOrderId(stayOnly), undefined);
  assert.equal(getInvoicePetId(stayOnly), PET_B);
  assert.equal(getInvoiceOwner(stayOnly)?.fullName, 'Chủ Pet Một');

  assert.equal(getInvoiceOrderId(invoice({ orderId: 'raw-id' })), 'raw-id');
});

test('H4/K1: only product lines of an Unpaid bill can be removed', () => {
  const unpaid = { paymentStatus: 'Unpaid' };
  assert.equal(isRemovableInvoiceLine(unpaid, { type: 'Product' }), true);
  assert.equal(isRemovableInvoiceLine(unpaid, { type: 'Service' }), false);
  assert.equal(isRemovableInvoiceLine(unpaid, { type: 'InpatientDay' }), false);
  assert.equal(
    isRemovableInvoiceLine({ paymentStatus: 'Paid' }, { type: 'Product' }),
    false
  );
});

test('H5: change is shown only once the cash covers the total', () => {
  assert.equal(getCashChange(320000, 500000), 180000);
  assert.equal(getCashChange(320000, 320000), 0);
  assert.equal(getCashChange(320000, 319999), undefined);
  assert.equal(getCashChange(320000, null), undefined);
  assert.equal(getCashChange(320000, Number.NaN), undefined);
});

test('K1: the same product shares one line, capped at the BE limit', () => {
  let lines = addProductLine([], 'p1', 2);
  lines = addProductLine(lines, 'p2', 1);
  lines = addProductLine(lines, 'p1', 3);
  assert.deepEqual(lines, [
    { productId: 'p1', quantity: 5 },
    { productId: 'p2', quantity: 1 },
  ]);
  assert.deepEqual(addProductLine(lines, 'p2', 200)[1], {
    productId: 'p2',
    quantity: 99,
  });
  assert.deepEqual(addProductLine(lines, 'p3', 0), lines);
  assert.deepEqual(addProductLine(lines, '  ', 1), lines);
});

test('H3: prescriptions are listed once per product with name and unit', () => {
  const products = collectPrescribedProducts([
    {
      prescriptions: [
        {
          productId: 'm1',
          productNameSnapshot: 'Amoxicillin',
          unitSnapshot: 'viên',
        },
        { productId: 'm2', productNameSnapshot: 'Men tiêu hóa' },
      ],
    },
    {
      prescriptions: [
        { productId: { _id: 'm1' }, productNameSnapshot: 'Amoxicillin' },
      ],
    },
    {},
  ]);
  assert.deepEqual(products, [
    { productId: 'm1', name: 'Amoxicillin (viên)', lines: 2 },
    { productId: 'm2', name: 'Men tiêu hóa', lines: 1 },
  ]);
});

test('BE PR #58: only completed sub-tasks linked to a catalog service are billed', () => {
  const catalog = {
    s1: { name: 'Xét nghiệm máu', basePrice: 200000 },
    s2: { name: 'Chụp X-quang', basePrice: 0 },
  };
  const lines = collectBillableSubtasks(
    [
      {
        _id: 't1',
        status: 'Completed',
        taskType: 'xét nghiệm máu',
        serviceId: { _id: 's1', name: 'Xét nghiệm máu' },
      },
      // Not done yet: not billed
      { _id: 't2', status: 'InProgress', serviceId: { _id: 's1' } },
      { _id: 't3', status: 'Pending', serviceId: 's2' },
      // Typed by hand or picked from the common list: no service, not billed
      { _id: 't4', status: 'Completed', taskType: 'Siêu âm', serviceId: null },
      { _id: 't5', status: 'Completed', taskType: 'Cạo lông' },
      // Unpopulated ref: name from the catalog; a 0 price is still a price
      { _id: 't6', status: 'Completed', taskType: 'X-quang', serviceId: 's2' },
      // The same service ordered twice is two lines, like on the bill
      { _id: 't7', status: 'Completed', serviceId: { _id: 's1' } },
      // Listed twice (two fetches): counted once
      { _id: 't1', status: 'Completed', serviceId: { _id: 's1' } },
    ],
    catalog
  );
  assert.deepEqual(lines, [
    { id: 't1', serviceId: 's1', name: 'Xét nghiệm máu', price: 200000 },
    { id: 't6', serviceId: 's2', name: 'Chụp X-quang', price: 0 },
    { id: 't7', serviceId: 's1', name: 'Xét nghiệm máu', price: 200000 },
  ]);
});

test('BE PR #58: without the catalog the sub-task line has no price', () => {
  assert.deepEqual(
    collectBillableSubtasks([
      {
        _id: 't1',
        status: 'Completed',
        taskType: 'Siêu âm',
        serviceId: 'gone',
      },
      {
        _id: 't2',
        status: 'Completed',
        serviceId: { _id: 's9', name: 'Siêu âm bụng' },
      },
    ]),
    [
      { id: 't1', serviceId: 'gone', name: 'Siêu âm' },
      { id: 't2', serviceId: 's9', name: 'Siêu âm bụng' },
    ]
  );
  assert.deepEqual(collectBillableSubtasks([]), []);
});

test('H3: the create body merges lines and drops empty arrays', () => {
  assert.deepEqual(buildCreateInvoicePayload({ orderId: ' ord1 ' }), {
    orderId: 'ord1',
  });
  assert.deepEqual(
    buildCreateInvoicePayload({
      orderId: 'ord1',
      prescriptionQuantities: [
        { productId: 'm1', quantity: 2 },
        { productId: 'm1', quantity: 1000 },
      ],
      retailItems: [
        { productId: 'r1', quantity: 1 },
        { productId: 'r1', quantity: 1 },
      ],
    }),
    {
      orderId: 'ord1',
      prescriptionQuantities: [{ productId: 'm1', quantity: 999 }],
      retailItems: [{ productId: 'r1', quantity: 2 }],
    }
  );
});

test('K3/K4: list query drops empties, uppercases the code, caps the limit', () => {
  assert.deepEqual(
    buildInvoiceListQuery({
      paymentStatus: 'Paid',
      code: ' inv-k8m2px ',
      petId: '',
      from: '2026-11-01',
      to: undefined,
      page: 2,
      limit: 500,
    }),
    {
      paymentStatus: 'Paid',
      code: 'INV-K8M2PX',
      from: '2026-11-01',
      page: 2,
      limit: 100,
    }
  );
  assert.deepEqual(buildInvoiceListQuery(), {});
});

test('H7/K3: pet filter is applied on the FE because /me?petId ignores it', () => {
  const list = [
    invoice({ _id: 'a' }),
    invoice({
      _id: 'b',
      orderId: {
        _id: 'ord2',
        code: 'APT-2',
        petId: { _id: PET_B, name: 'Mực' },
      },
    }),
  ];
  assert.deepEqual(
    filterInvoicesByPet(list, PET_B).map(i => i._id),
    ['b']
  );
  assert.equal(filterInvoicesByPet(list).length, 2);
});

test('H7: bills attach to the timeline milestone with the same order code', () => {
  const map = indexInvoicesByOrderCode([
    invoice(),
    invoice({ _id: 'dup', code: 'INV-OTHER' }),
    invoice({ _id: 'stay', orderId: null }),
  ]);
  assert.equal(map.size, 1);
  assert.equal(map.get('APT-A1B2C3')?.code, 'INV-K8M2PX');
});

test('H6: the VNPay countdown never goes below zero', () => {
  const now = Date.parse('2026-11-17T08:30:00.000Z');
  assert.equal(getSecondsLeft('2026-11-17T08:45:00.000Z', now), 900);
  assert.equal(getSecondsLeft('2026-11-17T08:29:00.000Z', now), 0);
  assert.equal(getSecondsLeft('not a date', now), 0);
  assert.equal(formatCountdown(899), '14:59');
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(-5), '00:00');
});

test('H3: BE errors keep the message and the first field text', () => {
  assert.deepEqual(
    readInvoiceError(
      {
        response: {
          status: 400,
          data: {
            message: 'Dữ liệu lập hóa đơn không hợp lệ',
            errors: {
              'retailItems[0].quantity':
                'Số lượng phải là số nguyên từ 1 đến 99',
            },
          },
        },
      },
      'fallback'
    ),
    {
      status: 400,
      message:
        'Dữ liệu lập hóa đơn không hợp lệ: Số lượng phải là số nguyên từ 1 đến 99',
    }
  );
  assert.deepEqual(readInvoiceError(new Error('Network'), 'Không lập được'), {
    status: undefined,
    message: 'Không lập được',
  });
  assert.equal(
    isStillAdmittedError(
      'Thú cưng đang trong đợt điều trị nội trú, cần xuất viện trước khi lập hóa đơn'
    ),
    true
  );
  assert.equal(isStillAdmittedError('Đơn đã có hóa đơn'), false);
});

test('K2: the receipt is named after the invoice code', () => {
  assert.equal(getInvoicePdfName({ code: 'INV-K8M2PX' }), 'INV-K8M2PX.pdf');
});

test('H2: a Wait Owner order asks the receptionist to bill it', () => {
  assert.deepEqual(getReceptionNextAction('WaitOwner'), {
    kind: 'checkout',
    hint: 'Lập hóa đơn và thu tiền khi chủ đến đón',
  });
});
