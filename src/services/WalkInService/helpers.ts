import type {
  CreateWalkInBookingPayload,
  WalkInPetInfo,
  WalkInServiceItem,
} from '../../types/api/walk-in.api';
import type { ReceptionIntake } from '../../types/api/appointment.api';
import { buildCheckInPayload } from '../AppointmentOrderService/intake.ts';

// Giới hạn theo BE (walkIn.validator.js). Thú cưng theo SRS chặt hơn BE: tên ≤ 50, ghi chú ≤ 500
export const WALK_IN_PHONE_REGEX = /^0\d{9}$/;
export const WALK_IN_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const WALK_IN_FULLNAME_MAX = 100;
export const WALK_IN_PET_TEXT_MAX = 50;
export const WALK_IN_NOTE_MAX = 500;

export const MSG_WALK_IN_PHONE =
  'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0';

export interface WalkInServiceRow {
  serviceId?: string;
  assignedStaffId?: string;
  isEmergency?: boolean;
}

/** Giá trị của form tiếp nhận walk-in (SCR-18) */
export interface WalkInFormValues {
  phone: string;
  /** SĐT chưa có trong hệ thống: gửi kèm họ tên và email để BE tạo tài khoản Inactive */
  isNewCustomer: boolean;
  fullName?: string;
  email?: string;
  petMode: 'existing' | 'new';
  petId?: string;
  petInfo?: {
    name?: string;
    species?: string;
    breed?: string;
    weight?: number | null;
    coatColor?: string;
    dob?: string; // YYYY-MM-DD
    notes?: string;
  };
  services?: WalkInServiceRow[];
  cageId?: string;
  note?: string;
  intake?: ReceptionIntake;
}

const trimmed = (value?: string | null): string =>
  typeof value === 'string' ? value.trim() : '';

/** Bỏ khoảng trắng, dấu chấm, gạch ngang mà lễ tân hay gõ kèm ("0988 111 222") */
export const normalizeWalkInPhone = (raw?: string | null): string =>
  (raw || '').replace(/[\s.-]/g, '');

export const validateWalkInPhone = (
  raw?: string | null
): string | undefined => {
  const phone = normalizeWalkInPhone(raw);
  if (!phone) return 'Vui lòng nhập số điện thoại khách hàng';
  if (!WALK_IN_PHONE_REGEX.test(phone)) return MSG_WALK_IN_PHONE;
  return undefined;
};

/** Vị trí các dòng chọn lại một dịch vụ đã có ở dòng phía trên */
export const findDuplicateServiceRows = (
  rows?: WalkInServiceRow[] | null
): number[] => {
  const seen = new Set<string>();
  const duplicates: number[] = [];
  (rows || []).forEach((row, index) => {
    const id = trimmed(row?.serviceId);
    if (!id) return;
    if (seen.has(id)) duplicates.push(index);
    else seen.add(id);
  });
  return duplicates;
};

/**
 * Build payload gửi lên POST /api/appointment-orders/walk-in:
 * - khách cũ: chỉ gửi SĐT (BE tự tìm), khách mới: thêm họ tên, email
 * - thú cưng có sẵn gửi petId, thú cưng mới gửi petInfo (không bao giờ cả hai)
 * - không gửi `date`: BE mặc định là hôm nay theo giờ Việt Nam
 */
export const buildWalkInPayload = (
  values: WalkInFormValues
): CreateWalkInBookingPayload => {
  const payload: CreateWalkInBookingPayload = {
    phone: normalizeWalkInPhone(values.phone),
    services: (values.services || [])
      .filter(row => trimmed(row?.serviceId))
      .map(row => {
        const item: WalkInServiceItem = {
          serviceId: trimmed(row.serviceId),
          isEmergency: Boolean(row.isEmergency),
        };
        const staffId = trimmed(row.assignedStaffId);
        if (staffId) item.assignedStaffId = staffId;
        return item;
      }),
  };

  if (values.isNewCustomer) {
    const fullName = trimmed(values.fullName);
    if (fullName) payload.fullName = fullName;
    const email = trimmed(values.email).toLowerCase();
    if (email) payload.email = email;
  }

  if (values.petMode === 'existing') {
    const petId = trimmed(values.petId);
    if (petId) payload.petId = petId;
  } else {
    const info = values.petInfo || {};
    const petInfo: WalkInPetInfo = { name: trimmed(info.name) };
    for (const key of [
      'species',
      'breed',
      'coatColor',
      'dob',
      'notes',
    ] as const) {
      const value = trimmed(info[key]);
      if (value) petInfo[key] = value;
    }
    if (typeof info.weight === 'number' && Number.isFinite(info.weight)) {
      petInfo.weight = info.weight;
    }
    payload.petInfo = petInfo;
  }

  const cageId = trimmed(values.cageId);
  if (cageId) payload.cageId = cageId;
  const note = trimmed(values.note);
  if (note) payload.note = note;
  const checkIn = buildCheckInPayload(values.intake);
  if (checkIn) payload.intake = checkIn.intake;

  return payload;
};

/**
 * Đổi key lỗi 400 của BE ("petInfo.name", "services[1].assignedStaffId"...) sang name path
 * của antd Form. Trả về null với lỗi không gắn được vào một ô (vd "pet", "services").
 */
export const toWalkInFieldPath = (key: string): (string | number)[] | null => {
  const service =
    /^services\[(\d+)\]\.(serviceId|assignedStaffId|isEmergency)$/.exec(key);
  if (service) return ['services', Number(service[1]), service[2]];
  const pet = /^petInfo\.(name|species|breed|coatColor|dob|weight|notes)$/.exec(
    key
  );
  if (pet) return ['petInfo', pet[1]];
  const intake = /^intake\.(symptoms|initialCondition)$/.exec(key);
  if (intake) return ['intake', intake[1]];
  if (['phone', 'fullName', 'email', 'petId', 'note', 'cageId'].includes(key)) {
    return [key];
  }
  return null;
};

/** "Chó · Poodle · 4.5 kg" */
export const describeWalkInPet = (pet: {
  species?: string | null;
  breed?: string | null;
  weight?: number | null;
}): string =>
  [
    pet.species,
    pet.breed,
    typeof pet.weight === 'number' ? `${pet.weight} kg` : '',
  ]
    .filter(Boolean)
    .join(' · ') || 'Chưa có thông tin loài, giống';

const CUSTOMER_STATUS: Record<string, { label: string; color: string }> = {
  Active: { label: 'Hoạt động', color: 'green' },
  Inactive: { label: 'Chưa kích hoạt', color: 'gold' },
  Locked: { label: 'Đã khóa', color: 'red' },
};

export const getWalkInCustomerStatus = (status?: string) =>
  CUSTOMER_STATUS[status || ''] || {
    label: status || 'Chưa rõ',
    color: 'default',
  };
