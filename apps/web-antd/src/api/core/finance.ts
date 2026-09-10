import type { OrderStoreStatus } from './orders';

import { requestClient } from '#/api/request';

type AuditActorType = 'CUSTOMER' | 'SYS_USER' | 'SYSTEM';
type AuditOperatorRole = 'CLERK' | 'STORE_MANAGER' | 'SUPER_ADMIN';

interface FinancialMetrics {
  consumptionGrossCent: number;
  consumptionPoints: number;
  includedPayableCent: number;
  netRechargeCashCent: number;
  notIncludedPayableCent: number;
  platformFeeCent: number;
  rechargePoints: number;
  rechargeReceiptCent: number;
  refundOutflowCent: number;
  refundPoints: number;
  settledPayableCent: number;
  settlementPaidCent: number;
  storePayableCent: number;
}

interface FinancialStoreView extends FinancialMetrics {
  storeCode: string;
  storeId: number;
  storeName: string;
  storeStatus: OrderStoreStatus;
}

interface FinancialReconciliationView {
  endDate: string;
  generatedTime: string;
  startDate: string;
  stores: FinancialStoreView[];
  summary: FinancialMetrics;
}

interface FinancialReconciliationParams {
  endDate: string;
  startDate: string;
  storeId?: number;
}

interface AdminAuditLog {
  action: string;
  actorId: null | number;
  actorName: string;
  actorType: AuditActorType;
  afterSnapshot: null | string;
  beforeSnapshot: null | string;
  clientIp: null | string;
  createTime: string;
  logId: number;
  operatorRole: AuditOperatorRole | null;
  remark: null | string;
  requestId: null | string;
  resourceNo: null | string;
  resourceType: string;
  storeCode: null | string;
  storeId: null | number;
  storeName: null | string;
}

interface AuditLogPageParams {
  action?: string;
  actorType?: AuditActorType;
  endDate: string;
  keyword?: string;
  pageNum: number;
  pageSize: number;
  startDate: string;
  storeId?: number;
}

interface AuditLogPageResult {
  hasNext: boolean;
  items: AdminAuditLog[];
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function getFinancialReconciliationApi(params: FinancialReconciliationParams) {
  return requestClient.get<FinancialReconciliationView>(
    '/finance/reconciliation',
    { params },
  );
}

function exportFinancialReconciliationApi(
  params: FinancialReconciliationParams,
) {
  return requestClient.download<Blob>('/reports/financial-reconciliation', {
    params,
  });
}

function getAuditLogPageApi(params: AuditLogPageParams) {
  return requestClient.get<AuditLogPageResult>('/finance/audit-logs', {
    params,
  });
}

function getAuditActionsApi() {
  return requestClient.get<string[]>('/finance/audit-actions');
}

export {
  exportFinancialReconciliationApi,
  getAuditActionsApi,
  getAuditLogPageApi,
  getFinancialReconciliationApi,
};
export type {
  AdminAuditLog,
  AuditActorType,
  AuditLogPageParams,
  AuditLogPageResult,
  AuditOperatorRole,
  FinancialMetrics,
  FinancialReconciliationParams,
  FinancialReconciliationView,
  FinancialStoreView,
};
