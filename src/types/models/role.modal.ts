// Base Role interface
export interface RoleModal {
  id: number;
  roleId: number;
  roleName: string;
  listCategory: Array<CategoryModal>;
}
export interface Function {
  funtionId?: number;
  functionId?: number;
  functionName?: string;
  description?: string;
  buttonShow?: string;
  checked?: boolean;
}
export interface CategoryModal {
  categoryName: string;
  listFunction: Array<Function>;
}

export interface CategoryRole {
  categoryId: number;
  categoryName: string;
  functions: Array<Function>;
}
