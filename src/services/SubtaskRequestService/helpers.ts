import type {
  CreateSubtask,
  SubtaskRequest,
  SubtaskResult,
  SubtaskStatus,
} from './types';

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
  return {
    appointmentServiceId: input.appointmentServiceId,
    assignedStaffId: input.assignedStaffId,
    taskType,
    ...(instructions ? { instructions } : {}),
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
