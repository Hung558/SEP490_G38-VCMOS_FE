export const apiInvoices = '/invoices';
export const apiMyInvoices = '/invoices/me';
export const apiInvoiceDetail = (id: string) =>
  `/invoices/${encodeURIComponent(id)}`;
export const apiInvoiceItems = (id: string) => `${apiInvoiceDetail(id)}/items`;
export const apiInvoicePayCash = (id: string) =>
  `${apiInvoiceDetail(id)}/pay-cash`;
export const apiInvoiceVnpayUrl = (id: string) =>
  `${apiInvoiceDetail(id)}/vnpay-url`;
export const apiInvoicePayosUrl = (id: string) =>
  `${apiInvoiceDetail(id)}/payos-url`;
export const apiInvoicePayosStatus = (id: string) =>
  `${apiInvoiceDetail(id)}/payos-status`;
export const apiInvoicePdf = (id: string) => `${apiInvoiceDetail(id)}/pdf`;
export const apiVnpayReturn = '/invoices/vnpay-return';
export const apiBestSellingProducts = '/invoices/reports/best-selling-products';
