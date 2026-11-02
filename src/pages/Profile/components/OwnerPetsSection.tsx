import React, { useEffect, useState } from 'react';
import { Button, Empty, Skeleton } from 'antd';
import { AppstoreOutlined, PlusOutlined } from '@ant-design/icons';
import { generatePath, useNavigate } from 'react-router-dom';
import PetService from '@/services/PetService';
import ROUTER from '@/routerMap/ROUTER';
import type { Pet } from '@/types';
import { getSpeciesEmoji } from '@/pages/Dashboard/components/PetDetailModal';
import { SectionCard } from './styles';

/** Pet owner: the owner's pets, each card opening the pet profile page (SCR-08) */
const OwnerPetsSection: React.FC = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PetService.listPets({ status: 'Active', limit: 100 })
      .then(res => setPets(res.items || []))
      .catch(err => console.error('Fetch pets error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SectionCard>
      <div className="section-header">
        <div>
          <h4>Thú cưng của tôi</h4>
          <div className="section-desc">
            Bấm vào một bé để xem hồ sơ đầy đủ.
          </div>
        </div>
        <Button
          icon={<AppstoreOutlined />}
          onClick={() => navigate(ROUTER.DASHBOARD)}
        >
          Quản lý thú cưng
        </Button>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : pets.length === 0 ? (
        <Empty description="Bạn chưa có hồ sơ thú cưng nào">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#0d9488', borderColor: '#0d9488' }}
            onClick={() => navigate(ROUTER.DASHBOARD)}
          >
            Đăng ký thú cưng tại Bảng điều khiển
          </Button>
        </Empty>
      ) : (
        <div className="pet-grid">
          {pets.map(pet => (
            <button
              type="button"
              className="pet-card"
              key={pet._id}
              onClick={() =>
                navigate(generatePath(ROUTER.PET_PROFILE, { petId: pet._id }))
              }
            >
              {pet.photoUrl ? (
                <img src={pet.photoUrl} alt={pet.name} className="pet-photo" />
              ) : (
                <div className="pet-avatar">{getSpeciesEmoji(pet.species)}</div>
              )}
              <div className="pet-meta">
                <div className="pet-name">{pet.name}</div>
                <div className="pet-sub">
                  {pet.species || 'Thú cưng'}
                  {pet.weight !== null && pet.weight !== undefined
                    ? ` · ${pet.weight} kg`
                    : ''}
                </div>
                <div className="pet-code">{pet.code}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

export default OwnerPetsSection;
