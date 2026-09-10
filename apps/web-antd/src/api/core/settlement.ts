import { requestClient } from '#/api/request';

type StoreSettlementStatus = 'CLOSED' | 'CONFIRMED' | 'GENERATED' | 'PAID';
type SettlementPeriodStatus =
  | 'CLOSED'
  | 'CONFIRMED'
  | 'FROZEN'
  | 'GENERATED'
  | 'OPEN'
  | 'PAID';
type SettlementItemType =
  | 'CONSUMPTION'
  | 'MANUAL_ADJUSTMENT'
  | 'REVERSAL_ADJUSTMENT';

interface StoreSettlementSummary {
  adjustmentAmountCent: number;
  confirmedTime: null | string;
  createTime: string;
  endDate: string;
  grossAmountCent: number;
  merchantId: number;
  paidTime: null | string;
  payableAmountCent: number;
  paymentReference: null | string;
  periodCode: string;
  platformFeeCent: number;
  remark: null | string;
  settlementNo: string;
  settlementStatus: StoreSettlementStatus;
  startDate: string;
  storeId: number;
  storeName: string;
  totalConsumePoints: number;
  updateTime: string;
}

interface StoreSettlementItem {
  adjustmentReason: null | string;
  consumptionCompletedTime: null | string;
  consumptionOrderNo: null | string;
  createTime: string;
  grossAmountCent: number;
  itemId: number;
  itemType: SettlementItemType;
  platformFeeCent: number;
  pointsDelta: number;
  storePayableCent: number;
}

interface StoreSettlementDetail {
  items: StoreSettlementItem[];
  settlement: StoreSettlementSummary;
}

interface SettlementGenerationResult {
  endDate: string;
  generatedTime: string;
  periodCode: string;
  periodStatus: SettlementPeriodStatus;
  settlementCount: number;
  settlements: StoreSettlementSummary[];
  startDate: string;
}

interface SettlementPageParams {
  pageNum: number;
  pageSize: number;
  periodCode?: string;
  status?: StoreSettlementStatus;
  storeId?: number;
}

interface SettlementPageResult {
  hasNext: boolean;
  items: StoreSettlementSummary[];
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface SettlementConfirmParams {
  remark?: string;
}

interface SettlementPaymentParams {
  paymentReference: string;
  remark?: string;
}

function generateSettlementPeriodApi(periodCode: string) {
  return requestClient.post<SettlementGenerationResult>(
    `/settlement-periods/${encodeURIComponent(periodCode)}/generate`,
  );
}

function getSettlementPageApi(params: SettlementPageParams) {
  return requestClient.get<SettlementPageResult>('/settlements', { params });
}

function getSettlementDetailApi(settlementNo: string) {
  return requestClient.get<StoreSettlementDetail>(
    `/settlements/${encodeURIComponent(settlementNo)}`,
  );
}

function confirmSettlementApi(
  settlementNo: string,
  data: SettlementConfirmParams,
) {
  return requestClient.post<StoreSettlementDetail>(
    `/settlements/${encodeURIComponent(settlementNo)}/confirm`,
    data,
  );
}

function markSettlementPaidApi(
  settlementNo: string,
  data: SettlementPaymentParams,
) {
  return requestClient.post<StoreSettlementDetail>(
    `/settlements/${encodeURIComponent(settlementNo)}/mark-paid`,
    data,
  );
}

export {
  confirmSettlementApi,
  generateSettlementPeriodApi,
  getSettlementDetailApi,
  getSettlementPageApi,
  markSettlementPaidApi,
};
export type {
  SettlementConfirmParams,
  SettlementGenerationResult,
  SettlementItemType,
  SettlementPageParams,
  SettlementPageResult,
  SettlementPaymentParams,
  SettlementPeriodStatus,
  StoreSettlementDetail,
  StoreSettlementItem,
  StoreSettlementStatus,
  StoreSettlementSummary,
};
