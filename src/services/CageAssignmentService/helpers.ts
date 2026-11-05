import type {
  ListCageAssignmentsParams,
  CreateCageAssignmentPayload,
  PopulatedAssignedByRef,
} from './types';
import type { Cage, StaffAppointment } from '@/types';

export const buildCageAssignmentQuery = (
  params?: ListCageAssignmentsParams
): Record<string, string> => {
  if (!params) return {};
  const query: Record<string, string> = {};

  if (
    params.cageId &&
    typeof params.cageId === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(params.cageId.trim())
  ) {
    query.cageId = params.cageId.trim();
  }

  if (
    params.orderId &&
    typeof params.orderId === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(params.orderId.trim())
  ) {
    query.orderId = params.orderId.trim();
  }

  if (typeof params.active === 'boolean') {
    query.active = String(params.active);
  }

  return query;
};

export const buildCreateCageAssignmentPayload = (
  raw: CreateCageAssignmentPayload
): CreateCageAssignmentPayload => {
  return {
    cageId: (raw.cageId || '').trim(),
    orderId: (raw.orderId || '').trim(),
  };
};

export const getAssignmentCageLabel = (cage?: Cage | string | null): string => {
  if (!cage) return 'Chưa rõ';
  if (typeof cage === 'object' && cage !== null && 'label' in cage) {
    return cage.label || 'Chưa rõ';
  }
  if (typeof cage === 'string') {
    return cage;
  }
  return 'Chưa rõ';
};

export const getAssignmentCageSize = (cage?: Cage | string | null): string => {
  if (!cage) return '-';
  if (typeof cage === 'object' && cage !== null && 'size' in cage) {
    return cage.size || '-';
  }
  return '-';
};

export const getAssignmentOrderCode = (
  order?: StaffAppointment | string | null
): string => {
  if (!order) return '-';
  if (typeof order === 'object' && order !== null && 'code' in order) {
    return order.code || '-';
  }
  if (typeof order === 'string') {
    return order;
  }
  return '-';
};

export const getAssignmentOperatorName = (
  operator?: PopulatedAssignedByRef | string | null
): string => {
  if (!operator) return '-';
  if (
    typeof operator === 'object' &&
    operator !== null &&
    'fullName' in operator
  ) {
    return operator.fullName || '-';
  }
  if (typeof operator === 'string') {
    return operator;
  }
  return '-';
};

export const isAssignmentActive = (assignment: {
  releasedAt?: string | null;
}): boolean => {
  return !assignment.releasedAt;
};
