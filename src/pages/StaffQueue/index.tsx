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
import type { MyQueueItem, Pet } from '@/types';
import AppointmentServiceService, {
  QUEUE_VIEWS,
  countMyQueue,
  extractApiError,
  filterMyQueue,
  getAppointmentServiceName,
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
  getExamAction,
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

  const [items, setItems] = useState<MyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<QueueView>('active');
  const [todayOnly, setTodayOnly] = useState(true);
  // petId -> pet (null when it could not be loaded); my-queue does not populate pets
  const [pets, setPets] = useState<Record<string, Pet | null>>({});
  const [startingId, setStartingId] = useState<string | null>(null);
  const [cageFor, setCageFor] = useState<MyQueueItem | null>(null);
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
      setItems(res.data || []);
    } catch (err: unknown) {
      if (isAbort(err)) return;
      setError(extractApiError(err, 'Không thể tải hàng đợi làm việc').message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchQueue(true);
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
    // Groomers have no start API: they take the pet out of its waiting cage themselves
    if (
      !isVet &&
      order &&
      (item.status === 'Waiting' || item.status === 'InProgress')
    ) {
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
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => fetchQueue()}
          >
            Làm mới
          </Button>
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
    </PageWrapper>
  );
};

export default StaffQueuePage;
