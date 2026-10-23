declare global {
  interface Window {
    env: {
      API_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
      VERSION?: string;
    };
  }
}
// declare namespace NodeJS {
//   interface ProcessEnv {
//     NEXT_PUBLIC_API_URL: string;
//     NEXT_PUBLIC_APP_NAME: string;
//     // Các biến env khác...
//   }
// }

export {};
