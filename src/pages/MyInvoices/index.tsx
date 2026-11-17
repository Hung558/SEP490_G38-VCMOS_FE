import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Modal,
  Select,
  Typography,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { Invoice, InvoicePaymentStatus, Pet } from '@/types';
import InvoiceService, {
  filterInvoicesByPet,
  getInvoiceStatusLabel,
  INVOICE_LIST_LIMIT_MAX,
  INVOICE_STATUSES,
  readInvoiceError,
} from '@/services/InvoiceService';
import PetService from '@/services/PetService';
import InvoiceTable from '@/components/invoice/InvoiceTable';
import InvoiceDetailView from '@/components/invoice/InvoiceDetailView';
import InvoicePdfButton from '@/components/invoice/InvoicePdfButton';
import {
  getInvoiceRangePresets,
  getTodayRange,
  isTodayRange,
} from '@/components/invoice/invoiceRange';
import type { InvoiceRange } from '@/components/invoice/invoiceRange';
import {
  FilterCard,
  PageHeader,
  PageWrapper,
  ResponsiveFilterRow,
} from '../AppointmentReception/components/styles';
import AwaitingPickupCard from './components/AwaitingPickupCard';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const PAGE_SIZE = 10;

/**
 * K3 (SCR-15, UC-48): chủ nuôi xem hóa đơn của các bé, mặc định của hôm nay;
 * lọc theo ngày, bé, trạng thái; mở xem các dòng và tải PDF. Trên cùng là các
 * bé đang chờ đón: hóa đơn do lễ tân lập khi chủ đến và trả tại quầy (4.6).
 */
const MyInvoicesPage = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [petId, setPetId] = useState<string>();
  const [status, setStatus] = useState<InvoicePaymentStatus>();
  const [range, setRange] = useState<InvoiceRange>(getTodayRange);
  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [capped, setCapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    PetService.listPets({ status: 'All', limit: 100 })
      .then(res => setPets(res.items || []))
      .catch(() => setPets([]));
  }, []);

  const from = range?.[0]?.format('YYYY-MM-DD');
  const to = range?.[1]?.format('YYYY-MM-DD');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    // The BE ignores petId on /me (E3), so a pet filter reads the latest 100
    // bills and keeps that pet's here
    const byPet = Boolean(petId);
    InvoiceService.listMine(
      {
        petId,
        paymentStatus: status,
        from,
        to,
        page: byPet ? 1 : page,
        limit: byPet ? INVOICE_LIST_LIMIT_MAX : PAGE_SIZE,
      },
      { signal: controller.signal }
    )
      .then(res => {
        const items = res.items || [];
        if (byPet) {
          const mine = filterInvoicesByPet(items, petId);
          setInvoices(mine);
          setTotal(mine.length);
          setCapped((res.pagination?.total || 0) > items.length);
        } else {
          setInvoices(items);
          setTotal(res.pagination?.total || items.length);
          setCapped(false);
        }
      })
      .catch(err => {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        setError(readInvoiceError(err, 'Không tải được hóa đơn').message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [petId, status, from, to, page, revision]);

  const petOptions = useMemo(
    () => pets.map(pet => ({ value: pet._id, label: pet.name })),
    [pets]
  );

  const resetPage = () => setPage(1);

  return (
    <PageWrapper>
      <Card>
        <PageHeader>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Hóa đơn của tôi
            </Title>
            <Text type="secondary">
              Hóa đơn các lần khám và dịch vụ của các bé. Lễ tân lập hóa đơn khi
              bạn đến đón bé; bạn thanh toán tại quầy bằng tiền mặt hoặc quét mã
              VNPay.
            </Text>
          </div>
        </PageHeader>

        <AwaitingPickupCard
          pets={pets}
          revision={revision}
          onOpenInvoice={setOpenInvoice}
        />

        <FilterCard>
          <ResponsiveFilterRow>
            <RangePicker
              value={range}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              presets={getInvoiceRangePresets()}
              onChange={value => {
                setRange(value);
                resetPage();
              }}
              aria-label="Khoảng ngày lập"
            />
            <Select
              allowClear
              placeholder="Tất cả các bé"
              value={petId}
              options={petOptions}
              onChange={value => {
                setPetId(value);
                resetPage();
              }}
              style={{ minWidth: 180 }}
              aria-label="Thú cưng"
            />
            <Select
              allowClear
              placeholder="Mọi trạng thái"
              value={status}
              options={INVOICE_STATUSES.map(value => ({
                value,
                label: getInvoiceStatusLabel(value),
              }))}
              onChange={value => {
                setStatus(value);
                resetPage();
              }}
              style={{ minWidth: 180 }}
              aria-label="Trạng thái"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setRevision(value => value + 1)}
            >
              Làm mới
            </Button>
          </ResponsiveFilterRow>
        </FilterCard>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 16 }}
            action={
              <Button
                size="small"
                onClick={() => setRevision(value => value + 1)}
              >
                Thử lại
              </Button>
            }
          />
        )}
        {capped && (
          <Alert
            type="info"
            showIcon
            message={`Đang lọc theo bé trong ${INVOICE_LIST_LIMIT_MAX} hóa đơn gần nhất. Thu hẹp khoảng ngày để xem hóa đơn cũ hơn.`}
            style={{ marginBottom: 16 }}
          />
        )}

        <InvoiceTable
          invoices={invoices}
          loading={loading}
          emptyText={
            isTodayRange(range)
              ? 'Hôm nay chưa có hóa đơn. Đổi hoặc xóa khoảng ngày để xem hóa đơn trước.'
              : 'Không có hóa đơn phù hợp.'
          }
          pagination={
            petId
              ? { pageSize: PAGE_SIZE, showTotal: t => `${t} hóa đơn` }
              : {
                  current: page,
                  pageSize: PAGE_SIZE,
                  total,
                  showTotal: t => `${t} hóa đơn`,
                  onChange: setPage,
                }
          }
          renderActions={invoice => (
            <>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setOpenInvoice(invoice)}
              >
                Xem
              </Button>
              <InvoicePdfButton invoice={invoice} size="small" />
            </>
          )}
        />
      </Card>

      <Modal
        open={Boolean(openInvoice)}
        title={openInvoice ? `Hóa đơn ${openInvoice.code}` : ''}
        footer={null}
        width={760}
        onCancel={() => setOpenInvoice(null)}
        destroyOnHidden
      >
        {openInvoice && (
          <InvoiceDetailView
            invoice={openInvoice}
            showOwner={false}
            payAtCounterHint
            actions={<InvoicePdfButton invoice={openInvoice} />}
          />
        )}
      </Modal>
    </PageWrapper>
  );
};

export default MyInvoicesPage;
