import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Image,
  Input,
  List,
  Modal,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { toast } from 'sonner';
import { safePostImageUrl } from '@/services/CommunityPostService';
import CommunityService, {
  buildTimelineSharePayload,
  formatMilestoneDate,
  readCommunityError,
  SHARE_CONTENT_MAX_LENGTH,
  type TimelineSharePayload,
  type TimelineSharePreview,
} from '@/services/CommunityService';

const { Paragraph, Text } = Typography;

interface ShareTimelineModalProps {
  open: boolean;
  petId: string;
  petName: string;
  onClose: () => void;
  /** The post was sent for review; the timeline lists it under shared posts */
  onShared: () => void;
}

/**
 * Nghiệp vụ 3.4: the owner agrees to share the pet's timeline. The BE builds
 * each milestone from a Done visit and keeps only the date, the service names
 * and the grooming photos: no SOAP, prescription or price (BR-18).
 */
const ShareTimelineModal = ({
  open,
  petId,
  petName,
  onClose,
  onShared,
}: ShareTimelineModalProps) => {
  const [preview, setPreview] = useState<TimelineSharePreview>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(undefined);
    setPreview(undefined);
    CommunityService.previewTimelineShare(petId, {
      signal: controller.signal,
    })
      .then(result => {
        if (controller.signal.aborted) return;
        setPreview(result);
        setSelected(result.milestones.map(item => item.orderId));
      })
      .catch(failure => {
        if (controller.signal.aborted) return;
        setLoadError(
          readCommunityError(
            failure,
            'Không tải được hành trình để chia sẻ. Vui lòng thử lại.'
          ).message
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, petId, attempt]);

  const close = () => {
    if (sendingRef.current) return;
    setContent('');
    setError(undefined);
    onClose();
  };

  const milestones = preview?.milestones || [];
  const allSelected =
    milestones.length > 0 && selected.length === milestones.length;

  const submit = async () => {
    if (!preview || sendingRef.current) return;
    let payload: TimelineSharePayload;
    try {
      payload = buildTimelineSharePayload(
        petId,
        selected,
        preview.milestones,
        content
      );
    } catch (invalid) {
      setError((invalid as Error).message);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError(undefined);
    try {
      const result = await CommunityService.createTimelineShare(payload);
      toast.success(
        result.message || 'Đã gửi bài chia sẻ hành trình, vui lòng chờ duyệt.'
      );
      sendingRef.current = false;
      setContent('');
      onShared();
      onClose();
    } catch (failure) {
      setError(
        readCommunityError(
          failure,
          'Chưa gửi được bài chia sẻ. Vui lòng thử lại.'
        ).message
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Chia sẻ hành trình của ${petName} lên cộng đồng`}
      width={720}
      onCancel={close}
      maskClosable={!sending}
      closable={!sending}
      destroyOnHidden
      footer={
        <Space wrap>
          <Button onClick={close} disabled={sending}>
            Hủy
          </Button>
          <Button
            type="primary"
            loading={sending}
            disabled={loading || !milestones.length || !selected.length}
            onClick={submit}
          >
            Đồng ý chia sẻ
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Bài chia sẻ chỉ gồm ngày khám, tên dịch vụ và ảnh trước/sau khi làm đẹp (nếu có)."
        description="Bệnh án, đơn thuốc và giá tiền không được đăng. Bài cần quản trị viên duyệt trước khi hiện trên cộng đồng."
      />

      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : loadError ? (
        <Alert
          type="error"
          showIcon
          message={<span role="alert">{loadError}</span>}
          action={
            <Button onClick={() => setAttempt(value => value + 1)}>
              Thử lại
            </Button>
          }
        />
      ) : !milestones.length ? (
        <Empty
          description={`${petName} chưa có lượt khám hoặc dịch vụ nào hoàn tất để chia sẻ.`}
        />
      ) : (
        <>
          <Space
            wrap
            style={{ justifyContent: 'space-between', width: '100%' }}
          >
            <Text strong>
              Chọn các mốc muốn chia sẻ ({selected.length}/{milestones.length})
            </Text>
            <Button
              type="link"
              onClick={() =>
                setSelected(
                  allSelected ? [] : milestones.map(item => item.orderId)
                )
              }
            >
              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
          </Space>
          {preview?.truncated && (
            <Text type="secondary" style={{ display: 'block' }}>
              Chỉ hiện {milestones.length} lượt gần nhất trong{' '}
              {preview.totalEligible} lượt đã hoàn tất.
            </Text>
          )}
          <Checkbox.Group
            value={selected}
            onChange={values => {
              setSelected(values as string[]);
              if (error) setError(undefined);
            }}
            style={{ display: 'block', width: '100%' }}
          >
            <List
              dataSource={milestones}
              rowKey="orderId"
              style={{ maxHeight: 320, overflowY: 'auto' }}
              renderItem={item => {
                const image = safePostImageUrl(item.imageUrl);
                return (
                  <List.Item>
                    <Checkbox value={item.orderId} style={{ width: '100%' }}>
                      <Space align="start" size={12}>
                        <div style={{ minWidth: 0 }}>
                          <Text strong>{formatMilestoneDate(item.date)}</Text>
                          <Paragraph
                            style={{ margin: 0, overflowWrap: 'anywhere' }}
                          >
                            {item.title}
                          </Paragraph>
                        </div>
                        {image && (
                          <Image
                            src={image}
                            alt={item.title}
                            width={72}
                            height={54}
                            style={{ objectFit: 'cover', borderRadius: 6 }}
                            preview={false}
                          />
                        )}
                      </Space>
                    </Checkbox>
                  </List.Item>
                );
              }}
            />
          </Checkbox.Group>
          <label
            htmlFor="timeline-share-content"
            style={{ display: 'block', margin: '16px 0 6px' }}
          >
            <Text strong>Lời nhắn (không bắt buộc)</Text>
          </label>
          {/* showCount sits 22px under the box: keep it off the footer */}
          <div style={{ marginBottom: 24 }}>
            <Input.TextArea
              id="timeline-share-content"
              value={content}
              rows={3}
              maxLength={SHARE_CONTENT_MAX_LENGTH}
              showCount
              placeholder={`Vài dòng về hành trình của ${petName}…`}
              onChange={event => {
                setContent(event.target.value);
                if (error) setError(undefined);
              }}
            />
          </div>
        </>
      )}

      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 28 }}
          message={<span role="alert">{error}</span>}
        />
      )}
    </Modal>
  );
};

export default ShareTimelineModal;
