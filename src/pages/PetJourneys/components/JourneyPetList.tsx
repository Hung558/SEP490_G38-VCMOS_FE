import { useEffect, useState } from 'react';
import { Link, generatePath } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Pagination,
  Skeleton,
  Tag,
  Typography,
} from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import PetService from '@/services/PetService';
import { getSafeTimelineHttpUrl } from '@/services/PetTimelineService';
import { getSpeciesEmoji } from '@/pages/Dashboard/components/PetDetailModal';
import ROUTER from '@/routerMap/ROUTER';
import type { Pet } from '@/types';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0;
  .ant-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    border-color: #cbd5e1;
    border-radius: 12px;
  }
  .ant-card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .pet-identity {
    flex: 1;
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 20px;
  }
  h2 {
    font-size: 20px;
    color: #0f172a;
    margin: 0 0 6px;
  }
  p {
    color: #475569;
    margin: 0 0 4px;
  }
  .journey-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: auto;
    min-height: 32px;
    padding: 4px 15px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    background: #fff;
    color: rgba(0, 0, 0, 0.88);
    font-size: 14px;
    text-align: center;
    text-decoration: none;
    transition:
      color 0.2s,
      border-color 0.2s;

    &:hover {
      color: #4096ff;
      border-color: #4096ff;
    }

    &:focus-visible {
      outline: 2px solid #1677ff;
      outline-offset: 2px;
    }
  }
`;
const PAGE_SIZE = 12;
const JourneyPetList = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let ignored = false;
    setLoading(true);
    setError(false);
    void PetService.listPets({ status: 'All', page, limit: PAGE_SIZE })
      .then(result => {
        if (ignored) return;
        const last = Math.max(1, result.totalPages);
        if (page > last) {
          setPage(last);
          return;
        }
        setPets(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        if (!ignored) setError(true);
      })
      .finally(() => {
        if (!ignored) setLoading(false);
      });
    return () => {
      ignored = true;
    };
  }, [page, attempt]);
  return (
    <>
      <Typography.Title
        level={1}
        style={{ fontSize: 26, margin: '0 0 8px', color: '#0f172a' }}
      >
        Hành trình của bé
      </Typography.Title>
      <Typography.Paragraph style={{ color: '#475569' }}>
        Chọn một bé để xem các mốc khám bệnh và chăm sóc.
      </Typography.Paragraph>
      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : error ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách thú cưng"
          action={
            <Button onClick={() => setAttempt(value => value + 1)}>
              Thử lại
            </Button>
          }
        />
      ) : !pets.length ? (
        <Empty description="Bạn chưa có hồ sơ thú cưng nào">
          <Link to={ROUTER.DASHBOARD}>Quản lý thú cưng</Link>
        </Empty>
      ) : (
        <>
          <Grid>
            {pets.map(pet => (
              <Card key={pet._id}>
                <div className="pet-identity">
                  <Avatar
                    size={72}
                    shape="square"
                    src={getSafeTimelineHttpUrl(pet.photoUrl)}
                    style={{
                      background: '#f0fdfa',
                      color: '#115e59',
                      fontSize: 30,
                    }}
                  >
                    {getSpeciesEmoji(pet.species)}
                  </Avatar>
                  <div>
                    <h2>{pet.name}</h2>
                    <p>
                      {[pet.species, pet.breed].filter(Boolean).join(' · ') ||
                        'Thú cưng'}
                    </p>
                    <p>{pet.code}</p>
                    {pet.status === 'Deleted' && <Tag>Đã lưu trữ</Tag>}
                  </div>
                </div>
                <Link
                  className="journey-action"
                  to={generatePath(ROUTER.PET_JOURNEY, { petId: pet._id })}
                >
                  <ArrowRightOutlined aria-hidden="true" />
                  <span>Xem hành trình của {pet.name}</span>
                </Link>
              </Card>
            ))}
          </Grid>
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setPage}
            showSizeChanger={false}
          />
        </>
      )}
    </>
  );
};
export default JourneyPetList;
