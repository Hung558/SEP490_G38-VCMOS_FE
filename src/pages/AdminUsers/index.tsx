import {
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminUserService, {
  type AdminRole,
  type AdminUser,
  type AdminUserStatus,
  type CreateStaffPayload,
  type UpdateAdminUserPayload,
} from '@/services/AdminUserService';
import UserFormModal from './components/UserFormModal';
import UserDetailModal from './components/UserDetailModal';

const { Title, Text } = Typography;
const staffRoles: AdminRole[] = ['Receptionist', 'Veterinarian', 'Groomer'];
const roles: AdminRole[] = ['PetOwner', ...staffRoles, 'Admin'];
const statuses: AdminUserStatus[] = ['Active', 'Inactive', 'Locked'];
const roleLabels: Record<string, string> = {
  PetOwner: 'Chủ nuôi',
  Receptionist: 'Lễ tân',
  Veterinarian: 'Bác sĩ thú y',
  Groomer: 'Groomer',
  Admin: 'Quản trị viên',
};
const statusLabels: Record<string, string> = {
  Active: 'Hoạt động',
  Inactive: 'Vô hiệu hóa',
  Locked: 'Đã khóa',
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<AdminRole>();
  const [status, setStatus] = useState<AdminUserStatus>();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response: any = await AdminUserService.listUsers({
        search: search.trim() || undefined,
        role,
        status,
      });
      const userList = response?.users || response?.data?.users || [];
      setUsers(userList);
      setPage(1);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Không thể tải danh sách tài khoản'
      );
    } finally {
      setLoading(false);
    }
  }, [role, search, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFormSubmit = async (
    values: CreateStaffPayload | UpdateAdminUserPayload
  ) => {
    setSaving(true);
    try {
      if (editingUser)
        await AdminUserService.updateUser(
          editingUser._id,
          values as UpdateAdminUserPayload
        );
      else await AdminUserService.createStaff(values as CreateStaffPayload);
      toast.success(
        editingUser ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản nhân sự'
      );
      setFormOpen(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (error: any) {
      const errorData = error?.response?.data;
      const errorDetails = errorData?.errors
        ? Object.values(errorData.errors).join(', ')
        : '';
      const message = errorDetails || errorData?.message || 'Thao tác thất bại';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = useCallback(
    async (user: AdminUser, nextStatus: AdminUserStatus) => {
      try {
        await AdminUserService.updateStatus(user._id, nextStatus);
        toast.success(`Đã chuyển trạng thái sang ${statusLabels[nextStatus]}`);
        await fetchUsers();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || 'Không thể cập nhật trạng thái'
        );
      }
    },
    [fetchUsers]
  );

  const columns = useMemo(
    () => [
      { title: 'Mã', dataIndex: 'code', key: 'code' },
      { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
      {
        title: 'Liên hệ',
        key: 'contact',
        render: (_: unknown, user: AdminUser) => (
          <div>
            {user.phone}
            <br />
            <Text type="secondary">{user.email || '—'}</Text>
          </div>
        ),
      },
      {
        title: 'Vai trò',
        dataIndex: 'role',
        key: 'role',
        render: (value: AdminRole) => roleLabels[value] || value,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        render: (value: AdminUserStatus) => (
          <Tag
            color={
              value === 'Active'
                ? 'green'
                : value === 'Locked'
                  ? 'red'
                  : 'default'
            }
          >
            {statusLabels[value]}
          </Tag>
        ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        render: (_: unknown, user: AdminUser) => (
          <Space wrap>
            <Button
              icon={<EyeOutlined />}
              onClick={async () => {
                setDetailLoading(true);
                try {
                  const result: any = await AdminUserService.getUser(user._id);
                  const userObj = result?.user || result?.data?.user || null;
                  setDetailUser(userObj);
                } catch (error: any) {
                  toast.error(
                    error?.response?.data?.message || 'Không thể tải chi tiết'
                  );
                } finally {
                  setDetailLoading(false);
                }
              }}
            >
              Chi tiết
            </Button>
            {user.role !== 'Admin' && (
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingUser(user);
                  setFormOpen(true);
                }}
              >
                Sửa
              </Button>
            )}
            {user.status !== 'Active' && (
              <Popconfirm
                title="Kích hoạt tài khoản?"
                onConfirm={() => handleStatus(user, 'Active')}
              >
                <Button type="link">Mở khóa</Button>
              </Popconfirm>
            )}
            {user.status === 'Active' && (
              <>
                <Popconfirm
                  title="Khóa tài khoản này?"
                  onConfirm={() => handleStatus(user, 'Locked')}
                >
                  <Button danger type="link">
                    Khóa
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Vô hiệu hóa tài khoản này?"
                  onConfirm={() => handleStatus(user, 'Inactive')}
                >
                  <Button danger type="link">
                    Vô hiệu hóa
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        ),
      },
    ],
    [handleStatus]
  );

  return (
    <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space
            style={{ justifyContent: 'space-between', width: '100%' }}
            wrap
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Quản lý tài khoản
              </Title>
              <Text type="secondary">
                Tài khoản người dùng và nhân sự trong hệ thống
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null);
                setFormOpen(true);
              }}
            >
              Tạo tài khoản nhân sự
            </Button>
          </Space>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Tìm mã, tên, SĐT hoặc email"
              style={{ width: 300 }}
              value={search}
              onChange={event => setSearch(event.target.value)}
              onSearch={fetchUsers}
            />
            <Select
              allowClear
              placeholder="Vai trò"
              style={{ width: 180 }}
              value={role}
              onChange={setRole}
              options={roles.map(item => ({
                value: item,
                label: roleLabels[item],
              }))}
            />
            <Select
              allowClear
              placeholder="Trạng thái"
              style={{ width: 180 }}
              value={status}
              onChange={setStatus}
              options={statuses.map(item => ({
                value: item,
                label: statusLabels[item],
              }))}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
              Làm mới
            </Button>
          </Space>
          <Table
            rowKey="_id"
            loading={loading}
            columns={columns}
            dataSource={users}
            pagination={{
              current: page,
              pageSize: 10,
              onChange: setPage,
              showSizeChanger: false,
            }}
            locale={{ emptyText: 'Không có tài khoản phù hợp' }}
          />
        </Space>
      </Card>
      <UserFormModal
        open={formOpen}
        editingUser={editingUser}
        loading={saving}
        onCancel={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleFormSubmit}
      />
      <UserDetailModal
        user={detailUser}
        open={Boolean(detailUser)}
        loading={detailLoading}
        onCancel={() => setDetailUser(null)}
      />
    </div>
  );
};

export default AdminUsersPage;
