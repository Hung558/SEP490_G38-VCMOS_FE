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
  apiSendMyEmailOtp,
  apiVerifyMyEmail,
  apiSendChangePasswordOtp,
  apiChangeMyPassword,
} from './urls';

export interface UpdateProfilePayload {
  fullName: string;
  phone: string;
  email?: string | null;
}

export interface VerifyEmailPayload {
  otp: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  otp: string;
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

const sendMyEmailOtp = () => api.post(apiSendMyEmailOtp);
const verifyMyEmail = (data: VerifyEmailPayload) =>
  api.post(apiVerifyMyEmail, data);
const sendChangePasswordOtp = () => api.post(apiSendChangePasswordOtp);
const changeMyPassword = (data: ChangePasswordPayload) =>
  api.put(apiChangeMyPassword, data);

const UserService = {
  getMyProfile,
  updateMyProfile,
  sendMyEmailOtp,
  verifyMyEmail,
  sendChangePasswordOtp,
  changeMyPassword,
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
