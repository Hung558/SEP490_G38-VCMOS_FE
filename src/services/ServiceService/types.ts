export type ServiceCategory =
  | 'Examination'
  | 'Vaccination'
  | 'Grooming'
  | 'Paraclinical'
  | 'Inpatient';

export type ServiceStatus = 'Active' | 'Inactive';

export interface Service {
  _id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  defaultDuration?: number;
  basePrice?: number;
  description?: string;
  status: ServiceStatus;
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
}

export interface ServiceFieldErrors {
  name?: string;
  category?: string;
  defaultDuration?: string;
  basePrice?: string;
  description?: string;
  status?: string;
}
