import api from '../01_axios';
import {
  apiProductActivate,
  apiProductDetail,
  apiProductInactivate,
  apiProducts,
} from './urls';
import type {
  Product,
  ProductCreatePayload,
  ProductFilters,
  ProductListResponse,
  ProductUpdatePayload,
} from './types';
import { buildProductQuery } from './helpers';

const listProducts = (
  filters?: ProductFilters
): Promise<{ success: boolean; data: ProductListResponse }> =>
  api.get(apiProducts, { params: buildProductQuery(filters) });

const getProduct = (id: string): Promise<{ success: boolean; data: Product }> =>
  api.get(apiProductDetail(id));

const createProduct = (
  data: ProductCreatePayload
): Promise<{ success: boolean; data: Product }> => api.post(apiProducts, data);

const updateProduct = (
  id: string,
  data: ProductUpdatePayload
): Promise<{ success: boolean; data: Product }> =>
  api.put(apiProductDetail(id), data);

const activateProduct = (
  id: string
): Promise<{ success: boolean; data: Product }> =>
  api.patch(apiProductActivate(id));

const inactivateProduct = (
  id: string
): Promise<{ success: boolean; data: Product }> =>
  api.patch(apiProductInactivate(id));

const ProductService = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  activateProduct,
  inactivateProduct,
};

export default ProductService;
export * from './types';
export * from './helpers';
