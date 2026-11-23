import api from '../01_axios';
import { AI_REQUEST_TIMEOUT_MS, buildAiAssessmentFormData } from './helpers';
import type {
  AiAssessment,
  AiAssessmentPage,
  AiAssessmentQuery,
  CreateAiAssessmentInput,
  CreateAiAssessmentResult,
} from './types';
import { apiAiAssessment, apiAiAssessments } from './urls';

type Options = { signal?: AbortSignal };

/**
 * POST /ai-assessments (PetOwner, own pet): the BE adds the pet's records and
 * the Active services, asks the AI (≤ 30 s), then saves the result.
 * 503/504 = MSG34, nothing saved.
 */
const createAssessment = (
  input: CreateAiAssessmentInput,
  options?: Options
): Promise<CreateAiAssessmentResult> =>
  api.post(apiAiAssessments, buildAiAssessmentFormData(input), {
    timeout: AI_REQUEST_TIMEOUT_MS,
    signal: options?.signal,
  });

/** GET /ai-assessments: the owner's history, newest first, `petId` populated */
const listAssessments = (
  query: AiAssessmentQuery,
  options?: Options
): Promise<AiAssessmentPage> =>
  api.get(apiAiAssessments, { params: query, signal: options?.signal });

/** GET /ai-assessments/:id: one check of the owner's own pet */
const getAssessment = (
  assessmentId: string,
  options?: Options
): Promise<{ assessment: AiAssessment }> =>
  api.get(apiAiAssessment(assessmentId), { signal: options?.signal });

const AiAssessmentService = {
  createAssessment,
  listAssessments,
  getAssessment,
};

export { createAssessment, listAssessments, getAssessment };
export default AiAssessmentService;
export * from './types';
export * from './helpers';
