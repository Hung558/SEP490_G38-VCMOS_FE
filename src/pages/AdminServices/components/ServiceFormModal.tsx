import { Alert, Form, Input, InputNumber, Modal, Select, Spin } from 'antd';
import { useEffect } from 'react';
import {
  SERVICE_CATEGORIES,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_DURATION_MAX,
  SERVICE_DURATION_MIN,
  SERVICE_NAME_MAX,
  serviceCategoryLabels,
  serviceStatusLabels,
  validateServiceCategory,
  validateServiceDescription,
  validateServiceDuration,
  validateServiceName,
  validateServicePrice,
  type Service,
  type ServiceFormValues,
} from '@/services/ServiceService';

interface Props {
  open: boolean;
  editingService: Service | null;
  loading: boolean;
  saving: boolean;
  fieldErrors: Record<string, string>;
  onCancel: () => void;
  onSubmit: (values: ServiceFormValues) => Promise<void>;
}

const ServiceFormModal = ({
  open,
  editingService,
  loading,
  saving,
  fieldErrors,
  onCancel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<ServiceFormValues>();
  const isEditing = Boolean(editingService);

  useEffect(() => {
    if (!open) return;
    if (editingService) {
      form.setFieldsValue({
        name: editingService.name,
        category: editingService.category,
        defaultDuration: editingService.defaultDuration ?? null,
        basePrice: editingService.basePrice ?? null,
        description: editingService.description ?? '',
      });
    } else {
      form.resetFields();
    }
  }, [editingService, form, open]);

  useEffect(() => {
    if (!open || !Object.keys(fieldErrors).length) return;
    form.setFields(
      Object.entries(fieldErrors).map(([name, error]) => ({
        name: name as keyof ServiceFormValues,
        errors: [error],
      }))
    );
  }, [fieldErrors, form, open]);

  return (
    <Modal
      open={open}
      title={isEditing ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
      cancelText="Hủy"
      confirmLoading={saving}
      okButtonProps={{ disabled: loading }}
      maskClosable={false}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
      width={640}
    >
      <Spin spinning={loading} tip="Đang tải thông tin dịch vụ...">
        {isEditing && editingService ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Mã dịch vụ: ${editingService.code}`}
            description={`Trạng thái hiện tại: ${serviceStatusLabels[editingService.status]}. Đổi trạng thái tại danh sách dịch vụ.`}
          />
        ) : null}
        <Form
          form={form}
          layout="vertical"
          disabled={loading}
          onFinish={values => onSubmit(values)}
        >
          <Form.Item
            name="name"
            label="Tên dịch vụ"
            validateTrigger={['onBlur', 'onSubmit']}
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateServiceName(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <Input
              maxLength={SERVICE_NAME_MAX}
              showCount
              placeholder="VD: Khám tổng quát"
            />
          </Form.Item>
          <Form.Item
            name="category"
            label="Danh mục"
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateServiceCategory(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <Select
              placeholder="Chọn danh mục"
              options={SERVICE_CATEGORIES.map(item => ({
                value: item,
                label: serviceCategoryLabels[item],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="defaultDuration"
            label="Thời lượng thực hiện (phút)"
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateServiceDuration(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={SERVICE_DURATION_MIN}
              max={SERVICE_DURATION_MAX}
              precision={0}
              placeholder={`${SERVICE_DURATION_MIN} - ${SERVICE_DURATION_MAX}`}
            />
          </Form.Item>
          <Form.Item
            name="basePrice"
            label="Giá niêm yết (đ)"
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateServicePrice(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1000}
              placeholder="VD: 150000"
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="Mô tả"
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateServiceDescription(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={SERVICE_DESCRIPTION_MAX}
              showCount
              placeholder="Mô tả ngắn về dịch vụ (không bắt buộc)"
            />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ServiceFormModal;
