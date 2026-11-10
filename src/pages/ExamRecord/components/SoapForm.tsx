import { useEffect, useMemo, useState } from 'react';
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
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { toast } from 'sonner';
import type {
  AppointmentServiceStatus,
  CompleteConsultationResponse,
  MedicalRecord,
} from '@/types';
import type { Product } from '@/services/ProductService';
import MedicalRecordService, {
  DURATION_DAYS_MAX,
  DURATION_DAYS_MIN,
  MSG_SOAP_REQUIRED,
  PRESCRIPTION_TEXT_MAX,
  SOAP_FIELDS,
  SOAP_TEXT_MAX,
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
  /** Finalized: chỉ xem */
  locked: boolean;
  onSaved: (record: MedicalRecord) => void;
  onCompleted: (result: CompleteConsultationResponse) => void;
  /** 409 hoặc ca khám đổi ở nơi khác: tải lại trạng thái từ BE */
  onStale: () => void;
}

/** Form bệnh án SOAP và đơn thuốc; mount khi đã có dữ liệu nên mỗi lần mở là giá trị mới */
const SoapForm = ({
  appointmentServiceId,
  record,
  petWeight,
  products,
  productsError,
  serviceStatus,
  locked,
  onSaved,
  onCompleted,
  onStale,
}: SoapFormProps) => {
  const [form] = Form.useForm<MedicalRecordFormValues>();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [serverError, setServerError] = useState<{
    message: string;
    details: string[];
  } | null>(null);

  const canComplete = serviceStatus === 'InProgress' && !locked;
  const editable =
    !locked && (serviceStatus === 'InProgress' || serviceStatus === 'Done');
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

  const applyServerError = (err: unknown, fallback: string) => {
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
      onStale();
    }
  };

  const handleSave = async () => {
    if (busy) return;
    let values: MedicalRecordFormValues;
    try {
      values = await form.validateFields();
    } catch {
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
      applyServerError(err, 'Không thể lưu nháp bệnh án');
    } finally {
      setSaving(false);
    }
  };

  const askComplete = async () => {
    if (busy) return;
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
    setConfirmOpen(true);
  };

  const handleComplete = async () => {
    setCompleting(true);
    setServerError(null);
    try {
      const result = await MedicalRecordService.completeConsultation(
        appointmentServiceId,
        buildMedicalRecordPayload(form.getFieldsValue(true))
      );
      setDirty(false);
      setConfirmOpen(false);
      toast.success('Đã hoàn tất ca khám');
      onCompleted(result);
    } catch (err: unknown) {
      setConfirmOpen(false);
      applyServerError(err, 'Không thể hoàn tất ca khám');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <>
      {locked && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Bệnh án đã khóa sau khi thanh toán (BR-14), chỉ xem được."
        />
      )}
      {!locked && serviceStatus === 'Done' && (
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
        title="Hoàn tất ca khám?"
        open={confirmOpen}
        onCancel={() => !completing && setConfirmOpen(false)}
        onOk={handleComplete}
        okText="Hoàn tất"
        cancelText="Quay lại"
        confirmLoading={completing}
        destroyOnHidden
      >
        <Space direction="vertical">
          <Text>Bệnh án và đơn thuốc sẽ được lưu cùng lúc với bước này.</Text>
          <Text>
            Dịch vụ chuyển sang Hoàn tất. Khi mọi dịch vụ của lịch hẹn đã xong,
            lịch hẹn chuyển sang Chờ chủ đón để lễ tân thu tiền.
          </Text>
        </Space>
      </Modal>
    </>
  );
};

export default SoapForm;
