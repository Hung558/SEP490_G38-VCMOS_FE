import { Descriptions, Modal, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { StaffAppointment } from '@/types';
import {
  getAppointmentOwnerName,
  getAppointmentOwnerPhone,
  getAppointmentPetName,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
  readReceptionIntake,
} from '@/services/AppointmentOrderService';
import AppointmentServicesPanel from './AppointmentServicesPanel';
import { isReceptionIntakeEnabled } from './receptionIntakeFeature';

const { Text } = Typography;

const IntakeText = styled.span`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

interface AppointmentDetailModalProps {
  open: boolean;
  appointment: StaffAppointment | null;
  /** Lễ tân được phân công nhân sự cho dịch vụ; Admin chỉ xem */
  canAssignStaff: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onCancelAppointment?: (appointment: StaffAppointment) => void;
  serviceRefreshTrigger?: number;
}

const AppointmentDetailModal = ({
  open,
  appointment,
  canAssignStaff,
  onClose,
  onUpdated,
  onCancelAppointment,
  serviceRefreshTrigger,
}: AppointmentDetailModalProps) => {
  if (!appointment) return null;
  const intake = isReceptionIntakeEnabled
    ? readReceptionIntake(appointment.intake)
    : undefined;

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
      width={760}
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

        {(appointment.slotStart || appointment.slotEnd) && (
          <Descriptions.Item label="Khung giờ hẹn">
            <strong style={{ color: '#0958d9' }}>
              {appointment.slotStart || '--:--'}
              {appointment.slotEnd ? ` - ${appointment.slotEnd}` : ''}
            </strong>
          </Descriptions.Item>
        )}

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

        {appointment.derivedStatus === 'Cancelled' && (
          <Descriptions.Item label="Thông tin hủy lịch" span={2}>
            <div>
              <span style={{ color: '#ff4d4f', fontWeight: 600 }}>Lý do: </span>
              <span>{appointment.cancelReason || 'Không có lý do'}</span>
            </div>
            {appointment.cancelledAt && (
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                Thời gian hủy:{' '}
                {dayjs(appointment.cancelledAt).format('HH:mm DD/MM/YYYY')}
              </div>
            )}
          </Descriptions.Item>
        )}

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

      {isReceptionIntakeEnabled && (
        <Descriptions
          title="Phiếu tiếp nhận"
          bordered
          column={1}
          size="small"
          style={{ marginTop: 16 }}
        >
          {intake ? (
            <>
              <Descriptions.Item label="Triệu chứng">
                <IntakeText>{intake.symptoms}</IntakeText>
              </Descriptions.Item>
              <Descriptions.Item label="Tình trạng ban đầu">
                <IntakeText>{intake.initialCondition}</IntakeText>
              </Descriptions.Item>
            </>
          ) : (
            <Descriptions.Item label="Trạng thái">
              <Text type="secondary">Chưa có phiếu tiếp nhận đã lưu.</Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      )}

      <AppointmentServicesPanel
        key={appointment._id}
        appointment={appointment}
        canAssign={canAssignStaff}
        onUpdated={onUpdated}
        onCancelAppointment={onCancelAppointment}
        refreshTrigger={serviceRefreshTrigger}
      />
    </Modal>
  );
};

export default AppointmentDetailModal;
