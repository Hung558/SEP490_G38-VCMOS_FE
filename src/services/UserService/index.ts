/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '../01_axios';
import AuthService from '../AuthService';
import {
  apiGetMyProfile,
  apiUpdateMyProfile,
  apiGoogleLogin,
  apiCompleteGoogleProfile,
  apiForgotPassword,
  apiResetPassword,
  apiVerifyAccount,
  apiResendVerification,
} from './urls';

export interface UpdateProfilePayload {
  fullName: string;
  phone: string;
  email?: string | null;
}

const getMyProfile = () => api.get(apiGetMyProfile);
const updateMyProfile = (data: UpdateProfilePayload) =>
  api.put(apiUpdateMyProfile, data);

const googleLogin = (data: any) => api.post(apiGoogleLogin, data);
const completeGoogleProfile = (data: any) =>
  api.post(apiCompleteGoogleProfile, data);
const forgotPassword = (data: any) => api.post(apiForgotPassword, data);
const resetPassword = (data: any) => api.post(apiResetPassword, data);
const verifyAccount = (data: any) => api.post(apiVerifyAccount, data);
const resendVerification = (data: any) => api.post(apiResendVerification, data);

const UserService = {
  getMyProfile,
  updateMyProfile,
  googleLogin,
  completeGoogleProfile,
  forgotPassword,
  resetPassword,
  verifyAccount,
  resendVerification,
  // Alias to AuthService
  login: AuthService.login,
  register: AuthService.register,
  logout: AuthService.logout,
};

export default UserService;
