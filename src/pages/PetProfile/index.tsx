import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Result, Skeleton } from 'antd';
import { toast } from 'sonner';
import PetService from '@/services/PetService';
import ROUTER from '@/routerMap/ROUTER';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { getRoleGroup } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import type { Pet, PetAppointmentNote } from '@/types';
import PetFormModal from '@/pages/Dashboard/components/PetFormModal';
import DeletePetModal from '@/pages/Dashboard/components/DeletePetModal';
import PetProfileView from './components/PetProfileView';
import PetTimelineSection from './components/PetTimelineSection';
import PetVisitTimeline from './components/PetVisitTimeline';
import { getBookingLink } from '@/pages/Dashboard/dashboardTabs';
import { PetProfileWrapper } from './components/styles';

type LoadState = 'loading' | 'ready' | 'notFound' | 'error';

/**
 * SCR-08: full profile page of one pet. The owner opens it from the dashboard
 * and can edit it; vets and groomers open it from their queue to read the
 * timeline and past records only (nghiệp vụ 5, 6).
 */
const PetProfilePage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const storedUser = storage.getLocalStorage<{
    role?: string;
    systemRole?: string;
  }>(STORAGE.USER_INFO);
  const isOwner =
    getRoleGroup(
      user?.role ||
        user?.systemRole ||
        storedUser?.role ||
        storedUser?.systemRole
    ) === 'owner';
  const [pet, setPet] = useState<Pet | null>(null);
  const [visits, setVisits] = useState<PetAppointmentNote[]>();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);

  const fetchPet = useCallback(async () => {
    if (!petId) {
      setLoadState('notFound');
      return;
    }
    try {
      setLoadState('loading');
      const res = await PetService.getPetById(petId);
      setPet(res.pet);
      setVisits(res.appointmentNotes || []);
      setLoadState('ready');
    } catch (error: any) {
      const status = error?.response?.status;
      // 400 = malformed id, 404 = no such pet or a pet of another owner
      setLoadState(status === 400 || status === 404 ? 'notFound' : 'error');
    }
  }, [petId]);

  useEffect(() => {
    fetchPet();
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
        />
      ) : (
        <PetProfileView pet={pet} />
      )}

      <PetVisitTimeline
        key={pet._id}
        petId={pet._id}
        initialNotes={visits}
        ownerView={isOwner}
      />

      <PetTimelineSection petId={pet._id} />

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
        </>
      )}
    </PetProfileWrapper>
  );
};

export default PetProfilePage;
