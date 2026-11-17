// Invoices and payment (UC-45..48, SCR-15, SCR-20): /api/invoices (BE 8aa9a16).
// Lines keep the name and unit price of the moment the invoice was issued
// (BR-16). Only the VNPay IPN or a cash payment turns an invoice Paid (BR-17).

export type InvoiceItemType = 'Service' | 'Product' | 'InpatientDay';
export type InvoicePaymentStatus = 'Unpaid' | 'Paid' | 'Refunded';
export type InvoicePaymentMethod = 'Cash' | 'VNPay';

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
