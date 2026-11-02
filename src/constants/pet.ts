// Pet profile limits from the SRS (SCR-09, PB-05). The BE accepts wider values
// (name ≤ 100, weight 0–500 kg, notes ≤ 1000, WebP photos), so the form is
// what enforces these.
export const PET_NAME_MAX_LENGTH = 50;
export const PET_NOTES_MAX_LENGTH = 500;
export const PET_WEIGHT_MIN_KG = 0.1;
export const PET_WEIGHT_MAX_KG = 100;
export const PET_PHOTO_MAX_MB = 5;
export const PET_PHOTO_TYPES = ['image/jpeg', 'image/png'];

export const MSG_PET_WEIGHT = `Cân nặng phải từ ${PET_WEIGHT_MIN_KG} đến ${PET_WEIGHT_MAX_KG} kg.`;
// MSG35
export const MSG_INVALID_PHOTO =
  'Chỉ chấp nhận file JPG hoặc PNG, tối đa 5 MB.';

/** Weight is optional; when it is given it must be within 0.1–100 kg */
export const isValidPetWeight = (weight?: number | null): boolean =>
  weight === null ||
  weight === undefined ||
  (Number.isFinite(weight) &&
    weight >= PET_WEIGHT_MIN_KG &&
    weight <= PET_WEIGHT_MAX_KG);

export const isValidPetPhoto = (file: { type: string; size: number }) =>
  PET_PHOTO_TYPES.includes(file.type) &&
  file.size <= PET_PHOTO_MAX_MB * 1024 * 1024;
