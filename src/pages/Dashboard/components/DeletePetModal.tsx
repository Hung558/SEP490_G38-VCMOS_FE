import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Typography } from 'antd';
import type { InputRef } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
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
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    setTypedName('');
  }, [pet]);

  const nameMatches = !!pet && typedName.trim() === pet.name.trim();

  const handleDelete = async () => {
    if (!pet || !nameMatches || deleting) return;
    try {
      setDeleting(true);
      await onConfirm(pet);
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
