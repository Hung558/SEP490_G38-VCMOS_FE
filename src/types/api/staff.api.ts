// GET /api/users/staff: clinical staff (Veterinarian, Groomer) that a
// receptionist can assign to a service

export type ClinicalStaffRole = 'Veterinarian' | 'Groomer';

export type StaffAccountStatus = 'Active' | 'Inactive' | 'Locked';

/** Ca làm việc của lịch báo bận (BE f19060f) */
export type StaffShift = 'MORNING' | 'AFTERNOON' | 'EVENING';

export interface StaffMember {
  _id: string;
  code: string;
  fullName: string;
  role: ClinicalStaffRole;
  status: StaffAccountStatus;
  specialty?: string | null;
}

export interface ListStaffParams {
  role?: ClinicalStaffRole;
  status?: StaffAccountStatus;
  search?: string;
  /** YYYY-MM-DD: leaves out staff who reported busy that day (BE f19060f) */
  workDate?: string;
  /** Same as workDate; with `time` or `shift` only that shift counts */
  date?: string;
  /** HH:mm: the shift is taken from this time */
  time?: string;
  shift?: StaffShift;
  /** Only the role this catalogue service needs (its requiredRole, else category) */
  serviceId?: string;
  page?: number;
  limit?: number;
}

export interface ListStaffResponse {
  items: StaffMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
