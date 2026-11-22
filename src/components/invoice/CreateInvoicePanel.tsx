import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  InputNumber,
  List,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { DeleteOutlined, FileDoneOutlined } from '@ant-design/icons';
import axios from 'axios';
import type {
  Invoice,
  InvoiceProductLine,
  OnlineAppointmentService,
} from '@/types';
import AppointmentServiceService, {
  getServiceRefCategory,
} from '@/services/AppointmentServiceService';
import MedicalRecordService, {
  isMedicalServiceCategory,
} from '@/services/MedicalRecordService';
import InvoiceService, {
  addProductLine,
  buildCreateInvoicePayload,
  collectBillableSubtasks,
  collectPrescribedProducts,
  formatVnd,
  isStillAdmittedError,
  PRESCRIPTION_QUANTITY_MAX,
  readInvoiceError,
  RETAIL_QUANTITY_MAX,
} from '@/services/InvoiceService';
import type {
  BillableSubtask,
  PrescribedProduct,
} from '@/services/InvoiceService';
import type { Product } from '@/services/ProductService';
import ServiceService from '@/services/ServiceService';
import SubtaskRequestService from '@/services/SubtaskRequestService';
import ProductPicker from './ProductPicker';

const isLoadFailure = (result: PromiseSettledResult<unknown>) =>
  result.status === 'rejected' &&
  !axios.isCancel(result.reason) &&
  (result.reason as { response?: { status?: number } })?.response?.status !==
    404;

const { Text, Title } = Typography;

const getServiceName = (service: OnlineAppointmentService) =>
  typeof service.serviceId === 'object' ? service.serviceId.name : 'Dịch vụ';

const getServicePrice = (service: OnlineAppointmentService) =>
  typeof service.serviceId === 'object'
    ? service.serviceId.basePrice
    : undefined;

interface CreateInvoicePanelProps {
  orderId: string;
  onCreated: (invoice: Invoice) => void;
}

/**
 * H3 (UC-45): dịch vụ đã xong, chỉ định (sub-task) đã xong có gắn dịch vụ trong
 * danh mục và thuốc đã kê do BE tự gom; ở đây chỉ hiện trước cho lễ tân xem.
 * Bệnh án không lưu số lượng thuốc, nên lễ tân nhập ở đây; BE chỉ nhận số lượng
 * này lúc lập hóa đơn.
 */
const CreateInvoicePanel = ({
  orderId,
  onCreated,
}: CreateInvoicePanelProps) => {
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState<string>();
  const [doneServices, setDoneServices] = useState<OnlineAppointmentService[]>(
    []
  );
  const [subtasks, setSubtasks] = useState<BillableSubtask[]>([]);
  const [prescribed, setPrescribed] = useState<PrescribedProduct[]>([]);
  const [rxQuantities, setRxQuantities] = useState<Record<string, number>>({});
  const [retail, setRetail] = useState<InvoiceProductLine[]>([]);
  const [retailProducts, setRetailProducts] = useState<Record<string, Product>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; admitted: boolean }>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setLoadWarning(undefined);
    (async () => {
      try {
        const res = await AppointmentServiceService.listOrderServices(orderId, {
          signal,
        });
        const done = (res.data || []).filter(s => s.status === 'Done');
        // Only medical services have a SOAP record (grooming has none); a 404
        // still means "no record" for a medical service closed without one
        const medical = done.filter(s =>
          isMedicalServiceCategory(getServiceRefCategory(s.serviceId))
        );
        const [records, subtaskLists] = await Promise.all([
          Promise.allSettled(
            medical.map(s =>
              MedicalRecordService.getByService(s._id, { signal })
            )
          ),
          // The BE only bills sub-tasks of Done services
          Promise.allSettled(
            done.map(s => SubtaskRequestService.listForService(s._id, signal))
          ),
        ]);
        if (signal.aborted) return;
        const found = records.flatMap(r =>
          r.status === 'fulfilled' ? [r.value] : []
        );
        const allSubtasks = subtaskLists.flatMap(r =>
          r.status === 'fulfilled' ? r.value.data || [] : []
        );
        let billable = collectBillableSubtasks(allSubtasks);
        if (billable.length) {
          // The sub-task list leaves out prices: read them from the catalog.
          // Without it the lines still show, priced "theo danh mục".
          try {
            const { services } = await ServiceService.listServices(undefined, {
              signal,
            });
            billable = collectBillableSubtasks(
              allSubtasks,
              Object.fromEntries((services || []).map(s => [s._id, s]))
            );
          } catch (err) {
            if (axios.isCancel(err) || signal.aborted) return;
          }
        }
        if (signal.aborted) return;
        setDoneServices(done);
        setSubtasks(billable);
        const products = collectPrescribedProducts(found);
        setPrescribed(products);
        setRxQuantities(
          Object.fromEntries(products.map(p => [p.productId, 1]))
        );
        const warnings = [
          records.some(isLoadFailure) &&
            'Không tải được một phần đơn thuốc. Hệ thống vẫn tính thuốc đã kê, số lượng mặc định là 1.',
          subtaskLists.some(isLoadFailure) &&
            'Không tải được một phần chỉ định đã làm. Hệ thống vẫn tự tính các chỉ định đã hoàn thành có trong danh mục dịch vụ.',
        ].filter(Boolean);
        if (warnings.length) setLoadWarning(warnings.join(' '));
      } catch (err) {
        if (axios.isCancel(err) || signal.aborted) return;
        setLoadWarning(
          `${readInvoiceError(err, 'Không tải được dịch vụ của lịch hẹn').message}. Bạn vẫn lập được hóa đơn, hệ thống tự gom dịch vụ và thuốc.`
        );
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [orderId]);

  const addRetail = (product: Product, quantity: number) => {
    setRetailProducts(current => ({ ...current, [product._id]: product }));
    setRetail(current => addProductLine(current, product._id, quantity));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await InvoiceService.create(
        buildCreateInvoicePayload({
          orderId,
          prescriptionQuantities: prescribed.map(p => ({
            productId: p.productId,
            quantity: rxQuantities[p.productId] || 1,
          })),
          retailItems: retail,
        })
      );
      onCreated(res.data);
    } catch (err) {
      const { message } = readInvoiceError(err, 'Không lập được hóa đơn');
      setError({ message, admitted: isStillAdmittedError(message) });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {loadWarning && <Alert type="warning" showIcon message={loadWarning} />}

      <div>
        <Title level={5}>Dịch vụ đã hoàn thành</Title>
        {doneServices.length ? (
          <List
            size="small"
            bordered
            dataSource={doneServices}
            renderItem={service => (
              <List.Item
                extra={
                  getServicePrice(service) !== undefined ? (
                    <Text type="secondary">
                      {formatVnd(getServicePrice(service))}
                    </Text>
                  ) : null
                }
              >
                {getServiceName(service)}
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">Không thấy dịch vụ đã hoàn thành.</Text>
        )}
        <Text
          type="secondary"
          style={{ display: 'block', marginTop: 6, fontSize: 12 }}
        >
          Giá chốt theo danh mục lúc lập hóa đơn. Nếu bé có đợt nội trú đã xuất
          viện, hệ thống tự tính thêm tiền nội trú theo ngày.
        </Text>
      </div>

      {subtasks.length > 0 && (
        <div>
          <Title level={5}>Chỉ định đã hoàn thành</Title>
          <List
            size="small"
            bordered
            rowKey="id"
            dataSource={subtasks}
            renderItem={subtask => (
              <List.Item
                extra={
                  <Text type="secondary">
                    {subtask.price !== undefined
                      ? formatVnd(subtask.price)
                      : 'Giá theo danh mục'}
                  </Text>
                }
              >
                {subtask.name}
              </List.Item>
            )}
          />
          <Text
            type="secondary"
            style={{ display: 'block', marginTop: 6, fontSize: 12 }}
          >
            Bác sĩ giao thêm trong lúc khám, đã làm xong và có trong danh mục
            dịch vụ nên được tính như một dịch vụ.
          </Text>
        </div>
      )}

      <div>
        <Title level={5}>Thuốc đã kê</Title>
        {prescribed.length ? (
          <List
            size="small"
            bordered
            dataSource={prescribed}
            renderItem={product => (
              <List.Item
                extra={
                  <Space>
                    <Text type="secondary">Số lượng</Text>
                    <InputNumber
                      min={1}
                      max={PRESCRIPTION_QUANTITY_MAX}
                      precision={0}
                      value={rxQuantities[product.productId]}
                      aria-label={`Số lượng ${product.name}`}
                      onChange={value =>
                        setRxQuantities(current => ({
                          ...current,
                          [product.productId]: value || 1,
                        }))
                      }
                      style={{ width: 90 }}
                    />
                  </Space>
                }
              >
                <Space direction="vertical" size={0}>
                  <Text>{product.name}</Text>
                  {product.lines > 1 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Được kê ở {product.lines} bệnh án, mỗi bệnh án là một dòng
                      với số lượng này
                    </Text>
                  )}
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">Lịch hẹn này không có thuốc kê đơn.</Text>
        )}
      </div>

      <div>
        <Title level={5}>Hàng bán thêm tại quầy</Title>
        <ProductPicker onAdd={addRetail} />
        {retail.length > 0 ? (
          <List
            size="small"
            bordered
            style={{ marginTop: 8 }}
            dataSource={retail}
            renderItem={line => {
              const product = retailProducts[line.productId];
              return (
                <List.Item
                  extra={
                    <Space>
                      <InputNumber
                        min={1}
                        max={RETAIL_QUANTITY_MAX}
                        precision={0}
                        value={line.quantity}
                        aria-label={`Số lượng ${product?.name || ''}`}
                        onChange={value =>
                          setRetail(current =>
                            current.map(l =>
                              l.productId === line.productId
                                ? { ...l, quantity: value || 1 }
                                : l
                            )
                          )
                        }
                        style={{ width: 80 }}
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Bỏ ${product?.name || 'sản phẩm'}`}
                        onClick={() =>
                          setRetail(current =>
                            current.filter(l => l.productId !== line.productId)
                          )
                        }
                      />
                    </Space>
                  }
                >
                  {product
                    ? `${product.name} (${product.unit})`
                    : line.productId}
                  {product?.unitPrice !== undefined && (
                    <Text type="secondary">
                      {' '}
                      · {formatVnd(product.unitPrice)}
                    </Text>
                  )}
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa bán thêm sản phẩm nào"
            style={{ margin: '8px 0' }}
          />
        )}
      </div>

      {error && (
        <Alert
          type={error.admitted ? 'warning' : 'error'}
          showIcon
          message={
            error.admitted ? 'Bé đang nằm viện' : 'Không lập được hóa đơn'
          }
          description={
            error.admitted
              ? `${error.message}. Bác sĩ cho xuất viện xong thì lập lại hóa đơn.`
              : error.message
          }
        />
      )}

      <Button
        type="primary"
        size="large"
        block
        icon={<FileDoneOutlined />}
        loading={submitting}
        onClick={submit}
      >
        Lập hóa đơn
      </Button>
    </Space>
  );
};

export default CreateInvoicePanel;
