import { requestClient } from '#/api/request';

interface DashboardPeriodMetrics {
  consumptionGrossCent: number;
  consumptionOrderCount: number;
  consumptionPoints: number;
  netRechargeCashCent: number;
  platformFeeCent: number;
  rechargeOrderCount: number;
  rechargePoints: number;
  rechargeReceiptCent: number;
  refundOrderCount: number;
  refundOutflowCent: number;
  refundPoints: number;
  storePayableCent: number;
}

interface DashboardDailyMetrics {
  businessDate: string;
  consumptionGrossCent: number;
  netRechargeCashCent: number;
  platformFeeCent: number;
  rechargeReceiptCent: number;
  refundOutflowCent: number;
  storePayableCent: number;
}

interface DashboardBacklog {
  awaitingPlatformPaymentCent: number;
  awaitingPlatformPaymentCount: number;
  awaitingStoreConfirmationCent: number;
  awaitingStoreConfirmationCount: number;
  notIncludedConsumptionCount: number;
  notIncludedPayableCent: number;
  pendingConsumptionCount: number;
}

interface DashboardOverview {
  backlog: DashboardBacklog;
  currentMonth: DashboardPeriodMetrics;
  currentMonthStartDate: string;
  generatedTime: string;
  globalScope: boolean;
  selectedStoreCode: null | string;
  selectedStoreId: null | number;
  selectedStoreName: null | string;
  today: DashboardPeriodMetrics;
  todayDate: string;
  trend: DashboardDailyMetrics[];
  trendDays: number;
  trendStartDate: string;
}

interface DashboardOverviewParams {
  storeId?: number;
  trendDays: 7 | 30;
}

function getDashboardOverviewApi(params: DashboardOverviewParams) {
  return requestClient.get<DashboardOverview>('/dashboard/overview', {
    params,
  });
}

export { getDashboardOverviewApi };
export type {
  DashboardBacklog,
  DashboardDailyMetrics,
  DashboardOverview,
  DashboardOverviewParams,
  DashboardPeriodMetrics,
};
