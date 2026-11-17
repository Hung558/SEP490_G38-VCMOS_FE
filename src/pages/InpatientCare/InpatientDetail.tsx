import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { toast } from 'sonner';
import { extractApiError } from '@/services/AppointmentServiceService';
import {
  addInpatientLog,
  dischargeInpatient,
  getInpatientRecord,
  listInpatientLogs,
  type InpatientLog,
  type InpatientLogPayload,
  type InpatientRecord,
} from '@/services/InpatientRecordService';
import {
  clinicDate,
  formatClinicTime,
} from '@/services/InpatientRecordService/helpers';

const { Paragraph, Text, Title } = Typography;
const MAX_LOG_LENGTH = 2000;
const multiline = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;

const label = <T extends object>(ref: T | string | null, key: keyof T) =>
  ref && typeof ref === 'object' ? String(ref[key] || '—') : '—';

interface Props {
  recordId: string;
  onClose: () => void;
  onChanged: () => void;
}

const InpatientDetail = ({ recordId, onClose, onChanged }: Props) => {
  const [record, setRecord] = useState<InpatientRecord>();
  const [logs, setLogs] = useState<InpatientLog[]>([]);
  const [recordError, setRecordError] = useState<string>();
  const [logsError, setLogsError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState<'log' | 'discharge'>();
  const pending = useRef(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion(value => value + 1);
  const [form] = Form.useForm<InpatientLogPayload>();

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setLoadingLogs(true);
    setRecordError(undefined);
    setLogsError(undefined);
    getInpatientRecord(recordId, abort.signal)
      .then(value => {
        if (!abort.signal.aborted) setRecord(value);
      })
      .catch(error => {
        if (!abort.signal.aborted)
          setRecordError(
            extractApiError(error, 'Không tải được hồ sơ nội trú').message
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    listInpatientLogs(recordId, abort.signal)
      .then(data => {
        if (!abort.signal.aborted) setLogs(data.items);
      })
      .catch(error => {
        if (!abort.signal.aborted)
          setLogsError(
            extractApiError(error, 'Không tải được nhật ký').message
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoadingLogs(false);
      });
    return () => abort.abort();
  }, [recordId, version]);

  const canEdit = record?.status === 'Admitted' && !loading && !recordError;
  const today = clinicDate();
  const admittedDate = record ? clinicDate(record.admittedAt) : undefined;

  const runAction = async (
    kind: 'log' | 'discharge',
    action: () => Promise<void>
  ) => {
    if (pending.current || !canEdit) return;
    pending.current = true;
    setSaving(kind);
    setActionError(undefined);
    try {
      await action();
    } catch (error) {
      const result = extractApiError(
        error,
        'Không thể lưu thay đổi. Vui lòng thử lại.'
      );
      setActionError(result.message);
      if ([400, 404, 409].includes(result.statusCode || 0)) {
        reload();
        onChanged();
      }
    } finally {
      pending.current = false;
      setSaving(undefined);
    }
  };

  const saveLog = ({ date, observations, notes }: InpatientLogPayload) => {
    const payload = {
      date: date || undefined,
      observations: observations?.trim() || undefined,
      notes: notes?.trim() || undefined,
    };
    if (!payload.observations && !payload.notes) {
      form.setFields([
        { name: 'observations', errors: ['Nhập tình trạng hoặc ghi chú'] },
      ]);
      return;
    }
    if (
      payload.date &&
      (payload.date > today || (admittedDate && payload.date < admittedDate))
    ) {
      form.setFields([
        {
          name: 'date',
          errors: ['Chọn ngày từ lúc nhập viện đến hôm nay (giờ Việt Nam)'],
        },
      ]);
      return;
    }
    return runAction('log', async () => {
      await addInpatientLog(recordId, payload);
      form.resetFields();
      setEdit(false);
      toast.success('Đã ghi nhật ký nội trú');
      reload();
    });
  };

  const discharge = () =>
    runAction('discharge', async () => {
      setRecord(await dischargeInpatient(recordId));
      setEdit(false);
      toast.success('Đã xác nhận xuất viện');
      onChanged();
    });

  const newLog = () => {
    setActionError(undefined);
    form.setFieldsValue({ date: clinicDate() });
    setEdit(true);
  };

  return (
    <Drawer
      open
      title={
        record
          ? `Hồ sơ nội trú · ${label(record.petId, 'name')}`
          : 'Hồ sơ nội trú'
      }
      width={720}
      onClose={saving ? undefined : onClose}
      closable={!saving}
      maskClosable={!saving}
      keyboard={!saving}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {actionError && <Alert type="error" showIcon message={actionError} />}
        {recordError ? (
          <Alert
            type="error"
            showIcon
            message={recordError}
            action={
              <Button size="small" onClick={reload}>
                Thử lại
              </Button>
            }
          />
        ) : !record ? (
          <Skeleton active />
        ) : (
          <>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="Trạng thái">
                {record.status === 'Admitted' ? (
                  <Tag color="processing">Đang nội trú</Tag>
                ) : (
                  <Tag color="success">Đã xuất viện</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Lịch hẹn">
                {label(record.orderId, 'code')}
              </Descriptions.Item>
              <Descriptions.Item label="Bác sĩ phụ trách">
                {label(record.attendingVetId, 'fullName')}
              </Descriptions.Item>
              <Descriptions.Item label="Chuồng lúc nhập viện">
                {label(record.cageId, 'label')}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày nhập viện">
                {formatClinicTime(record.admittedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày xuất viện">
                {formatClinicTime(record.dischargedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán ban đầu" span={2}>
                <Text style={multiline}>{record.initialDiagnosis || '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Kế hoạch điều trị" span={2}>
                <Text style={multiline}>{record.treatmentPlan || '—'}</Text>
              </Descriptions.Item>
            </Descriptions>
            {record.status === 'Discharged' && (
              <Alert
                showIcon
                type="info"
                message="Xuất viện không tự giải phóng chuồng. Chỉ trả chuồng khi chủ đến đón bé."
              />
            )}
            {canEdit && (
              <Space wrap>
                {!edit && (
                  <Button
                    type="primary"
                    disabled={Boolean(saving)}
                    onClick={newLog}
                  >
                    Ghi nhật ký
                  </Button>
                )}
                <Popconfirm
                  title="Xác nhận xuất viện"
                  description="Bé vẫn ở chuồng cho đến khi chủ đến đón. Thao tác này không trả chuồng."
                  okText="Xác nhận xuất viện"
                  cancelText="Quay lại"
                  onConfirm={discharge}
                >
                  <Button
                    disabled={edit || saving === 'log'}
                    loading={saving === 'discharge'}
                  >
                    Xuất viện
                  </Button>
                </Popconfirm>
              </Space>
            )}
            {edit && record.status === 'Admitted' && (
              <Form
                layout="vertical"
                form={form}
                onFinish={saveLog}
                disabled={Boolean(saving)}
              >
                <Form.Item label="Ngày ghi nhận" name="date">
                  <Input type="date" min={admittedDate} max={today} />
                </Form.Item>
                <Form.Item
                  label="Tình trạng ghi nhận"
                  name="observations"
                  rules={[
                    { max: MAX_LOG_LENGTH, message: 'Tối đa 2000 ký tự' },
                  ]}
                >
                  <Input.TextArea
                    rows={3}
                    maxLength={MAX_LOG_LENGTH}
                    showCount
                  />
                </Form.Item>
                <Form.Item
                  label="Ghi chú"
                  name="notes"
                  rules={[
                    { max: MAX_LOG_LENGTH, message: 'Tối đa 2000 ký tự' },
                  ]}
                >
                  <Input.TextArea
                    rows={2}
                    maxLength={MAX_LOG_LENGTH}
                    showCount
                  />
                </Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    disabled={!canEdit}
                    loading={saving === 'log'}
                  >
                    Lưu nhật ký
                  </Button>
                  <Button
                    onClick={() => {
                      form.resetFields();
                      setEdit(false);
                      setActionError(undefined);
                    }}
                  >
                    Hủy
                  </Button>
                </Space>
              </Form>
            )}
            <Title level={4} style={{ margin: 0 }}>
              Nhật ký nội trú
            </Title>
            {logsError ? (
              <Alert
                type="error"
                showIcon
                message={logsError}
                action={
                  <Button size="small" onClick={reload}>
                    Thử lại
                  </Button>
                }
              />
            ) : (
              <List
                loading={loadingLogs}
                dataSource={logs}
                rowKey="_id"
                pagination={
                  logs.length > 10
                    ? { pageSize: 10, showSizeChanger: false }
                    : false
                }
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Chưa có nhật ký nội trú"
                    />
                  ),
                }}
                renderItem={log => (
                  <List.Item>
                    <List.Item.Meta
                      title={log.date.split('-').reverse().join('/')}
                      description={
                        <>
                          <Text type="secondary">
                            Người ghi: {label(log.recordedById, 'fullName')}
                          </Text>
                          {log.observations && (
                            <Paragraph style={multiline}>
                              <Text strong>Tình trạng: </Text>
                              {log.observations}
                            </Paragraph>
                          )}
                          {log.notes && (
                            <Paragraph style={multiline}>
                              <Text strong>Ghi chú: </Text>
                              {log.notes}
                            </Paragraph>
                          )}
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </>
        )}
      </Space>
    </Drawer>
  );
};

export default InpatientDetail;
