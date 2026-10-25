import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Select, Tag } from 'antd';
import {
  FileTextOutlined,
  AlertOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  SendOutlined,
  UploadOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 64px 24px 80px 24px;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 800px;
  margin: 0 auto 36px auto;

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

// Mandatory Medical Disclaimer Banner MSG33 from SRS
const DisclaimerBanner = styled.div`
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #0d9488;
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13.5px;
  color: #334155;

  .banner-icon {
    font-size: 18px;
    color: #0d9488;
    flex-shrink: 0;
  }

  strong {
    color: #0f172a;
  }
`;

const AssessmentContainer = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  padding: 32px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 36px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    padding: 24px;
  }
`;

const FormPane = styled.div`
  display: flex;
  flex-direction: column;

  .field-label {
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;

    .sub {
      font-size: 12px;
      font-weight: 400;
      color: #64748b;
    }
  }

  .pet-selector-row {
    margin-bottom: 20px;
    .ant-select {
      width: 100%;
    }
  }

  .symptom-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 22px;
  }

  .photo-upload-box {
    border: 1.5px dashed #cbd5e1;
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    background: #f8fafc;
    margin-bottom: 20px;
    transition: all 0.15s;

    &:hover {
      border-color: #0d9488;
      background: #f0fdfa;
    }

    .upload-hint {
      font-size: 13px;
      color: #475569;
      margin-top: 6px;
    }
    .upload-spec {
      font-size: 11.5px;
      color: #94a3b8;
      margin-top: 2px;
    }
  }

  .notes-box {
    margin-bottom: 24px;
    .ant-input {
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 13.5px;
      &:focus {
        border-color: #0d9488;
      }
    }
    .char-count {
      text-align: right;
      font-size: 11.5px;
      color: #94a3b8;
      margin-top: 4px;
    }
  }

  .btn-submit-assessment {
    background: #0d9488;
    border-color: #0d9488;
    color: #ffffff;
    height: 44px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    &:hover {
      background: #0f766e !important;
      border-color: #0f766e !important;
    }
  }
`;

const SymptomButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${props => (props.$active ? '#0d9488' : '#e2e8f0')};
  background: ${props => (props.$active ? '#f0fdfa' : '#ffffff')};
  color: ${props => (props.$active ? '#0d9488' : '#334155')};
  font-size: 13px;
  font-weight: ${props => (props.$active ? '600' : '500')};
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover {
    border-color: #0d9488;
  }
`;

const ResultPane = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 24px;
  display: flex;
  flex-direction: column;

  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 18px;

    .title {
      font-size: 14px;
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

  .urgency-badge-box {
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 18px;

    &.urgent {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      color: #991b1b;
    }
    &.monitor {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      color: #92400e;
    }
    &.routine {
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      color: #0f766e;
    }

    .level-title {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .level-desc {
      font-size: 13px;
      line-height: 1.5;
      opacity: 0.95;
    }
  }

  .clinical-insights {
    margin-bottom: 20px;
    flex: 1;

    h4 {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .causes-list,
    .advice-list {
      list-style: none;
      padding: 0;
      margin: 0 0 14px 0;
      display: flex;
      flex-direction: column;
      gap: 6px;

      li {
        font-size: 12.5px;
        color: #475569;
        display: flex;
        align-items: flex-start;
        gap: 7px;
        line-height: 1.5;

        .bullet {
          color: #0d9488;
          font-weight: 700;
        }
      }
    }
  }

  .btn-book-from-assessment {
    background: #0d9488;
    color: #ffffff;
    border: none;
    height: 42px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    transition: all 0.15s;
    margin-bottom: 16px;

    &:hover {
      background: #0f766e;
    }
  }

  .history-box {
    border-top: 1px solid #e2e8f0;
    padding-top: 14px;

    .history-title {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #334155;
      padding: 5px 0;
    }
  }
`;

// Official Symptom Checklist from VCMOS SRS
const officialSymptomList = [
  { id: 'lethargy', label: 'Ủ rũ / Mệt mỏi (Lethargy)' },
  { id: 'vomiting', label: 'Nôn mửa (Vomiting)' },
  { id: 'diarrhoea', label: 'Tiêu chảy (Diarrhoea)' },
  { id: 'loss_of_appetite', label: 'Chán ăn / Bỏ ăn (Loss of appetite)' },
  { id: 'scratching', label: 'Gãi nhiều / Ngứa da (Scratching)' },
  { id: 'coughing', label: 'Ho / Khò khè (Coughing)' },
  { id: 'limping', label: 'Đi khập khiễng (Limping)' },
];

interface AiAssessmentSectionProps {
  onBookAppointment: (notes?: string) => void;
}

const AiAssessmentSection: React.FC<AiAssessmentSectionProps> = ({
  onBookAppointment,
}) => {
  const { isLogin } = useIsLogin();
  const [selectedPet, setSelectedPet] = useState<string>('milo');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'vomiting',
    'loss_of_appetite',
  ]);
  const [description, setDescription] = useState<string>(
    'Bé Milo (Poodle, 5.2kg) nôn dịch bọt trắng 2 lần sáng nay, bỏ bữa và có dấu hiệu mệt mỏi.'
  );
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [urgencyLevel, setUrgencyLevel] = useState<
    'Routine' | 'Monitor' | 'Urgent'
  >('Monitor');

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAnalyze = () => {
    if (description.trim().length < 10) {
      toast.error('Vui lòng nhập mô tả triệu chứng ít nhất 10 ký tự');
      return;
    }

    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      // Determine urgency level according to clinical rules
      if (
        selectedSymptoms.includes('vomiting') &&
        selectedSymptoms.includes('diarrhoea')
      ) {
        setUrgencyLevel('Urgent');
      } else if (selectedSymptoms.length >= 2) {
        setUrgencyLevel('Monitor');
      } else {
        setUrgencyLevel('Routine');
      }
      toast.success('Đã hoàn tất phân tích tham khảo sơ bộ');
    }, 700);
  };

  const handleBookFromAssessment = () => {
    if (!isLogin) {
      toast.info(
        'Vui lòng đăng nhập để lưu thông tin sàng lọc vào lịch khám của thú cưng!'
      );
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
      return;
    }
    const summaryNotes = `[Sàng lọc tham khảo - Mức độ: ${urgencyLevel}] Triệu chứng: ${selectedSymptoms.join(', ')}. Ghi chú: ${description}`;
    toast.success('Đã chuyển thông tin vào ghi chú đặt lịch hẹn!');
    onBookAppointment(summaryNotes);
  };

  return (
    <SectionWrapper id="triage">
      <SectionHeader>
        <span className="section-tag">Tham Khảo Sơ Bộ Triệu Chứng</span>
        <h2>Sàng Lọc & Đánh Giá Triệu Chứng Thú Cưng Ban Đầu</h2>
        <p>
          Hệ thống tiếp nhận thông tin lâm sàng và đối chiếu dữ liệu hỗ trợ chủ
          nuôi nhận biết mức độ khẩn cấp, đưa ra hướng dẫn sơ cứu đúng phác đồ
          trước khi đưa bé đến khám.
        </p>
      </SectionHeader>

      {/* Medical Disclaimer Banner */}
      <DisclaimerBanner>
        <InfoCircleOutlined className="banner-icon" />
        <div>
          <strong>Khuyến cáo pháp lý & y khoa:</strong> Kết quả đánh giá tham
          khảo sơ bộ không thay thế chẩn đoán lâm sàng của bác sĩ thú y. Khi
          nhận thấy thú cưng có dấu hiệu suy kiệt cấp tính, vui lòng đưa bé đến
          cơ sở y tế thú y gần nhất hoặc gọi hotline phòng khám{' '}
          <strong>(024) 7300 8888</strong>.
        </div>
      </DisclaimerBanner>

      <AssessmentContainer>
        {/* Form Pane */}
        <FormPane>
          <div className="field-label">
            <SafetyCertificateOutlined style={{ color: '#0d9488' }} />
            1. Chọn thú cưng <span className="sub">(từ hồ sơ của bạn)</span>
          </div>
          <div className="pet-selector-row">
            <Select
              value={selectedPet}
              onChange={val => setSelectedPet(val)}
              options={[
                {
                  value: 'milo',
                  label: 'Bé Milo · Chó Poodle (5.2 kg · 3 tuổi · Đực)',
                },
                {
                  value: 'miu',
                  label: 'Bé Miu · Mèo Anh lông ngắn (4.0 kg · 2 tuổi · Cái)',
                },
                { value: 'new', label: '+ Thêm thú cưng mới vào hồ sơ' },
              ]}
              size="large"
            />
          </div>

          <div className="field-label">
            <AlertOutlined style={{ color: '#0d9488' }} />
            2. Danh mục dấu hiệu nhận biết{' '}
            <span className="sub">(Dấu hiệu phổ biến)</span>
          </div>
          <div className="symptom-grid">
            {officialSymptomList.map(sym => {
              const active = selectedSymptoms.includes(sym.id);
              return (
                <SymptomButton
                  key={sym.id}
                  type="button"
                  $active={active}
                  onClick={() => toggleSymptom(sym.id)}
                >
                  {active && <CheckOutlined style={{ fontSize: 11 }} />}
                  {sym.label}
                </SymptomButton>
              );
            })}
          </div>

          <div className="field-label">
            <UploadOutlined style={{ color: '#0d9488' }} />
            3. Ảnh chụp vùng bệnh / Biểu hiện{' '}
            <span className="sub">(Tối đa 3 ảnh, dung lượng dưới 5MB)</span>
          </div>
          <div className="photo-upload-box">
            <Button icon={<UploadOutlined />} size="middle">
              Tải ảnh lên (Tối đa 3 ảnh JPG / PNG)
            </Button>
            <div className="upload-hint">
              Chụp rõ vùng da, niêm mạc mắt hoặc chất bài tiết nghi ngờ bất
              thường
            </div>
            <div className="upload-spec">
              Dung lượng tối đa 5MB mỗi ảnh theo quy chuẩn y tế
            </div>
          </div>

          <div className="field-label">
            <FileTextOutlined style={{ color: '#0d9488' }} />
            4. Mô tả chi tiết triệu chứng{' '}
            <span className="sub">(Từ 10 - 1000 ký tự)</span>
          </div>
          <div className="notes-box">
            <Input.TextArea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Nhập thời gian xuất hiện triệu chứng, biểu hiện ăn uống, đi lại của bé..."
            />
            <div className="char-count">{description.length}/1000 ký tự</div>
          </div>

          <Button
            type="primary"
            className="btn-submit-assessment"
            icon={<SendOutlined />}
            loading={analyzing}
            onClick={handleAnalyze}
          >
            {analyzing
              ? 'Đang đối chiếu dữ liệu y khoa...'
              : 'Phân tích tham khảo sơ bộ'}
          </Button>
        </FormPane>

        {/* Result Pane */}
        <ResultPane>
          <div className="result-header">
            <div className="title">
              <FileTextOutlined /> Kết Quả Phân Tầng Lâm Sàng
            </div>
            <div className="timestamp">Thời điểm: Hôm nay, 14:15</div>
          </div>

          {/* Urgency Level Box: Routine, Monitor, Urgent */}
          {urgencyLevel === 'Urgent' && (
            <div className="urgency-badge-box urgent">
              <div className="level-title">
                <ExclamationCircleOutlined /> MỨC ĐỘ: URGENT (KHẨN CẤP)
              </div>
              <div className="level-desc">
                Phát hiện dấu hiệu cảnh báo tiêu hoá hoặc bài tiết cấp. Cần đưa
                bé đến cơ sở thú y trong thời gian sớm nhất để kiểm tra sinh
                hiệu.
              </div>
            </div>
          )}

          {urgencyLevel === 'Monitor' && (
            <div className="urgency-badge-box monitor">
              <div className="level-title">
                <AlertOutlined /> MỨC ĐỘ: MONITOR (CẦN THEO DÕI)
              </div>
              <div className="level-desc">
                Triệu chứng có thể là phản ứng tiêu hoá thức ăn hoặc khởi phát
                nhiễm khuẩn. Khuyến cáo đặt hẹn khám chuyên khoa trong vòng 24 -
                48 giờ.
              </div>
            </div>
          )}

          {urgencyLevel === 'Routine' && (
            <div className="urgency-badge-box routine">
              <div className="level-title">
                <CheckCircleOutlined /> MỨC ĐỘ: ROUTINE (THÔNG THƯỜNG)
              </div>
              <div className="level-desc">
                Chưa ghi nhận dấu hiệu nguy hiểm tức thời. Giữ ấm, theo dõi
                lượng nước uống và đặt hẹn kiểm tra sức khoẻ định kỳ.
              </div>
            </div>
          )}

          {/* Clinical Insights & Home Care Guidance */}
          <div className="clinical-insights">
            <h4>Nguyên nhân khả dĩ cần lưu ý:</h4>
            <ul className="causes-list">
              <li>
                <span className="bullet">•</span>
                <span>
                  Rối loạn tiêu hoá do thức ăn lạ, viêm dạ dày ruột cấp tính
                  nhẹ.
                </span>
              </li>
              <li>
                <span className="bullet">•</span>
                <span>
                  Nghi nhiễm ký sinh trùng đường ruột hoặc thay đổi môi trường
                  gây stress.
                </span>
              </li>
            </ul>

            <h4>Hướng dẫn chăm sóc tại nhà & sơ cứu an toàn:</h4>
            <ul className="advice-list">
              <li>
                <span className="bullet">•</span>
                <span>
                  Tạm ngưng cho ăn thức ăn hạt trong 4 - 6 giờ, chỉ cung cấp
                  nước sạch từng lượng nhỏ.
                </span>
              </li>
              <li>
                <span className="bullet">•</span>
                <span>
                  Tuyệt đối không tự ý cho uống thuốc giảm đau hạ sốt của người
                  (như Paracetamol).
                </span>
              </li>
              <li>
                <span className="bullet">•</span>
                <span>
                  Cách ly bé ở khu vực yên tĩnh, thoáng khí và chụp ảnh theo dõi
                  chất nôn nếu có.
                </span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="btn-book-from-assessment"
            onClick={handleBookFromAssessment}
          >
            <CalendarOutlined /> Đặt lịch khám với thông tin này
          </button>

          <div className="history-box">
            <div className="history-title">
              <HistoryOutlined /> Lịch sử đánh giá của bé Milo
            </div>
            <div className="history-item">
              <span>24/10/2026 · Nôn nhẹ sau ăn</span>
              <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                Monitor
              </Tag>
            </div>
            <div className="history-item">
              <span>10/09/2026 · Kiểm tra thể trạng</span>
              <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                Routine
              </Tag>
            </div>
          </div>
        </ResultPane>
      </AssessmentContainer>
    </SectionWrapper>
  );
};

export default AiAssessmentSection;
