import { Button, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  EyeOutlined,
  BuildOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CageAssignment, StaffAppointment } from '@/types';
import {
  getAppointmentOwnerName,
  getAppointmentOwnerPhone,
  getAppointmentPetName,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
} from '@/services/AppointmentOrderService';
import { getAssignmentCageLabel } from '@/services/CageAssignmentService';
import { ActionsWrapper } from './styles';
import { getReceptionNextAction } from './receptionToday';

const { Text } = Typography;

// A cage holds a pet that is at the clinic: from check-in until the owner picks it up.
const CAGE_ASSIGNABLE_STATUSES = new Set([
  'CheckedIn',
  'InProgress',
  'WaitOwner',
]);

interface AppointmentTableProps {
  appointments: StaffAppointment[];
  activeCageByOrderId: ReadonlyMap<string, CageAssignment>;
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  isReceptionist: boolean;
  onPageChange: (page: number, limit: number) => void;
  onViewDetail: (appointment: StaffAppointment) => void;
  onCheckIn: (appointment: StaffAppointment) => void;
  onAssignCage: (appointment: StaffAppointment) => void;
  onViewCage: (assignment: CageAssignment) => void;
  onCancelAppointment?: (appointment: StaffAppointment) => void;
}

const AppointmentTable = ({
  appointments,
  activeCageByOrderId,
  total,
  page,
  limit,
  loading,
  isReceptionist,
  onPageChange,
  onViewDetail,
  onCheckIn,
  onAssignCage,
  onViewCage,
  onCancelAppointment,
}: AppointmentTableProps) => {
  const getActiveCage = (record: StaffAppointment) =>
    isReceptionist ? activeCageByOrderId.get(record._id) : undefined;

  // Widths add up to 960 so the table fits a 1366px screen without the fixed
  // actions column covering the status column
  const columns: ColumnsType<StaffAppointment> = [
    {
      title: 'Mã hẹn',
      dataIndex: 'code',
      key: 'code',
      width: 125,
      render: (code: string, record: StaffAppointment) => (
        <Space direction="vertical" size={4}>
          <Text strong style={{ color: '#0958d9', whiteSpace: 'nowrap' }}>
            {code}
          </Text>
          {record.isOnline ? (
            <Tag color="blue">Online</Tag>
          ) : (
            <Tag color="purple">Tại chỗ</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Ngày hẹn',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date: string, record: StaffAppointment) => (
        <div style={{ whiteSpace: 'nowrap' }}>
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
      width: 120,
      render: (_, record) => (
        <Text strong>{getAppointmentPetName(record.petId)}</Text>
      ),
    },
    {
      title: 'Chủ nuôi',
      key: 'owner',
      width: 160,
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
      title: 'Trạng thái',
      dataIndex: 'derivedStatus',
      key: 'derivedStatus',
      width: 155,
      render: (status: string, record: StaffAppointment) => {
        const tag = (
          <Tag color={getAppointmentStatusColor(status)}>
            {getAppointmentStatusLabel(status)}
          </Tag>
        );
        const activeCage = getActiveCage(record);
        return (
          <Space direction="vertical" size={4}>
            {status === 'Cancelled' && record.cancelReason ? (
              <Tooltip title={`Lý do hủy: ${record.cancelReason}`}>
                {tag}
              </Tooltip>
            ) : (
              tag
            )}
            {activeCage && (
              <Tooltip
                title={`Chuồng ${getAssignmentCageLabel(activeCage.cageId)}`}
              >
                <Tag color="cyan" icon={<BuildOutlined />}>
                  Đã phân chuồng
                </Tag>
              </Tooltip>
            )}
            {record.checkedInAt && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Check-in {dayjs(record.checkedInAt).format('HH:mm DD/MM')}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 290,
      fixed: 'right',
      render: (_, record) => {
        const status = record.derivedStatus;
        const nextAction = isReceptionist
          ? getReceptionNextAction(status)
          : undefined;
        const isBooked = nextAction?.kind === 'checkIn';
        const canCancel = isBooked && Boolean(onCancelAppointment);
        const activeCage = getActiveCage(record);
        const canAssignCage =
          isReceptionist && !activeCage && CAGE_ASSIGNABLE_STATUSES.has(status);

        return (
          <Space direction="vertical" size={4}>
            <ActionsWrapper>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onViewDetail(record)}
              >
                Chi tiết
              </Button>
              {isBooked && (
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => onCheckIn(record)}
                >
                  Check-in
                </Button>
              )}
              {canAssignCage && (
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<BuildOutlined />}
                  onClick={() => onAssignCage(record)}
                >
                  Phân chuồng
                </Button>
              )}
              {activeCage && (
                <Button
                  size="small"
                  icon={<HomeOutlined />}
                  onClick={() => onViewCage(activeCage)}
                >
                  Xem chuồng
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
              <Text type="secondary">{nextAction.hint}</Text>
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
      scroll={{ x: 960 }}
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
