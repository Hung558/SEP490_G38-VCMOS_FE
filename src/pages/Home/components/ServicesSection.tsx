import React from 'react';
import styled from 'styled-components';
import {
  MedicineBoxOutlined,
  ScissorOutlined,
  ShoppingOutlined,
  CheckCircleFilled,
  ArrowRightOutlined,
} from '@ant-design/icons';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 40px 24px 80px 24px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 40px;
  gap: 20px;

  .left {
    .sub-tag {
      font-size: 12px;
      font-weight: 800;
      color: #00796b;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    h2 {
      font-size: 36px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 10px 0;
      letter-spacing: -0.6px;
    }

    p {
      font-size: 16px;
      color: #64748b;
      margin: 0;
    }
  }

  .right-tag {
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    background: #f1f5f9;
    padding: 6px 16px;
    border-radius: 9999px;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const ServiceCard = styled.div`
  background: #ffffff;
  border-radius: 28px;
  border: 1px solid #e2e8f0;
  padding: 36px 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 40px rgba(0, 77, 64, 0.08);
    border-color: #b2dfdb;
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;

    .icon-box {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  }

  &.med {
    .icon-box {
      background: #e0f2f1;
      color: #00796b;
    }
    .badge {
      background: #e0f2f1;
      color: #00796b;
    }
  }

  &.spa {
    .icon-box {
      background: #e0f7fa;
      color: #00838f;
    }
    .badge {
      background: #e0f7fa;
      color: #00838f;
    }
  }

  &.store {
    .icon-box {
      background: #fff8e1;
      color: #f57f17;
    }
    .badge {
      background: #fff8e1;
      color: #f57f17;
    }
  }

  h3 {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 10px 0;
  }

  .desc {
    font-size: 14px;
    color: #64748b;
    margin: 0 0 24px 0;
    line-height: 1.5;
  }

  .checklist {
    list-style: none;
    padding: 0;
    margin: 0 0 32px 0;

    li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13.5px;
      color: #334155;
      margin-bottom: 12px;
      line-height: 1.45;

      svg {
        color: #10b981;
        margin-top: 3px;
        flex-shrink: 0;
      }
    }
  }

  .cta-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14.5px;
    font-weight: 700;
    color: #00796b;
    text-decoration: none;
    transition: all 0.2s;

    &:hover {
      color: #004d40;
      gap: 12px;
    }
  }
`;

interface ServicesSectionProps {
  onSelectService?: (serviceName: string) => void;
}

const ServicesSection: React.FC<ServicesSectionProps> = ({
  onSelectService,
}) => {
  return (
    <SectionWrapper>
      <SectionHeader>
        <div className="left">
          <div className="sub-tag">
            <span>:::</span> HỆ SINH THÁI TOÀN DIỆN
          </div>
          <h2>Hệ Sinh Thái Dịch Vụ Khép Kín Cho Thú Cưng</h2>
          <p>
            Mọi nhu cầu từ y tế, chăm sóc sắc đẹp đến dinh dưỡng được tối ưu hóa
            chỉ trên một nền tảng.
          </p>
        </div>
        <div className="right-tag">Chuẩn Lâm Sàng Quốc Tế</div>
      </SectionHeader>

      <CardsGrid>
        {/* Card 1 */}
        <ServiceCard className="med">
          <div>
            <div className="card-top">
              <div className="icon-box">
                <MedicineBoxOutlined />
              </div>
              <span className="badge">Chuyên Khoa Y Tế</span>
            </div>

            <h3>Khám & Điều trị thú y</h3>
            <p className="desc">
              Chẩn đoán chuyên sâu với hệ thống trang thiết bị chẩn đoán hình
              ảnh và phòng mổ vô trùng áp lực dương.
            </p>

            <ul className="checklist">
              <li>
                <CheckCircleFilled /> Hồ sơ bệnh án điện tử trọn đời, đồng bộ đa
                cơ sở
              </li>
              <li>
                <CheckCircleFilled /> Siêu âm màu Doppler & Chụp X-quang kỹ
                thuật số HD
              </li>
              <li>
                <CheckCircleFilled /> Xét nghiệm sinh hóa máu tự động 32 chỉ số
                trong 15p
              </li>
              <li>
                <CheckCircleFilled /> Tiêm chủng định kỳ & Sổ tiêm chủng số nhắc
                lịch tự động
              </li>
            </ul>
          </div>

          <a
            href="#booking"
            className="cta-link"
            onClick={e => {
              e.preventDefault();
              onSelectService?.('Khám & Điều trị');
            }}
          >
            Xem quy trình khám bệnh <ArrowRightOutlined />
          </a>
        </ServiceCard>

        {/* Card 2 */}
        <ServiceCard className="spa">
          <div>
            <div className="card-top">
              <div className="icon-box">
                <ScissorOutlined />
              </div>
              <span className="badge">Chăm Sóc Sắc Đẹp</span>
            </div>

            <h3>Spa & Cắt tỉa Grooming</h3>
            <p className="desc">
              Quy trình spa 10 bước chuẩn Nhật Bản, sử dụng dầu tắm hữu cơ an
              toàn cho làn da nhạy cảm của thú cưng.
            </p>

            <ul className="checklist">
              <li>
                <CheckCircleFilled /> Vệ sinh tai, cắt mài móng, vắt tuyến hôi
                không đau
              </li>
              <li>
                <CheckCircleFilled /> Tắm sấy dưỡng lông thảo mộc phục hồi hư
                tổn
              </li>
              <li>
                <CheckCircleFilled /> Cắt tỉa lông tạo kiểu chuẩn thẩm mỹ Hàn -
                Nhật
              </li>
              <li>
                <CheckCircleFilled /> Khách sạn thú cưng chuẩn 5 sao có camera
                quan sát 24/7
              </li>
            </ul>
          </div>

          <a
            href="#booking"
            className="cta-link"
            onClick={e => {
              e.preventDefault();
              onSelectService?.('Spa & Grooming');
            }}
          >
            Bảng giá dịch vụ Spa <ArrowRightOutlined />
          </a>
        </ServiceCard>

        {/* Card 3 */}
        <ServiceCard className="store">
          <div>
            <div className="card-top">
              <div className="icon-box">
                <ShoppingOutlined />
              </div>
              <span className="badge">Y Tế & Dinh Dưỡng</span>
            </div>

            <h3>Dinh dưỡng & Phụ kiện</h3>
            <p className="desc">
              Cung cấp thuốc đặc trị, gel dinh dưỡng, thức ăn hạt nhập khẩu
              chính ngạch có tem kiểm định thú y.
            </p>

            <ul className="checklist">
              <li>
                <CheckCircleFilled /> Thuốc kê đơn & Thực phẩm chức năng chính
                hãng nhập khẩu
              </li>
              <li>
                <CheckCircleFilled /> Thức ăn hạt, pate dinh dưỡng chuyên biệt
                theo giống loài
              </li>
              <li>
                <CheckCircleFilled /> Cát vệ sinh khử mùi tự nhiên, phụ kiện dây
                dắt cao cấp
              </li>
              <li>
                <CheckCircleFilled /> Đồ chơi kích thích phát triển giác quan và
                vận động
              </li>
            </ul>
          </div>

          <a
            href="#booking"
            className="cta-link"
            onClick={e => {
              e.preventDefault();
              onSelectService?.('Dinh dưỡng');
            }}
          >
            Khám phá quầy thuốc & phụ kiện <ArrowRightOutlined />
          </a>
        </ServiceCard>
      </CardsGrid>
    </SectionWrapper>
  );
};

export default ServicesSection;
