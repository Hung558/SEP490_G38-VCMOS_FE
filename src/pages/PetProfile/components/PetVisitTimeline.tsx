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
  FieldTimeOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type {
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
import MedicalRecordView from '@/components/medical/MedicalRecordView';
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
 * Hóa đơn chưa có API nên chưa hiện.
 */
const PetVisitTimeline = ({
  petId,
  initialNotes,
  ownerView = true,
}: PetVisitTimelineProps) => {
  const [notes, setNotes] = useState<PetAppointmentNote[]>(initialNotes || []);
  const [orders, setOrders] = useState<OnlineAppointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
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
        const [recordResult, orderResult] = await Promise.allSettled([
          MedicalRecordService.getPetHistory(petId, { signal }),
          range
            ? AppointmentOrderService.listMyOnlineBookings(
                { ...range, limit: 50 },
                { signal }
              )
            : Promise.resolve({ data: [] as OnlineAppointment[] }),
        ]);
        if (signal.aborted) return;
        setNotes(visits);
        if (recordResult.status === 'fulfilled')
          setRecords(recordResult.value.records || []);
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
        Khám xong, bệnh án được gắn vào mốc.
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
          items={milestones.map(m => ({
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
                    style={{ marginTop: 4 }}
                  />
                )}
                {m.recordIds.length > 0 && (
                  <div>
                    <Button
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() =>
                        setOpenRecords({ code: m.code, ids: m.recordIds })
                      }
                    >
                      Xem bệnh án ({m.recordIds.length})
                    </Button>
                  </div>
                )}
              </MilestoneBody>
            ),
          }))}
        />
      )}

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
