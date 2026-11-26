import { Popconfirm, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import styled, { css } from 'styled-components';
import type { BusySchedule, StaffMember, StaffShift } from '@/types';
import { getRoleLabel } from '@/constants/roles';
import {
  SHIFT_INFO,
  type ShiftCell,
  type ShiftTone,
  type ShiftWork,
  busyKey,
  describeShiftCell,
  describeShiftHint,
  getShiftPhase,
} from '@/services/StaffScheduleService';

const { Text } = Typography;

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const SLOT_HEIGHT = 28;
const SLOT_GAP = 4;

interface ToneStyle {
  bg: string;
  border: string;
  text: string;
  weight: number;
}

const TONES: Record<ShiftTone, ToneStyle> = {
  free: { bg: '#f0fdfa', border: '#99f6e4', text: '#0f766e', weight: 500 },
  busy: { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', weight: 600 },
};

/** Shifts that are over keep their state in lighter colours */
const PAST_TONES: Record<ShiftTone, ToneStyle> = {
  free: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', weight: 400 },
  busy: { bg: '#fef2f2', border: '#fee2e2', text: '#dc2626', weight: 400 },
};

const toneOf = (p: { $tone: ShiftTone; $past?: boolean }) =>
  (p.$past ? PAST_TONES : TONES)[p.$tone];

const slotBox = css`
  display: flex;
  align-items: center;
  height: ${SLOT_HEIGHT}px;
  margin: 0 0 ${SLOT_GAP}px;
  &:last-child {
    margin-bottom: 0;
  }
`;

export const Slot = styled.button<{
  $tone: ShiftTone;
  $past?: boolean;
  $editable?: boolean;
  $saving?: boolean;
}>`
  ${slotBox}
  position: relative;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 0 6px;
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  border: 1px solid ${p => toneOf(p).border};
  background-color: ${p => toneOf(p).bg};
  color: ${p => toneOf(p).text};
  font-weight: ${p => toneOf(p).weight};
  cursor: ${p =>
    p.$saving ? 'progress' : p.$editable ? 'pointer' : 'default'};
  opacity: ${p => (p.$saving ? 0.6 : 1)};
  transition:
    border-color 0.15s,
    box-shadow 0.15s;

  ${p =>
    p.$editable &&
    css`
      &:hover {
        border-color: #0f766e;
        box-shadow: 0 1px 4px rgba(15, 118, 110, 0.25);
      }
    `}

  &:focus-visible {
    outline: 2px solid #0d9488;
    outline-offset: 1px;
  }
`;

const ShiftLabel = styled.div`
  ${slotBox}
  justify-content: space-between;
  gap: 6px;
  padding: 0 2px;
  font-size: 12px;
  color: #334155;

  .time {
    color: #94a3b8;
    font-size: 11px;
  }
`;

const DayHead = styled.div<{ $today: boolean; $past: boolean }>`
  text-align: center;
  line-height: 1.35;
  color: ${p => (p.$past ? '#94a3b8' : p.$today ? '#0f766e' : '#0f172a')};

  .date {
    font-weight: 400;
    font-size: 12px;
  }
  .today {
    display: inline-block;
    margin-top: 2px;
    padding: 0 6px;
    border-radius: 9px;
    background: #0d9488;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
  }
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #475569;

  .item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .sample {
    width: auto;
    min-width: 46px;
    height: 22px;
    margin: 0;
  }
`;

const HintLines = ({ lines }: { lines: string[] }) => (
  <div style={{ maxWidth: 320 }}>
    {lines.map((line, i) => (
      <div key={i}>{line}</div>
    ))}
  </div>
);

/** The two states the BE stores, above the grid */
export const ScheduleLegend = ({ canEdit }: { canEdit: boolean }) => (
  <LegendRow aria-label="Chú thích">
    <span className="item">
      <Slot as="span" className="sample" $tone="free">
        Đi làm
      </Slot>
      lễ tân phân công được
    </span>
    <span className="item">
      <Slot as="span" className="sample" $tone="busy">
        Nghỉ
      </Slot>
      đã báo nghỉ, không phân công
    </span>
    {canEdit && (
      <Text type="secondary" style={{ fontSize: 12 }}>
        Bấm vào ca chưa qua để báo nghỉ hoặc bỏ báo nghỉ.
      </Text>
    )}
  </LegendRow>
);

const spokenStatus = (cell: ShiftCell): string => {
  const parts: string[] = [];
  if (cell.phase === 'past') parts.push('đã qua');
  if (cell.phase === 'current') parts.push('đang diễn ra');
  parts.push(cell.busy ? 'nghỉ' : 'đi làm');
  return parts.join(', ');
};

interface ScheduleGridProps {
  dates: string[];
  today: string;
  /** HH:mm now, Vietnam time */
  now: string;
  staff: StaffMember[];
  busyByKey: Map<string, BusySchedule>;
  workByKey: Map<string, ShiftWork[]>;
  loading: boolean;
  /** Admin only (UC-67): mark a shift busy, or free a busy one, until it is over */
  canEdit: boolean;
  savingKey?: string;
  onMarkBusy: (member: StaffMember, date: string, shift: StaffShift) => void;
  onClearBusy: (member: StaffMember, record: BusySchedule) => void;
}

/**
 * SCR-30: one row per person; a "Ca" column names the three shifts once, and each
 * day shows how every shift stands (free, has work, busy, over).
 */
const ScheduleGrid = ({
  dates,
  today,
  now,
  staff,
  busyByKey,
  workByKey,
  loading,
  canEdit,
  savingKey,
  onMarkBusy,
  onClearBusy,
}: ScheduleGridProps) => {
  const renderSlot = (
    member: StaffMember,
    date: string,
    shiftKey: StaffShift
  ) => {
    const shift = SHIFT_INFO.find(s => s.key === shiftKey)!;
    const key = busyKey(member._id, date, shiftKey);
    const phase = getShiftPhase(date, shiftKey, today, now);
    const cell = describeShiftCell({
      shift,
      phase,
      busy: busyByKey.get(key),
      work: workByKey.get(key),
      canManage: canEdit,
    });
    const saving = savingKey === key;
    const day = dayjs(date).format('DD/MM');
    const slot = (
      <Slot
        key={shiftKey}
        // Read-only cells are plain text, not buttons that do nothing
        as={cell.editable ? 'button' : 'div'}
        type={cell.editable ? 'button' : undefined}
        tabIndex={cell.editable ? undefined : 0}
        $tone={cell.tone}
        $past={phase === 'past'}
        $editable={cell.editable}
        $saving={saving}
        aria-label={`Ca ${shift.label.toLowerCase()} ${day} của ${member.fullName}: ${spokenStatus(cell)}`}
        aria-busy={saving || undefined}
        disabled={cell.editable ? saving || Boolean(savingKey) : undefined}
        onClick={
          cell.canMark ? () => onMarkBusy(member, date, shiftKey) : undefined
        }
      >
        {cell.status}
      </Slot>
    );

    if (cell.canClear && cell.busy) {
      const record = cell.busy;
      // No tooltip here: it would sit on top of the confirm buttons
      return (
        <Popconfirm
          key={shiftKey}
          title={`Bỏ báo nghỉ ca ${shift.label.toLowerCase()} ${day} của ${member.fullName}?`}
          description={
            <HintLines
              lines={[
                ...describeShiftHint(cell, { action: false }),
                'Bỏ báo nghỉ thì lễ tân phân công lại được người này trong ca.',
              ]}
            />
          }
          okText="Bỏ báo nghỉ"
          cancelText="Giữ"
          onConfirm={() => onClearBusy(member, record)}
          disabled={Boolean(savingKey)}
        >
          {slot}
        </Popconfirm>
      );
    }
    return (
      <Tooltip
        key={shiftKey}
        title={<HintLines lines={describeShiftHint(cell)} />}
        mouseEnterDelay={0.25}
      >
        {slot}
      </Tooltip>
    );
  };

  const columns: ColumnsType<StaffMember> = [
    {
      title: 'Nhân sự',
      key: 'staff',
      width: 168,
      fixed: 'left',
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
    {
      title: 'Ca',
      key: 'shift',
      width: 92,
      render: () =>
        SHIFT_INFO.map(s => (
          <ShiftLabel key={s.key}>
            <span>{s.label}</span>
            <span className="time">
              {s.start.slice(0, 2)}–{s.end.slice(0, 2)}h
            </span>
          </ShiftLabel>
        )),
    },
    ...dates.map(date => {
      const isToday = date === today;
      const d = dayjs(date);
      return {
        title: (
          <DayHead $today={isToday} $past={date < today}>
            <div>{WEEKDAYS[d.day()]}</div>
            <div className="date">{d.format('DD/MM')}</div>
            {isToday && <span className="today">Hôm nay</span>}
          </DayHead>
        ),
        key: date,
        width: 104,
        onHeaderCell: () => ({
          style: isToday ? { backgroundColor: '#f0fdfa' } : undefined,
        }),
        onCell: () => ({
          style: isToday ? { backgroundColor: '#f0fdfa' } : undefined,
        }),
        render: (_: unknown, member: StaffMember) =>
          SHIFT_INFO.map(s => renderSlot(member, date, s.key)),
      };
    }),
  ];

  return (
    <Table
      size="small"
      rowKey="_id"
      columns={columns}
      dataSource={staff}
      loading={loading}
      pagination={false}
      // 168 + 92 + 7 × 104 fits the content area of a 1366px screen
      scroll={{ x: 988 }}
      locale={{
        emptyText: 'Không có bác sĩ hay nhân viên spa nào đang hoạt động.',
      }}
    />
  );
};

export default ScheduleGrid;
