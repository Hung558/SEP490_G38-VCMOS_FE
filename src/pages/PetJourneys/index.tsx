import { useCallback, useState } from 'react';
import {
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import styled from 'styled-components';
import PageTitle from '@/components/common/PageTitle';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { isUserPetOwner } from '@/services/AppointmentServiceService';
import { STORAGE, storage } from '@/lib/storage';
import { PetProfileWrapper } from '@/pages/PetProfile/components/styles';
import { getJourneyLink } from '@/pages/Dashboard/dashboardTabs';
import PetFormModal from '@/pages/Dashboard/components/PetFormModal';
import ROUTER from '@/routerMap/ROUTER';
import JourneyDetail from './components/JourneyDetail';
import OwnerJourneys from './components/OwnerJourneys';

const PageWrapper = styled.div`
  padding: 32px 28px;
  max-width: 1240px;
  margin: 0 auto;

  @media (max-width: 640px) {
    padding: 20px 16px;
  }
`;

/**
 * The owner's sidebar page (26/11): the pets on top, the chosen pet's journey
 * below. ?pet= is the pet shown, so a link or a reload opens the same one.
 */
const OwnerJourneysPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [petFormOpen, setPetFormOpen] = useState(false);

  const selectPet = useCallback(
    (petId: string) =>
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set('pet', petId);
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  return (
    <PageWrapper>
      <PageTitle style={{ marginBottom: 20 }}>Hành trình của bé</PageTitle>
      <OwnerJourneys
        petId={searchParams.get('pet')}
        revision={revision}
        onSelectPet={selectPet}
        onAddPet={() => setPetFormOpen(true)}
      />
      <PetFormModal
        open={petFormOpen}
        editingPet={null}
        onCancel={() => setPetFormOpen(false)}
        onSuccess={pet => {
          setRevision(n => n + 1);
          if (pet?._id) selectPet(pet._id);
        }}
      />
    </PageWrapper>
  );
};

const PetJourneysPage = () => {
  const { petId } = useParams<{ petId: string }>();
  const { hash } = useLocation();
  const { user } = useAuth();
  const viewer =
    user || storage.getLocalStorage<{ role?: string }>(STORAGE.USER_INFO);
  if (isUserPetOwner(viewer)) {
    // Old /pet-journeys/:petId links (pet profile, shared links) open the
    // same pet on the owner's page
    if (petId) return <Navigate to={getJourneyLink(petId, hash)} replace />;
    return <OwnerJourneysPage />;
  }
  // The pet list is the owners' page; vets and groomers open one pet
  if (!petId) return <Navigate to={ROUTER.HOME} replace />;
  return (
    <PetProfileWrapper
      key={JSON.stringify([user?._id, user?.role, user?.systemRole, petId])}
    >
      <JourneyDetail petId={petId} />
    </PetProfileWrapper>
  );
};
export default PetJourneysPage;
