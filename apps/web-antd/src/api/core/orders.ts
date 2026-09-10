import type { ConsumptionOrderStatus, PaymentMethod } from './cashier';

import { requestClient } from '#/api/request';

type OrderStoreStatus = 'ACTIVE' | 'CLOSED' | 'PENDING' | 'SUSPENDED';
type RechargeOrderStatus = 'CANCELLED' | 'COMPLETED' | 'CREATED' | 'REFUNDED';
type SettlementStatus = 'ADJUSTED' | 'INCLUDED' | 'NOT_INCLUDED' | 'SETTLED';
type RefundMethod = 'BANK_TRANSFER' | 'ORIGINAL_CHANNEL' | 'OTHER';
type RechargeRefundStatus = 'COMPLETED';

interface OrderStoreOption {
  storeCode: string;
  storeId: number;
  storeName: string;
  storeStatus: OrderStoreStatus;
}

interface OrderPageParams<TStatus> {
  customerPhone?: string;
  orderNo?: string;
  pageNum: number;
  pageSize: number;
  status?: TStatus;
  storeId?: number;
}

interface OrderPageResult<T> {
  hasNext: boolean;
  items: T[];
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface AdminRechargeOrder {
  amountCent: number;
  channel: 'OFFLINE' | 'WECHAT_PAY';
  completedTime: null | string;
  createTime: string;
  customerId: number;
  customerNickname: null | string;
  customerPhone: null | string;
  fundReceiver: 'PLATFORM';
  operatorId: null | number;
  operatorName: null | string;
  orderNo: string;
  orderStatus: RechargeOrderStatus;
  paidTime: null | string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  rechargePoints: number;
  refundCompletedTime: null | string;
  refundMethod: null | RefundMethod;
  refundNo: null | string;
  refundReason: null | string;
  refundReference: null | string;
  refundStatus: null | RechargeRefundStatus;
  remark: null | string;
  storeCode: null | string;
  storeId: number;
  storeName: null | string;
}

interface AdminConsumptionOrder {
  amountCent: number;
  completedTime: null | string;
  confirmedTime: null | string;
  consumePoints: number;
  createTime: string;
  customerId: number;
  customerNickname: null | string;
  customerPhone: null | string;
  expiresTime: null | string;
  operatorId: null | number;
  operatorName: null | string;
  orderNo: string;
  orderStatus: ConsumptionOrderStatus;
  platformFeeCent: number;
  platformFeeRateBps: number;
  remark: null | string;
  settlementStatus: null | SettlementStatus;
  storeCode: null | string;
  storeId: number;
  storeName: null | string;
  storePayableCent: number;
  verificationMode: 'CUSTOMER_PIN';
}

interface RechargeRefundParams {
  reason: string;
  refundMethod: RefundMethod;
  refundReference: string;
}

interface RechargeRefundResult {
  availablePoints: number;
  completedTime: string;
  customerId: number;
  rechargeOrderNo: string;
  refundAmountCent: number;
  refundMethod: RefundMethod;
  refundNo: string;
  refundPoints: number;
  refundStatus: RechargeRefundStatus;
}

type RechargeOrderPageParams = OrderPageParams<RechargeOrderStatus>;
type ConsumptionOrderPageParams = OrderPageParams<ConsumptionOrderStatus>;

function getOrderStoreOptionsApi() {
  return requestClient.get<OrderStoreOption[]>('/order-center/store-options');
}

function getRechargeOrderPageApi(params: RechargeOrderPageParams) {
  return requestClient.get<OrderPageResult<AdminRechargeOrder>>(
    '/order-center/recharge-orders',
    { params },
  );
}

function getConsumptionOrderPageApi(params: ConsumptionOrderPageParams) {
  return requestClient.get<OrderPageResult<AdminConsumptionOrder>>(
    '/order-center/consumption-orders',
    { params },
  );
}

function refundRechargeOrderApi(
  orderNo: string,
  data: RechargeRefundParams,
  idempotencyKey: string,
) {
  return requestClient.post<RechargeRefundResult>(
    `/recharge-orders/${encodeURIComponent(orderNo)}/refund`,
    data,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

export {
  getConsumptionOrderPageApi,
  getOrderStoreOptionsApi,
  getRechargeOrderPageApi,
  refundRechargeOrderApi,
};
export type {
  AdminConsumptionOrder,
  AdminRechargeOrder,
  ConsumptionOrderPageParams,
  OrderPageResult,
  OrderStoreOption,
  OrderStoreStatus,
  RechargeOrderPageParams,
  RechargeOrderStatus,
  RechargeRefundParams,
  RechargeRefundResult,
  RefundMethod,
  SettlementStatus,
};
