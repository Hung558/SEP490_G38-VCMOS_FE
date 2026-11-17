import { useState } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { FilePdfOutlined, PrinterOutlined } from '@ant-design/icons';
import { toast } from 'sonner';
import type { Invoice } from '@/types';
import InvoiceService, {
  getInvoicePdfName,
  readInvoiceError,
} from '@/services/InvoiceService';

interface InvoicePdfButtonProps {
  invoice: Pick<Invoice, '_id' | 'code'>;
  /** "print" opens the receipt in a new tab, "download" saves the file */
  mode?: 'download' | 'print';
  size?: ButtonProps['size'];
  type?: ButtonProps['type'];
}

/** K2 (SCR-15 [Download PDF], SCR-20 [Print Receipt]): the PDF needs the token */
const InvoicePdfButton = ({
  invoice,
  mode = 'download',
  size,
  type,
}: InvoicePdfButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    // Open the tab before the request so the browser does not block it
    const tab = mode === 'print' ? window.open('', '_blank') : null;
    setLoading(true);
    try {
      const blob = await InvoiceService.getPdf(invoice._id);
      const url = URL.createObjectURL(
        new Blob([blob], { type: 'application/pdf' })
      );
      if (tab) {
        tab.location.href = url;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = getInvoicePdfName(invoice);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      // The new tab or the download keeps its own copy
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      tab?.close();
      toast.error(
        readInvoiceError(error, 'Không tải được biên lai PDF').message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      type={type}
      loading={loading}
      icon={mode === 'print' ? <PrinterOutlined /> : <FilePdfOutlined />}
      onClick={handleClick}
    >
      {mode === 'print' ? 'In biên lai' : 'Tải biên lai PDF'}
    </Button>
  );
};

export default InvoicePdfButton;
