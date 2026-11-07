import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  Select,
  Button,
  Tag,
  Alert,
  Spin,
  Switch,
  Typography,
  Space,
} from 'antd';
import {
  ClockCircleOutlined,
  DollarOutlined,
  ReloadOutlined,
  DeleteOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { Service } from '@/services/ServiceService';
import {
  formatServicePrice,
  formatServiceDuration,
  serviceCategoryLabels,
} from '@/services/ServiceService';
import { filterActiveServices } from '@/services/AppointmentServiceService';

const { Text } = Typography;

export interface SelectedBookingService {
  serviceId: string;
  isEmergency?: boolean;
  sequenceNo?: number;
}

export interface BookingServiceStepProps {
  services: Service[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  selectedServices: SelectedBookingService[];
  onChange: (services: SelectedBookingService[]) => void;
  errorText?: string;
}

const StepWrapper = styled.div`
  .section-label {
    font-size: 13.5px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
  }

  .field-error {
    font-size: 12px;
    color: #ef4444;
    margin-top: 4px;
    margin-bottom: 12px;
  }

  .selected-services-list {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .service-item-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    transition: all 0.2s ease;

    &:hover {
      border-color: #0d9488;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;

      .seq-badge {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #f0fdfa;
        color: #0d9488;
        font-weight: 700;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .info {
        min-width: 0;
        .name {
          font-weight: 600;
          color: #0f172a;
          font-size: 13.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
          font-size: 12px;
          color: #64748b;
          flex-wrap: wrap;
        }
      }
    }

    .item-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
  }

  .calculation-summary {
    margin-top: 14px;
    padding: 10px 14px;
    background: #f0fdfa;
    border: 1px dashed #0d9488;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 13px;

    .stat-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-item {
      color: #334155;
      strong {
        color: #0f172a;
      }
    }

    .total-price {
      font-weight: 700;
      color: #0d9488;
      font-size: 14px;
    }
  }
`;

const BookingServiceStep: React.FC<BookingServiceStepProps> = ({
  services,
  loading,
  error,
  onRetry,
  selectedServices,
  onChange,
  errorText,
}) => {
  // Client-side filtering: Ensure only services with status === 'Active' are available for selection
  const activeServices = useMemo(
    () => filterActiveServices(services),
    [services]
  );

  const serviceMap = useMemo(
    () => new Map<string, Service>((services || []).map(s => [s._id, s])),
    [services]
  );

  const handleSelectChange = (newIds: string[]) => {
    // Only allow IDs belonging to active services (defense against stale or injected IDs)
    const activeIds = new Set(activeServices.map(s => s._id));
    const validNewIds = newIds.filter(id => activeIds.has(id));

    // Preserve existing settings (such as isEmergency) for services already selected
    const updated: SelectedBookingService[] = validNewIds.map((id, index) => {
      const existing = selectedServices.find(s => s.serviceId === id);
      return {
        serviceId: id,
        sequenceNo: index + 1,
        isEmergency: existing?.isEmergency || false,
      };
    });
    onChange(updated);
  };

  const handleToggleEmergency = (serviceId: string, checked: boolean) => {
    const updated = selectedServices.map(s =>
      s.serviceId === serviceId ? { ...s, isEmergency: checked } : s
    );
    onChange(updated);
  };

  const handleRemoveService = (serviceId: string) => {
    const updated = selectedServices
      .filter(s => s.serviceId !== serviceId)
      .map((s, idx) => ({ ...s, sequenceNo: idx + 1 }));
    onChange(updated);
  };

  // Calculate totals
  const totalDuration = selectedServices.reduce((acc, curr) => {
    const s = serviceMap.get(curr.serviceId);
    return acc + (s?.defaultDuration || 0);
  }, 0);

  const totalPrice = selectedServices.reduce((acc, curr) => {
    const s = serviceMap.get(curr.serviceId);
    return acc + (s?.basePrice || 0);
  }, 0);

  return (
    <StepWrapper>
      <div className="section-label">
        1. Chọn các dịch vụ cần thực hiện cho thú cưng:
      </div>

      {loading ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <Spin />
          <div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>
            Đang tải danh mục dịch vụ hoạt động...
          </div>
        </div>
      ) : error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 12 }}
        />
      ) : activeServices.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Hiện không có dịch vụ nào đang mở tiếp nhận trực tuyến."
          style={{ marginBottom: 12 }}
        />
      ) : (
        <>
          <Select
            mode="multiple"
            size="large"
            placeholder="Tìm kiếm và chọn một hoặc nhiều dịch vụ..."
            style={{ width: '100%' }}
            value={selectedServices.map(s => s.serviceId)}
            onChange={handleSelectChange}
            status={errorText ? 'error' : undefined}
            optionFilterProp="label"
            options={activeServices.map(s => ({
              value: s._id,
              label: `${s.name} · ${serviceCategoryLabels[s.category] || s.category} (${formatServicePrice(s.basePrice)})`,
            }))}
          />
          {errorText && <div className="field-error">{errorText}</div>}

          {/* List of selected services with sequence and emergency toggle */}
          {selectedServices.length > 0 && (
            <>
              <div className="selected-services-list">
                {selectedServices.map((item, index) => {
                  const s = serviceMap.get(item.serviceId);
                  return (
                    <div className="service-item-card" key={item.serviceId}>
                      <div className="item-left">
                        <div className="seq-badge">#{index + 1}</div>
                        <div className="info">
                          <div className="name">
                            {s
                              ? s.name
                              : `Dịch vụ (${item.serviceId.slice(-6)})`}
                          </div>
                          <div className="meta">
                            {s && (
                              <Tag color="cyan" style={{ margin: 0 }}>
                                {serviceCategoryLabels[s.category] ||
                                  s.category}
                              </Tag>
                            )}
                            {s?.defaultDuration && (
                              <span>
                                <ClockCircleOutlined
                                  style={{ marginRight: 4 }}
                                />
                                {formatServiceDuration(s.defaultDuration)}
                              </span>
                            )}
                            {s?.basePrice !== undefined && (
                              <span>
                                <DollarOutlined style={{ marginRight: 4 }} />
                                {formatServicePrice(s.basePrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="item-right">
                        <Space size="small">
                          <Switch
                            size="small"
                            checked={Boolean(item.isEmergency)}
                            onChange={checked =>
                              handleToggleEmergency(item.serviceId, checked)
                            }
                          />
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              color: item.isEmergency ? '#dc2626' : undefined,
                              fontWeight: item.isEmergency ? 600 : undefined,
                            }}
                          >
                            {item.isEmergency ? (
                              <span style={{ color: '#dc2626' }}>
                                <WarningOutlined /> Khẩn cấp
                              </span>
                            ) : (
                              'Khẩn cấp'
                            )}
                          </Text>
                        </Space>

                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveService(item.serviceId)}
                          title="Xóa dịch vụ này"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-time Summary Card */}
              <div className="calculation-summary">
                <div className="stat-group">
                  <span className="stat-item">
                    Số dịch vụ: <strong>{selectedServices.length}</strong>
                  </span>
                  {totalDuration > 0 && (
                    <span className="stat-item">
                      Thời lượng ước tính:{' '}
                      <strong>{formatServiceDuration(totalDuration)}</strong>
                    </span>
                  )}
                </div>
                <div className="total-price">
                  Tạm tính: {formatServicePrice(totalPrice)}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </StepWrapper>
  );
};

export default BookingServiceStep;
