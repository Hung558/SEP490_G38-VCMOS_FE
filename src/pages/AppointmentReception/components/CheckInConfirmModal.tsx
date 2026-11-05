import { Alert, Modal, Space, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { StaffAppointment } from '@/types';
import { getAppointmentPetName } from '@/services/AppointmentOrderService';

const { Text } = Typography;

interface CheckInConfirmModalProps {
  open: boolean;
  appointment: StaffAppointment | null;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const CheckInConfirmModal = ({
  open,
  appointment,
  submitting,
  onConfirm,
  onClose,
}: CheckInConfirmModalProps) => {
  if (!appointment) return null;

  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <span>Xác nhận tiếp nhận lịch hẹn</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={onConfirm}
      okText="Xác nhận Check-in"
      cancelText="Hủy bỏ"
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      cancelButtonProps={{ disabled: submitting }}
      destroyOnHidden
    >
      <Space
        direction="vertical"
        size="middle"
        style={{ width: '100%', marginTop: 8 }}
      >
        <Alert
          message="Chuyển trạng thái lịch hẹn sang Đã tiếp nhận (CheckedIn)"
          description="Hành động này sẽ ghi nhận khách hàng và thú cưng đã có mặt tại phòng khám vào lúc này."
          type="info"
          showIcon
        />

        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Mã lịch hẹn: </Text>
              <Text strong style={{ color: '#0958d9' }}>
                {appointment.code}
              </Text>
            </div>
            <div>
              <Text type="secondary">Thú cưng: </Text>
              <Text strong>{getAppointmentPetName(appointment.petId)}</Text>
            </div>
            <div>
              <Text type="secondary">Ngày hẹn: </Text>
              <Text strong>
                {appointment.date
                  ? dayjs(appointment.date).format('DD/MM/YYYY')
                  : '-'}
              </Text>
            </div>
          </Space>
        </div>
      </Space>
    </Modal>
  );
};

export default CheckInConfirmModal;
