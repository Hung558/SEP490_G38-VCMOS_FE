import ROUTER from './ROUTER.ts';

export const getSidebarSelection = (pathname: string, search = ''): string => {
  if (
    pathname === ROUTER.DASHBOARD &&
    new URLSearchParams(search).get('tab') === 'journey'
  ) {
    return `${ROUTER.DASHBOARD}?tab=journey`;
  }
  if (pathname.startsWith(`${ROUTER.COMMUNITY}/`)) return ROUTER.COMMUNITY;
  return pathname;
};
