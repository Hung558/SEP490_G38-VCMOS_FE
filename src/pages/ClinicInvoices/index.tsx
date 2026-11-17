import { useState } from 'react';
import { Card, Tabs, Typography } from 'antd';
import { ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import type { StaffAppointment } from '@/types';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { normalizeRole } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import CheckoutModal from '@/components/invoice/CheckoutModal';
import {
  PageHeader,
  PageWrapper,
} from '../AppointmentReception/components/styles';
import PendingCheckoutTab from './components/PendingCheckoutTab';
import IssuedInvoicesTab from './components/IssuedInvoicesTab';

const { Title, Text } = Typography;

type Target =
  | { kind: 'order'; order: StaffAppointment }
  | { kind: 'invoice'; invoiceId: string };

/**
 * SCR-20 thu ngân (nghiệp vụ 4.6): tab "Chờ thanh toán" là mọi đơn Chờ chủ đón
 * để lập hóa đơn khi khách đến đón; tab "Hóa đơn đã lập" để tra cứu (K4). Lễ tân
 * thu tiền; Admin chỉ xem.
 */
const ClinicInvoicesPage = () => {
  const { user } = useAuth();
  const stored = storage.getLocalStorage<{ role?: string }>(STORAGE.USER_INFO);
  const role = normalizeRole(user?.role || stored?.role);
  const canPay = role === 'Receptionist';

  const [tab, setTab] = useState<'pending' | 'issued'>('pending');
  const [revision, setRevision] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const refresh = () => setRevision(value => value + 1);

  return (
    <PageWrapper>
      <Card>
        <PageHeader>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Thu ngân và hóa đơn
            </Title>
            <Text type="secondary">
              {canPay
                ? 'Khách đến đón bé: lập hóa đơn, thu tiền mặt hoặc VNPay QR. Thanh toán xong đơn chuyển Hoàn tất.'
                : 'Xem các đơn chờ thanh toán và hóa đơn của phòng khám.'}
            </Text>
          </div>
        </PageHeader>

        <Tabs
          activeKey={tab}
          onChange={key => setTab(key as 'pending' | 'issued')}
          items={[
            {
              key: 'pending',
              label: (
                <span>
                  <ClockCircleOutlined /> Chờ thanh toán
                </span>
              ),
              children: (
                <PendingCheckoutTab
                  canPay={canPay}
                  revision={revision}
                  onRefresh={refresh}
                  onOpen={order => setTarget({ kind: 'order', order })}
                />
              ),
            },
            {
              key: 'issued',
              label: (
                <span>
                  <FileTextOutlined /> Hóa đơn đã lập
                </span>
              ),
              children: (
                <IssuedInvoicesTab
                  canPay={canPay}
                  revision={revision}
                  onRefresh={refresh}
                  onOpen={invoice =>
                    setTarget({ kind: 'invoice', invoiceId: invoice._id })
                  }
                />
              ),
            },
          ]}
        />
      </Card>

      <CheckoutModal
        open={Boolean(target)}
        order={target?.kind === 'order' ? target.order : null}
        invoiceId={target?.kind === 'invoice' ? target.invoiceId : null}
        canPay={canPay}
        onClose={() => setTarget(null)}
        onChanged={refresh}
      />
    </PageWrapper>
  );
};

export default ClinicInvoicesPage;
