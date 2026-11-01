import { Button, Input, Select } from 'antd';
import {
  ClearOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  serviceCategoryLabels,
  serviceStatusLabels,
  type ServiceCategory,
  type ServiceStatus,
} from '@/services/ServiceService';
import { FilterControl, SearchControl, Toolbar } from './styles';

interface Props {
  searchDraft: string;
  category?: ServiceCategory;
  status?: ServiceStatus;
  loading: boolean;
  onSearchChange: (keyword: string) => void;
  onSearchSubmit: (keyword: string) => void;
  onCategoryChange: (value?: ServiceCategory) => void;
  onStatusChange: (value?: ServiceStatus) => void;
  onReset: () => void;
  onRefresh: () => void;
}

const ServiceFilters = ({
  searchDraft,
  category,
  status,
  loading,
  onSearchChange,
  onSearchSubmit,
  onCategoryChange,
  onStatusChange,
  onReset,
  onRefresh,
}: Props) => (
  <Toolbar>
    <SearchControl>
      <Input.Search
        allowClear
        enterButton={<SearchOutlined />}
        placeholder="Tìm mã, tên hoặc mô tả dịch vụ"
        value={searchDraft}
        onChange={event => onSearchChange(event.target.value)}
        onSearch={onSearchSubmit}
      />
    </SearchControl>
    <FilterControl>
      <Select
        allowClear
        placeholder="Danh mục"
        style={{ width: '100%' }}
        value={category}
        onChange={onCategoryChange}
        options={SERVICE_CATEGORIES.map(item => ({
          value: item,
          label: serviceCategoryLabels[item],
        }))}
      />
    </FilterControl>
    <FilterControl>
      <Select
        allowClear
        placeholder="Trạng thái"
        style={{ width: '100%' }}
        value={status}
        onChange={onStatusChange}
        options={SERVICE_STATUSES.map(item => ({
          value: item,
          label: serviceStatusLabels[item],
        }))}
      />
    </FilterControl>
    <Button icon={<ClearOutlined />} onClick={onReset}>
      Xóa bộ lọc
    </Button>
    <Button icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>
      Làm mới
    </Button>
  </Toolbar>
);

export default ServiceFilters;
