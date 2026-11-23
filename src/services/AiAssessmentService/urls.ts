// AI health check (BE PR #59, #60; UC-14, SCR-10). PetOwner only: every other
// role gets 403 on all three routes.

/** POST: run a new check (multipart, 0–3 photos); GET: the owner's history */
export const apiAiAssessments = '/ai-assessments';

/** GET: one check of the owner's own pet */
export const apiAiAssessment = (assessmentId: string) =>
  `/ai-assessments/${encodeURIComponent(assessmentId)}`;
