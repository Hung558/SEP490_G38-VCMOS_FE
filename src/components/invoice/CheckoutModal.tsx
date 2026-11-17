import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Empty,
  Modal,
  Result,
  Segmented,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { toast } from 'sonner';
import axios from 'axios';
import type { Invoice, InvoiceItem, PayCashResponse } from '@/types';
import InvoiceService, {
  formatVnd,
  getInvoiceMethodLabel,
  isInvoiceUnpaid,
  MSG_PAYMENT_SUCCESS,
  readInvoiceError,
} from '@/services/InvoiceService';
import type { Product } from '@/services/ProductService';
import CreateInvoicePanel from './CreateInvoicePanel';
import InvoiceDetailView from './InvoiceDetailView';
import InvoicePdfButton from './InvoicePdfButton';
import ProductPicker from './ProductPicker';
import CashPaymentPanel from './CashPaymentPanel';
import VnpayPaymentPanel from './VnpayPaymentPanel';

const { Title, Text } = Typography;

type Phase = 'loading' | 'create' | 'invoice' | 'none' | 'error';
type Method = 'cash' | 'vnpay';

interface CheckoutModalProps {
  open: boolean;
  /** Bill this order (Chờ chủ đón), or show the bill it already has */
  order?: { _id: string; code: string } | null;
  /** Or open a known bill, e.g. from the invoice list */
  invoiceId?: string | null;
  /** Receptionist: issue, edit and take payment. Admin only reads */
  canPay: boolean;
  onClose: () => void;
  /** A bill was issued, changed or paid: refresh the lists behind */
  onChanged?: () => void;
}

/**
 * SCR-20 thu ngân (nghiệp vụ 4.6, UC-45..47): lập hóa đơn cho đơn "Chờ chủ
 * đón", thêm bớt hàng bán lẻ, thu tiền mặt hoặc VNPay QR, in biên lai.
 */
const CheckoutModal = ({
  open,
  order,
  invoiceId,
  canPay,
  onClose,
  onChanged,
}: CheckoutModalProps) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [invoice, setInvoice] = useState<Invoice>();
  const [loadError, setLoadError] = useState<string>();
  const [method, setMethod] = useState<Method>('cash');
  const [cashResult, setCashResult] = useState<PayCashResponse>();
  const [itemsBusy, setItemsBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string>();
  const [itemsError, setItemsError] = useState<string>();
  const abortRef = useRef<AbortController | null>(null);

  const orderId = order?._id;

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    setPhase('loading');
    setLoadError(undefined);
    try {
      let found: Invoice | undefined;
      if (invoiceId) {
        found = (await InvoiceService.getById(invoiceId, { signal })).data;
      } else if (orderId) {
        const res = await InvoiceService.list(
          { orderId, limit: 1 },
          { signal }
        );
        found = res.items?.[0];
      }
      if (signal.aborted) return;
      setInvoice(found);
      setPhase(found ? 'invoice' : canPay && orderId ? 'create' : 'none');
    } catch (err) {
      if (axios.isCancel(err) || signal.aborted) return;
      setLoadError(readInvoiceError(err, 'Không tải được hóa đơn').message);
      setPhase('error');
    }
  }, [invoiceId, orderId, canPay]);

  useEffect(() => {
    if (!open) return;
    setMethod('cash');
    setCashResult(undefined);
    setItemsError(undefined);
    void load();
    return () => abortRef.current?.abort();
  }, [open, load]);

  const reloadInvoice = useCallback(async () => {
    if (!invoice) return;
    try {
      setInvoice((await InvoiceService.getById(invoice._id)).data);
    } catch {
      // keep the bill on screen; the next action reports the error
    }
  }, [invoice]);

  const handleCreated = (created: Invoice) => {
    setInvoice(created);
    setPhase('invoice');
    toast.success(`Đã lập hóa đơn ${created.code}`);
    onChanged?.();
  };

  const changeItems = async (
    payload: Parameters<typeof InvoiceService.updateItems>[1],
    removing?: string
  ) => {
    if (!invoice) return;
    setItemsBusy(true);
    setRemovingId(removing);
    setItemsError(undefined);
    try {
      setInvoice((await InvoiceService.updateItems(invoice._id, payload)).data);
      onChanged?.();
    } catch (err) {
      const { message, status } = readInvoiceError(
        err,
        'Không cập nhật được hóa đơn'
      );
      setItemsError(message);
      if (status === 409) void reloadInvoice();
    } finally {
      setItemsBusy(false);
      setRemovingId(undefined);
    }
  };

  const addProduct = (product: Product, quantity: number) =>
    changeItems({ addItems: [{ productId: product._id, quantity }] });

  const removeLine = (item: InvoiceItem) =>
    changeItems({ removeItemIds: [item._id] }, item._id);

  const handleCashPaid = (result: PayCashResponse) => {
    setCashResult(result);
    setInvoice(result.data);
    toast.success(MSG_PAYMENT_SUCCESS);
    onChanged?.();
  };

  const handleVnpayPaid = useCallback(
    (paid: Invoice) => {
      setInvoice(paid);
      toast.success(MSG_PAYMENT_SUCCESS);
      onChanged?.();
    },
    [onChanged]
  );

  const editable = canPay && isInvoiceUnpaid(invoice);

  const renderInvoice = (bill: Invoice) => (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {bill.paymentStatus === 'Paid' && (
        <Result
          status="success"
          title={cashResult ? MSG_PAYMENT_SUCCESS : 'Hóa đơn đã thanh toán'}
          subTitle={
            cashResult
              ? `Khách đưa ${formatVnd(cashResult.cashReceived)} · Tiền thừa ${formatVnd(cashResult.changeAmount)}`
              : `${getInvoiceMethodLabel(bill.paymentMethod)} · ${formatVnd(bill.totalAmount)}`
          }
          style={{ padding: '8px 0' }}
        />
      )}
      <InvoiceDetailView
        invoice={bill}
        onRemoveLine={editable ? removeLine : undefined}
        removingId={removingId}
        actions={
          <>
            {bill.paymentStatus === 'Paid' && (
              <InvoicePdfButton invoice={bill} mode="print" type="primary" />
            )}
            <InvoicePdfButton invoice={bill} />
          </>
        }
      />
      {editable && (
        <div>
          <Text strong>Thêm sản phẩm bán tại quầy</Text>
          <div style={{ marginTop: 8 }}>
            <ProductPicker
              onAdd={addProduct}
              loading={itemsBusy && !removingId}
              disabled={itemsBusy}
            />
          </div>
          <Text
            type="secondary"
            style={{ display: 'block', marginTop: 4, fontSize: 12 }}
          >
            Chỉ bỏ được dòng thuốc và sản phẩm. Muốn đổi số lượng thuốc kê đơn
            thì bỏ dòng đó rồi thêm lại với số lượng mới. Đổi hàng sau khi đã
            tạo mã VNPay thì phải tạo mã mới.
          </Text>
          {itemsError && (
            <Alert
              type="error"
              showIcon
              message={itemsError}
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      )}
      {editable && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <Title level={5} style={{ margin: 0 }}>
            Thanh toán {formatVnd(bill.totalAmount)}
          </Title>
          <Segmented<Method>
            value={method}
            onChange={setMethod}
            options={[
              { label: 'Tiền mặt', value: 'cash' },
              { label: 'VNPay QR', value: 'vnpay' },
            ]}
          />
          {method === 'cash' ? (
            <CashPaymentPanel
              key={`cash-${bill.totalAmount}`}
              invoice={bill}
              onPaid={handleCashPaid}
              onStale={reloadInvoice}
            />
          ) : (
            <VnpayPaymentPanel
              key={`vnpay-${bill._id}-${bill.totalAmount}`}
              invoice={bill}
              onPaid={handleVnpayPaid}
              onSwitchToCash={() => setMethod('cash')}
            />
          )}
        </>
      )}
      {!canPay && isInvoiceUnpaid(bill) && (
        <Alert
          type="info"
          showIcon
          message="Hóa đơn chưa thanh toán. Lễ tân thu tiền ở màn Tiếp nhận lịch hẹn hoặc Hóa đơn."
        />
      )}
    </Space>
  );

  const title = invoice
    ? `Hóa đơn ${invoice.code}${order ? ` · lịch hẹn ${order.code}` : ''}`
    : order
      ? `Lập hóa đơn · lịch hẹn ${order.code}`
      : 'Hóa đơn';

  return (
    <Modal
      open={open}
      title={title}
      width={860}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
      destroyOnHidden
      maskClosable={false}
    >
      {phase === 'loading' && <Skeleton active paragraph={{ rows: 6 }} />}
      {phase === 'error' && (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={
            <Button size="small" onClick={() => load()}>
              Thử lại
            </Button>
          }
        />
      )}
      {phase === 'none' && (
        <Empty description="Lịch hẹn này chưa có hóa đơn." />
      )}
      {phase === 'create' && orderId && (
        <CreateInvoicePanel orderId={orderId} onCreated={handleCreated} />
      )}
      {phase === 'invoice' && invoice && renderInvoice(invoice)}
    </Modal>
  );
};

export default CheckoutModal;
