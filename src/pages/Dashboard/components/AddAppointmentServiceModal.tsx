import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import {
  Modal,
  Form,
  Select,
  Switch,
  InputNumber,
  Button,
  Spin,
  Alert,
  Tag,
  Typography,
  Space,
} from 'antd';
import {
  PlusOutlined,
  CloseOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';

import ServiceService, {
  formatServicePrice,
  formatServiceDuration,
  serviceCategoryLabels,
} from '@/services/ServiceService';
import type { Service } from '@/services/ServiceService';
import AppointmentServiceService, {
  extractApiError,
  validateAppointmentServiceForm,
} from '@/services/AppointmentServiceService';
import {
  getAppointmentStatusLabel,
  getAppointmentStatusColor,
} from '@/services/AppointmentOrderService';
import type { OnlineAppointment, Pet, OnlineAppointmentService } from '@/types';

const { Text } = Typography;

export interface AddAppointmentServiceModalProps {
  open: boolean;
  appointment: OnlineAppointment | null;
  pet?: Pet;
  onClose: () => void;
  onSuccess: (
    createdService: OnlineAppointmentService,
    message: string
  ) => void;
}

const StyledWrapper = styled.div`
  .appointment-summary-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 20px;

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;

      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }

      .summary-item {
        .item-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }
        .item-value {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }
      }
    }
  }

  .service-preview-card {
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 8px;
    padding: 12px 16px;
    margin-top: 10px;
    margin-bottom: 16px;

    .service-title {
      font-weight: 700;
      color: #0f766e;
      font-size: 14px;
      margin-bottom: 6px;
    }

    .service-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 13px;
      color: #334155;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }

    .service-desc {
      margin-top: 8px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
  }

  .field-hint {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
    line-height: 1.4;
  }
`;

const AddAppointmentServiceModal: React.FC<AddAppointmentServiceModalProps> = ({
  open,
  appointment,
  pet,
  onClose,
  onSuccess,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<
    string | undefined
  >(undefined);
  const [isEmergency, setIsEmergency] = useState(false);
  const [sequenceNo, setSequenceNo] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSubmittingRef = useRef(false);
  const abortCtrlRef = useRef<AbortController | null>(null);

  // Load active services catalog
  const loadActiveServices = useCallback(() => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const abortCtrl = new AbortController();
    abortCtrlRef.current = abortCtrl;

    setLoadingServices(true);
    setServicesError(null);

    ServiceService.listServices(
      { status: 'Active' },
      { signal: abortCtrl.signal }
    )
      .then(res => {
        if (!abortCtrl.signal.aborted) {
          // Strictly keep only Active status to satisfy requirement
          const activeList = (res.services || []).filter(
            s => s.status === 'Active'
          );
          setServices(activeList);
        }
      })
      .catch((err: unknown) => {
        if (abortCtrl.signal.aborted) return;
        const { message } = extractApiError(
          err,
          'Không thể tải danh sách dịch vụ.'
        );
        setServicesError(message);
      })
      .finally(() => {
        if (!abortCtrl.signal.aborted) {
          setLoadingServices(false);
        }
      });
  }, []);

  // Reset and load services whenever modal opens
  useEffect(() => {
    if (open && appointment) {
      setSelectedServiceId(undefined);
      setIsEmergency(false);
      setSequenceNo(null);
      setSubmitError(null);
      loadActiveServices();
    } else {
      if (abortCtrlRef.current) {
        abortCtrlRef.current.abort();
      }
      setSubmitError(null);
    }

    return () => {
      if (abortCtrlRef.current) {
        abortCtrlRef.current.abort();
      }
    };
  }, [open, appointment, loadActiveServices]);

  const selectedService = services.find(s => s._id === selectedServiceId);

  const handleSubmit = async () => {
    if (isSubmittingRef.current || submitting) return;
    if (!appointment) return;

    // Validate form locally before sending
    const validation = validateAppointmentServiceForm({
      orderId: appointment._id,
      serviceId: selectedServiceId,
      sequenceNo: sequenceNo ?? undefined,
      isEmergency,
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setSubmitError(firstError || 'Thông tin dịch vụ chưa hợp lệ.');
      toast.error(firstError || 'Thông tin dịch vụ chưa hợp lệ.');
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        orderId: appointment._id,
        serviceId: selectedServiceId!,
        ...(sequenceNo !== null && sequenceNo !== undefined
          ? { sequenceNo }
          : {}),
        isEmergency,
      };

      const res =
        await AppointmentServiceService.createOnlineAppointmentService(payload);

      toast.success(
        res.message || 'Thêm dịch vụ cho lịch hẹn online thành công'
      );
      onSuccess(res.data, res.message);
      onClose();
    } catch (err: unknown) {
      const { message, statusCode } = extractApiError(
        err,
        'Không thể thêm dịch vụ vào lịch hẹn.'
      );
      setSubmitError(message);
      toast.error(message);

      // On 409 conflict, user selections are preserved so they can adjust sequenceNo and retry.
      if (statusCode === 409) {
        // Keep selectedServiceId and isEmergency intact.
      }
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (!submitting) {
          onClose();
        }
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MedicineBoxOutlined style={{ color: '#0d9488', fontSize: 18 }} />
          <span>Thêm Dịch Vụ Vào Lịch Hẹn Khám</span>
        </div>
      }
      footer={[
        <Button
          key="cancel"
          icon={<CloseOutlined />}
          onClick={onClose}
          disabled={submitting}
        >
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<PlusOutlined />}
          loading={submitting}
          disabled={
            submitting ||
            loadingServices ||
            !!servicesError ||
            !selectedServiceId ||
            services.length === 0
          }
          style={{ background: '#0d9488', borderColor: '#0d9488' }}
          onClick={handleSubmit}
        >
          Thêm dịch vụ
        </Button>,
      ]}
      width={600}
      destroyOnHidden
    >
      <StyledWrapper>
        {appointment && (
          <div className="appointment-summary-card">
            <div className="summary-grid">
              <div className="summary-item">
                <div className="item-label">Mã lượt hẹn</div>
                <div className="item-value" style={{ color: '#0d9488' }}>
                  {appointment.code}
                </div>
              </div>

              <div className="summary-item">
                <div className="item-label">Thú cưng</div>
                <div className="item-value">
                  {pet
                    ? `Bé ${pet.name}`
                    : `ID: ${appointment.petId.slice(-6)}`}
                </div>
              </div>

              <div className="summary-item">
                <div className="item-label">Ngày hẹn khám</div>
                <div className="item-value">
                  {dayjs(appointment.date).format('DD/MM/YYYY')}
                </div>
              </div>

              <div className="summary-item">
                <div className="item-label">Trạng thái</div>
                <div className="item-value">
                  <Tag
                    color={getAppointmentStatusColor(appointment.derivedStatus)}
                  >
                    {getAppointmentStatusLabel(appointment.derivedStatus)}
                  </Tag>
                </div>
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <Alert
            type="error"
            showIcon
            message={submitError}
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setSubmitError(null)}
          />
        )}

        {loadingServices ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <Spin />
            <div style={{ marginTop: 12, color: '#64748b' }}>
              Đang tải danh sách dịch vụ đang hoạt động...
            </div>
          </div>
        ) : servicesError ? (
          <Alert
            type="error"
            showIcon
            message="Không thể tải danh sách dịch vụ"
            description={servicesError}
            action={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={loadActiveServices}
              >
                Thử lại
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        ) : services.length === 0 ? (
          <Alert
            type="info"
            showIcon
            message="Chưa có dịch vụ nào khả dụng"
            description="Hiện phòng khám chưa có dịch vụ nào đang hoạt động để đăng ký thêm."
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Form layout="vertical">
            <Form.Item
              label={
                <span style={{ fontWeight: 600 }}>
                  Chọn dịch vụ <span style={{ color: '#ef4444' }}>*</span>
                </span>
              }
              required
            >
              <Select
                showSearch
                placeholder="-- Tìm kiếm và chọn dịch vụ --"
                value={selectedServiceId}
                onChange={val => {
                  setSelectedServiceId(val);
                  setSubmitError(null);
                }}
                filterOption={(input, option) =>
                  String(option?.label || '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={services.map(s => ({
                  value: s._id,
                  label: `${s.name} (${formatServicePrice(s.basePrice)})`,
                }))}
                style={{ width: '100%' }}
              />

              {selectedService && (
                <div className="service-preview-card">
                  <div className="service-title">{selectedService.name}</div>
                  <div className="service-meta">
                    <div className="meta-item">
                      <Tag color="cyan">
                        {serviceCategoryLabels[selectedService.category] ||
                          selectedService.category}
                      </Tag>
                    </div>
                    <div className="meta-item">
                      <ClockCircleOutlined style={{ color: '#0d9488' }} />
                      <span>
                        Thời lượng:{' '}
                        {formatServiceDuration(selectedService.defaultDuration)}
                      </span>
                    </div>
                    <div className="meta-item">
                      <DollarOutlined style={{ color: '#0d9488' }} />
                      <strong style={{ color: '#0f766e' }}>
                        {formatServicePrice(selectedService.basePrice)}
                      </strong>
                    </div>
                  </div>
                  {selectedService.description && (
                    <div className="service-desc">
                      {selectedService.description}
                    </div>
                  )}
                </div>
              )}
            </Form.Item>

            <Form.Item
              label={
                <span style={{ fontWeight: 600 }}>
                  Thứ tự thực hiện (Tùy chọn)
                </span>
              }
            >
              <InputNumber
                min={1}
                step={1}
                precision={0}
                placeholder="Tự động gán (khuyên dùng)"
                value={sequenceNo}
                onChange={val => {
                  setSequenceNo(
                    val !== null && val !== undefined ? Number(val) : null
                  );
                  setSubmitError(null);
                }}
                style={{ width: '100%' }}
              />
              <div className="field-hint">
                Để trống để hệ thống tự động gán thứ tự tiếp theo trong lịch
                hẹn.
              </div>
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Dịch vụ khẩn cấp</span>}
            >
              <Space align="center" size="middle">
                <Switch
                  checked={isEmergency}
                  onChange={checked => setIsEmergency(checked)}
                  style={{
                    backgroundColor: isEmergency ? '#ef4444' : undefined,
                  }}
                />
                <Text type="secondary">
                  {isEmergency
                    ? 'Yêu cầu can thiệp ưu tiên / khẩn cấp'
                    : 'Dịch vụ thông thường theo quy trình chuẩn'}
                </Text>
              </Space>
              <div className="field-hint">
                Chỉ bật nếu thú cưng có dấu hiệu khẩn cấp cần được bác sĩ xử lý
                ưu tiên.
              </div>
            </Form.Item>

            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="Lưu ý"
              description="Sau khi thêm dịch vụ, lễ tân và bác sĩ sẽ ghi nhận danh mục điều trị ngay khi thú cưng đến tiếp nhận tại phòng khám."
              style={{ marginTop: 16 }}
            />
          </Form>
        )}
      </StyledWrapper>
    </Modal>
  );
};

export default AddAppointmentServiceModal;
