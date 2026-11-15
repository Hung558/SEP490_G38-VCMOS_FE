import { useState } from 'react';
import { Input, Modal, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import type { StaffMember, StaffShift } from '@/types';
import { getRoleLabel } from '@/constants/roles';
import { BUSY_REASON_MAX, SHIFT_INFO } from '@/services/StaffScheduleService';

const { Text } = Typography;

export interface BusyTarget {
  member: StaffMember;
  date: string;
  shift: StaffShift;
}

interface BusyShiftModalProps {
  target: BusyTarget | null;
  submitting: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/** UC-67: the Admin marks one shift of a vet or groomer as busy */
const BusyShiftModal = ({
  target,
  submitting,
  onSubmit,
  onClose,
}: BusyShiftModalProps) => {
  const [reason, setReason] = useState('');
  if (!target) return null;
  const shift = SHIFT_INFO.find(s => s.key === target.shift);

  return (
    <Modal
      open
      title="Báo bận một ca"
      okText="Báo bận"
      cancelText="Hủy bỏ"
      confirmLoading={submitting}
      onOk={() => onSubmit(reason)}
      onCancel={() => !submitting && onClose()}
      afterClose={() => setReason('')}
      destroyOnHidden
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Text>
          <Text strong>{target.member.fullName}</Text> (
          {getRoleLabel(target.member.role)}) · ca {shift?.label.toLowerCase()}{' '}
          {shift?.time} · {dayjs(target.date).format('DD/MM/YYYY')}
        </Text>
        <Input.TextArea
          aria-label="Lý do bận"
          rows={2}
          maxLength={BUSY_REASON_MAX}
          showCount
          placeholder="Lý do (không bắt buộc), ví dụ: nghỉ phép, đi học"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <Text type="secondary">
          Người bận ca này sẽ không hiện khi lễ tân phân công dịch vụ trong ca
          đó.
        </Text>
      </Space>
    </Modal>
  );
};

export default BusyShiftModal;
