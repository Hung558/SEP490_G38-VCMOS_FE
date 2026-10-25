import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Tag } from 'antd';
import {
  ThunderboltFilled,
  UploadOutlined,
  SendOutlined,
  UserSwitchOutlined,
  CalendarOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { toast } from 'sonner';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 40px 24px 80px 24px;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 840px;
  margin: 0 auto 40px auto;

  .ai-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    background: #e0f2f1;
    color: #00796b;
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  h2 {
    font-size: 34px;
    font-weight: 900;
    color: #0f172a;
    margin: 0 0 12px 0;
    letter-spacing: -0.6px;
  }

  p {
    font-size: 16px;
    color: #64748b;
    margin: 0;
    line-height: 1.6;
  }
`;

const AiCardContainer = styled.div`
  background: #ffffff;
  border-radius: 32px;
  border: 1px solid #ccfbf1;
  box-shadow: 0 20px 60px rgba(0, 121, 107, 0.08);
  padding: 36px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    padding: 24px;
  }
`;

const LeftPane = styled.div`
  display: flex;
  flex-direction: column;

  .pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .step-pill {
      font-size: 11.5px;
      font-weight: 700;
      color: #00796b;
      background: #e0f2f1;
      padding: 3px 10px;
      border-radius: 9999px;
    }
  }

  .upload-box {
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
    border-radius: 20px;
    padding: 32px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 20px;

    &:hover {
      border-color: #00796b;
      background: #f0fdfa;
    }

    .icon-upload {
      font-size: 32px;
      color: #00796b;
      margin-bottom: 10px;
    }

    .upload-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .upload-desc {
      font-size: 12px;
      color: #64748b;
    }
  }

  .chips-title {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 10px;
  }

  .chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 24px;
  }

  .chat-input-box {
    display: flex;
    gap: 10px;
    margin-top: auto;

    .ant-input {
      border-radius: 14px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      padding: 10px 16px;
    }

    .btn-send {
      background: #00695c;
      border-color: #00695c;
      height: auto;
      border-radius: 14px;
      padding: 0 20px;
      &:hover {
        background: #004d40 !important;
      }
    }
  }
`;

const Chip = styled.button<{ $active: boolean }>`
  border: 1px solid ${props => (props.$active ? '#00796b' : '#e2e8f0')};
  background: ${props => (props.$active ? '#00695c' : '#ffffff')};
  color: ${props => (props.$active ? '#ffffff' : '#334155')};
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #00796b;
  }
`;

const RightPane = styled.div`
  background: #f8fafc;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  padding: 28px;
  display: flex;
  flex-direction: column;

  .model-tag {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    .label {
      font-size: 12px;
      font-weight: 800;
      color: #00796b;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .model-code {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
  }

  .diagnosis-card {
    background: #ffffff;
    border-radius: 18px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    margin-bottom: 20px;

    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      h4 {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
      }

      .match-tag {
        background: #e0f2f1;
        color: #00796b;
        font-weight: 700;
        border-radius: 9999px;
        border: none;
        padding: 3px 10px;
      }
    }

    .desc {
      font-size: 13.5px;
      color: #475569;
      line-height: 1.5;
      margin: 0;
    }
  }

  .advice-box {
    background: #ffffff;
    border-radius: 18px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    margin-bottom: 24px;

    h5 {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px 0;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        font-size: 13px;
        color: #334155;
        margin-bottom: 8px;
        line-height: 1.5;

        &:last-child {
          margin-bottom: 0;
          color: #dc2626;
          font-weight: 600;
        }
      }
    }
  }

  .btn-row {
    display: flex;
    gap: 12px;
    margin-top: auto;

    .btn-transfer {
      flex: 1;
      height: 44px;
      border-radius: 12px;
      border: 1.5px solid #00796b;
      color: #00796b;
      font-weight: 700;
      background: #ffffff;
      &:hover {
        background: #f0fdfa !important;
        border-color: #004d40 !important;
        color: #004d40 !important;
      }
    }

    .btn-book {
      flex: 1;
      height: 44px;
      border-radius: 12px;
      background: #00695c;
      border-color: #00695c;
      color: #ffffff;
      font-weight: 700;
      &:hover {
        background: #004d40 !important;
      }
    }

    @media (max-width: 600px) {
      flex-direction: column;
    }
  }
`;

const DisclaimerAlert = styled.div`
  margin-top: 24px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 18px;
  padding: 16px 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;

  svg {
    font-size: 18px;
    color: #f59e0b;
    margin-top: 2px;
    flex-shrink: 0;
  }
`;

interface AiAssessmentSectionProps {
  onBookAppointment?: () => void;
}

const AiAssessmentSection: React.FC<AiAssessmentSectionProps> = ({
  onBookAppointment,
}) => {
  const [selectedChips, setSelectedChips] = useState<string[]>([
    'Ngứa gãi rụng lông',
  ]);
  const [inputText, setInputText] = useState(
    'Bé gãi tai liên tục 2 hôm nay, xuất hiện mảng đỏ sau gáy...'
  );

  const chips = [
    'Bé bỏ ăn, mệt mỏi',
    'Ngứa gãi rụng lông',
    'Nôn mửa tiêu chảy',
    'Sốt, ho, thở khò khè',
  ];

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    toast.success('Đã gửi thông tin cho trợ lý AI phân tích!');
  };

  return (
    <SectionWrapper id="ai-assistant">
      <SectionHeader>
        <div className="ai-tag">
          <ThunderboltFilled /> VCMOS SMART AI CLINIC ASSISTANT
        </div>
        <h2>Trợ Lý Ảo AI Sàng Lọc & Tư Vấn Sức Khỏe Thú Cưng Sơ Bộ</h2>
        <p>
          Ứng dụng trí tuệ nhân tạo nhận diện biểu hiện qua hình ảnh và đối
          thoại triệu chứng tức thì, hỗ trợ ba mẹ xử lý kịp thời trước khi đến
          phòng khám.
        </p>
      </SectionHeader>

      <AiCardContainer>
        {/* Left: Input */}
        <LeftPane>
          <div className="pane-header">
            <h3>Mô tả triệu chứng của bé</h3>
            <span className="step-pill">Bước 1/2</span>
          </div>

          <div
            className="upload-box"
            onClick={() =>
              toast.info('Tính năng tải ảnh cận cảnh vết thương sẵn sàng.')
            }
          >
            <UploadOutlined className="icon-upload" />
            <div className="upload-title">Tải lên ảnh chụp vùng tổn thương</div>
            <div className="upload-desc">
              Da kích ứng, mắt, tai, nốt đỏ hoặc phân bất thường (PNG, JPG)
            </div>
          </div>

          <div className="chips-title">
            Bấm chọn nhanh các biểu hiện phổ biến:
          </div>
          <div className="chips-row">
            {chips.map(chip => (
              <Chip
                key={chip}
                $active={selectedChips.includes(chip)}
                onClick={() => toggleChip(chip)}
              >
                {chip}
              </Chip>
            ))}
          </div>

          <div className="chat-input-box">
            <Input
              size="large"
              placeholder="Nhập chi tiết biểu hiện của bé..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onPressEnter={handleSend}
            />
            <Button
              type="primary"
              className="btn-send"
              icon={<SendOutlined />}
              onClick={handleSend}
            />
          </div>
        </LeftPane>

        {/* Right: Output Result */}
        <RightPane>
          <div className="model-tag">
            <div className="label">
              <span style={{ fontSize: 16 }}>•</span> KẾT QUẢ PHÂN TÍCH THỜI
              GIAN THỰC
            </div>
            <div className="model-code">Model: VetAI-v4.2 (Gemini)</div>
          </div>

          <div className="diagnosis-card">
            <div className="top">
              <h4>Viêm da dị ứng thời tiết</h4>
              <Tag className="match-tag">Độ tương đồng 88%</Tag>
            </div>
            <p className="desc">
              Biểu hiện ngứa cục bộ, rụng lông viền tai và đỏ rát phù hợp với
              phản ứng viêm da tiếp xúc hoặc nấm men giai đoạn đầu.
            </p>
          </div>

          <div className="advice-box">
            <h5>Khuyến nghị sơ cứu ban đầu:</h5>
            <ul>
              <li>• Giữ bé ở nơi khô ráo, thoáng mát (nhiệt độ 24-26°C).</li>
              <li>
                • Đeo vòng cổ chống liếm (loa Elizabeth) để tránh bé cào xước
                gây nhiễm trùng thứ cấp.
              </li>
              <li>• KHÔNG tự ý bôi thuốc corticoid của người lên da bé.</li>
            </ul>
          </div>

          <div className="btn-row">
            <Button
              className="btn-transfer"
              icon={<UserSwitchOutlined />}
              onClick={() =>
                toast.success('Đã lưu kết quả vào hồ sơ và chuyển bác sĩ trực!')
              }
            >
              Chuyển hồ sơ sang bác sĩ trực
            </Button>

            <Button
              type="primary"
              className="btn-book"
              icon={<CalendarOutlined />}
              onClick={onBookAppointment}
            >
              Đặt hẹn khám ưu tiên
            </Button>
          </div>
        </RightPane>
      </AiCardContainer>

      <DisclaimerAlert>
        <ExclamationCircleFilled />
        <div>
          <strong>LƯU Ý Y TẾ QUAN TRỌNG:</strong> Kết quả phân tích từ AI chỉ
          mang tính chất tham khảo sơ bộ và hỗ trợ phân loại mức độ khẩn cấp,
          hoàn toàn không thay thế cho chẩn đoán lâm sàng của Bác sĩ thú y. Vui
          lòng mang thú cưng đến cơ sở VCMOS gần nhất ngay lập tức nếu phát hiện
          các triệu chứng cấp tính như co giật, khó thở, hoặc hôn mê!
        </div>
      </DisclaimerAlert>
    </SectionWrapper>
  );
};

export default AiAssessmentSection;
