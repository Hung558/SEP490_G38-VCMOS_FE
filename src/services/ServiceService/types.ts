export type ServiceCategory =
  | 'Examination'
  | 'Vaccination'
  | 'Grooming'
  | 'Paraclinical'
  | 'Inpatient';

export type ServiceStatus = 'Active' | 'Inactive';

/** Who performs a service (BE `requiredRole`, f19060f) */
export type ServiceStaffRole = 'Veterinarian' | 'Groomer';

export interface Service {
  _id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  defaultDuration?: number;
  basePrice?: number;
  description?: string;
  status: ServiceStatus;
  /** Unset on older services: the BE then decides by category */
  requiredRole?: ServiceStaffRole | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceFilters {
  search?: string;
  category?: ServiceCategory;
  status?: ServiceStatus;
}

export interface ServiceWritePayload {
  name: string;
  category: ServiceCategory;
  defaultDuration: number;
  basePrice: number;
  description?: string;
  status?: ServiceStatus;
  requiredRole?: ServiceStaffRole;
}

export interface ServiceFieldErrors {
  name?: string;
  category?: string;
  requiredRole?: string;
  defaultDuration?: string;
  basePrice?: string;
  description?: string;
  status?: string;
}
