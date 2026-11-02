export const apiProducts = '/products';
export const apiProductDetail = (id: string) => `/products/${id}`;
export const apiProductActivate = (id: string) => `/products/${id}/activate`;
export const apiProductInactivate = (id: string) =>
  `/products/${id}/inactivate`;
