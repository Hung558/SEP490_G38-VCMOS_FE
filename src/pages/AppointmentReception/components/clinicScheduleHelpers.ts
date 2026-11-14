// Pure layout helpers of the shared staff calendar (SCR-17). Relative imports
// only, so node:test can load this file directly.
import type { StaffAppointment } from '../../../types/api/appointment.api.ts';
import type {
  AppointmentServiceStatus,
  OnlineAppointmentService,
} from '../../../types/api/appointment-service.api.ts';
import type { StaffMember } from '../../../types/api/staff.api.ts';
import {
  getBookingServiceDuration,
  getStaffRefId,
} from '../../../services/AppointmentServiceService/helpers.ts';

/** SRS SCR-17: columns are working hours 08:00–18:00 in 15-minute steps */
export const SCHEDULE_DAY_START = 8 * 60;
export const SCHEDULE_DAY_END = 18 * 60;
export const SCHEDULE_STEP = 15;
export const UNASSIGNED_ROW_KEY = 'unassigned';

export interface ScheduleEntry {
  order: StaffAppointment;
  service: OnlineAppointmentService;
  /** Minutes since midnight */
  start: number;
  end: number;
}

export interface ScheduleBlock extends ScheduleEntry {
  key: string;
  /** Offset and width in 15-minute columns from 08:00, clipped to the day */
  column: number;
  span: number;
  lane: number;
}

export interface ScheduleRow {
  key: string;
  name: string;
  role?: string;
  /** False for a staff member who has work this day but no shift on record */
  onShift: boolean;
  blocks: ScheduleBlock[];
  lanes: number;
}

export interface ScheduleLegendItem {
  status: AppointmentServiceStatus;
  label: string;
  color: string;
  background: string;
}

/** Block colours by service status (SRS: Booked, Checked In, In Progress, Done, Overdue) */
export const SCHEDULE_STATUS_STYLES: Record<
  AppointmentServiceStatus,
  ScheduleLegendItem
> = {
  Booked: {
    status: 'Booked',
    label: 'Đã đặt',
    color: '#1d4ed8',
    background: '#dbeafe',
  },
  Waiting: {
    status: 'Waiting',
    label: 'Đã tiếp nhận, chờ làm',
    color: '#0e7490',
    background: '#cffafe',
  },
  InProgress: {
    status: 'InProgress',
    label: 'Đang thực hiện',
    color: '#a16207',
    background: '#fef3c7',
  },
  Done: {
    status: 'Done',
    label: 'Hoàn tất',
    color: '#15803d',
    background: '#dcfce7',
  },
  Overdue: {
    status: 'Overdue',
    label: 'Quá hạn',
    color: '#b91c1c',
    background: '#fee2e2',
  },
  Cancelled: {
    status: 'Cancelled',
    label: 'Đã hủy',
    color: '#64748b',
    background: '#f1f5f9',
  },
};

export const toMinutes = (time?: string | null): number => {
  const match =
    typeof time === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(time.trim()) : null;
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return NaN;
  return hours * 60 + minutes;
};

export const formatMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Header labels: 08:00, 08:15 … 17:45 */
export const buildTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let m = SCHEDULE_DAY_START; m < SCHEDULE_DAY_END; m += SCHEDULE_STEP) {
    slots.push(formatMinutes(m));
  }
  return slots;
};

const serviceDuration = (service: OnlineAppointmentService): number => {
  const ref = service.serviceId;
  return getBookingServiceDuration(
    ref && typeof ref === 'object' ? ref.defaultDuration : undefined
  );
};

/**
 * Time window of every service of an order. The BE stores scheduledStart/End when
 * the booking had a slot; otherwise services follow each other from the order's
 * slotStart (BR-06 sequence). Orders without any time go to `unscheduled`.
 */
export const buildScheduleEntries = (
  orders: readonly StaffAppointment[],
  servicesByOrder: ReadonlyMap<string, readonly OnlineAppointmentService[]>
): { entries: ScheduleEntry[]; unscheduled: StaffAppointment[] } => {
  const entries: ScheduleEntry[] = [];
  const unscheduled: StaffAppointment[] = [];
  for (const order of orders) {
    const services = [...(servicesByOrder.get(order._id) || [])].sort(
      (a, b) => a.sequenceNo - b.sequenceNo
    );
    let cursor = toMinutes(order.slotStart);
    let placed = 0;
    for (const service of services) {
      const scheduled = toMinutes(service.scheduledStart);
      const start = Number.isFinite(scheduled) ? scheduled : cursor;
      if (!Number.isFinite(start)) continue;
      const scheduledEnd = toMinutes(service.scheduledEnd);
      const end =
        Number.isFinite(scheduledEnd) && scheduledEnd > start
          ? scheduledEnd
          : start + serviceDuration(service);
      entries.push({ order, service, start, end });
      cursor = end;
      placed += 1;
    }
    if (placed === 0) unscheduled.push(order);
  }
  return { entries, unscheduled };
};

const ROLE_ORDER: Record<string, number> = { Veterinarian: 0, Groomer: 1 };

/**
 * Rows of the grid: staff on shift that day (or every active one when nobody has a
 * shift on record), plus anyone else who already has work that day, plus one row of
 * services nobody is assigned to yet. Overlapping blocks of a row get separate lanes.
 */
export const buildScheduleRows = (
  staff: readonly StaffMember[],
  entries: readonly ScheduleEntry[],
  options: { showCancelled?: boolean } = {}
): ScheduleRow[] => {
  const rows = new Map<string, ScheduleRow>();
  for (const member of staff) {
    rows.set(member._id, {
      key: member._id,
      name: member.code
        ? `${member.fullName} (${member.code})`
        : member.fullName,
      role: member.role,
      onShift: true,
      blocks: [],
      lanes: 1,
    });
  }

  const visible = entries.filter(
    e => options.showCancelled || e.service.status !== 'Cancelled'
  );
  for (const entry of visible) {
    const staffId =
      getStaffRefId(entry.service.assignedStaffId) || UNASSIGNED_ROW_KEY;
    let row = rows.get(staffId);
    if (!row) {
      const ref = entry.service.assignedStaffId;
      const populated = ref && typeof ref === 'object' ? ref : undefined;
      row =
        staffId === UNASSIGNED_ROW_KEY
          ? {
              key: staffId,
              name: 'Chưa phân công',
              onShift: true,
              blocks: [],
              lanes: 1,
            }
          : {
              key: staffId,
              name: populated?.fullName || 'Nhân viên',
              role: populated?.role,
              onShift: false,
              blocks: [],
              lanes: 1,
            };
      rows.set(staffId, row);
    }
    const clippedStart = Math.max(entry.start, SCHEDULE_DAY_START);
    const clippedEnd = Math.min(entry.end, SCHEDULE_DAY_END);
    // Outside working hours: pin a minimal block to the nearest edge so it stays visible
    const startCol =
      clippedStart >= SCHEDULE_DAY_END
        ? (SCHEDULE_DAY_END - SCHEDULE_DAY_START) / SCHEDULE_STEP - 1
        : Math.floor((clippedStart - SCHEDULE_DAY_START) / SCHEDULE_STEP);
    const endCol =
      clippedEnd <= SCHEDULE_DAY_START
        ? 1
        : Math.ceil((clippedEnd - SCHEDULE_DAY_START) / SCHEDULE_STEP);
    row.blocks.push({
      ...entry,
      key: entry.service._id,
      column: startCol,
      span: Math.max(1, endCol - startCol),
      lane: 0,
    });
  }

  for (const row of rows.values()) {
    row.blocks.sort((a, b) => a.column - b.column || b.span - a.span);
    const laneEnds: number[] = [];
    for (const block of row.blocks) {
      let lane = laneEnds.findIndex(end => end <= block.column);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = block.column + block.span;
      block.lane = lane;
    }
    row.lanes = Math.max(1, laneEnds.length);
  }

  return [...rows.values()].sort((a, b) => {
    if (a.key === UNASSIGNED_ROW_KEY) return 1;
    if (b.key === UNASSIGNED_ROW_KEY) return -1;
    const role =
      (ROLE_ORDER[a.role || ''] ?? 9) - (ROLE_ORDER[b.role || ''] ?? 9);
    return role || a.name.localeCompare(b.name, 'vi');
  });
};
