import { Card, Space, Tabs, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import ModerationPostsTab from './components/ModerationPostsTab';
import ModerationReportsTab from './components/ModerationReportsTab';
import { PageWrapper } from './components/styles';

const { Title, Text } = Typography;

const TABS = ['posts', 'reports'] as const;
type TabKey = (typeof TABS)[number];

/**
 * SCR-33, nghiệp vụ 7.1: Admin approves posts before they show (timeline
 * shares and discussions alike) and handles reports by keeping, hiding or
 * deleting the content.
 */
const AdminCommunityModerationPage = () => {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get('tab') === 'reports' ? 'reports' : 'posts';

  return (
    <PageWrapper>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Kiểm duyệt cộng đồng
            </Title>
            <Text type="secondary">
              Duyệt bài trước khi hiện trên cộng đồng và xử lý báo cáo vi phạm
              của chủ nuôi.
            </Text>
          </div>
          <Tabs
            activeKey={tab}
            onChange={key =>
              setParams(key === 'reports' ? { tab: 'reports' } : {})
            }
            destroyOnHidden
            items={[
              {
                key: 'posts',
                label: 'Bài viết chờ duyệt',
                children: <ModerationPostsTab />,
              },
              {
                key: 'reports',
                label: 'Báo cáo vi phạm',
                children: <ModerationReportsTab />,
              },
            ]}
          />
        </Space>
      </Card>
    </PageWrapper>
  );
};

export default AdminCommunityModerationPage;
