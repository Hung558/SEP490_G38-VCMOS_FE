import type { Cage } from './cage.api';
import type { StaffAppointment } from './appointment.api';

export interface PopulatedAssignedByRef {
  _id: string;
  code?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  role?: string;
  status?: string;
}

export interface CageAssignment {
  _id: string;
  cageId: Cage | string;
  orderId: StaffAppointment | string;
  assignedById?: PopulatedAssignedByRef | string | null;
  assignedAt: string;
  releasedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface ListCageAssignmentsParams {
  cageId?: string;
  orderId?: string;
  active?: boolean;
}

export interface CreateCageAssignmentPayload {
  cageId: string;
  orderId: string;
}

export interface ListCageAssignmentsResponse {
  message?: string;
  count: number;
  data: CageAssignment[];
}

export interface CageAssignmentDetailResponse {
  message?: string;
  data: CageAssignment;
}

export interface CreateCageAssignmentResponse {
  message: string;
  data: CageAssignment;
}
