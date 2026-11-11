import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import MedicalRecordModal from '@/components/medical/MedicalRecordModal';
import CancelReasonModal from '@/components/appointment/CancelReasonModal';
import { isMedicalServiceCategory } from '@/services/MedicalRecordService';
import type {
  OnlineAppointmentService,
  StaffAppointment,
  StaffMember,
} from '@/types';
import AppointmentServiceService, {
  canSubmitAssignment,
  extractApiError,
  getAppointmentServiceName,
  getAppointmentServiceStaffName,
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
  getAssignStaffBlockReason,
  getServiceRefCategory,
  getStaffRefId,
  isQueueingOrder,
} from '@/services/AppointmentServiceService';
import StaffService, {
  formatStaffOption,
  getRequiredStaffRole,
  pickAssignableStaff,
} from '@/services/StaffService';
import { serviceCategoryLabels } from '@/services/ServiceService';
import type { ServiceCategory } from '@/services/ServiceService';
import { getRoleLabel } from '@/constants/roles';
import { OrderServiceCard } from './styles';

const { Text } = Typography;

// SRS MSG23
const MSG23 = 'Hiện không có nhân viên nào rảnh cho dịch vụ này.';

const isAbort = (err: unknown) =>
  axios.isCancel(err) ||
  (err instanceof DOMException && err.name === 'AbortError');

interface AppointmentServicesPanelProps {
  appointment: StaffAppointment;
  /** Chỉ Lễ tân được phân công; Admin chỉ xem */
  canAssign: boolean;
  onUpdated?: () => void;
}

/** Dịch vụ của một lịch hẹn và người phụ trách (SCR-16) */
const AppointmentServicesPanel = ({
  appointment,
  canAssign,
  onUpdated,
}: AppointmentServicesPanelProps) => {
  const [items, setItems] = useState<OnlineAppointmentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Staff on duty on the appointment's date, and every active staff member as
  // the fallback for a role nobody is scheduled for (file 2: "không vướng lịch")
  const [onDutyStaff, setOnDutyStaff] = useState<StaffMember[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(canAssign);
  const [recordServiceId, setRecordServiceId] = useState<string | null>(null);
  const [staffError, setStaffError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>();
  const [savingId, setSavingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel Service State
  const [serviceToCancel, setServiceToCancel] =
    useState<OnlineAppointmentService | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const orderId = appointment._id;
  const orderStatus = appointment.derivedStatus;
  const orderBlockReason = getAssignStaffBlockReason(undefined, orderStatus);

  const handleConfirmCancelService = async (reason: string) => {
    if (!serviceToCancel || cancelSubmitting) return;
    setCancelSubmitting(true);
    try {
      const res = await AppointmentServiceService.cancelAppointmentService(
        serviceToCancel._id,
        { reason }
      );
      toast.success(res.message || 'Đã hủy dịch vụ thành công');
      setServiceToCancel(null);
      fetchServices();
      onUpdated?.();
    } catch (err: unknown) {
      const { message, statusCode } = extractApiError(
        err,
        'Hủy dịch vụ thất bại'
      );
      toast.error(message);
      if (statusCode === 409 || statusCode === 404) {
        setServiceToCancel(null);
        fetchServices();
        onUpdated?.();
      }
    } finally {
      setCancelSubmitting(false);
    }
  };

  const fetchServices = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await AppointmentServiceService.listOrderServices(orderId, {
        signal: controller.signal,
      });
      setItems(res.data || []);
    } catch (err: unknown) {
      if (isAbort(err)) return;
      setError(
        extractApiError(err, 'Không thể tải danh sách dịch vụ của lịch hẹn')
          .message
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchServices();
    return () => abortRef.current?.abort();
  }, [fetchServices]);

  const orderDate = appointment.date;

  useEffect(() => {
    if (!canAssign) return;
    const controller = new AbortController();
    StaffService.listStaffForDate(orderDate, { signal: controller.signal })
      .then(res => {
        setOnDutyStaff(res.onDuty);
        setStaff(res.all);
      })
      .catch((err: unknown) => {
        if (!isAbort(err)) setStaffError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setStaffLoading(false);
      });
    return () => controller.abort();
  }, [canAssign, orderDate]);

  const startEditing = (item: OnlineAppointmentService) => {
    setEditingId(item._id);
    setSelectedStaffId(getStaffRefId(item.assignedStaffId));
  };

  const stopEditing = () => {
    setEditingId(null);
    setSelectedStaffId(undefined);
  };

  const submitAssignment = async (
    item: OnlineAppointmentService,
    staffId?: string
  ) => {
    if (!staffId || savingId) return;
    setSavingId(item._id);
    try {
      const res = await AppointmentServiceService.assignStaff(
        item._id,
        staffId
      );
      setItems(prev => prev.map(s => (s._id === item._id ? res.data : s)));
      toast.success(res.message || 'Phân công nhân sự cho dịch vụ thành công');
      stopEditing();
      onUpdated?.();
    } catch (err: unknown) {
      const { message, statusCode } = extractApiError(
        err,
        'Phân công nhân sự thất bại'
      );
      toast.error(message);
      // The service or the appointment changed elsewhere: show what the server has
      if (statusCode === 404 || statusCode === 409) {
        stopEditing();
        fetchServices();
      }
    } finally {
      setSavingId(null);
    }
  };

  const renderAssignControls = (item: OnlineAppointmentService) => {
    if (!canAssign || getAssignStaffBlockReason(item.status, orderStatus)) {
      return null;
    }

    const currentStaffId = getStaffRefId(item.assignedStaffId);

    if (editingId === item._id) {
      const role = getRequiredStaffRole(getServiceRefCategory(item.serviceId));
      const { staff: options, onDutyOnly } = pickAssignableStaff(
        onDutyStaff,
        staff,
        role
      );
      return (
        <>
          <div className="assign-row">
            <Select
              autoFocus
              showSearch
              optionFilterProp="label"
              loading={staffLoading}
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              placeholder={
                role === 'Groomer' ? 'Chọn groomer' : 'Chọn bác sĩ thú y'
              }
              notFoundContent={staffLoading ? 'Đang tải...' : MSG23}
              options={options.map(s => ({
                value: s._id,
                label: formatStaffOption(s),
              }))}
            />
            <Button
              type="primary"
              loading={savingId === item._id}
              disabled={
                !canSubmitAssignment(item, orderStatus, selectedStaffId)
              }
              onClick={() => submitAssignment(item, selectedStaffId)}
            >
              Lưu
            </Button>
            <Button onClick={stopEditing} disabled={savingId === item._id}>
              Hủy
            </Button>
          </div>
          {staffError && (
            <Text type="danger" style={{ display: 'block', marginTop: 6 }}>
              Không tải được danh sách nhân sự.
            </Text>
          )}
          {!staffLoading && !staffError && options.length === 0 && (
            <Text type="warning" style={{ display: 'block', marginTop: 6 }}>
              {MSG23}
            </Text>
          )}
          {!staffLoading &&
            !staffError &&
            options.length > 0 &&
            !onDutyOnly && (
              <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                Chưa có ai trong vai trò này có lịch làm việc ngày{' '}
                {dayjs(orderDate).format('DD/MM/YYYY')}, nên đang hiện mọi nhân
                sự đang hoạt động.
              </Text>
            )}
        </>
      );
    }

    return (
      <div className="assign-row">
        <Button
          size="small"
          disabled={Boolean(savingId)}
          onClick={() => startEditing(item)}
        >
          {currentStaffId ? 'Đổi người phụ trách' : 'Phân công'}
        </Button>
      </div>
    );
  };

  const renderItem = (item: OnlineAppointmentService) => {
    const category = getServiceRefCategory(item.serviceId);
    const assigned =
      item.assignedStaffId && typeof item.assignedStaffId === 'object'
        ? item.assignedStaffId
        : null;

    return (
      <OrderServiceCard key={item._id}>
        <div className="service-head">
          <Space wrap size={6}>
            <Text strong>
              {item.sequenceNo}. {getAppointmentServiceName(item.serviceId)}
            </Text>
            {category && (
              <Tag>
                {serviceCategoryLabels[category as ServiceCategory] || category}
              </Tag>
            )}
            {item.isEmergency && <Tag color="red">Cấp cứu</Tag>}
          </Space>
          <Tag color={getAppointmentServiceStatusColor(item.status)}>
            {getAppointmentServiceStatusLabel(item.status)}
          </Tag>
        </div>

        <div className="service-meta">
          {(item.scheduledStart || item.scheduledEnd) && (
            <span>
              <Text type="secondary">Khung giờ: </Text>
              <Text strong>
                {item.scheduledStart || ''}
                {item.scheduledEnd ? ` - ${item.scheduledEnd}` : ''}
              </Text>
            </span>
          )}
          <span>
            <Text type="secondary">Phụ trách: </Text>
            {item.assignedStaffId ? (
              <Text>
                {getAppointmentServiceStaffName(item.assignedStaffId)}
                {assigned?.role ? ` (${getRoleLabel(assigned.role)})` : ''}
              </Text>
            ) : (
              <Text type="warning">Chưa phân công</Text>
            )}
          </span>
          {item.status === 'Waiting' && typeof item.queueNo === 'number' && (
            <span>
              <Text type="secondary">Số thứ tự: </Text>
              <Text strong>{item.queueNo}</Text>
            </span>
          )}
          {item.preferredStaffId && (
            <span>
              <Text type="secondary">Khách mong muốn: </Text>
              {getAppointmentServiceStaffName(item.preferredStaffId)}
            </span>
          )}
          {item.status === 'Cancelled' && item.cancelReason && (
            <div style={{ marginTop: 4, fontSize: 12.5, color: '#ff4d4f' }}>
              <span>Lý do hủy: {item.cancelReason}</span>
              {item.cancelledAt && (
                <span style={{ color: '#8c8c8c', marginLeft: 6 }}>
                  ({dayjs(item.cancelledAt).format('HH:mm DD/MM/YYYY')})
                </span>
              )}
            </div>
          )}
        </div>

        {renderAssignControls(item)}

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 6,
            alignItems: 'center',
          }}
        >
          {isMedicalServiceCategory(category) &&
            (item.status === 'InProgress' || item.status === 'Done') && (
              <Button
                type="link"
                size="small"
                icon={<FileTextOutlined />}
                style={{ padding: 0 }}
                onClick={() => setRecordServiceId(item._id)}
              >
                Xem bệnh án
              </Button>
            )}

          {canAssign && ['Booked', 'Waiting'].includes(item.status) && (
            <Button
              type="link"
              size="small"
              danger
              style={{ padding: 0 }}
              onClick={() => setServiceToCancel(item)}
            >
              Hủy dịch vụ
            </Button>
          )}
        </div>
      </OrderServiceCard>
    );
  };

  return (
    <div style={{ marginTop: 20 }}>
      <Space style={{ marginBottom: 8 }}>
        <TeamOutlined style={{ color: '#1677ff' }} />
        <Text strong>Dịch vụ và người phụ trách</Text>
      </Space>

      {canAssign && !orderBlockReason && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {isQueueingOrder(orderStatus)
            ? 'Khách đã check-in: dịch vụ được phân công sẽ vào hàng đợi của người phụ trách ngay.'
            : 'Khách chưa check-in: có thể phân công trước, dịch vụ sẽ tự vào hàng đợi khi khách check-in.'}
        </Text>
      )}
      {canAssign && orderBlockReason && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={orderBlockReason}
        />
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={fetchServices}>
              Thử lại
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Lịch hẹn chưa có dịch vụ nào"
        />
      ) : (
        items.map(renderItem)
      )}

      <MedicalRecordModal
        appointmentServiceId={recordServiceId}
        onClose={() => setRecordServiceId(null)}
      />

      {serviceToCancel && (
        <CancelReasonModal
          open={Boolean(serviceToCancel)}
          title="Hủy dịch vụ trong lịch hẹn"
          warningText="Dịch vụ này sẽ bị hủy và rút khỏi hàng đợi của nhân sự (nếu có)."
          targetDescription={
            <div>
              Dịch vụ: #{serviceToCancel.sequenceNo}.{' '}
              <strong>
                {getAppointmentServiceName(serviceToCancel.serviceId)}
              </strong>
            </div>
          }
          confirmLoading={cancelSubmitting}
          onCancel={() => setServiceToCancel(null)}
          onConfirm={handleConfirmCancelService}
        />
      )}
    </div>
  );
};

export default AppointmentServicesPanel;
