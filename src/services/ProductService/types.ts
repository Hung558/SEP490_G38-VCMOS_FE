export type ProductCategory = 'Medicine' | 'Vaccine' | 'Retail';

export type ProductStatus = 'Active' | 'Inactive';

export interface Product {
  _id: string;
  code: string;
  name: string;
  category: ProductCategory;
  unit: string;
  unitPrice?: number;
  status: ProductStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFilters {
  search?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

export interface ProductCreatePayload {
  name: string;
  category: ProductCategory;
  unit: string;
  unitPrice?: number;
}

export interface ProductUpdatePayload {
  name?: string;
  category?: ProductCategory;
  unit?: string;
  unitPrice?: number;
}

export interface ProductFormValues {
  name?: string;
  category?: ProductCategory;
  unit?: string;
  unitPrice?: number | null;
}

export type ProductFieldErrors = Record<string, string>;

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
