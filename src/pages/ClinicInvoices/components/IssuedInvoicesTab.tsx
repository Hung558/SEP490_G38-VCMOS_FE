import { useEffect, useState } from 'react';
import { Alert, Button, DatePicker, Input, Select } from 'antd';
import { DollarOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import type {
  Invoice,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
} from '@/types';
import InvoiceService, {
  getInvoiceMethodLabel,
  getInvoiceStatusLabel,
  INVOICE_METHODS,
  INVOICE_STATUSES,
  readInvoiceError,
} from '@/services/InvoiceService';
import InvoiceTable from '@/components/invoice/InvoiceTable';
import {
  getInvoiceRangePresets,
  getTodayRange,
  isTodayRange,
} from '@/components/invoice/invoiceRange';
import type { InvoiceRange } from '@/components/invoice/invoiceRange';
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
 * đơn, trạng thái, phương thức, ngày lập.
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
  const [range, setRange] = useState<InvoiceRange>(getTodayRange);
  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

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
          <RangePicker
            value={range}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            presets={getInvoiceRangePresets()}
            onChange={value => {
              setRange(value);
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
        renderActions={invoice =>
          canPay && invoice.paymentStatus === 'Unpaid' ? (
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
          )
        }
      />
    </>
  );
};

export default IssuedInvoicesTab;
