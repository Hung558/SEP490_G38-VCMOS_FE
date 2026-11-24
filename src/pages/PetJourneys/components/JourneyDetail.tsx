import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation } from 'react-router-dom';
import {
  Button,
  Collapse,
  Result,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  IdcardOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import PetService from '@/services/PetService';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { isUserPetOwner } from '@/services/AppointmentServiceService';
import PetTimeline from '@/pages/PetProfile/components/PetTimeline';
import PetInpatientLogs from '@/pages/PetProfile/components/PetInpatientLogs';
import { PET_INPATIENT_LOGS_HASH } from '@/pages/PetProfile/components/inpatientLogsSection';
import ROUTER from '@/routerMap/ROUTER';
import type { Pet } from '@/types';

const JourneyDetail = ({ petId }: { petId: string }) => {
  const { user } = useAuth();
  const { hash } = useLocation();
  const owner = isUserPetOwner(user);
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState<'notFound' | 'error' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [logsOpen, setLogsOpen] = useState<string[]>(
    hash === PET_INPATIENT_LOGS_HASH ? ['logs'] : []
  );
  useEffect(() => {
    if (hash === PET_INPATIENT_LOGS_HASH) setLogsOpen(['logs']);
  }, [hash]);
  useEffect(() => {
    let ignored = false;
    setError(null);
    void PetService.getPetById(petId)
      .then(result => {
        if (!ignored) setPet(result.pet);
      })
      .catch(error => {
        if (!ignored)
          setError(
            [400, 403, 404].includes(error?.response?.status)
              ? 'notFound'
              : 'error'
          );
      });
    return () => {
      ignored = true;
    };
  }, [petId, attempt]);
  if (error)
    return (
      <Result
        status={error === 'notFound' ? '404' : 'error'}
        title={
          error === 'notFound'
            ? 'Không tìm thấy hành trình của bé'
            : 'Không tải được hồ sơ thú cưng'
        }
        subTitle="Hồ sơ không tồn tại, bạn chưa có quyền xem hoặc kết nối đang gián đoạn."
        extra={
          <Button onClick={() => setAttempt(value => value + 1)}>
            Thử lại
          </Button>
        }
      />
    );
  if (!pet) return <Skeleton active paragraph={{ rows: 6 }} />;
  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        {owner && (
          <Link to={ROUTER.PET_JOURNEYS}>
            <Button icon={<ArrowLeftOutlined />}>Chọn bé khác</Button>
          </Link>
        )}
        <Link to={generatePath(ROUTER.PET_PROFILE, { petId })}>
          <Button icon={<IdcardOutlined />}>Hồ sơ của {pet.name}</Button>
        </Link>
      </Space>
      <Typography.Title
        level={1}
        style={{ fontSize: 26, margin: '0 0 8px', color: '#0f172a' }}
      >
        Hành trình của {pet.name}
      </Typography.Title>
      <Space wrap style={{ marginBottom: 24, color: '#475569' }}>
        <span>{pet.code}</span>
        <span>{[pet.species, pet.breed].filter(Boolean).join(' · ')}</span>
        {pet.status === 'Deleted' && <Tag>Đã lưu trữ</Tag>}
        {!owner && <Tag color="blue">Chỉ xem</Tag>}
      </Space>
      <PetTimeline
        petId={petId}
        invoiceRole={user?.role || user?.systemRole}
        sharedPostsVisible={owner}
        aiAssessmentsVisible={owner}
      />
      {owner && pet.status === 'Active' && (
        <Collapse
          activeKey={logsOpen}
          onChange={keys =>
            setLogsOpen(typeof keys === 'string' ? [keys] : keys)
          }
          items={[
            {
              key: 'logs',
              label: (
                <Space>
                  <ReadOutlined />
                  Nhật ký nội trú theo ngày
                </Space>
              ),
              children: <PetInpatientLogs petId={petId} />,
            },
          ]}
        />
      )}
    </>
  );
};
export default JourneyDetail;
