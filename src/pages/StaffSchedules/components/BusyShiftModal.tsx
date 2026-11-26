import { useState } from 'react';
import { Alert, Input, Modal, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import type { StaffMember, StaffShift } from '@/types';
import { getRoleLabel } from '@/constants/roles';
import {
  BUSY_REASON_MAX,
  type ShiftCell,
  formatShiftWork,
  validateMarkBusy,
} from '@/services/StaffScheduleService';

const { Text } = Typography;
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export interface BusyTarget {
  member: StaffMember;
  date: string;
  shift: StaffShift;
}

interface BusyShiftModalProps {
  target: BusyTarget | null;
  /** The cell as it stands now: it turns past when the shift ends while open */
  cell?: ShiftCell;
  submitting: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/** UC-67: the Admin marks one shift of a vet or groomer as busy ("nghỉ" on screen) */
const BusyShiftModal = ({
  target,
  cell,
  submitting,
  onSubmit,
  onClose,
}: BusyShiftModalProps) => {
  const [reason, setReason] = useState('');
  if (!target || !cell) return null;
  const { shift } = cell;
  const day = dayjs(target.date);
  const blocked = validateMarkBusy(cell);
  const open = cell.openWork;

  return (
    <Modal
      open
      title={`Báo nghỉ ca ${shift.label.toLowerCase()} ${WEEKDAYS[day.day()]} ${day.format('DD/MM/YYYY')}`}
      okText={open.length ? 'Vẫn báo nghỉ' : 'Báo nghỉ'}
      okButtonProps={{
        danger: open.length > 0,
        disabled: Boolean(blocked),
      }}
      cancelText="Hủy bỏ"
      confirmLoading={submitting}
      onOk={() => !blocked && onSubmit(reason)}
      onCancel={() => !submitting && onClose()}
      afterClose={() => setReason('')}
      destroyOnHidden
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Text strong>{target.member.fullName}</Text>{' '}
          <Text type="secondary">({getRoleLabel(target.member.role)})</Text>
          <div>
            Ca {shift.label.toLowerCase()} {shift.time}
          </div>
        </div>

        {blocked ? (
          <Alert type="error" showIcon message={blocked} />
        ) : (
          <>
            {cell.phase === 'current' && (
              <Alert
                type="info"
                showIcon
                message="Ca này đang diễn ra."
                description="Báo nghỉ xong, lễ tân không phân công người này cho phần còn lại của ca."
              />
            )}
            {open.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`${target.member.fullName} còn ${open.length} việc chưa xong trong ca này`}
                description={
                  <Space direction="vertical" size={2}>
                    {open.map(work => (
                      <Text key={work.id}>• {formatShiftWork(work)}</Text>
                    ))}
                    <Text type="secondary">
                      Báo nghỉ xong, đổi người phụ trách các việc này ở Tiếp
                      nhận lịch hẹn.
                    </Text>
                  </Space>
                }
              />
            )}
            <Input.TextArea
              aria-label="Lý do nghỉ"
              rows={2}
              maxLength={BUSY_REASON_MAX}
              showCount
              placeholder="Lý do (không bắt buộc), ví dụ: nghỉ phép, đi học"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <Text type="secondary">
              Người nghỉ ca này sẽ không hiện khi lễ tân phân công dịch vụ trong
              ca đó.
            </Text>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default BusyShiftModal;
