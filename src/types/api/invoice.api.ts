// Invoices and payment (UC-45..48, SCR-15, SCR-20): /api/invoices (BE 39a55d6).
// Lines keep the name and unit price of the moment the invoice was issued
// (BR-16). A cash payment, the VNPay IPN or a PayOS confirmation (its webhook,
// or the BE asking PayOS on GET /invoices/:id) turns an invoice Paid.

export type InvoiceItemType = 'Service' | 'Product' | 'InpatientDay';
export type InvoicePaymentStatus = 'Unpaid' | 'Paid' | 'Refunded';
export type InvoicePaymentMethod = 'Cash' | 'VNPay' | 'PayOS';

export interface InvoiceItem {
  _id: string;
  type: InvoiceItemType;
  refId?: string;
  itemNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  subtotal: number;
}

export interface InvoiceOwnerRef {
  _id: string;
  code?: string;
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface InvoicePetRef {
  _id: string;
  code?: string;
  name?: string;
  species?: string | null;
  breed?: string | null;
  weight?: number | null;
  ownerId?: InvoiceOwnerRef | string;
}

export interface InvoiceOrderRef {
  _id: string;
  code?: string;
  date?: string;
  derivedStatus?: string;
  petId?: InvoicePetRef | string | null;
  ownerId?: InvoiceOwnerRef | string | null;
}

export interface InvoiceInpatientRef {
  _id: string;
  petId?: InvoicePetRef | string | null;
  orderId?: string | null;
  cageId?:
    | { _id: string; label?: string; size?: string; zone?: string }
    | string
    | null;
  admittedAt?: string | null;
  dischargedAt?: string | null;
  status?: string;
  initialDiagnosis?: string;
}

export interface InvoiceIssuerRef {
  _id: string;
  code?: string;
  fullName?: string;
  role?: string;
}

export interface Invoice {
  _id: string;
  code: string;
  orderId?: InvoiceOrderRef | string | null;
  inpatientRecordId?: InvoiceInpatientRef | string | null;
  issuedById?: InvoiceIssuerRef | string | null;
  items: InvoiceItem[];
  totalAmount: number;
  paymentMethod: InvoicePaymentMethod | null;
  paymentStatus: InvoicePaymentStatus;
  issuedAt?: string | null;
  paidAt?: string | null;
  vnpayTxnRef?: string | null;
  /** Set by POST /invoices/:id/payos-url; each new code replaces the last */
  payosOrderCode?: number | null;
  payosPaymentLinkId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** One product and how many: prescriptions, counter sales, lines to add */
export interface InvoiceProductLine {
  productId: string;
  quantity: number;
}

/** POST /api/invoices (Receptionist) */
export interface CreateInvoicePayload {
  orderId?: string;
  inpatientRecordId?: string;
  /** The medical record keeps no quantity; the BE counts 1 when left out */
  prescriptionQuantities?: InvoiceProductLine[];
  retailItems?: InvoiceProductLine[];
}

/** PATCH /api/invoices/:id/items while the invoice is Unpaid */
export interface UpdateInvoiceItemsPayload {
  addItems?: InvoiceProductLine[];
  removeItemIds?: string[];
}

export interface PayCashPayload {
  cashReceived?: number;
}

export interface ListInvoicesParams {
  paymentStatus?: InvoicePaymentStatus;
  paymentMethod?: InvoicePaymentMethod;
  orderId?: string;
  inpatientRecordId?: string;
  petId?: string;
  /** Exact invoice code, case-insensitive */
  code?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  page?: number;
  limit?: number;
}

export interface InvoicePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListInvoicesResponse {
  items: Invoice[];
  pagination: InvoicePagination;
}

export interface InvoiceResponse {
  message?: string;
  data: Invoice;
}

export interface PayCashResponse {
  message: string;
  data: Invoice;
  cashReceived: number;
  changeAmount: number;
}

export interface VnpayPayment {
  invoiceId: string;
  invoiceCode: string;
  vnpayTxnRef: string;
  amount: number;
  paymentUrl: string;
  /** 15 minutes after the link was made */
  expiresAt: string;
}

export interface VnpayUrlResponse {
  message: string;
  data: VnpayPayment;
}

/** GET /api/invoices/vnpay-return: checks the signature, never changes the invoice */
export interface VnpayReturnResult {
  valid: boolean;
  success: boolean;
  responseCode: string;
  vnpayTxnRef: string;
  amount: number | null;
  invoice: Pick<
    Invoice,
    | '_id'
    | 'code'
    | 'totalAmount'
    | 'paymentMethod'
    | 'paymentStatus'
    | 'paidAt'
    | 'vnpayTxnRef'
  > | null;
  message: string;
}

/** POST /api/invoices/:id/payos-url (Receptionist): a real VietQR, 15 minutes */
export interface PayosPayment {
  invoiceId: string;
  invoiceCode: string;
  orderCode: number;
  paymentLinkId: string | null;
  amount: number;
  /** PayOS page with the same QR, larger */
  checkoutUrl: string;
  paymentUrl: string;
  /** VietQR (EMVCo) text that any Vietnamese banking app can scan */
  qrCode: string;
  accountName: string | null;
  accountNumber: string | null;
  bin: string | null;
  expiresAt: string;
}

export interface PayosUrlResponse {
  message: string;
  data: PayosPayment;
}

/** Status of a payment link as PayOS reports it */
export type PayosStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'UNDERPAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

/**
 * GET /api/invoices/:id/payos-status: the BE asks PayOS and, when it says PAID,
 * turns the invoice Paid right away (order Done, record locked, cage freed).
 */
export interface PayosStatusResponse {
  message: string;
  data: Invoice;
  payosStatus: PayosStatus | string;
}

export type BestSellingSortBy = 'quantity' | 'revenue';
export type BestSellingCategory = 'Medicine' | 'Vaccine' | 'Retail';

/** GET /api/invoices/reports/best-selling-products (Admin) */
export interface BestSellingParams {
  /** YYYY-MM-DD, Vietnam time, both ends included; at most 366 days */
  from?: string;
  to?: string;
  category?: BestSellingCategory;
  sortBy?: BestSellingSortBy;
  /** 1..50, BE default 10 */
  limit?: number;
}

export interface BestSellingItem {
  rank: number;
  productId: string;
  /** Left out when the product no longer exists; the name then comes from the bill */
  code?: string;
  name: string;
  category?: BestSellingCategory;
  unit?: string;
  totalQuantity: number;
  totalRevenue: number;
  invoiceCount: number;
}

export interface BestSellingResponse {
  from: string;
  to: string;
  sortBy: BestSellingSortBy;
  category: BestSellingCategory | null;
  items: BestSellingItem[];
}
