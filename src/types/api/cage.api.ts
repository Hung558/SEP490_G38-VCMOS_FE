export type CageSize = 'S' | 'M' | 'L' | 'XL';
export type CageStatus = 'Available' | 'Occupied';

export interface Cage {
  _id: string;
  label: string;
  size: CageSize;
  /** Overrides the size limit of BR-11 when set */
  maxWeightKg?: number | null;
  zone?: 'Holding' | 'InpatientWard';
  isIsolated: boolean;
  status: CageStatus;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export type CageSort =
  | 'label'
  | '-label'
  | 'size'
  | '-size'
  | 'status'
  | '-status'
  | 'createdAt'
  | '-createdAt'
  | 'updatedAt'
  | '-updatedAt';

export interface CageListParams {
  status?: CageStatus;
  size?: CageSize;
  isIsolated?: boolean;
  page?: number;
  limit?: number;
  sort?: CageSort;
}

export interface CageListData {
  items: Cage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CageCreatePayload {
  label: string;
  size: CageSize;
  isIsolated?: boolean;
  status?: CageStatus;
}

export interface CageUpdatePayload {
  label?: string;
  size?: CageSize;
  isIsolated?: boolean;
  status?: CageStatus;
}

export interface CageFormValues {
  label?: string;
  size?: CageSize;
  isIsolated?: boolean;
  status?: CageStatus;
}

export type CageFieldErrors = Record<string, string>;
