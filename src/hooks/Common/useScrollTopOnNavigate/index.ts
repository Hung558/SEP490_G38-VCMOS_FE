import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * BrowserRouter keeps the window scroll position across pages, so a page opened
 * from a scrolled one (e.g. "Trang chủ" from a long list) starts halfway down.
 * Start every newly opened page at the top; back/forward (POP) keeps the
 * browser's own restore. Query-only changes (filters, search) do not scroll.
 */
export const useScrollTopOnNavigate = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);
};
