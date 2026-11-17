import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Tag, Typography } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { Invoice, Pet, PetAppointmentNote } from '@/types';
import PetService from '@/services/PetService';
import InvoiceService, {
  formatVnd,
  indexInvoicesByOrderCode,
  INVOICE_LIST_LIMIT_MAX,
  PAY_AT_COUNTER_TEXT,
} from '@/services/InvoiceService';

const { Text } = Typography;

// One waiting visit; wraps on a phone instead of running past the card
const WaitingRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);

  .ant-tag {
    margin-inline-end: 0;
    max-width: 100%;
    white-space: normal;
  }
`;

interface WaitingVisit {
  pet: Pet;
  visit: PetAppointmentNote;
}

interface AwaitingPickupCardProps {
  pets: Pet[];
  revision: number;
  onOpenInvoice: (invoice: Invoice) => void;
}

/**
 * Nghiệp vụ 8.2, 4.6: "Chờ chủ đón" là mọi dịch vụ đã xong, bé nằm chuồng chờ
 * chủ. Hóa đơn chưa có cho tới khi lễ tân lập lúc chủ đến đón, nên trang hóa đơn
 * nói rõ bé nào đang chờ và trả tiền ở đâu.
 */
const AwaitingPickupCard = ({
  pets,
  revision,
  onOpenInvoice,
}: AwaitingPickupCardProps) => {
  const [waiting, setWaiting] = useState<WaitingVisit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    let cancelled = false;
    const active = pets.filter(pet => pet.status !== 'Deleted');
    if (active.length === 0) {
      setWaiting([]);
      return;
    }
    // The pet detail lists every visit, walk-ins included (/appointment-orders/me is online only)
    Promise.allSettled(active.map(pet => PetService.getPetById(pet._id))).then(
      results => {
        if (cancelled) return;
        const found: WaitingVisit[] = [];
        results.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;
          for (const visit of result.value.appointmentNotes || []) {
            if (visit.derivedStatus === 'WaitOwner')
              found.push({ pet: active[index], visit });
          }
        });
        setWaiting(found);
      }
    );
    InvoiceService.listMine({ limit: INVOICE_LIST_LIMIT_MAX })
      .then(res => {
        if (!cancelled) setInvoices(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pets, revision]);

  const invoiceByCode = useMemo(
    () => indexInvoicesByOrderCode(invoices),
    [invoices]
  );

  if (waiting.length === 0) return null;

  return (
    <Alert
      type="success"
      showIcon
      style={{ marginBottom: 16 }}
      message={`${waiting.length} bé đã xong dịch vụ, đang chờ bạn đến đón`}
      description={
        <>
          <Text>{PAY_AT_COUNTER_TEXT}</Text>
          {waiting.map(({ pet, visit }) => {
            const invoice = invoiceByCode.get(visit.code);
            return (
              <WaitingRow key={visit._id}>
                <Text strong>Bé {pet.name}</Text>
                <Text type="secondary">
                  {visit.code} · hẹn {dayjs(visit.date).format('DD/MM/YYYY')}
                </Text>
                <Tag color="purple">Chờ chủ đón</Tag>
                {invoice ? (
                  <Tag color="orange">
                    Hóa đơn {invoice.code} · {formatVnd(invoice.totalAmount)} ·
                    chưa thanh toán
                  </Tag>
                ) : (
                  <Tag>Hóa đơn: lễ tân lập khi bạn đến</Tag>
                )}
                {invoice && (
                  <Button
                    size="small"
                    icon={<DollarOutlined />}
                    onClick={() => onOpenInvoice(invoice)}
                  >
                    Xem hóa đơn
                  </Button>
                )}
              </WaitingRow>
            );
          })}
        </>
      }
    />
  );
};

export default AwaitingPickupCard;
