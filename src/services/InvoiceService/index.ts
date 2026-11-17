import type { AxiosResponse } from 'axios';
import api from '../01_axios';
import type {
  CreateInvoicePayload,
  InvoiceResponse,
  ListInvoicesParams,
  ListInvoicesResponse,
  PayCashPayload,
  PayCashResponse,
  UpdateInvoiceItemsPayload,
  VnpayReturnResult,
  VnpayUrlResponse,
} from '@/types';
import { buildInvoiceListQuery } from './helpers';
import {
  apiInvoiceDetail,
  apiInvoiceItems,
  apiInvoicePayCash,
  apiInvoicePdf,
  apiInvoiceVnpayUrl,
  apiInvoices,
  apiMyInvoices,
  apiVnpayReturn,
} from './urls';

type Options = { signal?: AbortSignal };

/**
 * Lễ tân lập hóa đơn cho đơn "Chờ chủ đón" (UC-45). BE tự gom dịch vụ đã xong,
 * thuốc trong bệnh án và ngày nội trú; 409 khi pet còn nội trú hoặc đơn đã có hóa đơn.
 * POST /api/invoices
 */
const create = (payload: CreateInvoicePayload): Promise<InvoiceResponse> =>
  api.post(apiInvoices, payload);

/** GET /api/invoices (Lễ tân, Admin) */
const list = (
  params?: ListInvoicesParams,
  options?: Options
): Promise<ListInvoicesResponse> =>
  api.get(apiInvoices, {
    params: buildInvoiceListQuery(params),
    signal: options?.signal,
  });

/** GET /api/invoices/me (chủ nuôi): hóa đơn của các pet của mình; lọc được theo orderId */
const listMine = (
  params?: Omit<ListInvoicesParams, 'inpatientRecordId' | 'code'>,
  options?: Options
): Promise<ListInvoicesResponse> =>
  api.get(apiMyInvoices, {
    params: buildInvoiceListQuery(params),
    signal: options?.signal,
  });

/** GET /api/invoices/:id (Lễ tân, Admin, chủ của pet theo BR-23) */
const getById = (id: string, options?: Options): Promise<InvoiceResponse> =>
  api.get(apiInvoiceDetail(id), { signal: options?.signal });

/** PATCH /api/invoices/:id/items: thêm, bớt sản phẩm khi hóa đơn còn Unpaid */
const updateItems = (
  id: string,
  payload: UpdateInvoiceItemsPayload
): Promise<InvoiceResponse> => api.patch(apiInvoiceItems(id), payload);

/**
 * Thu tiền mặt (UC-46). BE chuyển hóa đơn Paid, đơn sang Done, khóa bệnh án và
 * trả chuồng. PATCH /api/invoices/:id/pay-cash
 */
const payCash = (
  id: string,
  payload: PayCashPayload
): Promise<PayCashResponse> => api.patch(apiInvoicePayCash(id), payload);

/** Tạo link VNPay hiệu lực 15 phút (UC-47). POST /api/invoices/:id/vnpay-url */
const createVnpayUrl = (id: string): Promise<VnpayUrlResponse> =>
  api.post(apiInvoiceVnpayUrl(id));

/**
 * Kiểm tra kết quả VNPay trả về trình duyệt (API-04). Chỉ đọc: hóa đơn chỉ đổi
 * khi VNPay gọi IPN. `search` là chuỗi query VNPay gắn vào trang trả về.
 */
const verifyVnpayReturn = (search: string): Promise<VnpayReturnResult> =>
  api.get(`${apiVnpayReturn}${search.startsWith('?') ? search : `?${search}`}`);

/** The BE answers a failed PDF request with JSON inside the blob */
const readBlobError = async (error: unknown) => {
  const response = (error as { response?: { data?: unknown } })?.response;
  if (response && response.data instanceof Blob) {
    try {
      response.data = JSON.parse(await response.data.text());
    } catch {
      response.data = null;
    }
  }
  return error;
};

/** GET /api/invoices/:id/pdf: biên lai PDF, cần token nên tải dạng blob */
const getPdf = async (id: string): Promise<Blob> => {
  try {
    const response = (await api.get(apiInvoicePdf(id), {
      responseType: 'blob',
    })) as unknown as AxiosResponse<Blob>;
    return response.data;
  } catch (error) {
    throw await readBlobError(error);
  }
};

const InvoiceService = {
  create,
  list,
  listMine,
  getById,
  updateItems,
  payCash,
  createVnpayUrl,
  verifyVnpayReturn,
  getPdf,
};

export * from './urls';
export * from './helpers';
export default InvoiceService;
