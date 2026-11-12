import type { ReceptionIntake } from '../../types/api/appointment.api';

export const RECEPTION_INTAKE_FIELD_LIMIT = 500;

const trimText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/** Không coi phiếu thiếu trường hoặc chỉ có khoảng trắng là đã được lưu. */
export const readReceptionIntake = (
  value: unknown
): ReceptionIntake | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const fields = value as Partial<Record<keyof ReceptionIntake, unknown>>;
  const symptoms = trimText(fields.symptoms);
  const initialCondition = trimText(fields.initialCondition);
  return symptoms && initialCondition
    ? { symptoms, initialCondition }
    : undefined;
};

export const buildCheckInPayload = (
  intake?: ReceptionIntake
): { intake: ReceptionIntake } | undefined => {
  if (intake === undefined) return undefined;
  const normalized = readReceptionIntake(intake);
  if (!normalized) {
    throw new Error('Vui lòng nhập triệu chứng và tình trạng ban đầu.');
  }
  if (
    normalized.symptoms.length > RECEPTION_INTAKE_FIELD_LIMIT ||
    normalized.initialCondition.length > RECEPTION_INTAKE_FIELD_LIMIT
  ) {
    throw new Error(
      `Mỗi trường của phiếu tiếp nhận tối đa ${RECEPTION_INTAKE_FIELD_LIMIT} ký tự.`
    );
  }
  return { intake: normalized };
};
