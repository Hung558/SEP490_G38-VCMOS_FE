import type { Cage } from '@/types';
import { canCageHoldPet } from '../../../services/CageService/helpers.ts';

export const getReceptionCageChoices = (
  cages: readonly Cage[],
  petWeight: number | null | undefined,
  requiresIsolation: boolean
): Cage[] =>
  cages.filter(
    cage =>
      cage.status === 'Available' &&
      canCageHoldPet(cage, petWeight, requiresIsolation)
  );

export const receptionCageLabel = (cage: Cage) =>
  `${cage.label} - Size ${cage.size}${cage.isIsolated ? ' [Cách ly]' : ''}`;
