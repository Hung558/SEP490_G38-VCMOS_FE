/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '../01_axios';
import AuthService from '../AuthService';

const getMyProfile = () => api.get('/users/me');
const googleLogin = (data: any) => api.post('/users/google-login', data);
const completeGoogleProfile = (data: any) =>
  api.post('/users/complete-google-profile', data);
const forgotPassword = (data: any) => api.post('/users/forgot-password', data);
const resetPassword = (data: any) => api.post('/users/reset-password', data);
const verifyAccount = (data: any) => api.post('/users/verify', data);
const resendVerification = (data: any) =>
  api.post('/users/resend-verification', data);

const UserService = {
  getMyProfile,
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
