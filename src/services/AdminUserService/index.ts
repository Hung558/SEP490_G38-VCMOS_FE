import api from '../01_axios';
import { apiAdminUserDetail, apiAdminUserStatus, apiAdminUsers } from './urls';

export type AdminRole =
  | 'PetOwner'
  | 'Receptionist'
  | 'Veterinarian'
  | 'Groomer'
  | 'Admin';
export type AdminUserStatus = 'Active' | 'Inactive' | 'Locked';

export interface AdminUser {
  _id: string;
  code: string;
  fullName: string;
  phone: string;
  email?: string;
  isEmailVerified?: boolean;
  role: AdminRole;
  status: AdminUserStatus;
  createdAt?: string;
  pets?: Array<Record<string, unknown>>;
}

export interface AdminUserFilters {
  role?: AdminRole;
  status?: AdminUserStatus;
  search?: string;
}

export interface CreateStaffPayload {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  role: Exclude<AdminRole, 'PetOwner' | 'Admin'>;
}

export interface UpdateAdminUserPayload {
  fullName: string;
  phone: string;
  email?: string;
  role?: Exclude<AdminRole, 'PetOwner' | 'Admin'>;
}

const listUsers = (
  params?: AdminUserFilters
): Promise<{ users: AdminUser[] }> => api.get(apiAdminUsers, { params });
const getUser = (id: string): Promise<{ user: AdminUser }> =>
  api.get(apiAdminUserDetail(id));
const createStaff = (data: CreateStaffPayload): Promise<{ user: AdminUser }> =>
  api.post(apiAdminUsers, data);
const updateUser = (
  id: string,
  data: UpdateAdminUserPayload
): Promise<{ user: AdminUser }> => api.put(apiAdminUserDetail(id), data);
const updateStatus = (
  id: string,
  status: AdminUserStatus
): Promise<{ user: AdminUser }> =>
  api.patch(apiAdminUserStatus(id), { status });

const AdminUserService = {
  listUsers,
  getUser,
  createStaff,
  updateUser,
  updateStatus,
};

export default AdminUserService;
