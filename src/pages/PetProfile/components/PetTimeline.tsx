import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  DatePicker,
  Descriptions,
  Empty,
  List,
  Pagination,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  FieldTimeOutlined,
  HeartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import styled from 'styled-components';
import PetTimelineService, {
  PET_TIMELINE_PAGE_SIZE,
  PET_TIMELINE_STATUSES,
  PET_TIMELINE_TYPES,
  formatTimelineDate,
  getSafeTimelineHttpUrl,
  getPetTimelineStatusLabel,
  PET_TIMELINE_TYPE_LABELS,
  getPetTimelineRefName,
  sanitizeTimelineInvoices,
  type PetTimelineInvoiceRole,
  type PetTimelineMilestone,
  type PetTimelinePage,
  type PetTimelineQuery,
  type PetTimelineRefValue,
  type PetTimelineServiceItem,
  type PetTimelineSoapRecord,
  type PetTimelineType,
  type PetTimelineStatus,
} from '@/services/PetTimelineService';

const { Text, Paragraph } = Typography;

const TimelineWrapper = styled.section`
  .timeline-filters {
    margin: 12px 0 16px;
  }
  .timeline-active-inpatient {
    margin-bottom: 16px;
    border-color: #fcd34d;
    background: #fffbeb;
  }
  .timeline-ref {
    color: #64748b;
    font-size: 13px;
  }
  .timeline-content {
    display: grid;
    gap: 8px;
    overflow-wrap: anywhere;
  }
  .timeline-card-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
  }
  .timeline-nested {
    border-left: 2px solid #e2e8f0;
    padding-left: 12px;
    margin: 4px 0;
  }
  .timeline-soap {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }
  .timeline-soap-field {
    min-width: 0;
    padding: 8px 10px;
    border-radius: 8px;
    background: #f8fafc;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .timeline-post {
    margin-bottom: 12px;
    border-color: #e2e8f0;
  }
`;

const refName = (ref: PetTimelineRefValue | undefined): string =>
  getPetTimelineRefName(ref) ||
  (typeof ref === 'string' ? `Mã ${ref}` : 'Chưa có thông tin');

const StatusTag = ({ status, label }: { status: string; label?: string }) => {
  const color =
    status === 'Done' || status === 'Discharged' || status === 'Completed'
      ? 'green'
      : status === 'Cancelled' || status === 'Overdue' || status === 'Removed'
        ? 'default'
        : status === 'Admitted' || status === 'InProgress'
          ? 'blue'
          : 'gold';
  return <Tag color={color}>{label || getPetTimelineStatusLabel(status)}</Tag>;
};

const InvoiceSummary = ({
  invoice,
}: {
  invoice: NonNullable<PetTimelineMilestone['invoice']>;
}) => (
  <Card size="small" title={`Hóa đơn ${invoice.code}`}>
    <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
      <Descriptions.Item label="Tổng tiền">
        {invoice.totalAmount.toLocaleString('vi-VN')} ₫
      </Descriptions.Item>
      <Descriptions.Item label="Thanh toán">
        <StatusTag status={invoice.paymentStatus} />
      </Descriptions.Item>
      {invoice.paymentMethod && (
        <Descriptions.Item label="Phương thức">
          {invoice.paymentMethod}
        </Descriptions.Item>
      )}
      {invoice.issuedAt && (
        <Descriptions.Item label="Ngày lập">
          {dayjs(invoice.issuedAt).format('DD/MM/YYYY HH:mm')}
        </Descriptions.Item>
      )}
    </Descriptions>
    <List
      size="small"
      dataSource={invoice.items || []}
      rowKey="_id"
      renderItem={item => (
        <List.Item>
          <Space wrap>
            <span>{item.itemNameSnapshot}</span>
            <Text type="secondary">
              {item.quantity} × {item.unitPriceSnapshot.toLocaleString('vi-VN')}{' '}
              ₫
            </Text>
            <Text strong>{item.subtotal.toLocaleString('vi-VN')} ₫</Text>
          </Space>
        </List.Item>
      )}
    />
  </Card>
);

const SoapRecord = ({ record }: { record: PetTimelineSoapRecord }) => {
  const fields = [
    ['Chủ quan', record.subjectiveNote],
    ['Khách quan', record.objectiveNote],
    ['Đánh giá', record.assessment],
    ['Kế hoạch', record.plan],
    ['Ghi chú', record.notes],
  ].filter((field): field is [string, string] => Boolean(field[1]?.trim()));
  return (
    <Card size="small" title="Bệnh án SOAP">
      <div className="timeline-soap">
        {fields.map(([title, value]) => (
          <div className="timeline-soap-field" key={title}>
            <Text strong>{title}: </Text>
            {value}
          </div>
        ))}
      </div>
      {record.prescriptions.length > 0 && (
        <>
          <Text strong>Đơn thuốc</Text>
          <List
            size="small"
            dataSource={record.prescriptions}
            rowKey={item =>
              item._id || `${item.productId}-${item.productNameSnapshot || ''}`
            }
            renderItem={item => (
              <List.Item>
                <div>
                  <Text strong>{item.productNameSnapshot || 'Thuốc'}</Text>
                  {item.unitSnapshot ? ` · ${item.unitSnapshot}` : ''}
                  <div className="timeline-ref">
                    {[
                      item.dosage,
                      item.frequency,
                      item.durationDays
                        ? `${item.durationDays} ngày`
                        : undefined,
                      item.instructions,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </>
      )}
    </Card>
  );
};

const ServiceDetails = ({ service }: { service: PetTimelineServiceItem }) => {
  const serviceRef = service.service;
  const serviceName =
    getPetTimelineRefName(serviceRef) ||
    (typeof serviceRef === 'object' && serviceRef
      ? serviceRef.code
      : undefined) ||
    'Dịch vụ';
  const details: React.ReactNode[] = [];
  if (service.medicalRecord)
    details.push(
      <SoapRecord
        key={`soap-${service.medicalRecord._id}`}
        record={service.medicalRecord}
      />
    );
  if (service.groomingNote)
    details.push(
      <Card key="grooming" size="small" title="Ghi nhận chăm sóc">
        {service.groomingNote.beforeNote && (
          <Paragraph>
            <Text strong>Trước dịch vụ: </Text>
            {service.groomingNote.beforeNote}
          </Paragraph>
        )}
        {service.groomingNote.afterNote && (
          <Paragraph>
            <Text strong>Sau dịch vụ: </Text>
            {service.groomingNote.afterNote}
          </Paragraph>
        )}
        {service.groomingNote.recommendations && (
          <Paragraph>
            <Text strong>Khuyến nghị: </Text>
            {service.groomingNote.recommendations}
          </Paragraph>
        )}
        <Space wrap>
          {getSafeTimelineHttpUrl(service.groomingNote.beforePhotoUrl) && (
            <a
              href={getSafeTimelineHttpUrl(service.groomingNote.beforePhotoUrl)}
              target="_blank"
              rel="noreferrer"
            >
              Ảnh trước dịch vụ
            </a>
          )}
          {getSafeTimelineHttpUrl(service.groomingNote.afterPhotoUrl) && (
            <a
              href={getSafeTimelineHttpUrl(service.groomingNote.afterPhotoUrl)}
              target="_blank"
              rel="noreferrer"
            >
              Ảnh sau dịch vụ
            </a>
          )}
        </Space>
      </Card>
    );
  for (const task of service.subtasks)
    details.push(
      <Card
        key={`task-${task._id}`}
        size="small"
        title={task.taskType || refName(task.service)}
      >
        <Space wrap>
          <StatusTag status={task.status} />
          {task.assignedStaff && (
            <Text type="secondary">
              Phụ trách: {refName(task.assignedStaff)}
            </Text>
          )}
        </Space>
        {task.instructions && (
          <Paragraph>
            <Text strong>Yêu cầu: </Text>
            {task.instructions}
          </Paragraph>
        )}
        {task.resultText && (
          <Paragraph>
            <Text strong>Kết quả: </Text>
            {task.resultText}
          </Paragraph>
        )}
        {getSafeTimelineHttpUrl(task.resultImageUrl) && (
          <a
            href={getSafeTimelineHttpUrl(task.resultImageUrl)}
            target="_blank"
            rel="noreferrer"
          >
            Xem ảnh kết quả
          </a>
        )}
      </Card>
    );
  return (
    <div className="timeline-nested">
      <Space wrap>
        <Text strong>{serviceName}</Text>
        <StatusTag status={service.status} />
        {service.assignedStaff && (
          <Text type="secondary">{refName(service.assignedStaff)}</Text>
        )}
      </Space>
      {service.cancelReason && (
        <Text type="secondary">Lý do hủy: {service.cancelReason}</Text>
      )}
      {details.length > 0 && (
        <Collapse
          size="small"
          items={[
            {
              key: service._id,
              label: `Hồ sơ chi tiết${service.medicalRecord?.prescriptions.length ? ` · ${service.medicalRecord.prescriptions.length} thuốc` : ''}`,
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {details}
                </Space>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

const Milestone = ({
  item,
  showInvoices,
}: {
  item: PetTimelineMilestone;
  showInvoices: boolean;
}) => (
  <div className="timeline-content">
    <div className="timeline-card-title">
      <Text strong>{formatTimelineDate(item.date)}</Text>
      {item.slotStart && (
        <Text type="secondary">
          {item.slotStart}
          {item.slotEnd ? `–${item.slotEnd}` : ''}
        </Text>
      )}
      <StatusTag status={item.derivedStatus} label={item.statusLabel} />
      <Text className="timeline-ref">
        {item.code}
        {!item.isOnline ? ' · khám tại chỗ' : ''}
      </Text>
      {item.categories.map(category => (
        <Tag key={category}>{category}</Tag>
      ))}
    </div>
    {item.note && (
      <Paragraph style={{ margin: 0 }}>
        <Text strong>Ghi chú: </Text>
        {item.note}
      </Paragraph>
    )}
    {item.intake?.symptoms && (
      <Paragraph style={{ margin: 0 }}>
        <Text strong>Triệu chứng khi tiếp nhận: </Text>
        {item.intake.symptoms}
      </Paragraph>
    )}
    {item.intake?.initialCondition && (
      <Paragraph style={{ margin: 0 }}>
        <Text strong>Tình trạng ban đầu: </Text>
        {item.intake.initialCondition}
      </Paragraph>
    )}
    {item.cancelReason && (
      <Paragraph style={{ margin: 0 }}>
        <Text strong>Lý do hủy: </Text>
        {item.cancelReason}
      </Paragraph>
    )}
    {item.currentCage?.cage && (
      <Text type="secondary">
        Chuồng đang gán: {refName(item.currentCage.cage)}
      </Text>
    )}
    {item.services.map(service => (
      <ServiceDetails key={service._id} service={service} />
    ))}
    {item.inpatientRecord && (
      <Card size="small" title="Đợt điều trị nội trú">
        <Space wrap>
          <StatusTag status={item.inpatientRecord.status} />
          {item.inpatientRecord.cage && (
            <Text>Chuồng: {refName(item.inpatientRecord.cage)}</Text>
          )}
          {item.inpatientRecord.attendingVet && (
            <Text>Bác sĩ: {refName(item.inpatientRecord.attendingVet)}</Text>
          )}
        </Space>
        {item.inpatientRecord.initialDiagnosis && (
          <Paragraph>
            <Text strong>Chẩn đoán ban đầu: </Text>
            {item.inpatientRecord.initialDiagnosis}
          </Paragraph>
        )}
        {item.inpatientRecord.treatmentPlan && (
          <Paragraph>
            <Text strong>Kế hoạch điều trị: </Text>
            {item.inpatientRecord.treatmentPlan}
          </Paragraph>
        )}
        {item.inpatientRecord.dailyLogs.map(log => (
          <div className="timeline-nested" key={log._id}>
            <Text strong>{formatTimelineDate(log.date)}</Text>
            {log.recordedBy && (
              <Text type="secondary"> · {refName(log.recordedBy)}</Text>
            )}
            {log.observations && (
              <Paragraph style={{ margin: '4px 0 0' }}>
                <Text strong>Quan sát: </Text>
                {log.observations}
              </Paragraph>
            )}
            {log.notes && (
              <Paragraph style={{ margin: '4px 0 0' }}>
                <Text strong>Ghi chú: </Text>
                {log.notes}
              </Paragraph>
            )}
          </div>
        ))}
      </Card>
    )}
    {showInvoices && item.invoice && <InvoiceSummary invoice={item.invoice} />}
    {showInvoices && item.inpatientRecord?.invoice && (
      <InvoiceSummary invoice={item.inpatientRecord.invoice} />
    )}
  </div>
);

interface PetTimelineProps {
  petId: string;
  invoiceRole?: PetTimelineInvoiceRole | string | null;
  sharedPostsVisible?: boolean;
}

const PetTimeline = ({
  petId,
  invoiceRole,
  sharedPostsVisible = true,
}: PetTimelineProps) => {
  const [result, setResult] = useState<PetTimelinePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<PetTimelineType>('All');
  const [status, setStatus] = useState<PetTimelineStatus | undefined>();
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const query: PetTimelineQuery = {
      type,
      status,
      page,
      limit: PET_TIMELINE_PAGE_SIZE,
    };
    if (dates[0]) query.from = dates[0].format('YYYY-MM-DD');
    if (dates[1]) query.to = dates[1].format('YYYY-MM-DD');

    setLoading(true);
    setRefreshing(true);
    void PetTimelineService.listPetTimeline(petId, query, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return;
        setResult(sanitizeTimelineInvoices(response, invoiceRole));
        setError(null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult(null);
        setError('Không tải được hành trình chăm sóc. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => controller.abort();
  }, [petId, type, status, page, dates, attempt, invoiceRole]);

  const updateType = (next: PetTimelineType) => {
    setLoading(true);
    setResult(null);
    setPage(1);
    setType(next);
  };
  const updateStatus = (next: PetTimelineStatus | undefined) => {
    setLoading(true);
    setResult(null);
    setPage(1);
    setStatus(next);
  };
  const updateDates = (next: [Dayjs | null, Dayjs | null]) => {
    setLoading(true);
    setResult(null);
    setPage(1);
    setDates(next);
  };
  const updatePage = (next: number) => {
    setLoading(true);
    setPage(next);
  };
  const showInvoices = Boolean(
    invoiceRole && ['PetOwner', 'Receptionist', 'Admin'].includes(invoiceRole)
  );

  return (
    <TimelineWrapper
      className="timeline-card"
      aria-labelledby={`pet-timeline-${petId}`}
    >
      <div className="timeline-title" id={`pet-timeline-${petId}`}>
        <FieldTimeOutlined style={{ color: '#0d9488' }} /> Hành trình chăm sóc
        tổng hợp
      </div>
      <div className="timeline-subtitle">
        Lịch hẹn, dịch vụ, bệnh án, chăm sóc, cận lâm sàng và các đợt điều trị
        nội trú của bé.
      </div>

      {result && (
        <>
          <Space wrap size={[12, 12]} style={{ margin: '12px 0' }}>
            <Statistic title="Lượt hẹn" value={result.summary.totalVisits} />
            <Statistic
              title="Đã hoàn tất"
              value={result.summary.completedVisits}
            />
            <Statistic title="Đang xử lý" value={result.summary.activeVisits} />
            <Statistic
              title="Bệnh án"
              value={result.summary.totalMedicalRecords}
            />
            <Statistic
              title="Ghi nhận chăm sóc"
              value={result.summary.totalGroomingNotes}
            />
            <Statistic
              title="Đợt nội trú"
              value={result.summary.totalInpatientStays}
            />
          </Space>
          {result.summary.hasActiveInpatient && result.activeInpatient && (
            <Card className="timeline-active-inpatient" size="small">
              <Space wrap>
                <HeartOutlined />
                <Text strong>Đang điều trị nội trú</Text>
                <StatusTag status={result.activeInpatient.status} />
                <Text>{result.activeInpatient.daysAdmitted} ngày</Text>
                {result.activeInpatient.cage && (
                  <Text>Chuồng: {refName(result.activeInpatient.cage)}</Text>
                )}
                {result.activeInpatient.attendingVet && (
                  <Text>
                    Bác sĩ: {refName(result.activeInpatient.attendingVet)}
                  </Text>
                )}
              </Space>
              {result.activeInpatient.initialDiagnosis && (
                <Paragraph style={{ margin: '8px 0 0' }}>
                  <Text strong>Chẩn đoán ban đầu: </Text>
                  {result.activeInpatient.initialDiagnosis}
                </Paragraph>
              )}
              {result.activeInpatient.treatmentPlan && (
                <Paragraph style={{ margin: '4px 0 0' }}>
                  <Text strong>Kế hoạch điều trị: </Text>
                  {result.activeInpatient.treatmentPlan}
                </Paragraph>
              )}
              {result.activeInpatient.dailyLogs.map(log => (
                <div className="timeline-nested" key={log._id}>
                  <Text strong>{formatTimelineDate(log.date)}</Text>
                  {log.recordedBy && (
                    <Text type="secondary"> · {refName(log.recordedBy)}</Text>
                  )}
                  {log.observations && (
                    <Paragraph style={{ margin: '4px 0 0' }}>
                      <Text strong>Quan sát: </Text>
                      {log.observations}
                    </Paragraph>
                  )}
                  {log.notes && (
                    <Paragraph style={{ margin: '4px 0 0' }}>
                      <Text strong>Ghi chú: </Text>
                      {log.notes}
                    </Paragraph>
                  )}
                </div>
              ))}
              {showInvoices && result.activeInpatient.invoice && (
                <InvoiceSummary invoice={result.activeInpatient.invoice} />
              )}
            </Card>
          )}
        </>
      )}

      <Space className="timeline-filters" wrap>
        <Select
          aria-label="Lọc loại mốc"
          value={type}
          onChange={updateType}
          options={PET_TIMELINE_TYPES.map(value => ({
            value,
            label: PET_TIMELINE_TYPE_LABELS[value],
          }))}
          style={{ minWidth: 180 }}
        />
        <Select
          aria-label="Lọc trạng thái"
          allowClear
          placeholder="Tất cả trạng thái"
          value={status}
          onChange={value =>
            updateStatus(value as PetTimelineStatus | undefined)
          }
          options={PET_TIMELINE_STATUSES.map(value => ({
            value,
            label: getPetTimelineStatusLabel(value),
          }))}
          style={{ minWidth: 190 }}
        />
        <DatePicker.RangePicker
          aria-label="Lọc khoảng ngày"
          value={dates}
          onChange={value =>
            updateDates((value || [null, null]) as [Dayjs | null, Dayjs | null])
          }
          format="DD/MM/YYYY"
        />
        <Button
          onClick={() => {
            updateType('All');
            updateStatus(undefined);
            updateDates([null, null]);
          }}
        >
          Xóa bộ lọc
        </Button>
        <Button
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={() => {
            setLoading(true);
            setAttempt(value => value + 1);
          }}
        >
          Làm mới
        </Button>
      </Space>

      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button
              size="small"
              onClick={() => {
                setLoading(true);
                setAttempt(value => value + 1);
              }}
            >
              Thử lại
            </Button>
          }
        />
      ) : result && result.timeline.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có mốc nào phù hợp bộ lọc."
        />
      ) : (
        result && (
          <>
            <Timeline
              items={result.timeline.map(item => ({
                key: item.id,
                color:
                  item.derivedStatus === 'Done'
                    ? 'green'
                    : ['Cancelled', 'Overdue'].includes(item.derivedStatus)
                      ? 'gray'
                      : 'blue',
                children: <Milestone item={item} showInvoices={showInvoices} />,
              }))}
            />
            {result.pagination.total > 0 && (
              <Pagination
                current={result.pagination.page}
                pageSize={result.pagination.limit}
                total={result.pagination.total}
                showSizeChanger={false}
                onChange={updatePage}
                disabled={loading}
                style={{ marginTop: 12, textAlign: 'right' }}
              />
            )}
          </>
        )
      )}

      {sharedPostsVisible && result?.sharedPosts.length ? (
        <section
          aria-label="Bài chia sẻ hành trình đã đăng"
          style={{ marginTop: 20 }}
        >
          <Text strong>Bài chia sẻ hành trình đã đăng</Text>
          <List
            dataSource={result.sharedPosts}
            rowKey="_id"
            renderItem={post => (
              <List.Item>
                <Card
                  className="timeline-post"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <Space wrap>
                    <StatusTag status={post.status} />
                    <Text type="secondary">
                      {dayjs(post.createdAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                    <Text type="secondary">
                      ♥ {post.likeCount} · Bình luận {post.commentCount}
                    </Text>
                  </Space>
                  <Paragraph
                    style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}
                  >
                    {post.content}
                  </Paragraph>
                  {getSafeTimelineHttpUrl(post.imageUrl) && (
                    <a
                      href={getSafeTimelineHttpUrl(post.imageUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Xem ảnh bài chia sẻ
                    </a>
                  )}
                  {post.timelineItems.map((sharedItem, index) => {
                    const safeImage = getSafeTimelineHttpUrl(
                      sharedItem.imageUrl
                    );
                    return (
                      <div
                        className="timeline-nested"
                        key={`${post._id}-item-${index}`}
                      >
                        {sharedItem.date && (
                          <Text type="secondary">
                            {formatTimelineDate(sharedItem.date)}
                          </Text>
                        )}
                        {sharedItem.title && (
                          <Paragraph style={{ margin: 0 }}>
                            {sharedItem.title}
                          </Paragraph>
                        )}
                        {safeImage && (
                          <a href={safeImage} target="_blank" rel="noreferrer">
                            Xem ảnh mốc chia sẻ
                          </a>
                        )}
                      </div>
                    );
                  })}
                </Card>
              </List.Item>
            )}
          />
        </section>
      ) : null}
    </TimelineWrapper>
  );
};

export default PetTimeline;
