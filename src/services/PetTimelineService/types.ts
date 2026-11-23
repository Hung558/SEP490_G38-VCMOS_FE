import type { AiAssessment } from '../AiAssessmentService/types.ts';

export const PET_TIMELINE_TYPES = [
  'All',
  'Examination',
  'Vaccination',
  'Grooming',
  'Paraclinical',
  'Inpatient',
] as const;
export type PetTimelineType = (typeof PET_TIMELINE_TYPES)[number];
export const PET_TIMELINE_STATUSES = [
  'Booked',
  'CheckedIn',
  'InProgress',
  'WaitOwner',
  'Done',
  'Cancelled',
  'Overdue',
] as const;
export type PetTimelineStatus = (typeof PET_TIMELINE_STATUSES)[number];
export type PetTimelineInvoiceRole = 'PetOwner' | 'Receptionist' | 'Admin';
export interface PetTimelineQuery {
  type?: PetTimelineType;
  status?: PetTimelineStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
export interface PetTimelineRef {
  _id: string;
  code?: string;
  name?: string;
  fullName?: string;
  role?: string;
  label?: string;
  zone?: string;
  size?: string;
  maxWeightKg?: number;
  isIsolated?: boolean;
  status?: string;
  category?: string;
  defaultDuration?: number;
  basePrice?: number;
}
export type PetTimelineRefValue = PetTimelineRef | string | null;
export interface PetTimelineInvoiceItem {
  _id: string;
  type: string;
  refId: string;
  itemNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  subtotal: number;
}
export interface PetTimelineInvoice {
  _id: string;
  code: string;
  totalAmount: number;
  paymentMethod?: string | null;
  paymentStatus: 'Unpaid' | 'Paid' | 'Refunded';
  issuedAt?: string | null;
  paidAt?: string | null;
  vnpayTxnRef?: string | null;
  payosOrderCode?: number | null;
  issuedBy?: PetTimelineRefValue;
  items: PetTimelineInvoiceItem[];
}
export interface PetTimelineSoapRecord {
  _id: string;
  status: 'Draft' | 'Finalized' | string;
  subjectiveNote?: string;
  objectiveNote?: string;
  assessment?: string;
  plan?: string;
  notes?: string;
  prescriptions: Array<{
    _id?: string;
    productId: string;
    productNameSnapshot?: string;
    unitSnapshot?: string;
    dosage?: string;
    frequency?: string;
    durationDays?: number;
    instructions?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}
export interface PetTimelineServiceItem {
  _id: string;
  sequenceNo: number;
  status: string;
  isEmergency: boolean;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  queueNo?: number | null;
  cancelReason?: string | null;
  service: PetTimelineRefValue;
  assignedStaff: PetTimelineRefValue;
  medicalRecord: PetTimelineSoapRecord | null;
  groomingNote: {
    beforeNote?: string;
    afterNote?: string;
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
    recommendations?: string;
    createdAt?: string;
  } | null;
  subtasks: Array<{
    _id: string;
    taskType?: string | null;
    instructions?: string;
    resultText?: string | null;
    resultImageUrl?: string | null;
    status: string;
    completedAt?: string | null;
    service: PetTimelineRefValue;
    requestedBy: PetTimelineRefValue;
    assignedStaff: PetTimelineRefValue;
    createdAt?: string;
  }>;
}
export interface PetTimelineInpatientLog {
  _id: string;
  date: string;
  recordedBy: PetTimelineRefValue;
  observations?: string;
  notes?: string;
  createdAt?: string;
}
export interface PetTimelineInpatientRecord {
  _id: string;
  orderId: string;
  status: 'Admitted' | 'Discharged' | string;
  initialDiagnosis?: string;
  treatmentPlan?: string;
  admittedAt: string;
  dischargedAt?: string | null;
  daysAdmitted: number;
  attendingVet: PetTimelineRefValue;
  cage: PetTimelineRefValue;
  dailyLogsCount: number;
  dailyLogs: PetTimelineInpatientLog[];
  invoice: PetTimelineInvoice | null;
}
export interface PetTimelineMilestone {
  id: string;
  orderId: string;
  code: string;
  date: string;
  slotStart?: string | null;
  slotEnd?: string | null;
  isOnline: boolean;
  derivedStatus: PetTimelineStatus;
  statusLabel: string;
  checkedInAt?: string | null;
  note?: string | null;
  intake?: { symptoms?: string; initialCondition?: string } | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  categories: string[];
  currentCage: {
    assignmentId: string;
    assignedAt: string;
    cage: PetTimelineRefValue;
  } | null;
  services: PetTimelineServiceItem[];
  inpatientRecord: PetTimelineInpatientRecord | null;
  invoice: PetTimelineInvoice | null;
  canShareToCommunity: boolean;
  createdAt: string;
}
export interface PetTimelinePet {
  _id: string;
  code: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  coatColor?: string | null;
  photoUrl?: string | null;
  dob?: string | null;
  weight?: number | null;
  notes?: string | null;
  status: 'Active' | 'Deleted' | string;
  owner: PetTimelineRefValue;
}
export interface PetTimelineSummary {
  totalVisits: number;
  completedVisits: number;
  activeVisits: number;
  totalMedicalRecords: number;
  totalGroomingNotes: number;
  totalInpatientStays: number;
  hasActiveInpatient: boolean;
}
export interface PetTimelineSharedPost {
  _id: string;
  status: string;
  content: string;
  imageUrl?: string | null;
  timelineItems: Array<{ date?: string; title?: string; imageUrl?: string }>;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
}
/**
 * AI checks of the pet (BE PR #59): only the owner gets them, every other
 * role gets []. Not paged, newest first, without pet/owner/context fields.
 */
export type PetTimelineAiAssessment = Omit<
  AiAssessment,
  'petId' | 'ownerId' | 'petSnapshot' | 'clinicalContextSummary'
>;
export interface PetTimelinePage {
  pet: PetTimelinePet;
  summary: PetTimelineSummary;
  activeInpatient: PetTimelineInpatientRecord | null;
  sharedPosts: PetTimelineSharedPost[];
  /** Missing on a BE older than PR #59 */
  aiAssessments?: PetTimelineAiAssessment[];
  timeline: PetTimelineMilestone[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
