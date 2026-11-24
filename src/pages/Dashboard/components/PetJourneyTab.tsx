import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Alert, Button, Empty, Skeleton } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PetService from '@/services/PetService';
import { getSafeTimelineHttpUrl } from '@/services/PetTimelineService';
import JourneyDetail from '@/pages/PetJourneys/components/JourneyDetail';
import { PetProfileWrapper } from '@/pages/PetProfile/components/styles';
import type { Pet } from '@/types';
import { getSpeciesEmoji } from './PetDetailModal';
import { pickJourneyPet, sortJourneyPets } from '../dashboardTabs';

const Picker = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;

  .pet-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 100%;
    padding: 6px 14px 6px 6px;
    font: inherit;
    color: #334155;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;

    &:hover {
      border-color: #5eead4;
    }

    &:focus-visible {
      outline: 2px solid #0d9488;
      outline-offset: 2px;
    }

    &[aria-pressed='true'] {
      color: #0f172a;
      background: #f0fdfa;
      border-color: #0d9488;
      box-shadow: 0 0 0 1px #0d9488 inset;

      .name {
        font-weight: 700;
      }
    }

    &.archived {
      opacity: 0.75;
    }
  }

  .avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    background: #ffffff;
    border: 1px solid #ccfbf1;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .name {
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .archived-label {
    flex-shrink: 0;
    font-size: 12px;
    color: #64748b;
  }
`;

// The journey parts take their look from the pet profile page styles, without
// that page's own padding and width
const JourneyBody = styled(PetProfileWrapper)`
  && {
    padding: 0;
    max-width: none;
  }
`;

/**
 * "Hành trình của bé" tab (24/11): pick a pet, read its journey right below,
 * no page change. Archived pets stay readable after the active ones.
 */
const PetJourneyTab = ({
  petId,
  revision,
  onSelectPet,
  onAddPet,
}: {
  petId?: string | null;
  revision: number;
  onSelectPet: (petId: string) => void;
  onAddPet: () => void;
}) => {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignored = false;
    setFailed(false);
    PetService.listPets({ status: 'All', page: 1, limit: 100 })
      .then(res => {
        if (!ignored) setPets(sortJourneyPets(res.items || []));
      })
      .catch(() => {
        if (!ignored) setFailed(true);
      });
    return () => {
      ignored = true;
    };
  }, [attempt, revision]);

  if (failed) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được danh sách thú cưng"
        action={
          <Button size="small" onClick={() => setAttempt(n => n + 1)}>
            Thử lại
          </Button>
        }
      />
    );
  }
  if (!pets) return <Skeleton active paragraph={{ rows: 6 }} />;
  const selected = pickJourneyPet(pets, petId);
  if (!selected) {
    return (
      <Empty description="Bạn chưa có hồ sơ thú cưng nào">
        <Button type="primary" icon={<PlusOutlined />} onClick={onAddPet}>
          Thêm thú cưng
        </Button>
      </Empty>
    );
  }

  return (
    <>
      <Picker role="group" aria-label="Chọn bé để xem hành trình">
        {pets.map(pet => {
          const photo = getSafeTimelineHttpUrl(pet.photoUrl);
          const archived = pet.status === 'Deleted';
          return (
            <button
              key={pet._id}
              type="button"
              className={archived ? 'pet-chip archived' : 'pet-chip'}
              aria-pressed={pet._id === selected._id}
              onClick={() => onSelectPet(pet._id)}
            >
              <span className="avatar" aria-hidden="true">
                {photo ? (
                  <img src={photo} alt="" />
                ) : (
                  getSpeciesEmoji(pet.species)
                )}
              </span>
              <span className="name">{pet.name}</span>
              {archived && <span className="archived-label">Đã lưu trữ</span>}
            </button>
          );
        })}
      </Picker>
      <JourneyBody key={selected._id}>
        <JourneyDetail petId={selected._id} embedded />
      </JourneyBody>
    </>
  );
};

export default PetJourneyTab;
