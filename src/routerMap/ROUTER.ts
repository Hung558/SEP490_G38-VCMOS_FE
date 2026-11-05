const ROUTER = {
  DEFAULT: '/',
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  // Build the real path with generatePath(ROUTER.PET_PROFILE, { petId })
  PET_PROFILE: '/pets/:petId',
  ADMIN_USERS: '/admin/users',
  ADMIN_SERVICES: '/admin/services',
  ADMIN_PRODUCTS: '/admin/products',
  CAGES: '/cages',
  CLINIC_APPOINTMENTS: '/clinic/appointments',
  NOT_FOUND: '*',
};

export default ROUTER;
