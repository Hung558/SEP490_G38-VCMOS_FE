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
  note?: string | null;
  isOnline: boolean;
  checkedInAt?: string | null;
  derivedStatus: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CreateOnlineBookingPayload {
  petId: string;
  date: string;
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

export interface OnlineBookingDetailResponse {
  data: OnlineAppointment;
}
