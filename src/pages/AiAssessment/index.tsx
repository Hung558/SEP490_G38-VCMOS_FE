import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from 'sonner';
import PageTitle from '@/components/common/PageTitle';
import AiAssessmentSection from '@/pages/Dashboard/components/AiAssessmentSection';
import PetFormModal from '@/pages/Dashboard/components/PetFormModal';
import { getBookingLink } from '@/pages/Dashboard/dashboardTabs';

const PageWrapper = styled.div`
  padding: 32px 28px;
  max-width: 1240px;
  margin: 0 auto;

  @media (max-width: 640px) {
    padding: 20px 16px;
  }
`;

/**
 * SCR-10 Tính năng AI (24/11): its own sidebar page instead of a dashboard
 * tab. "Đặt lịch" carries the pet, the AI note and the service to the
 * booking form of the dashboard.
 */
const AiAssessmentPage = () => {
  const navigate = useNavigate();
  const [petFormOpen, setPetFormOpen] = useState(false);
  // Bumped after a pet is added here, so the section reloads its pet list
  const [petsVersion, setPetsVersion] = useState(0);

  return (
    <PageWrapper>
      <PageTitle style={{ marginBottom: 20 }}>Tính năng AI</PageTitle>
      <AiAssessmentSection
        petsVersion={petsVersion}
        onAddNewPet={() => setPetFormOpen(true)}
        onBookAppointment={({ petId, note, serviceId }) => {
          toast.info('Đã chuyển kết quả đánh giá AI sang form đặt lịch khám');
          navigate(getBookingLink(petId, serviceId), {
            state: { bookingNote: note || undefined },
          });
        }}
      />
      <PetFormModal
        open={petFormOpen}
        editingPet={null}
        onCancel={() => setPetFormOpen(false)}
        onSuccess={() => setPetsVersion(version => version + 1)}
      />
    </PageWrapper>
  );
};

export default AiAssessmentPage;
