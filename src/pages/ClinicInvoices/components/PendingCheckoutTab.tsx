import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import type { Invoice, StaffAppointment } from '@/types';
import AppointmentOrderService, {
  extractApiError,
  getAppointmentOwnerName,
  getAppointmentOwnerPhone,
  getAppointmentPetName,
} from '@/services/AppointmentOrderService';
import InvoiceService, {
  formatVnd,
  getInvoiceOrderId,
  INVOICE_LIST_LIMIT_MAX,
} from '@/services/InvoiceService';

import {
  getInvoicePeriodRange,
  getInvoiceRangePresets,
  getTodayRange,
  INVOICE_PERIOD_OPTIONS,
} from '@/components/invoice/invoiceRange';
import type {
  InvoicePeriod,
  InvoiceRange,
} from '@/components/invoice/invoiceRange';
import {
  FilterCard,
  ResponsiveFilterRow,
} from '../../AppointmentReception/components/styles';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const PAGE_SIZE = 10;

interface PendingCheckoutTabProps {
  canPay: boolean;
  /** Bumped after a bill is issued or paid */
  revision: number;
  onOpen: (order: StaffAppointment) => void;
  onRefresh: () => void;
}

/**
 * Orders awaiting pickup, filtered by appointment date (Vietnam today by default).
 * Clearing the range includes older unpaid visits; invoice lookup stays unfiltered
 * because the bill may have been issued on a different date.
 */
const PendingCheckoutTab = ({
  canPay,
  revision,
  onOpen,
  onRefresh,
}: PendingCheckoutTabProps) => {
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<InvoicePeriod>('day');
  const [range, setRange] = useState<InvoiceRange>(getTodayRange);
  const from = range?.[0]?.format('YYYY-MM-DD');
  const to = range?.[1]?.format('YYYY-MM-DD');
  const [orders, setOrders] = useState<StaffAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [unpaid, setUnpaid] = useState<Map<string, Invoice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError(undefined);
    Promise.all([
      AppointmentOrderService.listStaffAppointments(
        { status: 'WaitOwner', from, to, page, limit: PAGE_SIZE },
        { signal }
      ),
      // A bill issued but not paid yet (e.g. waiting for QR payment) keeps the order Wait Owner
      InvoiceService.list(
        { paymentStatus: 'Unpaid', limit: INVOICE_LIST_LIMIT_MAX },
        { signal }
      ),
    ])
      .then(([orderRes, invoiceRes]) => {
        if (signal.aborted) return;
        setOrders(orderRes.data || []);
        setTotal(orderRes.pagination?.total || 0);
        const map = new Map<string, Invoice>();
        for (const invoice of invoiceRes.items || []) {
          const orderId = getInvoiceOrderId(invoice);
          if (orderId) map.set(orderId, invoice);
        }
        setUnpaid(map);
      })
      .catch(err => {
        if (axios.isCancel(err) || signal.aborted) return;
        setError(
          extractApiError(err, 'Không tải được danh sách chờ thanh toán')
            .message
        );
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, page, revision]);

  const columns: ColumnsType<StaffAppointment> = [
    {
      title: 'Mã hẹn',
      key: 'code',
      width: 130,
      render: (_, order) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#0958d9', whiteSpace: 'nowrap' }}>
            {order.code}
          </Text>
          {order.isOnline ? (
            <Tag color="blue">Online</Tag>
          ) : (
            <Tag color="purple">Tại chỗ</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Ngày hẹn',
      key: 'date',
      width: 130,
      render: (_, order) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(order.date).format('DD/MM/YYYY')}</Text>
          {order.checkedInAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Check-in {dayjs(order.checkedInAt).format('HH:mm DD/MM')}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Thú cưng',
      key: 'pet',
      width: 120,
      render: (_, order) => (
        <Text strong>{getAppointmentPetName(order.petId)}</Text>
      ),
    },
    {
      title: 'Chủ nuôi',
      key: 'owner',
      width: 160,
      render: (_, order) => {
        const phone = getAppointmentOwnerPhone(order.ownerId);
        return (
          <Space direction="vertical" size={0}>
            <Text>{getAppointmentOwnerName(order.ownerId)}</Text>
            {phone !== '-' && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {phone}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Hóa đơn',
      key: 'invoice',
      width: 190,
      render: (_, order) => {
        const invoice = unpaid.get(order._id);
        return invoice ? (
          <Space direction="vertical" size={0}>
            <Text>
              {invoice.code} · {formatVnd(invoice.totalAmount)}
            </Text>
            <Tag color="orange" style={{ width: 'fit-content' }}>
              Đã lập, chưa thanh toán
            </Tag>
          </Space>
        ) : (
          <Tag>Chưa lập hóa đơn</Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_, order) =>
        canPay ? (
          <Button
            size="small"
            type="primary"
            icon={<DollarOutlined />}
            onClick={() => onOpen(order)}
          >
            Thanh toán
          </Button>
        ) : (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onOpen(order)}
          >
            Xem
          </Button>
        ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="Các bé đã xong mọi dịch vụ và đang chờ trong chuồng (Chờ chủ đón)."
        description={
          canPay
            ? 'Khi khách đến đón, bấm Thanh toán để lập hóa đơn và thu tiền mặt hoặc thanh toán QR. Thanh toán xong đơn chuyển Hoàn tất. Mặc định hiển thị ngày hẹn hôm nay. Đổi hoặc xóa khoảng ngày để xem các ca cũ chưa thanh toán.'
            : 'Lễ tân lập hóa đơn và thu tiền khi khách đến đón. Mặc định hiển thị ngày hẹn hôm nay. Đổi hoặc xóa khoảng ngày để xem các ca cũ chưa thanh toán.'
        }
      />
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={onRefresh}>
              Thử lại
            </Button>
          }
        />
      )}
      <FilterCard>
        <ResponsiveFilterRow>
          <Segmented<InvoicePeriod>
            aria-label="Kỳ chờ thanh toán"
            value={period}
            options={INVOICE_PERIOD_OPTIONS}
            onChange={next => {
              setPeriod(next);
              if (next !== 'custom') setRange(getInvoicePeriodRange(next));
              setPage(1);
            }}
          />
          <RangePicker
            aria-label="Khoảng ngày hẹn"
            value={range}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            presets={getInvoiceRangePresets()}
            onChange={value => {
              setRange(value);
              setPeriod('custom');
              setPage(1);
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            Làm mới
          </Button>
        </ResponsiveFilterRow>
      </FilterCard>
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        scroll={{ x: 870 }}
        locale={{
          emptyText: range
            ? 'Không có ca chờ thanh toán trong khoảng ngày đã chọn. Đổi hoặc xóa khoảng ngày để xem các ca khác.'
            : 'Không có bé nào đang chờ chủ đón.',
        }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showTotal: t => `${t} đơn chờ thanh toán`,
          onChange: setPage,
        }}
      />
    </Space>
  );
};

export default PendingCheckoutTab;
