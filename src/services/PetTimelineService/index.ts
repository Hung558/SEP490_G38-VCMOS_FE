import api from '../01_axios';
import type { PetTimelinePage, PetTimelineQuery } from './types';

const listPetTimeline = (
  petId: string,
  query?: PetTimelineQuery,
  signal?: AbortSignal
): Promise<PetTimelinePage> =>
  api.get(`/pets/${encodeURIComponent(petId)}/timeline`, {
    params: query,
    signal,
  });

const PetTimelineService = { listPetTimeline };
export { listPetTimeline };
export default PetTimelineService;
export * from './types';
export * from './helpers';
