import api from '../01_axios';
import { apiPets, apiPetDetail } from './urls';
import type {
  ListPetsParams,
  ListPetsResponse,
  CreatePetPayload,
  UpdatePetPayload,
  PetDetailResponse,
  DeletePetResponse,
} from '@/types';

/**
 * Helper to build FormData from payload if needed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFormData = (payload: Record<string, any>): FormData => {
  const formData = new FormData();
  Object.keys(payload).forEach(key => {
    const value = payload[key];
    if (value !== undefined) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (value === null) {
        formData.append(key, '');
      } else {
        formData.append(key, String(value));
      }
    }
  });
  return formData;
};

/**
 * Lấy danh sách thú cưng của người dùng đang đăng nhập
 */
const listPets = (params?: ListPetsParams): Promise<ListPetsResponse> => {
  return api.get(apiPets, { params });
};

/**
 * Lấy chi tiết 1 thú cưng theo ID
 */
const getPetById = (petId: string): Promise<PetDetailResponse> => {
  return api.get(apiPetDetail(petId));
};

/**
 * Tạo mới thú cưng (hỗ trợ cả JSON và multipart/form-data upload ảnh)
 */
const createPet = (
  data: CreatePetPayload | FormData
): Promise<PetDetailResponse> => {
  if (data instanceof FormData) {
    return api.post(apiPets, data);
  }

  // Nếu có file photo, đóng gói thành FormData
  if (data.photo instanceof File) {
    const formData = toFormData(data);
    return api.post(apiPets, formData);
  }

  return api.post(apiPets, data);
};

/**
 * Cập nhật thông tin thú cưng (PATCH /pets/:petId)
 */
const updatePet = (
  petId: string,
  data: UpdatePetPayload | FormData
): Promise<PetDetailResponse> => {
  if (data instanceof FormData) {
    return api.patch(apiPetDetail(petId), data);
  }

  if (data.photo instanceof File) {
    const formData = toFormData(data);
    return api.patch(apiPetDetail(petId), formData);
  }

  return api.patch(apiPetDetail(petId), data);
};

/**
 * Lưu trữ (xóa mềm) thú cưng
 */
const deletePet = (petId: string): Promise<DeletePetResponse> => {
  return api.delete(apiPetDetail(petId));
};

const PetService = {
  listPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
};

export default PetService;
