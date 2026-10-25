import api from '../01_axios';
import { apiLogin, apiRegister, apiLogout } from './urls';

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
}

const login = (data: LoginPayload) => api.post(apiLogin, data);
const register = (data: RegisterPayload) => api.post(apiRegister, data);
const logout = () => api.post(apiLogout);

const AuthService = {
  login,
  register,
  logout,
};

export default AuthService;
