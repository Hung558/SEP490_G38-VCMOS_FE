import { useCallback, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Typography } from 'antd';
import { toast } from 'sonner';
import { extractApiError } from '@/services/AppointmentServiceService';
import SubtaskRequestService, {
  getSubtaskActions,
  SUBTASK_IMAGE_TYPES,
  SUBTASK_LIMIT,
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

/**
 * Tasks handed to the signed-in staff member (GET /subtask-requests/my-queue)
 * with their actions: start, send the result, view the details. Shared by the
 * work lists of vets ("Hàng đợi khám") and groomers ("Hàng đợi spa") (24/11).
 * `enabled: false` loads nothing (hooks cannot be skipped for other roles).
 */
export const useAssignedSubtasks = ({
  userId,
  status = 'all',
  enabled = true,
}: {
  userId?: string;
  status?: SubtaskStatus | 'all';
  enabled?: boolean;
}) => {
  const load = useCallback(
    (signal: AbortSignal) =>
      enabled
        ? SubtaskRequestService.listMine(
            status === 'all' ? undefined : status,
            signal
          )
        : Promise.resolve({ data: [] as SubtaskRequest[] }),
    [status, enabled]
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

  const renderActions = (task: SubtaskRequest) => {
    const actions = getSubtaskActions(task, userId);
    return (
      <Space wrap size={6}>
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
  };

  const modals = (
    <>
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
    </>
  );

  return {
    items,
    error,
    loading,
    refresh,
    busyId,
    actionError,
    clearActionError: () => setActionError(undefined),
    renderActions,
    modals,
  };
};
