import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { normalizeRole } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import CageService, {
  buildCageCreatePayload,
  buildCageUpdatePayload,
  extractApiError,
  validateCageCreateForm,
  validateCageUpdateForm,
  type Cage,
  type CageFormValues,
  type CageListParams,
  type CageSize,
  type CageSort,
  type CageStatus,
} from '@/services/CageService';

interface StoredUserInfo {
  role?: string;
  systemRole?: string;
  [key: string]: unknown;
}

interface UseCageManagementOptions {
  pageSize: number;
}

export const useCageManagement = ({ pageSize }: UseCageManagementOptions) => {
  const { user } = useAuth();
  const storedUser = storage.getLocalStorage<StoredUserInfo>(STORAGE.USER_INFO);
  const effectiveUser =
    user || (storedUser && typeof storedUser === 'object' ? storedUser : null);
  const role = normalizeRole(effectiveUser?.role || effectiveUser?.systemRole);
  const isAdmin = role === 'Admin';
  const isReceptionist = role === 'Receptionist';

  // List states
  const [cages, setCages] = useState<Cage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Filters & sorting & pagination
  const [status, setStatus] = useState<CageStatus | undefined>();
  const [size, setSize] = useState<CageSize | undefined>();
  const [isIsolated, setIsIsolated] = useState<boolean | undefined>();
  const [sort, setSort] = useState<CageSort | undefined>();
  const [page, setPage] = useState(1);

  // Detail states
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCage, setDetailCage] = useState<Cage | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Form states (Admin only)
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingCage, setEditingCage] = useState<Cage | null>(null);
  const [saving, setSaving] = useState(false);
  const [formFieldErrors, setFormFieldErrors] = useState<
    Record<string, string>
  >({});
  const [formGeneralError, setFormGeneralError] = useState<string | null>(null);

  // Race condition guards
  const listReqSeqRef = useRef(0);
  const listAbortControllerRef = useRef<AbortController | null>(null);
  const detailReqSeqRef = useRef(0);
  const detailAbortControllerRef = useRef<AbortController | null>(null);

  const fetchCages = useCallback(async () => {
    if (listAbortControllerRef.current) {
      listAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    listAbortControllerRef.current = abortController;
    const seq = ++listReqSeqRef.current;

    setLoading(true);
    setListError(null);

    const params: CageListParams = {
      status,
      size,
      isIsolated,
      sort,
      page,
      limit: pageSize,
    };

    try {
      const response = await CageService.listCages(params, {
        signal: abortController.signal,
      });

      if (seq === listReqSeqRef.current) {
        const items = Array.isArray(response?.data?.items)
          ? response.data.items
          : [];
        const count =
          typeof response?.data?.total === 'number'
            ? response.data.total
            : items.length;
        setCages(items);
        setTotal(count);
      }
    } catch (err: unknown) {
      if (axios.isCancel(err) || seq !== listReqSeqRef.current) {
        return;
      }
      const apiErr = extractApiError(err);
      setListError(apiErr.message);
    } finally {
      if (seq === listReqSeqRef.current) {
        setLoading(false);
      }
    }
  }, [status, size, isIsolated, sort, page, pageSize]);

  useEffect(() => {
    fetchCages();
    return () => {
      if (listAbortControllerRef.current) {
        listAbortControllerRef.current.abort();
      }
    };
  }, [fetchCages]);

  const handleFilterStatus = (newStatus?: CageStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleFilterSize = (newSize?: CageSize) => {
    setSize(newSize);
    setPage(1);
  };

  const handleFilterIsolated = (newIsolated?: boolean) => {
    setIsIsolated(newIsolated);
    setPage(1);
  };

  const handleSort = (newSort?: CageSort) => {
    setSort(newSort);
    setPage(1);
  };

  const resetFilters = () => {
    setStatus(undefined);
    setSize(undefined);
    setIsIsolated(undefined);
    setSort(undefined);
    setPage(1);
  };

  const retryList = () => {
    fetchCages();
  };

  // Detail workflow
  const openDetail = useCallback(async (id: string) => {
    if (detailAbortControllerRef.current) {
      detailAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    detailAbortControllerRef.current = abortController;
    const seq = ++detailReqSeqRef.current;

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailCage(null);

    try {
      const response = await CageService.getCage(id, {
        signal: abortController.signal,
      });

      if (seq === detailReqSeqRef.current) {
        setDetailCage(response?.data || null);
      }
    } catch (err: unknown) {
      if (axios.isCancel(err) || seq !== detailReqSeqRef.current) {
        return;
      }
      const apiErr = extractApiError(err);
      setDetailError(apiErr.message);
    } finally {
      if (seq === detailReqSeqRef.current) {
        setDetailLoading(false);
      }
    }
  }, []);

  const closeDetail = () => {
    if (detailAbortControllerRef.current) {
      detailAbortControllerRef.current.abort();
    }
    setDetailOpen(false);
    setDetailCage(null);
    setDetailError(null);
  };

  // Create & Edit workflows (Admin only)
  const openCreateForm = () => {
    if (!isAdmin) return;
    setFormMode('create');
    setEditingCage(null);
    setFormFieldErrors({});
    setFormGeneralError(null);
    setFormOpen(true);
  };

  const openEditForm = (cage: Cage) => {
    if (!isAdmin) return;
    setFormMode('edit');
    setEditingCage(cage);
    setFormFieldErrors({});
    setFormGeneralError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingCage(null);
    setFormFieldErrors({});
    setFormGeneralError(null);
  };

  const submitForm = async (values: CageFormValues): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Bạn không có quyền thực hiện chức năng này');
      return false;
    }

    setFormFieldErrors({});
    setFormGeneralError(null);

    // Client-side validation
    const clientErrors =
      formMode === 'create'
        ? validateCageCreateForm(values)
        : validateCageUpdateForm(values);

    if (Object.keys(clientErrors).length > 0) {
      setFormFieldErrors(clientErrors);
      if (clientErrors._form) {
        setFormGeneralError(clientErrors._form);
        toast.error(clientErrors._form);
      }
      return false;
    }

    setSaving(true);
    try {
      if (formMode === 'create') {
        const payload = buildCageCreatePayload(values);
        const response = await CageService.createCage(payload);
        toast.success(response?.message || 'Tạo chuồng thành công');
        closeForm();
        fetchCages();
        return true;
      } else {
        if (!editingCage?._id) return false;
        const payload = buildCageUpdatePayload(values);
        const response = await CageService.updateCage(editingCage._id, payload);
        toast.success(response?.message || 'Cập nhật chuồng thành công');
        closeForm();
        fetchCages();
        return true;
      }
    } catch (err: unknown) {
      const apiErr = extractApiError(err);
      setFormFieldErrors(apiErr.fieldErrors);
      setFormGeneralError(apiErr.message);
      toast.error(apiErr.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = Boolean(
    status || size || isIsolated !== undefined || sort
  );

  return {
    isAdmin,
    isReceptionist,
    cages,
    total,
    loading,
    listError,
    status,
    size,
    isIsolated,
    sort,
    page,
    pageSize,
    hasFilters,
    setPage,
    handleFilterStatus,
    handleFilterSize,
    handleFilterIsolated,
    handleSort,
    resetFilters,
    retryList,
    detailOpen,
    detailLoading,
    detailCage,
    detailError,
    openDetail,
    closeDetail,
    formOpen,
    formMode,
    editingCage,
    saving,
    formFieldErrors,
    formGeneralError,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,
  };
};
