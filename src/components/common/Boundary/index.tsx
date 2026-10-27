import { Component, type ErrorInfo, type ReactNode } from 'react';
import styled from 'styled-components';
import { Button, Collapse, Tag } from 'antd';
import {
  ReloadOutlined,
  HomeOutlined,
  PhoneOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ROUTER from '@/routerMap/ROUTER';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #eff6ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const ErrorCard = styled.div`
  background: #ffffff;
  border-radius: 28px;
  max-width: 820px;
  width: 100%;
  padding: 50px 48px;
  box-shadow:
    0 25px 60px rgba(0, 77, 64, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(226, 232, 240, 0.8);
  text-align: center;
  animation: fadeIn 0.5s ease-out;

  @media (max-width: 640px) {
    padding: 32px 20px;
  }
`;

const TopPills = styled.div`
  display: inline-flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 9999px;
  gap: 4px;
  margin-bottom: 24px;

  .pill {
    padding: 6px 16px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: #00796b;
      color: #ffffff;
    }

    &:not(.active) {
      color: #64748b;
    }
  }
`;

const CatIllustration = styled.div`
  width: 130px;
  height: 130px;
  margin: 0 auto 16px auto;
  background: #e0f2fe;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  position: relative;
  box-shadow: 0 10px 25px rgba(2, 132, 199, 0.15);

  .tag-maintenance {
    position: absolute;
    top: -10px;
    background: #fef3c7;
    color: #b45309;
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 9999px;
    border: 1.5px solid #fde68a;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .tag-running {
    position: absolute;
    bottom: -10px;
    background: #e0f2f1;
    color: #00796b;
    font-size: 10px;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 9999px;
    border: 1.5px solid #b2dfdb;
    letter-spacing: 0.5px;
  }
`;

const AlertStatus = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #ef4444;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.8px;
  margin-top: 16px;
  margin-bottom: 8px;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto 32px auto;
  line-height: 1.6;
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 28px;

  .btn-reload {
    background: #00695c;
    border-color: #00695c;
    color: #ffffff;
    height: 46px;
    padding: 0 24px;
    border-radius: 12px;
    font-weight: 700;
    &:hover {
      background: #004d40 !important;
      border-color: #004d40 !important;
    }
  }

  .btn-safe {
    background: #f1f5f9;
    border-color: #e2e8f0;
    color: #1e293b;
    height: 46px;
    padding: 0 24px;
    border-radius: 12px;
    font-weight: 600;
    &:hover {
      background: #e2e8f0 !important;
    }
  }

  .btn-status {
    color: #00796b;
    font-weight: 600;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const DebugInfoPanel = styled.div`
  margin-bottom: 24px;
  text-align: left;

  .ant-collapse {
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }
`;

const EmergencyCard = styled.div`
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  gap: 20px;

  .content {
    display: flex;
    align-items: flex-start;
    gap: 14px;

    .icon-box {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #b45309;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .desc {
      font-size: 13px;
      color: #78350f;
      line-height: 1.5;

      strong {
        display: block;
        margin-bottom: 2px;
        color: #92400e;
      }
    }
  }

  .call-btn {
    flex-shrink: 0;
    background: #92400e;
    color: #ffffff;
    border: none;
    padding: 12px 20px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(146, 64, 14, 0.2);

    &:hover {
      background: #78350f;
      color: #ffffff;
    }
  }

  @media (max-width: 680px) {
    flex-direction: column;
    .call-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
    this.setState({ errorInfo: info });

    // Tự động tải lại trang nếu gặp lỗi chunk mismatch hoặc dynamic module import
    const isChunkError =
      error?.message &&
      (error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('dynamically imported module') ||
        error.message.includes('Loading chunk'));

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('chunk_reload_retry');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('chunk_reload_retry', String(now));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container>
          <ErrorCard>
            <TopPills>
              <div className="pill active">• Lỗi 500 - Máy chủ nội bộ</div>
              <div className="pill">• Lỗi 505 - Giao thức kết nối</div>
            </TopPills>

            <CatIllustration>
              <div className="tag-maintenance">• HỆ THỐNG BẢO TRÌ KHẨN</div>
              🐱
              <div className="tag-running">⚡ VCMOS-DIAG: RUNNING</div>
            </CatIllustration>

            <AlertStatus>
              <WarningOutlined /> HTTP STATUS: 500 SERVER ERROR
            </AlertStatus>

            <Title>500 - Hệ thống phòng khám đang gặp sự cố kỹ thuật</Title>
            <Subtitle>
              Máy chủ phòng khám đang được cấp cứu khẩn cấp. Đội ngũ kỹ thuật
              của VCMOS đã nhận được cảnh báo tự động và đang nhanh chóng khắc
              phục để không làm gián đoạn việc chăm sóc các bé thú cưng.
            </Subtitle>

            <ActionRow>
              <Button
                type="primary"
                className="btn-reload"
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
              >
                Thử tải lại trang
              </Button>

              <Button
                className="btn-safe"
                icon={<HomeOutlined />}
                onClick={() => {
                  window.location.href = ROUTER.HOME;
                }}
              >
                Về lại Trang an toàn
              </Button>

              <button
                type="button"
                className="btn-status"
                onClick={() => window.location.reload()}
              >
                Kiểm tra trạng thái máy chủ
              </button>
            </ActionRow>

            <DebugInfoPanel>
              <Collapse
                items={[
                  {
                    key: '1',
                    label: (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          <ToolOutlined
                            style={{ marginRight: 8, color: '#00796b' }}
                          />
                          Thông tin mã lỗi chi tiết - Dành cho Kỹ thuật viên &
                          Đội hỗ trợ IT lâm sàng
                        </span>
                        <Tag color="volcano">#VCMOS-ERR-88219</Tag>
                      </div>
                    ),
                    children: (
                      <pre
                        style={{
                          background: '#0f172a',
                          color: '#38bdf8',
                          padding: '16px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          overflow: 'auto',
                          maxHeight: '200px',
                        }}
                      >
                        {this.state.error?.stack ||
                          this.state.error?.message ||
                          'Internal Client Runtime Exception: Component rendered invalid state.'}
                      </pre>
                    ),
                  },
                ]}
              />
            </DebugInfoPanel>

            <EmergencyCard>
              <div className="content">
                <div className="icon-box">
                  <ExclamationCircleOutlined />
                </div>
                <div className="desc">
                  <strong>Lưu ý khẩn cấp về việc chăm sóc thú cưng:</strong>
                  Nếu thú cưng của bạn đang trong tình trạng nguy cấp cần cấp
                  cứu ngay, xin đừng chờ đợi hệ thống mà hãy gọi ngay đến đường
                  dây nóng Bác sĩ trực hoặc đưa bé đến trực tiếp phòng khám
                  VCMOS gần nhất.
                </div>
              </div>

              <a href="tel:0902099905" className="call-btn">
                <PhoneOutlined /> Gọi Bác sĩ trực: 0902.099.905
              </a>
            </EmergencyCard>
          </ErrorCard>
        </Container>
      );
    }

    return this.props.children;
  }
}
