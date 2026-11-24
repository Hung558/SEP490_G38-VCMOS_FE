import { Alert, Button } from 'antd';
import {
  EditOutlined,
  LoginOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import { useCommunityViewer } from '@/components/community/useCommunityViewer';
import { IntroWrapper } from './styles';

/** Page title plus what the viewer's role may do in the community */
const CommunityIntro = () => {
  const navigate = useNavigate();
  const viewer = useCommunityViewer();

  return (
    <>
      <IntroWrapper>
        <div>
          <span className="intro-tag">Cộng đồng</span>
          <h1>Cộng đồng chủ nuôi VCMOS</h1>
        </div>
        <div className="intro-actions">
          {viewer.canInteract && (
            <>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() =>
                  navigate(`${ROUTER.MY_COMMUNITY_POSTS}?compose=1`)
                }
              >
                Viết bài trao đổi
              </Button>
              <Button
                icon={<ProfileOutlined />}
                onClick={() => navigate(ROUTER.MY_COMMUNITY_POSTS)}
              >
                Bài viết của tôi
              </Button>
            </>
          )}
          {viewer.isAdmin && (
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={() => navigate(ROUTER.ADMIN_COMMUNITY_MODERATION)}
            >
              Kiểm duyệt cộng đồng
            </Button>
          )}
          {!viewer.signedIn && (
            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={() => navigate(ROUTER.LOGIN)}
            >
              Đăng nhập để tham gia
            </Button>
          )}
        </div>
      </IntroWrapper>
      {!viewer.signedIn && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Bạn đang xem với tư cách khách. Đăng nhập bằng tài khoản chủ nuôi để thích, bình luận, báo cáo và chia sẻ hành trình của bé."
        />
      )}
      {viewer.signedIn && !viewer.canInteract && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Tài khoản phòng khám chỉ xem bài. Thích, bình luận và báo cáo dành cho tài khoản chủ nuôi."
        />
      )}
      {viewer.canInteract && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="Muốn chia sẻ hành trình của bé? Mở hồ sơ thú cưng và bấm “Chia sẻ hành trình”. Bệnh án, đơn thuốc và giá tiền không được đăng."
        />
      )}
    </>
  );
};

export default CommunityIntro;
