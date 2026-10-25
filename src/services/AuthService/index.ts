import api from '../01_axios';

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

const login = (data: LoginPayload) => api.post('/auth/login', data);
const register = (data: RegisterPayload) => api.post('/auth/register', data);
const logout = () => api.post('/auth/logout');

const AuthService = {
  login,
  register,
  logout,
};

export default AuthService;
