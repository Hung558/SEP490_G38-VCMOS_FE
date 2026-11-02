import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import {
  AppstoreOutlined,
  LockOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AdminUserService from '@/services/AdminUserService';
import ServiceService from '@/services/ServiceService';
import ROUTER from '@/routerMap/ROUTER';
import { USER_ROLE_LABELS } from '@/constants/roles';
import { summarizeAccounts, type AccountSummary } from './profileContent';
import { SectionCard } from './styles';

const ROLE_ORDER = [
  'PetOwner',
  'Receptionist',
  'Veterinarian',
  'Groomer',
  'Admin',
];

/** Admin: account and service counts from the APIs, plus shortcuts */
const AdminOverviewSection: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [activeServices, setActiveServices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setFailed(false);
      const [usersRes, servicesRes] = await Promise.all([
        AdminUserService.listUsers(),
        ServiceService.listServices({ status: 'Active' }),
      ]);
      setSummary(summarizeAccounts(usersRes.users || []));
      setActiveServices((servicesRes.services || []).length);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tiles: {
    key: string;
    label: string;
    value: number;
    icon?: React.ReactNode;
  }[] = summary
    ? [
        { key: 'total', label: 'Tổng số tài khoản', value: summary.total },
        ...ROLE_ORDER.map(role => ({
          key: role,
          label: USER_ROLE_LABELS[role],
          value: summary.byRole[role] || 0,
        })),
        {
          key: 'locked',
          label: 'Đang bị khóa',
          value: summary.locked,
          icon: <LockOutlined />,
        },
        {
          key: 'services',
          label: 'Dịch vụ đang hoạt động',
          value: activeServices,
        },
      ]
    : [];

  return (
    <SectionCard>
      <div className="section-header">
        <div>
          <h4>Tổng quan quản trị</h4>
          <div className="section-desc">
            Số liệu tài khoản và dịch vụ hiện có trong hệ thống.
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : failed ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được số liệu tổng quan"
          action={
            <Button size="small" onClick={load}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      ) : (
        <div className="stat-grid">
          {tiles.map(tile => (
            <div className="stat-tile" key={tile.key}>
              <div className="stat-label">
                {tile.icon}
                <span>{tile.label}</span>
              </div>
              <div className="stat-value">
                {tile.value.toLocaleString('vi-VN')}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="shortcut-row">
        <Button
          icon={<TeamOutlined />}
          onClick={() => navigate(ROUTER.ADMIN_USERS)}
        >
          Quản lý tài khoản
        </Button>
        <Button
          icon={<AppstoreOutlined />}
          onClick={() => navigate(ROUTER.ADMIN_SERVICES)}
        >
          Quản lý dịch vụ
        </Button>
      </div>
    </SectionCard>
  );
};

export default AdminOverviewSection;
