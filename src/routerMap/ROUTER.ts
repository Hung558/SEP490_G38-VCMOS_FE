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
  // Admin analytics: revenue, operations and best-selling products
  ADMIN_REPORTS: '/admin/reports',
  CAGES: '/cages',
  CLINIC_APPOINTMENTS: '/clinic/appointments',
  FRONT_DESK_DASHBOARD: '/clinic/dashboard',
  // Veterinarian / Groomer work queue (SCR-22, SCR-26)
  STAFF_QUEUE: '/clinic/my-queue',
  INPATIENT_CARE: '/clinic/inpatient',
  // SCR-30 ca làm việc: Admin quản lý, Lễ tân xem, Bác sĩ/Groomer xem của mình
  STAFF_SCHEDULES: '/staff-schedules',
  // SOAP exam of one appointment service (SCR-23); build with generatePath
  EXAM_RECORD: '/clinic/exam/:appointmentServiceId',
  // Hóa đơn: chủ nuôi (SCR-15), Lễ tân và Admin (SCR-20 tra cứu)
  MY_INVOICES: '/invoices',
  MY_COMMUNITY_POSTS: '/community/my-posts',
  CLINIC_INVOICES: '/clinic/invoices',
  // VNPay đưa người trả tiền về đây (BE VNP_RETURN_URL)
  VNPAY_RETURN: '/payment/vnpay-return',
  NOT_FOUND: '*',
};

export default ROUTER;
