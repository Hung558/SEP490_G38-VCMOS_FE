import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Select,
  Tooltip,
  Segmented,
} from 'antd';
import {
  DollarOutlined,
  EyeOutlined,
  QrcodeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { toast } from 'sonner';
import type {
  Invoice,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
} from '@/types';
import InvoiceService, {
  getInvoiceMethodLabel,
  getInvoiceStatusLabel,
  getPayosStatusLabel,
  hasPendingPayosCode,
  INVOICE_METHODS,
  INVOICE_STATUSES,
  MSG_PAYMENT_SUCCESS,
  PAYOS_CHECK_UNREACHABLE,
  readInvoiceError,
  readPayosError,
} from '@/services/InvoiceService';
import InvoiceTable from '@/components/invoice/InvoiceTable';
import {
  getInvoiceRangePresets,
  getInvoicePeriodRange,
  INVOICE_PERIOD_OPTIONS,
  getTodayRange,
  isTodayRange,
} from '@/components/invoice/invoiceRange';
import type {
  InvoiceRange,
  InvoicePeriod,
} from '@/components/invoice/invoiceRange';
import {
  FilterCard,
  ResponsiveFilterRow,
} from '../../AppointmentReception/components/styles';

const { RangePicker } = DatePicker;
const PAGE_SIZE = 10;

interface IssuedInvoicesTabProps {
  canPay: boolean;
  revision: number;
  onOpen: (invoice: Invoice) => void;
  onRefresh: () => void;
}

/**
 * K4 (GET /api/invoices): hóa đơn đã lập, mặc định của hôm nay; lọc theo số hóa
 * đơn, trạng thái, phương thức, ngày lập. Hóa đơn chưa trả đã có mã PayOS có nút
 * hỏi PayOS: ở localhost không có webhook, nên hóa đơn chỉ sang Paid khi có
 * người hỏi.
 */
const IssuedInvoicesTab = ({
  canPay,
  revision,
  onOpen,
  onRefresh,
}: IssuedInvoicesTabProps) => {
  const [code, setCode] = useState<string>();
  const [status, setStatus] = useState<InvoicePaymentStatus>();
  const [method, setMethod] = useState<InvoicePaymentMethod>();
  const [period, setPeriod] = useState<InvoicePeriod>('day');
  const [range, setRange] = useState<InvoiceRange>(getTodayRange);
  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [checkingId, setCheckingId] = useState<string>();

  const checkPayos = async (invoice: Invoice) => {
    setCheckingId(invoice._id);
    try {
      const res = await InvoiceService.getPayosStatus(invoice._id);
      if (res.data?.paymentStatus === 'Paid') {
        toast.success(`${invoice.code}: ${MSG_PAYMENT_SUCCESS}`);
        onRefresh();
      } else {
        toast.info(`${invoice.code}: ${getPayosStatusLabel(res.payosStatus)}`);
      }
    } catch (err) {
      toast.error(
        readPayosError(
          err,
          'Không kiểm tra được thanh toán QR',
          PAYOS_CHECK_UNREACHABLE
        ).message
      );
    } finally {
      setCheckingId(undefined);
    }
  };

  const from = range?.[0]?.format('YYYY-MM-DD');
  const to = range?.[1]?.format('YYYY-MM-DD');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    InvoiceService.list(
      {
        code,
        paymentStatus: status,
        paymentMethod: method,
        from,
        to,
        page,
        limit: PAGE_SIZE,
      },
      { signal: controller.signal }
    )
      .then(res => {
        setInvoices(res.items || []);
        setTotal(res.pagination?.total || 0);
      })
      .catch(err => {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        setError(readInvoiceError(err, 'Không tải được hóa đơn').message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [code, status, method, from, to, page, revision]);

  const emptyText = isTodayRange(range)
    ? 'Hôm nay chưa lập hóa đơn nào. Đổi hoặc xóa khoảng ngày để xem hóa đơn trước.'
    : 'Không có hóa đơn phù hợp.';

  return (
    <>
      <FilterCard>
        <ResponsiveFilterRow>
          <Segmented<InvoicePeriod>
            aria-label="Kỳ hóa đơn"
            value={period}
            options={INVOICE_PERIOD_OPTIONS}
            onChange={next => {
              setPeriod(next);
              if (next !== 'custom') setRange(getInvoicePeriodRange(next));
              setPage(1);
            }}
          />
          <RangePicker
            value={range}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            presets={getInvoiceRangePresets()}
            onChange={value => {
              setRange(value);
              setPeriod('custom');
              setPage(1);
            }}
            aria-label="Khoảng ngày lập"
          />
          <Input.Search
            allowClear
            placeholder="Số hóa đơn, ví dụ INV-K8M2PX"
            onSearch={value => {
              setCode(value.trim() || undefined);
              setPage(1);
            }}
            style={{ width: 260 }}
            aria-label="Số hóa đơn"
          />
          <Select
            allowClear
            placeholder="Mọi trạng thái"
            value={status}
            options={INVOICE_STATUSES.map(value => ({
              value,
              label: getInvoiceStatusLabel(value),
            }))}
            onChange={value => {
              setStatus(value);
              setPage(1);
            }}
            style={{ minWidth: 170 }}
            aria-label="Trạng thái"
          />
          <Select
            allowClear
            placeholder="Mọi phương thức"
            value={method}
            options={INVOICE_METHODS.map(value => ({
              value,
              label: getInvoiceMethodLabel(value),
            }))}
            onChange={value => {
              setMethod(value);
              setPage(1);
            }}
            style={{ minWidth: 160 }}
            aria-label="Phương thức"
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            Làm mới
          </Button>
        </ResponsiveFilterRow>
      </FilterCard>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={onRefresh}>
              Thử lại
            </Button>
          }
        />
      )}

      <InvoiceTable
        invoices={invoices}
        loading={loading}
        showOwner
        emptyText={emptyText}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showTotal: t => `${t} hóa đơn`,
          onChange: setPage,
        }}
        renderActions={invoice => (
          <>
            {canPay && invoice.paymentStatus === 'Unpaid' ? (
              <Button
                size="small"
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => onOpen(invoice)}
              >
                Thu tiền
              </Button>
            ) : (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onOpen(invoice)}
              >
                Xem
              </Button>
            )}
            {hasPendingPayosCode(invoice) && (
              <Tooltip title="Kiểm tra xem khách đã chuyển khoản bằng mã QR chưa">
                <Button
                  size="small"
                  icon={<QrcodeOutlined />}
                  loading={checkingId === invoice._id}
                  disabled={Boolean(checkingId) && checkingId !== invoice._id}
                  onClick={() => checkPayos(invoice)}
                >
                  Kiểm tra thanh toán QR
                </Button>
              </Tooltip>
            )}
          </>
        )}
      />
    </>
  );
};

export default IssuedInvoicesTab;
