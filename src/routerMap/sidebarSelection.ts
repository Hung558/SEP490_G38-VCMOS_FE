import ROUTER from './ROUTER.ts';

/** Sidebar key to highlight for a location */
export const getSidebarSelection = (pathname: string, search = ''): string => {
  // 26/11: the journeys are a page again; an old ?tab=journey link marks that
  // item while it is sent there
  if (
    pathname === ROUTER.DASHBOARD &&
    new URLSearchParams(search).get('tab') === 'journey'
  ) {
    return ROUTER.PET_JOURNEYS;
  }
  if (pathname.startsWith(`${ROUTER.PET_JOURNEYS}/`)) {
    return ROUTER.PET_JOURNEYS;
  }
  if (pathname.startsWith(`${ROUTER.COMMUNITY}/posts/`))
    return ROUTER.COMMUNITY;
  return pathname;
};
