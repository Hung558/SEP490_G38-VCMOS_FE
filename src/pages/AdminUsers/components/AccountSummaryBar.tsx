import React from 'react';
import { Alert, Button, Skeleton } from 'antd';
import {
  CustomerServiceOutlined,
  LockOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  ScissorOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { StatGrid, StatTile, type Tone } from '@/components/dashboard';
import type { AccountSummary } from './accountSummary';

const ROLE_TILES: {
  role: string;
  label: string;
  icon: React.ReactNode;
  tone: Tone;
}[] = [
  { role: 'PetOwner', label: 'Chủ nuôi', icon: <UserOutlined />, tone: 'teal' },
  {
    role: 'Receptionist',
    label: 'Lễ tân',
    icon: <CustomerServiceOutlined />,
    tone: 'blue',
  },
  {
    role: 'Veterinarian',
    label: 'Bác sĩ thú y',
    icon: <MedicineBoxOutlined />,
    tone: 'violet',
  },
  {
    role: 'Groomer',
    label: 'Nhân viên spa',
    icon: <ScissorOutlined />,
    tone: 'amber',
  },
  {
    role: 'Admin',
    label: 'Quản trị viên',
    icon: <SafetyCertificateOutlined />,
    tone: 'slate',
  },
];

interface Props {
  summary: AccountSummary | null;
  failed: boolean;
  onRetry: () => void;
}

/** Counts over every account, whatever the table filters say */
const AccountSummaryBar: React.FC<Props> = ({ summary, failed, onRetry }) => {
  if (failed)
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được số liệu tài khoản"
        action={
          <Button size="small" onClick={onRetry}>
            Thử lại
          </Button>
        }
      />
    );
  if (!summary)
    return <Skeleton active title={false} paragraph={{ rows: 2 }} />;
  const count = (value?: number) => (value ?? 0).toLocaleString('vi-VN');
  return (
    <StatGrid $min={150}>
      <StatTile
        icon={<TeamOutlined />}
        label="Tổng số tài khoản"
        value={count(summary.total)}
      />
      {ROLE_TILES.map(tile => (
        <StatTile
          key={tile.role}
          icon={tile.icon}
          tone={tile.tone}
          label={tile.label}
          value={count(summary.byRole[tile.role])}
        />
      ))}
      <StatTile
        icon={<LockOutlined />}
        tone="rose"
        label="Đang bị khóa"
        value={count(summary.locked)}
      />
    </StatGrid>
  );
};

export default AccountSummaryBar;
