import { Layout } from 'antd';
import {
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';

const { Footer } = Layout;

const StyledFooter = styled(Footer)`
  background-color: #ffffff;
  padding: 64px 32px 32px 32px;
  border-top: 1px solid #e2e8f0;
  margin-top: 60px;
  color: #475569;

  .footer-container {
    max-width: 1240px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
    gap: 48px;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr 1fr;
      gap: 36px;
    }

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
      gap: 32px;
    }
  }

  .col-brand {
    .brand-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;

      .logo-box {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        background-color: #0d9488;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
      }

      .brand-title {
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
      }
    }

    p {
      font-size: 14px;
      line-height: 1.6;
      color: #64748b;
      margin-bottom: 20px;
    }

    .license-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #0f766e;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 500;
    }
  }

  .col-links {
    h4 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 18px;
      letter-spacing: -0.2px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;

      li a {
        color: #64748b;
        font-size: 14px;
        text-decoration: none;
        transition: color 0.15s;

        &:hover {
          color: #0d9488;
        }
      }
    }
  }

  .col-contact {
    h4 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 18px;
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 13.5px;
      color: #475569;

      .item {
        display: flex;
        align-items: flex-start;
        gap: 10px;

        .icon {
          color: #0d9488;
          margin-top: 3px;
        }
      }
    }
  }

  .bottom-bar {
    max-width: 1240px;
    margin: 48px auto 0 auto;
    padding-top: 24px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: #94a3b8;

    .policy-links {
      display: flex;
      gap: 20px;

      a {
        color: #64748b;
        text-decoration: none;
        &:hover {
          color: #0d9488;
        }
      }
    }
  }
`;

const HomeFooter = () => {
  return (
    <StyledFooter>
      <div className="footer-container">
        {/* Brand */}
        <div className="col-brand">
          <div className="brand-header">
            <div className="logo-box">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <ellipse cx="12" cy="16" rx="4.5" ry="3.5" />
                <ellipse cx="6" cy="9" rx="2" ry="2.5" />
                <ellipse cx="9.5" cy="4.5" rx="1.7" ry="2.2" />
                <ellipse cx="14.5" cy="4.5" rx="1.7" ry="2.2" />
                <ellipse cx="18" cy="9" rx="2" ry="2.5" />
              </svg>
            </div>
            <span className="brand-title">VCMOS Clinic</span>
          </div>
          <p>
            Hệ thống Bệnh viện & Phòng khám Thú y VCMOS. Cung cấp dịch vụ chăm
            sóc y khoa toàn diện, chẩn đoán kỹ thuật số hiện đại và phác đồ điều
            trị minh bạch.
          </p>
          <div className="license-badge">
            <SafetyCertificateOutlined />
            <span>Giấy phép hoạt động ngành thú y số 48/GCN-TY</span>
          </div>
        </div>

        {/* Dịch vụ y khoa */}
        <div className="col-links">
          <h4>Dịch vụ Chuyên khoa</h4>
          <ul>
            <li>
              <a href="#services">Khám & Điều trị Đa khoa</a>
            </li>
            <li>
              <a href="#services">Chẩn đoán Hình ảnh & Xét nghiệm</a>
            </li>
            <li>
              <a href="#services">Phẫu thuật Ngoại khoa & Triệt sản</a>
            </li>
            <li>
              <a href="#services">Tiêm chủng & Sổ giun định kỳ</a>
            </li>
            <li>
              <a href="#services">Hồi sức Tích cực & Nội trú</a>
            </li>
            <li>
              <a href="#services">Spa Grooming & Tắm sấy thẩm mỹ</a>
            </li>
          </ul>
        </div>

        {/* Hướng dẫn chủ nuôi */}
        <div className="col-links">
          <h4>Chủ nuôi & Phòng khám</h4>
          <ul>
            <li>
              <a href="#services">Dịch vụ & Bảng phân loại chuyên khoa</a>
            </li>
            <li>
              <a href="#quick-booking">Quy trình tiếp nhận & Bảng giá</a>
            </li>
            <li>
              <a href="#doctors">Lịch trực Đội ngũ Bác sĩ</a>
            </li>
            <li>
              <a href="#community">Hồ sơ ca bệnh hồi phục thực tế</a>
            </li>
            <li>
              <a href="#quick-booking">Hướng dẫn chăm sóc thú cưng</a>
            </li>
          </ul>
        </div>

        {/* Thông tin liên hệ */}
        <div className="col-contact">
          <h4>Thông tin liên hệ</h4>
          <div className="contact-list">
            <div className="item">
              <PhoneOutlined className="icon" />
              <div>
                <strong>Hotline phòng khám:</strong> (024) 7300 8888
              </div>
            </div>
            <div className="item">
              <ClockCircleOutlined className="icon" />
              <div>
                <strong>Giờ mở cửa:</strong> 08:00 - 20:00 (Tất cả các ngày
                trong tuần)
              </div>
            </div>
            <div className="item">
              <EnvironmentOutlined className="icon" />
              <div>
                <strong>Địa chỉ:</strong> Khu Công nghệ cao Hòa Lạc, Thạch Thất,
                Hà Nội
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <div>© 2026 VCMOS - Hệ thống quản lý phòng khám thú y.</div>
        <div className="policy-links">
          <a href="#">Quy định bảo mật bệnh án</a>
          <a href="#">Cam kết chất lượng điều trị</a>
          <a href="#">Chính sách viện phí</a>
        </div>
      </div>
    </StyledFooter>
  );
};

export default HomeFooter;
