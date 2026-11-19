import api from '../01_axios';
import { createCommunityPostService } from './client';

const CommunityPostService = createCommunityPostService(api);
export default CommunityPostService;
export type * from './types';
export * from './helpers';
