import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Typography } from 'antd';
import type { InputRef } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { isAxiosError } from 'axios';
import type { Pet } from '@/types';

const { Paragraph, Text } = Typography;

interface DeletePetModalProps {
  /** Pet waiting for confirmation; null keeps the modal closed */
  pet: Pet | null;
  onCancel: () => void;
  onConfirm: (pet: Pet) => Promise<void>;
}

/** GitHub-style confirmation: the owner types the pet's name to delete it. */
const DeletePetModal: React.FC<DeletePetModalProps> = ({
  pet,
  onCancel,
  onConfirm,
}) => {
  const [typedName, setTypedName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{
    message: string;
    conflict: boolean;
  }>();
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    setTypedName('');
    setDeleteError(undefined);
  }, [pet]);

  const nameMatches = !!pet && typedName.trim() === pet.name.trim();

  const handleDelete = async () => {
    if (!pet || !nameMatches || deleting) return;
    try {
      setDeleting(true);
      setDeleteError(undefined);
      await onConfirm(pet);
    } catch (error: unknown) {
      const response = isAxiosError<{ message?: string }>(error)
        ? error.response
        : undefined;
      setDeleteError({
        message:
          response?.data?.message ||
          'Không thể xóa hồ sơ thú cưng. Vui lòng thử lại.',
        conflict: response?.status === 409,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={!!pet}
      title="Xóa thú cưng"
      onCancel={onCancel}
      closable={!deleting}
      maskClosable={!deleting}
      afterOpenChange={isOpen => isOpen && inputRef.current?.focus()}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={deleting}>
          Hủy
        </Button>,
        <Button
          key="delete"
          type="primary"
          danger
          icon={<DeleteOutlined />}
          disabled={!nameMatches}
          loading={deleting}
          onClick={handleDelete}
        >
          Xóa thú cưng
        </Button>,
      ]}
    >
      <Alert
        type="warning"
        showIcon
        message="Hành động này không thể hoàn tác"
        description={`Hồ sơ của ${pet?.name ?? ''} sẽ chuyển sang mục Đã xóa. Bạn sẽ không chỉnh sửa hay khôi phục được hồ sơ này.`}
        style={{ marginBottom: 16 }}
      />
      {deleteError && (
        <Alert
          type="error"
          showIcon
          message={deleteError.message}
          description={
            deleteError.conflict
              ? 'Hãy kiểm tra mục Lịch hẹn và xử lý các lịch hoặc ca còn mở trước khi thử lại.'
              : undefined
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Paragraph style={{ marginBottom: 8 }}>
        Nhập <Text strong>{pet?.name}</Text> để xác nhận:
      </Paragraph>
      <Input
        ref={inputRef}
        value={typedName}
        onChange={e => setTypedName(e.target.value)}
        onPressEnter={handleDelete}
        placeholder={pet?.name}
        aria-label="Tên thú cưng cần xóa"
        disabled={deleting}
      />
    </Modal>
  );
};

export default DeletePetModal;
