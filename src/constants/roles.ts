export const USER_ROLE_LABELS: Record<string, string> = {
  Admin: 'Quản trị viên',
  Veterinarian: 'Bác sĩ thú y',
  Receptionist: 'Lễ tân',
  Groomer: 'Groomer',
  PetOwner: 'Khách hàng',
};

export const getRoleLabel = (role?: string): string => {
  if (!role) return 'Khách hàng';
  const match = Object.keys(USER_ROLE_LABELS).find(
    k => k.toLowerCase() === role.toLowerCase()
  );
  return match ? USER_ROLE_LABELS[match] : role;
};
