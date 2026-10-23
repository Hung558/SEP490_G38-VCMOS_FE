// src/types/utils/global.ts

/** Cho phép các field có thể null */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/** Cho phép các field optional đệ quy */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Kết hợp T và một số key bị ghi đè bởi U */
export type Override<T, U> = Omit<T, keyof U> & U;

/** Extract keys của object là kiểu function */
