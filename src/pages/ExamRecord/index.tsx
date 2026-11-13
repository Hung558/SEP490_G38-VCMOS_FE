import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Result,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styled from 'styled-components';
import { toast } from 'sonner';
import ROUTER from '@/routerMap/ROUTER';
import type {
  AppointmentServiceStatus,
  MedicalRecord,
  MedicalRecordPetRef,
  MyQueueItem,
} from '@/types';
import AppointmentServiceService, {
  extractApiError,
  getAppointmentServiceName,
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
  getExamAction,
  getQueueOrder,
} from '@/services/AppointmentServiceService';
import MedicalRecordService, {
  getRecordServiceRef,
  isMedicalRecordLocked,
} from '@/services/MedicalRecordService';
import ProductService, { type Product } from '@/services/ProductService';
import {
  getAppointmentStatusLabel,
  readReceptionIntake,
} from '@/services/AppointmentOrderService';
import { describeWalkInPet } from '@/services/WalkInService';
import MedicalRecordView from '@/components/medical/MedicalRecordView';
import PetMedicalHistory from '@/components/medical/PetMedicalHistory';
import ReceptionIntakeDetails from '@/components/appointment/ReceptionIntakeDetails';
import {
  PageHeader,
  PageWrapper,
} from '../AppointmentReception/components/styles';
import SoapForm from './components/SoapForm';
import ServiceSubtasksModal from '@/components/clinicalSubtasks/ServiceSubtasksModal';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { normalizeRole } from '@/constants/roles';

const { Title, Text } = Typography;

// "Lưu nháp" and "Hoàn tất ca khám" sit at the bottom right, where the email
// reminder widget is fixed; the extra room lets the vet scroll them above it
const ExamPageWrapper = styled(PageWrapper)`
  padding-bottom: 136px;
`;

/** Màn khám bệnh và ghi bệnh án SOAP của một ca (SCR-23), chỉ Bác sĩ được phân công */
const ExamRecordPage = () => {
  const { appointmentServiceId = '' } = useParams<{
    appointmentServiceId: string;
  }>();
  return (
    <ExamRecordCase
      key={appointmentServiceId}
      appointmentServiceId={appointmentServiceId}
    />
  );
};

const ExamRecordCase = ({
  appointmentServiceId,
}: {
  appointmentServiceId: string;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = normalizeRole(user?.role || user?.systemRole);
  const [subtasksOpen, setSubtasksOpen] = useState(false);

  const [item, setItem] = useState<MyQueueItem | null>(null);
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [pet, setPet] = useState<MedicalRecordPetRef | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notMine, setNotMine] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Bumped after every load so the form remounts with the server's values
  const [formKey, setFormKey] = useState(0);

  const fetchCase = useCallback(async () => {
    const queue = await AppointmentServiceService.listMyQueue();
    const mine = (queue.data || []).find(i => i._id === appointmentServiceId);
    if (!mine) return null;

    const saved = await MedicalRecordService.getByService(
      appointmentServiceId
    ).catch((err: unknown) => {
      // A visit that has not started has no record yet.
      if (extractApiError(err).statusCode === 404) return null;
      throw err;
    });
    return { mine, saved };
  }, [appointmentServiceId]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setNotMine(false);
    try {
      const snapshot = await fetchCase();
      if (!snapshot) {
        setNotMine(true);
        return;
      }
      const { mine, saved } = snapshot;
      setItem(mine);
      setRecord(saved);
      if (saved && typeof saved.petId === 'object') {
        setPet(saved.petId);
      } else {
        const petId = getQueueOrder(mine)?.petId;
        if (petId) {
          const history = await MedicalRecordService.getPetHistory(petId);
          setPet(history.pet);
        }
      }
      setFormKey(k => k + 1);
    } catch (err: unknown) {
      setLoadError(extractApiError(err, 'Không thể tải ca khám').message);
    } finally {
      setLoading(false);
    }
  }, [fetchCase]);

  // Unlike a full reload, this does not remount an editable form.
  const refreshAfterConflict = async () => {
    const snapshot = await fetchCase();
    if (!snapshot) {
      setNotMine(true);
      return;
    }
    const { mine, saved } = snapshot;
    setItem(mine);
    if (saved) setRecord(saved);
  };

  useEffect(() => {
    load();
  }, [load]);

  // Medicines and vaccines that can be prescribed (BR-16: Active only)
  useEffect(() => {
    Promise.all([
      ProductService.listProducts({
        category: 'Medicine',
        status: 'Active',
        limit: 100,
      }),
      ProductService.listProducts({
        category: 'Vaccine',
        status: 'Active',
        limit: 100,
      }),
    ])
      .then(([medicines, vaccines]) =>
        setProducts(
          [
            ...(medicines.data?.items || []),
            ...(vaccines.data?.items || []),
          ].filter(
            p =>
              p.status === 'Active' &&
              (p.category === 'Medicine' || p.category === 'Vaccine')
          )
        )
      )
      .catch(() => setProductsError(true));
  }, []);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res =
        await MedicalRecordService.startConsultation(appointmentServiceId);
      toast.success(
        res.releasedCageAssignment
          ? 'Đã bắt đầu khám. Bé đã được đưa ra khỏi chuồng chờ.'
          : 'Đã bắt đầu ca khám'
      );
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Không thể bắt đầu ca khám').message);
    } finally {
      setStarting(false);
      load();
    }
  };

  const backToQueue = (
    <Button
      key="back"
      icon={<ArrowLeftOutlined />}
      onClick={() => navigate(ROUTER.STAFF_QUEUE)}
    >
      Về hàng đợi
    </Button>
  );

  if (loading && !item) {
    return (
      <PageWrapper>
        <Card>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </PageWrapper>
    );
  }

  if (loadError) {
    return (
      <PageWrapper>
        <Result
          status="error"
          title="Không thể tải ca khám"
          subTitle={loadError}
          extra={[
            <Button key="retry" type="primary" onClick={load}>
              Thử lại
            </Button>,
            backToQueue,
          ]}
        />
      </PageWrapper>
    );
  }

  if (notMine || !item) {
    return (
      <PageWrapper>
        <Result
          status="404"
          title="Không tìm thấy ca khám"
          subTitle="Ca này không có trong hàng đợi của bạn. Lễ tân có thể đã phân công cho bác sĩ khác."
          extra={backToQueue}
        />
      </PageWrapper>
    );
  }

  const order = getQueueOrder(item);
  const recordOrderRef = record ? getRecordServiceRef(record)?.orderId : null;
  const recordOrder =
    typeof recordOrderRef === 'object' ? recordOrderRef : null;
  const intake =
    readReceptionIntake(recordOrder?.intake) ??
    readReceptionIntake(order?.intake);
  const appointmentNote = recordOrder?.note ?? order?.note;
  const status = item.status as AppointmentServiceStatus;
  const examAction = getExamAction(item, role);
  const renderBody = () => {
    if (record && isMedicalRecordLocked(record)) {
      return (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Bệnh án đã khóa sau khi thanh toán (BR-14), chỉ xem được."
          />
          <MedicalRecordView record={record} />
        </>
      );
    }
    if (status === 'Booked') {
      return (
        <Alert
          type="info"
          showIcon
          message="Khách chưa check-in"
          description="Ca khám mở được khi lễ tân tiếp nhận khách tại quầy."
        />
      );
    }
    if (status === 'Waiting') {
      return (
        <Alert
          type="info"
          showIcon
          message="Ca khám chưa bắt đầu"
          description="Bắt đầu khám sẽ đưa bé ra khỏi chuồng chờ (nếu có) và mở bệnh án nháp."
          action={
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={starting}
              onClick={start}
            >
              Bắt đầu khám
            </Button>
          }
        />
      );
    }
    if (status === 'InProgress' || status === 'Done') {
      return (
        <SoapForm
          key={formKey}
          appointmentServiceId={appointmentServiceId}
          record={record}
          petWeight={pet?.weight}
          products={products}
          productsError={productsError}
          serviceStatus={status}
          onSaved={saved => {
            setRecord(saved);
            if (saved && typeof saved.petId === 'object') setPet(saved.petId);
          }}
          onCompleted={result => {
            const saved = result.medicalRecord;
            setRecord(saved);
            if (typeof saved.petId === 'object') setPet(saved.petId);
            setItem(prev => {
              if (!prev) return prev;
              const orderRef = getQueueOrder(prev);
              return {
                ...prev,
                status: result.appointmentService.status,
                orderId:
                  orderRef && result.appointmentOrder
                    ? {
                        ...orderRef,
                        derivedStatus: result.appointmentOrder.derivedStatus,
                      }
                    : prev.orderId,
              };
            });
            if (result.appointmentOrder?.derivedStatus === 'WaitOwner') {
              toast.info(
                'Mọi dịch vụ của lịch hẹn đã xong: lịch chuyển sang Chờ chủ đón.'
              );
            }
          }}
          onConflict={refreshAfterConflict}
        />
      );
    }
    // Cancelled or Overdue: nothing to do but read what was written
    return record ? (
      <MedicalRecordView record={record} />
    ) : (
      <Alert
        type="warning"
        showIcon
        message={`Ca khám ở trạng thái "${getAppointmentServiceStatusLabel(status)}", không ghi được bệnh án.`}
      />
    );
  };

  return (
    <ExamPageWrapper>
      <Card>
        <PageHeader>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Khám bệnh · {getAppointmentServiceName(item.serviceId)}
            </Title>
            <Space wrap size={6} style={{ marginTop: 6 }}>
              {order && <Tag color="blue">{order.code}</Tag>}
              {order && <Tag>{dayjs(order.date).format('DD/MM/YYYY')}</Tag>}
              {item.isEmergency && <Tag color="red">Cấp cứu</Tag>}
              <Tag color={getAppointmentServiceStatusColor(status)}>
                {getAppointmentServiceStatusLabel(status)}
              </Tag>
              {order && (
                <Text type="secondary">
                  Lịch hẹn: {getAppointmentStatusLabel(order.derivedStatus)}
                </Text>
              )}
            </Space>
          </div>
          <Space wrap>
            {backToQueue}
            {(examAction === 'continue' || examAction === 'view') && (
              <Button onClick={() => setSubtasksOpen(true)}>
                Cận lâm sàng
              </Button>
            )}
            <Button
              icon={<HistoryOutlined />}
              disabled={!pet}
              onClick={() => setHistoryOpen(true)}
            >
              Tiền sử bệnh
            </Button>
          </Space>
        </PageHeader>

        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2, lg: 4 }}
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="Thú cưng">
            <Text strong>{pet?.name || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Mã thú cưng">
            {pet?.code || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Loài, giống, cân nặng">
            {pet ? describeWalkInPet(pet) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú lịch hẹn">
            {appointmentNote || <Text type="secondary">Không có</Text>}
          </Descriptions.Item>
        </Descriptions>

        {intake && (
          <div style={{ marginBottom: 16 }}>
            <ReceptionIntakeDetails intake={intake} />
          </div>
        )}
        {renderBody()}
      </Card>

      {subtasksOpen && (examAction === 'continue' || examAction === 'view') && (
        <ServiceSubtasksModal
          serviceId={appointmentServiceId}
          requesterId={user?._id}
          canCreate={
            examAction === 'continue' &&
            Boolean(user?._id) &&
            !isMedicalRecordLocked(record)
          }
          onClose={() => setSubtasksOpen(false)}
        />
      )}
      <Drawer
        title={`Tiền sử bệnh${pet ? ` · ${pet.name}` : ''}`}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        width={560}
        destroyOnHidden
      >
        {pet && (
          <PetMedicalHistory
            petId={pet._id}
            currentServiceId={appointmentServiceId}
          />
        )}
      </Drawer>
    </ExamPageWrapper>
  );
};

export default ExamRecordPage;
