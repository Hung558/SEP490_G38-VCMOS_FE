import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { PetProfileWrapper } from '@/pages/PetProfile/components/styles';
import JourneyPetList from './components/JourneyPetList';
import JourneyDetail from './components/JourneyDetail';

const PetJourneysPage = () => {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  return (
    <PetProfileWrapper
      key={JSON.stringify([user?._id, user?.role, user?.systemRole, petId])}
    >
      {petId ? <JourneyDetail petId={petId} /> : <JourneyPetList />}
    </PetProfileWrapper>
  );
};
export default PetJourneysPage;
