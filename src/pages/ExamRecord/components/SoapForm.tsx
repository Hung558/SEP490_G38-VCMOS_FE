import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  type FormInstance,
} from 'antd';
import {
  BuildOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';
import type {
  AppointmentServiceStatus,
  CompleteConsultationResponse,
  MedicalRecord,
} from '@/types';
import type { Product } from '@/services/ProductService';
import CageService, {
  CAGE_MAX_WEIGHT_BY_SIZE,
  type Cage,
} from '@/services/CageService';
import { getAssignmentCageLabel } from '@/services/CageAssignmentService';
import MedicalRecordService, {
  DURATION_DAYS_MAX,
  DURATION_DAYS_MIN,
  MSG_SOAP_REQUIRED,
  PRESCRIPTION_TEXT_MAX,
  SOAP_FIELDS,
  SOAP_TEXT_MAX,
  buildCompleteMedicalRecordPayload,
  buildMedicalRecordPayload,
  findMissingSoapFields,
  recordToFormValues,
  toMedicalRecordFieldPath,
  type MedicalRecordFormValues,
} from '@/services/MedicalRecordService';
import { extractApiError } from '@/services/AppointmentServiceService';
import { MSG_PET_WEIGHT, isValidPetWeight } from '@/constants/pet';
import {
  ModalFooterBar,
  SectionBlock,
  ServiceRowCard,
} from '../../AppointmentReception/components/styles';

const { Text } = Typography;

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  Medicine: 'Thuốc',
  Vaccine: 'Vaccine',
};

interface SoapFormProps {
  appointmentServiceId: string;
  record: MedicalRecord | null;
  petWeight?: number | null;
  /** Thuốc và vaccine đang Active (BR-16) */
  products: Product[];
  productsError: boolean;
  serviceStatus: AppointmentServiceStatus;
  onSaved: (record: MedicalRecord) => void;
  onCompleted: (result: CompleteConsultationResponse) => void;
  /** Kiểm tra lại trạng thái mà không đặt lại form đang nhập. */
  onConflict: () => Promise<void>;
}

/** Form bệnh án SOAP và đơn thuốc; mount khi đã có dữ liệu nên mỗi lần mở là giá trị mới */
const SoapForm = ({
  appointmentServiceId,
  record,
  petWeight,
  products,
  productsError,
  serviceStatus,
  onSaved,
  onCompleted,
  onConflict,
}: SoapFormProps) => {
  const [form] = Form.useForm<MedicalRecordFormValues>();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const writing = useRef(false);
  const [serverError, setServerError] = useState<{
    message: string;
    details: string[];
  } | null>(null);

  // Chuồng chờ đón sau khám (BR-10, BR-11, UC-27)
  const [availableCages, setAvailableCages] = useState<Cage[]>([]);
  const [loadingCages, setLoadingCages] = useState(false);
  const [cagesError, setCagesError] = useState(false);
  const [cageLoadAttempt, setCageLoadAttempt] = useState(0);
  const [selectedWaitingCageId, setSelectedWaitingCageId] = useState<
    string | undefined
  >(undefined);

  // Watch cân nặng nhập từ form để kiểm tra tải trọng chuồng trực tiếp (BR-11)
  const currentWeightInput = Form.useWatch('weight', form);
  const effectiveWeight =
    typeof currentWeightInput === 'number' &&
    Number.isFinite(currentWeightInput) &&
    currentWeightInput > 0
      ? currentWeightInput
      : typeof petWeight === 'number' &&
          Number.isFinite(petWeight) &&
          petWeight > 0
        ? petWeight
        : undefined;

  useEffect(() => {
    if (!confirmOpen) return;
    const ctrl = new AbortController();
    setAvailableCages([]);
    setCagesError(false);
    setLoadingCages(true);
    CageService.listCages(
      { status: 'Available', limit: 100 },
      { signal: ctrl.signal }
    )
      .then(res => {
        if (ctrl.signal.aborted) return;
        setAvailableCages(
          (res.data?.items || []).filter(c => c.status === 'Available')
        );
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setCagesError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoadingCages(false);
      });
    return () => ctrl.abort();
  }, [confirmOpen, cageLoadAttempt]);

  const canComplete = serviceStatus === 'InProgress';
  const editable = canComplete || serviceStatus === 'Done';
  const busy = saving || completing;

  // Ask before leaving the tab with unsaved notes
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Active medicines and vaccines, plus the ones already prescribed that are no
  // longer sold, so a saved line never shows a bare id
  const productOptions = useMemo(() => {
    const options = products.map(p => ({
      value: p._id,
      label: `${p.name} (${p.unit}) · ${PRODUCT_CATEGORY_LABELS[p.category] || p.category}`,
      disabled: false,
    }));
    const known = new Set(products.map(p => p._id));
    for (const p of record?.prescriptions || []) {
      const id = String(p.productId);
      if (!known.has(id)) {
        known.add(id);
        options.push({
          value: id,
          label: `${p.productNameSnapshot || 'Thuốc'} (đã ngừng kinh doanh)`,
          disabled: true,
        });
      }
    }
    return options;
  }, [products, record]);

  const applyServerError = async (err: unknown, fallback: string) => {
    const { message, statusCode, fieldErrors } = extractApiError(err, fallback);
    const details: string[] = [];
    const fields: { name: (string | number)[]; errors: string[] }[] = [];
    for (const [key, fieldMessage] of Object.entries(fieldErrors || {})) {
      const path = toMedicalRecordFieldPath(key);
      if (path) fields.push({ name: path, errors: [fieldMessage] });
      else details.push(fieldMessage);
    }
    // Paths come from BE error keys, so they are not typed against the form
    if (fields.length > 0) (form as FormInstance).setFields(fields);
    setServerError({ message, details });
    toast.error(message);
    if (statusCode === 409 || statusCode === 404 || statusCode === 403) {
      try {
        await onConflict();
      } catch {
        // A failed status check must not hide the original error or reset input.
      }
    }
  };

  const handleSave = async () => {
    if (!editable || writing.current) return;
    writing.current = true;
    let values: MedicalRecordFormValues;
    try {
      values = await form.validateFields();
    } catch {
      writing.current = false;
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      const saved = await MedicalRecordService.saveDraft(
        appointmentServiceId,
        buildMedicalRecordPayload(values)
      );
      setDirty(false);
      toast.success('Đã lưu nháp bệnh án');
      onSaved(saved);
    } catch (err: unknown) {
      await applyServerError(err, 'Không thể lưu nháp bệnh án');
    } finally {
      writing.current = false;
      setSaving(false);
    }
  };

  const askComplete = async () => {
    if (!canComplete || writing.current) return;
    let values: MedicalRecordFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const missing = findMissingSoapFields(values);
    if (missing.length > 0) {
      form.setFields(
        missing.map(key => ({
          name: key,
          errors: ['Bắt buộc nhập khi hoàn tất ca khám (BR-13)'],
        }))
      );
      toast.error(MSG_SOAP_REQUIRED);
      return;
    }
    if (writing.current) return;
    setSelectedWaitingCageId(undefined);
    setAvailableCages([]);
    setCagesError(false);
    setLoadingCages(true);
    setConfirmOpen(true);
  };

  const handleComplete = async () => {
    if (!canComplete || !confirmOpen || writing.current) return;
    writing.current = true;
    setCompleting(true);
    setServerError(null);
    try {
      const payload = buildCompleteMedicalRecordPayload(
        form.getFieldsValue(true),
        selectedWaitingCageId
      );
      const result = await MedicalRecordService.completeConsultation(
        appointmentServiceId,
        payload
      );
      setDirty(false);
      setConfirmOpen(false);
      const cageLabel = result.waitingCageAssignment
        ? getAssignmentCageLabel(
            typeof result.waitingCageAssignment.cageId === 'object'
              ? result.waitingCageAssignment.cageId
              : null
          )
        : '';
      toast.success(
        cageLabel
          ? `Đã hoàn tất ca khám và xếp bé vào chuồng ${cageLabel}.`
          : 'Đã hoàn tất ca khám'
      );
      onCompleted(result);
    } catch (err: unknown) {
      setConfirmOpen(false);
      await applyServerError(err, 'Không thể hoàn tất ca khám');
    } finally {
      writing.current = false;
      setCompleting(false);
    }
  };

  return (
    <>
      {serviceStatus === 'Done' && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="Ca khám đã hoàn tất."
          description="Bệnh án vẫn sửa và lưu được cho tới khi lễ tân thu tiền (BR-14)."
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={recordToFormValues(record, petWeight)}
        disabled={!editable || busy}
        onValuesChange={() => setDirty(true)}
      >
        <SectionBlock>
          <div className="section-title">
            <span className="section-step">1</span>
            Bệnh án SOAP
          </div>
          <Row gutter={12}>
            {SOAP_FIELDS.map(field => (
              <Col xs={24} lg={12} key={field.key}>
                <Form.Item
                  name={field.key}
                  label={`${field.letter} · ${field.label}`}
                  rules={[
                    {
                      max: SOAP_TEXT_MAX,
                      message: `Tối đa ${SOAP_TEXT_MAX} ký tự`,
                    },
                  ]}
                >
                  <Input.TextArea
                    rows={4}
                    maxLength={SOAP_TEXT_MAX}
                    showCount
                    placeholder={field.placeholder}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <Row gutter={12}>
            <Col xs={24} lg={16}>
              <Form.Item
                name="notes"
                label="Ghi chú thêm"
                rules={[
                  {
                    max: SOAP_TEXT_MAX,
                    message: `Tối đa ${SOAP_TEXT_MAX} ký tự`,
                  },
                ]}
              >
                <Input.TextArea
                  rows={2}
                  maxLength={SOAP_TEXT_MAX}
                  showCount
                  placeholder="Dặn dò theo dõi tại nhà, lịch tái khám..."
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={8}>
              <Form.Item
                name="weight"
                label="Cân nặng đo tại phòng khám"
                extra="Lưu bệnh án sẽ cập nhật cân nặng trong hồ sơ thú cưng."
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
                  step={0.1}
                  precision={1}
                  addonAfter="kg"
                  placeholder="Ví dụ: 8.8"
                />
              </Form.Item>
            </Col>
          </Row>
        </SectionBlock>

        <SectionBlock>
          <div className="section-title">
            <span className="section-step">2</span>
            Đơn thuốc
          </div>
          {productsError && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="Không tải được danh mục thuốc, chưa thể kê thêm thuốc mới."
            />
          )}
          <Form.List name="prescriptions">
            {(fields, { add, remove }) => (
              <>
                {fields.length === 0 && (
                  <Text
                    type="secondary"
                    style={{ display: 'block', marginBottom: 12 }}
                  >
                    Chưa kê thuốc nào.
                  </Text>
                )}
                {fields.map(field => (
                  <ServiceRowCard key={field.key}>
                    <Row gutter={12}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name={[field.name, 'productId']}
                          label={`Thuốc ${field.name + 1}`}
                          rules={[
                            { required: true, message: 'Vui lòng chọn thuốc' },
                          ]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="Chọn thuốc hoặc vaccine"
                            options={productOptions}
                            notFoundContent="Không có thuốc đang kinh doanh"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item
                          name={[field.name, 'dosage']}
                          label="Liều mỗi lần"
                          rules={[
                            {
                              required: true,
                              whitespace: true,
                              message: 'Nhập liều lượng',
                            },
                            {
                              max: PRESCRIPTION_TEXT_MAX,
                              message: `Tối đa ${PRESCRIPTION_TEXT_MAX} ký tự`,
                            },
                          ]}
                        >
                          <Input placeholder="1 viên" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item
                          name={[field.name, 'durationDays']}
                          label="Số ngày dùng"
                          rules={[
                            {
                              validator: (_, value) =>
                                Number.isInteger(value) &&
                                value >= DURATION_DAYS_MIN &&
                                value <= DURATION_DAYS_MAX
                                  ? Promise.resolve()
                                  : Promise.reject(
                                      new Error(
                                        `Số nguyên từ ${DURATION_DAYS_MIN} đến ${DURATION_DAYS_MAX}`
                                      )
                                    ),
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            precision={0}
                            placeholder="5"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name={[field.name, 'frequency']}
                          label="Tần suất"
                          rules={[
                            {
                              required: true,
                              whitespace: true,
                              message: 'Nhập tần suất dùng',
                            },
                            {
                              max: PRESCRIPTION_TEXT_MAX,
                              message: `Tối đa ${PRESCRIPTION_TEXT_MAX} ký tự`,
                            },
                          ]}
                        >
                          <Input placeholder="2 lần/ngày sau ăn" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name={[field.name, 'instructions']}
                          label="Hướng dẫn (không bắt buộc)"
                          rules={[
                            {
                              max: PRESCRIPTION_TEXT_MAX,
                              message: `Tối đa ${PRESCRIPTION_TEXT_MAX} ký tự`,
                            },
                          ]}
                        >
                          <Input placeholder="Nghiền nhỏ trộn thức ăn mềm" />
                        </Form.Item>
                      </Col>
                    </Row>
                    {editable && (
                      <div
                        className="row-footer"
                        style={{ justifyContent: 'flex-end' }}
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            remove(field.name);
                            setDirty(true);
                          }}
                        >
                          Bỏ thuốc này
                        </Button>
                      </div>
                    )}
                  </ServiceRowCard>
                ))}
                {editable && (
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    disabled={productsError && productOptions.length === 0}
                    onClick={() => {
                      add({ durationDays: 1 });
                      setDirty(true);
                    }}
                    style={{ marginBottom: 12 }}
                  >
                    Thêm thuốc
                  </Button>
                )}
              </>
            )}
          </Form.List>
        </SectionBlock>
      </Form>

      {serverError && (
        <Alert
          type="error"
          showIcon
          message={serverError.message}
          description={
            serverError.details.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {serverError.details.map((detail, index) => (
                  <li key={`${index}-${detail}`}>{detail}</li>
                ))}
              </ul>
            ) : undefined
          }
        />
      )}

      {editable && (
        <ModalFooterBar>
          {dirty && (
            <Text type="warning" style={{ alignSelf: 'center' }}>
              Có thay đổi chưa lưu
            </Text>
          )}
          <Button
            icon={<SaveOutlined />}
            loading={saving}
            disabled={busy}
            onClick={handleSave}
          >
            Lưu nháp
          </Button>
          {canComplete && (
            <Button type="primary" disabled={busy} onClick={askComplete}>
              Hoàn tất ca khám
            </Button>
          )}
        </ModalFooterBar>
      )}

      <Modal
        title={
          <Space>
            <BuildOutlined style={{ color: '#0d9488' }} />
            <span>Hoàn tất ca khám?</span>
          </Space>
        }
        open={confirmOpen && canComplete}
        onCancel={() => !completing && setConfirmOpen(false)}
        onOk={handleComplete}
        okText="Hoàn tất"
        cancelText="Quay lại"
        confirmLoading={completing}
        destroyOnHidden
        width={540}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>Bệnh án và đơn thuốc sẽ được lưu cùng lúc với bước này.</Text>
          <Text>
            Dịch vụ chuyển sang Hoàn tất. Khi mọi dịch vụ của lịch hẹn đã xong,
            lịch hẹn chuyển sang Chờ chủ đón để lễ tân thu tiền.
          </Text>

          <div
            style={{
              marginTop: 10,
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 6,
                color: '#0f172a',
                fontSize: 13,
              }}
            >
              Chuồng chờ đón sau khám (không bắt buộc):
            </div>
            <Select
              allowClear
              placeholder={
                loadingCages
                  ? 'Đang tải danh sách chuồng trống...'
                  : 'Chọn chuồng cho thú cưng chờ chủ đón (nếu cần)'
              }
              loading={loadingCages}
              aria-label="Chuồng chờ đón sau khám"
              disabled={completing || loadingCages || cagesError}
              value={selectedWaitingCageId}
              onChange={val => setSelectedWaitingCageId(val)}
              style={{ width: '100%' }}
              options={availableCages.map(c => {
                const maxW =
                  typeof c.maxWeightKg === 'number' && c.maxWeightKg > 0
                    ? c.maxWeightKg
                    : CAGE_MAX_WEIGHT_BY_SIZE[c.size];
                const isOverweight =
                  typeof effectiveWeight === 'number' &&
                  effectiveWeight > 0 &&
                  maxW !== undefined &&
                  effectiveWeight > maxW;

                return {
                  value: c._id,
                  disabled: isOverweight,
                  label: isOverweight
                    ? `${c.label} · Cỡ ${c.size}${c.isIsolated ? ' [Cách ly]' : ''} (⚠️ Quá tải: tối đa ${maxW}kg, bé ${effectiveWeight}kg)`
                    : `${c.label} · Cỡ ${c.size}${c.isIsolated ? ' [Cách ly]' : ''} (Tối đa ${maxW === Infinity ? 'trên 30' : `${maxW}kg`})`,
                };
              })}
              notFoundContent={
                loadingCages
                  ? 'Đang tải danh sách chuồng...'
                  : 'Không có chuồng trống nào'
              }
            />
            {cagesError && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
                message="Không thể tải chuồng trống. Bạn vẫn có thể hoàn tất mà không chọn chuồng."
                action={
                  <Button
                    size="small"
                    disabled={completing}
                    onClick={() => setCageLoadAttempt(n => n + 1)}
                  >
                    Tải lại chuồng
                  </Button>
                }
              />
            )}
            {typeof effectiveWeight === 'number' && effectiveWeight > 0 && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                Cân nặng thú cưng: <strong>{effectiveWeight} kg</strong>. Hệ
                thống tự động giới hạn cỡ chuồng theo quy định tải trọng
                (BR-11).
              </div>
            )}
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default SoapForm;
