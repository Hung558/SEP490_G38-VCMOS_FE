// GET /api/users/staff: clinical staff (Veterinarian, Groomer) that a
// receptionist can assign to a service

export type ClinicalStaffRole = 'Veterinarian' | 'Groomer';

export type StaffAccountStatus = 'Active' | 'Inactive' | 'Locked';

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
  /** YYYY-MM-DD: only staff with a work schedule (StaffSchedule) on that day */
  workDate?: string;
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
