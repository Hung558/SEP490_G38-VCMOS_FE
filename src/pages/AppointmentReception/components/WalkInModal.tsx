import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  type FormInstance,
} from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from 'sonner';
import type {
  Cage,
  CreateWalkInBookingResult,
  ReceptionIntake,
  StaffMember,
  WalkInLookupResult,
} from '@/types';
import ServiceService, {
  serviceCategoryLabels,
  type Service,
} from '@/services/ServiceService';
import StaffService, {
  formatStaffOption,
  getRequiredStaffRole,
  pickAssignableStaff,
} from '@/services/StaffService';
import CageService from '@/services/CageService';
import {
  isReceptionCageError,
  readReceptionIntake,
  RECEPTION_INTAKE_FIELD_LIMIT,
} from '@/services/AppointmentOrderService';
import WalkInService, {
  WALK_IN_EMAIL_REGEX,
  WALK_IN_FULLNAME_MAX,
  WALK_IN_NOTE_MAX,
  WALK_IN_PET_TEXT_MAX,
  WALK_IN_PHONE_REGEX,
  buildWalkInPayload,
  describeWalkInPet,
  findDuplicateServiceRows,
  getWalkInCustomerStatus,
  normalizeWalkInPhone,
  toWalkInFieldPath,
  validateWalkInPhone,
  type WalkInServiceRow,
} from '@/services/WalkInService';
import {
  extractApiError,
  getAppointmentServiceName,
  getAppointmentServiceStaffName,
  getVietnamTodayString,
} from '@/services/AppointmentServiceService';
import {
  MSG_PET_WEIGHT,
  PET_NAME_MAX_LENGTH,
  PET_NOTES_MAX_LENGTH,
  isValidPetWeight,
} from '@/constants/pet';
import { ModalFooterBar, SectionBlock, ServiceRowCard } from './styles';
import { isReceptionIntakeEnabled } from './receptionIntakeFeature';
import { getReceptionCageChoices, receptionCageLabel } from './receptionCages';
import { matchesActiveCageAssignment } from './activeCageAssignments';

const { Text } = Typography;

// SRS messages
const MSG23 = 'Hiện không có nhân viên nào rảnh cho dịch vụ này.';
const MSG24 =
  'Không còn chuồng trống. Hãy giải phóng hoặc chuyển chuồng trước.';

const SPECIES_SUGGESTIONS = [{ value: 'Chó' }, { value: 'Mèo' }];

interface WalkInFormFields {
  phone?: string;
  fullName?: string;
  email?: string;
  petId?: string;
  petInfo?: {
    name?: string;
    species?: string;
    breed?: string;
    weight?: number | null;
    coatColor?: string;
    dob?: Dayjs | null;
    notes?: string;
  };
  services?: WalkInServiceRow[];
  cageId?: string;
  requiresIsolation?: boolean;
  note?: string;
  includeIntake?: boolean;
  intake?: ReceptionIntake;
}

const isAbort = (err: unknown) =>
  axios.isCancel(err) ||
  (err instanceof DOMException && err.name === 'AbortError');

/** "APT-K7M2QX · Khám tổng quát: BS An (số 1), Tắm sấy: chưa phân công" */
const describeCreated = (result: CreateWalkInBookingResult) =>
  [
    result.appointment.code,
    result.services
      .map(s => {
        const staff = s.assignedStaffId
          ? `${getAppointmentServiceStaffName(s.assignedStaffId)}${
              typeof s.queueNo === 'number' ? ` (số ${s.queueNo})` : ''
            }`
          : 'chưa phân công';
        return `${getAppointmentServiceName(s.serviceId)}: ${staff}`;
      })
      .join(', '),
  ].join(' · ');

interface WalkInFormProps {
  initialPhone?: string;
  onClose: () => void;
  onCreated: (result: CreateWalkInBookingResult) => void;
  onSubmitFailed: () => void;
}

/** Mounted only while the modal is open, so every opening starts from an empty form */
const WalkInForm = ({
  initialPhone,
  onClose,
  onCreated,
  onSubmitFailed,
}: WalkInFormProps) => {
  const [form] = Form.useForm<WalkInFormFields>();
  const phoneValue = Form.useWatch('phone', form);
  const petIdValue = Form.useWatch('petId', form);
  const newPetWeight = Form.useWatch(['petInfo', 'weight'], form);
  const cageIdValue = Form.useWatch('cageId', form);
  const requiresIsolation = Form.useWatch('requiresIsolation', form) === true;
  const serviceRows = Form.useWatch('services', form);
  const includeIntake = Form.useWatch('includeIntake', form);
  const resetPetReception = useCallback(() => {
    if (isReceptionIntakeEnabled) form.resetFields(['includeIntake', 'intake']);
    form.resetFields(['cageId', 'requiresIsolation']);
  }, [form]);

  const today = getVietnamTodayString();

  // Reference data for the selects
  const [services, setServices] = useState<Service[]>([]);
  const [onDutyStaff, setOnDutyStaff] = useState<StaffMember[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [cages, setCages] = useState<Cage[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [staffError, setStaffError] = useState(false);
  const [cagesError, setCagesError] = useState(false);
  const refAbortRef = useRef<AbortController | null>(null);

  // Customer lookup by phone (UC-20)
  const [lookup, setLookup] = useState<{
    phone: string;
    result: WalkInLookupResult;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const lookupRequestIdRef = useRef(0);
  // The last phone looked up automatically, so a typed number is looked up once
  const autoLookupRef = useRef('');
  const [petMode, setPetMode] = useState<'existing' | 'new'>('new');

  const [submitting, setSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const [submitError, setSubmitError] = useState<{
    message: string;
    details: string[];
  } | null>(null);

  const loadReferenceData = useCallback(async () => {
    refAbortRef.current?.abort();
    const controller = new AbortController();
    refAbortRef.current = controller;
    const { signal } = controller;

    setRefLoading(true);
    setServicesError(null);
    setStaffError(false);
    setCagesError(false);

    const [servicesRes, staffRes, cagesRes] = await Promise.allSettled([
      ServiceService.listServices({ status: 'Active' }, { signal }),
      StaffService.listStaffForDate(today, { signal }),
      CageService.listCages({ status: 'Available', limit: 100 }, { signal }),
    ]);
    if (signal.aborted) return undefined;

    if (servicesRes.status === 'fulfilled') {
      setServices(
        (servicesRes.value.services || []).filter(s => s.status === 'Active')
      );
    } else {
      setServicesError(
        extractApiError(servicesRes.reason, 'Không tải được danh sách dịch vụ')
          .message
      );
    }
    if (staffRes.status === 'fulfilled') {
      setOnDutyStaff(staffRes.value.onDuty);
      setStaff(staffRes.value.all);
    } else {
      setStaffError(true);
    }
    if (cagesRes.status === 'fulfilled') {
      setCages(cagesRes.value.data?.items || []);
    } else {
      setCages([]);
      setCagesError(true);
    }
    setRefLoading(false);
  }, [today]);

  const cageRefreshRef = useRef<AbortController | null>(null);
  const [cagesRefreshing, setCagesRefreshing] = useState(false);
  const refreshWalkInCages = async () => {
    cageRefreshRef.current?.abort();
    const controller = new AbortController();
    cageRefreshRef.current = controller;
    setCagesRefreshing(true);
    setCagesError(false);
    try {
      const res = await CageService.listCages(
        { status: 'Available', limit: 100 },
        { signal: controller.signal }
      );
      if (!controller.signal.aborted) {
        const fresh = res.data?.items || [];
        setCages(fresh);
        return fresh;
      }
    } catch {
      if (!controller.signal.aborted) {
        setCages([]);
        setCagesError(true);
      }
    } finally {
      if (!controller.signal.aborted) setCagesRefreshing(false);
    }
  };

  const runLookup = useCallback(
    async (rawPhone?: string) => {
      const phoneError = validateWalkInPhone(rawPhone);
      if (phoneError) {
        form.setFields([{ name: 'phone', errors: [phoneError] }]);
        return;
      }
      const phone = normalizeWalkInPhone(rawPhone);
      autoLookupRef.current = phone;
      // Only when there is an error to clear: resetting an error-free field makes
      // rc-field-form log a false "circular references" warning
      if (form.getFieldError('phone').length > 0) {
        form.setFields([{ name: 'phone', errors: [] }]);
      }

      lookupAbortRef.current?.abort();
      const controller = new AbortController();
      lookupAbortRef.current = controller;
      const requestId = ++lookupRequestIdRef.current;

      setLookupLoading(true);
      setLookupError(null);
      setSubmitError(null);
      try {
        const res = await WalkInService.lookupCustomer(phone, {
          signal: controller.signal,
        });
        if (requestId !== lookupRequestIdRef.current) return;
        const result = res.data;
        resetPetReception();
        setLookup({ phone, result });
        setPetMode(result.pets.length > 0 ? 'existing' : 'new');
        form.setFieldsValue({
          phone,
          // A known customer's name and email are shown, locked (file 1)
          fullName: result.customer?.fullName || '',
          email: result.customer?.email || '',
          // One pet is picked for the receptionist; with several they must choose
          petId: result.pets.length === 1 ? result.pets[0]._id : undefined,
        });
      } catch (err: unknown) {
        if (isAbort(err) || requestId !== lookupRequestIdRef.current) return;
        setLookup(null);
        setLookupError(
          extractApiError(err, 'Không thể tra cứu khách hàng').message
        );
      } finally {
        if (requestId === lookupRequestIdRef.current) {
          setLookupLoading(false);
        }
      }
    },
    [form, resetPetReception]
  );

  useEffect(() => {
    loadReferenceData();
    if (initialPhone) {
      form.setFieldsValue({ phone: initialPhone });
      runLookup(initialPhone);
    }
    return () => {
      refAbortRef.current?.abort();
      lookupAbortRef.current?.abort();
      cageRefreshRef.current?.abort();
    };
  }, [initialPhone, form, loadReferenceData, runLookup]);

  // File 1: look the customer up as soon as a full 10-digit number is typed
  useEffect(() => {
    const phone = normalizeWalkInPhone(phoneValue);
    if (
      WALK_IN_PHONE_REGEX.test(phone) &&
      phone !== autoLookupRef.current &&
      phone !== lookup?.phone
    ) {
      runLookup(phone);
    }
  }, [phoneValue, lookup, runLookup]);

  // The rest of the form belongs to the phone that was looked up; editing the
  // phone afterwards hides it until the new one is looked up
  const activeLookup =
    lookup && normalizeWalkInPhone(phoneValue) === lookup.phone ? lookup : null;
  const customer = activeLookup?.result.customer || null;
  const pets = activeLookup?.result.pets || [];
  const isNewCustomer = Boolean(activeLookup && !activeLookup.result.found);
  const usingExistingPet = pets.length > 0 && petMode === 'existing';

  // BR-11: offer only available holding cages that match weight and isolation.
  const petWeight = usingExistingPet
    ? pets.find(p => p._id === petIdValue)?.weight
    : newPetWeight;
  const suitableCages = useMemo(
    () => getReceptionCageChoices(cages, petWeight, requiresIsolation),
    [cages, petWeight, requiresIsolation]
  );
  const hiddenCages = cages.length - suitableCages.length;

  useEffect(() => {
    if (cageIdValue && !suitableCages.some(c => c._id === cageIdValue)) {
      form.setFieldValue('cageId', undefined);
    }
  }, [cageIdValue, suitableCages, form]);

  const serviceById = useMemo(
    () => new Map(services.map(s => [s._id, s])),
    [services]
  );

  const canSubmit =
    Boolean(activeLookup) &&
    !lookupLoading &&
    !refLoading &&
    services.length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!activeLookup || submitPendingRef.current) return;

    let values: WalkInFormFields;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (submitPendingRef.current) return;

    let payload: ReturnType<typeof buildWalkInPayload>;
    if (
      values.cageId &&
      !getReceptionCageChoices(
        cages,
        petWeight,
        values.requiresIsolation === true
      ).some(cage => cage._id === values.cageId)
    ) {
      form.setFields([
        {
          name: 'cageId',
          value: undefined,
          errors: ['Chuồng không còn phù hợp. Vui lòng chọn lại.'],
        },
      ]);
      return;
    }
    try {
      payload = buildWalkInPayload({
        phone: activeLookup.phone,
        isNewCustomer,
        fullName: values.fullName,
        email: values.email,
        petMode: usingExistingPet ? 'existing' : 'new',
        petId: values.petId,
        petInfo: {
          ...values.petInfo,
          dob: values.petInfo?.dob
            ? values.petInfo.dob.format('YYYY-MM-DD')
            : undefined,
        },
        services: values.services,
        cageId: values.cageId,
        requiresIsolation: values.requiresIsolation,
        note: values.note,
        intake:
          isReceptionIntakeEnabled && values.includeIntake
            ? (values.intake ?? { symptoms: '', initialCondition: '' })
            : undefined,
      });
    } catch (err) {
      setSubmitError({
        message:
          err instanceof Error ? err.message : 'Dữ liệu tiếp nhận không hợp lệ',
        details: [],
      });
      return;
    }

    submitPendingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await WalkInService.createWalkInBooking(payload);
      const savedIntake = readReceptionIntake(res.data.appointment.intake);
      const description = describeCreated(res.data);
      const intakeUnconfirmed =
        payload.intake &&
        (savedIntake?.symptoms !== payload.intake.symptoms ||
          savedIntake?.initialCondition !== payload.intake.initialCondition);
      const cageUnconfirmed =
        payload.cageId &&
        !matchesActiveCageAssignment(
          res.data.cageAssignment,
          res.data.appointment._id,
          payload.cageId
        );
      if (intakeUnconfirmed || cageUnconfirmed) {
        const unconfirmed = [
          intakeUnconfirmed && 'lưu phiếu tiếp nhận',
          cageUnconfirmed && 'phân chuồng',
        ]
          .filter(Boolean)
          .join(' và ');
        toast.warning(`Đã tạo lịch hẹn nhưng chưa xác nhận ${unconfirmed}.`, {
          description,
        });
      } else {
        toast.success(
          res.message || 'Đăng ký khám vãng lai tại quầy thành công',
          { description }
        );
      }
      onCreated(
        cageUnconfirmed ? { ...res.data, cageAssignment: null } : res.data
      );
    } catch (err: unknown) {
      const { message, statusCode, fieldErrors } = extractApiError(
        err,
        'Tiếp nhận khách vãng lai thất bại'
      );
      const details: string[] = [];
      const fields: { name: (string | number)[]; errors: string[] }[] = [];
      for (const [key, fieldMessage] of Object.entries(fieldErrors || {})) {
        const path = toWalkInFieldPath(key);
        if (path && (path[0] !== 'intake' || payload.intake)) {
          fields.push({ name: path, errors: [fieldMessage] });
        } else details.push(fieldMessage);
      }
      // Paths come from BE error keys, so they are not typed against the form
      if (fields.length > 0) (form as FormInstance).setFields(fields);
      setSubmitError({ message, details });
      // Reconcile with the server after a failed submission (rollback is best effort).
      onSubmitFailed();
      const cageError = isReceptionCageError(statusCode, message, fieldErrors);
      if (payload.cageId && (cageError || statusCode === 409)) {
        const freshCages = await refreshWalkInCages();
        if (
          cageError ||
          (freshCages &&
            !getReceptionCageChoices(
              freshCages,
              petWeight,
              requiresIsolation
            ).some(c => c._id === payload.cageId))
        ) {
          form.setFields([
            {
              name: 'cageId',
              value: undefined,
              errors: [
                fieldErrors?.cageId ||
                  (cageError
                    ? message
                    : 'Chuồng vừa chọn không còn trống hoặc không còn phù hợp.'),
              ],
            },
          ]);
        }
      }
    } finally {
      submitPendingRef.current = false;
      setSubmitting(false);
    }
  };

  const renderCustomer = () => {
    if (!activeLookup) return null;
    const status = customer ? getWalkInCustomerStatus(customer.status) : null;

    return (
      <>
        {customer && status ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 12 }}
            message={
              <Space wrap size={6}>
                <span>Đã tìm thấy hồ sơ khách hàng ({customer.code})</span>
                <Tag color={status.color} style={{ margin: 0 }}>
                  {status.label}
                </Tag>
              </Space>
            }
            description={
              customer.status === 'Inactive'
                ? 'Tài khoản chưa kích hoạt (khách vãng lai). Khách tự đăng ký online bằng số điện thoại này để kích hoạt (BR-04).'
                : undefined
            }
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Khách hàng mới — Hệ thống sẽ tự động tạo tài khoản khách vãng lai (Inactive)"
          />
        )}
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              name="fullName"
              label="Họ tên khách hàng"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: 'Vui lòng nhập họ tên khách hàng',
                },
                {
                  max: WALK_IN_FULLNAME_MAX,
                  message: `Họ tên tối đa ${WALK_IN_FULLNAME_MAX} ký tự`,
                },
              ]}
            >
              <Input
                placeholder="Ví dụ: Trần Thị B"
                disabled={Boolean(customer)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email (không bắt buộc)"
              rules={[
                {
                  pattern: WALK_IN_EMAIL_REGEX,
                  message: 'Địa chỉ email không hợp lệ',
                },
              ]}
            >
              <Input
                placeholder={customer ? 'Chưa có email' : 'khach@example.com'}
                inputMode="email"
                disabled={Boolean(customer)}
              />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  };

  const renderNewPetFields = () => (
    <Row gutter={12}>
      <Col xs={24} md={12}>
        <Form.Item
          name={['petInfo', 'name']}
          label="Tên thú cưng"
          rules={[
            {
              required: true,
              whitespace: true,
              message: 'Vui lòng nhập tên thú cưng',
            },
            {
              max: PET_NAME_MAX_LENGTH,
              message: `Tên thú cưng tối đa ${PET_NAME_MAX_LENGTH} ký tự`,
            },
          ]}
        >
          <Input placeholder="Ví dụ: Milo" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          name={['petInfo', 'species']}
          label="Loài"
          rules={[
            {
              max: WALK_IN_PET_TEXT_MAX,
              message: `Loài tối đa ${WALK_IN_PET_TEXT_MAX} ký tự`,
            },
          ]}
        >
          <AutoComplete
            options={SPECIES_SUGGESTIONS}
            placeholder="Chó, Mèo hoặc nhập loài khác"
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          name={['petInfo', 'breed']}
          label="Giống"
          rules={[
            {
              max: WALK_IN_PET_TEXT_MAX,
              message: `Giống tối đa ${WALK_IN_PET_TEXT_MAX} ký tự`,
            },
          ]}
        >
          <Input placeholder="Ví dụ: Poodle" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          name={['petInfo', 'weight']}
          label="Cân nặng (kg)"
          // No min/max on the input: antd would silently clamp the value
          rules={[
            {
              validator: (_, value) =>
                isValidPetWeight(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error(MSG_PET_WEIGHT)),
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Ví dụ: 4.5"
            step={0.1}
            precision={1}
            addonAfter="kg"
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          name={['petInfo', 'coatColor']}
          label="Màu lông"
          rules={[
            {
              max: WALK_IN_PET_TEXT_MAX,
              message: `Màu lông tối đa ${WALK_IN_PET_TEXT_MAX} ký tự`,
            },
          ]}
        >
          <Input placeholder="Ví dụ: Nâu đỏ" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name={['petInfo', 'dob']} label="Ngày sinh">
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày sinh"
            disabledDate={current =>
              Boolean(current && current > dayjs().endOf('day'))
            }
          />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item
          name={['petInfo', 'notes']}
          label="Ghi chú về thú cưng"
          rules={[
            {
              max: PET_NOTES_MAX_LENGTH,
              message: `Ghi chú tối đa ${PET_NOTES_MAX_LENGTH} ký tự`,
            },
          ]}
        >
          <Input.TextArea
            rows={2}
            maxLength={PET_NOTES_MAX_LENGTH}
            showCount
            placeholder="Dị ứng, tính cách, tiền sử bệnh..."
          />
        </Form.Item>
      </Col>
    </Row>
  );

  const renderPet = () => (
    <>
      <div className="section-subtitle">Thú cưng</div>
      {usingExistingPet ? (
        <>
          <Form.Item
            name="petId"
            rules={[{ required: true, message: 'Vui lòng chọn thú cưng' }]}
          >
            <Radio.Group onChange={resetPetReception} style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {pets.map(pet => (
                  <Radio key={pet._id} value={pet._id}>
                    <Text strong>{pet.name}</Text>{' '}
                    <Text type="secondary">
                      {pet.code ? `${pet.code} · ` : ''}
                      {describeWalkInPet(pet)}
                    </Text>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              resetPetReception();
              setPetMode('new');
            }}
            style={{ marginBottom: 12 }}
          >
            Thêm thú cưng mới
          </Button>
        </>
      ) : (
        <>
          {pets.length > 0 && (
            <Button
              type="link"
              onClick={() => {
                resetPetReception();
                setPetMode('existing');
              }}
              style={{ padding: 0, marginBottom: 8 }}
            >
              ← Chọn thú cưng đã có ({pets.length})
            </Button>
          )}
          {renderNewPetFields()}
        </>
      )}
    </>
  );

  const renderServices = () => (
    <>
      {servicesError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={servicesError}
          action={
            <Button size="small" onClick={loadReferenceData}>
              Thử lại
            </Button>
          }
        />
      )}
      {staffError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Không tải được danh sách bác sĩ, groomer. Vẫn có thể tiếp nhận và phân công sau trong chi tiết lịch hẹn."
        />
      )}
      <Form.List name="services">
        {(fields, { add, remove }) => (
          <>
            {fields.map(field => {
              const rowService = serviceById.get(
                serviceRows?.[field.name]?.serviceId || ''
              );
              const role = getRequiredStaffRole(rowService?.category);
              const { staff: staffOptions, onDutyOnly } = rowService
                ? pickAssignableStaff(onDutyStaff, staff, role)
                : { staff: [], onDutyOnly: true };
              const noStaff =
                Boolean(rowService) &&
                !refLoading &&
                !staffError &&
                staffOptions.length === 0;

              return (
                <ServiceRowCard key={field.key}>
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={[field.name, 'serviceId']}
                        label={`Dịch vụ ${field.name + 1}`}
                        rules={[
                          {
                            required: true,
                            message: 'Vui lòng chọn dịch vụ',
                          },
                          ({ getFieldValue }) => ({
                            validator: () =>
                              findDuplicateServiceRows(
                                getFieldValue('services')
                              ).includes(field.name)
                                ? Promise.reject(
                                    new Error(
                                      'Dịch vụ này đã được chọn ở dòng trên'
                                    )
                                  )
                                : Promise.resolve(),
                          }),
                        ]}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="Chọn dịch vụ"
                          loading={refLoading}
                          notFoundContent={
                            refLoading
                              ? 'Đang tải...'
                              : 'Không có dịch vụ đang hoạt động'
                          }
                          options={services.map(s => ({
                            value: s._id,
                            label: `${s.name} (${
                              serviceCategoryLabels[s.category] || s.category
                            })`,
                          }))}
                          // The staff rule depends on the category, so a new
                          // service always starts unassigned
                          onChange={() =>
                            form.setFieldValue(
                              ['services', field.name, 'assignedStaffId'],
                              undefined
                            )
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={[field.name, 'assignedStaffId']}
                        label={
                          rowService
                            ? role === 'Groomer'
                              ? 'Groomer phụ trách'
                              : 'Bác sĩ phụ trách'
                            : 'Người phụ trách'
                        }
                        extra={
                          noStaff ? (
                            <Text type="warning">
                              {MSG23} Có thể phân công sau.
                            </Text>
                          ) : rowService && !onDutyOnly && !refLoading ? (
                            'Hôm nay chưa ai trong vai trò này có lịch làm việc, đang hiện mọi nhân sự.'
                          ) : undefined
                        }
                      >
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          disabled={!rowService || noStaff}
                          placeholder={
                            rowService ? 'Phân công sau' : 'Chọn dịch vụ trước'
                          }
                          options={staffOptions.map(s => ({
                            value: s._id,
                            label: formatStaffOption(s),
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <div className="row-footer">
                    <Form.Item
                      name={[field.name, 'isEmergency']}
                      valuePropName="checked"
                      noStyle
                    >
                      <Checkbox>Ca cấp cứu</Checkbox>
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      >
                        Bỏ dịch vụ này
                      </Button>
                    )}
                  </div>
                </ServiceRowCard>
              );
            })}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => add({ isEmergency: false })}
              style={{ marginBottom: 12 }}
            >
              Thêm dịch vụ
            </Button>
          </>
        )}
      </Form.List>

      <Form.Item
        name="note"
        label="Ghi chú triệu chứng / Yêu cầu của khách"
        rules={[
          {
            max: WALK_IN_NOTE_MAX,
            message: `Ghi chú tối đa ${WALK_IN_NOTE_MAX} ký tự`,
          },
        ]}
      >
        <Input.TextArea
          rows={2}
          maxLength={WALK_IN_NOTE_MAX}
          showCount
          placeholder="Triệu chứng ban đầu, dặn dò đặc biệt khi tiếp nhận..."
        />
      </Form.Item>

      {isReceptionIntakeEnabled && (
        <>
          <Form.Item
            name="includeIntake"
            valuePropName="checked"
            preserve={false}
          >
            <Checkbox>Ghi phiếu tiếp nhận (không bắt buộc)</Checkbox>
          </Form.Item>
          {includeIntake && (
            <>
              <Form.Item
                name={['intake', 'symptoms']}
                label="Triệu chứng"
                preserve={false}
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
              <Form.Item
                name={['intake', 'initialCondition']}
                label="Tình trạng ban đầu"
                preserve={false}
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
        </>
      )}

      <Form.Item name="requiresIsolation" valuePropName="checked">
        <Checkbox
          onChange={() => {
            if (form.getFieldValue('cageId'))
              form.setFieldValue('cageId', undefined);
          }}
        >
          Yêu cầu chuồng cách ly
        </Checkbox>
      </Form.Item>

      <Form.Item
        name="cageId"
        label="Chuồng lưu giữ (không bắt buộc)"
        extra={
          cagesError ? (
            <Space wrap>
              Không tải được danh sách chuồng.
              <Button type="link" size="small" onClick={refreshWalkInCages}>
                Tải lại chuồng trống
              </Button>
            </Space>
          ) : !refLoading && cages.length === 0 ? (
            MSG24
          ) : hiddenCages > 0 ? (
            `Đã ẩn ${hiddenCages} chuồng không phù hợp về trạng thái, khu vực, cân nặng hoặc cách ly. ${requiresIsolation ? 'Nếu không chọn chuồng, yêu cầu cách ly không được lưu.' : 'Có thể tiếp nhận mà không phân chuồng.'}`
          ) : requiresIsolation ? (
            'Chỉ hiện chuồng cách ly. Nếu không chọn chuồng, yêu cầu cách ly không được lưu.'
          ) : (
            'Để trống nếu khách tự bế bé chờ ở sảnh.'
          )
        }
      >
        <Select
          allowClear
          placeholder="Không xếp chuồng"
          loading={refLoading || cagesRefreshing}
          disabled={cagesRefreshing || suitableCages.length === 0}
          options={suitableCages.map(c => ({
            value: c._id,
            label: receptionCageLabel(c),
          }))}
        />
      </Form.Item>
    </>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ services: [{ isEmergency: false }] }}
      style={{ marginTop: 16 }}
      disabled={submitting}
    >
      <SectionBlock>
        <div className="section-title">
          <span className="section-step">1</span>
          Khách hàng và thú cưng
        </div>
        <Form.Item
          name="phone"
          label="Số điện thoại khách hàng"
          extra="Đủ 10 chữ số là hệ thống tự tra cứu."
          rules={[
            {
              validator: (_, value) => {
                const error = validateWalkInPhone(value);
                return error
                  ? Promise.reject(new Error(error))
                  : Promise.resolve();
              },
            },
          ]}
          validateTrigger="onBlur"
        >
          <Input.Search
            placeholder="Ví dụ: 0988111222"
            enterButton="Tra cứu"
            inputMode="tel"
            maxLength={14}
            loading={lookupLoading}
            onSearch={value => runLookup(value)}
          />
        </Form.Item>
        {lookupError && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message={lookupError}
          />
        )}
        {lookup && !activeLookup && !lookupLoading && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Số điện thoại đã thay đổi. Bấm Tra cứu để kiểm tra lại."
          />
        )}
        {renderCustomer()}
        {activeLookup && renderPet()}
      </SectionBlock>

      {activeLookup && (
        <SectionBlock>
          <div className="section-title">
            <span className="section-step">2</span>
            Dịch vụ, nhân sự và chuồng
          </div>
          {renderServices()}
        </SectionBlock>
      )}

      {submitError && (
        <Alert
          type="error"
          showIcon
          message={submitError.message}
          description={
            submitError.details.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {/* Two rows can fail with the same message, so the text alone is not a key */}
                {submitError.details.map((detail, index) => (
                  <li key={`${index}-${detail}`}>{detail}</li>
                ))}
              </ul>
            ) : undefined
          }
        />
      )}

      <ModalFooterBar>
        <Button onClick={onClose} disabled={submitting}>
          Hủy
        </Button>
        <Button
          type="primary"
          loading={submitting}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Hoàn tất Tiếp nhận & Check-in
        </Button>
      </ModalFooterBar>
    </Form>
  );
};

interface WalkInModalProps {
  open: boolean;
  /** Điền sẵn và tra cứu ngay số điện thoại này khi mở (từ tab tra cứu khách hàng) */
  initialPhone?: string;
  onClose: () => void;
  /** Đơn đã tạo (201): trang đóng modal và tải lại lịch hẹn, chuồng */
  onCreated: (result: CreateWalkInBookingResult) => void;
  /** Gửi lỗi: trang tải lại danh sách để đồng bộ trạng thái từ BE */
  onSubmitFailed: () => void;
}

const WalkInModal = ({
  open,
  initialPhone,
  onClose,
  onCreated,
  onSubmitFailed,
}: WalkInModalProps) => (
  <Modal
    title={
      <Space>
        <UserAddOutlined style={{ color: '#1677ff', fontSize: 20 }} />
        <span>Tiếp nhận khách vãng lai</span>
      </Space>
    }
    open={open}
    onCancel={onClose}
    footer={null}
    maskClosable={false}
    // The form is unmounted after closing, so each opening starts empty
    destroyOnHidden
    width={760}
  >
    <WalkInForm
      initialPhone={initialPhone}
      onClose={onClose}
      onCreated={onCreated}
      onSubmitFailed={onSubmitFailed}
    />
  </Modal>
);

export default WalkInModal;
