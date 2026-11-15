import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Segmented,
  Space,
  Table,
  Tabs,
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
  ProfileOutlined,
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
  QUEUE_PERIODS,
  QUEUE_VIEWS,
  countMyQueue,
  extractApiError,
  filterMyQueue,
  getAppointmentServiceName,
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
  getExamAction,
  getGroomingActions,
  getPreviousServiceMessage,
  getPreviousUnfinishedService,
  getQueueCustomerNote,
  getQueueItemTime,
  getQueueOrder,
  getQueuePeriodRange,
  getServiceRefCategory,
  getVietnamTodayString,
  type QueuePeriod,
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
import AssignedSubtasks from './components/AssignedSubtasks';
import QueueServiceSubtasks from './components/QueueServiceSubtasks';

const { Title, Text, Paragraph } = Typography;

// Refresh while the page is visible, so a check-in at the desk shows up (SCR-22)
const POLL_MS = 30000;

interface StoredUserInfo {
  _id?: string;
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
  const userId = user?._id ?? storedUser?._id;
  const [tab, setTab] = useState('services');
  const [subtaskServiceId, setSubtaskServiceId] = useState<string>();

  const [items, setItems] = useState<MyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<QueueView>('active');
  // Nghiệp vụ 5, 6: ca được giao lọc theo ngày, tuần, tháng của ngày hẹn
  const [period, setPeriod] = useState<QueuePeriod>('day');
  const [anchor, setAnchor] = useState(getVietnamTodayString);
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

  const range = useMemo(
    () => getQueuePeriodRange(period, anchor),
    [period, anchor]
  );
  const visible = useMemo(
    () => filterMyQueue(items, view, range, today),
    [items, view, range, today]
  );
  const counts = countMyQueue(items, range, today);
  const rangeText = !range
    ? ''
    : range.from === range.to
      ? range.from === today
        ? 'hôm nay'
        : `ngày ${dayjs(range.from).format('DD/MM/YYYY')}`
      : `từ ${dayjs(range.from).format('DD/MM')} đến ${dayjs(range.to).format('DD/MM/YYYY')}`;

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
    if (
      startingId ||
      loading ||
      error ||
      getPreviousUnfinishedService(item, items)
    )
      return;
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
      !getGroomingActions(item, role)?.[action] ||
      (action === 'start' && getPreviousUnfinishedService(item, items))
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
    // Nghiệp vụ 5, 6: mở hồ sơ pet để xem timeline và bệnh án các lần trước
    const profileLink = (
      <Button
        type="link"
        size="small"
        icon={<ProfileOutlined aria-hidden />}
        style={{ padding: 0, height: 'auto' }}
        onClick={() => navigate(generatePath(ROUTER.PET_PROFILE, { petId }))}
      >
        Hồ sơ pet
      </Button>
    );
    if (!(petId in pets))
      return (
        <Space direction="vertical" size={0}>
          <Text type="secondary">Đang tải...</Text>
          {profileLink}
        </Space>
      );
    const pet = pets[petId];
    return (
      <Space direction="vertical" size={0}>
        {pet ? (
          <>
            <Text strong>{pet.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {describeWalkInPet(pet)}
            </Text>
          </>
        ) : (
          <Text type="secondary">Không tải được</Text>
        )}
        {profileLink}
      </Space>
    );
  };

  const renderActions = (item: MyQueueItem) => {
    const order = getQueueOrder(item);
    const action = getExamAction(item, role);
    const previous = getPreviousUnfinishedService(item, items);
    const buttons = [];
    if (action === 'start') {
      buttons.push(
        <Button
          key="start"
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          loading={startingId === item._id}
          disabled={Boolean(startingId || error || previous) || loading}
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
    if (action === 'continue' || action === 'view') {
      buttons.push(
        <Button
          key="subtasks"
          size="small"
          onClick={() => setSubtaskServiceId(item._id)}
        >
          Cận lâm sàng
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
          disabled={
            Boolean(groomingUpdate || error || (grooming.start && previous)) ||
            loading
          }
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
    // Vets and groomers can look up which cage the pet is in. Placing and
    // releasing cages is the receptionist's job (nghiệp vụ 4.5)
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
      <Space direction="vertical" size={6}>
        <Space wrap size={6}>
          {buttons}
        </Space>
        {previous && (action === 'start' || grooming?.start) && (
          <Text type="secondary">{getPreviousServiceMessage(previous)}</Text>
        )}
      </Space>
    ) : (
      <Text type="secondary">—</Text>
    );
  };

  const columns: ColumnsType<MyQueueItem> = [
    {
      // Nghiệp vụ 5: mỗi ca hiện giờ. It shares the queue number column so the
      // table fits the screen without scrolling sideways
      title: 'STT · Giờ',
      key: 'queueNo',
      width: 110,
      render: (_, item) => {
        const time = getQueueItemTime(item);
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 16 }}>
              {typeof item.queueNo === 'number' ? `#${item.queueNo}` : '—'}
            </Text>
            {time ? (
              <Text strong>{time}</Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Chưa có giờ
              </Text>
            )}
            {item.isEmergency && <Tag color="red">Cấp cứu</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Dịch vụ',
      key: 'service',
      render: (_, item) => {
        const category = getServiceRefCategory(item.serviceId);
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{getAppointmentServiceName(item.serviceId)}</Text>
            {item.sequenceNo > 0 && (
              <Text type="secondary">
                Thứ tự trong lịch hẹn: {item.sequenceNo}
              </Text>
            )}
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
      title: 'Lịch hẹn và ghi chú',
      key: 'order',
      render: (_, item) => {
        const order = getQueueOrder(item);
        if (!order) return <Text type="secondary">—</Text>;
        // Nghiệp vụ 5: ghi chú khách để lại khi đặt lịch (triệu chứng, yêu cầu)
        const note = getQueueCustomerNote(item);
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Text strong style={{ color: '#0958d9' }}>
              {order.code}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(order.date).format('DD/MM/YYYY')}
              {order.date === today ? ' · Hôm nay' : ''} ·{' '}
              {order.isOnline ? 'Online' : 'Tại chỗ'} ·{' '}
              {getAppointmentStatusLabel(order.derivedStatus)}
            </Text>
            {note ? (
              <Paragraph
                aria-label="Ghi chú của khách"
                style={{ margin: 0 }}
                ellipsis={{ rows: 2, tooltip: note }}
              >
                <Text type="secondary">Ghi chú: </Text>
                {note}
              </Paragraph>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Không có ghi chú của khách
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, item) => (
        <Tag color={getAppointmentServiceStatusColor(status)}>
          {getAppointmentServiceStatusLabel(
            status,
            getServiceRefCategory(item.serviceId)
          )}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 180,
      render: (_, item) => renderActions(item),
    },
  ];

  const cageOrder = cageFor ? getQueueOrder(cageFor) : null;
  const cagePetId = cageOrder?.petId;
  const noteItem = items.find(item => item._id === noteTarget?.id);
  const subtaskService = items.find(item => item._id === subtaskServiceId);
  const serviceQueue = (
    <>
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
        <Space size={8} wrap>
          <Segmented
            aria-label="Khoảng thời gian"
            value={period}
            onChange={value => setPeriod(value as QueuePeriod)}
            options={QUEUE_PERIODS.map(p => ({ value: p.key, label: p.label }))}
          />
          {period !== 'all' && (
            <DatePicker
              aria-label="Chọn ngày, tuần hoặc tháng"
              allowClear={false}
              picker={period === 'day' ? 'date' : period}
              format={
                period === 'week'
                  ? // Show the Monday–Sunday range the list is filtered by
                    value => {
                      const week = getQueuePeriodRange(
                        'week',
                        value.format('YYYY-MM-DD')
                      );
                      return week
                        ? `${dayjs(week.from).format('DD/MM')} – ${dayjs(week.to).format('DD/MM/YYYY')}`
                        : '';
                    }
                  : period === 'day'
                    ? 'DD/MM/YYYY'
                    : 'MM/YYYY'
              }
              value={dayjs(anchor)}
              onChange={value => value && setAnchor(value.format('YYYY-MM-DD'))}
            />
          )}
          {period !== 'all' && anchor !== today && (
            <Button type="link" onClick={() => setAnchor(today)}>
              Về hôm nay
            </Button>
          )}
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
        // Fits the content area of a 1366px screen; narrower screens scroll
        scroll={{ x: 900 }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{
          emptyText: range
            ? `Không có ca nào trong nhóm này ${rangeText}.`
            : 'Không có ca nào trong nhóm này.',
        }}
      />
    </>
  );

  return (
    <PageWrapper>
      <Card>
        {isVet || isGroomer ? (
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'services',
                label: isVet ? 'Ca khám chính' : 'Ca spa',
                children: serviceQueue,
              },
              {
                key: 'subtasks',
                label: 'Việc được giao',
                children:
                  tab === 'subtasks' ? (
                    <AssignedSubtasks userId={userId} />
                  ) : undefined,
              },
            ]}
          />
        ) : (
          serviceQueue
        )}
      </Card>
      {isVet && subtaskServiceId && (
        <QueueServiceSubtasks
          key={subtaskServiceId}
          serviceId={subtaskServiceId}
          workTime={
            subtaskService?.scheduledStart ||
            (subtaskService
              ? getQueueOrder(subtaskService)?.slotStart
              : undefined)
          }
          requesterId={userId}
          active={!error && subtaskService?.status === 'InProgress'}
          onClose={() => setSubtaskServiceId(undefined)}
        />
      )}
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
