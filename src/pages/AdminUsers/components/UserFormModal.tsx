import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type {
  AdminRole,
  AdminUser,
  CreateStaffPayload,
  UpdateAdminUserPayload,
} from '@/services/AdminUserService';

const staffRoles: Array<Exclude<AdminRole, 'PetOwner' | 'Admin'>> = [
  'Receptionist',
  'Veterinarian',
  'Groomer',
];

const roleLabels: Record<string, string> = {
  Receptionist: 'Lễ tân',
  Veterinarian: 'Bác sĩ thú y',
  Groomer: 'Groomer',
  PetOwner: 'Chủ nuôi',
};

interface Props {
  open: boolean;
  editingUser: AdminUser | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (
    values: CreateStaffPayload | UpdateAdminUserPayload
  ) => Promise<void>;
}

const UserFormModal = ({
  open,
  editingUser,
  loading,
  onCancel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm();
  const isEditing = Boolean(editingUser);
  const isPetOwner = editingUser?.role === 'PetOwner';

  useEffect(() => {
    if (!open) return;
    if (editingUser) {
      form.setFieldsValue({
        fullName: editingUser.fullName,
        phone: editingUser.phone,
        email: editingUser.email || '',
        role: editingUser.role,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ role: 'Receptionist' });
    }
  }, [editingUser, form, open]);

  const handleFinish = (values: any) => {
    if (editingUser) {
      const payload: UpdateAdminUserPayload = {
        fullName: values.fullName?.trim(),
        phone: editingUser.phone,
        email: editingUser.email || undefined,
      };
      if (!isPetOwner && values.role) {
        payload.role = values.role;
      }
      return onSubmit(payload);
    }
    return onSubmit(values);
  };

  return (
    <Modal
      open={open}
      title={editingUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản nhân sự'}
      okText={editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
      cancelText="Hủy"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="fullName"
          label="Họ và tên"
          rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
        >
          <Input maxLength={120} />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại' },
            {
              pattern: /^0\d{9}$/,
              message: 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0',
            },
          ]}
        >
          <Input disabled={isEditing} />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: 'email', message: 'Email không đúng định dạng' }]}
        >
          <Input type="email" disabled={isEditing} />
        </Form.Item>
        <Form.Item
          name="role"
          label="Vai trò"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
        >
          <Select
            disabled={isPetOwner}
            options={
              isPetOwner
                ? [{ value: 'PetOwner', label: roleLabels.PetOwner }]
                : staffRoles.map(role => ({
                    value: role,
                    label: roleLabels[role],
                  }))
            }
          />
        </Form.Item>
        {!editingUser && (
          <Form.Item
            name="password"
            label="Mật khẩu tạm thời"
            rules={[
              { required: true, min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default UserFormModal;
