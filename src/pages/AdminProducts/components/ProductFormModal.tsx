import { Alert, Form, Input, InputNumber, Modal, Select, Spin } from 'antd';
import { useEffect } from 'react';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_NAME_MAX,
  PRODUCT_UNIT_MAX,
  productCategoryLabels,
  productStatusLabels,
  validateProductCategory,
  validateProductName,
  validateProductUnit,
  validateProductUnitPrice,
  type Product,
  type ProductFormValues,
} from '@/services/ProductService';

interface Props {
  open: boolean;
  editingProduct: Product | null;
  loading: boolean;
  saving: boolean;
  fieldErrors: Record<string, string>;
  onCancel: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

const ProductFormModal = ({
  open,
  editingProduct,
  loading,
  saving,
  fieldErrors,
  onCancel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<ProductFormValues>();
  const isEditing = Boolean(editingProduct);

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      form.setFieldsValue({
        name: editingProduct.name,
        category: editingProduct.category,
        unit: editingProduct.unit,
        unitPrice: editingProduct.unitPrice ?? null,
      });
    } else {
      form.resetFields();
    }
  }, [editingProduct, form, open]);

  useEffect(() => {
    if (!open || !Object.keys(fieldErrors).length) return;
    form.setFields(
      Object.entries(fieldErrors).map(([name, error]) => ({
        name: name as keyof ProductFormValues,
        errors: [error],
      }))
    );
  }, [fieldErrors, form, open]);

  return (
    <Modal
      open={open}
      title={isEditing ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
      cancelText="Hủy"
      confirmLoading={saving}
      okButtonProps={{ disabled: loading }}
      maskClosable={false}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
      width={600}
    >
      <Spin spinning={loading} tip="Đang tải thông tin sản phẩm...">
        {isEditing && editingProduct ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Mã sản phẩm: ${editingProduct.code}`}
            description={`Trạng thái hiện tại: ${productStatusLabels[editingProduct.status]}. Quản lý trạng thái trực tiếp trên bảng danh sách.`}
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
            label="Tên sản phẩm"
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateProductName(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <Input
              maxLength={PRODUCT_NAME_MAX}
              showCount
              placeholder="VD: Paracetamol 500mg"
            />
          </Form.Item>

          <Form.Item
            name="category"
            label="Loại sản phẩm"
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateProductCategory(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <Select
              placeholder="Chọn loại sản phẩm"
              options={PRODUCT_CATEGORIES.map(item => ({
                value: item,
                label: productCategoryLabels[item],
              }))}
            />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Đơn vị tính"
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateProductUnit(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <Input
              maxLength={PRODUCT_UNIT_MAX}
              showCount
              placeholder="VD: Hộp, Lọ, Chai, Gói, Cái..."
            />
          </Form.Item>

          <Form.Item
            name="unitPrice"
            label="Đơn giá (đ)"
            rules={[
              {
                validator: async (_, value) => {
                  const message = validateProductUnitPrice(value);
                  if (message) throw new Error(message);
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1000}
              placeholder="VD: 50000 (không bắt buộc)"
            />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ProductFormModal;
