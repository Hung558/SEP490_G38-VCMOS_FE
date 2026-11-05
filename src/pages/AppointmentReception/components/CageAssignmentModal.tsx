import { useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { BuildOutlined } from '@ant-design/icons';
import type { Cage, StaffAppointment } from '@/types';
import CageService from '@/services/CageService';
import { getAppointmentPetName } from '@/services/AppointmentOrderService';

const { Text } = Typography;

interface CageAssignmentModalProps {
  open: boolean;
  targetAppointment: StaffAppointment | null;
  submitting: boolean;
  onSubmit: (values: { cageId: string; orderId: string }) => Promise<void>;
  onClose: () => void;
}

const CageAssignmentModal = ({
  open,
  targetAppointment,
  submitting,
  onSubmit,
  onClose,
}: CageAssignmentModalProps) => {
  const [form] = Form.useForm();
  const [availableCages, setAvailableCages] = useState<Cage[]>([]);
  const [loadingCages, setLoadingCages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const controller = new AbortController();

    const fetchAvailableCages = async () => {
      setLoadingCages(true);
      setLoadError(null);
      try {
        const res = await CageService.listCages(
          { status: 'Available', limit: 100 },
          { signal: controller.signal }
        );
        if (isMounted) {
          setAvailableCages(res.data?.items || []);
        }
      } catch (err: unknown) {
        if (isMounted && !controller.signal.aborted) {
          setLoadError('Không thể tải danh sách chuồng trống');
        }
      } finally {
        if (isMounted) {
          setLoadingCages(false);
        }
      }
    };

    fetchAvailableCages();

    if (targetAppointment) {
      form.setFieldsValue({
        orderId: targetAppointment._id,
      });
    } else {
      form.resetFields();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [open, targetAppointment, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        cageId: values.cageId.trim(),
        orderId: values.orderId.trim(),
      });
    } catch {
      // Form validation failed or handled by onSubmit
    }
  };

  return (
    <Modal
      title={
        <Space>
          <BuildOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <span>Phân công chuồng cho lịch hẹn</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Xác nhận phân chuồng"
      cancelText="Hủy bỏ"
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting || loadingCages }}
      cancelButtonProps={{ disabled: submitting }}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {loadError && (
          <Alert
            message={loadError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {targetAppointment ? (
          <div
            style={{
              background: '#f8fafc',
              padding: 12,
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            <Space direction="vertical" size={2}>
              <div>
                <Text type="secondary">Mã lịch hẹn: </Text>
                <Text strong style={{ color: '#0958d9' }}>
                  {targetAppointment.code}
                </Text>
              </div>
              <div>
                <Text type="secondary">Thú cưng: </Text>
                <Text strong>
                  {getAppointmentPetName(targetAppointment.petId)}
                </Text>
              </div>
            </Space>

            <Form.Item
              name="orderId"
              hidden
              initialValue={targetAppointment._id}
            >
              <Input />
            </Form.Item>
          </div>
        ) : (
          <Form.Item
            name="orderId"
            label="ID đơn hẹn (MongoDB ObjectId 24 ký tự)"
            rules={[
              { required: true, message: 'Vui lòng nhập ID đơn hẹn' },
              {
                pattern: /^[0-9a-fA-F]{24}$/,
                message: 'ID đơn hẹn phải là 24 ký tự hex',
              },
            ]}
          >
            <Input placeholder="Nhập ID đơn hẹn" />
          </Form.Item>
        )}

        <Form.Item
          name="cageId"
          label="Chọn chuồng trống (Available)"
          rules={[{ required: true, message: 'Vui lòng chọn chuồng' }]}
        >
          <Select
            placeholder={
              loadingCages
                ? 'Đang tải danh sách chuồng...'
                : 'Chọn chuồng đang trống'
            }
            loading={loadingCages}
            disabled={loadingCages || availableCages.length === 0}
            options={availableCages.map(c => ({
              label: `${c.label} - Size ${c.size}${c.isIsolated ? ' [Cách ly]' : ''}`,
              value: c._id,
            }))}
            notFoundContent={
              loadingCages
                ? 'Đang tải...'
                : 'Hiện không có chuồng nào đang trống'
            }
          />
        </Form.Item>

        {!loadingCages && availableCages.length === 0 && (
          <Alert
            message="Không có chuồng trống"
            description="Tất cả các chuồng hiện đang được sử dụng hoặc chưa sẵn sàng. Vui lòng kiểm tra lại sau."
            type="warning"
            showIcon
          />
        )}
      </Form>
    </Modal>
  );
};

export default CageAssignmentModal;
