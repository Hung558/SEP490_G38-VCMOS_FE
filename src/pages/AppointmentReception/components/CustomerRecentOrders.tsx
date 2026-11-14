import { useEffect, useState } from 'react';
import { Alert, Button, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import type { StaffAppointment } from '@/types';
import AppointmentOrderService, {
  extractApiError,
  getAppointmentPetName,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
} from '@/services/AppointmentOrderService';

const { Text } = Typography;
const LIMIT = 5;

interface CustomerRecentOrdersProps {
  customerId: string;
  onViewDetail?: (order: StaffAppointment) => void;
}

/** SCR-21 customer detail: the customer's latest orders (GET /appointment-orders?ownerId=) */
const CustomerRecentOrders = ({
  customerId,
  onViewDetail,
}: CustomerRecentOrdersProps) => {
  const [orders, setOrders] = useState<StaffAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    AppointmentOrderService.listStaffAppointments(
      { ownerId: customerId, page: 1, limit: LIMIT },
      { signal: controller.signal }
    )
      .then(res => {
        setOrders(res.data || []);
        setTotal(res.pagination?.total || 0);
      })
      .catch(err => {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        setError(
          extractApiError(err, 'Không tải được lịch hẹn của khách').message
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [customerId]);

  const columns: ColumnsType<StaffAppointment> = [
    {
      title: 'Mã hẹn',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => (
        <Text strong style={{ color: '#0958d9' }}>
          {code}
        </Text>
      ),
    },
    {
      title: 'Ngày hẹn',
      key: 'date',
      width: 140,
      render: (_, o) =>
        `${dayjs(o.date).format('DD/MM/YYYY')}${o.slotStart ? ` ${o.slotStart}` : ''}`,
    },
    {
      title: 'Thú cưng',
      key: 'pet',
      render: (_, o) => getAppointmentPetName(o.petId),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'derivedStatus',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <Tag color={getAppointmentStatusColor(status)}>
          {getAppointmentStatusLabel(status)}
        </Tag>
      ),
    },
    ...(onViewDetail
      ? [
          {
            title: '',
            key: 'actions',
            width: 100,
            render: (_: unknown, o: StaffAppointment) => (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onViewDetail(o)}
              >
                Chi tiết
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 8 }}
        />
      )}
      <Table
        title={() => (
          <Text strong>
            Lịch hẹn gần đây
            {total > LIMIT ? ` (${LIMIT} trên ${total})` : ` (${total})`}
          </Text>
        )}
        columns={columns}
        dataSource={orders}
        rowKey="_id"
        size="small"
        loading={loading}
        pagination={false}
        scroll={{ x: 560 }}
        locale={{ emptyText: 'Khách chưa có lịch hẹn nào' }}
        style={{ marginTop: 16 }}
      />
    </>
  );
};

export default CustomerRecentOrders;
