import { Layout } from 'antd';
import { ShareAltOutlined, GlobalOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Footer } = Layout;

const StyledFooter = styled(Footer)`
  background-color: #e7eeff;
  padding: 32px;
  border-top: 1px solid #c5c5d3;
  margin-top: 96px;

  .footer-container {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      flex-direction: column;
      text-align: center;
    }
  }

  .footer-brand {
    display: flex;
    flex-direction: column;

    .brand-name {
      font-size: 24px;
      font-weight: 700;
      color: #00195c;
      margin-bottom: 8px;
    }

    .copyright {
      font-size: 12px;
      color: #444651;
    }
  }

  .footer-links {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
    justify-content: center;

    a {
      font-size: 12px;
      color: #444651;
      text-decoration: none;
      transition: color 0.2s;

      &:hover {
        color: #00195c;
      }
    }
  }

  .footer-social {
    display: flex;
    gap: 16px;

    .social-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #112e81;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.1);
      }
    }
  }
`;

const HomeFooter = () => {
  return (
    <StyledFooter>
      <div className="footer-container">
        <div className="footer-brand">
          <span className="brand-name">VCMOS Platform</span>
          <span className="copyright">
            © 2026 VCMOS System. All rights reserved.
          </span>
        </div>

        <div className="footer-links">
          <a href="#">Chính sách Bảo mật</a>
          <a href="#">Điều khoản Dịch vụ</a>
          <a href="#">Bản đồ Khuôn viên</a>
          <a href="#">Liên hệ Hỗ trợ</a>
        </div>

        <div className="footer-social">
          <div className="social-btn">
            <ShareAltOutlined />
          </div>
          <div className="social-btn">
            <GlobalOutlined />
          </div>
        </div>
      </div>
    </StyledFooter>
  );
};

export default HomeFooter;
