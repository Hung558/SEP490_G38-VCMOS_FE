import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toast } from 'sonner';
import { extractApiError } from '@/services/AppointmentServiceService';
import SubtaskRequestService, {
  getSubtaskActions,
  populated,
  SUBTASK_IMAGE_TYPES,
  SUBTASK_LIMIT,
  SUBTASK_STATUSES,
  validateSubtaskImage,
  type SubtaskRequest,
  type SubtaskResult,
  type SubtaskStatus,
} from '@/services/SubtaskRequestService';
import { SubtaskDetailLoader } from '@/components/clinicalSubtasks/SubtaskDetails';
import { useSubtaskList } from '@/components/clinicalSubtasks/useSubtaskList';

const ResultModal = ({
  task,
  busy,
  error,
  onClose,
  onSave,
}: {
  task: SubtaskRequest;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (result: SubtaskResult) => void;
}) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();
  return (
    <Modal
      open
      title={`Gửi kết quả · ${task.taskType}`}
      okText="Hoàn tất yêu cầu"
      cancelText="Quay lại"
      confirmLoading={busy}
      okButtonProps={{
        disabled: Boolean(fileError) || (!text.trim() && !file),
      }}
      onCancel={onClose}
      onOk={() => onSave({ resultText: text, resultImage: file })}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>
          Nhập kết quả hoặc chọn một ảnh (JPEG, PNG, WebP, nhỏ hơn 5 MB).
        </Typography.Text>
        {error && <Alert type="error" showIcon message={error} />}
        <label htmlFor="subtask-result-text">Kết quả thực hiện</label>
        <Input.TextArea
          id="subtask-result-text"
          rows={4}
          disabled={busy}
          value={text}
          maxLength={SUBTASK_LIMIT.resultText}
          onChange={event => setText(event.target.value)}
        />
        <label htmlFor="subtask-result-image">Ảnh kết quả</label>
        <Input
          id="subtask-result-image"
          type="file"
          disabled={busy}
          accept={SUBTASK_IMAGE_TYPES.join(',')}
          onChange={event => {
            const next = event.target.files?.[0];
            setFile(next);
            setFileError(next ? validateSubtaskImage(next) : undefined);
          }}
        />
        {fileError && <Alert type="error" showIcon message={fileError} />}
      </Space>
    </Modal>
  );
};

const AssignedSubtasks = ({ userId }: { userId?: string }) => {
  const [status, setStatus] = useState<SubtaskStatus | 'all'>('all');
  const load = useCallback(
    (signal: AbortSignal) =>
      SubtaskRequestService.listMine(
        status === 'all' ? undefined : status,
        signal
      ),
    [status]
  );
  const { items, error, loading, refresh } = useSubtaskList(load);
  const [busyId, setBusyId] = useState<string>();
  const locked = useRef(false);
  const [actionError, setActionError] = useState<string>();
  const [resultError, setResultError] = useState<string>();
  const [resultTarget, setResultTarget] = useState<SubtaskRequest>();
  const [detail, setDetail] = useState<SubtaskRequest>();

  const mutate = async (task: SubtaskRequest, result?: SubtaskResult) => {
    const actions = getSubtaskActions(task, userId);
    if (
      locked.current ||
      loading ||
      error ||
      !(result ? actions.complete : actions.start)
    )
      return;
    locked.current = true;
    setBusyId(task._id);
    setActionError(undefined);
    setResultError(undefined);
    try {
      const { data } = await (result
        ? SubtaskRequestService.complete(task._id, result)
        : SubtaskRequestService.start(task._id));
      if (
        data?._id !== task._id ||
        data.status !== (result ? 'Completed' : 'InProgress')
      )
        throw new Error('Máy chủ chưa xác nhận trạng thái mới.');
      if (result) setResultTarget(undefined);
      toast.success(
        result ? 'Đã gửi kết quả và hoàn tất yêu cầu.' : 'Đã bắt đầu thực hiện.'
      );
      await refresh();
    } catch (err) {
      const parsed = extractApiError(err, 'Không thể cập nhật yêu cầu.');
      if ([403, 404, 409].includes(parsed.statusCode ?? 0)) {
        setResultTarget(undefined);
        setActionError(parsed.message);
        await refresh();
      } else if (result) setResultError(parsed.message);
      else setActionError(parsed.message);
    } finally {
      locked.current = false;
      setBusyId(undefined);
    }
  };

  const columns: ColumnsType<SubtaskRequest> = [
    { title: 'Chỉ định', dataIndex: 'taskType' },
    {
      title: 'Thú cưng / lịch hẹn',
      render: (_, task) => {
        const order = populated(populated(task.appointmentServiceId)?.orderId);
        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {populated(order?.petId)?.name || '—'}
            </Typography.Text>
            <Typography.Text type="secondary">
              {order?.code || '—'}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Người yêu cầu',
      render: (_, task) => populated(task.requestedById)?.fullName || '—',
    },
    {
      title: 'Trạng thái',
      render: (_, task) => (
        <Tag color={SUBTASK_STATUSES[task.status]?.color}>
          {SUBTASK_STATUSES[task.status]?.label ?? task.status}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      render: (_, task) => {
        const actions = getSubtaskActions(task, userId);
        return (
          <Space wrap>
            <Button size="small" onClick={() => setDetail(task)}>
              Xem chi tiết
            </Button>
            {actions.start && (
              <Button
                size="small"
                type="primary"
                disabled={!!busyId || loading}
                loading={busyId === task._id && !resultTarget}
                onClick={() => mutate(task)}
              >
                Bắt đầu
              </Button>
            )}
            {actions.complete && (
              <Button
                size="small"
                type={actions.start ? 'default' : 'primary'}
                disabled={!!busyId || loading}
                onClick={() => {
                  setResultError(undefined);
                  setResultTarget(task);
                }}
              >
                Gửi kết quả
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Text type="secondary">
        Các chỉ định cận lâm sàng và dịch vụ phụ được giao cho bạn.
      </Typography.Text>
      <Space wrap>
        <Select
          aria-label="Trạng thái chỉ định"
          value={status}
          disabled={!!busyId}
          onChange={value => {
            setActionError(undefined);
            setStatus(value);
          }}
          style={{ width: 185 }}
          options={[
            { label: 'Mọi trạng thái', value: 'all' },
            ...Object.entries(SUBTASK_STATUSES).map(([value, meta]) => ({
              value,
              label: meta.label,
            })),
          ]}
        />
        <Button loading={loading} disabled={!!busyId} onClick={refresh}>
          Làm mới việc được giao
        </Button>
      </Space>
      {actionError && <Alert type="error" showIcon message={actionError} />}
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
        <Table
          columns={columns}
          dataSource={items}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 740 }}
          pagination={{ pageSize: 15, hideOnSinglePage: true }}
          locale={{ emptyText: 'Không có yêu cầu trong nhóm này.' }}
        />
      )}
      {resultTarget && (
        <ResultModal
          key={resultTarget._id}
          task={resultTarget}
          busy={!!busyId}
          error={resultError}
          onClose={() => {
            if (!locked.current) setResultTarget(undefined);
          }}
          onSave={result => mutate(resultTarget, result)}
        />
      )}
      {detail && (
        <Modal
          open
          title={`Chi tiết chỉ định · ${detail.taskType}`}
          footer={null}
          onCancel={() => setDetail(undefined)}
        >
          <SubtaskDetailLoader key={detail._id} id={detail._id} showIntake />
        </Modal>
      )}
    </Space>
  );
};

export default AssignedSubtasks;
