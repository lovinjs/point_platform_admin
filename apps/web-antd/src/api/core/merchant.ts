import { requestClient } from '#/api/request';

type MerchantStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED';

interface MerchantManagementItem {
  agreementNo: null | string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  createTime: string;
  legalName: string;
  merchantCode: string;
  merchantId: number;
  status: MerchantStatus;
  unifiedSocialCreditCode: null | string;
  updateTime: string;
}

interface MerchantPageResult {
  hasNext: boolean;
  items: MerchantManagementItem[];
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface MerchantPageParams {
  keyword?: string;
  pageNum: number;
  pageSize: number;
  status?: MerchantStatus;
}

interface MerchantCreateParams {
  agreementNo?: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  legalName: string;
  merchantCode: string;
  unifiedSocialCreditCode?: string;
}

type MerchantUpdateParams = Omit<MerchantCreateParams, 'merchantCode'>;

function getMerchantPageApi(params: MerchantPageParams) {
  return requestClient.get<MerchantPageResult>('/merchants', { params });
}

function createMerchantApi(data: MerchantCreateParams) {
  return requestClient.post<MerchantManagementItem>('/merchants', data);
}

function updateMerchantApi(merchantId: number, data: MerchantUpdateParams) {
  return requestClient.put<MerchantManagementItem>(
    `/merchants/${merchantId}`,
    data,
  );
}

function updateMerchantStatusApi(merchantId: number, status: MerchantStatus) {
  return requestClient.put<MerchantManagementItem>(
    `/merchants/${merchantId}/status`,
    { status },
  );
}

export {
  createMerchantApi,
  getMerchantPageApi,
  updateMerchantApi,
  updateMerchantStatusApi,
};
export type {
  MerchantCreateParams,
  MerchantManagementItem,
  MerchantPageParams,
  MerchantPageResult,
  MerchantStatus,
  MerchantUpdateParams,
};
