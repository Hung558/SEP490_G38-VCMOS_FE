// src/utils/dateUtils.ts

/**
 * Định dạng ngày tháng sang dạng yyyy/MM/dd
 * @param date Ngày đầu vào (Date object hoặc chuỗi ngày hợp lệ)
 * @returns Chuỗi ngày định dạng yyyy/MM/dd, hoặc chuỗi rỗng nếu đầu vào không hợp lệ
 */
export function formatDateUtil(date: Date | string | undefined): string {
  if (!date) return '';

  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Kiểm tra xem dateObj có hợp lệ không
  if (isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0, cần +1
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
export const convertDate = (date: string | Date | undefined) => {
  if (date) return dayjs.utc(date);
  return undefined;
};
