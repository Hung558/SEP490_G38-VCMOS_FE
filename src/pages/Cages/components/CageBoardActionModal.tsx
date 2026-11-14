import { useEffect, useState } from 'react';
import {
  Alert,
  Checkbox,
  Empty,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import type { Cage } from '@/services/CageService';
import {
  extractApiError,
  getAppointmentPetName,
  getAppointmentStatusLabel,
} from '@/services/AppointmentOrderService';
import type { StaffAppointment } from '@/types';
import { getCageBlockReason, getOrderPetId } from './cageBoardHelpers';

const { Text } = Typography;

interface CageBoardActionModalProps {
  /** The Available cage to fill; null when closed */
  cage: Cage | null;
  submitting: boolean;
  loadOrdersWithoutCage: () => Promise<StaffAppointment[]>;
  loadPetWeight: (petId?: string) => Promise<number | undefined>;
  onAssign: (cage: Cage, order: StaffAppointment) => Promise<boolean>;
  onClose: () => void;
}

/** "Xếp thú cưng": place a checked-in pet into this Available cage (UC-29, BR-11) */
const CageBoardActionModal = ({
  cage,
  submitting,
  loadOrdersWithoutCage,
  loadPetWeight,
  onAssign,
  onClose,
}: CageBoardActionModalProps) => {
  const [orders, setOrders] = useState<StaffAppointment[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string>();
  const [petWeight, setPetWeight] = useState<number | undefined>();
  const [weightLoading, setWeightLoading] = useState(false);
  // BR-11: the receptionist states whether the pet needs isolation
  const [requiresIsolation, setRequiresIsolation] = useState(false);

  // Reset and load the orders waiting for a cage each time the modal opens
  useEffect(() => {
    setOrderId(undefined);
    setPetWeight(undefined);
    setLoadError(null);
    setRequiresIsolation(false);
    if (!cage) return;
    let cancelled = false;
    setOrdersLoading(true);
    loadOrdersWithoutCage()
      .then(list => !cancelled && setOrders(list))
      .catch(
        err =>
          !cancelled &&
          setLoadError(
            extractApiError(err, 'Không tải được lịch hẹn chờ chuồng').message
          )
      )
      .finally(() => !cancelled && setOrdersLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cage, loadOrdersWithoutCage]);

  if (!cage) return null;

  const selectedOrder = orders.find(o => o._id === orderId);

  // The pet's weight decides whether this cage size fits (BR-11)
  const handleOrderChange = (id: string) => {
    setOrderId(id);
    setPetWeight(undefined);
    setWeightLoading(true);
    loadPetWeight(getOrderPetId(orders.find(o => o._id === id)))
      .then(setPetWeight)
      .finally(() => setWeightLoading(false));
  };

  const blockReason =
    selectedOrder && !weightLoading
      ? getCageBlockReason(cage, petWeight, requiresIsolation)
      : undefined;
  const canSubmit = Boolean(selectedOrder) && !weightLoading && !blockReason;

  const handleOk = async () => {
    if (!canSubmit || !selectedOrder) return;
    if (await onAssign(cage, selectedOrder)) onClose();
  };

  return (
    <Modal
      open
      title={`Xếp thú cưng vào chuồng ${cage.label}`}
      okText="Xếp vào chuồng"
      cancelText="Hủy bỏ"
      onOk={handleOk}
      onCancel={() => !submitting && onClose()}
      confirmLoading={submitting}
      okButtonProps={{ disabled: !canSubmit }}
      cancelButtonProps={{ disabled: submitting }}
      destroyOnHidden
      width={560}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {loadError && <Alert type="error" showIcon message={loadError} />}
        <Text type="secondary">
          Chỉ hiện lịch hẹn đã tiếp nhận (thú cưng đang ở phòng khám) và chưa có
          chuồng. Chuồng cỡ {cage.size}
          {cage.isIsolated ? ', khu cách ly' : ''}.
        </Text>
        {ordersLoading ? (
          <Spin />
        ) : orders.length === 0 && !loadError ? (
          <Empty description="Không có lịch hẹn nào đang chờ chuồng" />
        ) : (
          <Select
            aria-label="Lịch hẹn cần xếp chuồng"
            placeholder="Chọn hoặc gõ mã lịch hẹn"
            style={{ width: '100%' }}
            value={orderId}
            onChange={handleOrderChange}
            showSearch
            optionFilterProp="label"
            options={orders.map(o => ({
              value: o._id,
              label: `${o.code} · ${getAppointmentPetName(o.petId)} · ${getAppointmentStatusLabel(o.derivedStatus)}`,
            }))}
          />
        )}
        {weightLoading ? (
          <Text type="secondary">
            <Spin size="small" /> Đang lấy cân nặng thú cưng…
          </Text>
        ) : selectedOrder && petWeight === undefined ? (
          <Text type="secondary">
            Chưa có cân nặng của thú cưng, hãy tự kiểm tra cỡ chuồng (BR-11).
          </Text>
        ) : petWeight !== undefined ? (
          <Text type="secondary">Cân nặng thú cưng: {petWeight} kg</Text>
        ) : null}
        <Checkbox
          checked={requiresIsolation}
          onChange={e => setRequiresIsolation(e.target.checked)}
        >
          Thú cưng nghi mắc bệnh lây, cần chuồng cách ly
        </Checkbox>
        {blockReason && <Alert type="error" showIcon message={blockReason} />}
      </Space>
    </Modal>
  );
};

export default CageBoardActionModal;
