import type {
  ClinicalStaffRole,
  StaffMember,
  StaffShift,
} from '../../../types/api/staff.api';

export const DUTY_SHIFTS: readonly StaffShift[] = [
  'MORNING',
  'AFTERNOON',
  'EVENING',
];

export const DUTY_SHIFT_LABEL: Record<StaffShift, string> = {
  MORNING: 'Sáng',
  AFTERNOON: 'Chiều',
  EVENING: 'Tối',
};

export type ShiftAvailability = Record<StaffShift, boolean>;
export type DutyMap = Record<string, ShiftAvailability>;
export type RoleFilter = 'ALL' | ClinicalStaffRole;
export type ShiftFilter = 'ALL' | StaffShift;

/**
 * Staff are free by default and only report busy shifts (StaffSchedule is a
 * blacklist). GET /users/staff?workDate&shift leaves out whoever reported busy
 * in that shift, so a member missing from a shift's list is busy then.
 */
export const buildDutyMap = (
  staff: StaffMember[],
  freeByShift: Record<StaffShift, StaffMember[]>
): DutyMap => {
  const freeIds = Object.fromEntries(
    DUTY_SHIFTS.map(shift => [
      shift,
      new Set((freeByShift[shift] || []).map(member => member._id)),
    ])
  ) as Record<StaffShift, Set<string>>;

  return Object.fromEntries(
    staff.map(member => [
      member._id,
      Object.fromEntries(
        DUTY_SHIFTS.map(shift => [shift, freeIds[shift].has(member._id)])
      ) as ShiftAvailability,
    ])
  );
};

export const filterByShift = (
  staff: StaffMember[],
  duty: DutyMap,
  shift: ShiftFilter
): StaffMember[] =>
  shift === 'ALL'
    ? staff
    : staff.filter(member => duty[member._id]?.[shift] === true);

export const countByRole = (
  staff: StaffMember[]
): Record<RoleFilter, number> => ({
  ALL: staff.length,
  Veterinarian: staff.filter(member => member.role === 'Veterinarian').length,
  Groomer: staff.filter(member => member.role === 'Groomer').length,
});

/**
 * Vets are shown as "BS. <name>", unless the account name already carries the
 * title (some accounts are named "BS Trần Minh")
 */
export const getStaffDisplayName = (member: StaffMember): string => {
  const name = member.fullName.trim();
  if (member.role !== 'Veterinarian') return name;
  return /^(bs\.?|bác sĩ)(\s|$)/iu.test(name) ? name : `BS. ${name}`;
};

/** '2026-11-24' -> '24/11' */
export const formatDayMonth = (ymd: string): string => {
  const [, month, day] = ymd.split('-');
  return day && month ? `${day}/${month}` : ymd;
};
