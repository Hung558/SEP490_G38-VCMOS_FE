import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Card, Descriptions, Result, Spin } from 'antd';
import styled from 'styled-components';
import type { VnpayReturnResult } from '@/types';
import InvoiceService, {
  formatVnd,
  getInvoiceStatusLabel,
  MSG_PAYMENT_FAILED,
  readInvoiceError,
} from '@/services/InvoiceService';
import ROUTER from '@/routerMap/ROUTER';

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: #f1f5f9;

  .ant-card {
    width: 100%;
    max-width: 560px;
  }
`;

/**
 * K5 (API-04): VNPay đưa người trả tiền về trang này kèm kết quả. Trang chỉ
 * nhờ BE kiểm chữ ký rồi hiện kết quả; hóa đơn chỉ chuyển "Đã thanh toán" khi
 * VNPay gọi IPN (BR-17). Cần BE đặt VNP_RETURN_URL trỏ về trang này.
 */
const VnpayReturnPage = () => {
  const { search } = useLocation();
  const [result, setResult] = useState<VnpayReturnResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!search || !search.includes('vnp_')) {
      setError('Không có thông tin giao dịch VNPay trên đường dẫn này.');
      return;
    }
    InvoiceService.verifyVnpayReturn(search)
      .then(setResult)
      .catch(err =>
        setError(
          readInvoiceError(err, 'Không kiểm tra được kết quả giao dịch VNPay')
            .message
        )
      );
  }, [search]);

  const homeButton = (
    <Link to={ROUTER.HOME}>
      <Button type="primary">Về trang chủ</Button>
    </Link>
  );

  return (
    <Wrapper>
      <Card>
        {!result && !error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin tip="Đang kiểm tra kết quả giao dịch…">
              <div style={{ height: 48 }} />
            </Spin>
          </div>
        )}
        {error && (
          <Result
            status="error"
            title="Không xác nhận được giao dịch"
            subTitle={error}
            extra={homeButton}
          />
        )}
        {result && (
          <Result
            status={result.success ? 'success' : 'error'}
            title={
              result.success
                ? 'Giao dịch VNPay thành công'
                : 'Giao dịch VNPay chưa thành công'
            }
            subTitle={
              result.success
                ? 'Phòng khám sẽ nhận được xác nhận từ VNPay và cập nhật hóa đơn trong giây lát.'
                : MSG_PAYMENT_FAILED
            }
            extra={homeButton}
          >
            <Descriptions
              size="small"
              column={1}
              bordered
              items={[
                {
                  key: 'invoice',
                  label: 'Hóa đơn',
                  children: result.invoice?.code || '-',
                },
                {
                  key: 'amount',
                  label: 'Số tiền',
                  children:
                    result.amount !== null ? formatVnd(result.amount) : '-',
                },
                {
                  key: 'txn',
                  label: 'Mã giao dịch',
                  children: result.vnpayTxnRef || '-',
                },
                {
                  key: 'status',
                  label: 'Trạng thái hóa đơn',
                  children: result.invoice
                    ? getInvoiceStatusLabel(result.invoice.paymentStatus)
                    : '-',
                },
              ]}
            />
          </Result>
        )}
      </Card>
    </Wrapper>
  );
};

export default VnpayReturnPage;
