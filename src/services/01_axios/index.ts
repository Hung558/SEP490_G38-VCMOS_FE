// src/api/axios/interceptors.ts
import type { AxiosInstance } from 'axios';
import { toast } from 'sonner';

import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import axios from 'axios';
import { isBlockedAccountError } from './blockedAccount';

// A wrong password on the login form also answers 401, and a logout with an
// expired token must not bounce to the login page: neither means the session
// of a signed-in user has just expired
const SESSION_CHECK_SKIPPED = ['/auth/login', '/auth/logout'];
let isRedirectingToLogin = false;

const handleExpiredSession = (
  message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
) => {
  isRedirectingToLogin = true;
  storage.deleteLocalStorage(STORAGE.TOKEN);
  storage.deleteLocalStorage(STORAGE.USER_INFO);
  // The next login should show the "verify your email" notice again
  storage.deleteSessionStorage(STORAGE.EMAIL_NOTICE_DISMISSED);
  toast.error(message);
  // Give the toast a moment on screen before the full page reload
  setTimeout(() => {
    window.location.href = ROUTER.LOGIN;
  }, 1500);
};

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

      return response.data;
    },

    error => {
      // The BE answers 401 when the token is missing, invalid or expired
      const url: string = error?.config?.url || '';
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (
        !isRedirectingToLogin &&
        storage.getLocalStorage(STORAGE.TOKEN) &&
        !SESSION_CHECK_SKIPPED.some(path => url.includes(path))
      ) {
        if (status === 401) handleExpiredSession();
        else if (isBlockedAccountError(status, message)) {
          handleExpiredSession(message);
        }
      }

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
