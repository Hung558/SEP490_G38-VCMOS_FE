import api from '../01_axios';
import {
  apiCompleteConsultation,
  apiMedicalRecordByService,
  apiPetMedicalHistory,
  apiStartConsultation,
} from './urls';
import type {
  CompleteConsultationResponse,
  CompleteMedicalRecordPayload,
  MedicalRecord,
  PetMedicalHistoryResponse,
  SaveMedicalRecordPayload,
  StartConsultationResponse,
} from '@/types';

/**
 * Bác sĩ bắt đầu khám: Waiting -> InProgress, BE tự nhả chuồng chờ (BR-10) và tạo bản nháp.
 * 409 khi khách chưa check-in hoặc dịch vụ đứng trước trong đơn chưa xong (BR-12)
 * POST /api/medical-records/service/:appointmentServiceId/start
 */
const startConsultation = (
  appointmentServiceId: string
): Promise<StartConsultationResponse> =>
  api.post(apiStartConsultation(appointmentServiceId));

/**
 * Bệnh án SOAP của một ca khám (nhân sự, hoặc đúng chủ nuôi của thú cưng - BR-23).
 * 404 khi ca khám chưa bắt đầu nên chưa có bệnh án
 * GET /api/medical-records/service/:appointmentServiceId
 */
const getByService = (
  appointmentServiceId: string,
  options?: { signal?: AbortSignal }
): Promise<MedicalRecord> =>
  api.get(apiMedicalRecordByService(appointmentServiceId), {
    signal: options?.signal,
  });

/**
 * Lưu nháp bệnh án và đơn thuốc (BR-16: chỉ thuốc đang Active); 409 khi đã Finalized
 * PUT /api/medical-records/service/:appointmentServiceId
 */
const saveDraft = (
  appointmentServiceId: string,
  payload: SaveMedicalRecordPayload
): Promise<MedicalRecord> =>
  api.put(apiMedicalRecordByService(appointmentServiceId), payload);

/**
 * Hoàn tất ca khám: cần đủ S-O-A-P (BR-13), dịch vụ sang Done, đơn sang WaitOwner khi
 * mọi dịch vụ đã xong (BR-09). Bệnh án vẫn là Draft tới khi thanh toán (BR-14)
 * POST /api/medical-records/service/:appointmentServiceId/complete
 */
const completeConsultation = (
  appointmentServiceId: string,
  payload: CompleteMedicalRecordPayload
): Promise<CompleteConsultationResponse> =>
  api.post(apiCompleteConsultation(appointmentServiceId), payload);

/**
 * Tiền sử bệnh của một thú cưng, mới nhất trước (Medical History Drawer - UC-32)
 * GET /api/medical-records/pet/:petId
 */
const getPetHistory = (
  petId: string,
  options?: { signal?: AbortSignal }
): Promise<PetMedicalHistoryResponse> =>
  api.get(apiPetMedicalHistory(petId), { signal: options?.signal });

const MedicalRecordService = {
  startConsultation,
  getByService,
  saveDraft,
  completeConsultation,
  getPetHistory,
};

export * from './urls';
export * from './helpers';
export default MedicalRecordService;
