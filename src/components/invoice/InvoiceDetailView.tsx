import type { ReactNode } from 'react';
import { Alert, Descriptions, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Invoice, InvoiceItem } from '@/types';
import {
  getInvoiceMethodLabel,
  getInvoiceOrderCode,
  getInvoiceOwner,
  getInvoicePet,
  getInvoiceStatusColor,
  getInvoiceStatusLabel,
  isInvoiceUnpaid,
} from '@/services/InvoiceService';
import InvoiceLinesTable from './InvoiceLinesTable';

const { Text } = Typography;

const formatTime = (value?: string | null) =>
  value ? dayjs(value).format('HH:mm DD/MM/YYYY') : '-';

interface InvoiceDetailViewProps {
  invoice: Invoice;
  /** Hide the owner for the owner's own screens */
  showOwner?: boolean;
  onRemoveLine?: (item: InvoiceItem) => void;
  removingId?: string;
  /** Buttons under the lines, e.g. the receipt PDF */
  actions?: ReactNode;
  /** Owner screens: an Unpaid bill is paid at the desk (nghiệp vụ 4.6) */
  payAtCounterHint?: boolean;
}

/** SCR-15 invoice detail: header, lines, total, VNPay or PayOS transaction number */
const InvoiceDetailView = ({
  invoice,
  showOwner = true,
  onRemoveLine,
  removingId,
  actions,
  payAtCounterHint = false,
}: InvoiceDetailViewProps) => {
  const pet = getInvoicePet(invoice);
  const owner = getInvoiceOwner(invoice);
  const orderCode = getInvoiceOrderCode(invoice);

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {payAtCounterHint && isInvoiceUnpaid(invoice) && (
        <Alert
          type="warning"
          showIcon
          message="Hóa đơn chưa thanh toán"
          description="Bạn thanh toán tại quầy lễ tân khi đón bé, bằng tiền mặt hoặc quét mã QR do lễ tân đưa. Thanh toán xong, lịch hẹn chuyển Hoàn tất."
        />
      )}
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2 }}
        bordered
        items={[
          {
            key: 'code',
            label: 'Số hóa đơn',
            children: <Text strong>{invoice.code}</Text>,
          },
          {
            key: 'status',
            label: 'Trạng thái',
            children: (
              <Tag color={getInvoiceStatusColor(invoice.paymentStatus)}>
                {getInvoiceStatusLabel(invoice.paymentStatus)}
              </Tag>
            ),
          },
          {
            key: 'order',
            label: 'Lịch hẹn',
            children: orderCode || 'Đợt nội trú',
          },
          {
            key: 'pet',
            label: 'Thú cưng',
            children: pet?.name || '-',
          },
          ...(showOwner
            ? [
                {
                  key: 'owner',
                  label: 'Chủ nuôi',
                  children: owner
                    ? `${owner.fullName || '-'}${owner.phone ? ` · ${owner.phone}` : ''}`
                    : '-',
                },
              ]
            : []),
          {
            key: 'issuedAt',
            label: 'Ngày lập',
            children: formatTime(invoice.issuedAt || invoice.createdAt),
          },
          {
            key: 'method',
            label: 'Phương thức',
            children: getInvoiceMethodLabel(invoice.paymentMethod),
          },
          {
            key: 'paidAt',
            label: 'Thanh toán lúc',
            children: formatTime(invoice.paidAt),
          },
          ...(invoice.vnpayTxnRef && invoice.paymentMethod === 'VNPay'
            ? [
                {
                  key: 'txn',
                  label: 'Mã giao dịch VNPay',
                  children: invoice.vnpayTxnRef,
                },
              ]
            : []),
          ...(invoice.payosOrderCode && invoice.paymentMethod === 'PayOS'
            ? [
                {
                  key: 'payos',
                  label: 'Mã giao dịch thanh toán QR',
                  children: String(invoice.payosOrderCode),
                },
              ]
            : []),
        ]}
      />
      <InvoiceLinesTable
        invoice={invoice}
        onRemove={onRemoveLine}
        removingId={removingId}
      />
      {actions && <Space wrap>{actions}</Space>}
    </Space>
  );
};

export default InvoiceDetailView;
