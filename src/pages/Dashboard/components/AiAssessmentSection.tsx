import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  AlertOutlined,
  CheckOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import AiAssessmentService, {
  AI_DESCRIPTION_MAX_LENGTH,
  AI_MAX_PHOTOS,
  AI_MAX_SYMPTOM_LENGTH,
  AI_PHOTO_ACCEPT,
  AI_SYMPTOM_OPTIONS,
  addCustomSymptom,
  assessmentPetId,
  mergeSymptoms,
  readAiAssessmentError,
  validateAiAssessmentInput,
  validateAiPhoto,
  type AiAssessment,
  type AiAssessmentApiError,
  type AiAssessmentFieldErrors,
} from '@/services/AiAssessmentService';
import PetService from '@/services/PetService';
import type { Pet } from '@/types';
import AiAssessmentResult from '@/components/aiAssessment/AiAssessmentResult';
import AiAssessmentDetailModal from '@/components/aiAssessment/AiAssessmentDetailModal';
import AiAssessmentHistory from './AiAssessmentHistory';

const TriageCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
  margin-bottom: 24px;
  overflow: hidden;

  .ant-card-body {
    padding: 24px;
  }

  @media (max-width: 576px) {
    .ant-card-body {
      padding: 16px;
    }
  }
`;

const HeaderRow = styled.div`
  margin-bottom: 16px;

  .main-title {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }
`;

const DisclaimerBanner = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #0d9488;
  border-radius: 8px;
  padding: 12px 18px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #334155;

  .banner-icon {
    font-size: 17px;
    color: #0d9488;
    flex-shrink: 0;
  }

  strong {
    color: #0f172a;
  }
`;

const AssessmentContainer = styled.div`
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 28px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 16px;
  }
`;

const FormPane = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  .field-label {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;

    .sub {
      font-size: 12px;
      font-weight: 400;
      color: #64748b;
    }
  }

  .field {
    margin-bottom: 20px;

    > .ant-select {
      width: 100%;
    }
  }

  .field-error {
    color: #dc2626;
    font-size: 12px;
    margin-top: 4px;
  }

  .symptom-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  .custom-symptoms {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 0;
    margin-top: 8px;
  }

  .upload-spec {
    font-size: 11.5px;
    color: #94a3b8;
    margin-top: 4px;
  }

  .btn-submit-assessment {
    height: 42px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
  }
`;

const SymptomButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${props => (props.$active ? '#0d9488' : '#e2e8f0')};
  background: ${props => (props.$active ? '#f0fdfa' : '#ffffff')};
  color: ${props => (props.$active ? '#0d9488' : '#334155')};
  font-size: 12.5px;
  font-weight: ${props => (props.$active ? '600' : '500')};
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover {
    border-color: #0d9488;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const ResultPane = styled.div`
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-width: 0;

  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 16px;

    .title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .timestamp {
      font-size: 11.5px;
      color: #64748b;
    }
  }

  .result-placeholder {
    font-size: 13px;
    color: #64748b;
    text-align: center;
    padding: 24px 8px;
  }

  .analyzing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    padding: 32px 8px;
    font-size: 13px;
    color: #334155;

    .elapsed {
      font-size: 12px;
      color: #64748b;
    }
  }

  @media (max-width: 576px) {
    padding: 14px;
  }
`;

const NEW_PET = '__new__';

export interface AiBookingRequest {
  petId?: string;
  note: string;
  serviceId?: string;
}

interface AiAssessmentSectionProps {
  /** Bumped by the dashboard after a pet is added, edited or deleted */
  petsVersion?: number;
  onAddNewPet?: () => void;
  /** Opens the booking form with the pet, the AI note and maybe a service */
  onBookAppointment: (booking: AiBookingRequest) => void;
}

/**
 * SCR-10 / UC-14: the owner sends a pet's symptoms, a description and up to 3
 * photos; the BE adds the pet's records and asks the AI. The result is for
 * reference only (BR-20, MSG33) and is saved apart from the medical records.
 */
const AiAssessmentSection: React.FC<AiAssessmentSectionProps> = ({
  petsVersion = 0,
  onAddNewPet,
  onBookAppointment,
}) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [petsAttempt, setPetsAttempt] = useState(0);
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>();

  const [codes, setCodes] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [customDraft, setCustomDraft] = useState('');
  const [photoList, setPhotoList] = useState<UploadFile[]>([]);
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AiAssessmentFieldErrors>({});

  const [analyzing, setAnalyzing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<AiAssessment | null>(null);
  const [failure, setFailure] = useState<AiAssessmentApiError | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Only Active pets can be checked; the dashboard list may show another
  // status or page, so the section reads its own list
  useEffect(() => {
    const controller = new AbortController();
    setPetsLoading(true);
    setPetsError(null);
    PetService.listPets({ status: 'Active', page: 1, limit: 100 })
      .then(response => {
        if (controller.signal.aborted) return;
        const items = response.items || [];
        setPets(items);
        setSelectedPetId(current =>
          current && items.some(pet => pet._id === current)
            ? current
            : items[0]?._id
        );
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setPetsError(
          error?.response?.data?.message ||
            'Không thể tải danh sách thú cưng của bạn'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPetsLoading(false);
      });
    return () => controller.abort();
  }, [petsVersion, petsAttempt]);

  // A running check is dropped when the owner leaves the tab
  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (!analyzing) return undefined;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(s => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [analyzing]);

  const selectedPet = pets.find(pet => pet._id === selectedPetId);
  const symptoms = mergeSymptoms(codes, custom);

  const clearFieldError = (field: keyof AiAssessmentFieldErrors) =>
    setFieldErrors(prev =>
      prev[field] ? { ...prev, [field]: undefined } : prev
    );

  const choosePet = (value: string) => {
    if (value === NEW_PET) {
      onAddNewPet?.();
      return;
    }
    if (value === selectedPetId) return;
    setSelectedPetId(value);
    // A result belongs to one pet; the history below keeps it
    setResult(null);
    setFailure(null);
    clearFieldError('petId');
  };

  const toggleCode = (code: string) => {
    setCodes(prev =>
      prev.includes(code) ? prev.filter(item => item !== code) : [...prev, code]
    );
    clearFieldError('symptoms');
  };

  const addTypedSymptom = () => {
    const added = addCustomSymptom(custom, codes, customDraft);
    if (!added.ok) {
      setFieldErrors(prev => ({ ...prev, symptoms: added.error }));
      return;
    }
    setCustom(added.custom);
    setCustomDraft('');
    clearFieldError('symptoms');
  };

  const book = useCallback(
    (assessment: AiAssessment, serviceId?: string) => {
      onBookAppointment({
        petId: assessmentPetId(assessment) || selectedPetId,
        note: assessment.bookingNoteDraft,
        serviceId,
      });
    },
    [onBookAppointment, selectedPetId]
  );

  const handleAnalyze = async () => {
    if (analyzing) return;
    const photos = photoList
      .map(item => item.originFileObj)
      .filter((file): file is NonNullable<typeof file> => !!file);
    const errors = validateAiAssessmentInput({
      petId: selectedPetId,
      description,
      symptoms,
      photos,
    });
    setFieldErrors(errors);
    const firstError = Object.values(errors).find(Boolean);
    if (firstError || !selectedPetId) {
      toast.error(firstError || 'Vui lòng chọn thú cưng cần đánh giá');
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setAnalyzing(true);
    setResult(null);
    setFailure(null);
    try {
      const response = await AiAssessmentService.createAssessment(
        { petId: selectedPetId, description, symptoms, photos },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setResult(response.assessment);
      setHistoryKey(key => key + 1);
      toast.success('Đã có kết quả đánh giá tham khảo');
    } catch (error) {
      if (controller.signal.aborted) return;
      const info = readAiAssessmentError(
        error,
        'Không thể đánh giá lúc này. Vui lòng thử lại.'
      );
      setFieldErrors(info.fields);
      if (info.retryable) {
        // MSG34: nothing was saved, the form stays for another try
        setFailure(info);
      } else {
        toast.error(info.message);
        // The pet may have been deleted meanwhile
        if (info.status === 403 || info.status === 404) {
          setPetsAttempt(n => n + 1);
        }
      }
    } finally {
      if (!controller.signal.aborted) setAnalyzing(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const petOptions = [
    ...pets.map(pet => ({
      value: pet._id,
      label: `Bé ${pet.name} · ${pet.species || 'Thú cưng'}${
        pet.breed ? ` (${pet.breed})` : ''
      }${pet.weight ? ` · ${pet.weight} kg` : ''}`,
    })),
    { value: NEW_PET, label: '+ Thêm thú cưng mới vào hồ sơ' },
  ];

  const noPets = !petsLoading && !petsError && pets.length === 0;

  return (
    <TriageCard id="triage">
      <HeaderRow>
        <h3 className="main-title">
          <SafetyCertificateOutlined style={{ color: '#0d9488' }} />
          Sàng Lọc & Đánh Giá Triệu Chứng Thú Cưng Ban Đầu
        </h3>
      </HeaderRow>

      <DisclaimerBanner>
        <InfoCircleOutlined className="banner-icon" />
        <div>
          <strong>Khuyến cáo y khoa:</strong> Kết quả AI chỉ mang tính tham khảo
          và không thay thế chẩn đoán của bác sĩ thú y. Khi bé có dấu hiệu suy
          kiệt cấp tính, vui lòng đưa bé đến phòng khám ngay hoặc gọi hotline{' '}
          <strong>(024) 7300 8888</strong>.
        </div>
      </DisclaimerBanner>

      <AssessmentContainer>
        <FormPane>
          <div className="field-label">
            <SafetyCertificateOutlined style={{ color: '#0d9488' }} />
            1. Chọn thú cưng <span className="sub">(từ hồ sơ của bạn)</span>
          </div>
          <div className="field">
            {petsError ? (
              <Alert
                type="error"
                showIcon
                message={petsError}
                action={
                  <Button
                    size="small"
                    onClick={() => setPetsAttempt(n => n + 1)}
                  >
                    Thử lại
                  </Button>
                }
              />
            ) : noPets ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Bạn chưa có thú cưng nào. Thêm hồ sơ thú cưng để dùng tính năng AI."
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={onAddNewPet}
                >
                  Thêm thú cưng
                </Button>
              </Empty>
            ) : (
              <Select
                aria-label="Thú cưng cần đánh giá"
                value={selectedPetId}
                loading={petsLoading}
                disabled={analyzing}
                placeholder="Chọn thú cưng"
                onChange={choosePet}
                options={petOptions}
                status={fieldErrors.petId ? 'error' : undefined}
              />
            )}
            {fieldErrors.petId && (
              <div className="field-error">{fieldErrors.petId}</div>
            )}
          </div>

          <div className="field-label">
            <AlertOutlined style={{ color: '#0d9488' }} />
            2. Dấu hiệu nhận biết{' '}
            <span className="sub">(chọn dấu hiệu phổ biến hoặc tự nhập)</span>
          </div>
          <div className="field">
            <div className="symptom-grid">
              {AI_SYMPTOM_OPTIONS.map(option => {
                const active = codes.includes(option.code);
                return (
                  <SymptomButton
                    key={option.code}
                    type="button"
                    $active={active}
                    aria-pressed={active}
                    disabled={analyzing}
                    onClick={() => toggleCode(option.code)}
                  >
                    {active && <CheckOutlined style={{ fontSize: 11 }} />}
                    {option.label}
                  </SymptomButton>
                );
              })}
            </div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                aria-label="Triệu chứng khác"
                placeholder="Triệu chứng khác, ví dụ: Chảy nước dãi nhiều"
                value={customDraft}
                maxLength={AI_MAX_SYMPTOM_LENGTH}
                disabled={analyzing}
                onChange={event => setCustomDraft(event.target.value)}
                onPressEnter={addTypedSymptom}
              />
              <Button
                icon={<PlusOutlined />}
                disabled={analyzing}
                onClick={addTypedSymptom}
              >
                Thêm
              </Button>
            </Space.Compact>
            {custom.length > 0 && (
              <div className="custom-symptoms">
                {custom.map(item => (
                  <Tag
                    key={item}
                    color="cyan"
                    closable={!analyzing}
                    onClose={() =>
                      setCustom(prev => prev.filter(value => value !== item))
                    }
                  >
                    {item}
                  </Tag>
                ))}
              </div>
            )}
            {fieldErrors.symptoms && (
              <div className="field-error">{fieldErrors.symptoms}</div>
            )}
          </div>

          <div className="field-label">
            <UploadOutlined style={{ color: '#0d9488' }} />
            3. Ảnh chụp vùng bệnh / biểu hiện{' '}
            <span className="sub">(không bắt buộc, tối đa 3 ảnh)</span>
          </div>
          <div className="field">
            <Upload
              listType="picture-card"
              accept={AI_PHOTO_ACCEPT}
              multiple
              fileList={photoList}
              disabled={analyzing}
              showUploadList={{ showPreviewIcon: false }}
              beforeUpload={(file, batch) => {
                const problem = validateAiPhoto(file);
                if (problem) {
                  toast.error(`${file.name}: ${problem}`);
                  return Upload.LIST_IGNORE;
                }
                const validBefore = batch
                  .slice(0, batch.indexOf(file))
                  .filter(item => !validateAiPhoto(item)).length;
                if (photoList.length + validBefore >= AI_MAX_PHOTOS) {
                  toast.error(`Chỉ được tải lên tối đa ${AI_MAX_PHOTOS} ảnh`, {
                    id: 'ai-photo-limit',
                  });
                  return Upload.LIST_IGNORE;
                }
                // Kept in the form, sent with the check
                return false;
              }}
              onChange={({ fileList }) => {
                setPhotoList(fileList.slice(0, AI_MAX_PHOTOS));
                clearFieldError('photos');
              }}
            >
              {photoList.length < AI_MAX_PHOTOS && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 6, fontSize: 12 }}>Thêm ảnh</div>
                </div>
              )}
            </Upload>
            <div className="upload-spec">
              JPG hoặc PNG, tối đa 5MB mỗi ảnh. Chụp rõ vùng da, mắt hoặc chất
              bài tiết nghi ngờ bất thường.
            </div>
            {fieldErrors.photos && (
              <div className="field-error">{fieldErrors.photos}</div>
            )}
          </div>

          <div className="field-label">
            <FileTextOutlined style={{ color: '#0d9488' }} />
            4. Mô tả chi tiết triệu chứng{' '}
            <span className="sub">(từ 10 đến 1000 ký tự)</span>
          </div>
          <div className="field">
            <Input.TextArea
              aria-label="Mô tả chi tiết triệu chứng"
              rows={4}
              value={description}
              maxLength={AI_DESCRIPTION_MAX_LENGTH}
              showCount
              disabled={analyzing}
              status={fieldErrors.description ? 'error' : undefined}
              onChange={event => {
                setDescription(event.target.value);
                clearFieldError('description');
              }}
              placeholder="Triệu chứng xuất hiện từ khi nào, bé ăn uống, đi lại, đi vệ sinh ra sao..."
            />
            {fieldErrors.description && (
              <div className="field-error">{fieldErrors.description}</div>
            )}
          </div>

          <Button
            type="primary"
            className="btn-submit-assessment"
            icon={<SendOutlined />}
            loading={analyzing}
            disabled={noPets || !!petsError}
            onClick={handleAnalyze}
          >
            {analyzing ? 'AI đang phân tích...' : 'Phân tích tham khảo sơ bộ'}
          </Button>
        </FormPane>

        <ResultPane aria-live="polite">
          <div className="result-header">
            <div className="title">
              <FileTextOutlined /> Kết quả đánh giá tham khảo
              {result && selectedPet ? ` · bé ${selectedPet.name}` : ''}
            </div>
            {result && (
              <div className="timestamp">
                {dayjs(result.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>
            )}
          </div>

          {analyzing ? (
            <div className="analyzing">
              <Spin size="large" />
              <div>
                AI đang đối chiếu hồ sơ, triệu chứng
                {photoList.length > 0 ? ' và ảnh' : ''} của bé{' '}
                {selectedPet?.name || ''}...
              </div>
              <div className="elapsed">
                {elapsed} giây · thường mất không quá 30 giây
              </div>
            </div>
          ) : failure ? (
            <Alert
              type="warning"
              showIcon
              message={failure.message}
              description="Kết quả chưa được lưu. Thông tin bạn nhập vẫn được giữ nguyên để thử lại."
              action={
                <Button size="small" onClick={handleAnalyze}>
                  Thử lại
                </Button>
              }
            />
          ) : result ? (
            <AiAssessmentResult
              assessment={result}
              onBook={serviceId => book(result, serviceId)}
            />
          ) : (
            <div className="result-placeholder">
              Chọn thú cưng, mô tả triệu chứng rồi bấm{' '}
              <strong>Phân tích tham khảo sơ bộ</strong>. Kết quả sẽ hiện ở đây
              và được lưu vào lịch sử bên dưới.
            </div>
          )}
        </ResultPane>
      </AssessmentContainer>

      <AiAssessmentHistory
        petId={selectedPetId}
        petName={selectedPet?.name}
        refreshKey={historyKey}
        onOpen={setDetailId}
      />

      <AiAssessmentDetailModal
        assessmentId={detailId}
        onClose={() => setDetailId(null)}
        onBook={(assessment, serviceId) => {
          setDetailId(null);
          book(assessment, serviceId);
        }}
      />
    </TriageCard>
  );
};

export default AiAssessmentSection;
