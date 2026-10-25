// src/api/axios/interceptors.ts
import type { AxiosInstance } from 'axios';
import { toast } from 'sonner';

import { STORAGE, storage } from '@/lib/storage';
import axios from 'axios';
export const setupInterceptors = (instance: AxiosInstance) => {
  // Request Interceptor
  instance.interceptors.request.use(
    config => {
      if (config.data instanceof FormData) {
        if (config.headers && typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type');
        } else {
          delete config.headers['Content-Type'];
        }
      }

      // ✅ Lấy token thật đã được lưu sau login
      const token = storage.getLocalStorage(STORAGE.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    error => Promise.reject(error)
  );
  // Response Interceptor
  instance.interceptors.response.use(
    response => {
      if (response.config.responseType === 'blob') {
        return response;
      }

      const { errorCode, errorMessage, isError } = response.data;

      if (isError && errorCode !== '200') {
        // ✅ Nếu lỗi 401 → xử lý logout
        if (errorCode === '401') {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          localStorage.removeItem('accessToken');
          window.location.href = '/login'; // Không dùng navigate ở đây
        } else {
          toast.error(`Lỗi ${errorCode}: ${errorMessage}`);
        }

        return Promise.reject({ errorCode, errorMessage });
      }

      return response.data;
    },

    error => {
      // Don't show a generic toast here — every call site already catches
      // and shows its own specific, translated message (e.g. LoginForm,
      // RegisterForm, ForgotPasswordForm all read `error.response.data.error`
      // and fall back to their own Vietnamese message). Toasting here too
      // meant every failed request showed BOTH the real message and a
      // generic "Request failed with status code NNN" on top of it.
      return Promise.reject(error);
    }
  );
};

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_ROOT,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

setupInterceptors(instance);

export default instance;
