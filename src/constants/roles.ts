export const USER_ROLE_LABELS: Record<string, string> = {
  Admin: 'Quản trị viên',
  Veterinarian: 'Bác sĩ thú y',
  Receptionist: 'Lễ tân',
  Groomer: 'Groomer',
  PetOwner: 'Khách hàng',
};

export type RoleGroup = 'admin' | 'staff' | 'owner';

const STAFF_ROLES = ['Receptionist', 'Veterinarian', 'Groomer'];

/** Role key as the BE writes it ('Admin', 'Veterinarian'...) whatever the casing; '' if unknown */
export const normalizeRole = (role?: string): string =>
  Object.keys(USER_ROLE_LABELS).find(
    key => key.toLowerCase() === (role || '').toLowerCase()
  ) || '';

/** Admin, clinic staff or pet owner; an unknown role counts as a pet owner */
export const getRoleGroup = (role?: string): RoleGroup => {
  const key = normalizeRole(role);
  if (key === 'Admin') return 'admin';
  if (STAFF_ROLES.includes(key)) return 'staff';
  return 'owner';
};

export const getRoleLabel = (role?: string): string => {
  if (!role) return 'Khách hàng';
  const match = Object.keys(USER_ROLE_LABELS).find(
    k => k.toLowerCase() === role.toLowerCase()
  );
  return match ? USER_ROLE_LABELS[match] : role;
};
