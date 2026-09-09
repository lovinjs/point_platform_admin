import { requestClient } from '#/api/request';

type StaffRoleCode = 'CLERK' | 'STORE_MANAGER' | 'SUPER_ADMIN';
type StaffStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED';
type StaffWritableStatus = Exclude<StaffStatus, 'LOCKED'>;
type StaffStoreStatus = 'ACTIVE' | 'CLOSED' | 'PENDING' | 'SUSPENDED';
type StaffMerchantStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED';

interface StaffStoreItem {
  merchantId: number;
  merchantName: null | string;
  merchantStatus: null | StaffMerchantStatus;
  storeCode: string;
  storeId: number;
  storeName: string;
  storeStatus: StaffStoreStatus;
}

interface StaffManagementItem {
  createTime: string;
  failedLoginCount: number;
  lastLoginTime: null | string;
  lockedUntil: null | string;
  loginLocked: boolean;
  passwordUpdatedTime: null | string;
  phone: null | string;
  realName: string;
  roleCodes: StaffRoleCode[];
  status: StaffStatus;
  stores: StaffStoreItem[];
  updateTime: string;
  userId: number;
  username: string;
}

interface StaffPageResult {
  hasNext: boolean;
  items: StaffManagementItem[];
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface StaffPageParams {
  keyword?: string;
  pageNum: number;
  pageSize: number;
  roleCode?: StaffRoleCode;
  status?: StaffStatus;
  storeId?: number;
}

interface StaffCreateParams {
  initialPassword: string;
  phone?: string;
  realName: string;
  roleCode: Exclude<StaffRoleCode, 'SUPER_ADMIN'>;
  storeId: number;
  username: string;
}

type StaffUpdateParams = Omit<
  StaffCreateParams,
  'initialPassword' | 'username'
>;

function getStaffPageApi(params: StaffPageParams) {
  return requestClient.get<StaffPageResult>('/staff', { params });
}

function getStaffStoreOptionsApi() {
  return requestClient.get<StaffStoreItem[]>('/staff/store-options');
}

function createStaffApi(data: StaffCreateParams) {
  return requestClient.post<StaffManagementItem>('/staff', data);
}

function updateStaffApi(userId: number, data: StaffUpdateParams) {
  return requestClient.put<StaffManagementItem>(`/staff/${userId}`, data);
}

function updateStaffStatusApi(userId: number, status: StaffWritableStatus) {
  return requestClient.put<StaffManagementItem>(`/staff/${userId}/status`, {
    status,
  });
}

function resetStaffPasswordApi(userId: number, newPassword: string) {
  return requestClient.put<unknown>(`/staff/${userId}/password`, {
    newPassword,
  });
}

function unlockStaffApi(userId: number) {
  return requestClient.put<StaffManagementItem>(`/staff/${userId}/unlock`);
}

export {
  createStaffApi,
  getStaffPageApi,
  getStaffStoreOptionsApi,
  resetStaffPasswordApi,
  unlockStaffApi,
  updateStaffApi,
  updateStaffStatusApi,
};
export type {
  StaffCreateParams,
  StaffManagementItem,
  StaffMerchantStatus,
  StaffPageParams,
  StaffPageResult,
  StaffRoleCode,
  StaffStatus,
  StaffStoreItem,
  StaffStoreStatus,
  StaffUpdateParams,
  StaffWritableStatus,
};
