import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BuildOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { normalizeRole } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import type { GroomingNote, MyQueueItem, Pet } from '@/types';
import AppointmentServiceService, {
  QUEUE_VIEWS,
  countMyQueue,
  extractApiError,
  filterMyQueue,
  getAppointmentServiceName,
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
  getExamAction,
  getGroomingActions,
  getQueueOrder,
  getServiceRefCategory,
  getVietnamTodayString,
  type QueueView,
} from '@/services/AppointmentServiceService';
import MedicalRecordService from '@/services/MedicalRecordService';
import { getAppointmentStatusLabel } from '@/services/AppointmentOrderService';
import { getAssignmentCageLabel } from '@/services/CageAssignmentService';
import {
  serviceCategoryLabels,
  type ServiceCategory,
} from '@/services/ServiceService';
import { describeWalkInPet } from '@/services/WalkInService';
import {
  PageHeader,
  PageWrapper,
} from '../AppointmentReception/components/styles';
import QueueCageModal from './components/QueueCageModal';
import GroomingNoteModal from './components/GroomingNoteModal';
import GroomingNoteHistoryModal from './components/GroomingNoteHistoryModal';

const { Title, Text } = Typography;

// Refresh while the page is visible, so a check-in at the desk shows up (SCR-22)
const POLL_MS = 30000;

interface StoredUserInfo {
  role?: string;
  systemRole?: string;
}

const isAbort = (err: unknown) =>
  axios.isCancel(err) ||
  (err instanceof DOMException && err.name === 'AbortError');

/** Hàng đợi làm việc của Bác sĩ (SCR-22) và Groomer (SCR-26) */
const StaffQueuePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const storedUser = storage.getLocalStorage<StoredUserInfo>(STORAGE.USER_INFO);
  const role = normalizeRole(
    user?.role || user?.systemRole || storedUser?.role || storedUser?.systemRole
  );
  const isVet = role === 'Veterinarian';
  const isGroomer = role === 'Groomer';

  const [items, setItems] = useState<MyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<QueueView>('active');
  const [todayOnly, setTodayOnly] = useState(true);
  // petId -> pet (null when it could not be loaded); my-queue does not populate pets
  const [pets, setPets] = useState<Record<string, Pet | null>>({});
  const [startingId, setStartingId] = useState<string | null>(null);
  const [cageFor, setCageFor] = useState<MyQueueItem | null>(null);
  const [groomingUpdate, setGroomingUpdate] = useState<{
    id: string;
    action: 'start' | 'complete';
  } | null>(null);
  const groomingUpdateRef = useRef(false);
  const [noteTarget, setNoteTarget] = useState<{
    id: string;
    mode: 'create' | 'view';
  } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const petRequestsRef = useRef(new Set<string>());

  const today = getVietnamTodayString();

  const fetchQueue = useCallback(async (silent = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await AppointmentServiceService.listMyQueue(undefined, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setItems(res.data || []);
    } catch (err: unknown) {
      if (controller.signal.aborted || isAbort(err)) return;
      setError(extractApiError(err, 'Không thể tải hàng đợi làm việc').message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !groomingUpdateRef.current)
        fetchQueue(true);
    }, POLL_MS);
    return () => {
      window.clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchQueue]);

  const visible = useMemo(
    () => filterMyQueue(items, view, todayOnly, today),
    [items, view, todayOnly, today]
  );
  const counts = countMyQueue(items, todayOnly, today);

  // Pet name and species for the rows on screen, one request per pet
  useEffect(() => {
    const petIds = [
      ...new Set(
        visible
          .map(item => getQueueOrder(item)?.petId)
          .filter((id): id is string => Boolean(id))
      ),
    ].filter(id => !petRequestsRef.current.has(id));
    for (const petId of petIds) {
      petRequestsRef.current.add(petId);
      MedicalRecordService.getPetHistory(petId)
        .then(res => setPets(prev => ({ ...prev, [petId]: res.pet })))
        .catch(() => setPets(prev => ({ ...prev, [petId]: null })));
    }
  }, [visible]);

  const openExam = (item: MyQueueItem) =>
    navigate(
      generatePath(ROUTER.EXAM_RECORD, { appointmentServiceId: item._id })
    );

  const startExam = async (item: MyQueueItem) => {
    if (startingId) return;
    setStartingId(item._id);
    try {
      const res = await MedicalRecordService.startConsultation(item._id);
      const cage = res.releasedCageAssignment
        ? getAssignmentCageLabel(
            typeof res.releasedCageAssignment.cageId === 'object'
              ? res.releasedCageAssignment.cageId
              : null
          )
        : '';
      toast.success(
        cage
          ? `Đã bắt đầu khám. Bé đã được đưa ra khỏi chuồng ${cage}.`
          : 'Đã bắt đầu ca khám'
      );
      openExam(item);
    } catch (err: unknown) {
      const { message } = extractApiError(err, 'Không thể bắt đầu ca khám');
      toast.error(message);
      // 403/404/409: the queue changed elsewhere, show what the server has
      fetchQueue(true);
    } finally {
      setStartingId(null);
    }
  };

  const updateGrooming = async (
    item: MyQueueItem,
    action: 'start' | 'complete'
  ) => {
    if (
      groomingUpdateRef.current ||
      error ||
      loading ||
      !getGroomingActions(item, role)?.[action]
    )
      return;
    groomingUpdateRef.current = true;
    setGroomingUpdate({ id: item._id, action });
    const isStart = action === 'start';
    try {
      const { data } = await (isStart
        ? AppointmentServiceService.startGrooming(item._id)
        : AppointmentServiceService.completeGrooming(item._id));
      if (
        data?._id !== item._id ||
        data.status !== (isStart ? 'InProgress' : 'Done')
      ) {
        throw new Error('Máy chủ chưa xác nhận trạng thái mới của ca spa.');
      }
      toast.success(isStart ? 'Đã bắt đầu spa.' : 'Đã hoàn thành spa.');
    } catch (err: unknown) {
      toast.error(
        extractApiError(
          err,
          isStart ? 'Không thể bắt đầu spa' : 'Không thể hoàn thành spa'
        ).message
      );
    } finally {
      // Chỉ hàng đợi trả lịch hẹn đã populate (bao gồm derivedStatus do BE quyết định).
      await fetchQueue(true);
      groomingUpdateRef.current = false;
      setGroomingUpdate(null);
    }
  };

  const syncGroomingNote = async (note?: GroomingNote) => {
    if (note && noteTarget) {
      setItems(prev =>
        prev.map(item =>
          item._id === noteTarget.id ? { ...item, groomingNote: note } : item
        )
      );
    }
    await fetchQueue(true);
  };

  const renderPet = (item: MyQueueItem) => {
    const petId = getQueueOrder(item)?.petId;
    if (!petId) return <Text type="secondary">—</Text>;
    if (!(petId in pets)) return <Text type="secondary">Đang tải...</Text>;
    const pet = pets[petId];
    if (!pet) return <Text type="secondary">Không tải được</Text>;
    return (
      <Space direction="vertical" size={0}>
        <Text strong>{pet.name}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {describeWalkInPet(pet)}
        </Text>
      </Space>
    );
  };

  const renderActions = (item: MyQueueItem) => {
    const order = getQueueOrder(item);
    const action = getExamAction(item, role);
    const buttons = [];
    if (action === 'start') {
      buttons.push(
        <Button
          key="start"
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          loading={startingId === item._id}
          disabled={Boolean(startingId)}
          onClick={() => startExam(item)}
        >
          Bắt đầu khám
        </Button>
      );
    } else if (action === 'continue') {
      buttons.push(
        <Button
          key="continue"
          type="primary"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => openExam(item)}
        >
          Tiếp tục khám
        </Button>
      );
    } else if (action === 'view') {
      buttons.push(
        <Button
          key="view"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => openExam(item)}
        >
          Xem bệnh án
        </Button>
      );
    } else if (action === 'waitCheckIn') {
      buttons.push(
        <Button key="wait" size="small" disabled>
          Chờ khách check-in
        </Button>
      );
    }
    const grooming = getGroomingActions(item, role);
    if (grooming?.waitForCheckIn) {
      buttons.push(
        <Button key="grooming-wait" size="small" disabled>
          Chờ khách check-in
        </Button>
      );
    }
    if (grooming?.start || grooming?.complete) {
      const groomingAction = grooming.start ? 'start' : 'complete';
      buttons.push(
        <Button
          key={`grooming-${groomingAction}`}
          type="primary"
          size="small"
          icon={
            grooming.start ? (
              <PlayCircleOutlined aria-hidden />
            ) : (
              <CheckCircleOutlined aria-hidden />
            )
          }
          loading={
            groomingUpdate?.id === item._id &&
            groomingUpdate.action === groomingAction
          }
          disabled={Boolean(groomingUpdate) || Boolean(error)}
          onClick={() => updateGrooming(item, groomingAction)}
        >
          {grooming.start ? 'Bắt đầu spa' : 'Hoàn thành spa'}
        </Button>
      );
    }
    if (grooming?.note) {
      const mode = grooming.note;
      buttons.push(
        <Button
          key="grooming-note"
          size="small"
          icon={
            mode === 'view' ? (
              <EyeOutlined aria-hidden />
            ) : (
              <FileTextOutlined aria-hidden />
            )
          }
          disabled={
            mode === 'create' && (Boolean(groomingUpdate) || Boolean(error))
          }
          onClick={() => setNoteTarget({ id: item._id, mode })}
        >
          {mode === 'view' ? 'Xem ghi chú spa' : 'Tạo ghi chú spa'}
        </Button>
      );
    }
    // Both Veterinarians and Groomers can look up the pet's cage and release it (SCR-22, SCR-26, BR-10)
    if (order && (item.status === 'Waiting' || item.status === 'InProgress')) {
      buttons.push(
        <Button
          key="cage"
          size="small"
          icon={<BuildOutlined />}
          onClick={() => setCageFor(item)}
        >
          Chuồng
        </Button>
      );
    }
    return buttons.length ? (
      <Space wrap size={6}>
        {buttons}
      </Space>
    ) : (
      <Text type="secondary">—</Text>
    );
  };

  const columns: ColumnsType<MyQueueItem> = [
    {
      title: 'STT',
      key: 'queueNo',
      width: 90,
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 16 }}>
            {typeof item.queueNo === 'number' ? `#${item.queueNo}` : '—'}
          </Text>
          {item.isEmergency && <Tag color="red">Cấp cứu</Tag>}
        </Space>
      ),
    },
    {
      title: 'Dịch vụ',
      key: 'service',
      render: (_, item) => {
        const category = getServiceRefCategory(item.serviceId);
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{getAppointmentServiceName(item.serviceId)}</Text>
            {category && (
              <Tag style={{ margin: 0 }}>
                {serviceCategoryLabels[category as ServiceCategory] || category}
              </Tag>
            )}
          </Space>
        );
      },
    },
    { title: 'Thú cưng', key: 'pet', render: (_, item) => renderPet(item) },
    {
      title: 'Lịch hẹn',
      key: 'order',
      render: (_, item) => {
        const order = getQueueOrder(item);
        if (!order) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ color: '#0958d9' }}>
              {order.code}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(order.date).format('DD/MM/YYYY')}
              {order.date === today ? ' · Hôm nay' : ''} ·{' '}
              {order.isOnline ? 'Online' : 'Tại chỗ'} ·{' '}
              {getAppointmentStatusLabel(order.derivedStatus)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <Tag color={getAppointmentServiceStatusColor(status)}>
          {getAppointmentServiceStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 230,
      render: (_, item) => renderActions(item),
    },
  ];

  const cageOrder = cageFor ? getQueueOrder(cageFor) : null;
  const cagePetId = cageOrder?.petId;
  const noteItem = items.find(item => item._id === noteTarget?.id);

  return (
    <PageWrapper>
      <Card>
        <PageHeader>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {isVet ? 'Hàng đợi khám của tôi' : 'Hàng đợi spa của tôi'}
            </Title>
            <Text type="secondary">
              {isVet
                ? 'Các ca được lễ tân phân công cho bạn. Ca cấp cứu xếp trước; bấm "Bắt đầu khám" để mở bệnh án SOAP.'
                : 'Các ca chăm sóc, làm đẹp được phân công cho bạn. Ca cấp cứu xếp trước.'}
            </Text>
          </div>
          <Space wrap>
            {isGroomer && (
              <Button
                icon={<FileTextOutlined aria-hidden />}
                onClick={() => setHistoryOpen(true)}
              >
                Lịch sử ghi chú spa
              </Button>
            )}
            <Button
              icon={<ReloadOutlined spin={loading} />}
              disabled={Boolean(groomingUpdate)}
              onClick={() => fetchQueue()}
            >
              Làm mới
            </Button>
          </Space>
        </PageHeader>

        <Space wrap size={16} style={{ marginBottom: 16 }}>
          <Segmented
            value={view}
            onChange={value => setView(value as QueueView)}
            options={QUEUE_VIEWS.map(v => ({
              value: v.key,
              label: `${v.label} (${counts[v.key]})`,
            }))}
          />
          <Space size={8}>
            <Switch checked={todayOnly} onChange={setTodayOnly} />
            <Text>Chỉ lịch hẹn hôm nay</Text>
          </Space>
        </Space>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => fetchQueue()}>
                Thử lại
              </Button>
            }
          />
        )}

        <Table
          columns={columns}
          dataSource={visible}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 960 }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{
            emptyText: todayOnly
              ? 'Không có ca nào trong nhóm này hôm nay.'
              : 'Không có ca nào trong nhóm này.',
          }}
        />
      </Card>

      <QueueCageModal
        order={cageOrder}
        petName={cagePetId ? pets[cagePetId]?.name : undefined}
        onClose={() => setCageFor(null)}
      />
      {isGroomer && noteTarget && (
        <GroomingNoteModal
          key={noteTarget.id}
          serviceId={noteTarget.id}
          mode={noteTarget.mode}
          queueNote={noteItem?.groomingNote}
          canCreate={
            !error &&
            !!noteItem &&
            getGroomingActions(noteItem, role)?.note === 'create'
          }
          onClose={() => setNoteTarget(null)}
          onQueueSync={syncGroomingNote}
        />
      )}
      {isGroomer && historyOpen && (
        <GroomingNoteHistoryModal onClose={() => setHistoryOpen(false)} />
      )}
    </PageWrapper>
  );
};

export default StaffQueuePage;
