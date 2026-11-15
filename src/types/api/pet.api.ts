import type {
  AppointmentStatus,
  RecordedReceptionIntake,
} from './appointment.api';

export interface Pet {
  _id: string;
  code: string;
  ownerId: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  coatColor?: string | null;
  notes?: string | null;
  dob?: string | null;
  weight?: number | null;
  photoUrl?: string | null;
  status: 'Active' | 'Deleted';
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export type PetStatusFilter = 'Active' | 'Deleted' | 'All';

export interface ListPetsParams {
  status?: PetStatusFilter;
  page?: number;
  limit?: number;
}

export interface ListPetsResponse {
  items: Pet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePetPayload {
  name: string;
  species?: string;
  breed?: string;
  coatColor?: string;
  notes?: string;
  dob?: string;
  weight?: number | string;
  photo?: File;
}

export interface UpdatePetPayload {
  name?: string;
  species?: string;
  breed?: string;
  coatColor?: string;
  notes?: string;
  dob?: string;
  weight?: number | string;
  photo?: File;
}

/** One visit of the pet as GET /pets/:petId lists it (cancelled ones left out) */
export interface PetAppointmentNote {
  _id: string;
  code: string;
  date: string; // YYYY-MM-DD
  slotStart?: string | null;
  isOnline?: boolean;
  derivedStatus: AppointmentStatus;
  note?: string | null;
  intake?: RecordedReceptionIntake | null;
  checkedInAt?: string | null;
  createdAt?: string;
}

export interface PetDetailResponse {
  pet: Pet;
  /** Newest first; the visits of the pet timeline */
  appointmentNotes?: PetAppointmentNote[];
}

export interface DeletePetResponse {
  message: string;
  pet: Pet;
}
