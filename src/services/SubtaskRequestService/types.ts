import type { ClinicalStaffRole, ReceptionIntake } from '@/types';

export type SubtaskStatus = 'Pending' | 'InProgress' | 'Completed';
type Ref<T> = string | ({ _id: string } & T) | null;
type StaffRef = Ref<{
  fullName?: string;
  code?: string;
  role?: ClinicalStaffRole;
}>;

export interface SubtaskRequest {
  _id: string;
  appointmentServiceId: Ref<{
    orderId: Ref<{
      code?: string;
      date?: string;
      note?: string;
      intake?: ReceptionIntake | null;
      petId?: Ref<{ name?: string }>;
    }>;
    serviceId?: Ref<{ name?: string }>;
  }>;
  assignedStaffId: StaffRef;
  requestedById: StaffRef;
  taskType: string;
  instructions?: string;
  status: SubtaskStatus;
  resultText?: string;
  resultImageUrl?: string;
  completedAt?: string | null;
}

export interface CreateSubtask {
  appointmentServiceId: string;
  assignedStaffId: string;
  taskType: string;
  instructions?: string;
}

export interface SubtaskResult {
  resultText?: string;
  resultImage?: File;
}
