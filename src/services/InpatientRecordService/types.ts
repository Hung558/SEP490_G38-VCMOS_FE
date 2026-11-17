export type InpatientStatus = 'Admitted' | 'Discharged';

type Ref<T> = (T & { _id: string }) | string | null;

export interface InpatientLog {
  _id: string;
  date: string;
  observations?: string;
  notes?: string;
  recordedById: Ref<{ fullName: string }>;
  createdAt: string;
}

export interface OwnerInpatientLog extends InpatientLog {
  inpatientRecordId: string;
}

export interface InpatientRecord {
  _id: string;
  petId: Ref<{ name: string; code?: string; species?: string }>;
  attendingVetId: Ref<{ fullName: string }>;
  cageId: Ref<{ label: string }>;
  orderId: Ref<{ code: string; date?: string; derivedStatus?: string }>;
  initialDiagnosis?: string;
  treatmentPlan?: string;
  admittedAt: string;
  dischargedAt?: string | null;
  status: InpatientStatus;
}

export interface InpatientPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdmitInpatientPayload {
  petId: string;
  orderId: string;
  cageId: string;
  initialDiagnosis?: string;
  treatmentPlan?: string;
}

export interface InpatientLogPayload {
  date?: string;
  observations?: string;
  notes?: string;
}

type PageQuery = { page?: number; limit?: number };

export type InpatientRecordsQuery = PageQuery & {
  status?: InpatientStatus;
  petId?: string;
  mine?: boolean;
};

export type OwnerInpatientLogsQuery = PageQuery & {
  date?: string;
  from?: string;
  to?: string;
  recordId?: string;
};
