import { Descriptions, Modal, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { StaffAppointment } from '@/types';
import {
  getAppointmentOwnerName,
  getAppointmentOwnerPhone,
  getAppointmentPetName,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
} from '@/services/AppointmentOrderService';

const { Text } = Typography;

interface AppointmentDetailModalProps {
  open: boolean;
  appointment: StaffAppointment | null;
  onClose: () => void;
}

const AppointmentDetailModal = ({
  open,
  appointment,
  onClose,
}: AppointmentDetailModalProps) => {
  if (!appointment) return null;

  return (
    <Modal
      title={
        <span>
          Chi tiết lịch hẹn{' '}
          <Text strong style={{ color: '#0958d9' }}>
            {appointment.code}
          </Text>
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={640}
    >
      <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
        <Descriptions.Item label="Mã lịch hẹn">
          <Text strong>{appointment.code}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="Ngày hẹn">
          {appointment.date
            ? dayjs(appointment.date).format('DD/MM/YYYY')
            : '-'}
        </Descriptions.Item>

        <Descriptions.Item label="Trạng thái">
          <Tag color={getAppointmentStatusColor(appointment.derivedStatus)}>
            {getAppointmentStatusLabel(appointment.derivedStatus)}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Hình thức">
          {appointment.isOnline ? (
            <Tag color="blue">Online</Tag>
          ) : (
            <Tag color="purple">Tại chỗ</Tag>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Thú cưng">
          <Text strong>{getAppointmentPetName(appointment.petId)}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="Chủ nuôi">
          {getAppointmentOwnerName(appointment.ownerId)}
        </Descriptions.Item>

        <Descriptions.Item label="Số điện thoại">
          {getAppointmentOwnerPhone(appointment.ownerId)}
        </Descriptions.Item>

        <Descriptions.Item label="Thời gian check-in">
          {appointment.checkedInAt ? (
            <Text style={{ color: '#52c41a' }}>
              {dayjs(appointment.checkedInAt).format('HH:mm:ss DD/MM/YYYY')}
            </Text>
          ) : (
            <Text type="secondary">Chưa check-in</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Ghi chú" span={2}>
          {appointment.note || <Text type="secondary">Không có ghi chú</Text>}
        </Descriptions.Item>

        <Descriptions.Item label="Thời gian tạo">
          {appointment.createdAt
            ? dayjs(appointment.createdAt).format('HH:mm DD/MM/YYYY')
            : '-'}
        </Descriptions.Item>

        <Descriptions.Item label="Cập nhật lần cuối">
          {appointment.updatedAt
            ? dayjs(appointment.updatedAt).format('HH:mm DD/MM/YYYY')
            : '-'}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default AppointmentDetailModal;
