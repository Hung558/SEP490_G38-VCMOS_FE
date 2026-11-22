import type {
  BestSellingParams,
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
  PayosPayment,
  UpdateInvoiceItemsPayload,
} from '../../types/api/invoice.api';

/** Limits of the BE validator (invoice.validator.js) */
export const RETAIL_QUANTITY_MAX = 99;
export const PRESCRIPTION_QUANTITY_MAX = 999;
export const INVOICE_LIST_LIMIT_MAX = 100;
/** A VNPay link lives 15 minutes (JOB-04); the BE sends the exact end time */
export const VNPAY_LINK_MINUTES = 15;
/** How often SCR-20 asks whether the IPN has turned the invoice Paid */
export const VNPAY_POLL_MS = 5000;
/** How often SCR-20 asks PayOS (through the BE) whether the transfer arrived */
export const PAYOS_POLL_MS = 5000;
/** Slower while the receptionist looks at another method: still catches a late scan */
export const PAYOS_POLL_HIDDEN_MS = 15000;
/** localStorage key of the live PayOS code of one invoice */
export const PAYOS_CACHE_PREFIX = 'vcmos.payos.';
/** Limits of the best-selling report (invoice.validator.js) */
export const BEST_SELLING_LIMIT_MAX = 50;
export const BEST_SELLING_MAX_DAYS = 366;

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
  // Same words as the BE receipt PDF
  PayOS: 'PayOS (VietQR)',
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
export const INVOICE_METHODS: InvoicePaymentMethod[] = [
  'Cash',
  'VNPay',
  'PayOS',
];

const PAYOS_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Đang chờ khách chuyển khoản',
  PROCESSING: 'PayOS đang xử lý giao dịch',
  PAID: 'Đã thanh toán',
  UNDERPAID: 'Khách chuyển thiếu tiền',
  CANCELLED: 'Giao dịch đã bị hủy',
  EXPIRED: 'Mã đã hết hạn',
  FAILED: 'Giao dịch thất bại',
};

export const getPayosStatusLabel = (status?: string | null) =>
  status ? PAYOS_STATUS_LABELS[status] || status : '-';

/**
 * A PayOS code that can no longer take money. Only then is a new code safe:
 * the BE replaces the invoice's code, so a transfer made with the old code
 * would never mark the invoice Paid.
 */
export const isPayosCodeClosed = (status?: string | null) =>
  status === 'CANCELLED' || status === 'EXPIRED' || status === 'FAILED';

/** An Unpaid bill that already got a PayOS code, e.g. before the modal closed */
export const hasPendingPayosCode = (
  invoice?: Pick<Invoice, 'paymentStatus' | 'payosOrderCode'>
) =>
  invoice?.paymentStatus === 'Unpaid' &&
  typeof invoice.payosOrderCode === 'number' &&
  Number.isFinite(invoice.payosOrderCode);

/**
 * The BE hands out the VietQR text only once, when the code is made, and keeps
 * just the order code. This browser keeps the whole code until it expires, so
 * closing the checkout does not cost a new code (which would orphan a transfer
 * made with the old one) or extra calls to PayOS.
 */
export interface PayosCacheStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const browserStorage = (): PayosCacheStorage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined; // blocked site data, private mode
  }
};

const payosCacheKey = (invoiceId: string) =>
  `${PAYOS_CACHE_PREFIX}${invoiceId}`;

export const clearPayosPayment = (
  invoiceId: string,
  storage: PayosCacheStorage | undefined = browserStorage()
) => {
  try {
    storage?.removeItem(payosCacheKey(invoiceId));
  } catch {
    // nothing to do: the code simply is not restored
  }
};

/** Drop expired or broken codes of any invoice */
export const prunePayosPayments = (
  storage: PayosCacheStorage | undefined = browserStorage(),
  now = Date.now()
) => {
  try {
    if (!storage) return;
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (!key?.startsWith(PAYOS_CACHE_PREFIX)) continue;
      let alive = false;
      try {
        const saved = JSON.parse(storage.getItem(key) || 'null');
        alive = getSecondsLeft(String(saved?.expiresAt), now) > 0;
      } catch {
        alive = false;
      }
      if (!alive) storage.removeItem(key);
    }
  } catch {
    // storage unavailable
  }
};

export const savePayosPayment = (
  payment: PayosPayment,
  storage: PayosCacheStorage | undefined = browserStorage(),
  now = Date.now()
) => {
  try {
    prunePayosPayments(storage, now);
    storage?.setItem(
      payosCacheKey(String(payment.invoiceId)),
      JSON.stringify(payment)
    );
  } catch {
    // full or blocked storage: the panel still works, without restoring
  }
};

/**
 * The saved code of this bill, only while it is the code the BE holds, for the
 * current total, and not expired; anything else is dropped.
 */
export const readPayosPayment = (
  invoice: Pick<
    Invoice,
    '_id' | 'paymentStatus' | 'payosOrderCode' | 'totalAmount'
  >,
  storage: PayosCacheStorage | undefined = browserStorage(),
  now = Date.now()
): PayosPayment | undefined => {
  try {
    const raw = storage?.getItem(payosCacheKey(invoice._id));
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as Partial<PayosPayment> | null;
    const usable =
      invoice.paymentStatus === 'Unpaid' &&
      typeof saved?.qrCode === 'string' &&
      saved.qrCode.length > 0 &&
      Number(saved.orderCode) === invoice.payosOrderCode &&
      Number(saved.amount) === invoice.totalAmount &&
      getSecondsLeft(String(saved.expiresAt), now) > 0;
    if (!usable) {
      clearPayosPayment(invoice._id, storage);
      return undefined;
    }
    return saved as PayosPayment;
  } catch {
    clearPayosPayment(invoice._id, storage);
    return undefined;
  }
};

/** PayOS page of a code made elsewhere: it shows that code's QR */
export const getPayosCheckoutUrl = (paymentLinkId?: string | null) =>
  paymentLinkId && /^[A-Za-z0-9]+$/.test(paymentLinkId)
    ? `https://pay.payos.vn/web/${paymentLinkId}`
    : undefined;

/** Query of the best-selling report without empty values, limit kept to 1..50 */
export const buildBestSellingQuery = (
  params?: BestSellingParams
): Record<string, string | number> => {
  const query: Record<string, string | number> = {};
  for (const key of ['from', 'to', 'category', 'sortBy'] as const) {
    const value = params?.[key]?.trim();
    if (value) query[key] = value;
  }
  const limit = params?.limit;
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    query.limit = Math.min(
      Math.max(Math.trunc(limit), 1),
      BEST_SELLING_LIMIT_MAX
    );
  }
  return query;
};

/** SRS messages used on SCR-20 and SCR-15 */
export const MSG_PAYMENT_SUCCESS = 'Thanh toán thành công. Đơn đã hoàn tất.'; // MSG29
export const MSG_PAYMENT_FAILED =
  'Thanh toán thất bại hoặc đã bị hủy. Hãy thử lại hoặc chọn phương thức khác.'; // MSG30
export const MSG_PRODUCT_INACTIVE =
  'Sản phẩm này không khả dụng nên không thể kê đơn hay bán.'; // MSG27

/**
 * Nghiệp vụ 4.6: "Khi khách đến đón, lễ tân tạo hóa đơn. Khách thanh toán tiền
 * mặt hoặc quét QR VNPay." The owner pays at the desk, not in the app. The
 * clinic also takes a VietQR bank transfer through PayOS (BE 39a55d6).
 */
export const PAY_AT_COUNTER_TEXT =
  'Lễ tân lập hóa đơn khi bạn đến đón bé. Bạn thanh toán tại quầy bằng tiền mặt, hoặc quét mã QR (VNPay hoặc chuyển khoản VietQR) do lễ tân đưa.';

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

export interface AddToBillPatch {
  payload: UpdateInvoiceItemsPayload;
  /** Quantity of the one line the product now has, when lines were merged */
  mergedQuantity?: number;
  /** Lines were left apart because one line would pass the BE limit */
  overLimit: boolean;
}

/**
 * PATCH body that adds a product to an issued bill. The BE always appends a new
 * line, so adding the same product again would split it over several lines.
 * When the bill already has lines of this product at today's price, the BE is
 * asked in the same request to drop them and write one line with the sum (it
 * removes before it adds). Lines at an older price stay apart: their price was
 * fixed when they were added (BR-16). A sum above the BE limit stays apart too.
 */
export const buildAddToBillPatch = (
  items: readonly Pick<
    InvoiceItem,
    '_id' | 'type' | 'refId' | 'unitPriceSnapshot' | 'quantity'
  >[],
  product: { _id: string; unitPrice?: number | null },
  quantity: number,
  max = RETAIL_QUANTITY_MAX
): AddToBillPatch => {
  const qty = Math.max(1, Math.trunc(quantity));
  const addOnly: AddToBillPatch = {
    payload: { addItems: [{ productId: product._id, quantity: qty }] },
    overLimit: false,
  };
  const same = items.filter(
    item =>
      item.type === 'Product' &&
      item.refId === product._id &&
      typeof product.unitPrice === 'number' &&
      item.unitPriceSnapshot === product.unitPrice
  );
  if (same.length === 0) return addOnly;
  const total = same.reduce((sum, item) => sum + (item.quantity || 0), qty);
  if (total > max) return { ...addOnly, overLimit: true };
  return {
    payload: {
      removeItemIds: same.map(item => item._id),
      addItems: [{ productId: product._id, quantity: total }],
    },
    mergedQuantity: total,
    overLimit: false,
  };
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

export interface BillableSubtask {
  /** Sub-task id */
  id: string;
  serviceId: string;
  /** Name on the bill: the catalog service's name */
  name: string;
  /** Catalog price, which the BE takes when the bill is made */
  price?: number;
}

/**
 * The sub-tasks the BE puts on the bill (`createInvoice`, BE PR #58): those
 * `Completed` and linked to a catalog service, one Service line each at that
 * service's `basePrice`. A sub-task with no service is not billed. Pass only
 * the sub-tasks of Done services: the BE does not look at the others.
 */
export const collectBillableSubtasks = (
  subtasks: readonly {
    _id: string;
    status?: string;
    taskType?: string;
    serviceId?: string | { _id: string; name?: string } | null;
  }[],
  catalog: Readonly<
    Record<string, { name?: string; basePrice?: number } | undefined>
  > = {}
): BillableSubtask[] => {
  const seen = new Set<string>();
  const lines: BillableSubtask[] = [];
  for (const subtask of subtasks) {
    if (subtask.status !== 'Completed' || seen.has(subtask._id)) continue;
    const ref = subtask.serviceId;
    const serviceId = typeof ref === 'string' ? ref : ref?._id;
    if (!serviceId) continue;
    seen.add(subtask._id);
    const listed = catalog[serviceId];
    const price = listed?.basePrice;
    lines.push({
      id: subtask._id,
      serviceId,
      name:
        (typeof ref === 'object' ? ref?.name : undefined) ||
        listed?.name ||
        subtask.taskType ||
        'Chỉ định',
      ...(typeof price === 'number' ? { price } : {}),
    });
  }
  return lines;
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

const GENERIC_INVOICE_ERROR = 'Lỗi máy chủ khi xử lý hóa đơn và thanh toán';
export const PAYOS_CHECK_UNREACHABLE =
  'Chưa hỏi được PayOS (mạng tới PayOS đang chậm hoặc gián đoạn). Mã vẫn còn hiệu lực, hãy thử lại sau ít giây.';
export const PAYOS_CREATE_UNREACHABLE =
  'Chưa tạo được mã: không kết nối được tới PayOS. Thử lại sau ít giây hoặc chọn phương thức khác.';

/**
 * The BE does not always reach PayOS: it answers 502/504, or a bare 500 when
 * the connection itself times out. Say that plainly; keep any other message
 * (missing PayOS keys, 409 already paid...).
 */
export const readPayosError = (
  error: unknown,
  fallback: string,
  unreachableText: string
) => {
  const read = readInvoiceError(error, fallback);
  const unreachable =
    read.status === 502 ||
    read.status === 504 ||
    (read.status === 500 && read.message === GENERIC_INVOICE_ERROR);
  return unreachable ? { ...read, message: unreachableText } : read;
};

/** The 409 the BE answers while the pet is still admitted */
export const isStillAdmittedError = (message?: string) =>
  Boolean(message && /nội trú/i.test(message) && /xuất viện/i.test(message));

/** Name of the downloaded receipt */
export const getInvoicePdfName = (invoice: Pick<Invoice, 'code'>) =>
  `${invoice.code || 'hoa-don'}.pdf`;
