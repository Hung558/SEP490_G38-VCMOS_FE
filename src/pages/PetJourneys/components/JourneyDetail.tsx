import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Collapse,
  Result,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  IdcardOutlined,
  ReadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import PetService from '@/services/PetService';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { isUserPetOwner } from '@/services/AppointmentServiceService';
import PetTimeline from '@/pages/PetProfile/components/PetTimeline';
import PetInpatientLogs from '@/pages/PetProfile/components/PetInpatientLogs';
import ShareTimelineModal from '@/pages/PetProfile/components/ShareTimelineModal';
import { feedTabToParam } from '@/services/CommunityService';
import { PET_INPATIENT_LOGS_HASH } from '@/pages/PetProfile/components/inpatientLogsSection';
import ROUTER from '@/routerMap/ROUTER';
import PageTitle from '@/components/common/PageTitle';
import type { Pet } from '@/types';

/**
 * One pet's journey. `embedded`: inside the owner dashboard tab, under the
 * page's own title, where the owner picks the pet above it.
 */
const JourneyDetail = ({
  petId,
  embedded = false,
}: {
  petId: string;
  embedded?: boolean;
}) => {
  const { user } = useAuth();
  const { hash } = useLocation();
  const owner = isUserPetOwner(user);
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState<'notFound' | 'error' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [timelineVersion, setTimelineVersion] = useState(0);
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
  const profileLink = (
    <Link to={generatePath(ROUTER.PET_PROFILE, { petId })}>
      <Button icon={<IdcardOutlined />}>Hồ sơ của {pet.name}</Button>
    </Link>
  );
  const actions = (
    <Space wrap>
      {profileLink}
      {owner && pet.status === 'Active' && (
        <Button
          type="primary"
          icon={<ShareAltOutlined />}
          onClick={() => setShareOpen(true)}
        >
          Chia sẻ hành trình
        </Button>
      )}
    </Space>
  );
  return (
    <>
      {embedded ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Typography.Title
            level={2}
            style={{ fontSize: 22, margin: 0, color: '#0f172a' }}
          >
            Hành trình của {pet.name}
          </Typography.Title>
          {actions}
        </div>
      ) : (
        <>
          <Space wrap style={{ marginBottom: 16 }}>
            {actions}
          </Space>
          <PageTitle style={{ marginBottom: 8 }}>
            Hành trình của {pet.name}
          </PageTitle>
        </>
      )}
      <Space wrap style={{ marginBottom: 24, color: '#475569' }}>
        <span>{pet.code}</span>
        <span>{[pet.species, pet.breed].filter(Boolean).join(' · ')}</span>
        {pet.status === 'Deleted' && <Tag>Đã lưu trữ</Tag>}
        {!owner && <Tag color="blue">Chỉ xem</Tag>}
      </Space>
      {owner && shared && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="Đã gửi hành trình lên cộng đồng, đang chờ duyệt"
          description={
            <Space direction="vertical" size={4}>
              <span>
                Sau khi được quản trị viên duyệt, bài sẽ xuất hiện trong mục
                Hành trình được chia sẻ.
              </span>
              <Space wrap>
                <Link to={ROUTER.MY_COMMUNITY_POSTS}>
                  Theo dõi bài viết của tôi
                </Link>
                <Link
                  to={`${ROUTER.COMMUNITY}?tab=${feedTabToParam('TimelineShare')}`}
                >
                  Xem hành trình được chia sẻ
                </Link>
              </Space>
            </Space>
          }
        />
      )}
      <PetTimeline
        key={timelineVersion}
        petId={petId}
        invoiceRole={user?.role || user?.systemRole}
        sharedPostsVisible={owner}
        aiAssessmentsVisible={owner}
      />
      {owner && pet.status === 'Active' && (
        <ShareTimelineModal
          open={shareOpen}
          petId={petId}
          petName={pet.name}
          onClose={() => setShareOpen(false)}
          onShared={() => {
            setShared(true);
            setTimelineVersion(value => value + 1);
          }}
        />
      )}
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
