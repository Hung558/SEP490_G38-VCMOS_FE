// Pure helpers (no @/ imports) so node:test can load this file directly
import type {
  AiAssessment,
  AiAssessmentApiError,
  AiAssessmentField,
  AiAssessmentFieldErrors,
  AiAssessmentQuery,
  AiClinicalContextSummary,
  AiUrgencyFilter,
  AiUrgencyLevel,
  CreateAiAssessmentInput,
} from './types.ts';

// Limits from the BE (aiAssessment.validator, upload.middleware)
export const AI_DESCRIPTION_MIN_LENGTH = 10;
export const AI_DESCRIPTION_MAX_LENGTH = 1000;
export const AI_MAX_PHOTOS = 3;
export const AI_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const AI_MAX_SYMPTOMS = 20;
export const AI_MAX_SYMPTOM_LENGTH = 100;
export const AI_PHOTO_TYPES = ['image/jpeg', 'image/png'];
export const AI_PHOTO_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';
// The BE gives the AI providers 30 s in all; its doc asks the FE to wait 35 s
export const AI_REQUEST_TIMEOUT_MS = 35000;
export const AI_HISTORY_PAGE_SIZE = 5;

/** MSG34: the AI did not answer, nothing was saved */
export const AI_BUSY_MESSAGE = 'Dịch vụ AI đang bận. Vui lòng thử lại sau.';
/** MSG33: shown with every result (BR-20) */
export const AI_DISCLAIMER =
  'Kết quả AI chỉ mang tính tham khảo và không thay thế chẩn đoán của bác sĩ thú y.';

/** The 7 codes the BE knows, with the labels it puts in the prompt */
export const AI_SYMPTOM_OPTIONS: ReadonlyArray<{
  code: string;
  label: string;
}> = [
  { code: 'lethargy', label: 'Ủ rũ / Mệt mỏi (Lethargy)' },
  { code: 'vomiting', label: 'Nôn mửa (Vomiting)' },
  { code: 'diarrhoea', label: 'Tiêu chảy (Diarrhoea)' },
  { code: 'loss_of_appetite', label: 'Chán ăn / Bỏ ăn (Loss of appetite)' },
  { code: 'scratching', label: 'Gãi nhiều / Ngứa da (Scratching)' },
  { code: 'coughing', label: 'Ho / Khò khè (Coughing)' },
  { code: 'limping', label: 'Đi khập khiễng (Limping)' },
];

/** Label of a code; a symptom the owner typed is shown as typed */
export const symptomLabel = (value: string): string =>
  AI_SYMPTOM_OPTIONS.find(option => option.code === value)?.label ?? value;

export const cleanSymptomText = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const symptomKey = (value: string) => cleanSymptomText(value).toLowerCase();

/**
 * Ticked codes first, then what the owner typed, without blanks or
 * case-insensitive duplicates (the BE dedupes the same way)
 */
export const mergeSymptoms = (codes: string[], custom: string[]): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...codes, ...custom]) {
    const clean = cleanSymptomText(raw);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    merged.push(clean);
  }
  return merged;
};

export type AddCustomSymptomResult =
  | { ok: true; custom: string[] }
  | { ok: false; error: string };

/** Adds one typed symptom to the owner's list, or says why it cannot */
export const addCustomSymptom = (
  custom: string[],
  codes: string[],
  raw: string
): AddCustomSymptomResult => {
  const clean = cleanSymptomText(raw);
  if (!clean) return { ok: false, error: 'Nhập triệu chứng trước khi thêm' };
  if (clean.length > AI_MAX_SYMPTOM_LENGTH) {
    return {
      ok: false,
      error: `Mỗi triệu chứng tối đa ${AI_MAX_SYMPTOM_LENGTH} ký tự`,
    };
  }
  const key = clean.toLowerCase();
  const taken = [
    ...custom.map(symptomKey),
    ...codes.map(symptomKey),
    ...codes.map(code => symptomKey(symptomLabel(code))),
  ];
  if (taken.includes(key)) {
    return { ok: false, error: 'Triệu chứng này đã có trong danh sách' };
  }
  if (mergeSymptoms(codes, custom).length >= AI_MAX_SYMPTOMS) {
    return {
      ok: false,
      error: `Chỉ được nhập tối đa ${AI_MAX_SYMPTOMS} triệu chứng`,
    };
  }
  return { ok: true, custom: [...custom, clean] };
};

type PhotoLike = { name?: string; type?: string; size?: number };

/** MSG35 when a photo is not a JPG/PNG of at most 5 MB, otherwise null */
export const validateAiPhoto = (file: PhotoLike): string | null => {
  const type = (file.type || '').toLowerCase();
  const byName = /\.(jpe?g|png)$/i.test(file.name || '');
  if (type ? !AI_PHOTO_TYPES.includes(type) : !byName) {
    return 'Chỉ chấp nhận ảnh định dạng JPG hoặc PNG (MSG35)';
  }
  if (!file.size) return 'Tệp ảnh không hợp lệ hoặc bị rỗng';
  if (file.size > AI_MAX_PHOTO_BYTES) {
    return 'Chỉ chấp nhận ảnh dung lượng tối đa 5MB mỗi ảnh (MSG35)';
  }
  return null;
};

/** The same checks as the BE validator, before anything is sent */
export const validateAiAssessmentInput = (input: {
  petId?: string | null;
  description: string;
  symptoms: string[];
  photos: PhotoLike[];
}): AiAssessmentFieldErrors => {
  const errors: AiAssessmentFieldErrors = {};
  if (!input.petId) errors.petId = 'Vui lòng chọn thú cưng cần đánh giá';
  const description = input.description.trim();
  if (!description) {
    errors.description = 'Mô tả chi tiết triệu chứng là bắt buộc';
  } else if (
    description.length < AI_DESCRIPTION_MIN_LENGTH ||
    description.length > AI_DESCRIPTION_MAX_LENGTH
  ) {
    errors.description = `Mô tả triệu chứng phải từ ${AI_DESCRIPTION_MIN_LENGTH} đến ${AI_DESCRIPTION_MAX_LENGTH} ký tự`;
  }
  if (input.symptoms.length > AI_MAX_SYMPTOMS) {
    errors.symptoms = `Chỉ được nhập tối đa ${AI_MAX_SYMPTOMS} triệu chứng`;
  }
  if (input.photos.length > AI_MAX_PHOTOS) {
    errors.photos = `Chỉ được tải lên tối đa ${AI_MAX_PHOTOS} ảnh (MSG35)`;
  } else {
    const photoError = input.photos.map(validateAiPhoto).find(Boolean);
    if (photoError) errors.photos = photoError;
  }
  return errors;
};

/** Multipart body of POST /ai-assessments; symptoms go as a JSON string */
export const buildAiAssessmentFormData = (
  input: CreateAiAssessmentInput
): FormData => {
  const body = new FormData();
  body.append('petId', input.petId);
  body.append('description', input.description.trim());
  body.append('symptoms', JSON.stringify(input.symptoms));
  input.photos.forEach(photo => body.append('photos', photo, photo.name));
  return body;
};

export const AI_URGENCY_LEVELS: readonly AiUrgencyLevel[] = [
  'Urgent',
  'Monitor',
  'Routine',
];

export interface AiUrgencyMeta {
  /** Short Vietnamese name, with the BE value after it */
  label: string;
  /** antd Tag colour */
  color: string;
  tone: 'urgent' | 'monitor' | 'routine';
}

export const AI_URGENCY_META: Record<AiUrgencyLevel, AiUrgencyMeta> = {
  Urgent: { label: 'Khẩn cấp (Urgent)', color: 'red', tone: 'urgent' },
  Monitor: {
    label: 'Cần theo dõi (Monitor)',
    color: 'orange',
    tone: 'monitor',
  },
  Routine: { label: 'Thông thường (Routine)', color: 'green', tone: 'routine' },
};

export const aiUrgencyMeta = (urgency?: string | null): AiUrgencyMeta =>
  AI_URGENCY_META[urgency as AiUrgencyLevel] ?? {
    label: urgency || 'Chưa rõ',
    color: 'default',
    tone: 'routine',
  };

export const AI_URGENCY_FILTERS: ReadonlyArray<{
  value: AiUrgencyFilter;
  label: string;
}> = [
  { value: 'All', label: 'Tất cả' },
  { value: 'Urgent', label: 'Khẩn cấp' },
  { value: 'Monitor', label: 'Cần theo dõi' },
  { value: 'Routine', label: 'Thông thường' },
];

/** Query of the history list of one pet */
export const buildAiHistoryQuery = (
  petId: string,
  urgency: AiUrgencyFilter,
  page: number
): AiAssessmentQuery => ({
  petId,
  ...(urgency === 'All' ? {} : { urgency }),
  page: Math.max(1, Math.floor(page) || 1),
  limit: AI_HISTORY_PAGE_SIZE,
});

const FIELDS: AiAssessmentField[] = [
  'petId',
  'description',
  'symptoms',
  'photos',
];

/**
 * What to tell the owner after a failed call. 503/504, an FE timeout or no
 * connection mean the AI did not answer and nothing was saved (MSG34), so the
 * form stays as it is for another try.
 */
export const readAiAssessmentError = (
  failure: unknown,
  fallback: string
): AiAssessmentApiError => {
  const error = failure as {
    code?: string;
    response?: {
      status?: number;
      data?: { message?: unknown; errors?: unknown };
    };
  };
  const status = error?.response?.status;
  const body = error?.response?.data;
  const fields: AiAssessmentFieldErrors = {};
  if (body?.errors && typeof body.errors === 'object') {
    for (const field of FIELDS) {
      const value = (body.errors as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.trim()) fields[field] = value;
    }
  }
  const bodyMessage =
    typeof body?.message === 'string' && body.message.trim()
      ? body.message
      : '';
  if (!error?.response) {
    const timedOut =
      error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
    return {
      status,
      message: timedOut
        ? AI_BUSY_MESSAGE
        : 'Không kết nối được máy chủ. Vui lòng thử lại.',
      fields,
      retryable: true,
    };
  }
  if (status === 503 || status === 504) {
    return {
      status,
      message: bodyMessage || AI_BUSY_MESSAGE,
      fields,
      retryable: true,
    };
  }
  const firstField = Object.values(fields)[0];
  return {
    status,
    message:
      (status === 400 && firstField) || bodyMessage || firstField || fallback,
    fields,
    retryable: false,
  };
};

/** Lines that say what the AI compared the symptoms with */
export const describeClinicalContext = (
  context?: AiClinicalContextSummary | null
): string[] => {
  if (!context) return [];
  const lines: string[] = [];
  const visits = context.recentVisitsCount || 0;
  const records = context.recentMedicalRecordsCount || 0;
  const stays = context.recentInpatientStaysCount || 0;
  lines.push(
    visits || records || stays
      ? `Đã đối chiếu ${visits} lượt khám, ${records} bệnh án và ${stays} lần nội trú gần đây của bé`
      : 'Bé chưa có bệnh án ở phòng khám; AI dựa trên hồ sơ thú cưng và mô tả của bạn'
  );
  if (context.hasActiveInpatient) lines.push('Bé đang nội trú tại phòng khám');
  if (context.lastDiagnosis) {
    lines.push(`Chẩn đoán gần nhất: ${context.lastDiagnosis}`);
  }
  if (context.knownAllergiesOrNotes) {
    lines.push(`Lưu ý trên hồ sơ: ${context.knownAllergiesOrNotes}`);
  }
  return lines;
};

export const assessmentPetId = (
  assessment: AiAssessment
): string | undefined =>
  typeof assessment.petId === 'string'
    ? assessment.petId
    : assessment.petId?._id;

export const assessmentPetName = (assessment: AiAssessment): string => {
  const populated =
    typeof assessment.petId === 'object' ? assessment.petId?.name : undefined;
  return populated || assessment.petSnapshot?.name || 'thú cưng';
};

/** First suggested service that exists in the catalog, for "Đặt lịch khám ngay" */
export const pickBookingServiceId = (
  assessment: Pick<AiAssessment, 'recommendedServices'>
): string | undefined =>
  assessment.recommendedServices?.find(service => !!service.serviceId)
    ?.serviceId ?? undefined;

/** Only plain http(s) links are shown as images */
export const safeAiImageUrls = (urls?: string[] | null): string[] =>
  (urls || []).filter(value => {
    try {
      const url = new URL(value);
      return (
        ['https:', 'http:'].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  });
