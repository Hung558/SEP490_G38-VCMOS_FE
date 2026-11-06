import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Modal,
  Tag,
  Button,
  Descriptions,
  Spin,
  Alert,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CopyOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';

import AppointmentOrderService, {
  getAppointmentStatusLabel,
  getAppointmentStatusColor,
  extractApiError,
} from '@/services/AppointmentOrderService';
import {
  isAppointmentEligibleForService,
  isUserPetOwner,
} from '@/services/AppointmentServiceService';
import { STORAGE, storage } from '@/lib/storage';
import { useAuth } from '@/contexts/routerProvider/authContext';
import type { OnlineAppointment, Pet } from '@/types';

const { Text } = Typography;

interface AppointmentDetailModalProps {
  open: boolean;
  appointmentId: string | null;
  onClose: () => void;
  petsMap: Map<string, Pet>;
  onAddService?: (appointment: OnlineAppointment) => void;
  isPetOwner?: boolean;
}

const DetailWrapper = styled.div`
  padding: 8px 0;

  .header-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 12px;
    padding: 18px 24px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;

    .code-info {
      .label {
        font-size: 12px;
        color: #0f766e;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .code-display {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 2px;

        .code-val {
          font-size: 22px;
          font-weight: 850;
          color: #0d9488;
        }
      }
    }
  }

  .ant-descriptions {
    background: #ffffff;
    border-radius: 8px;
  }
`;

const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  open,
  appointmentId,
  onClose,
  petsMap,
  onAddService,
  isPetOwner,
}) => {
  const { user } = useAuth();
  const storedUser = storage.getLocalStorage<any>(STORAGE.USER_INFO);
  const effectiveUser =
    user || (storedUser && typeof storedUser === 'object' ? storedUser : null);
  const resolvedIsPetOwner =
    typeof isPetOwner === 'boolean'
      ? isPetOwner
      : isUserPetOwner(effectiveUser);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<OnlineAppointment | null>(
    null
  );
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const abortCtrl = new AbortController();

    if (!open || !appointmentId) {
      setAppointment(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    AppointmentOrderService.getMyOnlineBookingById(appointmentId, {
      signal: abortCtrl.signal,
    })
      .then(res => {
        if (isCurrent && res?.data) {
          setAppointment(res.data);
        }
      })
      .catch((err: unknown) => {
        if (!isCurrent || abortCtrl.signal.aborted) return;
        const { message } = extractApiError(
          err,
          'Không thể tải chi tiết lịch hẹn khám.'
        );
        setError(message);
      })
      .finally(() => {
        if (isCurrent && !abortCtrl.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
      abortCtrl.abort();
    };
  }, [open, appointmentId]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Đã sao chép mã số: ${code}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const pet = appointment ? petsMap.get(appointment.petId) : undefined;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#0d9488' }} />
          <span>Chi Tiết Lịch Hẹn Khám Trực Tuyến</span>
        </div>
      }
      footer={[
        appointment &&
          resolvedIsPetOwner &&
          isAppointmentEligibleForService(appointment) &&
          onAddService && (
            <Button
              key="add-service"
              type="primary"
              icon={<PlusCircleOutlined />}
              style={{ background: '#0d9488', borderColor: '#0d9488' }}
              onClick={() => {
                onAddService(appointment);
              }}
            >
              Thêm dịch vụ
            </Button>
          ),
        <Button key="close" icon={<CloseOutlined />} onClick={onClose}>
          Đóng
        </Button>,
      ].filter(Boolean)}
      width={640}
    >
      <DetailWrapper>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Spin />
            <div style={{ marginTop: 12, color: '#64748b' }}>
              Đang tải thông tin chi tiết lịch hẹn...
            </div>
          </div>
        ) : error ? (
          <Alert
            type="error"
            showIcon
            message="Không thể tải lịch hẹn"
            description={error}
            style={{ margin: '16px 0' }}
          />
        ) : appointment ? (
          <>
            <div className="header-card">
              <div className="code-info">
                <div className="label">Mã lượt hẹn khám</div>
                <div className="code-display">
                  <span className="code-val">{appointment.code}</span>
                  <Button
                    size="small"
                    type="text"
                    icon={copiedCode ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() => handleCopyCode(appointment.code)}
                  >
                    {copiedCode ? 'Đã chép' : 'Sao chép'}
                  </Button>
                </div>
              </div>

              <div>
                <Tag
                  color={getAppointmentStatusColor(appointment.derivedStatus)}
                  style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}
                >
                  {getAppointmentStatusLabel(appointment.derivedStatus)}
                </Tag>
              </div>
            </div>

            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Thú cưng tiếp nhận">
                {pet ? (
                  <div>
                    <strong style={{ color: '#0f172a' }}>Bé {pet.name}</strong>
                    <span style={{ color: '#64748b', marginLeft: 8 }}>
                      ({pet.species || 'Thú cưng'} -{' '}
                      {pet.breed || 'Chưa rõ giống'})
                    </span>
                  </div>
                ) : (
                  <Text type="secondary">
                    Thú cưng (ID: {appointment.petId})
                  </Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Ngày hẹn khám">
                <strong>{dayjs(appointment.date).format('DD/MM/YYYY')}</strong>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng thái chu trình">
                <Tag
                  color={getAppointmentStatusColor(appointment.derivedStatus)}
                >
                  {getAppointmentStatusLabel(appointment.derivedStatus)} (
                  {appointment.derivedStatus})
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Ghi chú của bạn">
                {appointment.note ? (
                  <span style={{ whiteSpace: 'pre-wrap' }}>
                    {appointment.note}
                  </span>
                ) : (
                  <Text type="secondary">Không có ghi chú</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Thời gian tiếp nhận (Check-in)">
                {appointment.checkedInAt ? (
                  dayjs(appointment.checkedInAt).format('HH:mm DD/MM/YYYY')
                ) : (
                  <Text type="secondary">Chưa thực hiện tiếp nhận</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Thời gian đặt lịch">
                {dayjs(appointment.createdAt).format('HH:mm DD/MM/YYYY')}
              </Descriptions.Item>

              <Descriptions.Item label="Cập nhật gần nhất">
                {dayjs(appointment.updatedAt).format('HH:mm DD/MM/YYYY')}
              </Descriptions.Item>
            </Descriptions>

            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="Lưu ý tiếp nhận"
              description="Khi đến phòng khám, bạn chỉ cần xuất trình mã lượt hẹn trên cho nhân viên lễ tân để được hỗ trợ tiếp nhận nhanh chóng."
              style={{ marginTop: 20 }}
            />
          </>
        ) : null}
      </DetailWrapper>
    </Modal>
  );
};

export default AppointmentDetailModal;
