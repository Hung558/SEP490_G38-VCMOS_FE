import type {
  BusySchedule,
  CreateBusySchedulePayload,
} from '../../types/api/staff-schedule.api';
import type { StaffShift } from '../../types/api/staff.api';
import type { StaffAppointment } from '../../types/api/appointment.api';
import type {
  AppointmentServiceStatus,
  MyQueueItem,
} from '../../types/api/appointment-service.api';
import {
  getAppointmentServiceName,
  getAppointmentServiceStatusLabel,
  getServiceRefCategory,
  getStaffRefId,
  getVietnamCurrentTime,
} from '../AppointmentServiceService/helpers.ts';

export interface ShiftInfo {
  key: StaffShift;
  label: string;
  /** HH:mm, Vietnam time */
  start: string;
  end: string;
  time: string;
}

/** The three shifts of the BE busy schedule (staffSchedule.service SHIFT_LABELS) */
export const SHIFT_INFO: readonly ShiftInfo[] = [
  {
    key: 'MORNING',
    label: 'Sáng',
    start: '08:00',
    end: '12:00',
    time: '08:00–12:00',
  },
  {
    key: 'AFTERNOON',
    label: 'Chiều',
    start: '12:00',
    end: '17:00',
    time: '12:00–17:00',
  },
  {
    key: 'EVENING',
    label: 'Tối',
    start: '17:00',
    end: '21:00',
    time: '17:00–21:00',
  },
];

export const getShiftInfo = (shift: StaffShift): ShiftInfo | undefined =>
  SHIFT_INFO.find(s => s.key === shift);

export const BUSY_REASON_MAX = 500;

/**
 * Who may do what on the shift screen (SRS permission matrix, "Staff schedule";
 * nghiệp vụ 7.4 and UC-67):
 * - Admin creates and edits shifts;
 * - Receptionist views every shift;
 * - Veterinarian and Groomer view their own.
 * The BE also lets staff report themselves busy and the receptionist do it for
 * them; the documents do not, so the screen does not offer it.
 */
export type ScheduleAccess = 'manage' | 'viewAll' | 'viewOwn';

export const getScheduleAccess = (
  role?: string
): ScheduleAccess | undefined => {
  if (role === 'Admin') return 'manage';
  if (role === 'Receptionist') return 'viewAll';
  if (role === 'Veterinarian' || role === 'Groomer') return 'viewOwn';
  return undefined;
};

const parseDay = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** The seven dates, Monday to Sunday, of the week that holds `anchor` */
export const getWeekDates = (anchor: string): string[] => {
  const day = parseDay(anchor);
  if (!day) return [];
  const monday = new Date(day);
  monday.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
};

/** Same day a week earlier or later */
export const shiftWeek = (anchor: string, weeks: number): string => {
  const day = parseDay(anchor);
  if (!day) return anchor;
  day.setUTCDate(day.getUTCDate() + weeks * 7);
  return day.toISOString().slice(0, 10);
};

const staffIdOf = (ref: BusySchedule['staffId']): string =>
  typeof ref === 'string' ? ref : ref?._id;

export const busyKey = (staffId: string, date: string, shift: StaffShift) =>
  `${staffId}|${date}|${shift}`;

/** Busy records by staff, date and shift, for the grid cells */
export const indexBusySchedules = (
  items: readonly BusySchedule[] | null | undefined
): Map<string, BusySchedule> => {
  const map = new Map<string, BusySchedule>();
  for (const item of items || []) {
    const staffId = staffIdOf(item.staffId);
    if (staffId) map.set(busyKey(staffId, item.date, item.shift), item);
  }
  return map;
};

/** The BE refuses busy records for past days */
export const isPastDay = (date: string, today: string): boolean => date < today;

/** "8:05" or "08:05:00" → "08:05"; anything else → undefined */
const normalizeTime = (value?: string | null): string | undefined => {
  const match =
    typeof value === 'string' ? /^(\d{1,2}):(\d{2})/.exec(value.trim()) : null;
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
};

/**
 * Where a shift stands against the clinic clock (Vietnam time): ended, running or
 * still to come. A shift of today is over from its end time, so at 12:00 the
 * morning shift is past and the afternoon one is running.
 */
export type ShiftPhase = 'past' | 'current' | 'upcoming';

export const getShiftPhase = (
  date: string,
  shift: StaffShift,
  today: string,
  now: string
): ShiftPhase => {
  if (date < today) return 'past';
  if (date > today) return 'upcoming';
  const info = getShiftInfo(shift);
  const time = normalizeTime(now);
  if (!info || !time) return 'upcoming';
  if (time >= info.end) return 'past';
  if (time >= info.start) return 'current';
  return 'upcoming';
};

/**
 * The shift a service time falls in, the same way the BE checks busy staff
 * (staffSchedule.service getShiftFromTime): before 12:00 is the morning, before
 * 17:00 the afternoon, the rest the evening.
 */
export const getShiftOfTime = (
  value?: string | null
): StaffShift | undefined => {
  const time = normalizeTime(value);
  if (!time) return undefined;
  if (time < '12:00') return 'MORNING';
  if (time < '17:00') return 'AFTERNOON';
  return 'EVENING';
};

/** A service a vet or groomer is assigned to, placed in one shift */
export interface ShiftWork {
  /** appointment-service _id */
  id: string;
  orderCode: string;
  serviceName: string;
  status: AppointmentServiceStatus;
  /** Status in words, "Đang khám" or "Đang spa" while in progress */
  statusLabel: string;
  /** HH:mm the service starts */
  time: string;
  petName?: string;
}

export interface ShiftWorkEntry {
  staffId: string;
  date: string;
  shift: StaffShift;
  work: ShiftWork;
}

/** Services that still need the person: booked, waiting or being done */
const OPEN_STATUSES: ReadonlySet<string> = new Set([
  'Booked',
  'Waiting',
  'InProgress',
]);

/** Cancelled and no-show (Overdue) services were never worked */
const SKIPPED_STATUSES: ReadonlySet<string> = new Set(['Cancelled', 'Overdue']);

export const isOpenWork = (work: ShiftWork): boolean =>
  OPEN_STATUSES.has(work.status);

/** Clock time (Vietnam) of an ISO timestamp, e.g. the check-in moment */
const clockOf = (iso?: string | null): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : getVietnamCurrentTime(date);
};

interface OrderLike {
  code?: string;
  date?: string;
  slotStart?: string | null;
  checkedInAt?: string | null;
}

const toEntry = (
  service: {
    _id: string;
    serviceId: unknown;
    status: AppointmentServiceStatus;
    scheduledStart?: string | null;
  },
  order: OrderLike,
  staffId: string | undefined,
  petName?: string
): ShiftWorkEntry | undefined => {
  if (!staffId || !order.date || SKIPPED_STATUSES.has(service.status)) {
    return undefined;
  }
  // The BE takes the service's own start, else the booking slot; a walk-in
  // without either is placed at the time it was checked in
  const time =
    normalizeTime(service.scheduledStart) ||
    normalizeTime(order.slotStart) ||
    clockOf(order.checkedInAt);
  const shift = getShiftOfTime(time);
  if (!time || !shift) return undefined;
  return {
    staffId,
    date: order.date,
    shift,
    work: {
      id: service._id,
      orderCode: order.code || '',
      serviceName: getAppointmentServiceName(service.serviceId),
      status: service.status,
      statusLabel: getAppointmentServiceStatusLabel(
        service.status,
        getServiceRefCategory(service.serviceId)
      ),
      time,
      petName,
    },
  };
};

/** Assigned services of the orders in GET /appointment-orders (Admin, Lễ tân) */
export const collectOrderWork = (
  orders: readonly StaffAppointment[] | null | undefined
): ShiftWorkEntry[] => {
  const entries: ShiftWorkEntry[] = [];
  for (const order of orders || []) {
    const petName =
      order.petId && typeof order.petId === 'object'
        ? order.petId.name
        : undefined;
    for (const service of order.services || []) {
      const entry = toEntry(
        service,
        order,
        getStaffRefId(service.assignedStaffId),
        petName
      );
      if (entry) entries.push(entry);
    }
  }
  return entries;
};

/** The signed-in vet's or groomer's own services (GET /appointment-services/my-queue) */
export const collectQueueWork = (
  items: readonly MyQueueItem[] | null | undefined,
  staffId: string,
  from: string,
  to: string
): ShiftWorkEntry[] => {
  const entries: ShiftWorkEntry[] = [];
  for (const item of items || []) {
    const order =
      item.orderId && typeof item.orderId === 'object'
        ? item.orderId
        : undefined;
    if (!order || order.date < from || order.date > to) continue;
    const entry = toEntry(item, order, staffId);
    if (entry) entries.push(entry);
  }
  return entries;
};

/** Work by staff, date and shift, earliest first */
export const indexShiftWork = (
  entries: readonly ShiftWorkEntry[]
): Map<string, ShiftWork[]> => {
  const map = new Map<string, ShiftWork[]>();
  for (const entry of entries) {
    const key = busyKey(entry.staffId, entry.date, entry.shift);
    const list = map.get(key);
    if (list) list.push(entry.work);
    else map.set(key, [entry.work]);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        a.time.localeCompare(b.time) || a.orderCode.localeCompare(b.orderCode)
    );
  }
  return map;
};

/**
 * A cell has exactly the two states the BE stores (staff_schedules, a blacklist):
 * - free ("Đi làm"): no busy record, the person works the shift and the
 *   receptionist can assign them;
 * - busy ("Nghỉ"): a busy record ("báo bận" in the BE), the receptionist cannot.
 * "Rảnh/Bận" read as "no booking / has booking", so the screen uses the words of
 * a duty roster.
 * Assigned services are not a state of their own: they are listed in the hover
 * text and used by the checks before marking busy. A shift that is over keeps its
 * state (faded, read-only): a blank cell would read as if the person had been off.
 */
export type ShiftTone = 'free' | 'busy';

export interface ShiftCell {
  shift: ShiftInfo;
  phase: ShiftPhase;
  busy?: BusySchedule;
  work: ShiftWork[];
  /** Services of the shift not done yet */
  openWork: ShiftWork[];
  tone: ShiftTone;
  /** Short text inside the cell */
  status: string;
  /** The Admin may mark this shift busy now */
  canMark: boolean;
  /** The Admin may free this busy shift now */
  canClear: boolean;
  /** canMark or canClear: the cell is a button */
  editable: boolean;
  /** For the Admin: why a shift not over yet cannot be marked busy */
  markBlock?: string;
}

export const describeShiftCell = ({
  shift,
  phase,
  busy,
  work = [],
  canManage = false,
}: {
  shift: ShiftInfo;
  phase: ShiftPhase;
  busy?: BusySchedule;
  work?: readonly ShiftWork[];
  canManage?: boolean;
}): ShiftCell => {
  const all = [...work];
  const openWork = all.filter(isOpenWork);
  const block = validateMarkBusy({ phase, busy, work: all });
  const canMark = canManage && !block;
  const canClear = canManage && !validateClearBusy({ phase, busy });
  const base = {
    shift,
    phase,
    busy,
    work: all,
    openWork,
    canMark,
    canClear,
    editable: canMark || canClear,
    markBlock:
      canManage && !busy && phase !== 'past' && block ? block : undefined,
  };
  return busy
    ? { ...base, tone: 'busy', status: 'Nghỉ' }
    : { ...base, tone: 'free', status: 'Đi làm' };
};

const busyAuthor = (record: BusySchedule): string | undefined =>
  record.createdBy && typeof record.createdBy === 'object'
    ? record.createdBy.fullName
    : undefined;

export const formatShiftWork = (work: ShiftWork): string =>
  [work.time, work.orderCode, work.petName, work.serviceName, work.statusLabel]
    .filter(Boolean)
    .join(' · ');

/**
 * Lines of the hover text of a cell. `limit` caps the listed services; `action`
 * adds what a click does, left out where the click already opened something.
 */
export const describeShiftHint = (
  cell: ShiftCell,
  { limit = 6, action = true }: { limit?: number; action?: boolean } = {}
): string[] => {
  const { shift, phase, busy, work, openWork } = cell;
  const when =
    phase === 'past'
      ? ', đã kết thúc'
      : phase === 'current'
        ? ', đang diễn ra'
        : '';
  const lines = [`Ca ${shift.label.toLowerCase()} ${shift.time}${when}.`];
  if (busy) {
    const author = busyAuthor(busy);
    lines.push(
      `Đã báo nghỉ${busy.reason ? `: ${busy.reason}` : ''}${
        author ? ` (ghi bởi ${author})` : ''
      }.`
    );
  }
  if (work.length) {
    lines.push(`${work.length} việc được giao:`);
    for (const item of work.slice(0, limit)) {
      lines.push(`• ${formatShiftWork(item)}`);
    }
    if (work.length > limit)
      lines.push(`… và ${work.length - limit} việc khác.`);
  } else {
    lines.push(
      phase === 'past' ? 'Không có việc được giao.' : 'Chưa có việc được giao.'
    );
  }
  if (phase === 'past') {
    // Not busy means the person was on shift, even with nothing assigned
    if (!busy) lines.push('Không báo nghỉ: đi làm ca này.');
  } else if (busy && openWork.length) {
    lines.push(
      `Còn ${openWork.length} việc chưa xong: đổi người phụ trách ở Tiếp nhận lịch hẹn.`
    );
  } else if (!busy) {
    lines.push('Lễ tân phân công được người này trong ca.');
  } else {
    lines.push('Lễ tân không phân công người này trong ca.');
  }
  if (action) {
    if (cell.canClear) lines.push('Bấm để bỏ báo nghỉ.');
    else if (cell.canMark) lines.push('Bấm để báo nghỉ.');
    else if (cell.markBlock) lines.push(cell.markBlock);
  }
  return lines;
};

export interface BusyConflict {
  staffId: string;
  staffName: string;
  date: string;
  shift: ShiftInfo;
  openWork: ShiftWork[];
}

/**
 * Busy shifts, not over yet, that still hold unfinished services of the same
 * person: the receptionist has to hand those services to someone else.
 */
export const findBusyConflicts = ({
  busy,
  workByKey,
  staffNames,
  today,
  now,
}: {
  busy: readonly BusySchedule[];
  workByKey: ReadonlyMap<string, readonly ShiftWork[]>;
  /** _id → full name, for records whose staffId is not populated */
  staffNames?: ReadonlyMap<string, string>;
  today: string;
  now: string;
}): BusyConflict[] => {
  const conflicts: BusyConflict[] = [];
  for (const record of busy) {
    const staffId = staffIdOf(record.staffId);
    const shift = getShiftInfo(record.shift);
    if (!staffId || !shift) continue;
    if (getShiftPhase(record.date, record.shift, today, now) === 'past')
      continue;
    const openWork = (
      workByKey.get(busyKey(staffId, record.date, record.shift)) || []
    ).filter(isOpenWork);
    if (!openWork.length) continue;
    const populatedName =
      typeof record.staffId === 'object' ? record.staffId?.fullName : undefined;
    conflicts.push({
      staffId,
      staffName: populatedName || staffNames?.get(staffId) || 'Nhân sự',
      date: record.date,
      shift,
      openWork,
    });
  }
  const order = (s: StaffShift) => SHIFT_INFO.findIndex(i => i.key === s);
  return conflicts.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      order(a.shift.key) - order(b.shift.key) ||
      a.staffName.localeCompare(b.staffName, 'vi')
  );
};

/**
 * Checks done before marking a shift busy. The BE only refuses past days, so these
 * are stopped here:
 * - a shift of today that has already ended;
 * - the running shift once the person has been given work in it: they are at
 *   work, so the shift cannot become a busy one any more.
 * A shift still to come may be marked busy while it holds work; the Admin is
 * warned and the receptionist hands the work to someone else.
 */
export const validateMarkBusy = (cell: {
  phase: ShiftPhase;
  busy?: BusySchedule;
  work?: readonly ShiftWork[];
}): string | undefined => {
  if (cell.phase === 'past') {
    return 'Ca này đã kết thúc, không báo nghỉ được nữa.';
  }
  if (cell.busy) return 'Người này đã được báo nghỉ ca này.';
  if (cell.phase === 'current' && cell.work?.length) {
    return 'Ca đang diễn ra và đã có việc được giao, không báo nghỉ được nữa.';
  }
  return undefined;
};

/** Busy records of ended shifts stay as history */
export const validateClearBusy = (cell: {
  phase: ShiftPhase;
  busy?: BusySchedule;
}): string | undefined => {
  if (!cell.busy) return 'Ca này chưa được báo nghỉ.';
  if (cell.phase === 'past') {
    return 'Ca này đã kết thúc, giữ báo nghỉ làm lịch sử.';
  }
  return undefined;
};

export const buildBusySchedulePayload = (
  input: CreateBusySchedulePayload
): CreateBusySchedulePayload => {
  const reason = input.reason?.trim();
  if (reason && reason.length > BUSY_REASON_MAX) {
    throw new Error(`Lý do tối đa ${BUSY_REASON_MAX} ký tự.`);
  }
  return {
    staffId: input.staffId,
    date: input.date,
    shift: input.shift,
    ...(reason ? { reason } : {}),
  };
};
