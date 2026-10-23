import type { RoleModal } from '../models';

// Form data interface - unified for create and edit
export interface RoleFormData {
  roleId?: number;
  roleName: string;
  functionIds: Array<number>;
}

export interface RoleFilterDTO {
  textSearch: string;
}

// Form mode type
export type RoleFormMode = 'create' | 'edit';

type SubmitResponse = {
  success: boolean;
  // data?: any;
  error?: string;
};

// Component props types
export interface RoleFormProps {
  open: RoleModal | boolean;
  defaultValues?: Partial<RoleFormData>;
  onSubmit: (
    values: CreateRoleRequest | UpdateRoleRequest
  ) => Promise<SubmitResponse>;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export interface RoleModalProps {
  open: RoleModal | boolean;
  onCancel: () => void;
  onSubmit: (
    values: CreateRoleRequest | UpdateRoleRequest
  ) => Promise<SubmitResponse>;
  onSuccess?: () => void;
}

// Filter types
export interface RoleFilterRequest {
  pageIndex: number;
  pageSize: number;
  textSearch?: string;
}

// API Request types
export interface CreateRoleRequest {
  roleName: string;
  roleId?: number;
  functionIds: Array<number>;
}
export interface UpdateRoleRequest {
  roleName: string;
  roleId?: number;
  functionIds: Array<number>;
}
