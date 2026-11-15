import type {
  CompleteMedicalRecordPayload,
  MedicalRecord,
  MedicalRecordServiceRef,
  Prescription,
  PrescriptionInput,
  SaveMedicalRecordPayload,
} from '../../types/api/medical-record.api';

// Giới hạn theo BE (medicalRecord.validator.js)
export const SOAP_TEXT_MAX = 3000;
export const PRESCRIPTION_TEXT_MAX = 300;
export const DURATION_DAYS_MIN = 1;
export const DURATION_DAYS_MAX = 365;

export type SoapFieldKey =
  | 'subjectiveNote'
  | 'objectiveNote'
  | 'assessment'
  | 'plan';

/** Bốn phần của bệnh án SOAP theo đúng thứ tự; BR-13 bắt buộc đủ cả bốn khi hoàn tất */
export const SOAP_FIELDS: readonly {
  key: SoapFieldKey;
  letter: string;
  label: string;
  placeholder: string;
}[] = [
  {
    key: 'subjectiveNote',
    letter: 'S',
    label: 'Triệu chứng chủ quan',
    placeholder: 'Chủ nuôi kể lại: bé ngứa, gãi tai liên tục 2 ngày nay...',
  },
  {
    key: 'objectiveNote',
    letter: 'O',
    label: 'Kết quả khám lâm sàng',
    placeholder: 'Nhiệt độ, nhịp tim, biểu hiện quan sát được...',
  },
  {
    key: 'assessment',
    letter: 'A',
    label: 'Chẩn đoán',
    placeholder: 'Ví dụ: Viêm tai ngoài do nấm nhẹ',
  },
  {
    key: 'plan',
    letter: 'P',
    label: 'Phác đồ điều trị',
    placeholder: 'Ví dụ: Uống kháng sinh 5 ngày, vệ sinh tai hằng ngày',
  },
];

export const MSG_SOAP_REQUIRED =
  'Vui lòng nhập đủ 3 phần O - A - P trước khi hoàn tất ca khám.';

/**
 * Chữ S do BE tự điền từ triệu chứng ở phiếu tiếp nhận, không có thì từ ghi chú
 * khách để lại khi đặt lịch, rồi khóa lại (BE f19060f). Bác sĩ chỉ đọc.
 */
export const SOAP_LOCKED_FIELD: SoapFieldKey = 'subjectiveNote';

export interface PrescriptionRow {
  productId?: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  durationDays?: number | null;
}

export interface MedicalRecordFormValues {
  subjectiveNote?: string;
  objectiveNote?: string;
  assessment?: string;
  plan?: string;
  notes?: string;
  weight?: number | null;
  prescriptions?: PrescriptionRow[];
}

const trimmed = (value?: string | null): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Build payload cho lưu nháp và hoàn tất bệnh án:
 * - gửi O, A, P và ghi chú (chuỗi rỗng để xóa nội dung đã lưu); không gửi S vì BE
 *   tự điền và khóa chữ S
 
 * - luôn gửi danh sách thuốc (mảng rỗng = bỏ hết thuốc đã kê)
 * - chỉ gửi cân nặng khi bác sĩ nhập số (BE ghi đè luôn Pet.weight)
 */
export const buildMedicalRecordPayload = (
  values: MedicalRecordFormValues
): SaveMedicalRecordPayload => {
  const payload: SaveMedicalRecordPayload = {
    objectiveNote: trimmed(values.objectiveNote),
    assessment: trimmed(values.assessment),
    plan: trimmed(values.plan),
    notes: trimmed(values.notes),
    prescriptions: (values.prescriptions || [])
      .filter(row => trimmed(row?.productId))
      .map(row => {
        const item: PrescriptionInput = {
          productId: trimmed(row.productId),
          dosage: trimmed(row.dosage),
          frequency: trimmed(row.frequency),
          durationDays: Number(row.durationDays),
        };
        const instructions = trimmed(row.instructions);
        if (instructions) item.instructions = instructions;
        return item;
      }),
  };
  if (typeof values.weight === 'number' && Number.isFinite(values.weight)) {
    payload.weight = values.weight;
  }
  return payload;
};

/**
 * Hoàn tất ca khám gửi đúng các giá trị SOAP đang có. Không gửi `waitingCageId`:
 * nghiệp vụ 4.5 để lễ tân xếp bé vào chuồng chờ chủ đón, không phải bác sĩ.
 */
export const buildCompleteMedicalRecordPayload = (
  values: MedicalRecordFormValues
): CompleteMedicalRecordPayload => buildMedicalRecordPayload(values);

/** Các phần SOAP bác sĩ còn để trống (BR-13); chữ S do hệ thống điền nên không tính */
export const findMissingSoapFields = (
  values: MedicalRecordFormValues
): SoapFieldKey[] =>
  SOAP_FIELDS.filter(
    field => field.key !== SOAP_LOCKED_FIELD && !trimmed(values[field.key])
  ).map(f => f.key);

/**
 * Đổi key lỗi 400 của BE ("plan", "prescriptions[1].dosage"...) sang name path của
 * antd Form; null với lỗi không gắn được vào một ô
 */
export const toMedicalRecordFieldPath = (
  key: string
): (string | number)[] | null => {
  const prescription =
    /^prescriptions\[(\d+)\]\.(productId|dosage|frequency|instructions|durationDays)$/.exec(
      key
    );
  if (prescription) {
    return ['prescriptions', Number(prescription[1]), prescription[2]];
  }
  if (
    [
      'subjectiveNote',
      'objectiveNote',
      'assessment',
      'plan',
      'notes',
      'weight',
    ].includes(key)
  ) {
    return [key];
  }
  return null;
};

/** BE giữ bệnh án ở Draft tới khi hóa đơn được thanh toán; chỉ Finalized mới khóa (BR-14) */
export const isMedicalRecordLocked = (
  record?: { status?: string } | null
): boolean => record?.status === 'Finalized';

const RECORD_STATUS: Record<string, { label: string; color: string }> = {
  Draft: { label: 'Bản nháp', color: 'gold' },
  Finalized: { label: 'Đã khóa', color: 'green' },
};

export const getMedicalRecordStatus = (status?: string) =>
  RECORD_STATUS[status || ''] || { label: status || '—', color: 'default' };

/** Giá trị ban đầu của form từ bệnh án đã lưu và cân nặng hiện tại của thú cưng */
export const recordToFormValues = (
  record: Pick<
    MedicalRecord,
    | 'subjectiveNote'
    | 'objectiveNote'
    | 'assessment'
    | 'plan'
    | 'notes'
    | 'prescriptions'
  > | null,
  petWeight?: number | null
): MedicalRecordFormValues => ({
  subjectiveNote: record?.subjectiveNote || '',
  objectiveNote: record?.objectiveNote || '',
  assessment: record?.assessment || '',
  plan: record?.plan || '',
  notes: record?.notes || '',
  weight: typeof petWeight === 'number' ? petWeight : null,
  prescriptions: (record?.prescriptions || []).map(p => ({
    productId: String(p.productId),
    dosage: p.dosage || '',
    frequency: p.frequency || '',
    instructions: p.instructions || '',
    durationDays: typeof p.durationDays === 'number' ? p.durationDays : null,
  })),
});

/** "Amoxicillin 500mg (viên) · 1 viên · 2 lần/ngày sau ăn · 5 ngày" */
export const formatPrescription = (p: Prescription): string => {
  const name = p.productNameSnapshot
    ? `${p.productNameSnapshot}${p.unitSnapshot ? ` (${p.unitSnapshot})` : ''}`
    : 'Thuốc';
  return [
    name,
    p.dosage,
    p.frequency,
    typeof p.durationDays === 'number' ? `${p.durationDays} ngày` : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

/** Bệnh án SOAP dùng cho các dịch vụ y tế; Grooming không có bệnh án */
export const isMedicalServiceCategory = (category?: string): boolean =>
  Boolean(category) && category !== 'Grooming';

/** Dịch vụ, bác sĩ và lịch hẹn của bệnh án khi BE đã populate */
export const getRecordServiceRef = (
  record: Pick<MedicalRecord, 'appointmentServiceId'>
): MedicalRecordServiceRef | null =>
  record.appointmentServiceId && typeof record.appointmentServiceId === 'object'
    ? record.appointmentServiceId
    : null;

export const getRecordServiceName = (
  record: Pick<MedicalRecord, 'appointmentServiceId'>
): string => {
  const ref = getRecordServiceRef(record)?.serviceId;
  return ref && typeof ref === 'object' ? ref.name : 'Dịch vụ khám';
};

export const getRecordDoctorName = (
  record: Pick<MedicalRecord, 'appointmentServiceId'>
): string => {
  const ref = getRecordServiceRef(record)?.assignedStaffId;
  return ref && typeof ref === 'object' ? ref.fullName : '—';
};

/** Ngày khám: ngày của lịch hẹn, nếu không có thì ngày tạo bệnh án (YYYY-MM-DD) */
export const getRecordVisitDate = (
  record: Pick<MedicalRecord, 'appointmentServiceId' | 'createdAt'>
): string => {
  const order = getRecordServiceRef(record)?.orderId;
  if (order && typeof order === 'object' && order.date) return order.date;
  return (record.createdAt || '').slice(0, 10);
};

export const getRecordOrderCode = (
  record: Pick<MedicalRecord, 'appointmentServiceId'>
): string => {
  const order = getRecordServiceRef(record)?.orderId;
  return order && typeof order === 'object' ? order.code : '';
};
