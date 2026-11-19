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
  intake?: Partial<ReceptionIntake> | null
): { intake: ReceptionIntake } | undefined => {
  if (intake === undefined) return undefined;
  if (!intake || typeof intake !== 'object') {
    throw new Error('Vui lòng nhập triệu chứng và tình trạng ban đầu.');
  }

  const hasSymptomsField = 'symptoms' in intake;
  const hasConditionField = 'initialCondition' in intake;

  if (!hasSymptomsField && !hasConditionField) {
    throw new Error('Vui lòng nhập triệu chứng và tình trạng ban đầu.');
  }

  const symptoms = trimText(intake.symptoms);
  const initialCondition = trimText(intake.initialCondition);

  // Cả hai trường đều để trống hoặc chỉ có khoảng trắng -> bỏ qua intake
  if (!symptoms && !initialCondition) {
    return undefined;
  }

  // Nhập thiếu một trong hai trường -> báo lỗi yêu cầu nhập đủ
  if (!symptoms || !initialCondition) {
    throw new Error('Vui lòng nhập triệu chứng và tình trạng ban đầu.');
  }

  if (
    symptoms.length > RECEPTION_INTAKE_FIELD_LIMIT ||
    initialCondition.length > RECEPTION_INTAKE_FIELD_LIMIT
  ) {
    throw new Error(
      `Mỗi trường của phiếu tiếp nhận tối đa ${RECEPTION_INTAKE_FIELD_LIMIT} ký tự.`
    );
  }

  return { intake: { symptoms, initialCondition } };
};
