import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Upload,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  PictureOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import PetService from '@/services/PetService';
import type { Pet } from '@/types';

const { Text } = Typography;
const { TextArea } = Input;

interface PetFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (pet: Pet) => void;
  editingPet?: Pet | null;
}

const ModalContentWrapper = styled.div`
  padding: 8px 0;

  .modal-subtitle {
    font-size: 13.5px;
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .photo-upload-section {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    margin-bottom: 24px;

    .photo-preview {
      width: 88px;
      height: 88px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid #0d9488;
      box-shadow: 0 2px 8px rgba(13, 148, 136, 0.15);
    }

    .photo-placeholder {
      width: 88px;
      height: 88px;
      border-radius: 12px;
      background: #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 24px;
      border: 1px dashed #cbd5e1;

      span {
        font-size: 11px;
        margin-top: 4px;
        color: #64748b;
      }
    }

    .upload-info {
      flex: 1;

      .upload-hint {
        font-size: 12px;
        color: #64748b;
        margin-top: 6px;
      }
    }
  }

  .form-section-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #0d9488;
    margin: 18px 0 12px 0;
    display: flex;
    align-items: center;
    gap: 6px;

    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
      margin-left: 8px;
    }
  }
`;

// "Thú cưng khác" is only a choice in the list: the owner types the real
// species name in the extra input, and that text is what gets saved
const OTHER_SPECIES = 'other';

const SPECIES_OPTIONS = [
  { label: 'Chó', value: 'Chó' },
  { label: 'Mèo', value: 'Mèo' },
  { label: 'Thú cưng khác', value: OTHER_SPECIES },
];

// Splits a saved species ("Chó", "Dog", "Thỏ"...) into the two form fields
const toSpeciesFields = (species?: string | null) => {
  const value = species?.trim() || '';
  const lower = value.toLowerCase();
  if (!value) return { species: undefined, speciesOther: '' };
  if (lower === 'chó' || lower === 'dog') {
    return { species: 'Chó', speciesOther: '' };
  }
  if (lower === 'mèo' || lower === 'cat') {
    return { species: 'Mèo', speciesOther: '' };
  }
  return { species: OTHER_SPECIES, speciesOther: value };
};

const PetFormModal: React.FC<PetFormModalProps> = ({
  open,
  onCancel,
  onSuccess,
  editingPet,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const speciesChoice = Form.useWatch('species', form);

  const isEdit = Boolean(editingPet);

  // Initialize or reset form values
  useEffect(() => {
    if (open) {
      if (editingPet) {
        form.setFieldsValue({
          name: editingPet.name,
          ...toSpeciesFields(editingPet.species),
          breed: editingPet.breed || '',
          coatColor: editingPet.coatColor || '',
          dob: editingPet.dob ? dayjs(editingPet.dob) : null,
          weight: editingPet.weight ?? null,
          notes: editingPet.notes || '',
        });
        setPreviewUrl(editingPet.photoUrl || null);
        setSelectedFile(null);
      } else {
        form.resetFields();
        form.setFieldsValue({ species: 'Chó' });
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    }
  }, [open, editingPet, form]);

  // Clean up object URL when unmounting or changing photo
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle local photo selection
  const handlePhotoSelect = (file: File) => {
    const isLt5M = file.size / 1024 / 1024 <= 5;
    if (!isLt5M) {
      toast.error('Kích thước ảnh không được vượt quá 5MB!');
      return false;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận tệp định dạng JPG, PNG hoặc WebP!');
      return false;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return false; // Prevent automatic upload by AntD
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Submit form handler
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData = new FormData();
      formData.append('name', values.name.trim());

      const species =
        values.species === OTHER_SPECIES
          ? values.speciesOther?.trim()
          : values.species;
      if (species) {
        formData.append('species', species);
      } else if (isEdit) {
        formData.append('species', '');
      }

      if (values.breed) {
        formData.append('breed', values.breed.trim());
      } else if (isEdit) {
        formData.append('breed', '');
      }

      if (values.coatColor) {
        formData.append('coatColor', values.coatColor.trim());
      } else if (isEdit) {
        formData.append('coatColor', '');
      }

      if (values.dob) {
        formData.append('dob', values.dob.format('YYYY-MM-DD'));
      } else if (isEdit) {
        formData.append('dob', '');
      }

      if (values.weight !== null && values.weight !== undefined) {
        formData.append('weight', String(values.weight));
      } else if (isEdit) {
        formData.append('weight', '');
      }

      if (values.notes) {
        formData.append('notes', values.notes.trim());
      } else if (isEdit) {
        formData.append('notes', '');
      }

      // Attach file if selected
      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      if (isEdit && editingPet) {
        const response = await PetService.updatePet(editingPet._id, formData);
        toast.success(`Cập nhật hồ sơ bé ${response.pet.name} thành công!`);
        onSuccess(response.pet);
      } else {
        const response = await PetService.createPet(formData);
        toast.success(`Đăng ký hồ sơ bé ${response.pet.name} thành công!`);
        onSuccess(response.pet);
      }

      onCancel();
    } catch (error: any) {
      if (error?.errorFields) {
        // AntD form validation failed
        return;
      }
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message ||
        (isEdit
          ? 'Không thể cập nhật hồ sơ thú cưng'
          : 'Không thể tạo mới thú cưng');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 17,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          <span>🐾</span>
          <span>
            {isEdit ? 'Cập Nhật Hồ Sơ Thú Cưng' : 'Đăng Ký Hồ Sơ Thú Cưng Mới'}
          </span>
        </div>
      }
      width={680}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          style={{ background: '#0d9488', borderColor: '#0d9488' }}
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSubmit}
        >
          {isEdit ? 'Lưu thay đổi' : 'Đăng ký hồ sơ'}
        </Button>,
      ]}
    >
      <ModalContentWrapper>
        <p className="modal-subtitle">
          {isEdit
            ? 'Chỉnh sửa thông tin nhân trắc học, thể trọng và tiền sử bệnh lý của thú cưng.'
            : 'Tạo hồ sơ bệnh án điện tử SOAP/EMR và mã số định danh thú cưng tại hệ thống bệnh viện VCMOS.'}
        </p>

        {/* Photo Upload Section */}
        <div className="photo-upload-section">
          {previewUrl ? (
            <img src={previewUrl} alt="Pet Avatar" className="photo-preview" />
          ) : (
            <div className="photo-placeholder">
              <PictureOutlined />
              <span>Chưa có ảnh</span>
            </div>
          )}

          <div className="upload-info">
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Upload
                accept="image/jpeg,image/png,image/webp"
                showUploadList={false}
                beforeUpload={handlePhotoSelect}
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                  {previewUrl ? 'Thay đổi ảnh' : 'Tải ảnh lên'}
                </Button>
              </Upload>

              {previewUrl && (
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={handleRemovePhoto}
                >
                  Xóa ảnh
                </Button>
              )}
            </div>
            <div className="upload-hint">
              Hỗ trợ định dạng JPG, PNG hoặc WebP. Dung lượng tệp tối đa 5MB.
            </div>
          </div>
        </div>

        <Form form={form} layout="vertical" requiredMark="optional">
          <div className="form-section-title">Thông tin cơ bản</div>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>Tên thú cưng</Text>}
                name="name"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên thú cưng!' },
                  {
                    max: 100,
                    message: 'Tên thú cưng không được quá 100 ký tự!',
                  },
                ]}
              >
                <Input
                  placeholder="Ví dụ: Milo, Bé Miu, Cún Đốm..."
                  maxLength={100}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>Loài thú cưng</Text>}
                name="species"
              >
                <Select
                  options={SPECIES_OPTIONS}
                  placeholder="Chọn loài thú cưng"
                  allowClear
                />
              </Form.Item>

              {speciesChoice === OTHER_SPECIES && (
                <Form.Item
                  label={<Text strong>Tên loài</Text>}
                  name="speciesOther"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: 'Vui lòng nhập tên loài thú cưng!',
                    },
                    { max: 50, message: 'Tên loài không quá 50 ký tự' },
                  ]}
                >
                  <Input
                    placeholder="Ví dụ: Thỏ, Hamster, Chim cảnh..."
                    maxLength={50}
                  />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>Giống thú cưng</Text>}
                name="breed"
                rules={[{ max: 50, message: 'Giống không quá 50 ký tự' }]}
              >
                <Input
                  placeholder="Ví dụ: Poodle, Corgi, Mèo Anh lông ngắn..."
                  maxLength={50}
                  allowClear
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>Màu lông</Text>}
                name="coatColor"
                rules={[{ max: 50, message: 'Màu lông không quá 50 ký tự' }]}
              >
                <Input
                  placeholder="Ví dụ: Nâu đỏ, Trắng xám, Vàng kim..."
                  maxLength={50}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="form-section-title">Chỉ số thể trạng & Sinh hiệu</div>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>Ngày sinh</Text>}
                name="dob"
                tooltip="Dùng để tính tuổi chính xác khi kê đơn thuốc và phác đồ điều trị"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Chọn ngày sinh"
                  format="DD/MM/YYYY"
                  disabledDate={current =>
                    current && current > dayjs().endOf('day')
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>Cân nặng hiện tại (kg)</Text>}
                name="weight"
                tooltip="Thể trọng trong khoảng từ 0.1 đến 500 kg"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ví dụ: 4.5"
                  min={0}
                  max={500}
                  step={0.1}
                  precision={1}
                  addonAfter="kg"
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="form-section-title">
            Tiền sử y khoa & Cảnh báo lâm sàng
          </div>

          <Form.Item
            label={<Text strong>Ghi chú dị ứng / Tiền sử bệnh lý</Text>}
            name="notes"
            rules={[
              { max: 1000, message: 'Ghi chú không được quá 1000 ký tự' },
            ]}
            tooltip="Ghi chú về dị ứng thuốc/thức ăn, tiền sử phẫu thuật, các mốc tiêm phòng"
          >
            <TextArea
              rows={3}
              placeholder="Ví dụ: Dị ứng hải sản; tiền sử viêm dạ dày ruột cấp; đã tiêm phòng dại mũi 1..."
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </ModalContentWrapper>
    </Modal>
  );
};

export default PetFormModal;
