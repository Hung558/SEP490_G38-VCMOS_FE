import React from 'react';
import styled from 'styled-components';
import { Alert, Button, Skeleton } from 'antd';
import { CheckCircleFilled, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Pet } from '@/types';
import {
  aiUrgencyMeta,
  type AiAssessment,
} from '@/services/AiAssessmentService';
import { getSpeciesEmoji } from '@/pages/Dashboard/components/PetDetailModal';

/** Latest check and number of checks of one pet (GET ?petId=&limit=1) */
export interface AiPetSummary {
  total: number;
  latest?: AiAssessment;
}

const TONE_COLORS = {
  urgent: '#dc2626',
  monitor: '#f59e0b',
  routine: '#0d9488',
} as const;

/** Species and breed, then the weight: "Chó Poodle, 3.2 kg" */
const petDetail = (pet: Pet) => {
  const kind = [pet.species || 'Thú cưng', pet.breed].filter(Boolean).join(' ');
  return pet.weight ? `${kind}, ${pet.weight} kg` : kind;
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
  gap: 10px;
`;

const PetButton = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  text-align: left;
  font: inherit;
  background: ${props => (props.$active ? '#f0fdfa' : '#ffffff')};
  border: 1px solid ${props => (props.$active ? '#0d9488' : '#e2e8f0')};
  box-shadow: ${props => (props.$active ? 'inset 0 0 0 1px #0d9488' : 'none')};
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s;

  &:hover:not(:disabled) {
    border-color: #0d9488;
  }

  &:focus-visible {
    outline: 2px solid #0d9488;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: ${props => (props.$active ? 1 : 0.55)};
  }

  .avatar {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 21px;
    background: ${props => (props.$active ? '#ccfbf1' : '#f1f5f9')};
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .name,
  .detail {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name {
    font-size: 14px;
    font-weight: 700;
    color: ${props => (props.$active ? '#0f766e' : '#0f172a')};
  }

  .detail {
    font-size: 12px;
    color: #64748b;
  }

  .marks {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .check {
    font-size: 15px;
    color: #0d9488;
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 64px;
  padding: 10px 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #0f766e;
  background: transparent;
  border: 1px dashed #94a3b8;
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s;

  &:hover:not(:disabled) {
    border-color: #0d9488;
    background: #f0fdfa;
  }

  &:focus-visible {
    outline: 2px solid #0d9488;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const EmptyBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  border: 1px dashed #94a3b8;
  border-radius: 12px;
  font-size: 13px;
  color: #475569;
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

interface AiPetPickerProps {
  pets: Pet[];
  summaries: Record<string, AiPetSummary>;
  loading: boolean;
  error: string | null;
  value?: string;
  disabled?: boolean;
  onChange: (petId: string) => void;
  onAdd?: () => void;
  onRetry: () => void;
}

/**
 * SCR-10 first field: the owner's Active pets as cards above the form. The
 * dot is the level of the pet's latest AI check (none before the first one).
 */
const AiPetPicker: React.FC<AiPetPickerProps> = ({
  pets,
  summaries,
  loading,
  error,
  value,
  disabled,
  onChange,
  onAdd,
  onRetry,
}) => {
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message={error}
        action={
          <Button size="small" onClick={onRetry}>
            Thử lại
          </Button>
        }
      />
    );
  }

  if (loading && pets.length === 0) {
    return (
      <Grid aria-busy="true" data-testid="ai-pet-loading">
        {[0, 1].map(index => (
          <Skeleton.Button
            key={index}
            active
            block
            style={{ height: 64, borderRadius: 12 }}
          />
        ))}
      </Grid>
    );
  }

  if (pets.length === 0) {
    return (
      <EmptyBox>
        <span>
          Bạn chưa có thú cưng nào. Thêm hồ sơ thú cưng để dùng tính năng AI.
        </span>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          Thêm thú cưng
        </Button>
      </EmptyBox>
    );
  }

  return (
    <Grid role="group" aria-label="Thú cưng cần đánh giá">
      {pets.map(pet => {
        const active = pet._id === value;
        const latest = summaries[pet._id]?.latest;
        const meta = latest ? aiUrgencyMeta(latest.urgency) : null;
        return (
          <PetButton
            key={pet._id}
            type="button"
            $active={active}
            aria-pressed={active}
            disabled={disabled}
            data-testid="ai-pet-option"
            onClick={() => onChange(pet._id)}
          >
            <span className="avatar" aria-hidden="true">
              {pet.photoUrl ? (
                <img src={pet.photoUrl} alt="" />
              ) : (
                getSpeciesEmoji(pet.species)
              )}
            </span>
            <span className="info">
              <span className="name">{pet.name}</span>
              <span className="detail">{petDetail(pet)}</span>
            </span>
            <span className="marks">
              {active && <CheckCircleFilled className="check" />}
              {latest && meta && (
                <span
                  className="dot"
                  style={{ background: TONE_COLORS[meta.tone] }}
                  title={`Lần gần nhất: ${meta.label}, ${dayjs(
                    latest.createdAt
                  ).format('DD/MM/YYYY')}`}
                />
              )}
            </span>
            {latest && meta && (
              <SrOnly>Lần đánh giá gần nhất: {meta.label}</SrOnly>
            )}
          </PetButton>
        );
      })}
      {onAdd && (
        <AddButton type="button" disabled={disabled} onClick={onAdd}>
          <PlusOutlined /> Thêm thú cưng mới
        </AddButton>
      )}
    </Grid>
  );
};

export default AiPetPicker;
