import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { isUserPetOwner } from '@/services/AppointmentServiceService';
import { STORAGE, storage } from '@/lib/storage';
import { PetProfileWrapper } from '@/pages/PetProfile/components/styles';
import { getJourneyLink } from '@/pages/Dashboard/dashboardTabs';
import ROUTER from '@/routerMap/ROUTER';
import JourneyDetail from './components/JourneyDetail';

const PetJourneysPage = () => {
  const { petId } = useParams<{ petId: string }>();
  const { hash } = useLocation();
  const { user } = useAuth();
  const viewer =
    user || storage.getLocalStorage<{ role?: string }>(STORAGE.USER_INFO);
  // 24/11: owners read journeys in the dashboard tab; old links land there
  if (isUserPetOwner(viewer)) {
    return <Navigate to={getJourneyLink(petId, hash)} replace />;
  }
  // The pet list was the owners' page; vets and groomers open one pet
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
