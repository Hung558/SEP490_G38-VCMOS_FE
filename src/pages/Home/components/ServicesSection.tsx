import React, { useState } from 'react';
import styled from 'styled-components';
import { Input } from 'antd';
import {
  MedicineBoxOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  HeartOutlined,
  FileSearchOutlined,
  ScissorOutlined,
  SearchOutlined,
  ClockCircleOutlined,
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
  max-width: 780px;
  margin: 0 auto 40px auto;

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

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 36px;
  flex-wrap: wrap;

  .categories {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .cat-btn {
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease-in-out;

      &:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
      }

      &.active {
        background: #0d9488;
        border-color: #0d9488;
        color: #ffffff;
      }
    }
  }

  .search-wrap {
    width: 280px;

    @media (max-width: 640px) {
      width: 100%;
    }

    .ant-input-affix-wrapper {
      border-radius: 8px;
      border-color: #cbd5e1;
      height: 38px;
      &:hover,
      &:focus-within {
        border-color: #0d9488;
      }
    }
  }
`;

const ServicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ServiceCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.15s ease-in-out;
  position: relative;

  &:hover {
    border-color: #0d9488;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 18px;

    .icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #f0fdfa;
      color: #0d9488;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .meta-badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;

      .cat-badge {
        font-size: 11.5px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 9999px;
        background: #f1f5f9;
        color: #334155;
      }

      .duration-badge {
        font-size: 11px;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 3px;
      }
    }
  }

  h3 {
    font-size: 17px;
    font-weight: 750;
    color: #0f172a;
    margin: 0 0 8px 0;
    letter-spacing: -0.3px;
    line-height: 1.35;
  }

  p.desc {
    font-size: 13.5px;
    color: #64748b;
    line-height: 1.55;
    margin: 0 0 18px 0;
    min-height: 42px;
  }

  .inclusions-list {
    list-style: none;
    padding: 0;
    margin: 0 0 20px 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
    flex: 1;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: #334155;

      .check-icon {
        color: #10b981;
        font-size: 12px;
        flex-shrink: 0;
      }
    }
  }

  .card-footer {
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .price-box {
      .label {
        font-size: 11px;
        color: #94a3b8;
        display: block;
      }
      .price {
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
      }
    }

    .btn-select {
      background: transparent;
      border: 1px solid #e2e8f0;
      color: #0d9488;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;

      &:hover {
        background: #0d9488;
        border-color: #0d9488;
        color: #ffffff;
      }
    }
  }
`;

const EmptyNotice = styled.div`
  text-align: center;
  padding: 48px 16px;
  color: #64748b;
  font-size: 14.5px;
  grid-column: 1 / -1;
`;

interface ServicesSectionProps {
  onSelectService: (serviceName?: string) => void;
}

// Data directly extracted from VCMOS SRS Catalog
const servicesCatalog = [
  {
    id: 'exam-general',
    title: 'Khám Lâm Sàng Tổng Quát & Bệnh Án SOAP',
    category: 'Examination',
    categoryLabel: 'Khám bệnh',
    duration: '30 phút',
    basePrice: '150.000đ',
    icon: <MedicineBoxOutlined />,
    desc: 'Khám sàng lọc toàn diện các hệ cơ quan, ghi nhận sinh hiệu và thiết lập hồ sơ bệnh án SOAP điện tử chuẩn y khoa.',
    inclusions: [
      'Đo thân nhiệt, nghe tim phổi & huyết áp',
      'Đánh giá hệ tiêu hoá, da liễu & dinh dưỡng',
      'Lập bệnh án SOAP điện tử và đơn thuốc',
    ],
  },
  {
    id: 'vaccine-routine',
    title: 'Tiêm Chủng Vaccine & Ngừa Ký Sinh Trùng',
    category: 'Vaccination',
    categoryLabel: 'Tiêm chủng',
    duration: '20 phút',
    basePrice: '180.000đ',
    icon: <CheckCircleOutlined />,
    desc: 'Vaccine bảo quản chuẩn chuỗi lạnh GSP, phòng ngừa các bệnh truyền nhiễm nguy hiểm và sổ giun định kỳ.',
    inclusions: [
      'Vaccine 4 bệnh mèo / 7 bệnh chó chính hãng',
      'Tẩy giun đường ruột & nhỏ gáy ngừa ve rận',
      'Tự động đồng bộ lịch nhắc tiêm vào hệ thống',
    ],
  },
  {
    id: 'grooming-spa',
    title: 'Grooming Spa & Chăm Sóc Vệ Sinh Toàn Diện',
    category: 'Grooming',
    categoryLabel: 'Spa & Grooming',
    duration: '60 phút',
    basePrice: '250.000đ',
    icon: <ScissorOutlined />,
    desc: 'Dịch vụ spa tắm sấy, cắt tỉa thẩm mỹ chuẩn giống loài, kết hợp kiểm tra vệ sinh da tai móng chuyên sâu.',
    inclusions: [
      'Tắm sấy khử mùi & dưỡng lông thảo dược',
      'Vệ sinh tai, vắt tuyến hôi & cắt dũa móng',
      'Cắt tỉa tạo kiểu lông theo yêu cầu chủ nuôi',
    ],
  },
  {
    id: 'paraclinical-imaging',
    title: 'Chẩn Đoán Hình Ảnh: Siêu Âm & X-Quang Kỹ Thuật Số',
    category: 'Paraclinical',
    categoryLabel: 'Cận lâm sàng',
    duration: '30 phút',
    basePrice: '300.000đ',
    icon: <FileSearchOutlined />,
    desc: 'Thực hiện các chỉ định cận lâm sàng, chụp X-quang kỹ thuật số và siêu âm Doppler màu cho kết quả chính xác trong 30 phút.',
    inclusions: [
      'Siêu âm Doppler màu ổ bụng & tim mạch',
      'X-quang kỹ thuật số liều tia thấp an toàn',
      'Kết quả lưu trữ trực tiếp vào hồ sơ bệnh án',
    ],
  },
  {
    id: 'paraclinical-blood',
    title: 'Xét Nghiệm Sinh Lý & Sinh Hóa Máu Toàn Phần',
    category: 'Paraclinical',
    categoryLabel: 'Cận lâm sàng',
    duration: '25 phút',
    basePrice: '220.000đ',
    icon: <SafetyCertificateOutlined />,
    desc: 'Phân tích tế bào máu tự động, đánh giá chức năng gan thận, điện giải và sàng lọc kháng thể virus truyền nhiễm.',
    inclusions: [
      'Công thức máu toàn phần (CBC 18 chỉ số)',
      'Đánh giá chức năng gan thận (ALT, Creatinine)',
      'Bác sĩ phân tích và đối chiếu kết quả lâm sàng',
    ],
  },
  {
    id: 'inpatient-stay',
    title: 'Lưu Chuồng Điều Trị Nội Trú & Hồi Sức Tích Cực',
    category: 'Inpatient',
    categoryLabel: 'Nội trú',
    duration: 'Theo dõi 24/24',
    basePrice: '200.000đ / ngày',
    icon: <HeartOutlined />,
    desc: 'Khu nội trú vô trùng riêng biệt chó và mèo, có điều hòa khử khuẩn và bác sĩ trực theo dõi sinh hiệu liên tục.',
    inclusions: [
      'Lồng lưu trú vô trùng phân theo kích thước',
      'Ghi nhận nhật ký lâm sàng và dinh dưỡng hàng ngày',
      'Chủ nuôi theo dõi tiến trình hồi phục từ xa',
    ],
  },
];

const categoryTabs = [
  { key: 'ALL', label: 'Tất cả dịch vụ' },
  { key: 'Examination', label: 'Khám bệnh' },
  { key: 'Vaccination', label: 'Tiêm chủng' },
  { key: 'Grooming', label: 'Spa & Grooming' },
  { key: 'Paraclinical', label: 'Cận lâm sàng' },
  { key: 'Inpatient', label: 'Nội trú' },
];

const ServicesSection: React.FC<ServicesSectionProps> = ({
  onSelectService,
}) => {
  const { isLogin } = useIsLogin();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSelectService = (title?: string) => {
    if (!isLogin) {
      toast.info('Vui lòng đăng nhập để đặt dịch vụ cho thú cưng của bạn!');
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
    } else {
      onSelectService(title);
    }
  };

  const filteredServices = servicesCatalog.filter(service => {
    const matchCategory =
      selectedCategory === 'ALL' || service.category === selectedCategory;
    const matchSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <SectionWrapper id="services">
      <SectionHeader>
        <span className="section-tag">Dịch Vụ Phòng Khám VCMOS</span>
        <h2>Hệ Thống Dịch Vụ Lâm Sàng & Chăm Sóc VCMOS</h2>
        <p>
          Tất cả dịch vụ đều được chuẩn hoá quy trình y khoa, niêm yết biểu phí
          công khai và lưu trữ kết quả trực tiếp vào hồ sơ bệnh án điện tử của
          thú cưng.
        </p>
      </SectionHeader>

      <FilterBar>
        <div className="categories">
          {categoryTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`cat-btn ${selectedCategory === tab.key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="search-wrap">
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Tìm theo tên dịch vụ..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
      </FilterBar>

      <ServicesGrid>
        {filteredServices.length > 0 ? (
          filteredServices.map(item => (
            <ServiceCard key={item.id}>
              <div className="card-top">
                <div className="icon-box">{item.icon}</div>
                <div className="meta-badges">
                  <span className="cat-badge">{item.categoryLabel}</span>
                  <span className="duration-badge">
                    <ClockCircleOutlined /> {item.duration}
                  </span>
                </div>
              </div>

              <h3>{item.title}</h3>
              <p className="desc">{item.desc}</p>

              <ul className="inclusions-list">
                {item.inclusions.map((inc, idx) => (
                  <li key={idx}>
                    <CheckCircleOutlined className="check-icon" />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>

              <div className="card-footer">
                <div className="price-box">
                  <span className="label">Biểu phí niêm yết</span>
                  <span className="price">{item.basePrice}</span>
                </div>
                <button
                  type="button"
                  className="btn-select"
                  onClick={() => handleSelectService(item.title)}
                >
                  Đặt dịch vụ này{' '}
                  <ArrowRightOutlined style={{ fontSize: 11 }} />
                </button>
              </div>
            </ServiceCard>
          ))
        ) : (
          <EmptyNotice>
            Không tìm thấy dịch vụ nào phù hợp với từ khóa &quot;{searchQuery}
            &quot;. Vui lòng thử từ khóa khác.
          </EmptyNotice>
        )}
      </ServicesGrid>
    </SectionWrapper>
  );
};

export default ServicesSection;
