// Clinical exam and SOAP medical record (SCR-23, UC-32, UC-36, UC-37):
// /api/medical-records. These endpoints answer with the object itself, not
// wrapped in { message, data }.
import type { AppointmentServiceStatus } from './appointment-service.api';
import type { RecordedReceptionIntake } from './appointment.api';
import type { CageAssignment } from './cage-assignment.api';
import type { Pet } from './pet.api';

/** Draft until the invoice is paid (BR-14); only Finalized locks the record */
export type MedicalRecordStatus = 'Draft' | 'Finalized';

export interface Prescription {
  _id?: string;
  productId: string;
  productNameSnapshot?: string;
  unitSnapshot?: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  durationDays?: number;
}

export interface MedicalRecordPetRef {
  _id: string;
  code?: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  weight?: number | null;
  ownerId?: string;
}

export interface MedicalRecordServiceRef {
  _id: string;
  status?: AppointmentServiceStatus;
  sequenceNo?: number;
  serviceId?:
    | string
    | { _id: string; code?: string; name: string; category?: string };
  assignedStaffId?:
    | string
    | { _id: string; code?: string; fullName: string; role?: string }
    | null;
  orderId?:
    | string
    | {
        _id: string;
        code: string;
        date: string;
        derivedStatus?: string;
        note?: string | null;
        intake?: RecordedReceptionIntake | null;
      };
}

export interface MedicalRecord {
  _id: string;
  appointmentServiceId: MedicalRecordServiceRef | string;
  petId: MedicalRecordPetRef | string;
  subjectiveNote?: string;
  objectiveNote?: string;
  assessment?: string;
  plan?: string;
  notes?: string;
  prescriptions: Prescription[];
  status: MedicalRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionInput {
  productId: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  durationDays: number;
}

/** PUT /medical-records/service/:id; the four SOAP fields are sent even when empty */
export interface SaveMedicalRecordPayload {
  subjectiveNote?: string;
  objectiveNote?: string;
  assessment?: string;
  plan?: string;
  notes?: string;
  weight?: number;
  prescriptions?: PrescriptionInput[];
}

/** POST /medical-records/service/:id/complete; needs all four SOAP fields (BR-13) */
export interface CompleteMedicalRecordPayload extends SaveMedicalRecordPayload {
  waitingCageId?: string | null;
}

export interface StartConsultationResponse {
  appointmentService: { _id: string; status: AppointmentServiceStatus };
  medicalRecord: MedicalRecord;
  /** The waiting cage the BE released automatically when the exam started (BR-10) */
  releasedCageAssignment: CageAssignment | null;
}

export interface CompleteConsultationResponse {
  medicalRecord: MedicalRecord;
  appointmentService: { _id: string; status: AppointmentServiceStatus };
  /** WaitOwner once every service of the order is done (BR-09) */
  appointmentOrder: { _id: string; code: string; derivedStatus: string };
  waitingCageAssignment: CageAssignment | null;
}

export interface PetMedicalHistoryResponse {
  pet: Pet;
  /** Newest first */
  records: MedicalRecord[];
}
