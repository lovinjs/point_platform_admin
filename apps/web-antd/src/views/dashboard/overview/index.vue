<script lang="ts" setup>
import type {
  DashboardBacklog,
  DashboardOverview,
  DashboardPeriodMetrics,
  OrderStoreOption,
} from '#/api';
import type { PlatformAdminRole, PlatformAdminUserInfo } from '#/api/core/user';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Row,
  Select,
  SelectOption,
  Space,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getDashboardOverviewApi, getOrderStoreOptionsApi } from '#/api';

import BusinessTrend from './business-trend.vue';

const roleLabels: Record<PlatformAdminRole, string> = {
  CLERK: '店员',
  STORE_MANAGER: '店长',
  SUPER_ADMIN: '超级管理员',
};

const storeStatusLabel = {
  ACTIVE: '营业中',
  CLOSED: '已关闭',
  PENDING: '待启用',
  SUSPENDED: '已停用',
};

const emptyPeriod: DashboardPeriodMetrics = {
  consumptionGrossCent: 0,
  consumptionOrderCount: 0,
  consumptionPoints: 0,
  netRechargeCashCent: 0,
  platformFeeCent: 0,
  rechargeOrderCount: 0,
  rechargePoints: 0,
  rechargeReceiptCent: 0,
  refundOrderCount: 0,
  refundOutflowCent: 0,
  refundPoints: 0,
  storePayableCent: 0,
};

const emptyBacklog: DashboardBacklog = {
  awaitingPlatformPaymentCent: 0,
  awaitingPlatformPaymentCount: 0,
  awaitingStoreConfirmationCent: 0,
  awaitingStoreConfirmationCount: 0,
  notIncludedConsumptionCount: 0,
  notIncludedPayableCent: 0,
  pendingConsumptionCount: 0,
};

const router = useRouter();
const userStore = useUserStore();
const currentUser = computed(
  () => userStore.userInfo as null | PlatformAdminUserInfo,
);
const isSuperAdmin = computed(() =>
  Boolean(currentUser.value?.roles.includes('SUPER_ADMIN')),
);
const isStoreManager = computed(() =>
  Boolean(currentUser.value?.roles.includes('STORE_MANAGER')),
);
const canViewBusinessData = computed(
  () => isSuperAdmin.value || isStoreManager.value,
);
const storeCount = computed(() => currentUser.value?.storeIds.length ?? 0);

const overview = ref<DashboardOverview>();
const storeOptions = ref<OrderStoreOption[]>([]);
const selectedStoreId = ref<number>();
const trendDays = ref<7 | 30>(7);
const loading = ref(false);
const today = computed(() => overview.value?.today ?? emptyPeriod);
const currentMonth = computed(
  () => overview.value?.currentMonth ?? emptyPeriod,
);
const backlog = computed(() => overview.value?.backlog ?? emptyBacklog);
const scopeDescription = computed(() => {
  if (!overview.value) return '正在读取当前账号的数据权限';
  if (overview.value.selectedStoreName) {
    return `当前仅统计 ${overview.value.selectedStoreName} 的经营数据`;
  }
  return overview.value.globalScope
    ? '当前统计平台全部门店的经营数据'
    : '当前合并统计你负责的全部门店';
});

async function loadStoreOptions() {
  storeOptions.value = await getOrderStoreOptionsApi();
}

async function loadOverview() {
  if (!canViewBusinessData.value) return;
  loading.value = true;
  try {
    overview.value = await getDashboardOverviewApi({
      storeId: selectedStoreId.value,
      trendDays: trendDays.value,
    });
  } finally {
    loading.value = false;
  }
}

function resetFilter() {
  selectedStoreId.value = undefined;
  trendDays.value = 7;
  void loadOverview();
}

function storeOptionLabel(store: OrderStoreOption) {
  const status =
    store.storeStatus === 'ACTIVE'
      ? ''
      : ` · ${storeStatusLabel[store.storeStatus]}`;
  return `${store.storeName}（${store.storeCode}）${status}`;
}

function formatYuan(amountCent: number) {
  return `${amountCent < 0 ? '-' : ''}¥${(Math.abs(amountCent) / 100).toFixed(2)}`;
}

function formatTime(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function navigate(path: string) {
  void router.push(path);
}

onMounted(async () => {
  if (!canViewBusinessData.value) return;
  await loadStoreOptions();
  await loadOverview();
});
</script>

<template>
  <Page
    :description="
      canViewBusinessData
        ? '查看今日、本月经营数据和待处理事项，数据范围由当前账号角色及门店授权决定。'
        : '快速进入门店收银和订单查询，经营财务数据仅向店长和超级管理员开放。'
    "
    title="平台工作台"
  >
    <template v-if="canViewBusinessData">
      <Alert
        class="mb-4"
        :description="`${scopeDescription}。充值、退款、消费均按完成时间统计；首页数字用于运营观察，正式核账请使用财务对账页面。`"
        message="经营数据已按账号权限隔离"
        show-icon
        type="info"
      />

      <Card class="mb-4">
        <Row :gutter="12">
          <Col :lg="9" :md="12" :xs="24">
            <Select
              v-model:value="selectedStoreId"
              allow-clear
              class="w-full"
              placeholder="合并查看全部可管理门店"
              show-search
              :filter-option="
                (input: string, option: any) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
              "
            >
              <SelectOption
                v-for="store in storeOptions"
                :key="store.storeId"
                :label="storeOptionLabel(store)"
                :value="store.storeId"
              >
                {{ storeOptionLabel(store) }}
              </SelectOption>
            </Select>
          </Col>
          <Col :lg="5" :md="6" :xs="24">
            <Select v-model:value="trendDays" class="w-full">
              <SelectOption :value="7">最近 7 天趋势</SelectOption>
              <SelectOption :value="30">最近 30 天趋势</SelectOption>
            </Select>
          </Col>
          <Col :lg="10" :md="6" :xs="24">
            <Space wrap>
              <Button :loading="loading" type="primary" @click="loadOverview">
                刷新数据
              </Button>
              <Button @click="resetFilter">重置</Button>
              <Button @click="navigate('/operation/orders')">查看订单</Button>
              <Button
                v-if="isSuperAdmin"
                @click="navigate('/settlement/reconciliation')"
              >
                财务对账
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row :gutter="12" class="mb-4">
        <Col :lg="6" :sm="12" :xs="24">
          <Card :loading="loading" class="metric-card" size="small">
            <div class="metric-label">今日充值实收</div>
            <div class="metric-value text-blue-600">
              {{ formatYuan(today.rechargeReceiptCent) }}
            </div>
            <div class="metric-note">
              {{ today.rechargeOrderCount }} 笔 ·
              {{ today.rechargePoints }} 积分
            </div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card :loading="loading" class="metric-card" size="small">
            <div class="metric-label">今日消费总额</div>
            <div class="metric-value text-green-600">
              {{ formatYuan(today.consumptionGrossCent) }}
            </div>
            <div class="metric-note">
              {{ today.consumptionOrderCount }} 笔 ·
              {{ today.consumptionPoints }} 积分
            </div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card :loading="loading" class="metric-card" size="small">
            <div class="metric-label">本月充值净现金</div>
            <div class="metric-value">
              {{ formatYuan(currentMonth.netRechargeCashCent) }}
            </div>
            <div class="metric-note">
              实收 {{ formatYuan(currentMonth.rechargeReceiptCent) }} · 退款
              {{ formatYuan(currentMonth.refundOutflowCent) }}
            </div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card :loading="loading" class="metric-card" size="small">
            <div class="metric-label">本月消费总额</div>
            <div class="metric-value">
              {{ formatYuan(currentMonth.consumptionGrossCent) }}
            </div>
            <div class="metric-note">
              {{ currentMonth.consumptionOrderCount }} 笔 ·
              {{ currentMonth.consumptionPoints }} 积分
            </div>
          </Card>
        </Col>
      </Row>

      <Row :gutter="12" class="mb-4">
        <Col :lg="6" :sm="12" :xs="24">
          <Card :loading="loading" class="metric-card" size="small">
            <div class="metric-label">本月平台手续费</div>
            <div class="metric-value text-purple-600">
              {{ formatYuan(currentMonth.platformFeeCent) }}
            </div>
            <div class="metric-note">按已完成消费订单归集</div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card :loading="loading" class="metric-card" size="small">
            <div class="metric-label">本月门店应付</div>
            <div class="metric-value">
              {{ formatYuan(currentMonth.storePayableCent) }}
            </div>
            <div class="metric-note">消费总额减平台手续费</div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card :loading="loading" class="metric-card" size="small">
            <div class="metric-label">待生成结算</div>
            <div class="metric-value text-orange-600">
              {{ formatYuan(backlog.notIncludedPayableCent) }}
            </div>
            <div class="metric-note">
              {{ backlog.notIncludedConsumptionCount }} 笔已完成消费
            </div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card :loading="loading" class="metric-card" size="small">
            <div class="metric-label">待平台付款</div>
            <div class="metric-value text-red-500">
              {{ formatYuan(backlog.awaitingPlatformPaymentCent) }}
            </div>
            <div class="metric-note">
              {{ backlog.awaitingPlatformPaymentCount }} 张已确认结算单
            </div>
          </Card>
        </Col>
      </Row>

      <Row :gutter="16" class="mb-4">
        <Col :lg="17" :xs="24">
          <Card
            :loading="loading"
            :title="`最近 ${overview?.trendDays ?? trendDays} 天资金与消费趋势`"
          >
            <BusinessTrend :data="overview?.trend ?? []" />
            <div class="text-xs text-gray-400">
              蓝线为当日充值实收减退款支出，绿线为当日完成消费总额。
            </div>
          </Card>
        </Col>
        <Col :lg="7" :xs="24">
          <Card class="mt-4 lg:mt-0" title="待处理事项">
            <div class="backlog-row">
              <div>
                <div class="font-medium">待用户确认消费</div>
                <div class="text-xs text-gray-400">仅统计尚未过期订单</div>
              </div>
              <strong>{{ backlog.pendingConsumptionCount }} 笔</strong>
            </div>
            <div class="backlog-row">
              <div>
                <div class="font-medium">待门店确认结算</div>
                <div class="text-xs text-gray-400">
                  {{ formatYuan(backlog.awaitingStoreConfirmationCent) }}
                </div>
              </div>
              <strong>{{ backlog.awaitingStoreConfirmationCount }} 张</strong>
            </div>
            <div class="backlog-row border-b-0">
              <div>
                <div class="font-medium">待平台登记付款</div>
                <div class="text-xs text-gray-400">
                  {{ formatYuan(backlog.awaitingPlatformPaymentCent) }}
                </div>
              </div>
              <strong>{{ backlog.awaitingPlatformPaymentCount }} 张</strong>
            </div>
            <Button
              class="mt-4 w-full"
              type="primary"
              @click="navigate('/settlement/monthly')"
            >
              进入月度结算
            </Button>
          </Card>
        </Col>
      </Row>

      <div v-if="overview" class="mb-4 text-right text-xs text-gray-400">
        数据更新于 {{ formatTime(overview.generatedTime) }}，今日统计日期为
        {{ overview.todayDate }}。
      </div>
    </template>

    <Alert
      v-else
      class="mb-4"
      description="店员可以进行门店充值、创建消费订单并查询本门店订单。涉及平台手续费、门店应付和结算的经营数据仅向店长及超级管理员开放。"
      message="当前账号为门店操作角色"
      show-icon
      type="info"
    />

    <Row :gutter="16">
      <Col :lg="16" :xs="24">
        <Card title="当前账号">
          <Descriptions bordered :column="1">
            <DescriptionsItem label="姓名">
              {{ currentUser?.realName || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="用户名">
              {{ currentUser?.username || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="角色">
              <Tag
                v-for="role in currentUser?.roles ?? []"
                :key="role"
                color="blue"
              >
                {{ roleLabels[role] ?? role }}
              </Tag>
            </DescriptionsItem>
            <DescriptionsItem label="负责门店">
              {{
                isSuperAdmin
                  ? '平台全部门店'
                  : storeCount > 0
                    ? `${storeCount} 家`
                    : '暂无绑定门店'
              }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </Col>
      <Col :lg="8" :xs="24">
        <Card class="mt-4 lg:mt-0" title="快捷入口">
          <Space class="w-full" direction="vertical" size="middle">
            <Button
              block
              type="primary"
              @click="navigate('/operation/cashier')"
            >
              进入门店收银台
            </Button>
            <Button block @click="navigate('/operation/orders')">
              查询订单记录
            </Button>
            <Button
              v-if="canViewBusinessData"
              block
              @click="navigate('/settlement/monthly')"
            >
              查看月度结算
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  </Page>
</template>

<style scoped>
.metric-card {
  height: 116px;
  margin-bottom: 12px;
}

.metric-label {
  font-size: 13px;
  color: rgb(107 114 128);
}

.metric-value {
  margin-top: 8px;
  font-size: 23px;
  font-weight: 600;
  line-height: 30px;
}

.metric-note {
  margin-top: 5px;
  font-size: 12px;
  color: rgb(156 163 175);
}

.backlog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid rgb(229 231 235);
}
</style>
