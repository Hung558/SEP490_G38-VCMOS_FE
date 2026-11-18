import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, QRCode, Space, Tag, Typography } from 'antd';
import {
  LinkOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import type { Invoice, VnpayPayment } from '@/types';
import InvoiceService, {
  formatCountdown,
  formatVnd,
  getSecondsLeft,
  MSG_PAYMENT_FAILED,
  readInvoiceError,
  VNPAY_POLL_MS,
} from '@/services/InvoiceService';

const { Text } = Typography;

const QrBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;

  .qr-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 200px;
    flex: 1;
  }

  .countdown {
    font-size: 24px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`;

interface VnpayPaymentPanelProps {
  invoice: Invoice;
  /** The IPN has turned the bill Paid */
  onPaid: (invoice: Invoice) => void;
  onSwitchToCash: () => void;
  /** Whether a VNPay link made here can still take money */
  onLiveChange?: (live: boolean) => void;
  /** The other QR method already has a live code on screen */
  otherLiveQr?: string;
}

/**
 * H6 (UC-47, SCR-20 VNPay QR panel): mã QR của link VNPay, số tiền, đếm ngược 15
 * phút và trạng thái. Chỉ IPN của VNPay đổi hóa đơn sang Paid (BR-17), nên màn
 * này hỏi lại BE mỗi vài giây. BE không lưu giao dịch thất bại: khách báo lỗi
 * hoặc hủy thì lễ tân tạo mã mới hoặc chuyển sang tiền mặt (3b).
 */
const VnpayPaymentPanel = ({
  invoice,
  onPaid,
  onSwitchToCash,
  onLiveChange,
  otherLiveQr,
}: VnpayPaymentPanelProps) => {
  const [payment, setPayment] = useState<VnpayPayment>();
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const paidRef = useRef(false);

  const expired = Boolean(payment) && secondsLeft <= 0;
  const waiting = Boolean(payment) && !expired;

  useEffect(() => {
    onLiveChange?.(waiting);
  }, [waiting, onLiveChange]);

  const createLink = async () => {
    setCreating(true);
    setError(undefined);
    try {
      const res = await InvoiceService.createVnpayUrl(invoice._id);
      setPayment(res.data);
      setSecondsLeft(getSecondsLeft(res.data.expiresAt));
    } catch (err) {
      setError(readInvoiceError(err, 'Không tạo được mã VNPay').message);
    } finally {
      setCreating(false);
    }
  };

  const checkStatus = useCallback(
    async (manual = false) => {
      if (paidRef.current) return;
      if (manual) setChecking(true);
      try {
        const res = await InvoiceService.getById(invoice._id);
        if (res.data.paymentStatus === 'Paid') {
          paidRef.current = true;
          onPaid(res.data);
        }
      } catch (err) {
        if (manual)
          setError(
            readInvoiceError(err, 'Không kiểm tra được hóa đơn').message
          );
      } finally {
        if (manual) setChecking(false);
      }
    },
    [invoice._id, onPaid]
  );

  // Countdown of the link
  useEffect(() => {
    if (!payment) return;
    const timer = window.setInterval(
      () => setSecondsLeft(getSecondsLeft(payment.expiresAt)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [payment]);

  // Ask the BE while the QR is valid and the page is on screen
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void checkStatus();
    }, VNPAY_POLL_MS);
    return () => window.clearInterval(timer);
  }, [waiting, checkStatus]);

  if (invoice.totalAmount <= 0) {
    return (
      <Alert
        type="info"
        showIcon
        message="Hóa đơn 0 đ không thanh toán qua VNPay. Hãy xác nhận ở mục Tiền mặt."
      />
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {otherLiveQr && !payment && (
        <Alert
          type="warning"
          showIcon
          message={`Mã ${otherLiveQr} vẫn còn hiệu lực`}
          description={`Chỉ đưa khách một mã. Nếu khách đã quét mã ${otherLiveQr}, quay lại mục đó để chờ xác nhận.`}
        />
      )}
      {!payment ? (
        <Button
          type="primary"
          icon={<QrcodeOutlined />}
          loading={creating}
          onClick={createLink}
        >
          Tạo mã QR VNPay
        </Button>
      ) : (
        <QrBox>
          <QRCode
            value={payment.paymentUrl}
            size={220}
            errorLevel="L"
            status={expired ? 'expired' : 'active'}
            onRefresh={createLink}
          />
          <div className="qr-info">
            <Text type="secondary">Số tiền</Text>
            <Text strong style={{ fontSize: 18 }}>
              {formatVnd(payment.amount)}
            </Text>
            <Text type="secondary">Mã hết hạn sau</Text>
            <span className="countdown" aria-live="polite">
              {formatCountdown(secondsLeft)}
            </span>
            <div>
              {expired ? (
                <Tag color="default">Hết hạn</Tag>
              ) : (
                <Tag color="processing">Đang chờ khách thanh toán</Tag>
              )}
            </div>
            <a href={payment.paymentUrl} target="_blank" rel="noreferrer">
              <LinkOutlined /> Mở trang thanh toán VNPay
            </a>
          </div>
        </QrBox>
      )}

      {payment && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Khách quét mã bằng ứng dụng ngân hàng. Hóa đơn tự chuyển “Đã thanh
          toán” khi VNPay xác nhận với hệ thống. Nếu khách báo lỗi hoặc hủy giao
          dịch: {MSG_PAYMENT_FAILED}
        </Text>
      )}

      {error && <Alert type="error" showIcon message={error} />}

      <Space wrap>
        {payment && (
          <Button
            icon={<ReloadOutlined />}
            loading={checking}
            onClick={() => checkStatus(true)}
          >
            Kiểm tra trạng thái
          </Button>
        )}
        {payment && (
          <Button
            icon={<QrcodeOutlined />}
            loading={creating}
            onClick={createLink}
          >
            Tạo mã mới
          </Button>
        )}
        <Button icon={<SwapOutlined />} onClick={onSwitchToCash}>
          Chuyển sang tiền mặt
        </Button>
      </Space>
    </Space>
  );
};

export default VnpayPaymentPanel;
