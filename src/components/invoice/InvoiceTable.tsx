import type { ReactNode } from 'react';
import { Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Invoice } from '@/types';
import {
  formatVnd,
  getInvoiceMethodLabel,
  getInvoiceOrderCode,
  getInvoiceOwner,
  getInvoicePet,
  getInvoiceStatusColor,
  getInvoiceStatusLabel,
} from '@/services/InvoiceService';

const { Text } = Typography;

interface InvoiceTableProps {
  invoices: Invoice[];
  loading?: boolean;
  /** Staff see who the owner is; owners do not need it */
  showOwner?: boolean;
  pagination: TablePaginationConfig | false;
  renderActions: (invoice: Invoice) => ReactNode;
  /** What an empty table says, e.g. that today has no bill yet */
  emptyText?: ReactNode;
}

/** SCR-15 invoice row: number, date, pet, total, method, status */
const InvoiceTable = ({
  invoices,
  loading,
  showOwner = false,
  pagination,
  renderActions,
  emptyText,
}: InvoiceTableProps) => {
  const columns: ColumnsType<Invoice> = [
    {
      title: 'Số hóa đơn',
      key: 'code',
      width: 140,
      render: (_, invoice) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#0958d9', whiteSpace: 'nowrap' }}>
            {invoice.code}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getInvoiceOrderCode(invoice) || 'Nội trú'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Ngày lập',
      key: 'issuedAt',
      width: 100,
      render: (_, invoice) => {
        const at = invoice.issuedAt || invoice.createdAt;
        return at ? (
          <Space direction="vertical" size={0}>
            <Text>{dayjs(at).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(at).format('HH:mm')}
            </Text>
          </Space>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Thú cưng',
      key: 'pet',
      width: 110,
      render: (_, invoice) => getInvoicePet(invoice)?.name || '-',
    },
    ...(showOwner
      ? [
          {
            title: 'Chủ nuôi',
            key: 'owner',
            width: 150,
            render: (_: unknown, invoice: Invoice) => {
              const owner = getInvoiceOwner(invoice);
              return owner ? (
                <Space direction="vertical" size={0}>
                  <Text>{owner.fullName || '-'}</Text>
                  {owner.phone && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {owner.phone}
                    </Text>
                  )}
                </Space>
              ) : (
                '-'
              );
            },
          },
        ]
      : []),
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'total',
      align: 'right',
      width: 120,
      render: (value: number) => <Text strong>{formatVnd(value)}</Text>,
    },
    {
      title: 'Phương thức',
      key: 'method',
      width: 100,
      render: (_, invoice) => getInvoiceMethodLabel(invoice.paymentMethod),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, invoice) => (
        <Tag color={getInvoiceStatusColor(invoice.paymentStatus)}>
          {getInvoiceStatusLabel(invoice.paymentStatus)}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 170,
      render: (_, invoice) => <Space wrap>{renderActions(invoice)}</Space>,
    },
  ];

  return (
    <Table
      rowKey="_id"
      columns={columns}
      dataSource={invoices}
      loading={loading}
      pagination={pagination}
      locale={emptyText ? { emptyText } : undefined}
      scroll={{ x: showOwner ? 1010 : 860 }}
    />
  );
};

export default InvoiceTable;
