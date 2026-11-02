import { Button, Input, Select } from 'antd';
import {
  ClearOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  productCategoryLabels,
  productStatusLabels,
  type ProductCategory,
  type ProductStatus,
} from '@/services/ProductService';
import { FilterControl, SearchControl, Toolbar } from './styles';

interface Props {
  searchDraft: string;
  category?: ProductCategory;
  status?: ProductStatus;
  loading: boolean;
  onSearchChange: (keyword: string) => void;
  onSearchSubmit: (keyword: string) => void;
  onCategoryChange: (value?: ProductCategory) => void;
  onStatusChange: (value?: ProductStatus) => void;
  onReset: () => void;
  onRefresh: () => void;
}

const ProductFilters = ({
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
        placeholder="Tìm theo mã hoặc tên sản phẩm"
        value={searchDraft}
        onChange={event => onSearchChange(event.target.value)}
        onSearch={onSearchSubmit}
      />
    </SearchControl>
    <FilterControl>
      <Select
        allowClear
        placeholder="Loại sản phẩm"
        style={{ width: '100%' }}
        value={category}
        onChange={onCategoryChange}
        options={PRODUCT_CATEGORIES.map(item => ({
          value: item,
          label: productCategoryLabels[item],
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
        options={PRODUCT_STATUSES.map(item => ({
          value: item,
          label: productStatusLabels[item],
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

export default ProductFilters;
