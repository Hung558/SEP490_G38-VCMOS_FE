import { useEffect, useRef, useState } from 'react';
import { Button, ConfigProvider, InputNumber, Select, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ProductService, {
  productCategoryLabels,
} from '@/services/ProductService';
import type { Product } from '@/services/ProductService';
import { formatVnd, RETAIL_QUANTITY_MAX } from '@/services/InvoiceService';

interface ProductPickerProps {
  onAdd: (product: Product, quantity: number) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  addLabel?: string;
}

const SEARCH_DELAY_MS = 300;

/**
 * K1 (UC-45 bước 3, SCR-20 [+ Add product]): chỉ sản phẩm đang bán (Active,
 * BR-16, MSG27), số lượng 1–99.
 */
const ProductPicker = ({
  onAdd,
  disabled,
  loading,
  addLabel = 'Thêm',
}: ProductPickerProps) => {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [quantity, setQuantity] = useState<number | null>(1);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    const timer = window.setTimeout(() => {
      setFetching(true);
      ProductService.listProducts({
        status: 'Active',
        search: search || undefined,
        limit: 50,
      })
        .then(res => {
          if (requestId === requestRef.current)
            setProducts(res.data?.items || []);
        })
        .catch(() => {
          if (requestId === requestRef.current) setProducts([]);
        })
        .finally(() => {
          if (requestId === requestRef.current) setFetching(false);
        });
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const selected = products.find(p => p._id === selectedId);
  const canAdd =
    Boolean(selected) && typeof quantity === 'number' && quantity >= 1;

  const handleAdd = async () => {
    if (!selected || !quantity) return;
    await onAdd(selected, quantity);
    setSelectedId(undefined);
    setQuantity(1);
  };

  return (
    // The theme makes buttons 38px but leaves inputs at 32px; in one compact
    // row that left the search box lower than the quantity and the button
    <ConfigProvider theme={{ token: { controlHeight: 38 } }}>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          showSearch
          allowClear
          value={selectedId}
          placeholder="Tìm sản phẩm đang bán"
          filterOption={false}
          onSearch={setSearch}
          onChange={value => setSelectedId(value)}
          loading={fetching}
          disabled={disabled}
          notFoundContent={fetching ? 'Đang tìm…' : 'Không có sản phẩm phù hợp'}
          style={{ flex: 1, minWidth: 0 }}
          aria-label="Sản phẩm"
          options={products.map(product => ({
            value: product._id,
            label: `${product.name} (${product.unit}) · ${formatVnd(product.unitPrice)} · ${
              productCategoryLabels[product.category] || product.category
            }`,
          }))}
        />
        <InputNumber
          min={1}
          max={RETAIL_QUANTITY_MAX}
          precision={0}
          value={quantity}
          onChange={value => setQuantity(value)}
          disabled={disabled}
          aria-label="Số lượng"
          style={{ width: 80 }}
        />
        <Button
          icon={<PlusOutlined />}
          onClick={handleAdd}
          disabled={disabled || !canAdd}
          loading={loading}
        >
          {addLabel}
        </Button>
      </Space.Compact>
    </ConfigProvider>
  );
};

export default ProductPicker;
