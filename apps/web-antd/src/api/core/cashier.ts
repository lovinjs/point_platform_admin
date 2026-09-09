import { requestClient } from '#/api/request';

type CustomerStatus = 'ACTIVE' | 'DISABLED';
type PaymentMethod = 'BANK_TRANSFER' | 'OTHER' | 'PLATFORM_QR';
type ConsumptionOrderStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'PENDING_CONFIRM'
  | 'REVERSED';

interface CashierCustomer {
  availablePoints: number;
  consumePinConfigured: boolean;
  customerId: number;
  nickname: null | string;
  phone: string;
  status: CustomerStatus;
}

interface AccessibleStore {
  address: string;
  contactPhone: string;
  storeCode: string;
  storeId: number;
  storeName: string;
}

interface OfflineRechargeParams {
  amountYuan: number;
  customerId: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  remark?: string;
  storeId: number;
}

interface OfflineRechargeResult {
  amountCent: number;
  customerId: number;
  orderNo: string;
  orderStatus: 'COMPLETED' | 'REFUNDED';
  rechargePoints: number;
  storeId: number;
}

interface PrepareConsumptionParams {
  consumePoints: number;
  customerId: number;
  remark?: string;
  storeId: number;
}

interface PrepareConsumptionResult {
  consumePoints: number;
  customerId: number;
  expiresTime: string;
  grossAmountCent: number;
  orderNo: string;
  orderStatus: ConsumptionOrderStatus;
  platformFeeCent: number;
  platformFeeRateBps: number;
  storeId: number;
  storePayableCent: number;
  verificationMode: 'CUSTOMER_PIN';
}

interface ConsumptionOrderStatusResult {
  amountCent: number;
  completedTime: null | string;
  confirmedTime: null | string;
  consumePoints: number;
  createTime: string;
  customerId: number;
  expiresTime: null | string;
  orderNo: string;
  orderStatus: ConsumptionOrderStatus;
  remark: null | string;
  storeId: number;
  verificationMode: 'CUSTOMER_PIN';
}

function findCashierCustomerApi(phone: string) {
  return requestClient.get<CashierCustomer>('/customers', {
    params: { phone },
  });
}

function getAccessibleStoresApi() {
  return requestClient.get<AccessibleStore[]>('/stores');
}

function createOfflineRechargeApi(
  data: OfflineRechargeParams,
  idempotencyKey: string,
) {
  return requestClient.post<OfflineRechargeResult>(
    '/recharge-orders/offline',
    data,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

function prepareConsumptionApi(
  data: PrepareConsumptionParams,
  idempotencyKey: string,
) {
  return requestClient.post<PrepareConsumptionResult>(
    '/consumption-orders/prepare',
    data,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

function getConsumptionOrderStatusApi(orderNo: string) {
  return requestClient.get<ConsumptionOrderStatusResult>(
    `/consumption-orders/${encodeURIComponent(orderNo)}`,
  );
}

export {
  createOfflineRechargeApi,
  findCashierCustomerApi,
  getAccessibleStoresApi,
  getConsumptionOrderStatusApi,
  prepareConsumptionApi,
};
export type {
  AccessibleStore,
  CashierCustomer,
  ConsumptionOrderStatus,
  ConsumptionOrderStatusResult,
  CustomerStatus,
  OfflineRechargeParams,
  OfflineRechargeResult,
  PaymentMethod,
  PrepareConsumptionParams,
  PrepareConsumptionResult,
};
