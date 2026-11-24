import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button, Spin } from 'antd';
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  ScissorOutlined,
} from '@ant-design/icons';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import StaffService from '@/services/StaffService';
import { getVietnamTodayString } from '@/services/AppointmentOrderService/helpers';
import type { ClinicalStaffRole, StaffMember, StaffShift } from '@/types';
import {
  buildDutyMap,
  countByRole,
  DUTY_SHIFT_LABEL,
  DUTY_SHIFTS,
  filterByShift,
  formatDayMonth,
  getStaffDisplayName,
  type DutyMap,
  type RoleFilter,
  type ShiftFilter,
} from './staffDuty';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 24px 80px 24px;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 780px;
  margin: 0 auto 40px auto;

  .section-tag {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    color: #0d9488;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    padding: 5px 14px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 14px;
  }

  h2 {
    font-size: 36px;
    font-weight: 850;
    color: #0f172a;
    letter-spacing: -0.02em;
    margin: 0 0 14px 0;

    @media (max-width: 640px) {
      font-size: 28px;
    }
  }

  p {
    font-size: 16px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;

  .role-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .role-tab {
    padding: 7px 16px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease-in-out;

    &:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
      color: #0f172a;
    }

    &.active {
      background: #0d9488;
      border-color: #0d9488;
      color: #ffffff;
    }
  }

  .duty-filter {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .duty-date {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 9999px;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    color: #0f766e;
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
  }

  /* "Ca rảnh:" stays beside its switch when the toolbar wraps */
  .shift-pick {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .shift-label {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }

  .shift-switch {
    display: inline-flex;
    padding: 3px;
    border-radius: 9px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
  }

  .shift-option {
    border: none;
    background: transparent;
    padding: 5px 14px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease-in-out;

    &:hover {
      color: #0f172a;
    }

    &.active {
      background: #ffffff;
      color: #0d9488;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }
  }
`;

const StaffGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Notice = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 16px;
  color: #64748b;
  font-size: 14.5px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;

  .ant-btn {
    margin-top: 12px;
  }
`;

const ShowMoreRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 28px;
`;

const StaffCard = styled.div<{ $accent: string; $tint: string }>`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 18px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.15s ease-in-out;

  &:hover {
    border-color: ${p => p.$accent};
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .role-icon {
    flex: 0 0 auto;
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: ${p => p.$tint};
    color: ${p => p.$accent};
    font-size: 19px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .identity {
    flex: 1;
    min-width: 0;

    h3 {
      font-size: 15.5px;
      font-weight: 750;
      color: #0f172a;
      margin: 1px 0 3px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      color: #94a3b8;
      letter-spacing: 0.4px;
    }
  }

  .role-chip {
    flex: 0 0 auto;
    padding: 3px 10px;
    border-radius: 9999px;
    background: ${p => p.$tint};
    color: ${p => p.$accent};
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
  }

  .shifts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .shift {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #94a3b8;

    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cbd5e1;
      margin-right: 6px;
    }

    .shift-sep {
      white-space: pre;
    }

    &.free {
      border-color: #99f6e4;
      background: #f0fdfa;
      color: #0f766e;

      &::before {
        background: #14b8a6;
      }
    }

    /* The shift picked in "Ca rảnh" */
    &.picked {
      border-color: #0d9488;
    }
  }

  /* Too narrow for "Chiều · Rảnh" on one line: shift above, state below */
  @media (max-width: 420px) {
    padding: 16px 14px;

    .shifts {
      gap: 6px;
    }

    .shift {
      flex-direction: column;
      height: auto;
      padding: 5px 2px;
      font-size: 12px;
      line-height: 1.35;

      &::before,
      .shift-sep {
        display: none;
      }

      .shift-name {
        font-weight: 500;
      }
    }
  }
`;

// Text per role, written for the home page (the database has no staff bio)
const ROLE_PROFILE: Record<
  ClinicalStaffRole,
  {
    badge: string;
    icon: React.ReactNode;
    accent: string;
    tint: string;
  }
> = {
  Veterinarian: {
    badge: 'Bác sĩ thú y',
    icon: <MedicineBoxOutlined />,
    accent: '#0d9488',
    tint: '#f0fdfa',
  },
  Groomer: {
    badge: 'Spa & Grooming',
    icon: <ScissorOutlined />,
    accent: '#c2410c',
    tint: '#fff7ed',
  },
};

// Vets first, then groomers; the BE already sorts each by name
const ROLE_ORDER: ClinicalStaffRole[] = ['Veterinarian', 'Groomer'];

const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Veterinarian', label: 'Bác sĩ thú y' },
  { key: 'Groomer', label: 'Spa & Grooming' },
];

const SHIFT_OPTIONS: { key: ShiftFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  ...DUTY_SHIFTS.map(shift => ({ key: shift, label: DUTY_SHIFT_LABEL[shift] })),
];

// Cards shown before "Xem tất cả"
const INITIAL_VISIBLE = 6;

const DoctorsSection: React.FC = () => {
  const { isLogin } = useIsLogin();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [duty, setDuty] = useState<DutyMap>({});
  const [dutyDate, setDutyDate] = useState(() => getVietnamTodayString());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');

  // GET /users/staff needs a signed-in user, so guests are not sent there.
  // One call for everyone, then one per shift of today: whoever is missing
  // from a shift's list reported busy then.
  const fetchStaff = useCallback(async (signal?: AbortSignal) => {
    const today = getVietnamTodayString();
    setLoading(true);
    setLoadError(false);
    try {
      const [all, ...perShift] = await Promise.all([
        StaffService.listStaff({ status: 'Active', limit: 100 }, { signal }),
        ...DUTY_SHIFTS.map(shift =>
          StaffService.listStaff(
            { status: 'Active', limit: 100, workDate: today, shift },
            { signal }
          )
        ),
      ]);
      if (signal?.aborted) return;
      const items = all?.items || [];
      const freeByShift = Object.fromEntries(
        DUTY_SHIFTS.map((shift, index) => [shift, perShift[index]?.items || []])
      ) as Record<StaffShift, StaffMember[]>;
      setStaff(items);
      setDuty(buildDutyMap(items, freeByShift));
      setDutyDate(today);
    } catch {
      if (signal?.aborted) return;
      setLoadError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLogin) {
      setStaff([]);
      setDuty({});
      return;
    }
    const ctrl = new AbortController();
    fetchStaff(ctrl.signal);
    return () => ctrl.abort();
  }, [isLogin, fetchStaff]);

  const orderedStaff = useMemo(
    () =>
      ROLE_ORDER.flatMap(role => staff.filter(member => member.role === role)),
    [staff]
  );
  // Tab counts follow the shift picked, so "Bác sĩ thú y (2)" under "Sáng"
  // means two vets are free this morning
  const freeInShift = useMemo(
    () => filterByShift(orderedStaff, duty, shiftFilter),
    [orderedStaff, duty, shiftFilter]
  );
  const roleCounts = useMemo(() => countByRole(freeInShift), [freeInShift]);
  const filteredStaff =
    roleFilter === 'ALL'
      ? freeInShift
      : freeInShift.filter(member => member.role === roleFilter);
  const visibleStaff = showAll
    ? filteredStaff
    : filteredStaff.slice(0, INITIAL_VISIBLE);

  const renderEmptyFilter = () => {
    const who =
      roleFilter === 'ALL'
        ? 'bác sĩ hoặc nhân viên spa'
        : ROLE_PROFILE[roleFilter].badge.toLocaleLowerCase('vi');
    if (shiftFilter === 'ALL') {
      return `Phòng khám chưa có ${who} nào.`;
    }
    return `Không có ${who} nào rảnh ca ${DUTY_SHIFT_LABEL[shiftFilter].toLocaleLowerCase('vi')} hôm nay.`;
  };

  const renderGridBody = () => {
    if (!isLogin) {
      return (
        <Notice>
          Đăng nhập để xem danh sách bác sĩ và nhân viên spa của phòng khám.
          <div>
            <Button
              type="primary"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('open-vcmos-login'))
              }
            >
              Đăng nhập
            </Button>
          </div>
        </Notice>
      );
    }
    if (loading) {
      return (
        <Notice>
          <Spin />
        </Notice>
      );
    }
    if (loadError) {
      return (
        <Notice>
          Không thể tải danh sách đội ngũ.{' '}
          <Button type="link" onClick={() => fetchStaff()}>
            Thử lại
          </Button>
        </Notice>
      );
    }
    if (orderedStaff.length === 0) {
      return <Notice>Phòng khám chưa có bác sĩ hoặc nhân viên spa nào.</Notice>;
    }
    if (filteredStaff.length === 0) {
      return <Notice>{renderEmptyFilter()}</Notice>;
    }
    return visibleStaff.map(member => {
      const profile = ROLE_PROFILE[member.role];
      const availability = duty[member._id];
      return (
        <StaffCard
          key={member._id}
          $accent={profile.accent}
          $tint={profile.tint}
        >
          <div className="card-head">
            <div className="role-icon" aria-hidden>
              {profile.icon}
            </div>
            <div className="identity">
              <h3 title={getStaffDisplayName(member)}>
                {getStaffDisplayName(member)}
              </h3>
              {member.code && <div className="code">{member.code}</div>}
            </div>
            <span className="role-chip">{profile.badge}</span>
          </div>

          <div className="shifts">
            {DUTY_SHIFTS.map(shift => {
              const free = availability?.[shift] === true;
              const label = DUTY_SHIFT_LABEL[shift];
              return (
                <span
                  key={shift}
                  className={`shift ${free ? 'free' : 'busy'} ${shiftFilter === shift ? 'picked' : ''}`}
                  aria-label={`Ca ${label.toLocaleLowerCase('vi')}: ${free ? 'rảnh' : 'bận'}`}
                >
                  <span className="shift-name">{label}</span>
                  <span className="shift-sep" aria-hidden>
                    {' · '}
                  </span>
                  <span>{free ? 'Rảnh' : 'Bận'}</span>
                </span>
              );
            })}
          </div>
        </StaffCard>
      );
    });
  };

  const showToolbar = isLogin && !loading && !loadError && staff.length > 0;

  return (
    <SectionWrapper id="doctors">
      <SectionHeader>
        <span className="section-tag">Đội Ngũ Chuyên Môn VCMOS</span>
        <h2>Bác Sĩ Thú Y & Nhân Viên Spa</h2>
        <p>
          Bác sĩ thú y phụ trách khám, điều trị & tiêm phòng · Nhân viên Spa phụ
          trách tắm sấy, vệ sinh & cắt tỉa.
        </p>
      </SectionHeader>

      {showToolbar && (
        <Toolbar>
          <div className="role-tabs">
            {ROLE_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`role-tab ${roleFilter === tab.key ? 'active' : ''}`}
                aria-pressed={roleFilter === tab.key}
                onClick={() => setRoleFilter(tab.key)}
              >
                {tab.label} ({roleCounts[tab.key]})
              </button>
            ))}
          </div>

          <div className="duty-filter">
            <span className="duty-date">
              <CalendarOutlined />
              Lịch trực hôm nay · {formatDayMonth(dutyDate)}
            </span>
            <span className="shift-pick">
              <span className="shift-label">Ca rảnh:</span>
              <div className="shift-switch" role="group" aria-label="Ca rảnh">
                {SHIFT_OPTIONS.map(option => (
                  <button
                    key={option.key}
                    type="button"
                    className={`shift-option ${shiftFilter === option.key ? 'active' : ''}`}
                    aria-pressed={shiftFilter === option.key}
                    onClick={() => setShiftFilter(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </span>
          </div>
        </Toolbar>
      )}

      <StaffGrid>{renderGridBody()}</StaffGrid>

      {showToolbar && filteredStaff.length > INITIAL_VISIBLE && (
        <ShowMoreRow>
          <Button onClick={() => setShowAll(prev => !prev)}>
            {showAll ? 'Thu gọn' : `Xem tất cả (${filteredStaff.length})`}
          </Button>
        </ShowMoreRow>
      )}
    </SectionWrapper>
  );
};

export default DoctorsSection;
