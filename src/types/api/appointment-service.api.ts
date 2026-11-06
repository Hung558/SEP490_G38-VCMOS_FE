export type AppointmentServiceStatus =
  | 'Booked'
  | 'Waiting'
  | 'InProgress'
  | 'Done'
  | 'Cancelled'
  | 'Overdue';

export interface OnlineAppointmentService {
  _id: string;
  orderId: string;
  serviceId: string;
  sequenceNo: number;
  preferredStaffId?: string | null;
  assignedStaffId?: string | null;
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
