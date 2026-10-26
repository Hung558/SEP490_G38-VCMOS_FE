import '@/styles/_index.scss';
import '@/styles/globals.css';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Tự động reload trang nếu bundle/chunk bị thay đổi do HMR hoặc rebuild
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(<App />);
