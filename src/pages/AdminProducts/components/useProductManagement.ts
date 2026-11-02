import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import ProductService, {
  buildProductPayload,
  buildProductUpdatePayload,
  extractApiError,
  validateProductForm,
  type Product,
  type ProductCategory,
  type ProductFilters,
  type ProductFormValues,
  type ProductStatus,
} from '@/services/ProductService';

interface UseProductManagementOptions {
  pageSize: number;
}

const readProducts = (
  response: unknown
): { items: Product[]; total: number } => {
  const payload = response as
    | {
        data?: {
          items?: Product[];
          total?: number;
        };
      }
    | undefined;

  const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
  const total =
    typeof payload?.data?.total === 'number'
      ? payload.data.total
      : items.length;

  return { items, total };
};

const readProduct = (response: unknown): Product | null => {
  const payload = response as { data?: Product } | undefined;
  return payload?.data ?? null;
};

export const useProductManagement = ({
  pageSize,
}: UseProductManagementOptions) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [category, setCategory] = useState<ProductCategory>();
  const [status, setStatus] = useState<ProductStatus>();
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formFieldErrors, setFormFieldErrors] = useState<
    Record<string, string>
  >({});

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);

  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const formRequestId = useRef(0);
  const detailProductIdRef = useRef<string | null>(null);

  const fetchProducts = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setLoading(true);
    setListError(null);
    try {
      const response = await ProductService.listProducts({
        search: searchApplied,
        category,
        status,
        page,
        limit: pageSize,
      } satisfies ProductFilters);
      if (requestId !== listRequestId.current) return;
      const { items, total: totalCount } = readProducts(response);
      setProducts(items);
      setTotal(totalCount);
    } catch (error) {
      if (requestId !== listRequestId.current) return;
      setListError(
        extractApiError(error, 'Không thể tải danh sách sản phẩm').message
      );
    } finally {
      if (requestId === listRequestId.current) setLoading(false);
    }
  }, [searchApplied, category, status, page, pageSize]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const hasFilters = Boolean(searchApplied || category || status);

  const applySearch = useCallback((keyword: string) => {
    setPage(1);
    setSearchApplied(keyword.trim());
  }, []);

  const handleSearchChange = useCallback((keyword: string) => {
    setSearchDraft(keyword);
    if (!keyword.trim()) {
      setSearchApplied('');
      setPage(1);
    }
  }, []);

  const handleCategoryChange = useCallback((value?: ProductCategory) => {
    setPage(1);
    setCategory(value);
  }, []);

  const handleStatusChange = useCallback((value?: ProductStatus) => {
    setPage(1);
    setStatus(value);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchDraft('');
    setSearchApplied('');
    setCategory(undefined);
    setStatus(undefined);
    setPage(1);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingProduct(null);
    setFormFieldErrors({});
    setFormLoading(false);
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback(async (product: Product) => {
    setEditingProduct(product);
    setFormFieldErrors({});
    setFormLoading(true);
    setFormOpen(true);

    const requestId = ++formRequestId.current;
    try {
      const response = await ProductService.getProduct(product._id);
      if (requestId !== formRequestId.current) return;
      const fresh = readProduct(response);
      if (fresh) setEditingProduct(fresh);
    } catch (error) {
      if (requestId !== formRequestId.current) return;
      toast.error(
        extractApiError(error, 'Không thể tải thông tin mới nhất của sản phẩm')
          .message
      );
    } finally {
      if (requestId === formRequestId.current) setFormLoading(false);
    }
  }, []);

  const closeForm = useCallback(() => {
    if (saving) return;
    setFormOpen(false);
    setEditingProduct(null);
    setFormFieldErrors({});
    setFormLoading(false);
  }, [saving]);

  const submitForm = useCallback(
    async (values: ProductFormValues) => {
      const localErrors = validateProductForm(values);
      if (Object.keys(localErrors).length > 0) {
        setFormFieldErrors(localErrors);
        return;
      }
      setFormFieldErrors({});
      setSaving(true);
      try {
        if (editingProduct) {
          const payload = buildProductUpdatePayload(values);
          const response = await ProductService.updateProduct(
            editingProduct._id,
            payload
          );
          const updated = readProduct(response);
          toast.success(
            `Cập nhật sản phẩm "${updated?.name || values.name}" thành công`
          );
        } else {
          const payload = buildProductPayload(values);
          const response = await ProductService.createProduct(payload);
          const created = readProduct(response);
          toast.success(
            `Thêm mới sản phẩm "${created?.name || values.name}" thành công`
          );
        }
        setFormOpen(false);
        setEditingProduct(null);
        await fetchProducts();
      } catch (error) {
        const parsed = extractApiError(
          error,
          editingProduct
            ? 'Không thể cập nhật sản phẩm'
            : 'Không thể thêm sản phẩm'
        );
        toast.error(parsed.message);
        setFormFieldErrors(parsed.fieldErrors);
      } finally {
        setSaving(false);
      }
    },
    [editingProduct, fetchProducts]
  );

  const openDetail = useCallback(async (product: Product) => {
    setDetailProduct(product);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    detailProductIdRef.current = product._id;

    const requestId = ++detailRequestId.current;
    try {
      const response = await ProductService.getProduct(product._id);
      if (requestId !== detailRequestId.current) return;
      const fresh = readProduct(response);
      if (fresh) setDetailProduct(fresh);
    } catch (error) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(
        extractApiError(error, 'Không thể tải chi tiết sản phẩm').message
      );
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, []);

  const retryDetail = useCallback(() => {
    if (detailProductIdRef.current) {
      openDetail({
        _id: detailProductIdRef.current,
        code: '',
        name: '',
        category: 'Medicine',
        unit: '',
        status: 'Active',
      });
    }
  }, [openDetail]);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailProduct(null);
    setDetailError(null);
    detailProductIdRef.current = null;
  }, []);

  const toggleStatus = useCallback(
    async (product: Product) => {
      const isActive = product.status === 'Active';
      const actionLabel = isActive ? 'Ngừng kinh doanh' : 'Kích hoạt';
      setStatusPendingId(product._id);
      try {
        if (isActive) {
          await ProductService.inactivateProduct(product._id);
        } else {
          await ProductService.activateProduct(product._id);
        }
        toast.success(`${actionLabel} sản phẩm "${product.name}" thành công`);
        await fetchProducts();
      } catch (error) {
        toast.error(
          extractApiError(
            error,
            `Không thể ${actionLabel.toLowerCase()} sản phẩm`
          ).message
        );
      } finally {
        setStatusPendingId(null);
      }
    },
    [fetchProducts]
  );

  return {
    products,
    total,
    loading,
    listError,
    searchDraft,
    category,
    status,
    page,
    hasFilters,
    formOpen,
    editingProduct,
    formLoading,
    saving,
    formFieldErrors,
    detailOpen,
    detailProduct,
    detailLoading,
    detailError,
    statusPendingId,
    setPage,
    handleSearchChange,
    applySearch,
    handleCategoryChange,
    handleStatusChange,
    resetFilters,
    retryList: fetchProducts,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,
    openDetail,
    retryDetail,
    closeDetail,
    toggleStatus,
  };
};
