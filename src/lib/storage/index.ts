// Định nghĩa key lưu trữ chuẩn
export const STORAGE = {
  TOKEN: 'token',
  USER_INFO: 'user-info',
  // sessionStorage: user closed the "verify your email" notice in this session
  EMAIL_NOTICE_DISMISSED: 'email-notice-dismissed',
} as const;

// Type của các key
type StorageKey = (typeof STORAGE)[keyof typeof STORAGE];

// --------- LocalStorage -----------

const getLocalStorage = <T = unknown>(key: StorageKey): T | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return data as unknown as T;
  }
};

const setLocalStorage = (key: StorageKey, value: unknown): void => {
  const stringify = typeof value === 'string' ? value : JSON.stringify(value);
  localStorage.setItem(key, stringify);
};

const deleteLocalStorage = (key: StorageKey): void => {
  localStorage.removeItem(key);
};

const clearLocalStorage = (): void => {
  localStorage.clear();
};

// --------- SessionStorage -----------

const getSessionStorage = <T = unknown>(key: StorageKey): T | null => {
  if (typeof window === 'undefined') return null;
  const data = sessionStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return data as unknown as T;
  }
};

const setSessionStorage = (key: StorageKey, value: unknown): void => {
  const stringify = typeof value === 'string' ? value : JSON.stringify(value);
  sessionStorage.setItem(key, stringify);
};

const deleteSessionStorage = (key: StorageKey): void => {
  sessionStorage.removeItem(key);
};

const clearSessionStorage = (): void => {
  sessionStorage.clear();
};
export const storage = {
  getLocalStorage,
  setLocalStorage,
  deleteLocalStorage,
  clearLocalStorage,
  getSessionStorage,
  setSessionStorage,
  deleteSessionStorage,
  clearSessionStorage,
};
