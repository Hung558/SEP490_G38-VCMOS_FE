import type {
  ClinicalStaffRole,
  StaffAccountStatus,
  StaffShift,
} from './staff.api';

/**
 * One busy shift of a vet or groomer (BE f19060f, "blacklist"): staff work every
 * shift by default and only the shifts they cannot work are stored.
 */
export interface BusySchedule {
  _id: string;
  staffId:
    | string
    | {
        _id: string;
        code?: string;
        fullName?: string;
        role?: ClinicalStaffRole;
        status?: StaffAccountStatus;
      };
  date: string; // YYYY-MM-DD
  shift: StaffShift;
  reason?: string;
  createdBy?:
    | string
    | { _id: string; code?: string; fullName?: string; role?: string };
  createdAt?: string;
}

export interface ListBusySchedulesParams {
  staffId?: string;
  date?: string;
  from?: string;
  to?: string;
  shift?: StaffShift;
}

export interface ListBusySchedulesResponse {
  message: string;
  data: BusySchedule[];
}

export interface CreateBusySchedulePayload {
  staffId: string;
  date: string;
  shift: StaffShift;
  reason?: string;
}

/** A Waiting/InProgress service of the staff member in the shift just marked busy */
export interface BusyScheduleConflict {
  appointmentServiceId: string;
  orderId: string;
  orderCode: string;
  serviceName: string;
  status: string;
  scheduledStart: string | null;
}

export interface CreateBusyScheduleResponse {
  message: string;
  data: BusySchedule;
  warning: string | null;
  conflictingServices: BusyScheduleConflict[];
}
