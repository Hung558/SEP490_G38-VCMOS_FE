import React from 'react';
import styled from 'styled-components';
import { Modal, Tag, Button, Typography, Popconfirm } from 'antd';
import {
  EditOutlined,
  CalendarOutlined,
  CopyOutlined,
  CheckOutlined,
  InboxOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import type { Pet } from '@/types';

const { Text } = Typography;

interface PetDetailModalProps {
  open: boolean;
  onCancel: () => void;
  pet?: Pet | null;
  onEdit?: (pet: Pet) => void;
  onDelete?: (pet: Pet) => void;
  onBookAppointment?: (pet: Pet) => void;
}

const DetailWrapper = styled.div`
  padding: 8px 0;

  .pet-hero {
    display: flex;
    gap: 20px;
    align-items: center;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;

    @media (max-width: 540px) {
      flex-direction: column;
      text-align: center;
    }

    .hero-photo {
      width: 104px;
      height: 104px;
      border-radius: 16px;
      object-fit: cover;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
    }

    .hero-placeholder {
      width: 104px;
      height: 104px;
      border-radius: 16px;
      background: #e6fffa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 44px;
      border: 2px dashed #99f6e4;
    }

    .hero-meta {
      flex: 1;

      .hero-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 6px;

        h3 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
        }
      }

      .code-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #ffffff;
        border: 1px solid #99f6e4;
        color: #0d9488;
        font-family: monospace;
        font-weight: 700;
        font-size: 13px;
        padding: 3px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: #ccfbf1;
        }
      }
    }
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-bottom: 24px;

    @media (max-width: 500px) {
      grid-template-columns: 1fr;
    }

    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;

      .label {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 4px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .value {
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
      }
    }
  }

  .notes-box {
    background: #fffbeb;
    border: 1px solid #fef3c7;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 16px;

    .notes-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #b45309;
      margin-bottom: 6px;
    }

    .notes-content {
      font-size: 14px;
      color: #78350f;
      line-height: 1.6;
    }
  }
`;

// Helper: Tính tuổi từ ngày sinh (dob)
export const calculatePetAge = (dobString?: string | null): string => {
  if (!dobString) return 'Chưa cập nhật';
  const birth = dayjs(dobString);
  if (!birth.isValid()) return 'Chưa cập nhật';

  const now = dayjs();
  const years = now.diff(birth, 'year');
  const months = now.diff(birth.add(years, 'year'), 'month');

  if (years > 0) {
    return months > 0 ? `${years} tuổi ${months} tháng` : `${years} tuổi`;
  }
  if (months > 0) {
    return `${months} tháng tuổi`;
  }
  const days = now.diff(birth, 'day');
  return `${Math.max(1, days)} ngày tuổi`;
};

// Helper: Emoji tương ứng theo loài
export const getSpeciesEmoji = (species?: string | null): string => {
  if (!species) return '🐾';
  const s = species.toLowerCase();
  if (s.includes('chó') || s.includes('dog') || s.includes('canine'))
    return '🐕';
  if (s.includes('mèo') || s.includes('cat') || s.includes('feline'))
    return '🐈';
  if (s.includes('thỏ') || s.includes('rabbit')) return '🐇';
  if (s.includes('chim') || s.includes('bird') || s.includes('avian'))
    return '🦜';
  if (s.includes('hamster') || s.includes('chuột')) return '🐹';
  if (s.includes('bò sát') || s.includes('reptile')) return '🦎';
  return '🐾';
};

const PetDetailModal: React.FC<PetDetailModalProps> = ({
  open,
  onCancel,
  pet,
  onEdit,
  onDelete,
  onBookAppointment,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!pet) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pet.code);
    setCopied(true);
    toast.success(`Đã sao chép mã số thú cưng: ${pet.code}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const isArchived = pet.status === 'Archived';

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
          <span>{getSpeciesEmoji(pet.species)}</span>
          <span>Hồ Sơ Y Bạ Thú Cưng · {pet.name}</span>
        </div>
      }
      width={640}
      footer={[
        <Button key="close" onClick={onCancel}>
          Đóng
        </Button>,
        !isArchived && onDelete && (
          <Popconfirm
            key="archive"
            title="Lưu trữ hồ sơ thú cưng"
            description="Bạn có chắc chắn muốn lưu trữ hồ sơ thú cưng này không? Thú cưng sẽ chuyển sang mục Lưu trữ."
            onConfirm={() => onDelete(pet)}
            okText="Đồng ý lưu trữ"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<InboxOutlined />}>
              Lưu trữ
            </Button>
          </Popconfirm>
        ),
        !isArchived && onEdit && (
          <Button
            key="edit"
            icon={<EditOutlined />}
            onClick={() => {
              onCancel();
              onEdit(pet);
            }}
          >
            Chỉnh sửa
          </Button>
        ),
        onBookAppointment && (
          <Button
            key="book"
            type="primary"
            style={{ background: '#0d9488', borderColor: '#0d9488' }}
            icon={<CalendarOutlined />}
            onClick={() => {
              onCancel();
              onBookAppointment(pet);
            }}
          >
            Đặt lịch khám
          </Button>
        ),
      ]}
    >
      <DetailWrapper>
        {/* Hero Section */}
        <div className="pet-hero">
          {pet.photoUrl ? (
            <img src={pet.photoUrl} alt={pet.name} className="hero-photo" />
          ) : (
            <div className="hero-placeholder">
              {getSpeciesEmoji(pet.species)}
            </div>
          )}

          <div className="hero-meta">
            <div className="hero-title-row">
              <h3>{pet.name}</h3>
              <Tag color={isArchived ? 'default' : 'cyan'}>
                {isArchived ? 'Đã lưu trữ' : 'Đang theo dõi'}
              </Tag>
            </div>

            <div style={{ marginBottom: 10 }}>
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
            </div>

            <Text type="secondary" style={{ fontSize: 13 }}>
              Ngày tạo hồ sơ: {dayjs(pet.createdAt).format('DD/MM/YYYY HH:mm')}
            </Text>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="label">Loài thú cưng</div>
            <div className="value">{pet.species || 'Chưa cập nhật'}</div>
          </div>

          <div className="metric-card">
            <div className="label">Giống loài (Breed)</div>
            <div className="value">{pet.breed || 'Chưa cập nhật'}</div>
          </div>

          <div className="metric-card">
            <div className="label">Màu lông</div>
            <div className="value">{pet.coatColor || 'Chưa cập nhật'}</div>
          </div>

          <div className="metric-card">
            <div className="label">Thể trọng hiện tại</div>
            <div className="value">
              {pet.weight !== null && pet.weight !== undefined
                ? `${pet.weight} kg`
                : 'Chưa cập nhật'}
            </div>
          </div>

          <div className="metric-card">
            <div className="label">Ngày sinh</div>
            <div className="value">
              {pet.dob ? dayjs(pet.dob).format('DD/MM/YYYY') : 'Chưa cập nhật'}
            </div>
          </div>

          <div className="metric-card">
            <div className="label">Độ tuổi ước tính</div>
            <div className="value">{calculatePetAge(pet.dob)}</div>
          </div>
        </div>

        {/* Medical Notes & Allergy Warning */}
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
      </DetailWrapper>
    </Modal>
  );
};

export default PetDetailModal;
