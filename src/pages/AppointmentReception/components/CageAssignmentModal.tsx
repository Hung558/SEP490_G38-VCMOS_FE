import { useEffect, useState } from 'react';
import { Alert, Checkbox, Form, Modal, Select, Space, Typography } from 'antd';
import { BuildOutlined } from '@ant-design/icons';
import type { Cage, StaffAppointment } from '@/types';
import CageService, { canCageHoldPet } from '@/services/CageService';
import PetService from '@/services/PetService';
import { getAppointmentPetName } from '@/services/AppointmentOrderService';

const { Text } = Typography;

interface CageAssignmentModalProps {
  open: boolean;
  targetAppointment: StaffAppointment | null;
  submitting: boolean;
  onSubmit: (values: { cageId: string; orderId: string }) => Promise<void>;
  onClose: () => void;
}

const petIdOf = (pet: StaffAppointment['petId']) =>
  typeof pet === 'string' ? pet : pet?._id;

/**
 * "Phân chuồng" shortcut on an appointment row: place this order's pet into an
 * Available holding cage that fits its weight (BR-11). Moving and releasing are on
 * the cage board.
 */
const CageAssignmentModal = ({
  open,
  targetAppointment,
  submitting,
  onSubmit,
  onClose,
}: CageAssignmentModalProps) => {
  const [form] = Form.useForm<{ cageId: string }>();
  const [cages, setCages] = useState<Cage[]>([]);
  const [petWeight, setPetWeight] = useState<number>();
  // BR-11: the receptionist states whether the pet needs isolation
  const [requiresIsolation, setRequiresIsolation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !targetAppointment) return;
    const controller = new AbortController();
    const petId = petIdOf(targetAppointment.petId);
    setLoading(true);
    setLoadError(null);
    setPetWeight(undefined);
    setRequiresIsolation(false);
    form.resetFields();
    Promise.allSettled([
      CageService.listCages(
        { status: 'Available', limit: 100 },
        { signal: controller.signal }
      ),
      petId ? PetService.getPetById(petId) : Promise.resolve(undefined),
    ])
      .then(([cageResult, petResult]) => {
        if (controller.signal.aborted) return;
        if (cageResult.status === 'fulfilled') {
          setCages(cageResult.value.data?.items || []);
        } else {
          setCages([]);
          setLoadError('Không thể tải danh sách chuồng trống');
        }
        const weight =
          petResult.status === 'fulfilled'
            ? petResult.value?.pet?.weight
            : undefined;
        setPetWeight(
          typeof weight === 'number' && weight > 0 ? weight : undefined
        );
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [open, targetAppointment, form]);

  if (!targetAppointment) return null;

  // BR-11: holding cages of the right kind (isolation only for a pet that needs it,
  // standard otherwise) whose size holds the pet. POST /cage-assignments checks neither.
  const fitting = cages.filter(c =>
    canCageHoldPet(c, petWeight, requiresIsolation)
  );

  const handleOk = async () => {
    try {
      const { cageId } = await form.validateFields();
      await onSubmit({ cageId, orderId: targetAppointment._id });
    } catch {
      // Validation error, or handled by onSubmit
    }
  };

  return (
    <Modal
      title={
        <Space>
          <BuildOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <span>Phân công chuồng cho lịch hẹn</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Xác nhận phân chuồng"
      cancelText="Hủy bỏ"
      confirmLoading={submitting}
      okButtonProps={{
        disabled: submitting || loading || fitting.length === 0,
      }}
      cancelButtonProps={{ disabled: submitting }}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {loadError && (
          <Alert
            message={loadError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <div
          style={{
            background: '#f8fafc',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          <Space direction="vertical" size={2}>
            <div>
              <Text type="secondary">Mã lịch hẹn: </Text>
              <Text strong style={{ color: '#0958d9' }}>
                {targetAppointment.code}
              </Text>
            </div>
            <div>
              <Text type="secondary">Thú cưng: </Text>
              <Text strong>
                {getAppointmentPetName(targetAppointment.petId)}
              </Text>
              {!loading && (
                <Text type="secondary">
                  {petWeight !== undefined
                    ? ` · ${petWeight} kg`
                    : ' · chưa có cân nặng'}
                </Text>
              )}
            </div>
          </Space>
        </div>

        <Checkbox
          checked={requiresIsolation}
          onChange={e => {
            setRequiresIsolation(e.target.checked);
            form.setFieldValue('cageId', undefined);
          }}
          style={{ marginBottom: 12 }}
        >
          Thú cưng nghi mắc bệnh lây, cần chuồng cách ly
        </Checkbox>

        <Form.Item
          name="cageId"
          label={
            requiresIsolation
              ? 'Chuồng cách ly trống phù hợp'
              : 'Chuồng thường trống phù hợp'
          }
          rules={[{ required: true, message: 'Vui lòng chọn chuồng' }]}
          extra={
            petWeight === undefined && !loading
              ? 'Chưa có cân nặng của thú cưng, hãy tự kiểm tra cỡ chuồng (BR-11).'
              : undefined
          }
        >
          <Select
            placeholder={
              loading
                ? 'Đang tải danh sách chuồng...'
                : 'Chọn chuồng đang trống'
            }
            loading={loading}
            disabled={loading || fitting.length === 0}
            options={fitting.map(c => ({
              label: `${c.label} - Cỡ ${c.size}${c.isIsolated ? ' [Cách ly]' : ''}`,
              value: c._id,
            }))}
          />
        </Form.Item>

        {!loading && !loadError && fitting.length === 0 && (
          <Alert
            message="Không có chuồng trống phù hợp"
            description={`Không còn chuồng ${requiresIsolation ? 'cách ly' : 'thường'} trống đủ cỡ cho thú cưng này (MSG24). Giải phóng chuồng ở Sơ đồ chuồng trước.`}
            type="warning"
            showIcon
          />
        )}
      </Form>
    </Modal>
  );
};

export default CageAssignmentModal;
