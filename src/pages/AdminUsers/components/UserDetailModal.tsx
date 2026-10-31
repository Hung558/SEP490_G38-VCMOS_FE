import { Descriptions, Empty, List, Modal, Tag } from 'antd';
import type { AdminUser } from '@/services/AdminUserService';

const roleLabels: Record<string, string> = {
  PetOwner: 'Chủ nuôi',
  Receptionist: 'Lễ tân',
  Veterinarian: 'Bác sĩ thú y',
  Groomer: 'Groomer',
  Admin: 'Quản trị viên',
};

interface Props {
  user: AdminUser | null;
  open: boolean;
  loading: boolean;
  onCancel: () => void;
}

const UserDetailModal = ({ user, open, loading, onCancel }: Props) => (
  <Modal
    open={open}
    title="Chi tiết tài khoản"
    footer={null}
    onCancel={onCancel}
    confirmLoading={loading}
  >
    {user && (
      <>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Mã tài khoản">
            {user.code}
          </Descriptions.Item>
          <Descriptions.Item label="Họ tên">{user.fullName}</Descriptions.Item>
          <Descriptions.Item label="Điện thoại">{user.phone}</Descriptions.Item>
          <Descriptions.Item label="Email">
            {user.email || 'Chưa cập nhật'}
          </Descriptions.Item>
          <Descriptions.Item label="Vai trò">
            {roleLabels[user.role] || user.role}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag>{user.status}</Tag>
          </Descriptions.Item>
        </Descriptions>
        {user.role === 'PetOwner' && (
          <div style={{ marginTop: 20 }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>
              Thú cưng ({user.pets?.length || 0})
            </strong>
            {user.pets?.length ? (
              <List
                size="small"
                bordered
                dataSource={user.pets}
                renderItem={(pet: any) => (
                  <List.Item>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <span>
                        <strong>{String(pet.name || 'Thú cưng')}</strong>{' '}
                        {pet.code ? `(${pet.code})` : ''}
                      </span>
                      <span style={{ color: '#888' }}>
                        {[pet.species, pet.breed].filter(Boolean).join(' • ') ||
                          '—'}
                      </span>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có thú cưng"
              />
            )}
          </div>
        )}
      </>
    )}
  </Modal>
);

export default UserDetailModal;
