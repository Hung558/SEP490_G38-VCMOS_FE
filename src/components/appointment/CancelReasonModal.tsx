import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Typography } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { validateCancelReason } from '@/services/AppointmentServiceService';

const { Paragraph, Text } = Typography;

export interface CancelReasonModalProps {
  open: boolean;
  title?: string;
  targetDescription?: React.ReactNode;
  warningText?: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

const CancelReasonModal: React.FC<CancelReasonModalProps> = ({
  open,
  title = 'Xác nhận hủy',
  targetDescription,
  warningText = 'Hành động này sẽ hủy lịch hẹn / dịch vụ đã đăng ký và không thể hoàn tác.',
  confirmLoading = false,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setFieldError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (confirmLoading) return;
    const err = validateCancelReason(reason);
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError(null);
    await onConfirm(reason.trim());
  };

  const isBlank = !reason.trim();

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      closable={!confirmLoading}
      maskClosable={!confirmLoading}
      afterOpenChange={isOpen => isOpen && inputRef.current?.focus()}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={confirmLoading}>
          Đóng
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger
          icon={<CloseCircleOutlined />}
          disabled={isBlank || confirmLoading}
          loading={confirmLoading}
          onClick={handleSubmit}
        >
          Xác nhận hủy
        </Button>,
      ]}
    >
      {warningText && (
        <Alert
          type="warning"
          showIcon
          message="Lưu ý"
          description={warningText}
          style={{ marginBottom: 16 }}
        />
      )}

      {targetDescription && (
        <div style={{ marginBottom: 12 }}>{targetDescription}</div>
      )}

      <Paragraph style={{ marginBottom: 6, fontWeight: 500 }}>
        Lý do hủy <Text type="danger">*</Text>:
      </Paragraph>

      <Input.TextArea
        ref={inputRef}
        rows={3}
        value={reason}
        onChange={e => {
          setReason(e.target.value);
          if (fieldError) setFieldError(null);
        }}
        placeholder="Vui lòng nhập lý do hủy (1 - 200 ký tự)..."
        maxLength={200}
        showCount
        disabled={confirmLoading}
        status={fieldError ? 'error' : undefined}
      />
      {fieldError && (
        <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>
          {fieldError}
        </div>
      )}
    </Modal>
  );
};

export default CancelReasonModal;
