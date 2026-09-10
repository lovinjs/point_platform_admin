import type { PlatformAdminAccount } from './user';

import { requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    expiresAt: string;
    expiresInSeconds: number;
    tokenType: 'Bearer';
    user: PlatformAdminAccount;
  }

  export interface ChangePasswordParams {
    currentPassword: string;
    newPassword: string;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/** 修改当前后台账号的登录密码 */
export async function changePasswordApi(data: AuthApi.ChangePasswordParams) {
  return requestClient.put<unknown>('/auth/password', data);
}

/**
 * 退出登录
 * 后端当前使用无状态 JWT，退出由前端清除本地令牌完成。
 */
export function logoutApi() {
  return Promise.resolve();
}
