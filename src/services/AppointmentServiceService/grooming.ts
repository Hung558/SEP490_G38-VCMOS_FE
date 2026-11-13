import type { GroomingNoteDraft, GroomingNoteText, MyQueueItem } from './types';
import {
  getQueueOrder,
  getServiceRefCategory,
  isQueueingOrder,
} from './helpers.ts';

export const GROOMING_NOTE_TEXT_MAX = 1000;
export const GROOMING_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const GROOMING_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const GROOMING_NOTE_FIELDS = [
  ['beforeNote', 'Ghi chú trước khi spa'],
  ['afterNote', 'Ghi chú sau khi spa'],
  ['recommendations', 'Khuyến nghị'],
] as const;

export const GROOMING_PHOTO_FIELDS = [
  ['beforePhoto', 'Ảnh trước'],
  ['afterPhoto', 'Ảnh sau'],
] as const;

export const validateGroomingPhoto = ({
  type,
  size,
}: Pick<File, 'type' | 'size'>) => {
  if (!GROOMING_PHOTO_MIME_TYPES.includes(type))
    return 'Ảnh phải có định dạng JPEG, PNG hoặc WebP.';
  // Multer/Busboy báo LIMIT_FILE_SIZE khi chạm đúng ngưỡng, không chỉ khi vượt.
  if (size >= GROOMING_PHOTO_MAX_BYTES) return 'Mỗi ảnh phải nhỏ hơn 5 MiB.';
  if (size <= 0) return 'Ảnh không được để trống.';
};

/** Ảnh luôn đi qua multipart; body JSON chỉ có các trường văn bản hợp lệ. */
export const buildGroomingNotePayload = (
  draft: GroomingNoteDraft
): GroomingNoteText | FormData => {
  const text: GroomingNoteText = {};
  for (const [field, label] of GROOMING_NOTE_FIELDS) {
    const value = draft[field]?.trim();
    if (!value) continue;
    if (value.length > GROOMING_NOTE_TEXT_MAX) {
      throw new Error(`${label} tối đa ${GROOMING_NOTE_TEXT_MAX} ký tự.`);
    }
    text[field] = value;
  }

  if (!draft.beforePhoto && !draft.afterPhoto) {
    if (!Object.keys(text).length)
      throw new Error(
        'Vui lòng nhập ít nhất một ghi chú hoặc tải lên ít nhất một ảnh.'
      );
    return text;
  }

  const form = new FormData();
  for (const [field, value] of Object.entries(text)) form.append(field, value);
  for (const [field, label] of GROOMING_PHOTO_FIELDS) {
    const photo = draft[field];
    if (!photo) continue;
    const error = validateGroomingPhoto(photo);
    if (error) throw new Error(`${label}: ${error}`);
    form.append(field, photo);
  }
  return form;
};

export const getGroomingActions = (item: MyQueueItem, role?: string) => {
  if (
    role !== 'Groomer' ||
    getServiceRefCategory(item.serviceId) !== 'Grooming'
  )
    return null;

  const order = getQueueOrder(item);
  const orderStatus = order?.derivedStatus;
  const checkedIn = isQueueingOrder(orderStatus);
  const inProgress = item.status === 'InProgress';
  return {
    waitForCheckIn:
      item.status === 'Booked' || (item.status === 'Waiting' && !checkedIn),
    start: item.status === 'Waiting' && checkedIn,
    complete:
      inProgress &&
      !!orderStatus &&
      !['Done', 'Cancelled', 'Overdue'].includes(orderStatus),
    note: item.groomingNote
      ? ('view' as const)
      : inProgress || item.status === 'Done'
        ? ('create' as const)
        : null,
  };
};
