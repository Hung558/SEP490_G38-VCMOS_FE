import type { OnlineAppointmentService } from './appointment-service.api';
import type { CageAssignment } from './cage-assignment.api';

export type AppointmentStatus =
  | 'Booked'
  | 'CheckedIn'
  | 'InProgress'
  | 'WaitOwner'
  | 'Done'
  | 'Cancelled'
  | 'Overdue';

export interface OnlineAppointment {
  _id: string;
  code: string;
  petId: string;
  ownerId: string;
  date: string; // YYYY-MM-DD
  slotStart?: string | null;
  slotEnd?: string | null;
  note?: string | null;
  isOnline: boolean;
  checkedInAt?: string | null;
  derivedStatus: AppointmentStatus;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?:
    | string
    | { _id: string; fullName?: string; role?: string }
    | null;
  services?: OnlineAppointmentService[];
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CreateOnlineBookingPayload {
  petId: string;
  date: string;
  slotStart?: string;
  note?: string;
}

export interface CreateOnlineBookingResponse {
  message: string;
  data: OnlineAppointment;
}

export interface ListMyOnlineBookingsParams {
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListMyOnlineBookingsResponse {
  data: OnlineAppointment[];
  pagination: AppointmentPagination;
}

export interface OnlineAppointmentDetail extends OnlineAppointment {
  services: OnlineAppointmentService[];
}

export interface OnlineBookingDetailResponse {
  data: OnlineAppointmentDetail;
}

export interface PopulatedPetRef {
  _id: string;
  name: string;
  weight?: number | null;
}

export interface PopulatedOwnerRef {
  _id: string;
  fullName: string;
  phone: string;
}

/** Phiếu tiếp nhận của lễ tân, tách riêng khỏi bệnh án SOAP. */
export interface ReceptionIntake {
  symptoms: string;
  initialCondition: string;
}

export interface RecordedReceptionIntake extends ReceptionIntake {
  recordedBy?: string | null;
  recordedAt?: string | null;
}

export interface StaffAppointment {
  _id: string;
  code: string;
  petId: PopulatedPetRef | string;
  ownerId: PopulatedOwnerRef | string;
  date: string; // YYYY-MM-DD
  slotStart?: string | null;
  slotEnd?: string | null;
  note?: string | null;
  isOnline: boolean;
  derivedStatus: AppointmentStatus;
  checkedInAt?: string | null;
  intake?: RecordedReceptionIntake | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?:
    | string
    | { _id: string; fullName?: string; role?: string }
    | null;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface ListStaffAppointmentsParams {
  status?: AppointmentStatus;
  isOnline?: boolean;
  ownerId?: string;
  petId?: string;
  code?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface ListStaffAppointmentsResponse {
  data: StaffAppointment[];
  pagination: AppointmentPagination;
}

export interface ReceptionCageSelection {
  cageId?: string;
  requiresIsolation?: boolean;
}

export interface CheckInAppointmentPayload extends ReceptionCageSelection {
  intake?: ReceptionIntake;
}

export interface CheckInAppointmentResponse {
  message: string;
  data: StaffAppointment & { cageAssignment?: CageAssignment | null };
}

export interface CancelAppointmentPayload {
  reason: string;
}

export interface CancelAppointmentResponse {
  message: string;
  data: OnlineAppointment | StaffAppointment;
}
