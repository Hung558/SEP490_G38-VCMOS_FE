import type { ApiListDataRequest } from './request.api';

export interface UserFilterRequest extends ApiListDataRequest {
  textSearch?: string;
  status?: number;
}

export interface CreateUserRequest {
  username?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface UpdateUserRequest {
  id?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RoleType {
  id: number;
  name: string;
}

export interface Login {
  _id?: string;
  token?: string;
  expiredAt?: number;
  username?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  systemRole?: string;
  role?: string;
}
