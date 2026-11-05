import { Alert, Form, Input, Modal, Select, Switch } from 'antd';
import { useEffect } from 'react';
import {
  CAGE_SIZES,
  CAGE_STATUSES,
  cageSizeLabels,
  cageStatusLabels,
  validateCageLabel,
  validateCageSize,
  type Cage,
  type CageFormValues,
} from '@/services/CageService';

interface CageFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  editingCage: Cage | null;
  saving: boolean;
  fieldErrors: Record<string, string>;
  generalError: string | null;
  onCancel: () => void;
  onSubmit: (values: CageFormValues) => Promise<boolean>;
}

const CageFormModal = ({
  open,
  mode,
  editingCage,
  saving,
  fieldErrors,
  generalError,
  onCancel,
  onSubmit,
}: CageFormModalProps) => {
  const [form] = Form.useForm<CageFormValues>();
  const isEditing = mode === 'edit';

  useEffect(() => {
    if (!open) return;
    if (isEditing && editingCage) {
      form.setFieldsValue({
        label: editingCage.label,
        size: editingCage.size,
        isIsolated: Boolean(editingCage.isIsolated),
        status: editingCage.status,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        isIsolated: false,
        status: 'Available',
      });
    }
  }, [editingCage, form, isEditing, open]);

  useEffect(() => {
    if (!open || !Object.keys(fieldErrors).length) return;
    form.setFields(
      Object.entries(fieldErrors).map(([name, error]) => ({
        name: name as keyof CageFormValues,
        errors: [error],
      }))
    );
  }, [fieldErrors, form, open]);

  return (
    <Modal
      open={open}
      title={isEditing ? 'Cập nhật thông tin chuồng' : 'Thêm chuồng mới'}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo chuồng'}
      cancelText="Hủy"
      confirmLoading={saving}
      okButtonProps={{ disabled: saving }}
      cancelButtonProps={{ disabled: saving }}
      maskClosable={false}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
      width={520}
    >
      {generalError && (
        <Alert
          type="error"
          showIcon
          message={generalError}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        disabled={saving}
        onFinish={onSubmit}
        initialValues={{
          isIsolated: false,
          status: 'Available',
        }}
      >
        <Form.Item
          name="label"
          label="Nhãn chuồng"
          required
          rules={[
            {
              validator: async (_, value) => {
                const message = validateCageLabel(value);
                if (message) throw new Error(message);
              },
            },
          ]}
        >
          <Input placeholder="VD: A-01, B-02, VIP-01" disabled={saving} />
        </Form.Item>

        <Form.Item
          name="size"
          label="Kích thước"
          required
          rules={[
            {
              validator: async (_, value) => {
                const message = validateCageSize(value);
                if (message) throw new Error(message);
              },
            },
          ]}
        >
          <Select
            placeholder="Chọn kích thước"
            options={CAGE_SIZES.map(s => ({
              label: cageSizeLabels[s],
              value: s,
            }))}
            disabled={saving}
          />
        </Form.Item>

        <Form.Item name="status" label="Trạng thái chuồng" required>
          <Select
            options={CAGE_STATUSES.map(s => ({
              label: cageStatusLabels[s],
              value: s,
            }))}
            disabled={saving}
          />
        </Form.Item>

        <Form.Item
          name="isIsolated"
          label="Khu vực cách ly"
          valuePropName="checked"
          extra="Bật chế độ này nếu chuồng dùng để cách ly thú cưng mắc bệnh truyền nhiễm hoặc cần theo dõi đặc biệt"
        >
          <Switch disabled={saving} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CageFormModal;
