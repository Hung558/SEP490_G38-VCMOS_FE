import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Modal,
  Tag,
  Button,
  Descriptions,
  Spin,
  Alert,
  Typography,
  Empty,
} from 'antd';
import {
  CalendarOutlined,
  CopyOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  PlusCircleOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import MedicalRecordModal from '@/components/medical/MedicalRecordModal';
import CancelReasonModal from '@/components/appointment/CancelReasonModal';
import { isMedicalServiceCategory } from '@/services/MedicalRecordService';

import AppointmentOrderService, {
  getAppointmentStatusLabel,
  getAppointmentStatusColor,
  extractApiError,
} from '@/services/AppointmentOrderService';
import AppointmentServiceService, {
  isAppointmentEligibleForService,
  isUserPetOwner,
  getAppointmentServiceStatusLabel,
  getAppointmentServiceStatusColor,
  getAppointmentServiceName,
  getAppointmentServiceStaffName,
} from '@/services/AppointmentServiceService';
import type { PopulatedServiceRef } from '@/services/AppointmentServiceService';
import {
  formatServicePrice,
  formatServiceDuration,
  serviceCategoryLabels,
} from '@/services/ServiceService';
import { STORAGE, storage } from '@/lib/storage';
import { useAuth } from '@/contexts/routerProvider/authContext';
import type { OnlineAppointment, OnlineAppointmentService, Pet } from '@/types';

const { Text } = Typography;

export interface AppointmentDetailModalProps {
  open: boolean;
  appointmentId: string | null;
  onClose: () => void;
  petsMap: Map<string, Pet>;
  onAddService?: (appointment: OnlineAppointment) => void;
  onUpdated?: () => void;
  isPetOwner?: boolean;
  refreshTrigger?: number;
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
  onUpdated,
  isPetOwner,
  refreshTrigger,
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
  // Service whose SOAP record is open
  const [recordServiceId, setRecordServiceId] = useState<string | null>(null);

  // Cancel Whole Appointment State
  const [isCancelApptOpen, setIsCancelApptOpen] = useState(false);
  const [cancelApptLoading, setCancelApptLoading] = useState(false);

  // Cancel Single Service State
  const [serviceToCancel, setServiceToCancel] =
    useState<OnlineAppointmentService | null>(null);
  const [cancelServiceLoading, setCancelServiceLoading] = useState(false);

  const reloadAppointment = useCallback(async () => {
    if (!appointmentId) return;
    try {
      const res =
        await AppointmentOrderService.getMyOnlineBookingById(appointmentId);
      if (res?.data) {
        setAppointment(res.data);
      }
    } catch (err: unknown) {
      const { message } = extractApiError(
        err,
        'Không thể tải chi tiết lịch hẹn khám.'
      );
      setError(message);
    }
  }, [appointmentId]);

  const handleConfirmCancelAppt = async (reason: string) => {
    if (!appointment || cancelApptLoading) return;
    setCancelApptLoading(true);
    try {
      const res = await AppointmentOrderService.cancelAppointment(
        appointment._id,
        { reason }
      );
      toast.success(res.message || 'Đã hủy lịch hẹn thành công');
      setIsCancelApptOpen(false);
      await reloadAppointment();
      onUpdated?.();
    } catch (err: unknown) {
      const errRes = extractApiError(err, 'Hủy lịch hẹn thất bại');
      const message = errRes.message;
      const status = errRes.status ?? (errRes as any).statusCode;
      toast.error(message);
      if (status === 409 || status === 404) {
        setIsCancelApptOpen(false);
        await reloadAppointment();
        onUpdated?.();
      }
    } finally {
      setCancelApptLoading(false);
    }
  };

  const handleConfirmCancelService = async (reason: string) => {
    if (!serviceToCancel || cancelServiceLoading) return;
    setCancelServiceLoading(true);
    try {
      const res = await AppointmentServiceService.cancelAppointmentService(
        serviceToCancel._id,
        { reason }
      );
      toast.success(res.message || 'Đã hủy dịch vụ thành công');
      setServiceToCancel(null);
      await reloadAppointment();
      onUpdated?.();
    } catch (err: unknown) {
      const errRes = extractApiError(err, 'Hủy dịch vụ thất bại');
      const message = errRes.message;
      const status = errRes.status ?? (errRes as any).statusCode;
      toast.error(message);
      if (status === 409 || status === 404) {
        setServiceToCancel(null);
        await reloadAppointment();
        onUpdated?.();
      }
    } finally {
      setCancelServiceLoading(false);
    }
  };

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
  }, [open, appointmentId, refreshTrigger]);

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
          appointment.derivedStatus === 'Booked' && (
            <Button
              key="cancel-appt"
              danger
              onClick={() => setIsCancelApptOpen(true)}
            >
              Hủy lịch hẹn
            </Button>
          ),
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
      width={680}
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

              {(appointment.slotStart || appointment.slotEnd) && (
                <Descriptions.Item label="Khung giờ hẹn">
                  <strong style={{ color: '#0d9488' }}>
                    {appointment.slotStart || '--:--'}
                    {appointment.slotEnd ? ` - ${appointment.slotEnd}` : ''}
                  </strong>
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Trạng thái chu trình">
                <Tag
                  color={getAppointmentStatusColor(appointment.derivedStatus)}
                >
                  {getAppointmentStatusLabel(appointment.derivedStatus)} (
                  {appointment.derivedStatus})
                </Tag>
              </Descriptions.Item>

              {appointment.derivedStatus === 'Cancelled' && (
                <Descriptions.Item label="Thông tin hủy lịch">
                  <div>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                      Lý do:{' '}
                    </span>
                    <span>{appointment.cancelReason || 'Không có lý do'}</span>
                  </div>
                  {appointment.cancelledAt && (
                    <div
                      style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}
                    >
                      Thời gian hủy:{' '}
                      {dayjs(appointment.cancelledAt).format(
                        'HH:mm DD/MM/YYYY'
                      )}
                    </div>
                  )}
                </Descriptions.Item>
              )}

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

            {/* Services List Section */}
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MedicineBoxOutlined style={{ color: '#0d9488' }} />
                <span>
                  Danh Sách Dịch Vụ Khám ({appointment.services?.length || 0})
                </span>
              </div>

              {!appointment.services || appointment.services.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Lịch hẹn này chưa có dịch vụ nào"
                  style={{
                    margin: '12px 0',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: 8,
                  }}
                />
              ) : (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  {appointment.services.map((s, idx) => {
                    const isPopulated =
                      typeof s.serviceId === 'object' && s.serviceId !== null;
                    const popService = isPopulated
                      ? (s.serviceId as PopulatedServiceRef)
                      : null;
                    const assignedName = getAppointmentServiceStaffName(
                      s.assignedStaffId
                    );
                    const preferredName = s.preferredStaffId
                      ? getAppointmentServiceStaffName(s.preferredStaffId)
                      : null;

                    return (
                      <div
                        key={s._id || idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '12px 16px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontWeight: 700,
                                color: '#0d9488',
                                marginRight: 8,
                                fontSize: 13,
                              }}
                            >
                              #{s.sequenceNo}
                            </span>
                            <strong
                              style={{ color: '#0f172a', fontSize: 13.5 }}
                            >
                              {getAppointmentServiceName(s.serviceId)}
                            </strong>
                            {popService?.category && (
                              <Tag
                                color="cyan"
                                style={{ marginLeft: 8, fontSize: 11 }}
                              >
                                {(
                                  serviceCategoryLabels as Record<
                                    string,
                                    string
                                  >
                                )[popService.category] || popService.category}
                              </Tag>
                            )}
                            {s.isEmergency && (
                              <Tag color="red" style={{ fontSize: 11 }}>
                                Khẩn cấp
                              </Tag>
                            )}
                          </div>

                          <div>
                            <Tag
                              color={getAppointmentServiceStatusColor(s.status)}
                            >
                              {getAppointmentServiceStatusLabel(s.status)}
                            </Tag>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: 16,
                            marginTop: 6,
                            fontSize: 12.5,
                            color: '#64748b',
                            flexWrap: 'wrap',
                          }}
                        >
                          {(s.scheduledStart || s.scheduledEnd) && (
                            <span>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              Khung giờ:{' '}
                              <strong>
                                {s.scheduledStart || ''}
                                {s.scheduledEnd ? ` - ${s.scheduledEnd}` : ''}
                              </strong>
                            </span>
                          )}
                          {popService?.defaultDuration && (
                            <span>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {formatServiceDuration(
                                popService.defaultDuration
                              )}
                            </span>
                          )}
                          {popService?.basePrice !== undefined && (
                            <span>
                              <DollarOutlined style={{ marginRight: 4 }} />
                              {formatServicePrice(popService.basePrice)}
                            </span>
                          )}
                          {s.assignedStaffId && assignedName !== '—' && (
                            <span>
                              Phụ trách: <strong>{assignedName}</strong>
                            </span>
                          )}
                          {preferredName && preferredName !== '—' && (
                            <span>
                              Ưu tiên: <strong>{preferredName}</strong>
                            </span>
                          )}
                        </div>

                        {s.status === 'Cancelled' && s.cancelReason && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12.5,
                              color: '#ef4444',
                            }}
                          >
                            <span>Lý do hủy: {s.cancelReason}</span>
                            {s.cancelledAt && (
                              <span style={{ color: '#94a3b8', marginLeft: 6 }}>
                                (
                                {dayjs(s.cancelledAt).format(
                                  'HH:mm DD/MM/YYYY'
                                )}
                                )
                              </span>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                          {/* The vet writes a SOAP record once the exam starts (BR-23: the owner may read it) */}
                          {isMedicalServiceCategory(popService?.category) &&
                            (s.status === 'InProgress' ||
                              s.status === 'Done') && (
                              <Button
                                type="link"
                                size="small"
                                icon={<FileTextOutlined />}
                                style={{ padding: 0 }}
                                onClick={() => setRecordServiceId(s._id)}
                              >
                                Xem bệnh án
                              </Button>
                            )}

                          {resolvedIsPetOwner &&
                            appointment.derivedStatus === 'Booked' &&
                            s.status === 'Booked' && (
                              <Button
                                type="link"
                                size="small"
                                danger
                                style={{ padding: 0 }}
                                onClick={() => setServiceToCancel(s)}
                              >
                                Hủy dịch vụ này
                              </Button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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

      <MedicalRecordModal
        appointmentServiceId={recordServiceId}
        onClose={() => setRecordServiceId(null)}
      />

      {/* Cancel Whole Appointment Modal */}
      {appointment && (
        <CancelReasonModal
          open={isCancelApptOpen}
          title="Hủy lịch hẹn trực tuyến"
          warningText="Bạn đang thực hiện hủy toàn bộ lịch hẹn này. Mọi dịch vụ chưa thực hiện thuộc lịch hẹn cũng sẽ bị hủy."
          targetDescription={
            <div>
              Lịch hẹn: <strong>{appointment.code}</strong> (Ngày{' '}
              {dayjs(appointment.date).format('DD/MM/YYYY')}
              {appointment.slotStart ? ` - ${appointment.slotStart}` : ''})
            </div>
          }
          confirmLoading={cancelApptLoading}
          onCancel={() => setIsCancelApptOpen(false)}
          onConfirm={handleConfirmCancelAppt}
        />
      )}

      {/* Cancel Single Service Modal */}
      {serviceToCancel && (
        <CancelReasonModal
          open={Boolean(serviceToCancel)}
          title="Hủy dịch vụ trong lịch hẹn"
          warningText="Dịch vụ này sẽ bị hủy và rút khỏi lịch hẹn."
          targetDescription={
            <div>
              Dịch vụ: #{serviceToCancel.sequenceNo}.{' '}
              <strong>
                {getAppointmentServiceName(serviceToCancel.serviceId)}
              </strong>
            </div>
          }
          confirmLoading={cancelServiceLoading}
          onCancel={() => setServiceToCancel(null)}
          onConfirm={handleConfirmCancelService}
        />
      )}
    </Modal>
  );
};

export default AppointmentDetailModal;
