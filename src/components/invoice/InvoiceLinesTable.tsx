import { Button, Popconfirm, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined } from '@ant-design/icons';
import type { Invoice, InvoiceItem } from '@/types';
import {
  formatVnd,
  getInvoiceItemTypeLabel,
  isRemovableInvoiceLine,
} from '@/services/InvoiceService';

const { Text } = Typography;

const TYPE_COLORS: Record<string, string> = {
  Service: 'blue',
  Product: 'gold',
  InpatientDay: 'purple',
};

interface InvoiceLinesTableProps {
  invoice: Pick<Invoice, 'items' | 'totalAmount' | 'paymentStatus'>;
  /** K1, UC-45 5a: product lines of an Unpaid bill can come off */
  onRemove?: (item: InvoiceItem) => void;
  removingId?: string;
}

/** H4: the lines keep the name and price of the moment of issue (BR-16) */
const InvoiceLinesTable = ({
  invoice,
  onRemove,
  removingId,
}: InvoiceLinesTableProps) => {
  const columns: ColumnsType<InvoiceItem> = [
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type] || 'default'}>
          {getInvoiceItemTypeLabel(type)}
        </Tag>
      ),
    },
    { title: 'Tên', dataIndex: 'itemNameSnapshot', key: 'name' },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPriceSnapshot',
      key: 'unitPrice',
      align: 'right',
      width: 120,
      render: (value: number) => formatVnd(value),
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 60,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'subtotal',
      key: 'subtotal',
      align: 'right',
      width: 130,
      render: (value: number) => <Text strong>{formatVnd(value)}</Text>,
    },
  ];

  if (onRemove) {
    columns.push({
      title: '',
      key: 'remove',
      width: 48,
      render: (_, item) =>
        isRemovableInvoiceLine(invoice, item) ? (
          <Popconfirm
            title="Bỏ dòng này khỏi hóa đơn?"
            okText="Bỏ"
            cancelText="Giữ lại"
            onConfirm={() => onRemove(item)}
          >
            <Button
              size="small"
              type="text"
              danger
              aria-label={`Bỏ ${item.itemNameSnapshot}`}
              icon={<DeleteOutlined />}
              loading={removingId === item._id}
            />
          </Popconfirm>
        ) : null,
    });
  }

  return (
    <Table
      size="small"
      rowKey="_id"
      columns={columns}
      dataSource={invoice.items}
      pagination={false}
      scroll={{ x: 560 }}
      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={4} align="right">
            <Text strong>Tổng cộng</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={1} align="right">
            <Text strong style={{ color: '#cf1322', fontSize: 16 }}>
              {formatVnd(invoice.totalAmount)}
            </Text>
          </Table.Summary.Cell>
          {onRemove && <Table.Summary.Cell index={2} />}
        </Table.Summary.Row>
      )}
    />
  );
};

export default InvoiceLinesTable;
