import { useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  Cage,
  CheckInAppointmentPayload,
  StaffAppointment,
} from '@/types';
import {
  getAppointmentPetName,
  readReceptionIntake,
  RECEPTION_INTAKE_FIELD_LIMIT,
} from '@/services/AppointmentOrderService';
import CageService from '@/services/CageService';
import PetService from '@/services/PetService';
import { isReceptionIntakeEnabled } from './receptionIntakeFeature';
import { getReceptionCageChoices, receptionCageLabel } from './receptionCages';

const { Text } = Typography;

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

  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <span>Xác nhận tiếp nhận lịch hẹn</span>
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
    >
      <Space
        direction="vertical"
        size="middle"
        style={{ width: '100%', marginTop: 8 }}
      >
        <Alert
          message="Chuyển trạng thái lịch hẹn sang Đã tiếp nhận (CheckedIn)"
          description="Hành động này sẽ ghi nhận khách hàng và thú cưng đã có mặt tại phòng khám vào lúc này."
          type="info"
          showIcon
        />

        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Mã lịch hẹn: </Text>
              <Text strong style={{ color: '#0958d9' }}>
                {appointment.code}
              </Text>
            </div>
            <div>
              <Text type="secondary">Thú cưng: </Text>
              <Text strong>{getAppointmentPetName(appointment.petId)}</Text>
            </div>
            <div>
              <Text type="secondary">Ngày hẹn: </Text>
              <Text strong>
                {appointment.date
                  ? dayjs(appointment.date).format('DD/MM/YYYY')
                  : '-'}
              </Text>
            </div>
          </Space>
        </div>

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

const CheckInForm = ({
  formId,
  appointment,
  submitting,
  cageBlockedReason,
  onConfirm,
}: CheckInFormProps) => {
  const [form] = Form.useForm<CheckInAppointmentPayload>();
  const requiresIsolation = Form.useWatch('requiresIsolation', form) === true;
  const cageId = Form.useWatch('cageId', form);
  const [cages, setCages] = useState<Cage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const pet = appointment.petId;
  const petId = typeof pet === 'string' ? pet : pet?._id;
  const knownWeight = typeof pet === 'object' ? pet?.weight : undefined;
  const [petWeight, setPetWeight] = useState(knownWeight);
  const [weightUnknown, setWeightUnknown] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const loadCages = async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setLoadError(false);
    const [cageResult, weightResult] = await Promise.allSettled([
      CageService.listCages(
        { status: 'Available', limit: 100 },
        { signal: controller.signal }
      ),
      knownWeight === undefined && petId
        ? PetService.getPetById(petId).then(result => result.pet?.weight)
        : Promise.resolve(knownWeight),
    ]);
    if (controller.signal.aborted) return;
    setLoading(false);
    setLoaded(true);
    setLoadError(cageResult.status === 'rejected');
    setCages(
      cageResult.status === 'fulfilled'
        ? cageResult.value.data?.items || []
        : []
    );
    const weight =
      weightResult.status === 'fulfilled' ? weightResult.value : undefined;
    setPetWeight(weight);
    setWeightUnknown(typeof weight !== 'number' || weight <= 0);
  };

  const choices = getReceptionCageChoices(cages, petWeight, requiresIsolation);
  const submit = async (values: CheckInAppointmentPayload) => {
    const intake = isReceptionIntakeEnabled
      ? readReceptionIntake(values.intake)
      : undefined;
    if (submitting || (isReceptionIntakeEnabled && !intake)) return;
    if (
      values.cageId &&
      (cageBlockedReason ||
        loading ||
        !getReceptionCageChoices(
          cages,
          petWeight,
          values.requiresIsolation === true
        ).some(c => c._id === values.cageId))
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
    const result = await onConfirm({ ...values, intake });
    if (result) {
      form.setFields([
        { name: 'cageId', value: undefined, errors: [result.cageError] },
      ]);
      if (!cageBlockedReason) void loadCages();
    }
  };

  return (
    <Form<CheckInAppointmentPayload>
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
          <Form.Item<CheckInAppointmentPayload>
            label="Triệu chứng"
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
          <Form.Item<CheckInAppointmentPayload>
            label="Tình trạng ban đầu"
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
      <Form.Item name="requiresIsolation" valuePropName="checked">
        <Checkbox
          disabled={Boolean(cageBlockedReason)}
          onChange={() => {
            if (cageId) form.setFieldValue('cageId', undefined);
          }}
        >
          Yêu cầu chuồng cách ly
        </Checkbox>
      </Form.Item>
      <Form.Item
        name="cageId"
        label="Chuồng lưu giữ (không bắt buộc)"
        extra={
          cageBlockedReason ||
          (loadError ? (
            <Space wrap>
              Không tải được danh sách chuồng.
              <Button type="link" size="small" onClick={loadCages}>
                Tải lại chuồng trống
              </Button>
            </Space>
          ) : requiresIsolation ? (
            'Chỉ hiện chuồng cách ly. Nếu không chọn chuồng, yêu cầu cách ly không được lưu.'
          ) : (
            'Có thể check-in mà không phân chuồng.'
          ))
        }
      >
        <Select
          allowClear
          placeholder="Không xếp chuồng"
          loading={loading}
          disabled={Boolean(cageBlockedReason) && !cageId}
          onOpenChange={open => {
            if (open && !loaded && !loading && !cageBlockedReason)
              void loadCages();
          }}
          options={choices.map(cage => ({
            value: cage._id,
            label: receptionCageLabel(cage),
          }))}
          notFoundContent={
            loading || !loaded
              ? 'Đang tải danh sách chuồng…'
              : loadError
                ? 'Chưa tải được chuồng trống'
                : 'Không có chuồng trống phù hợp'
          }
        />
      </Form.Item>
      {loaded && !loadError && weightUnknown && !cageBlockedReason && (
        <Text type="secondary">
          Chưa có cân nặng xác nhận. Hệ thống sẽ kiểm tra lại khi xếp chuồng.
        </Text>
      )}
    </Form>
  );
};

export default CheckInConfirmModal;
