import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
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
import StaffService, { formatStaffOption } from '@/services/StaffService';
import { getVietnamTodayString } from '@/services/AppointmentOrderService';
import SubtaskRequestService, {
  filterSubtaskPerformers,
  getSubtaskActions,
  populated,
  resolveSubtaskTarget,
  SUBTASK_LIMIT,
  SUBTASK_STATUSES,
  SUBTASK_TASK_TYPES,
  type CreateSubtask,
} from '@/services/SubtaskRequestService';
import ServiceService, {
  serviceCategoryLabels,
  type Service,
  type ServiceCategory,
} from '@/services/ServiceService';
import type { StaffMember } from '@/types';
import { SubtaskDetailLoader } from './SubtaskDetails';
import { useSubtaskList } from './useSubtaskList';

interface Props {
  serviceId: string;
  /** HH:mm of the exam; the BE checks the performer is not busy in that shift */
  workTime?: string | null;
  requesterId?: string;
  canCreate?: boolean;
  createHint?: string;
  onRetryCreate?: () => void;
  onClose: () => void;
}
type Fields = Omit<CreateSubtask, 'appointmentServiceId' | 'serviceId'>;

const CreateSubtaskForm = ({
  form,
  disabled,
  requesterId,
  workTime,
  onFinish,
}: {
  form: ReturnType<typeof Form.useForm<Fields>>[0];
  disabled: boolean;
  requesterId?: string;
  workTime?: string | null;
  onFinish: (fields: Fields & { serviceId?: string }) => void;
}) => {
  const [staff, setStaff] = useState<StaffMember[]>();
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // Nghiệp vụ 5: bác sĩ giao thêm dịch vụ của phòng khám cho nhân viên khác
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    // B2 (SCR-24 step 3): vets and groomers on shift, i.e. not reported busy
    // in the shift of the exam (BE f19060f); no fallback to everyone
    const fetchStaff = async () => {
      const available = await StaffService.listAvailableStaff(
        { date: getVietnamTodayString(), time: workTime },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      // "Self": the requesting vet can do the task, listed first
      const ordered = [...available].sort(
        (a, b) =>
          Number(b._id === requesterId) - Number(a._id === requesterId) ||
          a.role.localeCompare(b.role)
      );
      setStaff(ordered);
    };
    fetchStaff().catch(err => {
      if (!controller.signal.aborted)
        setError(extractApiError(err, 'Không tải được nhân sự.').message);
    });
    // Without the catalogue the usual task types still work, so a failure is quiet
    ServiceService.listServices(
      { status: 'Active' },
      { signal: controller.signal }
    )
      .then(res => {
        if (!controller.signal.aborted)
          setServices((res.services || []).filter(s => s.status === 'Active'));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [revision, requesterId, workTime]);

  // The performer has to match the chosen task: a spa service only lists groomers
  const taskType = Form.useWatch('taskType', form);
  const target = resolveSubtaskTarget(taskType, services);
  const performers = useMemo(
    () => filterSubtaskPerformers(staff ?? [], target.role),
    [staff, target.role]
  );
  const assignedStaffId = Form.useWatch('assignedStaffId', form);
  useEffect(() => {
    if (assignedStaffId && !performers.some(p => p._id === assignedStaffId))
      form.setFieldValue('assignedStaffId', undefined);
  }, [assignedStaffId, performers, form]);
  const roleLabel = target.role ? getRoleLabel(target.role) : undefined;
  const performerHint = [
    roleLabel
      ? `Chỉ hiện ${roleLabel.toLowerCase()}: chỉ định này do ${roleLabel.toLowerCase()} làm.`
      : taskType?.trim()
        ? 'Chưa rõ việc này của bác sĩ hay groomer nên hiện cả hai. Chọn trong danh sách gợi ý để lọc đúng người.'
        : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const commonTypes = SUBTASK_TASK_TYPES.filter(
    type =>
      !services.some(
        s =>
          s.name.trim().toLocaleLowerCase('vi') === type.toLocaleLowerCase('vi')
      )
  );

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
        onFinish={fields =>
          onFinish({
            ...fields,
            serviceId: resolveSubtaskTarget(fields.taskType, services)
              .serviceId,
          })
        }
      >
        <Form.Item
          name="taskType"
          label="Tên chỉ định"
          rules={[
            { required: true, whitespace: true, message: 'Nhập tên chỉ định.' },
            { max: SUBTASK_LIMIT.taskType },
          ]}
        >
          <AutoComplete
            maxLength={SUBTASK_LIMIT.taskType}
            placeholder="Chọn dịch vụ, chỉ định hoặc nhập tên khác, ví dụ: Siêu âm ổ bụng"
            options={[
              ...(services.length
                ? [
                    {
                      label: 'Dịch vụ của phòng khám',
                      options: services.map(s => ({
                        value: s.name,
                        label: `${s.name} · ${serviceCategoryLabels[s.category as ServiceCategory] || s.category}`,
                      })),
                    },
                  ]
                : []),
              {
                label: 'Chỉ định thường dùng',
                options: commonTypes.map(value => ({ value })),
              },
            ]}
            filterOption={(input, option) =>
              // Groups have no value; antd filters their options one by one
              String(option && 'value' in option ? option.value : '')
                .toLowerCase()
                .includes(input.trim().toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item
          name="assignedStaffId"
          label="Nhân sự thực hiện"
          rules={[{ required: true, message: 'Chọn nhân sự thực hiện.' }]}
          extra={performerHint || undefined}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={
              roleLabel
                ? `Chọn ${roleLabel.toLowerCase()}`
                : 'Chọn bác sĩ hoặc Groomer'
            }
            loading={!staff && !error}
            notFoundContent={
              staff
                ? `Hôm nay không có ${roleLabel?.toLowerCase() ?? 'nhân sự'} nào rảnh.`
                : undefined
            }
            options={performers.map(member => ({
              value: member._id,
              label: [
                formatStaffOption(member),
                member._id === requesterId
                  ? 'Bản thân'
                  : getRoleLabel(member.role),
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
          disabled={!performers.length || disabled}
        >
          Tạo chỉ định
        </Button>
      </Form>
    </>
  );
};

const ServiceSubtasksModal = ({
  serviceId,
  workTime,
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
            requesterId={requesterId}
            workTime={workTime}
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
