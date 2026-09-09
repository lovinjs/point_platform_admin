import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

type PlatformAdminRole = 'CLERK' | 'STORE_MANAGER' | 'SUPER_ADMIN';

interface PlatformAdminAccount {
  realName: string;
  roles: PlatformAdminRole[];
  storeIds: number[];
  userId: number;
  username: string;
}

interface PlatformAdminUserInfo extends UserInfo {
  roles: PlatformAdminRole[];
  storeIds: number[];
}

const roleLabels: Record<PlatformAdminRole, string> = {
  CLERK: '店员',
  STORE_MANAGER: '店长',
  SUPER_ADMIN: '超级管理员',
};

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const account = await requestClient.get<PlatformAdminAccount>('/auth/me');
  return toUserInfo(account);
}

function toUserInfo(account: PlatformAdminAccount): PlatformAdminUserInfo {
  const roles = Array.isArray(account.roles) ? account.roles : [];
  const storeIds = Array.isArray(account.storeIds) ? account.storeIds : [];
  return {
    avatar: '/favicon.ico',
    desc: roles.map((role) => roleLabels[role] ?? role).join('、'),
    homePath: '/dashboard/overview',
    realName: account.realName || account.username,
    roles,
    storeIds,
    token: '',
    userId: String(account.userId),
    username: account.username,
  };
}

export type { PlatformAdminAccount, PlatformAdminRole, PlatformAdminUserInfo };
