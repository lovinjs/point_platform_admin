import { requestClient } from '#/api/request';

type CustomerAccountStatus = 'ACTIVE' | 'DISABLED';

interface CustomerManagementItem {
  availablePoints: number;
  avatarUrl: null | string;
  consumePinConfigured: boolean;
  consumePinLocked: boolean;
  consumePinLockedUntil: null | string;
  createTime: string;
  customerId: number;
  lastLoginTime: null | string;
  nickname: null | string;
  phone: null | string;
  status: CustomerAccountStatus;
  updateTime: string;
}

interface PageResult<T> {
  hasNext: boolean;
  items: T[];
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface CustomerPageParams {
  keyword?: string;
  pageNum: number;
  pageSize: number;
  status?: CustomerAccountStatus;
}

interface CustomerTransactionPageParams {
  pageNum: number;
  pageSize: number;
}

interface CustomerPointLedger {
  balanceAfter: number;
  businessNo: string;
  businessType: string;
  createTime: string;
  deltaPoints: number;
  ledgerNo: string;
  ledgerType: string;
  remark: null | string;
  storeId: null | number;
  storeName: null | string;
}

interface CustomerRechargeOrder {
  amountCent: number;
  channel: string;
  completedTime: null | string;
  createTime: string;
  orderNo: string;
  orderStatus: string;
  paidTime: null | string;
  paymentMethod: string;
  rechargePoints: number;
  remark: null | string;
  storeId: number;
  storeName: null | string;
}

interface CustomerConsumptionOrder {
  amountCent: number;
  completedTime: null | string;
  confirmedTime: null | string;
  consumePoints: number;
  createTime: string;
  expiresTime: string;
  orderNo: string;
  orderStatus: string;
  remark: null | string;
  storeId: number;
  storeName: null | string;
}

function getCustomerPageApi(params: CustomerPageParams) {
  return requestClient.get<PageResult<CustomerManagementItem>>(
    '/customers/page',
    { params },
  );
}

function getCustomerDetailApi(customerId: number) {
  return requestClient.get<CustomerManagementItem>(`/customers/${customerId}`);
}

function getCustomerPointLedgersApi(
  customerId: number,
  params: CustomerTransactionPageParams,
) {
  return requestClient.get<PageResult<CustomerPointLedger>>(
    `/customers/${customerId}/point-ledgers`,
    { params },
  );
}

function getCustomerRechargeOrdersApi(
  customerId: number,
  params: CustomerTransactionPageParams,
) {
  return requestClient.get<PageResult<CustomerRechargeOrder>>(
    `/customers/${customerId}/recharge-orders`,
    { params },
  );
}

function getCustomerConsumptionOrdersApi(
  customerId: number,
  params: CustomerTransactionPageParams,
) {
  return requestClient.get<PageResult<CustomerConsumptionOrder>>(
    `/customers/${customerId}/consumption-orders`,
    { params },
  );
}

function updateCustomerStatusApi(
  customerId: number,
  status: CustomerAccountStatus,
  reason: string,
) {
  return requestClient.put<CustomerManagementItem>(
    `/customers/${customerId}/status`,
    { reason, status },
  );
}

export {
  getCustomerConsumptionOrdersApi,
  getCustomerDetailApi,
  getCustomerPageApi,
  getCustomerPointLedgersApi,
  getCustomerRechargeOrdersApi,
  updateCustomerStatusApi,
};
export type {
  CustomerAccountStatus,
  CustomerConsumptionOrder,
  CustomerManagementItem,
  CustomerPageParams,
  PageResult as CustomerPageResult,
  CustomerPointLedger,
  CustomerRechargeOrder,
  CustomerTransactionPageParams,
};
