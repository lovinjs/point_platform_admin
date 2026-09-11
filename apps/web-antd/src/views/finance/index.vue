<script lang="ts" setup>
import type { TableProps } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import type {
  AdminAuditLog,
  AuditActorType,
  AuditLogPageParams,
  FinancialMetrics,
  FinancialStoreView,
  OrderStoreOption,
} from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlob } from '@vben/utils';

import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Input,
  message,
  Row,
  Select,
  SelectOption,
  Space,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  exportFinancialReconciliationApi,
  getAuditActionsApi,
  getAuditLogPageApi,
  getFinancialReconciliationApi,
  getOrderStoreOptionsApi,
} from '#/api';

type FinanceTab = 'audit' | 'reconciliation';

interface TablePagination {
  current?: number;
  pageSize?: number;
}

const actionLabel: Record<string, string> = {
  ADMIN_LOGIN_SUCCEEDED: '后台登录成功',
  ADMIN_PASSWORD_CHANGED: '后台账号修改密码',
  CONSUMPTION_ORDER_CONFIRMED: '用户确认消费',
  CONSUMPTION_ORDER_PREPARED: '创建待消费订单',
  CONSUMPTION_ORDER_REVERSED: '消费异常冲正',
  CUSTOMER_CONSUME_PIN_CHANGED: '修改消费密码',
  CUSTOMER_CONSUME_PIN_LOCKED: '消费密码被锁定',
  CUSTOMER_CONSUME_PIN_RESET: '重置消费密码',
  CUSTOMER_CONSUME_PIN_SET: '设置消费密码',
  CUSTOMER_DISABLED: '冻结客户账户',
  CUSTOMER_ENABLED: '恢复客户账户',
  CUSTOMER_PHONE_BOUND: '绑定手机号',
  CUSTOMER_WECHAT_H5_REGISTERED: '微信用户注册',
  INITIAL_SUPER_ADMIN_CREATED: '创建初始超级管理员',
  MERCHANT_CREATED: '创建商户',
  MERCHANT_ENABLED: '启用商户',
  MERCHANT_SUSPENDED: '停用商户',
  MERCHANT_UPDATED: '修改商户',
  OFFLINE_RECHARGE_COMPLETED: '线下充值完成',
  RECHARGE_REFUND_COMPLETED: '充值全额退款',
  SETTLEMENT_PERIOD_GENERATED: '生成月度结算',
  STAFF_CREATED: '创建员工',
  STAFF_DISABLED: '停用员工',
  STAFF_ENABLED: '启用员工',
  STAFF_LOGIN_UNLOCKED: '解除登录锁定',
  STAFF_PASSWORD_RESET: '重置员工密码',
  STAFF_UPDATED: '修改员工',
  STORE_CREATED: '创建门店',
  STORE_ENABLED: '启用门店',
  STORE_SETTLEMENT_CONFIRMED: '门店确认结算',
  STORE_SETTLEMENT_PAID: '登记结算付款',
  STORE_SUSPENDED: '停用门店',
  STORE_UPDATED: '修改门店',
};

const actorTypeMeta: Record<AuditActorType, { color: string; label: string }> =
  {
    CUSTOMER: { color: 'blue', label: '消费者' },
    SYSTEM: { color: 'default', label: '系统' },
    SYS_USER: { color: 'purple', label: '后台人员' },
  };

const roleLabel = {
  CLERK: '店员',
  STORE_MANAGER: '店长',
  SUPER_ADMIN: '超级管理员',
};

const storeStatusMeta = {
  ACTIVE: { color: 'green', label: '营业中' },
  CLOSED: { color: 'default', label: '已关闭' },
  PENDING: { color: 'blue', label: '待启用' },
  SUSPENDED: { color: 'orange', label: '已停用' },
};

const reconciliationColumns: TableProps<FinancialStoreView>['columns'] = [
  {
    dataIndex: 'storeName',
    fixed: 'left',
    key: 'store',
    title: '门店',
    width: 210,
  },
  {
    children: [
      {
        dataIndex: 'rechargeReceiptCent',
        key: 'receipt',
        title: '充值实收',
        width: 130,
      },
      {
        dataIndex: 'refundOutflowCent',
        key: 'refund',
        title: '退款支出',
        width: 130,
      },
      {
        dataIndex: 'netRechargeCashCent',
        key: 'netCash',
        title: '充值净现金',
        width: 140,
      },
    ],
    title: '平台现金（按收款/退款完成日）',
  },
  {
    children: [
      {
        dataIndex: 'consumptionGrossCent',
        key: 'gross',
        title: '消费总额',
        width: 130,
      },
      {
        dataIndex: 'platformFeeCent',
        key: 'fee',
        title: '平台手续费',
        width: 130,
      },
      {
        dataIndex: 'storePayableCent',
        key: 'payable',
        title: '门店应付',
        width: 130,
      },
    ],
    title: '消费归属（按消费完成日）',
  },
  {
    children: [
      {
        dataIndex: 'notIncludedPayableCent',
        key: 'notIncluded',
        title: '待生成结算',
        width: 140,
      },
      {
        dataIndex: 'includedPayableCent',
        key: 'included',
        title: '已纳入结算单',
        width: 140,
      },
      {
        dataIndex: 'settledPayableCent',
        key: 'settled',
        title: '已完成结算',
        width: 140,
      },
    ],
    title: '上述消费当前结算状态',
  },
  {
    dataIndex: 'settlementPaidCent',
    key: 'paid',
    title: '期间实际付款',
    width: 140,
  },
];

const auditColumns: TableProps<AdminAuditLog>['columns'] = [
  { dataIndex: 'createTime', key: 'time', title: '操作时间', width: 175 },
  { dataIndex: 'action', key: 'action', title: '操作', width: 210 },
  { dataIndex: 'actorName', key: 'actor', title: '操作主体', width: 185 },
  { dataIndex: 'storeName', key: 'store', title: '相关门店', width: 180 },
  { dataIndex: 'resourceNo', key: 'resource', title: '业务资源', width: 220 },
  { dataIndex: 'requestId', key: 'request', title: '请求编号', width: 180 },
  { dataIndex: 'remark', key: 'remark', title: '备注', width: 220 },
  { fixed: 'right', key: 'detail', title: '详情', width: 90 },
];

const emptyMetrics: FinancialMetrics = {
  consumptionGrossCent: 0,
  consumptionPoints: 0,
  includedPayableCent: 0,
  netRechargeCashCent: 0,
  notIncludedPayableCent: 0,
  platformFeeCent: 0,
  rechargePoints: 0,
  rechargeReceiptCent: 0,
  refundOutflowCent: 0,
  refundPoints: 0,
  settledPayableCent: 0,
  settlementPaidCent: 0,
  storePayableCent: 0,
};

const activeTab = ref<FinanceTab>('reconciliation');
const storeOptions = ref<OrderStoreOption[]>([]);
const auditActions = ref<string[]>([]);

const reconciliationRange = ref<[string, string]>(currentMonthRange());
const reconciliationStoreId = ref<number>();
const reconciliationLoading = ref(false);
const reconciliationExporting = ref(false);
const reconciliation =
  ref<Awaited<ReturnType<typeof getFinancialReconciliationApi>>>();
const summary = computed(() => reconciliation.value?.summary ?? emptyMetrics);

const auditRange = ref<[string, string]>(recentRange());
const auditQuery = reactive<AuditLogPageParams>({
  endDate: auditRange.value[1],
  pageNum: 1,
  pageSize: 20,
  startDate: auditRange.value[0],
});
const auditLogs = ref<AdminAuditLog[]>([]);
const auditTotal = ref(0);
const auditLoading = ref(false);
const auditDetailOpen = ref(false);
const auditDetail = ref<AdminAuditLog>();

const auditPagination = computed(() => ({
  current: auditQuery.pageNum,
  pageSize: auditQuery.pageSize,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 条审计记录`,
  total: auditTotal.value,
}));

function currentMonthRange(): [string, string] {
  return [
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ];
}

function recentRange(): [string, string] {
  return [
    dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ];
}

function validRange(value?: [string, string]) {
  if (!value?.[0] || !value[1]) return false;
  const start = dayjs(value[0]);
  const end = dayjs(value[1]);
  return !end.isBefore(start, 'day') && end.diff(start, 'day') < 366;
}

async function loadStoreOptions() {
  storeOptions.value = await getOrderStoreOptionsApi();
}

async function loadReconciliation() {
  if (!validRange(reconciliationRange.value)) {
    message.warning('请选择不超过366天的有效对账日期范围');
    return;
  }
  reconciliationLoading.value = true;
  try {
    reconciliation.value = await getFinancialReconciliationApi({
      endDate: reconciliationRange.value[1],
      startDate: reconciliationRange.value[0],
      storeId: reconciliationStoreId.value,
    });
  } finally {
    reconciliationLoading.value = false;
  }
}

async function exportReconciliation() {
  if (!validRange(reconciliationRange.value)) {
    message.warning('请选择不超过366天的有效对账日期范围');
    return;
  }
  reconciliationExporting.value = true;
  try {
    const startDate = reconciliationRange.value[0];
    const endDate = reconciliationRange.value[1];
    const file = await exportFinancialReconciliationApi({
      endDate,
      startDate,
      storeId: reconciliationStoreId.value,
    });
    downloadFileFromBlob({
      fileName: `财务对账_${startDate.replaceAll('-', '')}_${endDate.replaceAll('-', '')}.xlsx`,
      source: file,
    });
    message.success('财务对账报表已生成');
  } finally {
    reconciliationExporting.value = false;
  }
}

function resetReconciliation() {
  reconciliationRange.value = currentMonthRange();
  reconciliationStoreId.value = undefined;
  void loadReconciliation();
}

async function loadAuditLogs() {
  if (!validRange(auditRange.value)) {
    message.warning('请选择不超过366天的有效审计日期范围');
    return;
  }
  auditLoading.value = true;
  try {
    const result = await getAuditLogPageApi({
      ...auditQuery,
      action: normalizeOptional(auditQuery.action),
      endDate: auditRange.value[1],
      keyword: normalizeOptional(auditQuery.keyword),
      startDate: auditRange.value[0],
    });
    auditLogs.value = result.items;
    auditTotal.value = result.total;
    auditQuery.pageNum = result.pageNum;
    auditQuery.pageSize = result.pageSize;
  } finally {
    auditLoading.value = false;
  }
}

function searchAuditLogs() {
  auditQuery.pageNum = 1;
  void loadAuditLogs();
}

function resetAuditLogs() {
  auditRange.value = recentRange();
  Object.assign(auditQuery, {
    action: undefined,
    actorType: undefined,
    endDate: auditRange.value[1],
    keyword: undefined,
    pageNum: 1,
    pageSize: 20,
    startDate: auditRange.value[0],
    storeId: undefined,
  });
  void loadAuditLogs();
}

function handleAuditTableChange(value: TablePagination) {
  auditQuery.pageNum = value.current ?? 1;
  auditQuery.pageSize = value.pageSize ?? 20;
  void loadAuditLogs();
}

function openAuditDetail(log: AdminAuditLog) {
  auditDetail.value = log;
  auditDetailOpen.value = true;
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function disabledFutureDate(current: Dayjs) {
  return current.isAfter(dayjs().endOf('day'));
}

function storeOptionLabel(store: OrderStoreOption) {
  const status = storeStatusMeta[store.storeStatus];
  return `${store.storeName}（${store.storeCode}）${
    store.storeStatus === 'ACTIVE' ? '' : ` · ${status.label}`
  }`;
}

function formatYuan(amountCent: number) {
  return `${amountCent < 0 ? '-' : ''}¥${(Math.abs(amountCent) / 100).toFixed(2)}`;
}

function formatTime(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatAction(action: string) {
  return actionLabel[action] ?? action;
}

function prettyJson(value?: null | string) {
  if (!value) return '无';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

onMounted(async () => {
  await Promise.all([
    loadStoreOptions(),
    getAuditActionsApi().then((actions) => {
      auditActions.value = actions;
    }),
  ]);
  await Promise.all([loadReconciliation(), loadAuditLogs()]);
});
</script>

<template>
  <Page
    description="按实际发生日期核对平台现金、消费归属与门店付款，并追溯关键业务操作。仅超级管理员可查看。"
    title="财务对账与审计"
  >
    <Card class="mb-4">
      <Tabs v-model:active-key="activeTab">
        <Tabs.TabPane key="reconciliation" tab="财务对账" />
        <Tabs.TabPane key="audit" tab="操作审计" />
      </Tabs>
    </Card>

    <template v-if="activeTab === 'reconciliation'">
      <Alert
        class="mb-4"
        description="充值实收按充值完成日统计，退款按退款完成日统计，消费归属按消费完成日统计，实际付款按结算付款日统计。它们可能来自不同批次，期间金额不要求彼此相等。"
        message="请按资金或业务的实际发生日期理解各项数据"
        show-icon
        type="info"
      />

      <Card class="mb-4">
        <Row :gutter="12">
          <Col :lg="9" :md="14" :xs="24">
            <DatePicker.RangePicker
              v-model:value="reconciliationRange"
              :disabled-date="disabledFutureDate"
              class="w-full"
              value-format="YYYY-MM-DD"
            />
          </Col>
          <Col :lg="8" :md="10" :xs="24">
            <Select
              v-model:value="reconciliationStoreId"
              allow-clear
              class="w-full"
              placeholder="全部门店"
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
          <Col :lg="7" :md="24" :xs="24">
            <Space wrap>
              <Button
                :loading="reconciliationLoading"
                type="primary"
                @click="loadReconciliation"
              >
                查询对账
              </Button>
              <Button @click="resetReconciliation">重置</Button>
              <Button
                :loading="reconciliationExporting"
                @click="exportReconciliation"
              >
                导出 Excel
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row :gutter="12" class="mb-4">
        <Col :lg="6" :sm="12" :xs="24">
          <Card class="metric-card" size="small">
            <div class="metric-label">充值实收</div>
            <div class="metric-value">
              {{ formatYuan(summary.rechargeReceiptCent) }}
            </div>
            <div class="metric-note">{{ summary.rechargePoints }} 积分充值</div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card class="metric-card" size="small">
            <div class="metric-label">退款支出</div>
            <div class="metric-value text-orange-600">
              {{ formatYuan(summary.refundOutflowCent) }}
            </div>
            <div class="metric-note">{{ summary.refundPoints }} 积分退回</div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card class="metric-card" size="small">
            <div class="metric-label">充值净现金</div>
            <div class="metric-value text-blue-600">
              {{ formatYuan(summary.netRechargeCashCent) }}
            </div>
            <div class="metric-note">期间实收减期间退款</div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card class="metric-card" size="small">
            <div class="metric-label">消费总额</div>
            <div class="metric-value">
              {{ formatYuan(summary.consumptionGrossCent) }}
            </div>
            <div class="metric-note">
              {{ summary.consumptionPoints }} 积分消费
            </div>
          </Card>
        </Col>
      </Row>

      <Row :gutter="12" class="mb-4">
        <Col :lg="6" :sm="12" :xs="24">
          <Card class="metric-card" size="small">
            <div class="metric-label">平台手续费</div>
            <div class="metric-value text-green-600">
              {{ formatYuan(summary.platformFeeCent) }}
            </div>
            <div class="metric-note">来自期间完成消费</div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card class="metric-card" size="small">
            <div class="metric-label">门店应付</div>
            <div class="metric-value">
              {{ formatYuan(summary.storePayableCent) }}
            </div>
            <div class="metric-note">消费总额减平台手续费</div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card class="metric-card" size="small">
            <div class="metric-label">其中待生成结算</div>
            <div class="metric-value text-orange-600">
              {{ formatYuan(summary.notIncludedPayableCent) }}
            </div>
            <div class="metric-note">尚未纳入月度结算单</div>
          </Card>
        </Col>
        <Col :lg="6" :sm="12" :xs="24">
          <Card class="metric-card" size="small">
            <div class="metric-label">期间实际结算付款</div>
            <div class="metric-value text-purple-600">
              {{ formatYuan(summary.settlementPaidCent) }}
            </div>
            <div class="metric-note">可能对应更早月份的消费</div>
          </Card>
        </Col>
      </Row>

      <Card title="门店对账明细">
        <Table
          :columns="reconciliationColumns"
          :data-source="reconciliation?.stores ?? []"
          :loading="reconciliationLoading"
          :pagination="false"
          :row-key="(record: FinancialStoreView) => record.storeId"
          :scroll="{ x: 1670 }"
          bordered
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'store'">
              <div class="font-medium">{{ record.storeName }}</div>
              <div class="mt-1 text-xs text-gray-400">
                {{ record.storeCode }}
                <Tag
                  class="ml-1"
                  :color="
                    storeStatusMeta[
                      record.storeStatus as keyof typeof storeStatusMeta
                    ].color
                  "
                >
                  {{
                    storeStatusMeta[
                      record.storeStatus as keyof typeof storeStatusMeta
                    ].label
                  }}
                </Tag>
              </div>
            </template>
            <template v-else-if="column.key === 'receipt'">
              {{ formatYuan(record.rechargeReceiptCent) }}
              <div class="text-xs text-gray-400">
                {{ record.rechargePoints }} 积分
              </div>
            </template>
            <template v-else-if="column.key === 'refund'">
              {{ formatYuan(record.refundOutflowCent) }}
              <div class="text-xs text-gray-400">
                {{ record.refundPoints }} 积分
              </div>
            </template>
            <template v-else-if="column.key === 'netCash'">
              <strong>{{ formatYuan(record.netRechargeCashCent) }}</strong>
            </template>
            <template v-else-if="column.key === 'gross'">
              {{ formatYuan(record.consumptionGrossCent) }}
              <div class="text-xs text-gray-400">
                {{ record.consumptionPoints }} 积分
              </div>
            </template>
            <template v-else-if="column.key === 'fee'">
              {{ formatYuan(record.platformFeeCent) }}
            </template>
            <template v-else-if="column.key === 'payable'">
              <strong>{{ formatYuan(record.storePayableCent) }}</strong>
            </template>
            <template v-else-if="column.key === 'notIncluded'">
              {{ formatYuan(record.notIncludedPayableCent) }}
            </template>
            <template v-else-if="column.key === 'included'">
              {{ formatYuan(record.includedPayableCent) }}
            </template>
            <template v-else-if="column.key === 'settled'">
              {{ formatYuan(record.settledPayableCent) }}
            </template>
            <template v-else-if="column.key === 'paid'">
              <strong class="text-purple-600">
                {{ formatYuan(record.settlementPaidCent) }}
              </strong>
            </template>
          </template>
          <template #emptyText>所选范围内暂无相关财务记录</template>
        </Table>
        <div v-if="reconciliation" class="mt-3 text-xs text-gray-400">
          数据生成于 {{ formatTime(reconciliation.generatedTime) }}，统计范围
          {{ reconciliation.startDate }} 至 {{ reconciliation.endDate }}。
        </div>
      </Card>
    </template>

    <template v-else>
      <Alert
        class="mb-4"
        description="审计记录用于追踪谁在什么时间对哪项业务执行了操作。变更前后快照可能包含业务信息，仅超级管理员可见，页面不提供修改或删除入口。"
        message="关键业务审计记录为只读数据"
        show-icon
        type="warning"
      />

      <Card class="mb-4">
        <Row :gutter="12">
          <Col :lg="7" :md="12" :xs="24">
            <DatePicker.RangePicker
              v-model:value="auditRange"
              :disabled-date="disabledFutureDate"
              class="w-full"
              value-format="YYYY-MM-DD"
            />
          </Col>
          <Col :lg="5" :md="12" :xs="24">
            <Select
              v-model:value="auditQuery.storeId"
              allow-clear
              class="w-full"
              placeholder="全部门店"
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
          <Col :lg="4" :md="8" :xs="24">
            <Select
              v-model:value="auditQuery.actorType"
              allow-clear
              class="w-full"
              placeholder="全部操作主体"
            >
              <SelectOption
                v-for="(meta, actorType) in actorTypeMeta"
                :key="actorType"
                :value="actorType"
              >
                {{ meta.label }}
              </SelectOption>
            </Select>
          </Col>
          <Col :lg="4" :md="8" :xs="24">
            <Select
              v-model:value="auditQuery.action"
              allow-clear
              class="w-full"
              placeholder="全部操作类型"
              show-search
            >
              <SelectOption
                v-for="action in auditActions"
                :key="action"
                :value="action"
              >
                {{ formatAction(action) }}
              </SelectOption>
            </Select>
          </Col>
          <Col :lg="4" :md="8" :xs="24">
            <Input
              v-model:value="auditQuery.keyword"
              allow-clear
              :maxlength="100"
              placeholder="业务编号/请求号/备注"
              @press-enter="searchAuditLogs"
            />
          </Col>
        </Row>
        <div class="mt-3">
          <Space wrap>
            <Button
              :loading="auditLoading"
              type="primary"
              @click="searchAuditLogs"
            >
              查询审计记录
            </Button>
            <Button @click="resetAuditLogs">重置</Button>
          </Space>
        </div>
      </Card>

      <Card>
        <Table
          :columns="auditColumns"
          :data-source="auditLogs"
          :loading="auditLoading"
          :pagination="auditPagination"
          :row-key="(record: AdminAuditLog) => record.logId"
          :scroll="{ x: 1460 }"
          @change="handleAuditTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'time'">
              {{ formatTime(record.createTime) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="font-medium">{{ formatAction(record.action) }}</div>
              <div class="text-xs text-gray-400">{{ record.action }}</div>
            </template>
            <template v-else-if="column.key === 'actor'">
              <div>{{ record.actorName }}</div>
              <div class="mt-1">
                <Tag
                  :color="
                    actorTypeMeta[record.actorType as AuditActorType].color
                  "
                >
                  {{ actorTypeMeta[record.actorType as AuditActorType].label }}
                </Tag>
                <span v-if="record.operatorRole" class="text-xs text-gray-400">
                  {{ roleLabel[record.operatorRole as keyof typeof roleLabel] }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'store'">
              <template v-if="record.storeName">
                <div>{{ record.storeName }}</div>
                <div class="text-xs text-gray-400">{{ record.storeCode }}</div>
              </template>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'resource'">
              <div>{{ record.resourceNo || '-' }}</div>
              <div class="text-xs text-gray-400">{{ record.resourceType }}</div>
            </template>
            <template v-else-if="column.key === 'request'">
              <span class="break-all text-xs">{{
                record.requestId || '-'
              }}</span>
            </template>
            <template v-else-if="column.key === 'remark'">
              {{ record.remark || '-' }}
            </template>
            <template v-else-if="column.key === 'detail'">
              <Button
                size="small"
                type="link"
                @click="openAuditDetail(record as AdminAuditLog)"
              >
                查看
              </Button>
            </template>
          </template>
        </Table>
      </Card>
    </template>

    <Drawer
      v-model:open="auditDetailOpen"
      title="审计记录详情"
      width="min(860px, 94vw)"
    >
      <template v-if="auditDetail">
        <Descriptions bordered :column="2" size="small">
          <DescriptionsItem label="记录编号">
            {{ auditDetail.logId }}
          </DescriptionsItem>
          <DescriptionsItem label="操作时间">
            {{ formatTime(auditDetail.createTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="操作类型">
            {{ formatAction(auditDetail.action) }}
          </DescriptionsItem>
          <DescriptionsItem label="操作主体">
            {{ auditDetail.actorName }}（{{
              actorTypeMeta[auditDetail.actorType].label
            }}）
          </DescriptionsItem>
          <DescriptionsItem label="相关门店">
            {{ auditDetail.storeName || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="客户端 IP">
            {{ auditDetail.clientIp || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="资源">
            {{ auditDetail.resourceType }} / {{ auditDetail.resourceNo || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="请求编号">
            {{ auditDetail.requestId || '-' }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="备注">
            {{ auditDetail.remark || '-' }}
          </DescriptionsItem>
        </Descriptions>

        <Card class="mt-4" size="small" title="变更前快照">
          <pre class="snapshot">{{
            prettyJson(auditDetail.beforeSnapshot)
          }}</pre>
        </Card>
        <Card class="mt-4" size="small" title="变更后快照">
          <pre class="snapshot">{{
            prettyJson(auditDetail.afterSnapshot)
          }}</pre>
        </Card>
      </template>
    </Drawer>
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
  font-size: 24px;
  font-weight: 600;
  line-height: 30px;
}

.metric-note {
  margin-top: 5px;
  font-size: 12px;
  color: rgb(156 163 175);
}

.snapshot {
  max-height: 320px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  color: rgb(55 65 81);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  background: rgb(249 250 251);
  border-radius: 6px;
}
</style>
