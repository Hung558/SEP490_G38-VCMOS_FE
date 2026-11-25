import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Alert, Button, Input, Progress, Space, Spin, Tag, Upload } from 'antd';
import type { UploadFile } from 'antd';
import {
  CheckOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import AiAssessmentService, {
  AI_DESCRIPTION_MAX_LENGTH,
  AI_DESCRIPTION_MIN_LENGTH,
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
import AiPetPicker, {
  type AiPetSummary,
} from '@/components/aiAssessment/AiPetPicker';
import AiAssessmentHistory from './AiAssessmentHistory';

/** The BE gives the AI 30 s; the bar fills over that time */
const AI_EXPECTED_SECONDS = 30;

const Root = styled.div`
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Disclaimer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.55;
  color: #475569;

  .icon {
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 16px;
    color: #0d9488;
  }

  strong {
    color: #0f172a;
  }
`;

const FormPanel = styled.section`
  min-width: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 22px 24px 24px;

  .panel-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 20px;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;

    .anticon {
      color: #0d9488;
    }
  }

  .field {
    margin-bottom: 24px;
  }

  .field-title {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
    margin: 0 0 10px;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;

    .hint {
      font-size: 12.5px;
      font-weight: 400;
      color: #64748b;
    }
  }

  /* The pets head the form; below them, the form or its result */
  .pet-field {
    padding-bottom: 22px;
    border-bottom: 1px solid #f1f5f9;
  }

  .field-error {
    color: #dc2626;
    font-size: 12px;
    margin-top: 6px;
  }

  .symptom-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .custom-symptoms {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 0;
    margin-top: 10px;
  }

  .textarea-foot {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-top: 6px;

    .field-error {
      margin-top: 0;
    }

    .count {
      margin-left: auto;
      font-size: 12px;
      color: #94a3b8;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
  }

  .upload-spec {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
  }

  .busy-alert {
    margin-bottom: 16px;
  }

  .submit-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px 16px;
    padding-top: 18px;
    border-top: 1px solid #f1f5f9;

    .submit-hint {
      font-size: 12.5px;
      color: #b45309;
    }
  }

  .btn-submit-assessment {
    min-width: 260px;
    height: 44px;
    border-radius: 10px;
    font-size: 14.5px;
  }

  .analyzing {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 12px;
    font-size: 13px;
    color: #134e4a;

    .text {
      flex: 1;
      min-width: 0;
    }

    .ant-progress {
      margin: 6px 0 2px;
    }

    .elapsed {
      font-size: 12px;
      color: #0f766e;
      font-variant-numeric: tabular-nums;
    }
  }

  .result-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px 16px;
    margin-bottom: 16px;

    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .timestamp {
      font-size: 12px;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
  }

  @container (max-width: 560px) {
    padding: 16px;

    .submit-row {
      display: block;

      .submit-hint {
        display: block;
        margin-bottom: 8px;
      }
    }

    .btn-submit-assessment {
      width: 100%;
      min-width: 0;
    }
  }
`;

const SymptomButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: ${props => (props.$active ? 600 : 500)};
  color: ${props => (props.$active ? '#0f766e' : '#334155')};
  background: ${props => (props.$active ? '#f0fdfa' : '#ffffff')};
  border: 1px solid ${props => (props.$active ? '#0d9488' : '#e2e8f0')};
  border-radius: 999px;
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
    opacity: 0.6;
  }
`;

export interface AiBookingRequest {
  petId?: string;
  note: string;
  /** The suggested services the owner ticked, in the AI's order */
  serviceIds: string[];
}

interface AiAssessmentSectionProps {
  /** Bumped by the page after a pet is added, so the pet list reloads */
  petsVersion?: number;
  /** A pet just added from this page: it is picked once the list reloads */
  newPetId?: string;
  onAddNewPet?: () => void;
  /** Opens the booking form with the pet, the AI note and the services */
  onBookAppointment: (booking: AiBookingRequest) => void;
}

/** Why "Phân tích" is still locked, or null when it can be sent */
const submitBlocker = (
  hasPet: boolean,
  descriptionLength: number
): string | null => {
  if (!hasPet) return 'Chọn thú cưng cần đánh giá';
  if (descriptionLength < AI_DESCRIPTION_MIN_LENGTH) {
    return descriptionLength === 0
      ? `Nhập mô tả triệu chứng (ít nhất ${AI_DESCRIPTION_MIN_LENGTH} ký tự)`
      : `Mô tả cần thêm ${AI_DESCRIPTION_MIN_LENGTH - descriptionLength} ký tự nữa`;
  }
  if (descriptionLength > AI_DESCRIPTION_MAX_LENGTH) {
    return `Mô tả tối đa ${AI_DESCRIPTION_MAX_LENGTH} ký tự`;
  }
  return null;
};

/**
 * SCR-10 / UC-14: the owner sends a pet's symptoms, a description and up to 3
 * photos; the BE adds the pet's records and asks the AI. The result is for
 * reference only (BR-20, MSG33) and is saved apart from the medical records.
 * 25/11: the pets head the form, the result takes the form's place, the
 * history stays under it; the owner ticks suggested services to book.
 */
const AiAssessmentSection: React.FC<AiAssessmentSectionProps> = ({
  petsVersion = 0,
  newPetId,
  onAddNewPet,
  onBookAppointment,
}) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [petsAttempt, setPetsAttempt] = useState(0);
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>();
  const [summaries, setSummaries] = useState<Record<string, AiPetSummary>>({});

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
  const resultRef = useRef<HTMLDivElement | null>(null);
  const newPetRef = useRef(newPetId);
  const pickedNewPetRef = useRef<string | undefined>();
  newPetRef.current = newPetId;

  // Only Active pets can be checked, so the section reads its own list
  useEffect(() => {
    const controller = new AbortController();
    setPetsLoading(true);
    setPetsError(null);
    PetService.listPets({ status: 'Active', page: 1, limit: 100 })
      .then(response => {
        if (controller.signal.aborted) return;
        const items = response.items || [];
        const added = newPetRef.current;
        const pickAdded =
          !!added &&
          added !== pickedNewPetRef.current &&
          items.some(pet => pet._id === added);
        if (pickAdded) pickedNewPetRef.current = added;
        setPets(items);
        setSelectedPetId(current =>
          pickAdded
            ? added
            : current && items.some(pet => pet._id === current)
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

  // Latest check of each pet: the dot on its card
  useEffect(() => {
    if (pets.length === 0) return undefined;
    const controller = new AbortController();
    Promise.all(
      pets.map(pet =>
        AiAssessmentService.listAssessments(
          { petId: pet._id, page: 1, limit: 1 },
          { signal: controller.signal }
        )
          .then(
            page =>
              [
                pet._id,
                { total: page.pagination.total, latest: page.items[0] },
              ] as const
          )
          // A pet without a summary just shows no dot
          .catch(() => null)
      )
    ).then(entries => {
      if (controller.signal.aborted) return;
      setSummaries(
        Object.fromEntries(
          entries.filter((entry): entry is NonNullable<typeof entry> =>
            Boolean(entry)
          )
        )
      );
    });
    return () => controller.abort();
  }, [pets]);

  // A running check is dropped when the owner leaves the page
  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (!analyzing) return undefined;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(s => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [analyzing]);

  // The result takes the form's place: bring its top into view
  useEffect(() => {
    const block = resultRef.current;
    if (!result || !block) return;
    const { top } = block.getBoundingClientRect();
    if (top < 64 || top > window.innerHeight * 0.6) {
      const reduced = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      block.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  }, [result]);

  const selectedPet = pets.find(pet => pet._id === selectedPetId);
  const symptoms = mergeSymptoms(codes, custom);
  const descriptionLength = description.trim().length;
  const blocker = submitBlocker(!!selectedPet, descriptionLength);

  const clearFieldError = (field: keyof AiAssessmentFieldErrors) =>
    setFieldErrors(prev =>
      prev[field] ? { ...prev, [field]: undefined } : prev
    );

  const choosePet = (value: string) => {
    if (value === selectedPetId) return;
    setSelectedPetId(value);
    // A result belongs to one pet; its history keeps it. The draft stays, in
    // case the owner started on the wrong pet.
    setResult(null);
    setFailure(null);
    clearFieldError('petId');
  };

  const startNewCheck = () => {
    setResult(null);
    setFailure(null);
    setCodes([]);
    setCustom([]);
    setCustomDraft('');
    setPhotoList([]);
    setDescription('');
    setFieldErrors({});
  };

  const toggleCode = (code: string) => {
    setCodes(prev =>
      prev.includes(code) ? prev.filter(item => item !== code) : [...prev, code]
    );
    clearFieldError('symptoms');
  };

  const addTypedSymptom = () => {
    if (!customDraft.trim()) return;
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
    (assessment: AiAssessment, serviceIds: string[]) => {
      onBookAppointment({
        petId: assessmentPetId(assessment) || selectedPetId,
        note: assessment.bookingNoteDraft,
        serviceIds,
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

    const petId = selectedPetId;
    const controller = new AbortController();
    requestRef.current = controller;
    setAnalyzing(true);
    setResult(null);
    setFailure(null);
    try {
      const response = await AiAssessmentService.createAssessment(
        { petId, description, symptoms, photos },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setResult(response.assessment);
      setSummaries(prev => ({
        ...prev,
        [petId]: {
          total: (prev[petId]?.total ?? 0) + 1,
          latest: response.assessment,
        },
      }));
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

  const progress = Math.min(
    95,
    Math.round((elapsed / AI_EXPECTED_SECONDS) * 100)
  );

  const form = (
    <>
      <section className="field">
        <h3 className="field-title">
          Dấu hiệu nhận biết
          <span className="hint">Chọn dấu hiệu phổ biến hoặc tự nhập</span>
        </h3>
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
            onChange={event => {
              setCustomDraft(event.target.value);
              clearFieldError('symptoms');
            }}
            onPressEnter={addTypedSymptom}
          />
          <Button
            icon={<PlusOutlined />}
            disabled={analyzing || !customDraft.trim()}
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
      </section>

      <section className="field">
        <h3 className="field-title">
          Mô tả chi tiết triệu chứng
          <span className="hint">
            Từ {AI_DESCRIPTION_MIN_LENGTH} đến {AI_DESCRIPTION_MAX_LENGTH} ký tự
          </span>
        </h3>
        <Input.TextArea
          aria-label="Mô tả chi tiết triệu chứng"
          autoSize={{ minRows: 4, maxRows: 10 }}
          value={description}
          maxLength={AI_DESCRIPTION_MAX_LENGTH}
          disabled={analyzing}
          status={fieldErrors.description ? 'error' : undefined}
          onChange={event => {
            setDescription(event.target.value);
            clearFieldError('description');
          }}
          placeholder="Triệu chứng xuất hiện từ khi nào, bé ăn uống, đi lại, đi vệ sinh ra sao..."
        />
        <div className="textarea-foot">
          {fieldErrors.description && (
            <div className="field-error">{fieldErrors.description}</div>
          )}
          <span className="count" aria-hidden="true">
            {description.length}/{AI_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </section>

      <section className="field">
        <h3 className="field-title">
          Ảnh chụp vùng bệnh / biểu hiện
          <span className="hint">
            Không bắt buộc, tối đa {AI_MAX_PHOTOS} ảnh
          </span>
        </h3>
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
          JPG hoặc PNG, tối đa 5MB mỗi ảnh. Chụp rõ vùng da, mắt hoặc chất bài
          tiết nghi ngờ bất thường.
        </div>
        {fieldErrors.photos && (
          <div className="field-error">{fieldErrors.photos}</div>
        )}
      </section>

      {fieldErrors.petId && (
        <div className="field-error">{fieldErrors.petId}</div>
      )}

      {failure && !analyzing && (
        <Alert
          className="busy-alert"
          type="warning"
          showIcon
          message={failure.message}
          description="Kết quả chưa được lưu. Thông tin bạn nhập vẫn được giữ nguyên để thử lại."
          action={
            <Button size="small" disabled={!!blocker} onClick={handleAnalyze}>
              Thử lại
            </Button>
          }
        />
      )}

      {analyzing ? (
        <div className="analyzing" role="status">
          <Spin />
          <div className="text">
            <div>
              AI đang đối chiếu hồ sơ, triệu chứng
              {photoList.length > 0 ? ' và ảnh' : ''} của bé{' '}
              {selectedPet?.name || ''}...
            </div>
            <Progress
              percent={progress}
              showInfo={false}
              size="small"
              strokeColor="#0d9488"
            />
            <div className="elapsed">
              {elapsed} giây, thường mất không quá {AI_EXPECTED_SECONDS} giây
            </div>
          </div>
        </div>
      ) : (
        <div className="submit-row">
          {blocker && (
            <span className="submit-hint" id="ai-submit-hint">
              {blocker}
            </span>
          )}
          <Button
            type="primary"
            className="btn-submit-assessment"
            icon={<SendOutlined />}
            disabled={!!blocker}
            aria-describedby={blocker ? 'ai-submit-hint' : undefined}
            onClick={handleAnalyze}
          >
            Phân tích tham khảo sơ bộ
          </Button>
        </div>
      )}
    </>
  );

  return (
    <Root id="triage">
      <Disclaimer role="note">
        <InfoCircleOutlined className="icon" />
        <div>
          <strong>Khuyến cáo y khoa:</strong> Kết quả AI chỉ mang tính tham khảo
          và không thay thế chẩn đoán của bác sĩ thú y. Khi bé có dấu hiệu suy
          kiệt cấp tính, vui lòng đưa bé đến phòng khám ngay.
        </div>
      </Disclaimer>

      <FormPanel aria-labelledby="ai-form-title">
        <h2 className="panel-title" id="ai-form-title">
          <SafetyCertificateOutlined />
          Sàng lọc & đánh giá triệu chứng ban đầu
        </h2>

        <section className="field pet-field">
          <h3 className="field-title">Chọn thú cưng</h3>
          <AiPetPicker
            pets={pets}
            summaries={summaries}
            loading={petsLoading}
            error={petsError}
            value={selectedPetId}
            disabled={analyzing}
            onChange={choosePet}
            onAdd={onAddNewPet}
            onRetry={() => setPetsAttempt(n => n + 1)}
          />
        </section>

        {selectedPet && (
          <div aria-live="polite">
            {result ? (
              <div ref={resultRef} style={{ scrollMarginTop: 80 }}>
                <div className="result-head">
                  <div>
                    <h3>Kết quả đánh giá của bé {selectedPet.name}</h3>
                    <span className="timestamp">
                      {dayjs(result.createdAt).format('DD/MM/YYYY HH:mm')}
                    </span>
                  </div>
                  <Button icon={<PlusOutlined />} onClick={startNewCheck}>
                    Đánh giá lần khác
                  </Button>
                </div>
                <AiAssessmentResult
                  assessment={result}
                  onBook={serviceIds => book(result, serviceIds)}
                />
              </div>
            ) : (
              form
            )}
          </div>
        )}
      </FormPanel>

      <AiAssessmentHistory
        petId={selectedPetId}
        petName={selectedPet?.name}
        refreshKey={historyKey}
        onOpen={setDetailId}
      />

      <AiAssessmentDetailModal
        assessmentId={detailId}
        onClose={() => setDetailId(null)}
        onBook={(assessment, serviceIds) => {
          setDetailId(null);
          book(assessment, serviceIds);
        }}
      />
    </Root>
  );
};

export default AiAssessmentSection;
