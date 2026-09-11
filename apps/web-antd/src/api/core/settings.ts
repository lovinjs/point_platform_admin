import { requestClient } from '#/api/request';

interface PlatformBusinessSetting {
  bonusPointsEnabled: boolean;
  consumptionPendingTtlMinutes: number;
  lastUpdatedBy: null | number;
  lastUpdatedByName: null | string;
  platformFeeRateBps: number;
  pointsPerYuan: number;
  updateTime: string;
  version: number;
}

interface PlatformBusinessSettingUpdateParams {
  changeReason: string;
  consumptionPendingTtlMinutes: number;
  platformFeeRateBps: number;
  version: number;
}

function getPlatformBusinessSettingApi() {
  return requestClient.get<PlatformBusinessSetting>(
    '/platform-settings/business',
  );
}

function updatePlatformBusinessSettingApi(
  data: PlatformBusinessSettingUpdateParams,
) {
  return requestClient.put<PlatformBusinessSetting>(
    '/platform-settings/business',
    data,
  );
}

export { getPlatformBusinessSettingApi, updatePlatformBusinessSettingApi };
export type { PlatformBusinessSetting, PlatformBusinessSettingUpdateParams };
