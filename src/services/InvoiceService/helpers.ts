import type {
  CreateInvoicePayload,
  Invoice,
  InvoiceItem,
  InvoiceItemType,
  InvoiceOrderRef,
  InvoiceOwnerRef,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  InvoicePetRef,
  InvoiceProductLine,
  ListInvoicesParams,
} from '../../types/api/invoice.api';

/** Limits of the BE validator (invoice.validator.js) */
export const RETAIL_QUANTITY_MAX = 99;
export const PRESCRIPTION_QUANTITY_MAX = 999;
export const INVOICE_LIST_LIMIT_MAX = 100;
/** A VNPay link lives 15 minutes (JOB-04); the BE sends the exact end time */
export const VNPAY_LINK_MINUTES = 15;
/** How often SCR-20 asks whether the IPN has turned the invoice Paid */
export const VNPAY_POLL_MS = 5000;

export const INVOICE_STATUS_LABELS: Record<InvoicePaymentStatus, string> = {
  Unpaid: 'Chưa thanh toán',
  Paid: 'Đã thanh toán',
  Refunded: 'Đã hoàn tiền',
};

export const INVOICE_STATUS_COLORS: Record<InvoicePaymentStatus, string> = {
  Unpaid: 'orange',
  Paid: 'green',
  Refunded: 'default',
};

export const INVOICE_METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  Cash: 'Tiền mặt',
  VNPay: 'VNPay',
};

export const INVOICE_ITEM_TYPE_LABELS: Record<InvoiceItemType, string> = {
  Service: 'Dịch vụ',
  Product: 'Thuốc / sản phẩm',
  InpatientDay: 'Nội trú theo ngày',
};

export const INVOICE_STATUSES: InvoicePaymentStatus[] = [
  'Unpaid',
  'Paid',
  'Refunded',
];
export const INVOICE_METHODS: InvoicePaymentMethod[] = ['Cash', 'VNPay'];

/** SRS messages used on SCR-20 and SCR-15 */
export const MSG_PAYMENT_SUCCESS = 'Thanh toán thành công. Đơn đã hoàn tất.'; // MSG29
export const MSG_PAYMENT_FAILED =
  'Thanh toán thất bại hoặc đã bị hủy. Hãy thử lại hoặc chọn phương thức khác.'; // MSG30
export const MSG_PRODUCT_INACTIVE =
  'Sản phẩm này không khả dụng nên không thể kê đơn hay bán.'; // MSG27

/**
 * Nghiệp vụ 4.6: "Khi khách đến đón, lễ tân tạo hóa đơn. Khách thanh toán tiền
 * mặt hoặc quét QR VNPay." The owner pays at the desk, not in the app.
 */
export const PAY_AT_COUNTER_TEXT =
  'Lễ tân lập hóa đơn khi bạn đến đón bé. Bạn thanh toán tại quầy bằng tiền mặt hoặc quét mã VNPay.';

export const getInvoiceStatusLabel = (status?: string) =>
  INVOICE_STATUS_LABELS[status as InvoicePaymentStatus] || status || '-';

export const getInvoiceStatusColor = (status?: string) =>
  INVOICE_STATUS_COLORS[status as InvoicePaymentStatus] || 'default';

export const getInvoiceMethodLabel = (method?: string | null) =>
  method
    ? INVOICE_METHOD_LABELS[method as InvoicePaymentMethod] || method
    : '-';

export const getInvoiceItemTypeLabel = (type?: string) =>
  INVOICE_ITEM_TYPE_LABELS[type as InvoiceItemType] || type || '-';

/** 150000 → "150.000 đ" */
export const formatVnd = (amount?: number | null) =>
  `${Math.round(Number(amount) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')} đ`;

const asObject = <T extends { _id: string }>(value: unknown): T | undefined =>
  value && typeof value === 'object' ? (value as T) : undefined;

export const getInvoiceOrder = (invoice: Invoice) =>
  asObject<InvoiceOrderRef>(invoice.orderId);

/** The order id, populated or not */
export const getInvoiceOrderId = (invoice: Invoice): string | undefined => {
  if (typeof invoice.orderId === 'string') return invoice.orderId;
  return getInvoiceOrder(invoice)?._id;
};

export const getInvoiceOrderCode = (invoice: Invoice) =>
  getInvoiceOrder(invoice)?.code;

/** The pet comes with the order, or with the stay for an inpatient-only bill */
export const getInvoicePet = (invoice: Invoice): InvoicePetRef | undefined => {
  const fromOrder = asObject<InvoicePetRef>(getInvoiceOrder(invoice)?.petId);
  if (fromOrder) return fromOrder;
  const stay = asObject<{ _id: string; petId?: unknown }>(
    invoice.inpatientRecordId
  );
  return asObject<InvoicePetRef>(stay?.petId);
};

export const getInvoicePetId = (invoice: Invoice): string | undefined => {
  const pet = getInvoicePet(invoice);
  if (pet) return pet._id;
  const raw = getInvoiceOrder(invoice)?.petId;
  return typeof raw === 'string' ? raw : undefined;
};

export const getInvoiceOwner = (
  invoice: Invoice
): InvoiceOwnerRef | undefined =>
  asObject<InvoiceOwnerRef>(getInvoiceOrder(invoice)?.ownerId) ||
  asObject<InvoiceOwnerRef>(getInvoicePet(invoice)?.ownerId);

export const isInvoiceUnpaid = (invoice?: Pick<Invoice, 'paymentStatus'>) =>
  invoice?.paymentStatus === 'Unpaid';

/** Only product and medicine lines can come off an Unpaid bill (UC-45 5a) */
export const isRemovableInvoiceLine = (
  invoice: Pick<Invoice, 'paymentStatus'>,
  item: Pick<InvoiceItem, 'type'>
) => isInvoiceUnpaid(invoice) && item.type === 'Product';

/** Change to give back, or undefined while the cash does not cover the total */
export const getCashChange = (
  total: number,
  received?: number | null
): number | undefined => {
  if (typeof received !== 'number' || !Number.isFinite(received))
    return undefined;
  if (received < total) return undefined;
  return received - total;
};

/** Add `quantity` of a product to a list; the same product shares one line */
export const addProductLine = (
  lines: readonly InvoiceProductLine[],
  productId: string,
  quantity: number,
  max = RETAIL_QUANTITY_MAX
): InvoiceProductLine[] => {
  const id = productId.trim();
  const qty = Math.trunc(quantity);
  if (!id || !Number.isFinite(qty) || qty < 1) return [...lines];
  const existing = lines.find(line => line.productId === id);
  if (!existing)
    return [...lines, { productId: id, quantity: Math.min(qty, max) }];
  return lines.map(line =>
    line.productId === id
      ? { ...line, quantity: Math.min(line.quantity + qty, max) }
      : line
  );
};

const cleanLines = (
  lines: readonly InvoiceProductLine[] | undefined,
  max: number
): InvoiceProductLine[] => {
  let merged: InvoiceProductLine[] = [];
  for (const line of lines || []) {
    merged = addProductLine(merged, line.productId, line.quantity, max);
  }
  return merged;
};

export interface PrescribedProduct {
  productId: string;
  name: string;
  /** How many records prescribe it; each becomes its own line on the bill */
  lines: number;
}

/**
 * The medicines of an order's medical records, one entry per product. The BE
 * writes one bill line per prescription row and gives every row of a product
 * the quantity sent for that product.
 */
export const collectPrescribedProducts = (
  records: readonly {
    prescriptions?: readonly {
      productId: string | { _id: string };
      productNameSnapshot?: string;
      unitSnapshot?: string;
    }[];
  }[]
): PrescribedProduct[] => {
  const byId = new Map<string, PrescribedProduct>();
  for (const record of records) {
    for (const rx of record.prescriptions || []) {
      const id =
        typeof rx.productId === 'string' ? rx.productId : rx.productId?._id;
      if (!id) continue;
      const found = byId.get(id);
      if (found) {
        found.lines += 1;
        continue;
      }
      const base = rx.productNameSnapshot || 'Thuốc kê đơn';
      byId.set(id, {
        productId: id,
        name: rx.unitSnapshot ? `${base} (${rx.unitSnapshot})` : base,
        lines: 1,
      });
    }
  }
  return [...byId.values()];
};

/** Body of POST /api/invoices: merged lines, BE limits, no empty arrays */
export const buildCreateInvoicePayload = (input: {
  orderId: string;
  prescriptionQuantities?: readonly InvoiceProductLine[];
  retailItems?: readonly InvoiceProductLine[];
}): CreateInvoicePayload => {
  const payload: CreateInvoicePayload = { orderId: input.orderId.trim() };
  const rx = cleanLines(
    input.prescriptionQuantities,
    PRESCRIPTION_QUANTITY_MAX
  );
  const retail = cleanLines(input.retailItems, RETAIL_QUANTITY_MAX);
  if (rx.length) payload.prescriptionQuantities = rx;
  if (retail.length) payload.retailItems = retail;
  return payload;
};

/** Query of GET /api/invoices and /me without empty values */
export const buildInvoiceListQuery = (
  params?: ListInvoicesParams
): Record<string, string | number> => {
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed)
        query[key] = key === 'code' ? trimmed.toUpperCase() : trimmed;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      query[key] =
        key === 'limit'
          ? Math.min(Math.max(Math.trunc(value), 1), INVOICE_LIST_LIMIT_MAX)
          : Math.max(Math.trunc(value), 1);
    }
  }
  return query;
};

/**
 * GET /invoices/me?petId= still returns the bills of every pet of the owner
 * (the BE matches the owner's orders before the pet), so keep one pet here.
 */
export const filterInvoicesByPet = (
  invoices: readonly Invoice[],
  petId?: string
) =>
  petId
    ? invoices.filter(invoice => getInvoicePetId(invoice) === petId)
    : [...invoices];

/** Bills by order code, for the pet timeline milestones */
export const indexInvoicesByOrderCode = (invoices: readonly Invoice[]) => {
  const map = new Map<string, Invoice>();
  for (const invoice of invoices) {
    const code = getInvoiceOrderCode(invoice);
    if (code && !map.has(code)) map.set(code, invoice);
  }
  return map;
};

/** Seconds left on a VNPay link, never below 0 */
export const getSecondsLeft = (expiresAt: string, now = Date.now()) => {
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - now) / 1000));
};

/** 899 → "14:59" */
export const formatCountdown = (seconds: number) => {
  const safe = Math.max(0, Math.trunc(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

interface ApiErrorLike {
  message?: string;
  response?: {
    status?: number;
    data?: { message?: string; errors?: unknown } | null;
  };
}

/**
 * The invoice API answers `{ message, errors: { field: text } }`; show the
 * message and the first field text when they differ.
 */
export const readInvoiceError = (error: unknown, fallback: string) => {
  const candidate = error as ApiErrorLike | undefined;
  const data = candidate?.response?.data;
  const status = candidate?.response?.status;
  const message = data?.message || fallback;
  let detail: string | undefined;
  const errors = data?.errors;
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const first = Object.values(errors as Record<string, unknown>).find(
      value => typeof value === 'string' && value
    );
    if (typeof first === 'string' && first !== message) detail = first;
  }
  return {
    status,
    message: detail ? `${message}: ${detail}` : message,
  };
};

/** The 409 the BE answers while the pet is still admitted */
export const isStillAdmittedError = (message?: string) =>
  Boolean(message && /nội trú/i.test(message) && /xuất viện/i.test(message));

/** Name of the downloaded receipt */
export const getInvoicePdfName = (invoice: Pick<Invoice, 'code'>) =>
  `${invoice.code || 'hoa-don'}.pdf`;
