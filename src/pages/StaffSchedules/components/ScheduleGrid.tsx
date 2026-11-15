import { Popconfirm, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { BusySchedule, StaffMember, StaffShift } from '@/types';
import { getRoleLabel } from '@/constants/roles';
import {
  SHIFT_INFO,
  busyKey,
  isPastDay,
} from '@/services/StaffScheduleService';

const { Text } = Typography;

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const ShiftButton = styled.button<{ $busy: boolean; $clickable: boolean }>`
  display: block;
  width: 100%;
  margin: 0 0 4px;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  white-space: nowrap;
  border: 1px solid ${p => (p.$busy ? '#fecaca' : '#ccfbf1')};
  background-color: ${p => (p.$busy ? '#fef2f2' : '#f0fdfa')};
  color: ${p => (p.$busy ? '#b91c1c' : '#0f766e')};
  cursor: ${p => (p.$clickable ? 'pointer' : 'default')};

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    border-color: ${p =>
      p.$clickable ? (p.$busy ? '#f87171' : '#2dd4bf') : 'inherit'};
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const dayTitle = (date: string, today: string) => {
  const d = dayjs(date);
  return (
    <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
      <div>{WEEKDAYS[d.day()]}</div>
      <Text
        type={date === today ? undefined : 'secondary'}
        strong={date === today}
      >
        {d.format('DD/MM')}
        {date === today ? ' · nay' : ''}
      </Text>
    </div>
  );
};

interface ScheduleGridProps {
  dates: string[];
  today: string;
  staff: StaffMember[];
  busyByKey: Map<string, BusySchedule>;
  loading: boolean;
  /** Admin only (UC-67): mark a free shift busy, or free a busy one */
  canEdit: boolean;
  savingKey?: string;
  onMarkBusy: (member: StaffMember, date: string, shift: StaffShift) => void;
  onClearBusy: (member: StaffMember, record: BusySchedule) => void;
}

/** SCR-30: staff in rows, the 7 days in columns, each day split in 3 shifts */
const ScheduleGrid = ({
  dates,
  today,
  staff,
  busyByKey,
  loading,
  canEdit,
  savingKey,
  onMarkBusy,
  onClearBusy,
}: ScheduleGridProps) => {
  const renderCell = (member: StaffMember, date: string) =>
    SHIFT_INFO.map(({ key: shift, label, time }) => {
      const record = busyByKey.get(busyKey(member._id, date, shift));
      const clickable = canEdit && !isPastDay(date, today);
      const saving = savingKey === busyKey(member._id, date, shift);
      const text = `${label} · ${record ? 'Bận' : 'Làm'}`;
      const aria = `${label} ${dayjs(date).format('DD/MM')} của ${member.fullName}: ${record ? 'bận' : 'làm việc'}`;
      const button = (
        <ShiftButton
          key={shift}
          // Read-only views get plain text, not a button that does nothing
          as={clickable ? 'button' : 'span'}
          type={clickable ? 'button' : undefined}
          $busy={Boolean(record)}
          $clickable={clickable}
          aria-label={aria}
          disabled={clickable ? saving : undefined}
          onClick={
            clickable && !record
              ? () => onMarkBusy(member, date, shift)
              : undefined
          }
        >
          {text}
        </ShiftButton>
      );
      const tip = record
        ? `${time}. ${record.reason ? `Lý do: ${record.reason}. ` : ''}${
            typeof record.createdBy === 'object' && record.createdBy?.fullName
              ? `Ghi bởi ${record.createdBy.fullName}.`
              : ''
          }`
        : `${time}. Đang làm việc.`;
      if (clickable && record) {
        // No tooltip here: it would sit on top of the confirm buttons
        return (
          <Popconfirm
            key={shift}
            title={`Bỏ báo bận ca ${label.toLowerCase()} ${dayjs(date).format('DD/MM')} của ${member.fullName}?`}
            description={`${tip} Người này sẽ hiện lại khi phân công ca đó.`}
            okText="Bỏ báo bận"
            cancelText="Giữ"
            onConfirm={() => onClearBusy(member, record)}
          >
            {button}
          </Popconfirm>
        );
      }
      return (
        <Tooltip key={shift} title={tip}>
          {button}
        </Tooltip>
      );
    });

  const columns: ColumnsType<StaffMember> = [
    {
      title: 'Nhân sự',
      key: 'staff',
      width: 170,
      render: (_, member) => (
        <div>
          <Text strong>{member.fullName}</Text>
          <div>
            <Tag
              color={member.role === 'Groomer' ? 'purple' : 'blue'}
              style={{ marginTop: 4 }}
            >
              {getRoleLabel(member.role)}
            </Tag>
          </div>
        </div>
      ),
    },
    ...dates.map(date => ({
      title: dayTitle(date, today),
      key: date,
      width: 110,
      onCell: () => ({
        style: date === today ? { backgroundColor: '#f8fafc' } : undefined,
      }),
      render: (_: unknown, member: StaffMember) => renderCell(member, date),
    })),
  ];

  return (
    <Table
      size="small"
      rowKey="_id"
      columns={columns}
      dataSource={staff}
      loading={loading}
      pagination={false}
      // Fits the content area of a 1366px screen; narrower screens scroll
      scroll={{ x: 940 }}
      locale={{ emptyText: 'Không có bác sĩ hay groomer nào đang hoạt động.' }}
    />
  );
};

export default ScheduleGrid;
