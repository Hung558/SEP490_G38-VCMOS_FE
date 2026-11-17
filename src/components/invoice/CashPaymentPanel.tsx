import { useState } from 'react';
import {
  Alert,
  Button,
  InputNumber,
  Popconfirm,
  Space,
  Typography,
} from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import type { Invoice, PayCashResponse } from '@/types';
import InvoiceService, {
  formatVnd,
  getCashChange,
  readInvoiceError,
} from '@/services/InvoiceService';

const { Text } = Typography;

const formatThousands = (value?: string | number) =>
  `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const parseThousands = (value?: string) =>
  Number((value || '').replace(/[^\d]/g, '')) || 0;

interface CashPaymentPanelProps {
  invoice: Invoice;
  onPaid: (result: PayCashResponse) => void;
  /** 409: someone else paid it first; reload the bill */
  onStale: () => void;
}

/**
 * H5 (UC-46): nhập số tiền khách đưa, hiện tiền thừa; thiếu tiền thì không cho
 * xác nhận (1a). Xác nhận phải hỏi lại (MSG37).
 */
const CashPaymentPanel = ({
  invoice,
  onPaid,
  onStale,
}: CashPaymentPanelProps) => {
  const [received, setReceived] = useState<number | null>(invoice.totalAmount);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const change = getCashChange(invoice.totalAmount, received);
  const missing =
    typeof received === 'number' && received < invoice.totalAmount
      ? invoice.totalAmount - received
      : undefined;

  const confirm = async () => {
    if (change === undefined || typeof received !== 'number') return;
    setSubmitting(true);
    setError(undefined);
    try {
      onPaid(
        await InvoiceService.payCash(invoice._id, { cashReceived: received })
      );
    } catch (err) {
      const { message, status } = readInvoiceError(
        err,
        'Không xác nhận được thanh toán'
      );
      setError(message);
      if (status === 409) onStale();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space wrap align="center">
        <Text>Khách đưa</Text>
        <InputNumber
          min={0}
          step={10000}
          precision={0}
          value={received}
          onChange={value => setReceived(value)}
          formatter={formatThousands}
          parser={parseThousands}
          addonAfter="đ"
          aria-label="Số tiền khách đưa"
          style={{ width: 220 }}
        />
      </Space>
      {change !== undefined ? (
        <Text>
          Tiền thừa trả khách:{' '}
          <Text strong style={{ color: '#389e0d' }}>
            {formatVnd(change)}
          </Text>
        </Text>
      ) : (
        <Text type="danger">
          {missing !== undefined
            ? `Còn thiếu ${formatVnd(missing)}`
            : 'Nhập số tiền khách đưa'}
        </Text>
      )}
      {error && <Alert type="error" showIcon message={error} />}
      <Popconfirm
        title="Xác nhận thanh toán tiền mặt"
        description={`Bạn có chắc muốn xác nhận đã thu ${formatVnd(invoice.totalAmount)}? Đơn sẽ chuyển Hoàn tất và bệnh án được khóa.`}
        okText="Xác nhận"
        cancelText="Xem lại"
        onConfirm={confirm}
        disabled={change === undefined}
      >
        <Button
          type="primary"
          icon={<DollarOutlined />}
          disabled={change === undefined}
          loading={submitting}
        >
          Xác nhận thanh toán
        </Button>
      </Popconfirm>
    </Space>
  );
};

export default CashPaymentPanel;
