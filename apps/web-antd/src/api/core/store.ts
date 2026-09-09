import { requestClient } from '#/api/request';

type StoreStatus = 'ACTIVE' | 'CLOSED' | 'PENDING' | 'SUSPENDED';

interface MerchantOption {
  businessName: string;
  merchantCode: string;
  merchantId: number;
}

interface StoreManagementItem {
  address: string;
  contactPhone: string;
  createTime: string;
  merchantCode: string;
  merchantId: number;
  merchantName: string;
  status: StoreStatus;
  storeCode: string;
  storeId: number;
  storeName: string;
  updateTime: string;
}

interface StorePageResult {
  hasNext: boolean;
  items: StoreManagementItem[];
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface StorePageParams {
  keyword?: string;
  merchantId?: number;
  pageNum: number;
  pageSize: number;
  status?: StoreStatus;
}

interface StoreCreateParams {
  address: string;
  contactPhone: string;
  merchantId: number;
  storeCode: string;
  storeName: string;
}

type StoreUpdateParams = Pick<
  StoreCreateParams,
  'address' | 'contactPhone' | 'storeName'
>;

function getStorePageApi(params: StorePageParams) {
  return requestClient.get<StorePageResult>('/stores/page', { params });
}

function getMerchantOptionsApi() {
  return requestClient.get<MerchantOption[]>('/stores/merchant-options');
}

function createStoreApi(data: StoreCreateParams) {
  return requestClient.post<StoreManagementItem>('/stores', data);
}

function updateStoreApi(storeId: number, data: StoreUpdateParams) {
  return requestClient.put<StoreManagementItem>(`/stores/${storeId}`, data);
}

function updateStoreStatusApi(storeId: number, status: StoreStatus) {
  return requestClient.put<StoreManagementItem>(`/stores/${storeId}/status`, {
    status,
  });
}

export {
  createStoreApi,
  getMerchantOptionsApi,
  getStorePageApi,
  updateStoreApi,
  updateStoreStatusApi,
};
export type {
  MerchantOption,
  StoreCreateParams,
  StoreManagementItem,
  StorePageParams,
  StorePageResult,
  StoreStatus,
  StoreUpdateParams,
};
