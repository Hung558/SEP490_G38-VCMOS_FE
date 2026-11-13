import { useId } from 'react';
import { Alert, Form, Input, Modal, Space, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ReceptionIntake, StaffAppointment } from '@/types';
import {
  getAppointmentPetName,
  readReceptionIntake,
  RECEPTION_INTAKE_FIELD_LIMIT,
} from '@/services/AppointmentOrderService';
import { isReceptionIntakeEnabled } from './receptionIntakeFeature';

const { Text } = Typography;

interface CheckInConfirmModalProps {
  open: boolean;
  appointment: StaffAppointment | null;
  submitting: boolean;
  onConfirm: (intake?: ReceptionIntake) => void;
  onClose: () => void;
}

const CheckInConfirmModal = ({
  open,
  appointment,
  submitting,
  onConfirm,
  onClose,
}: CheckInConfirmModalProps) => {
  const formId = useId();
  if (!appointment) return null;

  const submitIntake = (values: ReceptionIntake) => {
    const intake = readReceptionIntake(values);
    if (open && !submitting && intake) onConfirm(intake);
  };

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
      onOk={isReceptionIntakeEnabled ? undefined : () => onConfirm()}
      okText="Xác nhận Check-in"
      cancelText="Hủy bỏ"
      confirmLoading={submitting}
      okButtonProps={
        isReceptionIntakeEnabled
          ? { disabled: submitting, htmlType: 'submit', form: formId }
          : { disabled: submitting }
      }
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

        {isReceptionIntakeEnabled && (
          <Form<ReceptionIntake>
            key={appointment._id}
            id={formId}
            name={formId}
            layout="vertical"
            preserve={false}
            disabled={submitting}
            onFinish={submitIntake}
          >
            <Text strong>Phiếu tiếp nhận</Text>
            <Form.Item<ReceptionIntake>
              label="Triệu chứng"
              name="symptoms"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: 'Vui lòng nhập triệu chứng.',
                },
              ]}
            >
              <Input.TextArea
                rows={2}
                maxLength={RECEPTION_INTAKE_FIELD_LIMIT}
                showCount
              />
            </Form.Item>
            <Form.Item<ReceptionIntake>
              label="Tình trạng ban đầu"
              name="initialCondition"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: 'Vui lòng nhập tình trạng ban đầu.',
                },
              ]}
            >
              <Input.TextArea
                rows={2}
                maxLength={RECEPTION_INTAKE_FIELD_LIMIT}
                showCount
              />
            </Form.Item>
          </Form>
        )}
      </Space>
    </Modal>
  );
};

export default CheckInConfirmModal;
