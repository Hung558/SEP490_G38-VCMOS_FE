import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Alert, Button, Skeleton, Tag } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import PetService from '@/services/PetService';
import PetTimelineService, {
  type PetTimelineMilestone,
} from '@/services/PetTimelineService';
import {
  getAppointmentStatusColor,
  getVietnamTodayString,
} from '@/services/AppointmentOrderService';
import type { Pet } from '@/types';
import { getSpeciesEmoji } from './PetDetailModal';
import {
  RECENT_VISITS,
  formatVisitDate,
  formatVisitTime,
  getVisitServiceNames,
  pickRecentVisits,
  pickTodayVisits,
} from './petVisits';

const Section = styled.section`
  margin-bottom: 24px;

  h2 {
    margin: 0 0 14px;
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
  }

  .pet-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 16px;
  }

  .pet-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 18px 20px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);

    &.has-today {
      border-color: #99f6e4;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.08);
    }
  }

  .pet-head {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;

    .avatar {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .name {
      flex: 1;
      min-width: 0;

      strong {
        display: block;
        font-size: 15px;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      span {
        font-size: 12px;
        color: #0d9488;
        font-family: monospace;
      }
    }

    .journey-btn {
      flex-shrink: 0;
      padding: 0;
      height: auto;
      font-size: 13px;
      font-weight: 600;
      color: #0f766e;
    }
  }

  .group-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: #64748b;

    &.today {
      color: #0f766e;
    }
  }

  .no-today {
    font-size: 13px;
    color: #64748b;
  }

  .visit-list {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .visit {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    background: #f8fafc;
    border: 1px solid #eef2f6;
    border-radius: 10px;

    &.today {
      background: #f0fdfa;
      border-color: #ccfbf1;
    }

    .visit-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      font-weight: 700;
      color: #0f172a;

      .ant-tag {
        margin-inline-end: 0;
      }
    }

    .visit-when {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .visit-services {
      font-size: 13px;
      color: #334155;
      overflow-wrap: anywhere;
    }

    .visit-code {
      font-size: 12px;
      color: #64748b;
    }
  }

  .empty {
    font-size: 13px;
    color: #94a3b8;
  }
`;

interface PetVisits {
  pet: Pet;
  today: PetTimelineMilestone[];
  recent: PetTimelineMilestone[];
  failed?: boolean;
}

const loadPetVisits = async (
  pet: Pet,
  today: string,
  signal: AbortSignal
): Promise<PetVisits> => {
  try {
    const todayPage = await PetTimelineService.listPetTimeline(
      pet._id,
      { from: today, to: today, limit: 10 },
      signal
    );
    const todayVisits = pickTodayVisits(todayPage.timeline, today);
    if (todayVisits.length) return { pet, today: todayVisits, recent: [] };
    const donePage = await PetTimelineService.listPetTimeline(
      pet._id,
      { status: 'Done', to: today, limit: RECENT_VISITS },
      signal
    );
    return {
      pet,
      today: [],
      recent: pickRecentVisits(donePage.timeline, today),
    };
  } catch {
    return { pet, today: [], recent: [], failed: true };
  }
};

const VisitItem = ({
  visit,
  isToday,
}: {
  visit: PetTimelineMilestone;
  isToday: boolean;
}) => {
  const services = getVisitServiceNames(visit);
  const time = formatVisitTime(visit);
  return (
    <li className={isToday ? 'visit today' : 'visit'}>
      <div className="visit-top">
        <span className="visit-when">
          {isToday ? <ClockCircleOutlined /> : <CalendarOutlined />}
          {isToday ? time || 'Chưa có giờ hẹn' : formatVisitDate(visit.date)}
        </span>
        <Tag color={getAppointmentStatusColor(visit.derivedStatus)}>
          {visit.statusLabel}
        </Tag>
      </div>
      <div className="visit-services">
        {services.length ? services.join(' · ') : 'Chưa có dịch vụ'}
      </div>
      <div className="visit-code">{visit.code}</div>
    </li>
  );
};

/**
 * Owner dashboard (24/11): one card per active pet with its visits of today,
 * or its latest finished visits when it has none today.
 */
const PetVisitsOverview = ({
  revision,
  onOpenJourney,
}: {
  revision: number;
  /** Opens the pet in the dashboard's "Hành trình của bé" tab */
  onOpenJourney: (petId: string) => void;
}) => {
  const [rows, setRows] = useState<PetVisits[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const today = getVietnamTodayString();

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    PetService.listPets({ status: 'Active', page: 1, limit: 100 })
      .then(res =>
        Promise.all(
          (res.items || []).map(pet =>
            loadPetVisits(pet, today, controller.signal)
          )
        )
      )
      .then(result => {
        if (controller.signal.aborted) return;
        // Pets seen at the clinic today come first
        setRows(
          [...result].sort(
            (a, b) => Number(b.today.length > 0) - Number(a.today.length > 0)
          )
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [revision, attempt, today]);

  if (failed) {
    return (
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 24 }}
        message="Không tải được lịch hẹn của các bé"
        action={
          <Button size="small" onClick={() => setAttempt(n => n + 1)}>
            Thử lại
          </Button>
        }
      />
    );
  }
  // No pet yet: the pet tab below explains how to add one
  if (rows && rows.length === 0) return null;

  return (
    <Section aria-labelledby="pet-visits-title">
      <h2 id="pet-visits-title">Lịch hẹn của các bé</h2>
      {rows === null ? (
        <div className="pet-grid">
          {[0, 1].map(key => (
            <div className="pet-card" key={key}>
              <Skeleton active avatar paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="pet-grid">
          {rows.map(
            ({ pet, today: todayVisits, recent, failed: petFailed }) => (
              <article
                key={pet._id}
                className={
                  todayVisits.length ? 'pet-card has-today' : 'pet-card'
                }
                aria-label={`Bé ${pet.name}`}
              >
                <div className="pet-head">
                  <span className="avatar" aria-hidden="true">
                    {pet.photoUrl ? (
                      <img src={pet.photoUrl} alt="" />
                    ) : (
                      getSpeciesEmoji(pet.species)
                    )}
                  </span>
                  <div className="name">
                    <strong>Bé {pet.name}</strong>
                    <span>{pet.code}</span>
                  </div>
                  <Button
                    type="link"
                    className="journey-btn"
                    aria-label={`Hành trình của bé ${pet.name}`}
                    onClick={() => onOpenJourney(pet._id)}
                  >
                    Hành trình
                  </Button>
                </div>

                {petFailed ? (
                  <div className="empty">Không tải được lịch của bé.</div>
                ) : todayVisits.length ? (
                  <>
                    <div className="group-label today">
                      Hôm nay · {formatVisitDate(today)}
                    </div>
                    <ul className="visit-list">
                      {todayVisits.map(visit => (
                        <VisitItem key={visit.id} visit={visit} isToday />
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="no-today">Chưa có lịch hẹn hôm nay</div>
                    <div className="group-label">Lịch sử khám gần đây</div>
                    {recent.length ? (
                      <ul className="visit-list">
                        {recent.map(visit => (
                          <VisitItem
                            key={visit.id}
                            visit={visit}
                            isToday={false}
                          />
                        ))}
                      </ul>
                    ) : (
                      <div className="empty">Chưa có lần khám nào.</div>
                    )}
                  </>
                )}
              </article>
            )
          )}
        </div>
      )}
    </Section>
  );
};

export default PetVisitsOverview;
