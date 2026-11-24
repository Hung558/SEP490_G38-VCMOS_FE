import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Navigate,
  generatePath,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Button, Result, Skeleton } from 'antd';
import { toast } from 'sonner';
import PetService from '@/services/PetService';
import ROUTER from '@/routerMap/ROUTER';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { isUserPetOwner } from '@/services/AppointmentServiceService';
import type { Pet } from '@/types';
import PetFormModal from '@/pages/Dashboard/components/PetFormModal';
import DeletePetModal from '@/pages/Dashboard/components/DeletePetModal';
import PetProfileView from './components/PetProfileView';
import PetJourneySummary from './components/PetJourneySummary';
import { PET_INPATIENT_LOGS_HASH } from './components/inpatientLogsSection';
import ShareTimelineModal from './components/ShareTimelineModal';
import { getBookingLink } from '@/pages/Dashboard/dashboardTabs';
import { PetProfileWrapper } from './components/styles';

type LoadState = 'loading' | 'ready' | 'notFound' | 'error';

/**
 * SCR-08: full profile page of one pet. The owner opens it from the dashboard
 * and can edit it; vets and groomers open it from their queue to read the
 * timeline and past records only (nghiệp vụ 5, 6).
 */
const PetProfile: React.FC<{ petId?: string }> = ({ petId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // AuthProvider already initializes from storage. Never revive a previous
  // account's privileged role from storage after logout or a context change.
  const effectiveRole = user?.role || user?.systemRole;
  const isOwner = isUserPetOwner(user);
  const [pet, setPet] = useState<Pet | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  // Refresh the compact summary after an owner shares this pet.
  const [timelineVersion, setTimelineVersion] = useState(0);
  const requestVersion = useRef(0);

  const fetchPet = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!petId) {
      setLoadState('notFound');
      return;
    }
    try {
      setLoadState('loading');
      const res = await PetService.getPetById(petId);
      if (version !== requestVersion.current) return;
      setPet(res.pet);
      setLoadState('ready');
    } catch (error: any) {
      if (version !== requestVersion.current) return;
      const status = error?.response?.status;
      // 400 = malformed id, 404 = no such pet or a pet of another owner
      setLoadState(status === 400 || status === 404 ? 'notFound' : 'error');
    }
  }, [petId]);

  useEffect(() => {
    void fetchPet();
    return () => {
      requestVersion.current += 1;
    };
  }, [fetchPet]);

  // Called by DeletePetModal once the owner has typed the pet's name
  const handleDeletePet = async (target: Pet) => {
    await PetService.deletePet(target._id);
    toast.success(`Đã xóa hồ sơ bé ${target.name}`);
    setPetToDelete(null);
    navigate(ROUTER.DASHBOARD);
  };

  const backToDashboard = isOwner ? (
    <Button key="dashboard" onClick={() => navigate(ROUTER.DASHBOARD)}>
      Về Bảng điều khiển
    </Button>
  ) : (
    <Button key="queue" onClick={() => navigate(ROUTER.STAFF_QUEUE)}>
      Về hàng đợi
    </Button>
  );

  if (loadState === 'loading') {
    return (
      <PetProfileWrapper>
        <div className="pet-hero">
          <Skeleton avatar={{ size: 120, shape: 'square' }} active />
        </div>
        <Skeleton active paragraph={{ rows: 6 }} />
      </PetProfileWrapper>
    );
  }

  if (loadState === 'error') {
    return (
      <PetProfileWrapper>
        <Result
          status="error"
          title="Không tải được hồ sơ thú cưng"
          subTitle="Vui lòng kiểm tra kết nối rồi thử lại."
          extra={[
            <Button key="retry" type="primary" onClick={fetchPet}>
              Thử lại
            </Button>,
            backToDashboard,
          ]}
        />
      </PetProfileWrapper>
    );
  }

  if (loadState === 'notFound' || !pet) {
    return (
      <PetProfileWrapper>
        <Result
          status="404"
          title="Không tìm thấy hồ sơ thú cưng"
          subTitle={
            isOwner
              ? 'Hồ sơ không tồn tại hoặc không thuộc tài khoản của bạn.'
              : 'Hồ sơ không tồn tại.'
          }
          extra={backToDashboard}
        />
      </PetProfileWrapper>
    );
  }

  return (
    <PetProfileWrapper>
      {isOwner ? (
        <PetProfileView
          pet={pet}
          onEdit={() => setIsFormOpen(true)}
          onDelete={() => setPetToDelete(pet)}
          onBookAppointment={() => navigate(getBookingLink(pet._id))}
          onShare={
            pet.status === 'Active' ? () => setIsShareOpen(true) : undefined
          }
        />
      ) : (
        <PetProfileView pet={pet} />
      )}

      <PetJourneySummary
        key={JSON.stringify([
          user?._id,
          effectiveRole,
          pet._id,
          timelineVersion,
        ])}
        petId={pet._id}
      />

      {isOwner && (
        <>
          <PetFormModal
            open={isFormOpen}
            onCancel={() => setIsFormOpen(false)}
            onSuccess={updated => setPet(updated)}
            editingPet={pet}
          />

          <DeletePetModal
            pet={petToDelete}
            onCancel={() => setPetToDelete(null)}
            onConfirm={handleDeletePet}
          />

          {pet.status === 'Active' && (
            <ShareTimelineModal
              open={isShareOpen}
              petId={pet._id}
              petName={pet.name}
              onClose={() => setIsShareOpen(false)}
              onShared={() => setTimelineVersion(value => value + 1)}
            />
          )}
        </>
      )}
    </PetProfileWrapper>
  );
};

const PetProfilePage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const { hash } = useLocation();
  const { user } = useAuth();
  if (petId && hash === PET_INPATIENT_LOGS_HASH) {
    return (
      <Navigate
        replace
        to={generatePath(ROUTER.PET_JOURNEY, { petId }) + hash}
      />
    );
  }
  // Route or account changes must never display the previous pet's records.
  return (
    <PetProfile
      key={JSON.stringify([user?._id, user?.role, user?.systemRole, petId])}
      petId={petId}
    />
  );
};

export default PetProfilePage;
