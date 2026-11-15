import type {
  BusySchedule,
  CreateBusySchedulePayload,
} from '../../types/api/staff-schedule.api';
import type { StaffShift } from '../../types/api/staff.api';

/** The three shifts of the BE busy schedule (staffSchedule.service SHIFT_LABELS) */
export const SHIFT_INFO: readonly {
  key: StaffShift;
  label: string;
  time: string;
}[] = [
  { key: 'MORNING', label: 'Sáng', time: '08:00–12:00' },
  { key: 'AFTERNOON', label: 'Chiều', time: '12:00–17:00' },
  { key: 'EVENING', label: 'Tối', time: '17:00–21:00' },
];

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
