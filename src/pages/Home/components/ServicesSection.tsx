import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import ServiceService, {
  type Service,
  type ServiceCategory,
  SERVICE_CATEGORIES,
  serviceCategoryLabels,
  formatServicePrice,
} from '@/services/ServiceService';
import { filterActiveServices } from '@/services/AppointmentServiceService';
import styled from 'styled-components';
import { Button, Input, Pagination, Spin } from 'antd';
import {
  MedicineBoxOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  HeartOutlined,
  FileSearchOutlined,
  ScissorOutlined,
  SearchOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 24px 40px 24px;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 780px;
  margin: 0 auto 40px auto;

  .section-tag {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    color: #0d9488;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    padding: 5px 14px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 14px;
  }

  h2 {
    font-size: 36px;
    font-weight: 850;
    color: #0f172a;
    letter-spacing: -0.02em;
    margin: 0 0 14px 0;

    @media (max-width: 640px) {
      font-size: 28px;
    }
  }

  p {
    font-size: 16px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 36px;
  flex-wrap: wrap;
  /* Clears the sticky 68px home header when a page change scrolls back here */
  scroll-margin-top: 84px;

  .categories {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .cat-btn {
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease-in-out;

      &:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
      }

      &.active {
        background: #0d9488;
        border-color: #0d9488;
        color: #ffffff;
      }
    }
  }

  .search-wrap {
    width: 280px;

    @media (max-width: 640px) {
      width: 100%;
    }

    .ant-input-affix-wrapper {
      border-radius: 8px;
      border-color: #cbd5e1;
      height: 38px;
      &:hover,
      &:focus-within {
        border-color: #0d9488;
      }
    }
  }
`;

const ServicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ServiceCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.15s ease-in-out;
  position: relative;

  &:hover {
    border-color: #0d9488;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 18px;

    .icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #f0fdfa;
      color: #0d9488;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .meta-badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;

      .cat-badge {
        font-size: 11.5px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 9999px;
        background: #f1f5f9;
        color: #334155;
      }

      .duration-badge {
        font-size: 11px;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 3px;
      }
    }
  }

  h3 {
    font-size: 17px;
    font-weight: 750;
    color: #0f172a;
    margin: 0 0 8px 0;
    letter-spacing: -0.3px;
    line-height: 1.35;
  }

  p.desc {
    font-size: 13.5px;
    color: #64748b;
    line-height: 1.55;
    margin: 0 0 18px 0;
  }

  /* Pinned to the bottom so the buttons line up across cards */
  .card-footer {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .price-box {
      .label {
        font-size: 11px;
        color: #94a3b8;
        display: block;
      }
      .price {
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
      }
    }

    .btn-select {
      background: transparent;
      border: 1px solid #e2e8f0;
      color: #0d9488;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;

      &:hover {
        background: #0d9488;
        border-color: #0d9488;
        color: #ffffff;
      }
    }
  }
`;

const PaginationBar = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 32px;
`;

const EmptyNotice = styled.div`
  text-align: center;
  padding: 48px 16px;
  color: #64748b;
  font-size: 14.5px;
  grid-column: 1 / -1;
`;

// Two rows of the 3-column grid
const PAGE_SIZE = 6;

interface ServicesSectionProps {
  /** Opens the booking form with this service pre-selected */
  onSelectService: (serviceId: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Examination':
      return <MedicineBoxOutlined />;
    case 'Vaccination':
      return <CheckCircleOutlined />;
    case 'Grooming':
      return <ScissorOutlined />;
    case 'Paraclinical':
      return <FileSearchOutlined />;
    case 'Inpatient':
      return <HeartOutlined />;
    default:
      return <MedicineBoxOutlined />;
  }
};

// Tabs use the same category labels as the service badges (GET /services)
const categoryTabs: { key: ServiceCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả dịch vụ' },
  ...SERVICE_CATEGORIES.map(key => ({
    key,
    label: serviceCategoryLabels[key],
  })),
];

const ServicesSection: React.FC<ServicesSectionProps> = ({
  onSelectService,
}) => {
  const { isLogin } = useIsLogin();
  const [selectedCategory, setSelectedCategory] = useState<
    ServiceCategory | 'ALL'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState(false);

  // Only services in the database are shown: active ones, as guests and owners
  // can only book those
  const fetchServices = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await ServiceService.listServices(
        { status: 'Active' },
        { signal }
      );
      if (signal?.aborted) return;
      setServices(filterActiveServices(res?.services));
    } catch {
      if (signal?.aborted) return;
      setLoadError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchServices(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchServices]);

  const handleSelectService = (serviceId: string) => {
    if (!isLogin) {
      toast.info('Vui lòng đăng nhập để đặt dịch vụ cho thú cưng của bạn!');
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
    } else {
      onSelectService(serviceId);
    }
  };

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return services.filter(service => {
      const matchCategory =
        selectedCategory === 'ALL' || service.category === selectedCategory;
      const matchSearch =
        !query ||
        service.name.toLowerCase().includes(query) ||
        (service.description || '').toLowerCase().includes(query);
      return matchCategory && matchSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  // Clamped so a shorter list (e.g. after a reload) never leaves an empty page
  const pageCount = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedServices = filteredServices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // A new category or search starts again from the first page
  const changeCategory = (key: ServiceCategory | 'ALL') => {
    setSelectedCategory(key);
    setPage(1);
  };
  const changeSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  // A shorter page shrinks the grid under the pager the user just clicked, so
  // bring the list back into view when its top is hidden under the header
  const changePage = (next: number) => {
    setPage(next);
    const bar = filterBarRef.current;
    if (bar && bar.getBoundingClientRect().top < 68) {
      bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderGridBody = () => {
    if (loading) {
      return (
        <EmptyNotice>
          <Spin />
        </EmptyNotice>
      );
    }
    if (loadError) {
      return (
        <EmptyNotice>
          Không thể tải danh sách dịch vụ.{' '}
          <Button type="link" onClick={() => fetchServices()}>
            Thử lại
          </Button>
        </EmptyNotice>
      );
    }
    if (services.length === 0) {
      return <EmptyNotice>Phòng khám chưa có dịch vụ nào.</EmptyNotice>;
    }
    if (filteredServices.length === 0) {
      return (
        <EmptyNotice>
          Không tìm thấy dịch vụ nào phù hợp. Vui lòng thử từ khóa hoặc danh mục
          khác.
        </EmptyNotice>
      );
    }
    return pagedServices.map(item => (
      <ServiceCard key={item._id}>
        <div className="card-top">
          <div className="icon-box">{getCategoryIcon(item.category)}</div>
          <div className="meta-badges">
            <span className="cat-badge">
              {serviceCategoryLabels[item.category] || item.category}
            </span>
            {item.defaultDuration ? (
              <span className="duration-badge">
                <ClockCircleOutlined /> {item.defaultDuration} phút
              </span>
            ) : null}
          </div>
        </div>

        <h3>{item.name}</h3>
        {item.description && <p className="desc">{item.description}</p>}

        <div className="card-footer">
          <div className="price-box">
            <span className="label">Biểu phí niêm yết</span>
            <span className="price">{formatServicePrice(item.basePrice)}</span>
          </div>
          <button
            type="button"
            className="btn-select"
            onClick={() => handleSelectService(item._id)}
          >
            Đặt dịch vụ này <ArrowRightOutlined style={{ fontSize: 11 }} />
          </button>
        </div>
      </ServiceCard>
    ));
  };

  return (
    <SectionWrapper id="services">
      <SectionHeader>
        <span className="section-tag">Hệ Sinh Thái Dịch Vụ Y Tế Toàn Diện</span>
        <h2>Dịch Vụ Khám Chữa Bệnh & Chăm Sóc Sức Khỏe Thú Cưng</h2>
        <p>
          Quy trình y khoa chuẩn mực, thiết bị cận lâm sàng hiện đại cùng bảng
          giá niêm yết công khai. Toàn bộ chẩn đoán và phác đồ điều trị được tự
          động số hóa vào hồ sơ bệnh án điện tử SOAP.
        </p>
      </SectionHeader>

      <FilterBar ref={filterBarRef}>
        <div className="categories">
          {categoryTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`cat-btn ${selectedCategory === tab.key ? 'active' : ''}`}
              onClick={() => changeCategory(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="search-wrap">
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Tìm theo tên dịch vụ..."
            value={searchQuery}
            onChange={e => changeSearch(e.target.value)}
            allowClear
          />
        </div>
      </FilterBar>

      <ServicesGrid>{renderGridBody()}</ServicesGrid>

      {!loading && !loadError && filteredServices.length > PAGE_SIZE && (
        <PaginationBar>
          <Pagination
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={filteredServices.length}
            onChange={changePage}
            showSizeChanger={false}
          />
        </PaginationBar>
      )}
    </SectionWrapper>
  );
};

export default ServicesSection;
