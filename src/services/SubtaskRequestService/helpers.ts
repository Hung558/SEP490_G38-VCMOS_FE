import type {
  CreateSubtask,
  SubtaskRequest,
  SubtaskResult,
  SubtaskStatus,
} from './types';
import type { ClinicalStaffRole } from '../../types/api/staff.api';
import { getServiceStaffRole } from '../StaffService/helpers.ts';

/** Sub-tasks that still block finishing the main exam (MSG26, BR-13) */
export const countOpenSubtasks = (
  tasks: readonly Pick<SubtaskRequest, 'status'>[]
): number =>
  tasks.filter(t => t.status === 'Pending' || t.status === 'InProgress').length;

/** SRS SCR-24 task types; the field stays free text (BE stores a string) for "Khác" */
export const SUBTASK_TASK_TYPES = [
  'Xét nghiệm máu',
  'Sinh hóa máu',
  'Chụp X-quang',
  'Siêu âm',
  'Thay băng vết thương',
  'Tắm thuốc',
  'Cạo lông',
] as const;

/** Ai làm từng chỉ định thường dùng: việc chăm sóc da, lông cho Groomer, còn lại cho bác sĩ */
export const SUBTASK_TASK_TYPE_ROLES: Record<
  (typeof SUBTASK_TASK_TYPES)[number],
  ClinicalStaffRole
> = {
  'Xét nghiệm máu': 'Veterinarian',
  'Sinh hóa máu': 'Veterinarian',
  'Chụp X-quang': 'Veterinarian',
  'Siêu âm': 'Veterinarian',
  'Thay băng vết thương': 'Veterinarian',
  'Tắm thuốc': 'Groomer',
  'Cạo lông': 'Groomer',
};

const sameName = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase('vi') === b.trim().toLocaleLowerCase('vi');

/**
 * Nghiệp vụ 5: bác sĩ giao thêm dịch vụ cho nhân viên khác, nên người thực hiện
 * phải đúng vai trò của chỉ định:
 * - dịch vụ trong danh mục: vai trò BE quy định, gửi kèm `serviceId` để BE kiểm lại;
 * - chỉ định thường dùng: theo bảng SUBTASK_TASK_TYPE_ROLES;
 * - tên tự nhập khác: chưa biết vai trò.
 */
export const resolveSubtaskTarget = (
  taskType: string | undefined,
  services: readonly {
    _id: string;
    name: string;
    category?: string;
    requiredRole?: string | null;
  }[]
): { role?: ClinicalStaffRole; serviceId?: string } => {
  const name = taskType?.trim();
  if (!name) return {};
  const service = services.find(s => sameName(s.name, name));
  if (service)
    return { role: getServiceStaffRole(service), serviceId: service._id };
  const common = SUBTASK_TASK_TYPES.find(type => sameName(type, name));
  return common ? { role: SUBTASK_TASK_TYPE_ROLES[common] } : {};
};

/** Chỉ người đúng vai trò; chưa biết vai trò thì hiện cả bác sĩ và groomer */
export const filterSubtaskPerformers = <T extends { role?: string }>(
  staff: readonly T[],
  role?: ClinicalStaffRole
): T[] => (role ? staff.filter(s => s.role === role) : [...staff]);

export const SUBTASK_LIMIT = {
  taskType: 200,
  instructions: 2000,
  resultText: 3000,
} as const;
export const SUBTASK_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SUBTASK_IMAGE_MAX = 5 * 1024 * 1024;

export const SUBTASK_STATUSES: Record<
  SubtaskStatus,
  { label: string; color: string }
> = {
  Pending: { label: 'Chờ thực hiện', color: 'gold' },
  InProgress: { label: 'Đang thực hiện', color: 'blue' },
  Completed: { label: 'Đã hoàn tất', color: 'green' },
};

export const populated = <T>(
  ref: T | string | null | undefined
): T | undefined => (ref && typeof ref === 'object' ? ref : undefined);

export const refId = (ref: string | { _id: string } | null) =>
  typeof ref === 'string' ? ref : ref?._id;

export const getSubtaskActions = (task: SubtaskRequest, userId?: string) => ({
  start: Boolean(
    userId &&
      refId(task.assignedStaffId) === userId &&
      task.status === 'Pending'
  ),
  complete: Boolean(
    userId &&
      refId(task.assignedStaffId) === userId &&
      (task.status === 'Pending' || task.status === 'InProgress')
  ),
  remove: Boolean(
    userId && refId(task.requestedById) === userId && task.status === 'Pending'
  ),
});

export const buildSubtaskCreate = (input: CreateSubtask): CreateSubtask => {
  const taskType = input.taskType.trim();
  const instructions = input.instructions?.trim();
  if (
    !taskType ||
    taskType.length > SUBTASK_LIMIT.taskType ||
    (instructions?.length ?? 0) > SUBTASK_LIMIT.instructions
  ) {
    throw new Error('Tên chỉ định hoặc hướng dẫn không hợp lệ.');
  }
  const serviceId = input.serviceId?.trim();
  return {
    appointmentServiceId: input.appointmentServiceId,
    assignedStaffId: input.assignedStaffId,
    taskType,
    ...(instructions ? { instructions } : {}),
    ...(serviceId ? { serviceId } : {}),
  };
};

export const validateSubtaskImage = (file: Pick<File, 'size' | 'type'>) =>
  file.size < 1 ||
  file.size >= SUBTASK_IMAGE_MAX ||
  !SUBTASK_IMAGE_TYPES.includes(file.type)
    ? 'Chọn ảnh JPEG, PNG hoặc WebP không rỗng và nhỏ hơn 5 MB.'
    : undefined;

export const buildSubtaskResult = ({
  resultText,
  resultImage,
}: SubtaskResult) => {
  const text = resultText?.trim();
  if (!text && !resultImage)
    throw new Error('Nhập kết quả hoặc chọn một ảnh kết quả.');
  if (text && text.length > SUBTASK_LIMIT.resultText)
    throw new Error('Kết quả tối đa 3.000 ký tự.');
  if (!resultImage) return { resultText: text };
  const imageError = validateSubtaskImage(resultImage);
  if (imageError) throw new Error(imageError);
  const formData = new FormData();
  if (text) formData.append('resultText', text);
  formData.append('resultImage', resultImage);
  return formData;
};

export const safeSubtaskImageUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
};
