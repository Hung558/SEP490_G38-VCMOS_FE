import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import ServiceService, {
  type Service,
  type ServiceCategory,
  type ServiceFilters,
  type ServiceFormValues,
  type ServiceStatus,
  buildServicePayload,
  extractApiError,
  serviceStatusLabels,
  validateServiceForm,
} from '@/services/ServiceService';

interface UseServiceManagementOptions {
  pageSize: number;
}

const readServices = (response: unknown): Service[] => {
  const payload = response as { services?: Service[] } | undefined;
  return Array.isArray(payload?.services) ? payload.services : [];
};

const readService = (response: unknown): Service | null => {
  const payload = response as { service?: Service } | undefined;
  return payload?.service ?? null;
};

export const useServiceManagement = ({
  pageSize,
}: UseServiceManagementOptions) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [category, setCategory] = useState<ServiceCategory>();
  const [status, setStatus] = useState<ServiceStatus>();
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formFieldErrors, setFormFieldErrors] = useState<
    Record<string, string>
  >({});

  const [detailService, setDetailService] = useState<Service | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);

  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const formRequestId = useRef(0);
  const detailServiceIdRef = useRef<string | null>(null);

  const fetchServices = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setLoading(true);
    setListError(null);
    try {
      const response = await ServiceService.listServices({
        search: searchApplied,
        category,
        status,
      } satisfies ServiceFilters);
      if (requestId !== listRequestId.current) return;
      setServices(readServices(response));
    } catch (error) {
      if (requestId !== listRequestId.current) return;
      setListError(
        extractApiError(error, 'Không thể tải danh sách dịch vụ').message
      );
    } finally {
      if (requestId === listRequestId.current) setLoading(false);
    }
  }, [searchApplied, category, status]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const total = services.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(searchApplied || category || status);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const applySearch = useCallback((keyword: string) => {
    setPage(1);
    setSearchApplied(keyword.trim());
  }, []);

  const handleSearchChange = useCallback(
    (keyword: string) => {
      setSearchDraft(keyword);
      if (keyword.trim() === '') applySearch('');
    },
    [applySearch]
  );

  const handleCategoryChange = useCallback((value?: ServiceCategory) => {
    setPage(1);
    setCategory(value);
  }, []);

  const handleStatusChange = useCallback((value?: ServiceStatus) => {
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
    setEditingService(null);
    setFormFieldErrors({});
    setFormOpen(true);
  }, []);

  const loadServiceIntoForm = useCallback(async (serviceId: string) => {
    const requestId = ++formRequestId.current;
    setFormLoading(true);
    setFormFieldErrors({});
    try {
      const response = await ServiceService.getService(serviceId);
      if (requestId !== formRequestId.current) return;
      const service = readService(response);
      if (!service) throw new Error('empty-response');
      setEditingService(service);
      setFormOpen(true);
    } catch (error) {
      if (requestId !== formRequestId.current) return;
      toast.error(
        extractApiError(error, 'Không thể tải thông tin dịch vụ').message
      );
    } finally {
      if (requestId === formRequestId.current) setFormLoading(false);
    }
  }, []);

  const openEditForm = useCallback(
    (service: Service) => {
      loadServiceIntoForm(service._id);
    },
    [loadServiceIntoForm]
  );

  const closeForm = useCallback(() => {
    if (saving) return;
    formRequestId.current += 1;
    setFormLoading(false);
    setFormOpen(false);
    setEditingService(null);
    setFormFieldErrors({});
  }, [saving]);

  const submitForm = useCallback(
    async (values: ServiceFormValues) => {
      const { isValid, errors } = validateServiceForm(values);
      if (!isValid) {
        setFormFieldErrors(errors as Record<string, string>);
        return;
      }
      setFormFieldErrors({});
      setSaving(true);
      const isEditing = Boolean(editingService);
      try {
        if (editingService) {
          const payload = buildServicePayload(values);
          await ServiceService.updateService(editingService._id, payload);
        } else {
          const payload = buildServicePayload(values, { includeStatus: true });
          await ServiceService.createService({
            ...payload,
            status: 'Active',
          });
        }
        setFormOpen(false);
        setEditingService(null);
        toast.success(isEditing ? 'Đã cập nhật dịch vụ' : 'Đã tạo dịch vụ mới');
        await fetchServices();
      } catch (error) {
        const { message, fieldErrors } = extractApiError(
          error,
          isEditing ? 'Không thể cập nhật dịch vụ' : 'Không thể tạo dịch vụ'
        );
        setFormFieldErrors(fieldErrors as Record<string, string>);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [editingService, fetchServices]
  );

  const openDetail = useCallback(async (service: Service) => {
    const requestId = ++detailRequestId.current;
    detailServiceIdRef.current = service._id;
    setDetailService(service);
    setDetailOpen(true);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const response = await ServiceService.getService(service._id);
      if (requestId !== detailRequestId.current) return;
      const detail = readService(response);
      if (!detail) throw new Error('empty-response');
      setDetailService(detail);
    } catch (error) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(
        extractApiError(error, 'Không thể tải chi tiết dịch vụ').message
      );
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    detailRequestId.current += 1;
    detailServiceIdRef.current = null;
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailError(null);
    setDetailService(null);
  }, []);

  const retryDetail = useCallback(() => {
    const current = detailService;
    if (current) openDetail(current);
  }, [detailService, openDetail]);

  const changeStatus = useCallback(
    async (service: Service, nextStatus: ServiceStatus) => {
      setStatusPendingId(service._id);
      try {
        const response = await ServiceService.updateServiceStatus(
          service._id,
          nextStatus
        );
        const updated = readService(response);
        toast.success(
          nextStatus === 'Active'
            ? `Đã kích hoạt lại dịch vụ ${service.name}`
            : `Đã ngừng cung cấp dịch vụ ${service.name}`
        );
        setServices(previous =>
          previous.map(item =>
            item._id === service._id
              ? { ...item, status: updated?.status ?? nextStatus }
              : item
          )
        );
        if (detailServiceIdRef.current === service._id) {
          setDetailService(previous =>
            previous
              ? { ...previous, status: updated?.status ?? nextStatus }
              : previous
          );
        }
        await fetchServices();
      } catch (error) {
        toast.error(
          extractApiError(
            error,
            `Không thể chuyển trạng thái sang ${serviceStatusLabels[nextStatus]}`
          ).message
        );
      } finally {
        setStatusPendingId(null);
      }
    },
    [fetchServices]
  );

  return {
    services,
    loading,
    listError,
    total,
    page,
    pageCount,
    hasFilters,
    setPage,
    retryList: fetchServices,

    searchDraft,
    searchApplied,
    category,
    status,
    handleSearchChange,
    applySearch,
    handleCategoryChange,
    handleStatusChange,
    resetFilters,

    formOpen,
    editingService,
    formLoading,
    saving,
    formFieldErrors,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,

    detailOpen,
    detailService,
    detailLoading,
    detailError,
    openDetail,
    closeDetail,
    retryDetail,

    statusPendingId,
    changeStatus,
  };
};

export type ServiceManagementState = ReturnType<typeof useServiceManagement>;
