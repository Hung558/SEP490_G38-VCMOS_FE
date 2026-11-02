import React, { useState } from 'react';
import { Alert, Button, Tag, Typography } from 'antd';
import {
  CalendarOutlined,
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import type { Pet } from '@/types';
import {
  calculatePetAge,
  getSpeciesEmoji,
} from '@/pages/Dashboard/components/PetDetailModal';

const { Text } = Typography;

interface PetProfileViewProps {
  pet: Pet;
  onEdit: () => void;
  onDelete: () => void;
  onBookAppointment: () => void;
}

/** Pet header, health metrics and allergy notes of the SCR-08 profile page */
const PetProfileView: React.FC<PetProfileViewProps> = ({
  pet,
  onEdit,
  onDelete,
  onBookAppointment,
}) => {
  const [copied, setCopied] = useState(false);
  const isDeleted = pet.status === 'Deleted';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pet.code);
    setCopied(true);
    toast.success(`Đã sao chép mã số thú cưng: ${pet.code}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasWeight = pet.weight !== null && pet.weight !== undefined;
  const metrics = [
    { label: 'Loài thú cưng', value: pet.species },
    { label: 'Giống loài (Breed)', value: pet.breed },
    { label: 'Màu lông', value: pet.coatColor },
    { label: 'Thể trọng hiện tại', value: hasWeight ? `${pet.weight} kg` : '' },
    {
      label: 'Ngày sinh',
      value: pet.dob ? dayjs(pet.dob).format('DD/MM/YYYY') : '',
    },
    { label: 'Độ tuổi ước tính', value: calculatePetAge(pet.dob) },
  ];

  return (
    <>
      {isDeleted && (
        <Alert
          type="info"
          showIcon
          message="Hồ sơ này đã bị xóa"
          description="Bạn chỉ xem lại được thông tin; không thể chỉnh sửa hay đặt lịch cho thú cưng này."
          style={{ marginBottom: 20, borderRadius: 12 }}
        />
      )}

      <div className="pet-hero">
        {pet.photoUrl ? (
          <img src={pet.photoUrl} alt={pet.name} className="hero-photo" />
        ) : (
          <div className="hero-placeholder">{getSpeciesEmoji(pet.species)}</div>
        )}

        <div className="hero-meta">
          <div className="hero-title-row">
            <h2>{pet.name}</h2>
            <Tag color={isDeleted ? 'default' : 'cyan'}>
              {isDeleted ? 'Đã xóa' : 'Đang theo dõi'}
            </Tag>
          </div>

          <span
            className="code-badge"
            onClick={handleCopyCode}
            title="Bấm để sao chép mã"
          >
            Mã định danh: {pet.code}
            {copied ? (
              <CheckOutlined style={{ color: '#059669' }} />
            ) : (
              <CopyOutlined />
            )}
          </span>

          <Text className="created-at">
            Ngày tạo hồ sơ: {dayjs(pet.createdAt).format('DD/MM/YYYY HH:mm')}
          </Text>
        </div>

        {!isDeleted && (
          <div className="hero-actions">
            <Button icon={<EditOutlined />} onClick={onEdit}>
              Chỉnh sửa
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
              Xóa
            </Button>
            <Button
              type="primary"
              className="btn-book"
              icon={<CalendarOutlined />}
              onClick={onBookAppointment}
            >
              Đặt lịch khám
            </Button>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        {metrics.map(metric => (
          <div className="metric-card" key={metric.label}>
            <div className="label">{metric.label}</div>
            <div className="value">{metric.value || 'Chưa cập nhật'}</div>
          </div>
        ))}
      </div>

      <div className="notes-box">
        <div className="notes-title">
          <WarningOutlined />
          <span>Tiền sử y khoa & Cảnh báo dị ứng</span>
        </div>
        <div className="notes-content">
          {pet.notes ? (
            pet.notes
          ) : (
            <span style={{ color: '#92400e', fontStyle: 'italic' }}>
              Chưa ghi nhận tiền sử dị ứng hoặc bệnh lý đặc biệt.
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default PetProfileView;
