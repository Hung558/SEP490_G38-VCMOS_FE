import React from 'react';
import { Alert, Button, Skeleton } from 'antd';
import {
  CheckCircleOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  PauseCircleOutlined,
  ShopOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { StatGrid, StatTile } from '@/components/dashboard';
import { productCategoryLabels } from '@/services/ProductService';
import type { ProductSummary } from './useProductManagement';

interface Props {
  summary: ProductSummary | null;
  failed: boolean;
  onRetry: () => void;
}

/** Counts over the whole catalogue, whatever the table filters say */
const ProductSummaryBar: React.FC<Props> = ({ summary, failed, onRetry }) => {
  if (failed)
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được số liệu sản phẩm"
        action={
          <Button size="small" onClick={onRetry}>
            Thử lại
          </Button>
        }
      />
    );
  if (!summary)
    return <Skeleton active title={false} paragraph={{ rows: 2 }} />;
  const count = (value: number) => value.toLocaleString('vi-VN');
  return (
    <StatGrid $min={170}>
      <StatTile
        icon={<ShoppingOutlined />}
        tone="slate"
        label="Tổng số sản phẩm"
        value={count(summary.total)}
      />
      <StatTile
        icon={<CheckCircleOutlined />}
        label="Đang kinh doanh"
        value={count(summary.active)}
      />
      <StatTile
        icon={<PauseCircleOutlined />}
        tone="amber"
        label="Ngừng kinh doanh"
        value={count(summary.inactive)}
      />
      <StatTile
        icon={<MedicineBoxOutlined />}
        tone="blue"
        label={productCategoryLabels.Medicine}
        value={count(summary.byCategory.Medicine)}
      />
      <StatTile
        icon={<ExperimentOutlined />}
        tone="violet"
        label={productCategoryLabels.Vaccine}
        value={count(summary.byCategory.Vaccine)}
      />
      <StatTile
        icon={<ShopOutlined />}
        tone="rose"
        label={productCategoryLabels.Retail}
        value={count(summary.byCategory.Retail)}
      />
    </StatGrid>
  );
};

export default ProductSummaryBar;
