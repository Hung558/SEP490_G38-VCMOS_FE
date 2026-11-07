import type { OnlineAppointment } from './appointment.api';

export type AppointmentServiceStatus =
  | 'Booked'
  | 'Waiting'
  | 'InProgress'
  | 'Done'
  | 'Cancelled'
  | 'Overdue';

export interface PopulatedServiceRef {
  _id: string;
  name: string;
  code?: string;
  category?: string;
  defaultDuration?: number;
  basePrice?: number;
  description?: string;
  status?: string;
}

export interface PopulatedStaffRef {
  _id: string;
  fullName: string;
}

export type ServiceRef = string | PopulatedServiceRef;
export type StaffRef = string | PopulatedStaffRef | null;

export interface OnlineAppointmentService {
  _id: string;
  orderId: string;
  serviceId: ServiceRef;
  sequenceNo: number;
  preferredStaffId?: StaffRef;
  assignedStaffId?: StaffRef;
  status: AppointmentServiceStatus;
  isEmergency: boolean;
  queueNo?: number | null;
  enqueueAt?: string | null;
  dequeueAt?: string | null;
  groomingNote?: {
    beforeNote?: string;
    afterNote?: string;
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
    recommendations?: string;
    createdAt?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CreateOnlineAppointmentServicePayload {
  orderId: string;
  serviceId: string;
  sequenceNo?: number;
  isEmergency?: boolean;
}

export interface CreateOnlineAppointmentServiceResponse {
  message: string;
  data: OnlineAppointmentService;
}

export interface CreateOnlineBookingServiceItem {
  serviceId: string;
  sequenceNo?: number;
  isEmergency?: boolean;
}

export interface CreateCombinedOnlineBookingPayload {
  petId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  services: CreateOnlineBookingServiceItem[];
}

export interface CreateCombinedOnlineBookingResponse {
  message: string;
  data: {
    appointment: OnlineAppointment;
    services: OnlineAppointmentService[];
  };
}
