import type { Cage } from '../../types/api/cage.api.ts';

const clinicTimeZone = 'Asia/Ho_Chi_Minh';

export function clinicDate(time: string | Date = new Date()): string {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: clinicTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export const formatClinicTime = (value?: string | null): string => {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: clinicTimeZone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const canAdmitFromExam = (
  serviceStatus: string | undefined,
  orderStatus: string | undefined
): boolean => serviceStatus === 'Done' && orderStatus === 'WaitOwner';

export const canUseInpatientCage = (
  cage: Pick<Cage, 'status' | 'zone' | 'maxWeightKg'>,
  weight?: number | null
): boolean =>
  cage.zone === 'InpatientWard' &&
  cage.status === 'Available' &&
  (cage.maxWeightKg == null || weight == null || weight <= cage.maxWeightKg);
