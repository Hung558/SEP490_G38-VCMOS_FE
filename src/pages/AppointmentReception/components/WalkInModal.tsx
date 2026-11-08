import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Result,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  type FormInstance,
} from 'antd';
import {
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
  StaffMember,
  WalkInLookupResult,
} from '@/types';
import ServiceService, {
  serviceCategoryLabels,
  type Service,
} from '@/services/ServiceService';
import StaffService, {
  formatStaffOption,
  getAssignableStaff,
  getRequiredStaffRole,
} from '@/services/StaffService';
import CageService from '@/services/CageService';
import { getAssignmentCageLabel } from '@/services/CageAssignmentService';
import WalkInService, {
  WALK_IN_EMAIL_REGEX,
  WALK_IN_FULLNAME_MAX,
  WALK_IN_NOTE_MAX,
  WALK_IN_PET_TEXT_MAX,
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
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
} from '@/services/AppointmentServiceService';
import {
  MSG_PET_WEIGHT,
  PET_NAME_MAX_LENGTH,
  PET_NOTES_MAX_LENGTH,
  isValidPetWeight,
} from '@/constants/pet';
import { ModalFooterBar, SectionBlock, ServiceRowCard } from './styles';

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
  petMode?: 'existing' | 'new';
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
  note?: string;
}

const isAbort = (err: unknown) =>
  axios.isCancel(err) ||
  (err instanceof DOMException && err.name === 'AbortError');

const cageOptionLabel = (cage: Cage) =>
  `${cage.label} - Size ${cage.size}${cage.isIsolated ? ' [Cách ly]' : ''}`;

interface WalkInFormProps {
  initialPhone?: string;
  onClose: () => void;
  onCreated: (result: CreateWalkInBookingResult) => void;
  onNewWalkIn: () => void;
}

/** Mounted only while the modal is open, so every opening starts from an empty form */
const WalkInForm = ({
  initialPhone,
  onClose,
  onCreated,
  onNewWalkIn,
}: WalkInFormProps) => {
  const [form] = Form.useForm<WalkInFormFields>();
  const phoneValue = Form.useWatch('phone', form);
  const petMode = Form.useWatch('petMode', form);
  const serviceRows = Form.useWatch('services', form);

  // Reference data for the selects
  const [services, setServices] = useState<Service[]>([]);
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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    message: string;
    details: string[];
  } | null>(null);
  const [created, setCreated] = useState<CreateWalkInBookingResult | null>(
    null
  );

  // Resolves with the fresh available cages (undefined if aborted or failed)
  const loadReferenceData = useCallback(async (): Promise<
    Cage[] | undefined
  > => {
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
      StaffService.listStaff({ status: 'Active', limit: 100 }, { signal }),
      CageService.listCages({ status: 'Available', limit: 100 }, { signal }),
    ]);
    if (signal.aborted) return;

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
      setStaff(staffRes.value.items || []);
    } else {
      setStaffError(true);
    }
    let freshCages: Cage[] | undefined;
    if (cagesRes.status === 'fulfilled') {
      freshCages = cagesRes.value.data?.items || [];
      setCages(freshCages);
    } else {
      setCagesError(true);
    }
    setRefLoading(false);
    return freshCages;
  }, []);

  const runLookup = useCallback(
    async (rawPhone?: string) => {
      const phoneError = validateWalkInPhone(rawPhone);
      if (phoneError) {
        form.setFields([{ name: 'phone', errors: [phoneError] }]);
        return;
      }
      const phone = normalizeWalkInPhone(rawPhone);
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
        setLookup({ phone, result });
        form.setFieldsValue({
          phone,
          petMode: result.pets.length > 0 ? 'existing' : 'new',
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
    [form]
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
    };
  }, [initialPhone, form, loadReferenceData, runLookup]);

  // The rest of the form belongs to the phone that was looked up; editing the
  // phone afterwards hides it until the receptionist looks the new one up
  const activeLookup =
    lookup && normalizeWalkInPhone(phoneValue) === lookup.phone ? lookup : null;
  const customer = activeLookup?.result.customer || null;
  const pets = activeLookup?.result.pets || [];
  const isNewCustomer = Boolean(activeLookup && !activeLookup.result.found);
  const usingExistingPet = pets.length > 0 && petMode === 'existing';

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
    if (!activeLookup || submitting) return;

    let values: WalkInFormFields;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = buildWalkInPayload({
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
      note: values.note,
    });

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await WalkInService.createWalkInBooking(payload);
      setCreated(res.data);
      toast.success(res.message || 'Đăng ký khám vãng lai tại quầy thành công');
      onCreated(res.data);
    } catch (err: unknown) {
      const { message, statusCode, fieldErrors } = extractApiError(
        err,
        'Tiếp nhận khách vãng lai thất bại'
      );
      const details: string[] = [];
      const fields: { name: (string | number)[]; errors: string[] }[] = [];
      for (const [key, fieldMessage] of Object.entries(fieldErrors || {})) {
        const path = toWalkInFieldPath(key);
        if (path) fields.push({ name: path, errors: [fieldMessage] });
        else details.push(fieldMessage);
      }
      // Paths come from BE error keys, so they are not typed against the form
      if (fields.length > 0) (form as FormInstance).setFields(fields);
      setSubmitError({ message, details });
      // Another receptionist may have just taken the cage (BR-11): reload the
      // free cages and, if it is gone, empty the choice and say why under it
      if (statusCode === 409 && payload.cageId) {
        const freshCages = await loadReferenceData();
        if (freshCages && !freshCages.some(c => c._id === payload.cageId)) {
          form.setFields([
            { name: 'cageId', value: undefined, errors: [message] },
          ]);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderCustomer = () => {
    if (!activeLookup) return null;

    if (customer) {
      const status = getWalkInCustomerStatus(customer.status);
      return (
        <>
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2 }}
            style={{ marginBottom: 12 }}
          >
            <Descriptions.Item label="Họ tên">
              <Text strong>{customer.fullName}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Mã khách hàng">
              {customer.code}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {customer.email || <Text type="secondary">Chưa có</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Tài khoản">
              <Tag color={status.color}>{status.label}</Tag>
            </Descriptions.Item>
          </Descriptions>
          {customer.status === 'Inactive' && (
            <Text
              type="secondary"
              style={{ display: 'block', marginBottom: 12 }}
            >
              Tài khoản chưa kích hoạt (thường là khách vãng lai). Khách có thể
              tự đăng ký online bằng số điện thoại này để kích hoạt.
            </Text>
          )}
        </>
      );
    }

    return (
      <>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Khách hàng mới, chưa có hồ sơ trong hệ thống"
          description="Nhập họ tên để tạo hồ sơ. Tài khoản sẽ ở trạng thái chưa kích hoạt cho tới khi khách tự đăng ký online bằng số điện thoại này."
        />
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
              <Input placeholder="Ví dụ: Trần Thị B" />
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
              <Input placeholder="khach@example.com" inputMode="email" />
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
    <SectionBlock>
      <div className="section-title">
        <span className="section-step">2</span>
        Thú cưng
      </div>
      {pets.length > 0 && (
        <Form.Item name="petMode" style={{ marginBottom: 12 }}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: `Thú cưng đã có (${pets.length})`, value: 'existing' },
              { label: 'Thêm thú cưng mới', value: 'new' },
            ]}
          />
        </Form.Item>
      )}
      {usingExistingPet ? (
        <Form.Item
          name="petId"
          rules={[{ required: true, message: 'Vui lòng chọn thú cưng' }]}
        >
          <Radio.Group style={{ width: '100%' }}>
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
      ) : (
        renderNewPetFields()
      )}
    </SectionBlock>
  );

  const renderServices = () => (
    <SectionBlock>
      <div className="section-title">
        <span className="section-step">3</span>
        Dịch vụ và người phụ trách
      </div>
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
              const staffOptions = rowService
                ? getAssignableStaff(staff, role)
                : [];
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
    </SectionBlock>
  );

  const renderCageAndNote = () => (
    <SectionBlock>
      <div className="section-title">
        <span className="section-step">4</span>
        Chuồng lưu giữ và ghi chú
      </div>
      <Form.Item
        name="cageId"
        label="Chuồng lưu giữ (không bắt buộc)"
        extra={
          cagesError
            ? 'Không tải được danh sách chuồng. Có thể xếp chuồng sau ở tab Phân công chuồng.'
            : !refLoading && cages.length === 0
              ? MSG24
              : 'Có thể để trống và xếp chuồng sau ở tab Phân công chuồng.'
        }
      >
        <Select
          allowClear
          placeholder="Không xếp chuồng"
          loading={refLoading}
          disabled={cages.length === 0}
          options={cages.map(c => ({
            value: c._id,
            label: cageOptionLabel(c),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="note"
        label="Ghi chú"
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
          placeholder="Lý do đến khám, tình trạng ban đầu..."
        />
      </Form.Item>
    </SectionBlock>
  );

  const renderCreated = (result: CreateWalkInBookingResult) => (
    <>
      <Result
        status="success"
        style={{ padding: '16px 0' }}
        title={`Đã tiếp nhận lịch hẹn ${result.appointment.code}`}
        subTitle="Lịch hẹn đã ở trạng thái Đã tiếp nhận. Dịch vụ có người phụ trách đã vào hàng đợi."
      />
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="Khách hàng">
          <Space wrap size={4}>
            <Text strong>{result.customer.fullName}</Text>
            <Text type="secondary">{result.customer.phone}</Text>
            {result.isNewCustomer && <Tag color="gold">Khách mới</Tag>}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Thú cưng">
          <Space wrap size={4}>
            <Text strong>{result.pet.name}</Text>
            {result.isNewPet && <Tag color="gold">Hồ sơ mới</Tag>}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Dịch vụ">
          <Space direction="vertical" size={4}>
            {result.services.map(s => (
              <Space key={s._id} wrap size={4}>
                <Text>{getAppointmentServiceName(s.serviceId)}</Text>
                <Tag color={getAppointmentServiceStatusColor(s.status)}>
                  {getAppointmentServiceStatusLabel(s.status)}
                </Tag>
                {s.assignedStaffId ? (
                  <Text type="secondary">
                    {getAppointmentServiceStaffName(s.assignedStaffId)}
                    {typeof s.queueNo === 'number'
                      ? ` · Số thứ tự ${s.queueNo}`
                      : ''}
                  </Text>
                ) : (
                  <Text type="secondary">Chưa phân công</Text>
                )}
                {s.isEmergency && <Tag color="red">Cấp cứu</Tag>}
              </Space>
            ))}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Chuồng">
          {/* The BE returns the assignment with its cage populated */}
          {result.cageAssignment ? (
            getAssignmentCageLabel(result.cageAssignment.cageId)
          ) : (
            <Text type="secondary">Chưa xếp chuồng</Text>
          )}
        </Descriptions.Item>
      </Descriptions>
      <ModalFooterBar>
        <Button onClick={onNewWalkIn}>Tiếp nhận khách khác</Button>
        <Button type="primary" onClick={onClose}>
          Đóng
        </Button>
      </ModalFooterBar>
    </>
  );

  return (
    <>
      {created && renderCreated(created)}
      {/* Kept mounted (hidden) after success so the form instance stays connected */}
      <Form
        form={form}
        layout="vertical"
        initialValues={{ petMode: 'new', services: [{ isEmergency: false }] }}
        style={created ? { display: 'none' } : { marginTop: 16 }}
        disabled={submitting}
      >
        <SectionBlock>
          <div className="section-title">
            <span className="section-step">1</span>
            Khách hàng
          </div>
          <Form.Item
            name="phone"
            label="Số điện thoại khách hàng"
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
          {!lookup && !lookupError && (
            <Text
              type="secondary"
              style={{ display: 'block', marginBottom: 12 }}
            >
              Tra cứu số điện thoại để biết khách đã có hồ sơ chưa, rồi điền
              tiếp thông tin bên dưới.
            </Text>
          )}
          {renderCustomer()}
        </SectionBlock>

        {activeLookup && (
          <>
            {renderPet()}
            {renderServices()}
            {renderCageAndNote()}
          </>
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
            Tiếp nhận
          </Button>
        </ModalFooterBar>
      </Form>
    </>
  );
};

interface WalkInModalProps {
  open: boolean;
  /** Điền sẵn và tra cứu ngay số điện thoại này khi mở (từ tab tra cứu khách hàng) */
  initialPhone?: string;
  onClose: () => void;
  onCreated: (result: CreateWalkInBookingResult) => void;
}

const WalkInModal = ({
  open,
  initialPhone,
  onClose,
  onCreated,
}: WalkInModalProps) => {
  // Bumped by "Tiếp nhận khách khác" to remount an empty form
  const [session, setSession] = useState(0);

  return (
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
      afterClose={() => setSession(0)}
      width={760}
    >
      <WalkInForm
        key={session}
        initialPhone={session === 0 ? initialPhone : undefined}
        onClose={onClose}
        onCreated={onCreated}
        onNewWalkIn={() => setSession(s => s + 1)}
      />
    </Modal>
  );
};

export default WalkInModal;
