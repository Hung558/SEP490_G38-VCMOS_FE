import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Space } from 'antd';
import { toast } from 'sonner';
import CageService from '@/services/CageService';
import { extractApiError } from '@/services/AppointmentServiceService';
import {
  admitInpatient,
  type InpatientRecord,
} from '@/services/InpatientRecordService';
import { getInpatientCageAvailability } from '@/services/InpatientRecordService/helpers';
import type { Cage } from '@/types';

interface AdmissionValues {
  cageId: string;
  initialDiagnosis?: string;
  treatmentPlan?: string;
}

interface Props {
  petId: string;
  petName?: string;
  petWeight?: number | null;
  orderId: string;
  onClose: () => void;
  onAdmitted: (record: InpatientRecord) => void;
}

const AdmissionModal = ({
  petId,
  petName,
  petWeight,
  orderId,
  onClose,
  onAdmitted,
}: Props) => {
  const [form] = Form.useForm<AdmissionValues>();
  const [cages, setCages] = useState<Cage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [refresh, refreshCages] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setLoadError(undefined);
    const list = async () => {
      const all: Cage[] = [];
      for (let page = 1, lastPage = 1; page <= lastPage; page++) {
        const { data } = await CageService.listCages(
          { status: 'Available', sort: 'label', limit: 100, page },
          { signal: abort.signal }
        );
        all.push(...data.items);
        lastPage = data.totalPages;
      }
      if (!abort.signal.aborted) setCages(all);
    };
    list()
      .catch(error => {
        if (!abort.signal.aborted) {
          setCages([]);
          setLoadError(extractApiError(error, 'Không tải được chuồng').message);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [refresh]);

  const availability = getInpatientCageAvailability(cages, petWeight);
  const { choices } = availability;
  const save = async ({
    cageId,
    initialDiagnosis,
    treatmentPlan,
  }: AdmissionValues) => {
    if (
      pending.current ||
      loading ||
      !choices.some(cage => cage._id === cageId)
    )
      return;
    pending.current = true;
    setSaving(true);
    setSubmitError(undefined);
    try {
      const record = await admitInpatient({
        petId,
        orderId,
        cageId,
        initialDiagnosis: initialDiagnosis?.trim() || undefined,
        treatmentPlan: treatmentPlan?.trim() || undefined,
      });
      toast.success('Đã nhập viện nội trú');
      onAdmitted(record);
    } catch (error) {
      const result = extractApiError(
        error,
        'Không thể nhập viện. Vui lòng thử lại.'
      );
      setSubmitError(result.message);
      if (result.statusCode === 409 || result.statusCode === 404) {
        form.setFieldValue('cageId', undefined);
        setLoading(true);
        refreshCages(value => value + 1);
      }
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Nhập viện nội trú"
      open
      okText="Nhập viện"
      cancelText="Quay lại"
      onCancel={saving ? undefined : onClose}
      onOk={() => form.submit()}
      okButtonProps={{
        disabled: loading || Boolean(loadError) || !choices.length,
      }}
      cancelButtonProps={{ disabled: saving }}
      confirmLoading={saving}
      closable={!saving}
      maskClosable={false}
      keyboard={!saving}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message={
            petName
              ? `Nhập viện cho ${petName}`
              : 'Nhập viện cho thú cưng của ca khám'
          }
          description="Khi lưu thành công, bé được chuyển sang chuồng nội trú đã chọn."
        />
        {submitError && <Alert type="error" showIcon message={submitError} />}
        {loadError && (
          <Alert
            type="error"
            showIcon
            message={loadError}
            action={
              <Button
                size="small"
                onClick={() => refreshCages(value => value + 1)}
              >
                Thử lại
              </Button>
            }
          />
        )}
        {!loading && !loadError && !choices.length && (
          <Alert
            type="warning"
            showIcon
            message={availability.emptyMessage}
            description={availability.description}
            action={
              <Button
                size="small"
                onClick={() => refreshCages(value => value + 1)}
              >
                Làm mới
              </Button>
            }
          />
        )}
        <Form form={form} layout="vertical" onFinish={save} disabled={saving}>
          <Form.Item
            name="cageId"
            label="Chuồng nội trú"
            extra={
              !loading && !loadError && choices.length
                ? availability.description
                : undefined
            }
            rules={[{ required: true, message: 'Chọn một chuồng nội trú' }]}
          >
            <Select
              loading={loading}
              disabled={loading || saving || Boolean(loadError)}
              placeholder="Chọn chuồng trống"
              options={choices.map(cage => ({
                value: cage._id,
                label: [
                  cage.label,
                  cage.isIsolated && 'Cách ly',
                  cage.maxWeightKg != null && `Tối đa ${cage.maxWeightKg} kg`,
                ]
                  .filter(Boolean)
                  .join(' · '),
              }))}
            />
          </Form.Item>
          <Form.Item name="initialDiagnosis" label="Chẩn đoán ban đầu">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="treatmentPlan" label="Kế hoạch điều trị">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};

export default AdmissionModal;
