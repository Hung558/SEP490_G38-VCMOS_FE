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

/** Explain the API snapshot without mistaking a free holding/legacy cage for an inpatient cage. */
export function getInpatientCageAvailability(
  cages: Cage[],
  weight?: number | null
) {
  const available = cages.filter(cage => cage.status === 'Available');
  const wards = available.filter(cage => cage.zone === 'InpatientWard');
  const choices = wards.filter(cage => canUseInpatientCage(cage, weight));
  const holdingCount = available.filter(cage => cage.zone === 'Holding').length;
  const unclassifiedCount = available.length - wards.length - holdingCount;
  let emptyMessage: string | undefined;
  let description = `Dữ liệu tải về: ${available.length} chuồng trống, trong đó ${wards.length} chuồng nội trú; ${choices.length} chuồng phù hợp để chọn.`;
  if (!available.length) {
    emptyMessage = 'Chưa có chuồng trống trong dữ liệu trả về.';
    description = 'Nhấn Làm mới để kiểm tra lại trạng thái chuồng từ máy chủ.';
  } else if (!wards.length) {
    emptyMessage =
      'Chưa tìm thấy chuồng trống được xác nhận thuộc khu nội trú.';
    description = `Có ${available.length} chuồng trống: ${holdingCount} chuồng khu chờ, ${unclassifiedCount} chuồng chưa xác định khu vực. Chuồng khu chờ không dùng để nhập viện. Nhờ quản trị viên kiểm tra cấu hình khu vực chuồng; đặt tên chuồng “nội trú” chưa đủ để xác định khu vực.`;
  } else if (!choices.length) {
    emptyMessage = 'Chưa có chuồng nội trú trống đủ tải trọng cho thú cưng.';
    const petWeight =
      typeof weight === 'number' && Number.isFinite(weight)
        ? `${new Intl.NumberFormat('vi-VN').format(weight)} kg`
        : 'hiện tại';
    description = `Có ${wards.length} chuồng nội trú trống nhưng không phù hợp với cân nặng ${petWeight}. Cần chuồng có giới hạn cân nặng phù hợp; nhấn Làm mới nếu dữ liệu vừa thay đổi.`;
  }
  return {
    choices,
    availableCount: available.length,
    wardCount: wards.length,
    holdingCount,
    unclassifiedCount,
    overweightCount: wards.length - choices.length,
    emptyMessage,
    description,
  };
}
