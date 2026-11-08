// Walk-in at the reception desk (SCR-18, UC-19…21, BR-04):
// GET  /api/appointment-orders/walk-in/customer-lookup?phone=
// POST /api/appointment-orders/walk-in
import type { OnlineAppointment } from './appointment.api';
import type { OnlineAppointmentService } from './appointment-service.api';
import type { CageAssignment } from './cage-assignment.api';
import type { Pet } from './pet.api';

export interface WalkInCustomer {
  _id: string;
  code: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: string;
  /** Inactive = walk-in account the customer has not activated online yet (BR-04) */
  status: 'Active' | 'Inactive' | 'Locked';
}

export interface WalkInLookupResult {
  found: boolean;
  customer: WalkInCustomer | null;
  /** Only the customer's Active pets */
  pets: Pet[];
}

export interface WalkInLookupResponse {
  message: string;
  data: WalkInLookupResult;
}

export interface WalkInPetInfo {
  name: string;
  species?: string;
  breed?: string;
  weight?: number;
  coatColor?: string;
  /** YYYY-MM-DD, not in the future */
  dob?: string;
  notes?: string;
}

export interface WalkInServiceItem {
  serviceId: string;
  /** Set it and the service goes straight to that staff member's queue */
  assignedStaffId?: string;
  isEmergency?: boolean;
}

/** Send either petId (a pet the customer already has) or petInfo (a new pet), never both */
export interface CreateWalkInBookingPayload {
  phone: string;
  /** Required when the phone is not in the system yet */
  fullName?: string;
  email?: string;
  petId?: string;
  petInfo?: WalkInPetInfo;
  note?: string;
  services: WalkInServiceItem[];
  cageId?: string;
}

export interface CreateWalkInBookingResult {
  isNewCustomer: boolean;
  customer: WalkInCustomer;
  isNewPet: boolean;
  pet: Pet;
  /** Starts as CheckedIn, isOnline false */
  appointment: OnlineAppointment;
  services: OnlineAppointmentService[];
  cageAssignment: CageAssignment | null;
}

export interface CreateWalkInBookingResponse {
  message: string;
  data: CreateWalkInBookingResult;
}
