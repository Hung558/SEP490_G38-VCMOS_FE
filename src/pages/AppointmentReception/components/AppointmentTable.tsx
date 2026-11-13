import { Button, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  EyeOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { StaffAppointment } from '@/types';
import {
  getAppointmentOwnerName,
  getAppointmentOwnerPhone,
  getAppointmentPetName,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
} from '@/services/AppointmentOrderService';
import { ActionsWrapper } from './styles';
import { getReceptionNextAction } from './receptionToday';

const { Text } = Typography;

interface AppointmentTableProps {
  appointments: StaffAppointment[];
  activeCageOrderIds: ReadonlySet<string>;
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  isReceptionist: boolean;
  onPageChange: (page: number, limit: number) => void;
  onViewDetail: (appointment: StaffAppointment) => void;
  onCheckIn: (appointment: StaffAppointment) => void;
  onAssignCage: (appointment: StaffAppointment) => void;
  onCancelAppointment?: (appointment: StaffAppointment) => void;
}

const AppointmentTable = ({
  appointments,
  activeCageOrderIds,
  total,
  page,
  limit,
  loading,
  isReceptionist,
  onPageChange,
  onViewDetail,
  onCheckIn,
  onAssignCage,
  onCancelAppointment,
}: AppointmentTableProps) => {
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
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (date: string, record: StaffAppointment) => (
        <div>
          <Text>{date ? dayjs(date).format('DD/MM/YYYY') : '-'}</Text>
          {record.slotStart && (
            <div style={{ fontSize: 12, color: '#0958d9', fontWeight: 500 }}>
              {record.slotStart}
              {record.slotEnd ? ` - ${record.slotEnd}` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Thú cưng',
      key: 'pet',
      width: 140,
      render: (_, record) => (
        <Text strong>{getAppointmentPetName(record.petId)}</Text>
      ),
    },
    {
      title: 'Chủ nuôi',
      key: 'owner',
      width: 180,
      render: (_, record) => {
        const name = getAppointmentOwnerName(record.ownerId);
        const phone = getAppointmentOwnerPhone(record.ownerId);
        return (
          <Space direction="vertical" size={2}>
            <Text>{name}</Text>
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
      title: 'Hình thức',
      dataIndex: 'isOnline',
      key: 'isOnline',
      width: 110,
      render: (isOnline: boolean) =>
        isOnline ? (
          <Tag color="blue">Online</Tag>
        ) : (
          <Tag color="purple">Tại chỗ</Tag>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'derivedStatus',
      key: 'derivedStatus',
      width: 140,
      render: (status: string, record: StaffAppointment) => {
        const tag = (
          <Tag color={getAppointmentStatusColor(status)}>
            {getAppointmentStatusLabel(status)}
          </Tag>
        );
        return (
          <Space direction="vertical" size={2}>
            {status === 'Cancelled' && record.cancelReason ? (
              <Tooltip title={`Lý do hủy: ${record.cancelReason}`}>
                {tag}
              </Tooltip>
            ) : (
              tag
            )}
            {isReceptionist && activeCageOrderIds.has(record._id) && (
              <Tag color="cyan" icon={<BuildOutlined />}>
                Đã phân chuồng
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Check-in lúc',
      dataIndex: 'checkedInAt',
      key: 'checkedInAt',
      width: 160,
      render: (checkedInAt?: string | null) =>
        checkedInAt ? (
          <Text style={{ fontSize: 13 }}>
            {dayjs(checkedInAt).format('HH:mm DD/MM/YYYY')}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 280,
      fixed: 'right',
      render: (_, record) => {
        const nextAction = isReceptionist
          ? getReceptionNextAction(record.derivedStatus)
          : undefined;
        const canCancel =
          isReceptionist &&
          record.derivedStatus === 'Booked' &&
          Boolean(onCancelAppointment);

        return (
          <Space direction="vertical" size={4}>
            <ActionsWrapper>
              {nextAction?.kind === 'checkIn' && (
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined aria-hidden />}
                  onClick={() => onCheckIn(record)}
                >
                  Check-in
                </Button>
              )}
              <Button
                size="small"
                type={nextAction?.kind === 'detail' ? 'primary' : 'default'}
                icon={<EyeOutlined aria-hidden />}
                onClick={() => onViewDetail(record)}
              >
                Chi tiết
              </Button>
              {isReceptionist && (
                <Button
                  size="small"
                  icon={<BuildOutlined />}
                  onClick={() => onAssignCage(record)}
                >
                  Phân chuồng
                </Button>
              )}
              {canCancel && (
                <Button
                  size="small"
                  danger
                  onClick={() => onCancelAppointment?.(record)}
                >
                  Hủy hẹn
                </Button>
              )}
            </ActionsWrapper>
            {nextAction?.kind === 'detail' && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {nextAction.hint}
              </Text>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={appointments}
      rowKey="_id"
      loading={loading}
      scroll={{ x: 1050 }}
      pagination={{
        current: page,
        pageSize: limit,
        total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: t => `Tổng cộng ${t} lịch hẹn`,
        onChange: (p, l) => onPageChange(p, l),
      }}
    />
  );
};

export default AppointmentTable;
