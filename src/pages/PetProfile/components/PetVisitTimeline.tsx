import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Modal,
  Skeleton,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  DollarOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type {
  Invoice,
  ListInvoicesResponse,
  MedicalRecord,
  OnlineAppointment,
  PetAppointmentNote,
} from '@/types';
import AppointmentOrderService, {
  extractApiError,
  getAppointmentStatusColor,
} from '@/services/AppointmentOrderService';
import MedicalRecordService, {
  getRecordOrderCode,
} from '@/services/MedicalRecordService';
import PetService from '@/services/PetService';
import InvoiceService, {
  filterInvoicesByPet,
  formatVnd,
  getInvoiceStatusColor,
  getInvoiceStatusLabel,
  indexInvoicesByOrderCode,
  INVOICE_LIST_LIMIT_MAX,
  PAY_AT_COUNTER_TEXT,
} from '@/services/InvoiceService';
import MedicalRecordView from '@/components/medical/MedicalRecordView';
import InvoiceDetailView from '@/components/invoice/InvoiceDetailView';
import InvoicePdfButton from '@/components/invoice/InvoicePdfButton';
import {
  buildPetMilestones,
  getActiveVisitRange,
  isActiveVisit,
} from './petTimelineHelpers';

const { Text } = Typography;

/** Open visits refresh this often while the tab is on screen */
const LIVE_REFRESH_MS = 30000;

const MilestoneBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 4px;

  .milestone-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }

  .milestone-line {
    color: #475569;
    font-size: 13px;
  }
`;

interface PetVisitTimelineProps {
  petId: string;
  /** Visits already returned with the pet, so the first paint needs no wait */
  initialNotes?: PetAppointmentNote[];
  /**
   * The pet's owner is reading. False for vets and groomers (nghiệp vụ 5, 6):
   * the owner's order list (GET /appointment-orders/me) is PetOwner only, and
   * the pick-up message is for the owner.
   */
  ownerView?: boolean;
}

/**
 * Nghiệp vụ 3.3, 3.7: mỗi lần khám hoặc dịch vụ là một mốc, luôn hiện trạng thái
 * gần nhất từ lúc đặt tới khi xong; bệnh án SOAP gắn vào mốc khi khám xong.
 * Hóa đơn gắn vào mốc cùng mã lịch hẹn, chỉ chủ pet xem được (H7, BR-23).
 */
const PetVisitTimeline = ({
  petId,
  initialNotes,
  ownerView = true,
}: PetVisitTimelineProps) => {
  const [notes, setNotes] = useState<PetAppointmentNote[]>(initialNotes || []);
  const [orders, setOrders] = useState<OnlineAppointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(!initialNotes);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>();
  const [openRecords, setOpenRecords] = useState<{
    code: string;
    ids: string[];
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const firstLoadRef = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;
      if (!silent) setRefreshing(true);
      try {
        // Reuse the visits the page just loaded on the first run
        const visits =
          firstLoadRef.current && initialNotes
            ? initialNotes
            : (await PetService.getPetById(petId)).appointmentNotes || [];
        firstLoadRef.current = false;
        const range = ownerView ? getActiveVisitRange(visits) : undefined;
        const [recordResult, orderResult, invoiceResult] =
          await Promise.allSettled([
            MedicalRecordService.getPetHistory(petId, { signal }),
            range
              ? AppointmentOrderService.listMyOnlineBookings(
                  { ...range, limit: 50 },
                  { signal }
                )
              : Promise.resolve({ data: [] as OnlineAppointment[] }),
            // Bills are for the pet's owner only (GET /invoices/me, BR-23)
            ownerView
              ? InvoiceService.listMine(
                  { petId, limit: INVOICE_LIST_LIMIT_MAX },
                  { signal }
                )
              : Promise.resolve<ListInvoicesResponse>({
                  items: [],
                  pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
                }),
          ]);
        if (signal.aborted) return;
        setNotes(visits);
        if (recordResult.status === 'fulfilled')
          setRecords(recordResult.value.records || []);
        if (invoiceResult.status === 'fulfilled')
          setInvoices(
            filterInvoicesByPet(invoiceResult.value.items || [], petId)
          );
        // Staff and walk-in visits only have the order status
        setOrders(
          orderResult.status === 'fulfilled' ? orderResult.value.data || [] : []
        );
        setError(null);
        setUpdatedAt(Date.now());
      } catch (err) {
        if (axios.isCancel(err) || signal.aborted) return;
        setError(
          extractApiError(err, 'Không tải được hành trình của bé').message
        );
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [petId, initialNotes, ownerView]
  );

  useEffect(() => {
    void load(Boolean(initialNotes));
    return () => abortRef.current?.abort();
  }, [load, initialNotes]);

  const hasActive = notes.some(n => isActiveVisit(n.derivedStatus));

  // "Theo thời gian thực": refresh open visits while the page is visible
  useEffect(() => {
    if (!hasActive) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, LIVE_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hasActive, load]);

  const recordsByCode = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const record of records) {
      const code = getRecordOrderCode(record);
      if (!code) continue;
      map.set(code, [...(map.get(code) || []), record._id]);
    }
    return map;
  }, [records]);

  const milestones = useMemo(
    () => buildPetMilestones(notes, orders, recordsByCode),
    [notes, orders, recordsByCode]
  );

  const invoicesByCode = useMemo(
    () => indexInvoicesByOrderCode(invoices),
    [invoices]
  );

  const shownRecords = openRecords
    ? records.filter(r => openRecords.ids.includes(r._id))
    : [];

  return (
    <div className="timeline-card">
      <div className="timeline-title">
        <FieldTimeOutlined style={{ color: '#0d9488' }} />
        Hành trình của bé
      </div>
      <div className="timeline-subtitle">
        Mỗi lần khám hoặc làm dịch vụ là một mốc, luôn hiện trạng thái mới nhất.
        {ownerView
          ? ' Xong việc, bệnh án và hóa đơn được gắn vào mốc.'
          : ' Khám xong, bệnh án được gắn vào mốc.'}
      </div>
      <Space size={8} wrap style={{ marginBottom: 12 }}>
        <Button
          size="small"
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={() => load()}
        >
          Làm mới
        </Button>
        {updatedAt && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Cập nhật lúc {dayjs(updatedAt).format('HH:mm:ss')}
            {hasActive ? ' · tự làm mới mỗi 30 giây' : ''}
          </Text>
        )}
      </Space>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 12 }}
          action={
            <Button size="small" onClick={() => load()}>
              Thử lại
            </Button>
          }
        />
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : milestones.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Bé chưa có lịch hẹn nào."
        />
      ) : (
        <Timeline
          items={milestones.map(m => {
            const invoice = ownerView ? invoicesByCode.get(m.code) : undefined;
            return {
              key: m.id,
              color: m.active ? 'blue' : m.status === 'Done' ? 'green' : 'gray',
              children: (
                <MilestoneBody>
                  <div className="milestone-head">
                    <strong>{dayjs(m.date).format('DD/MM/YYYY')}</strong>
                    {m.slotStart && <Text type="secondary">{m.slotStart}</Text>}
                    <Tag color={getAppointmentStatusColor(m.status)}>
                      {m.statusText}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {m.code}
                      {m.isOnline === false ? ' · khám tại chỗ' : ''}
                    </Text>
                  </div>
                  {m.services.length > 0 && (
                    <div className="milestone-line">
                      Dịch vụ: {m.services.join(' → ')}
                    </div>
                  )}
                  {m.symptoms && (
                    <div className="milestone-line">
                      Triệu chứng lúc đến: {m.symptoms}
                    </div>
                  )}
                  {m.note && (
                    <div className="milestone-line">Ghi chú: {m.note}</div>
                  )}
                  {ownerView && m.status === 'WaitOwner' && (
                    <Alert
                      type="success"
                      showIcon
                      message="Bé đã xong dịch vụ, mời bạn tới phòng khám đón bé."
                      description={PAY_AT_COUNTER_TEXT}
                      style={{ marginTop: 4 }}
                    />
                  )}
                  {invoice && (
                    <div className="milestone-line">
                      Hóa đơn {invoice.code} · {formatVnd(invoice.totalAmount)}{' '}
                      <Tag color={getInvoiceStatusColor(invoice.paymentStatus)}>
                        {getInvoiceStatusLabel(invoice.paymentStatus)}
                      </Tag>
                    </div>
                  )}
                  {(m.recordIds.length > 0 || invoice) && (
                    <Space size={8} wrap>
                      {m.recordIds.length > 0 && (
                        <Button
                          size="small"
                          icon={<FileTextOutlined />}
                          onClick={() =>
                            setOpenRecords({ code: m.code, ids: m.recordIds })
                          }
                        >
                          Xem bệnh án ({m.recordIds.length})
                        </Button>
                      )}
                      {invoice && (
                        <Button
                          size="small"
                          icon={<DollarOutlined />}
                          onClick={() => setOpenInvoice(invoice)}
                        >
                          Xem hóa đơn
                        </Button>
                      )}
                    </Space>
                  )}
                </MilestoneBody>
              ),
            };
          })}
        />
      )}

      <Modal
        open={Boolean(openInvoice)}
        title={openInvoice ? `Hóa đơn ${openInvoice.code}` : ''}
        footer={null}
        width={760}
        onCancel={() => setOpenInvoice(null)}
        destroyOnHidden
      >
        {openInvoice && (
          <InvoiceDetailView
            invoice={openInvoice}
            showOwner={false}
            payAtCounterHint
            actions={<InvoicePdfButton invoice={openInvoice} />}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(openRecords)}
        title={openRecords ? `Bệnh án lịch hẹn ${openRecords.code}` : ''}
        footer={null}
        width={760}
        onCancel={() => setOpenRecords(null)}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {shownRecords.map(record => (
            <MedicalRecordView key={record._id} record={record} />
          ))}
        </Space>
      </Modal>
    </div>
  );
};

export default PetVisitTimeline;
