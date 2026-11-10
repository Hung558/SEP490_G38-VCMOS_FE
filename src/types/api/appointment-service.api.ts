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
  // The staff endpoints (list by order, assign-staff) also populate these
  code?: string;
  role?: string;
  status?: string;
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

/** GET /api/appointment-services?orderId= (Receptionist, Admin), sorted by sequenceNo */
export interface ListOrderServicesResponse {
  message: string;
  data: OnlineAppointmentService[];
}

/** PATCH /api/appointment-services/:id/assign-staff (Receptionist) */
export interface AssignStaffResponse {
  message: string;
  data: OnlineAppointmentService;
}

/** The whole appointment order, populated in my-queue; its petId and ownerId are not */
export interface QueueOrderRef {
  _id: string;
  code: string;
  petId: string;
  ownerId: string;
  date: string; // YYYY-MM-DD
  note?: string | null;
  isOnline: boolean;
  derivedStatus: string;
  checkedInAt?: string | null;
}

export interface MyQueueItem extends Omit<OnlineAppointmentService, 'orderId'> {
  orderId: QueueOrderRef | string;
}

/** GET /api/appointment-services/my-queue (Veterinarian, Groomer): emergencies first */
export interface ListMyQueueResponse {
  message: string;
  data: MyQueueItem[];
}
