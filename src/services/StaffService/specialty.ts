import type { StaffMember } from '../../types/api/staff.api';
import { getAssignableStaff, pickAssignableStaff } from './helpers.ts';

const specialtyLabel = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const specialtyKey = (label: string): string =>
  label.normalize('NFC').toLocaleLowerCase('vi');

/** Dùng danh sách lịch làm việc hiện có, rồi chỉ giữ bác sĩ đúng chuyên môn. */
export const pickSpecialtyAssignment = (
  onDuty: StaffMember[],
  all: StaffMember[],
  selectedSpecialty?: string
) => {
  const veterinarians = getAssignableStaff([...onDuty, ...all], 'Veterinarian');
  const labels = new Map<string, string>();
  for (const veterinarian of veterinarians) {
    const label = specialtyLabel(veterinarian.specialty);
    const key = specialtyKey(label);
    if (key && !labels.has(key)) labels.set(key, label);
  }
  const { staff, onDutyOnly } = pickAssignableStaff(
    onDuty,
    all,
    'Veterinarian'
  );
  return {
    hasVeterinarians: veterinarians.length > 0,
    specialties: [...labels].map(([value, label]) => ({ value, label })),
    staff: selectedSpecialty
      ? staff.filter(
          s => specialtyKey(specialtyLabel(s.specialty)) === selectedSpecialty
        )
      : [],
    onDutyOnly,
  };
};
