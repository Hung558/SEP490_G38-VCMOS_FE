import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { toast } from 'sonner';
import { getRoleLabel } from '@/constants/roles';
import { extractApiError } from '@/services/AppointmentServiceService';
import StaffService, {
  formatStaffOption,
  getAssignableStaff,
} from '@/services/StaffService';
import SubtaskRequestService, {
  getSubtaskActions,
  populated,
  SUBTASK_LIMIT,
  SUBTASK_STATUSES,
  type CreateSubtask,
} from '@/services/SubtaskRequestService';
import type { StaffMember } from '@/types';
import { SubtaskDetailLoader } from './SubtaskDetails';
import { useSubtaskList } from './useSubtaskList';

interface Props {
  serviceId: string;
  requesterId?: string;
  canCreate?: boolean;
  createHint?: string;
  onRetryCreate?: () => void;
  onClose: () => void;
}
type Fields = Omit<CreateSubtask, 'appointmentServiceId'>;

const CreateSubtaskForm = ({
  form,
  disabled,
  onFinish,
}: {
  form: ReturnType<typeof Form.useForm<Fields>>[0];
  disabled: boolean;
  onFinish: (fields: Fields) => void;
}) => {
  const [staff, setStaff] = useState<StaffMember[]>();
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const fetchStaff = async () => {
      const options = { signal: controller.signal };
      const params = { status: 'Active', limit: 100 } as const;
      const first = await StaffService.listStaff(
        { ...params, page: 1 },
        options
      );
      const items = [...first.items];
      for (
        let page = 2;
        page <= first.pagination?.totalPages && !controller.signal.aborted;
        page += 1
      ) {
        const result = await StaffService.listStaff(
          { ...params, page },
          options
        );
        items.push(...result.items);
      }
      if (!controller.signal.aborted)
        setStaff([
          ...getAssignableStaff(items, 'Veterinarian'),
          ...getAssignableStaff(items, 'Groomer'),
        ]);
    };
    fetchStaff().catch(err => {
      if (!controller.signal.aborted)
        setError(extractApiError(err, 'Không tải được nhân sự.').message);
    });
    return () => controller.abort();
  }, [revision]);

  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button
              size="small"
              onClick={() => {
                setError(undefined);
                setRevision(n => n + 1);
              }}
            >
              Tải lại nhân sự
            </Button>
          }
        />
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={disabled}
        onFinish={onFinish}
      >
        <Form.Item
          name="taskType"
          label="Tên chỉ định"
          rules={[
            { required: true, whitespace: true, message: 'Nhập tên chỉ định.' },
            { max: SUBTASK_LIMIT.taskType },
          ]}
        >
          <Input
            maxLength={SUBTASK_LIMIT.taskType}
            placeholder="Ví dụ: Siêu âm ổ bụng"
          />
        </Form.Item>
        <Form.Item
          name="assignedStaffId"
          label="Nhân sự thực hiện"
          rules={[{ required: true, message: 'Chọn nhân sự thực hiện.' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Chọn bác sĩ hoặc Groomer"
            loading={!staff && !error}
            options={staff?.map(member => ({
              value: member._id,
              label: [
                formatStaffOption(member),
                getRoleLabel(member.role),
                member.specialty,
              ]
                .filter(Boolean)
                .join(' · '),
            }))}
          />
        </Form.Item>
        <Form.Item
          name="instructions"
          label="Hướng dẫn (không bắt buộc)"
          rules={[{ max: SUBTASK_LIMIT.instructions }]}
        >
          <Input.TextArea rows={2} maxLength={SUBTASK_LIMIT.instructions} />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          disabled={!staff?.length || disabled}
        >
          Tạo chỉ định
        </Button>
      </Form>
    </>
  );
};

const ServiceSubtasksModal = ({
  serviceId,
  requesterId,
  canCreate = false,
  createHint,
  onRetryCreate,
  onClose,
}: Props) => {
  const load = useCallback(
    (signal: AbortSignal) =>
      SubtaskRequestService.listForService(serviceId, signal),
    [serviceId]
  );
  const { items, loading, error, refresh } = useSubtaskList(load);
  const [form] = Form.useForm<Fields>();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [actionError, setActionError] = useState<string>();
  const [detail, setDetail] = useState<string>();

  const mutate = async (
    operation: () => Promise<unknown>,
    success: string,
    after?: () => void
  ) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setActionError(undefined);
    try {
      await operation();
      after?.();
      toast.success(success);
      await refresh();
    } catch (err) {
      const parsed = extractApiError(err, 'Không thể lưu thay đổi.');
      setActionError(parsed.message);
      if ([403, 404, 409].includes(parsed.statusCode ?? 0)) await refresh();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Cận lâm sàng và dịch vụ phụ"
      width={730}
      footer={null}
      onCancel={() => {
        if (!locked.current) onClose();
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {actionError && <Alert type="error" showIcon message={actionError} />}
        {createHint && (
          <Alert
            type={onRetryCreate ? 'warning' : 'info'}
            showIcon
            message={createHint}
            action={
              onRetryCreate && (
                <Button size="small" onClick={onRetryCreate}>
                  Kiểm tra lại bệnh án
                </Button>
              )
            }
          />
        )}
        {canCreate && (
          <CreateSubtaskForm
            form={form}
            disabled={busy}
            onFinish={fields =>
              mutate(
                async () => {
                  const { data } = await SubtaskRequestService.create({
                    ...fields,
                    appointmentServiceId: serviceId,
                  });
                  if (!data?._id || data.status !== 'Pending')
                    throw new Error('Máy chủ chưa xác nhận chỉ định mới.');
                },
                'Đã tạo chỉ định.',
                () => form.resetFields()
              )
            }
          />
        )}
        {canCreate && (
          <Typography.Text type="secondary">
            Hoàn thành hoặc hủy các yêu cầu còn mở trước khi hoàn tất ca khám.
          </Typography.Text>
        )}
        <Button onClick={refresh} loading={loading} disabled={busy}>
          Làm mới chỉ định
        </Button>
        {error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={refresh}>
                Thử lại
              </Button>
            }
          />
        ) : (
          <List
            loading={loading}
            dataSource={items}
            locale={{ emptyText: 'Ca này chưa có chỉ định.' }}
            renderItem={task => (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    size="small"
                    onClick={() => setDetail(task._id)}
                  >
                    Xem chi tiết
                  </Button>,
                  ...(getSubtaskActions(task, requesterId).remove
                    ? [
                        <Popconfirm
                          key="remove"
                          title="Hủy chỉ định đang chờ?"
                          okText="Hủy chỉ định"
                          cancelText="Giữ lại"
                          onConfirm={() =>
                            mutate(
                              () => SubtaskRequestService.remove(task._id),
                              'Đã hủy chỉ định.'
                            )
                          }
                        >
                          <Button
                            size="small"
                            danger
                            disabled={busy || loading}
                          >
                            Hủy chỉ định
                          </Button>
                        </Popconfirm>,
                      ]
                    : []),
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      {task.taskType}
                      <Tag color={SUBTASK_STATUSES[task.status]?.color}>
                        {SUBTASK_STATUSES[task.status]?.label ?? task.status}
                      </Tag>
                    </Space>
                  }
                  description={`Người thực hiện: ${populated(task.assignedStaffId)?.fullName ?? '—'}`}
                />
              </List.Item>
            )}
          />
        )}
      </Space>
      {detail && (
        <Modal
          open
          title="Chi tiết chỉ định"
          footer={null}
          onCancel={() => setDetail(undefined)}
        >
          <SubtaskDetailLoader key={detail} id={detail} />
        </Modal>
      )}
    </Modal>
  );
};

export default ServiceSubtasksModal;
