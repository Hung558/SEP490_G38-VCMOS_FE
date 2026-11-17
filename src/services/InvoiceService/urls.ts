export const apiInvoices = '/invoices';
export const apiMyInvoices = '/invoices/me';
export const apiInvoiceDetail = (id: string) =>
  `/invoices/${encodeURIComponent(id)}`;
export const apiInvoiceItems = (id: string) => `${apiInvoiceDetail(id)}/items`;
export const apiInvoicePayCash = (id: string) =>
  `${apiInvoiceDetail(id)}/pay-cash`;
export const apiInvoiceVnpayUrl = (id: string) =>
  `${apiInvoiceDetail(id)}/vnpay-url`;
export const apiInvoicePdf = (id: string) => `${apiInvoiceDetail(id)}/pdf`;
export const apiVnpayReturn = '/invoices/vnpay-return';
