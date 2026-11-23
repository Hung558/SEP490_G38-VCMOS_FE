// Shapes from BE api/ai-assessments/ai-assessments.md (PR #59, #60)

export type AiUrgencyLevel = 'Routine' | 'Monitor' | 'Urgent';

/** Filter of the history list: one level or all of them */
export type AiUrgencyFilter = AiUrgencyLevel | 'All';

/** A clinic service the AI picked from the Active catalog */
export interface AiRecommendedService {
  serviceId: string | null;
  code: string | null;
  name: string;
  category: string | null;
  basePrice: number | null;
  reason: string;
}

/** `petId` as GET list/detail populate it */
export interface AiAssessmentPetRef {
  _id: string;
  code?: string;
  name?: string;
  species?: string;
  breed?: string;
  weight?: number;
  photoUrl?: string;
}

export interface AiPetSnapshot {
  code: string | null;
  name: string | null;
  species: string | null;
  breed: string | null;
  coatColor: string | null;
  dob: string | null;
  ageText: string | null;
  weight: number | null;
  notes: string | null;
}

/** What the BE read from the pet's records before asking the AI */
export interface AiClinicalContextSummary {
  recentVisitsCount: number;
  recentMedicalRecordsCount: number;
  recentInpatientStaysCount: number;
  hasActiveInpatient: boolean;
  lastDiagnosis: string | null;
  knownAllergiesOrNotes: string | null;
}

export interface AiAssessment {
  _id: string;
  /** A plain id in the POST answer; populated in GET list/detail */
  petId?: string | AiAssessmentPetRef;
  ownerId?: string;
  petSnapshot?: AiPetSnapshot;
  symptoms: string[];
  description: string;
  imageUrls: string[];
  urgency: AiUrgencyLevel;
  recommendedTimeframe: string;
  summary: string;
  redFlags: string[];
  visualFindings: string[];
  possibleCauses: string[];
  advice: string[];
  contraindications: string[];
  recommendedServices: AiRecommendedService[];
  clinicalContextSummary?: AiClinicalContextSummary;
  /** Goes straight into the booking note (≤ 500 characters) */
  bookingNoteDraft: string;
  /** MSG33 */
  disclaimer: string;
  aiProvider?: 'gemini' | 'groq' | string;
  aiModel?: string;
  responseTimeMs?: number;
  createdAt: string;
  updatedAt?: string;
}

/** What a result view needs: also fits the timeline copy, which has no pet fields */
export type AiAssessmentView = Omit<
  AiAssessment,
  'petId' | 'ownerId' | 'petSnapshot'
>;

/** The form: photos are the files the owner picked */
export interface CreateAiAssessmentInput {
  petId: string;
  description: string;
  symptoms: string[];
  photos: File[];
}

export interface CreateAiAssessmentResult {
  message: string;
  assessment: AiAssessment;
}

export interface AiAssessmentQuery {
  petId?: string;
  urgency?: AiUrgencyLevel;
  page?: number;
  limit?: number;
}

export interface AiAssessmentPage {
  items: AiAssessment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Form field the BE (or the FE check) found wrong */
export type AiAssessmentField = 'petId' | 'description' | 'symptoms' | 'photos';

export type AiAssessmentFieldErrors = Partial<
  Record<AiAssessmentField, string>
>;

export interface AiAssessmentApiError {
  status?: number;
  message: string;
  fields: AiAssessmentFieldErrors;
  /**
   * The AI was busy or slow (503/504, FE timeout, no connection): nothing was
   * saved and the same form can be sent again (MSG34)
   */
  retryable: boolean;
}
