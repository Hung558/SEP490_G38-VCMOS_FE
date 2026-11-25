import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Popconfirm,
  QRCode,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  BankOutlined,
  LinkOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import dayjs from 'dayjs';
import type { Invoice, PayosPayment, PayosStatusResponse } from '@/types';
import InvoiceService, {
  clearPayosPayment,
  formatCountdown,
  formatVnd,
  getPayosCheckoutUrl,
  getPayosStatusLabel,
  getSecondsLeft,
  hasPendingPayosCode,
  isPayosCodeClosed,
  MSG_PAYMENT_FAILED,
  PAYOS_CHECK_UNREACHABLE,
  PAYOS_CREATE_UNREACHABLE,
  PAYOS_POLL_HIDDEN_MS,
  PAYOS_POLL_MS,
  readPayosError,
  readPayosPayment,
  savePayosPayment,
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

interface PayosPaymentPanelProps {
  invoice: Invoice;
  /** The PayOS tab is the one on screen */
  active: boolean;
  /** PayOS confirmed the transfer and the BE turned the bill Paid */
  onPaid: (invoice: Invoice) => void;
  onSwitchToCash: () => void;
  /** Whether this bill has a PayOS code that can still take money */
  onLiveChange?: (live: boolean) => void;
  /** The other QR method already has a live code on screen */
  otherLiveQr?: string;
}

/**
 * Thanh toán QR qua PayOS (BE 39a55d6): mã QR thật,
 * tên và số tài khoản nhận, số tiền, đếm ngược 15 phút. BE hỏi PayOS ở
 * `payos-status` và chốt Paid ngay khi PayOS báo đã nhận tiền, nên chạy được ở
 * localhost.
 *
 * BE chỉ trả chuỗi QR một lần lúc tạo mã, và thay mã cũ bằng mã mới mà không hủy
 * mã cũ (khoản chuyển bằng mã cũ sẽ không vào hóa đơn). Vì vậy trình duyệt giữ mã
 * còn hạn của từng hóa đơn: đóng rồi mở lại thì vẫn là mã đó. Chỉ hỏi PayOS khi
 * tab này đang mở, hoặc thưa hơn khi đã có mã mà lễ tân đang ở tab khác.
 */
const PayosPaymentPanel = ({
  invoice,
  active,
  onPaid,
  onSwitchToCash,
  onLiveChange,
  otherLiveQr,
}: PayosPaymentPanelProps) => {
  // A live code this browser made earlier for this bill
  const [restored] = useState(() => readPayosPayment(invoice));
  const [payment, setPayment] = useState<PayosPayment | undefined>(restored);
  const [status, setStatus] = useState<string | undefined>(
    restored ? 'PENDING' : undefined
  );
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string>();
  const [error, setError] = useState<string>();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    restored ? getSecondsLeft(restored.expiresAt) : 0
  );
  // A code made elsewhere, or before this browser kept codes
  const [priorCode, setPriorCode] = useState(
    () => hasPendingPayosCode(invoice) && !restored
  );
  const [priorStatus, setPriorStatus] = useState<string>();
  const [priorChecked, setPriorChecked] = useState(false);
  const paidRef = useRef(false);
  const askingRef = useRef<Promise<PayosStatusResponse> | null>(null);
  const priorAskedRef = useRef(false);

  const expired = Boolean(payment) && secondsLeft <= 0;
  const closed = isPayosCodeClosed(status);
  const waiting = Boolean(payment) && !expired && !closed;
  const priorOpen = priorCode && !isPayosCodeClosed(priorStatus);
  const live = waiting || priorOpen;
  const priorLink = getPayosCheckoutUrl(invoice.payosPaymentLinkId);

  useEffect(() => {
    onLiveChange?.(live);
  }, [live, onLiveChange]);

  // A code that can no longer take money is not worth restoring
  useEffect(() => {
    if (payment && (expired || closed)) clearPayosPayment(invoice._id);
  }, [payment, expired, closed, invoice._id]);

  const markPaid = useCallback(
    (paid: Invoice) => {
      if (paidRef.current) return;
      paidRef.current = true;
      clearPayosPayment(invoice._id);
      onPaid(paid);
    },
    [invoice._id, onPaid]
  );

  /**
   * Ask PayOS through the BE; true when the bill is now Paid. A click while a
   * question is on its way waits for that answer instead of sending another.
   */
  const checkStatus = useCallback(
    async (manual = false) => {
      if (paidRef.current) return true;
      if (manual) {
        setChecking(true);
        setError(undefined);
      }
      try {
        if (!askingRef.current) {
          askingRef.current = InvoiceService.getPayosStatus(
            invoice._id
          ).finally(() => {
            askingRef.current = null;
          });
        }
        const res = await askingRef.current;
        if (res.data?.paymentStatus === 'Paid') {
          markPaid(res.data);
          return true;
        }
        if (payment) setStatus(res.payosStatus);
        else setPriorStatus(res.payosStatus);
        setCheckedAt(dayjs().format('HH:mm:ss'));
        if (manual && isPayosCodeClosed(res.payosStatus)) {
          setError(MSG_PAYMENT_FAILED);
        }
      } catch (err) {
        if (manual)
          setError(
            readPayosError(
              err,
              'Không kiểm tra được thanh toán QR',
              PAYOS_CHECK_UNREACHABLE
            ).message
          );
      } finally {
        if (manual) setChecking(false);
      }
      return false;
    },
    [invoice._id, markPaid, payment]
  );

  const createLink = async (checkFirst = false) => {
    setCreating(true);
    setError(undefined);
    try {
      // The customer may have paid the code we are about to replace
      if (checkFirst && (await checkStatus())) return;
      const res = await InvoiceService.createPayosUrl(invoice._id);
      savePayosPayment(res.data);
      setPayment(res.data);
      setStatus('PENDING');
      setCheckedAt(undefined);
      setPriorCode(false);
      setSecondsLeft(getSecondsLeft(res.data.expiresAt));
    } catch (err) {
      setError(
        readPayosError(err, 'Không tạo được mã QR', PAYOS_CREATE_UNREACHABLE)
          .message
      );
    } finally {
      setCreating(false);
    }
  };

  // A code from elsewhere: ask once, the first time the tab is opened
  useEffect(() => {
    if (!active || !priorCode || priorAskedRef.current) return;
    priorAskedRef.current = true;
    void checkStatus().finally(() => setPriorChecked(true));
  }, [active, priorCode, checkStatus]);

  // Countdown of the code
  useEffect(() => {
    if (!payment) return;
    const timer = window.setInterval(
      () => setSecondsLeft(getSecondsLeft(payment.expiresAt)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [payment]);

  // Ask while the code can take money and the page is on screen
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(
      () => {
        if (document.visibilityState === 'visible') void checkStatus();
      },
      active ? PAYOS_POLL_MS : PAYOS_POLL_HIDDEN_MS
    );
    return () => window.clearInterval(timer);
  }, [waiting, active, checkStatus]);

  if (invoice.totalAmount <= 0) {
    return (
      <Alert
        type="info"
        showIcon
        message="Hóa đơn 0 đ không thanh toán bằng mã QR. Hãy xác nhận ở mục Tiền mặt."
      />
    );
  }

  const confirmTitle = 'Khách chưa chuyển khoản bằng mã hiện tại?';
  const confirmText =
    'Tạo mã mới thì khoản chuyển bằng mã cũ sẽ không được ghi vào hóa đơn. Chỉ tạo khi chắc khách chưa chuyển.';

  const createButton = (label: string, primary = false) =>
    live ? (
      <Popconfirm
        title={confirmTitle}
        description={<div style={{ maxWidth: 280 }}>{confirmText}</div>}
        okText="Tạo mã mới"
        cancelText="Không"
        onConfirm={() => createLink(true)}
      >
        <Button
          type={primary ? 'primary' : 'default'}
          icon={<QrcodeOutlined />}
          loading={creating}
        >
          {label}
        </Button>
      </Popconfirm>
    ) : (
      <Button
        type={primary ? 'primary' : 'default'}
        icon={<QrcodeOutlined />}
        loading={creating}
        onClick={() => createLink()}
      >
        {label}
      </Button>
    );

  const priorStatusText = priorStatus
    ? getPayosStatusLabel(priorStatus)
    : priorChecked
      ? 'chưa kiểm tra được thanh toán QR'
      : 'đang kiểm tra thanh toán QR';

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {otherLiveQr && !payment && (
        <Alert
          type="warning"
          showIcon
          message={`Mã ${otherLiveQr} vừa tạo vẫn còn hiệu lực`}
          description={`Chỉ đưa khách một mã. Nếu khách đã quét mã ${otherLiveQr}, quay lại mục đó để chờ xác nhận.`}
        />
      )}

      {restored && payment === restored && (
        <Text type="secondary">
          Đang hiện lại mã QR đã tạo lúc trước cho hóa đơn này.
        </Text>
      )}

      {priorCode && !payment && (
        <Alert
          type={priorOpen ? 'warning' : 'info'}
          showIcon
          message={
            priorOpen
              ? 'Hóa đơn đã có một mã QR tạo trước đó'
              : 'Mã QR tạo trước đó đã đóng'
          }
          description={
            priorOpen ? (
              <Space direction="vertical" size={4}>
                <span>
                  Trạng thái: {priorStatusText}. Mã này được tạo ở máy hoặc
                  trình duyệt khác nên không hiện lại được mã QR ở đây.
                </span>
                {priorLink && (
                  <a href={priorLink} target="_blank" rel="noreferrer">
                    <LinkOutlined /> Mở trang thanh toán QR của mã này để khách
                    quét
                  </a>
                )}
                <span>
                  Tạo mã mới thì khoản chuyển bằng mã cũ sẽ không được ghi vào
                  hóa đơn.
                </span>
              </Space>
            ) : (
              `${getPayosStatusLabel(priorStatus)}. Tạo mã mới để khách chuyển khoản.`
            )
          }
        />
      )}

      {!payment ? (
        <Space wrap>
          {createButton('Tạo mã QR', true)}
          {priorCode && (
            <Button
              icon={<ReloadOutlined />}
              loading={checking}
              onClick={() => checkStatus(true)}
            >
              Kiểm tra mã cũ
            </Button>
          )}
        </Space>
      ) : (
        <QrBox>
          <QRCode
            value={payment.qrCode}
            size={220}
            errorLevel="M"
            status={expired || closed ? 'expired' : 'active'}
            onRefresh={() => createLink()}
          />
          <div className="qr-info">
            <Text type="secondary">Số tiền</Text>
            <Text strong style={{ fontSize: 18 }}>
              {formatVnd(payment.amount)}
            </Text>
            {(payment.accountName || payment.accountNumber) && (
              <>
                <Text type="secondary">
                  <BankOutlined /> Người nhận
                </Text>
                <Text strong>
                  {payment.accountName || '-'}
                  {payment.accountNumber ? ` · ${payment.accountNumber}` : ''}
                </Text>
              </>
            )}
            <Text type="secondary">Mã hết hạn sau</Text>
            <span className="countdown" aria-live="polite">
              {formatCountdown(secondsLeft)}
            </span>
            <div>
              {expired ? (
                <Tag color="default">Hết hạn</Tag>
              ) : closed ? (
                <Tag color="error">{getPayosStatusLabel(status)}</Tag>
              ) : (
                <Tag color="processing">{getPayosStatusLabel(status)}</Tag>
              )}
            </div>
            <a href={payment.checkoutUrl} target="_blank" rel="noreferrer">
              <LinkOutlined /> Mở trang thanh toán QR (mã QR lớn)
            </a>
          </div>
        </QrBox>
      )}

      {payment && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Khách quét mã bằng ứng dụng ngân hàng bất kỳ và kiểm tra tên người
          nhận trước khi chuyển. Hóa đơn tự chuyển “Đã thanh toán” khi hệ thống
          xác nhận đã nhận tiền. Đóng cửa sổ này thì mã vẫn được giữ tới khi hết
          hạn. Chỉ đưa khách một mã. Nếu khách báo lỗi hoặc hủy giao dịch:{' '}
          {MSG_PAYMENT_FAILED}
        </Text>
      )}

      {checkedAt && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Đã kiểm tra thanh toán QR lúc {checkedAt}:{' '}
          {getPayosStatusLabel(payment ? status : priorStatus)}.
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
        {payment && createButton('Tạo mã mới')}
        <Button icon={<SwapOutlined />} onClick={onSwitchToCash}>
          Chuyển sang tiền mặt
        </Button>
      </Space>
    </Space>
  );
};

export default PayosPaymentPanel;
