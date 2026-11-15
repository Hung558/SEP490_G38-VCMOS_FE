import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type {
  Cage,
  CheckInAppointmentPayload,
  OnlineAppointmentService,
  ReceptionIntake,
  StaffAppointment,
  StaffMember,
} from '@/types';
import {
  getAppointmentPetName,
  getReservedCage,
  readReceptionIntake,
  RECEPTION_INTAKE_FIELD_LIMIT,
} from '@/services/AppointmentOrderService';
import AppointmentServiceService, {
  getAppointmentServiceName,
  getServiceRefCategory,
  getServiceRefId,
} from '@/services/AppointmentServiceService';
import CageService from '@/services/CageService';
import PetService from '@/services/PetService';
import StaffService, {
  formatStaffOption,
  getServiceStaffRole,
} from '@/services/StaffService';
import { serviceCategoryLabels } from '@/services/ServiceService';
import type { ServiceCategory } from '@/services/ServiceService';
import { getRoleLabel } from '@/constants/roles';
import { isReceptionIntakeEnabled } from './receptionIntakeFeature';
import { receptionCageLabel } from './receptionCages';
import {
  buildCheckInAssignments,
  getCheckInCageChoices,
  getCheckInServices,
  getDefaultCheckInCageId,
  getDefaultCheckInStaffId,
  getReservedCageProblem,
} from './checkInHelpers';

const { Text } = Typography;

// SRS MSG24
const MSG24 = 'Không còn chuồng trống phù hợp.';

const SummaryBox = styled.div`
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
`;

const AssignRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 8px 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #e2e8f0;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

interface CheckInConfirmModalProps {
  open: boolean;
  appointment: StaffAppointment | null;
  submitting: boolean;
  cageBlockedReason?: string;
  onConfirm: (
    values: CheckInAppointmentPayload
  ) => Promise<{ cageError: string } | undefined>;
  onClose: () => void;
}

/** Nghiệp vụ 4.3 Check-in: gán chuồng trống và người phụ trách từng dịch vụ trong một lần */
const CheckInConfirmModal = ({
  open,
  appointment,
  submitting,
  cageBlockedReason,
  onConfirm,
  onClose,
}: CheckInConfirmModalProps) => {
  const formId = useId();
  if (!appointment) return null;
  const reserved = getReservedCage(appointment);

  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <span>Tiếp nhận lịch hẹn</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      okText="Xác nhận Check-in"
      cancelText="Hủy bỏ"
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting, htmlType: 'submit', form: formId }}
      cancelButtonProps={{ disabled: submitting }}
      destroyOnHidden
      width={640}
    >
      <Space
        direction="vertical"
        size="middle"
        style={{ width: '100%', marginTop: 8 }}
      >
        <SummaryBox>
          <Text type="secondary">Mã lịch hẹn</Text>
          <Text strong style={{ color: '#0958d9' }}>
            {appointment.code}
          </Text>
          <Text type="secondary">Thú cưng</Text>
          <Text strong>{getAppointmentPetName(appointment.petId)}</Text>
          <Text type="secondary">Ngày hẹn</Text>
          <Text strong>
            {appointment.date
              ? dayjs(appointment.date).format('DD/MM/YYYY')
              : '-'}
            {appointment.slotStart ? ` · ${appointment.slotStart}` : ''}
          </Text>
          <Text type="secondary">Chuồng giữ chỗ</Text>
          <Text strong>
            {reserved
              ? `${reserved.label} (cỡ ${reserved.size}${reserved.isIsolated ? ', cách ly' : ''})`
              : 'Chưa có'}
          </Text>
        </SummaryBox>

        <CheckInForm
          key={appointment._id}
          formId={formId}
          appointment={appointment}
          submitting={submitting}
          cageBlockedReason={cageBlockedReason}
          onConfirm={onConfirm}
        />
      </Space>
    </Modal>
  );
};

type CheckInFormProps = Pick<
  CheckInConfirmModalProps,
  'submitting' | 'cageBlockedReason' | 'onConfirm'
> & {
  formId: string;
  appointment: StaffAppointment;
};

interface CheckInFormValues {
  intake?: ReceptionIntake;
  requiresIsolation?: boolean;
  cageId?: string;
  /** appointmentServiceId -> staff id */
  staff?: Record<string, string | undefined>;
}

const CheckInForm = ({
  formId,
  appointment,
  submitting,
  cageBlockedReason,
  onConfirm,
}: CheckInFormProps) => {
  const [form] = Form.useForm<CheckInFormValues>();
  const requiresIsolation = Form.useWatch('requiresIsolation', form) === true;
  const cageId = Form.useWatch('cageId', form);
  const [cages, setCages] = useState<Cage[]>([]);
  const [cagesLoaded, setCagesLoaded] = useState(false);
  const [cagesLoading, setCagesLoading] = useState(true);
  const [cageLoadError, setCageLoadError] = useState(false);
  const [services, setServices] = useState<OnlineAppointmentService[]>([]);
  const [servicesError, setServicesError] = useState(false);
  // appointmentServiceId -> staff who can do it and are free at its time
  const [staffByService, setStaffByService] = useState<
    Record<string, StaffMember[]>
  >({});
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError, setStaffError] = useState(false);
  const pet = appointment.petId;
  const petId = typeof pet === 'string' ? pet : pet?._id;
  const knownWeight =
    typeof pet === 'object' && typeof pet?.weight === 'number'
      ? pet.weight
      : undefined;
  const [petWeight, setPetWeight] = useState(knownWeight);
  const reserved = getReservedCage(appointment);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const loadCages = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const signal = controller.signal;
    setCagesLoading(true);
    setCageLoadError(false);
    const [cageResult, weightResult] = await Promise.allSettled([
      CageService.listCages({ status: 'Available', limit: 100 }, { signal }),
      knownWeight === undefined && petId
        ? PetService.getPetById(petId).then(result => result.pet?.weight)
        : Promise.resolve(knownWeight),
    ]);
    if (signal.aborted) return;
    const list =
      cageResult.status === 'fulfilled'
        ? cageResult.value.data?.items || []
        : [];
    const weight =
      weightResult.status === 'fulfilled' &&
      typeof weightResult.value === 'number'
        ? weightResult.value
        : undefined;
    setCages(list);
    setPetWeight(weight);
    setCageLoadError(cageResult.status === 'rejected');
    setCagesLoading(false);
    setCagesLoaded(true);
    // Start from the cage held at booking when it is still free and fits
    if (!form.getFieldValue('cageId') && !cageBlockedReason) {
      const choices = getCheckInCageChoices(list, {
        reservedCageId: reserved?._id,
        petWeight: weight,
        requiresIsolation: form.getFieldValue('requiresIsolation') === true,
      });
      form.setFieldValue('cageId', getDefaultCheckInCageId(choices));
    }
  }, [cageBlockedReason, form, knownWeight, petId, reserved?._id]);

  useEffect(() => {
    void loadCages();
  }, [loadCages]);

  // Services, then for each one the staff who can do it and are not busy at its
  // time (B2, nghiệp vụ 3.5 / 4.2): no fallback to everyone
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const load = async () => {
      const servicesResult = await Promise.allSettled([
        Array.isArray(appointment.services)
          ? Promise.resolve(appointment.services)
          : AppointmentServiceService.listOrderServices(appointment._id, {
              signal,
            }).then(res => res.data || []),
      ]);
      if (signal.aborted) return;
      const [serviceResult] = servicesResult;
      const open =
        serviceResult.status === 'fulfilled'
          ? getCheckInServices(serviceResult.value)
          : [];
      setServices(open);
      setServicesError(serviceResult.status === 'rejected');
      const lists = await Promise.allSettled(
        open.map(service =>
          StaffService.listAvailableStaff(
            {
              date: appointment.date,
              time: service.scheduledStart || appointment.slotStart,
              serviceId: getServiceRefId(service.serviceId),
            },
            { signal }
          )
        )
      );
      if (signal.aborted) return;
      const byService: Record<string, StaffMember[]> = {};
      const defaults: Record<string, string | undefined> = {};
      open.forEach((service, index) => {
        const result = lists[index];
        const available = result.status === 'fulfilled' ? result.value : [];
        byService[service._id] = available;
        const id = getDefaultCheckInStaffId(service);
        // Only pre-select someone who can still take the service at that time
        if (id && available.some(s => s._id === id)) defaults[service._id] = id;
      });
      setStaffByService(byService);
      setStaffError(lists.some(r => r.status === 'rejected'));
      form.setFieldsValue({ staff: defaults });
      setStaffLoading(false);
    };
    void load();
    return () => controller.abort();
  }, [
    appointment._id,
    appointment.date,
    appointment.services,
    appointment.slotStart,
    form,
  ]);

  const choices = getCheckInCageChoices(cages, {
    reservedCageId: reserved?._id,
    petWeight,
    requiresIsolation,
  });
  const reservedProblem =
    cagesLoaded && !cageLoadError && !cageBlockedReason
      ? getReservedCageProblem(reserved, choices, requiresIsolation)
      : undefined;
  const noCageLeft =
    cagesLoaded && !cageLoadError && !cageBlockedReason && choices.length === 0;
  // Nghiệp vụ 4.3: check-in gán chuồng trống. Khi hết chuồng vừa, tạm thời
  // vẫn cho tiếp nhận rồi xếp chuồng sau (quyết định A13 ngày 15/11, sẽ sửa sau)
  const cageRequired = !cageBlockedReason && !noCageLeft;
  const weightUnknown = cagesLoaded && petWeight === undefined;

  const submit = async (values: CheckInFormValues) => {
    const intake = isReceptionIntakeEnabled
      ? readReceptionIntake(values.intake)
      : undefined;
    if (submitting || (isReceptionIntakeEnabled && !intake)) return;
    if (
      values.cageId &&
      (cageBlockedReason ||
        cagesLoading ||
        !getCheckInCageChoices(cages, {
          petWeight,
          requiresIsolation: values.requiresIsolation === true,
        }).some(c => c.cage._id === values.cageId))
    ) {
      form.setFields([
        {
          name: 'cageId',
          errors: [
            cageBlockedReason || 'Chuồng không còn phù hợp. Vui lòng chọn lại.',
          ],
        },
      ]);
      return;
    }
    const result = await onConfirm({
      cageId: values.cageId,
      requiresIsolation: values.requiresIsolation === true,
      intake,
      serviceAssignments: buildCheckInAssignments(services, values.staff),
    });
    if (result) {
      form.setFields([
        { name: 'cageId', value: undefined, errors: [result.cageError] },
      ]);
      if (!cageBlockedReason) void loadCages();
    }
  };

  const renderServiceRow = (service: OnlineAppointmentService) => {
    const category = getServiceRefCategory(service.serviceId);
    const staff = staffByService[service._id] ?? [];
    // The BE filters by the service's own role; the category is only for the label
    const role = staff[0]?.role ?? getServiceStaffRole({ category });
    const nobodyFree = !staffLoading && !staffError && staff.length === 0;
    return (
      <AssignRow key={service._id}>
        <div>
          <Text strong>
            {service.sequenceNo}. {getAppointmentServiceName(service.serviceId)}
          </Text>
          <div>
            {category && (
              <Tag style={{ marginTop: 4 }}>
                {serviceCategoryLabels[category as ServiceCategory] || category}
              </Tag>
            )}
            {service.scheduledStart && (
              <Text type="secondary">{service.scheduledStart}</Text>
            )}
          </div>
        </div>
        <Form.Item
          name={['staff', service._id]}
          style={{ marginBottom: 0 }}
          extra={
            nobodyFree
              ? `Không có ${getRoleLabel(role).toLowerCase()} nào rảnh ca này. Có thể tiếp nhận trước rồi phân công sau.`
              : undefined
          }
        >
          <Select
            allowClear
            aria-label={`Người phụ trách ${getAppointmentServiceName(service.serviceId)}`}
            placeholder={
              staffLoading
                ? 'Đang tải nhân sự…'
                : `Chọn ${getRoleLabel(role).toLowerCase()}`
            }
            loading={staffLoading}
            showSearch
            optionFilterProp="label"
            options={staff.map(s => ({
              value: s._id,
              label: formatStaffOption(s),
            }))}
            notFoundContent={
              staffError
                ? 'Chưa tải được nhân sự'
                : 'Hiện không có nhân viên nào rảnh cho dịch vụ này.'
            }
          />
        </Form.Item>
      </AssignRow>
    );
  };

  return (
    <Form<CheckInFormValues>
      form={form}
      id={formId}
      name={formId}
      layout="vertical"
      disabled={submitting}
      onFinish={submit}
    >
      {isReceptionIntakeEnabled && (
        <>
          <Text strong>Phiếu tiếp nhận</Text>
          <Form.Item<CheckInFormValues>
            label="Triệu chứng"
            style={{ marginBottom: 12 }}
            name={['intake', 'symptoms']}
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Vui lòng nhập triệu chứng.',
              },
            ]}
          >
            <Input.TextArea
              rows={2}
              maxLength={RECEPTION_INTAKE_FIELD_LIMIT}
              showCount
            />
          </Form.Item>
          <Form.Item<CheckInFormValues>
            label="Tình trạng ban đầu"
            style={{ marginBottom: 12 }}
            name={['intake', 'initialCondition']}
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Vui lòng nhập tình trạng ban đầu.',
              },
            ]}
          >
            <Input.TextArea
              rows={2}
              maxLength={RECEPTION_INTAKE_FIELD_LIMIT}
              showCount
            />
          </Form.Item>
        </>
      )}

      <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>
        Chuồng
      </Divider>
      <Form.Item
        name="requiresIsolation"
        valuePropName="checked"
        style={{ marginBottom: 8 }}
      >
        <Checkbox
          disabled={Boolean(cageBlockedReason)}
          onChange={() => {
            if (cageId) form.setFieldValue('cageId', undefined);
          }}
        >
          Thú cưng nghi mắc bệnh lây, cần chuồng cách ly
        </Checkbox>
      </Form.Item>
      {reservedProblem && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={reservedProblem}
        />
      )}
      {noCageLeft && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={MSG24}
          description="Có thể tiếp nhận trước rồi xếp chuồng sau ở Sơ đồ chuồng khi có chuồng trống."
        />
      )}
      <Form.Item
        name="cageId"
        label="Chuồng lưu giữ"
        style={{ marginBottom: 12 }}
        rules={[
          {
            required: cageRequired,
            message: 'Vui lòng chọn chuồng cho thú cưng.',
          },
        ]}
        extra={
          cageBlockedReason ||
          (cageLoadError ? (
            <Space wrap>
              Không tải được danh sách chuồng.
              <Button type="link" size="small" onClick={loadCages}>
                Tải lại chuồng trống
              </Button>
            </Space>
          ) : requiresIsolation ? (
            'Chỉ hiện chuồng cách ly vừa cân nặng thú cưng (BR-11).'
          ) : (
            'Chỉ hiện chuồng trống vừa cân nặng thú cưng (BR-11).'
          ))
        }
      >
        <Select
          allowClear
          placeholder="Chọn chuồng trống"
          loading={cagesLoading}
          disabled={Boolean(cageBlockedReason) && !cageId}
          options={choices.map(({ cage }) => ({
            value: cage._id,
            label: receptionCageLabel(cage),
          }))}
          notFoundContent={
            cagesLoading
              ? 'Đang tải danh sách chuồng…'
              : cageLoadError
                ? 'Chưa tải được chuồng trống'
                : MSG24
          }
        />
      </Form.Item>
      {weightUnknown && !cageBlockedReason && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Chưa có cân nặng của thú cưng. Hệ thống sẽ kiểm tra lại cỡ chuồng khi
          check-in.
        </Text>
      )}

      <Divider orientation="left" plain style={{ margin: '4px 0 4px' }}>
        Người phụ trách
      </Divider>
      <Text type="secondary" style={{ display: 'block' }}>
        Dịch vụ có người phụ trách sẽ vào hàng đợi của họ ngay khi check-in. Có
        thể phân công sau ở Chi tiết lịch hẹn.
      </Text>
      {staffLoading && services.length === 0 ? (
        <Spin size="small" style={{ display: 'block', margin: '12px 0' }} />
      ) : servicesError ? (
        <Alert
          type="warning"
          showIcon
          style={{ margin: '8px 0' }}
          message="Không tải được dịch vụ của lịch hẹn. Có thể phân công sau khi check-in."
        />
      ) : services.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', margin: '8px 0' }}>
          Lịch hẹn không có dịch vụ nào cần phân công.
        </Text>
      ) : (
        <div style={{ marginBottom: 12 }}>{services.map(renderServiceRow)}</div>
      )}
    </Form>
  );
};

export default CheckInConfirmModal;
