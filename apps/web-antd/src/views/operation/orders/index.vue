<script lang="ts" setup>
import type { TableProps } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import type {
  AdminConsumptionOrder,
  AdminRechargeOrder,
  ConsumptionOrderExportParams,
  ConsumptionOrderPageParams,
  ConsumptionOrderStatus,
  ConsumptionReversalParams,
  OrderStoreOption,
  OrderStoreStatus,
  PaymentMethod,
  RechargeOrderExportParams,
  RechargeOrderPageParams,
  RechargeOrderStatus,
  RechargeRefundParams,
  RefundMethod,
  SettlementStatus,
} from '#/api';
import type { PlatformAdminUserInfo } from '#/api/core/user';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { downloadFileFromBlob } from '@vben/utils';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  FormItem,
  Input,
  message,
  Modal,
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
  exportConsumptionOrdersApi,
  exportRechargeOrdersApi,
  getConsumptionOrderPageApi,
  getOrderStoreOptionsApi,
  getRechargeOrderPageApi,
  refundRechargeOrderApi,
  reverseConsumptionOrderApi,
} from '#/api';

type OrderTab = 'consumption' | 'recharge';

interface TablePagination {
  current?: number;
  pageSize?: number;
}

interface RefundFormModel extends RechargeRefundParams {
  actualRefundConfirmed: boolean;
}

interface ReversalFormModel extends ConsumptionReversalParams {}

interface IdempotencyAttempt {
  fingerprint: string;
  key: string;
}

const rechargeStatusMeta: Record<
  RechargeOrderStatus,
  { color: string; label: string }
> = {
  CANCELLED: { color: 'default', label: '已取消' },
  COMPLETED: { color: 'green', label: '充值成功' },
  CREATED: { color: 'blue', label: '待支付' },
  REFUNDED: { color: 'orange', label: '已退款' },
};

const consumptionStatusMeta: Record<
  ConsumptionOrderStatus,
  { color: string; label: string }
> = {
  CANCELLED: { color: 'default', label: '已取消' },
  COMPLETED: { color: 'green', label: '消费成功' },
  EXPIRED: { color: 'orange', label: '已过期' },
  PENDING_CONFIRM: { color: 'blue', label: '待用户确认' },
  REVERSED: { color: 'red', label: '已冲正' },
};

const settlementStatusMeta: Record<
  SettlementStatus,
  { color: string; label: string }
> = {
  ADJUSTED: { color: 'purple', label: '已调整' },
  INCLUDED: { color: 'blue', label: '已计入结算单' },
  NOT_INCLUDED: { color: 'default', label: '待结算' },
  SETTLED: { color: 'green', label: '已结算' },
};

const paymentMethodLabel: Record<PaymentMethod, string> = {
  BANK_TRANSFER: '银行转账',
  OTHER: '其他线下收款',
  PLATFORM_QR: '平台收款码',
};

const refundMethodLabel: Record<RefundMethod, string> = {
  BANK_TRANSFER: '银行转账',
  ORIGINAL_CHANNEL: '原路退回',
  OTHER: '其他方式',
};

const storeStatusLabel: Record<OrderStoreStatus, string> = {
  ACTIVE: '营业中',
  CLOSED: '已关闭',
  PENDING: '待启用',
  SUSPENDED: '已停用',
};

const rechargeColumns: TableProps<AdminRechargeOrder>['columns'] = [
  { dataIndex: 'orderNo', key: 'order', title: '订单', width: 245 },
  { dataIndex: 'customerId', key: 'customer', title: '用户', width: 180 },
  { dataIndex: 'storeId', key: 'store', title: '充值门店', width: 190 },
  { dataIndex: 'amountCent', key: 'amount', title: '充值金额', width: 130 },
  { dataIndex: 'paymentMethod', key: 'payment', title: '平台收款', width: 210 },
  { dataIndex: 'orderStatus', key: 'status', title: '状态', width: 185 },
  { dataIndex: 'operatorId', key: 'operator', title: '操作员', width: 130 },
  { dataIndex: 'remark', key: 'remark', title: '备注', width: 200 },
  { fixed: 'right', key: 'action', title: '操作', width: 90 },
];

const consumptionColumns: TableProps<AdminConsumptionOrder>['columns'] = [
  { dataIndex: 'orderNo', key: 'order', title: '订单', width: 245 },
  { dataIndex: 'customerId', key: 'customer', title: '用户', width: 180 },
  { dataIndex: 'storeId', key: 'store', title: '消费门店', width: 190 },
  { dataIndex: 'consumePoints', key: 'amount', title: '消费金额', width: 130 },
  { dataIndex: 'orderStatus', key: 'status', title: '订单状态', width: 180 },
  {
    dataIndex: 'settlementStatus',
    key: 'settlement',
    title: '门店结算',
    width: 210,
  },
  { dataIndex: 'operatorId', key: 'operator', title: '操作员', width: 130 },
  { dataIndex: 'remark', key: 'remark', title: '备注', width: 200 },
  { fixed: 'right', key: 'action', title: '操作', width: 90 },
];

const userStore = useUserStore();
const currentUser = computed(
  () => userStore.userInfo as null | PlatformAdminUserInfo,
);
const isSuperAdmin = computed(() =>
  Boolean(currentUser.value?.roles.includes('SUPER_ADMIN')),
);
const canExportOrders = computed(() =>
  Boolean(
    currentUser.value?.roles.some((role) =>
      ['STORE_MANAGER', 'SUPER_ADMIN'].includes(role),
    ),
  ),
);

const activeTab = ref<OrderTab>('recharge');
const storeOptions = ref<OrderStoreOption[]>([]);
const rechargeOrders = ref<AdminRechargeOrder[]>([]);
const consumptionOrders = ref<AdminConsumptionOrder[]>([]);
const rechargeTotal = ref(0);
const consumptionTotal = ref(0);
const rechargeLoading = ref(false);
const consumptionLoading = ref(false);
const refundSaving = ref(false);
const refundModalOpen = ref(false);
const refundOrder = ref<AdminRechargeOrder>();
const reversalSaving = ref(false);
const reversalModalOpen = ref(false);
const reversalOrder = ref<AdminConsumptionOrder>();
const exportModalOpen = ref(false);
const exportLoading = ref(false);
const exportRange = ref<[string, string]>(currentMonthRange());

const rechargeQuery = reactive<RechargeOrderPageParams>({
  pageNum: 1,
  pageSize: 20,
});
const consumptionQuery = reactive<ConsumptionOrderPageParams>({
  pageNum: 1,
  pageSize: 20,
});
const refundModel = reactive<RefundFormModel>({
  actualRefundConfirmed: false,
  reason: '',
  refundMethod: 'ORIGINAL_CHANNEL',
  refundReference: '',
});
const reversalModel = reactive<ReversalFormModel>({ reason: '' });

let refundAttempt: IdempotencyAttempt | undefined;
let reversalAttempt: IdempotencyAttempt | undefined;

const rechargePagination = computed(() => ({
  current: rechargeQuery.pageNum,
  pageSize: rechargeQuery.pageSize,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 笔充值订单`,
  total: rechargeTotal.value,
}));

const consumptionPagination = computed(() => ({
  current: consumptionQuery.pageNum,
  pageSize: consumptionQuery.pageSize,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 笔消费订单`,
  total: consumptionTotal.value,
}));

async function loadStoreOptions() {
  storeOptions.value = await getOrderStoreOptionsApi();
  if (storeOptions.value.length === 1) {
    const storeId = storeOptions.value[0]?.storeId;
    rechargeQuery.storeId = storeId;
    consumptionQuery.storeId = storeId;
  }
}

async function loadRechargeOrders() {
  rechargeLoading.value = true;
  try {
    const result = await getRechargeOrderPageApi(cleanQuery(rechargeQuery));
    rechargeOrders.value = result.items;
    rechargeTotal.value = result.total;
    rechargeQuery.pageNum = result.pageNum;
    rechargeQuery.pageSize = result.pageSize;
  } finally {
    rechargeLoading.value = false;
  }
}

async function loadConsumptionOrders() {
  consumptionLoading.value = true;
  try {
    const result = await getConsumptionOrderPageApi(
      cleanQuery(consumptionQuery),
    );
    consumptionOrders.value = result.items;
    consumptionTotal.value = result.total;
    consumptionQuery.pageNum = result.pageNum;
    consumptionQuery.pageSize = result.pageSize;
  } finally {
    consumptionLoading.value = false;
  }
}

function currentMonthRange(): [string, string] {
  return [
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ];
}

function openOrderExport() {
  exportRange.value = currentMonthRange();
  exportModalOpen.value = true;
}

function validExportRange(value?: [string, string]) {
  if (!value?.[0] || !value[1]) return false;
  const start = dayjs(value[0]);
  const end = dayjs(value[1]);
  return !end.isBefore(start, 'day') && end.diff(start, 'day') < 93;
}

function disabledFutureDate(current: Dayjs) {
  return current.isAfter(dayjs().endOf('day'));
}

async function submitOrderExport() {
  if (!validExportRange(exportRange.value)) {
    message.warning('请选择不超过93天的有效订单创建日期范围');
    return;
  }
  const startDate = exportRange.value[0];
  const endDate = exportRange.value[1];
  exportLoading.value = true;
  try {
    let file: Blob;
    let filePrefix: string;
    if (activeTab.value === 'recharge') {
      const query = cleanQuery(rechargeQuery);
      const params: RechargeOrderExportParams = {
        customerPhone: query.customerPhone,
        endDate,
        orderNo: query.orderNo,
        startDate,
        status: query.status,
        storeId: query.storeId,
      };
      file = await exportRechargeOrdersApi(params);
      filePrefix = '充值订单';
    } else {
      const query = cleanQuery(consumptionQuery);
      const params: ConsumptionOrderExportParams = {
        customerPhone: query.customerPhone,
        endDate,
        orderNo: query.orderNo,
        startDate,
        status: query.status,
        storeId: query.storeId,
      };
      file = await exportConsumptionOrdersApi(params);
      filePrefix = '消费订单';
    }
    downloadFileFromBlob({
      fileName: `${filePrefix}_${startDate.replaceAll('-', '')}_${endDate.replaceAll('-', '')}.xlsx`,
      source: file,
    });
    exportModalOpen.value = false;
    message.success(`${filePrefix}报表已生成`);
  } finally {
    exportLoading.value = false;
  }
}

function cleanQuery<
  T extends ConsumptionOrderPageParams | RechargeOrderPageParams,
>(query: T): T {
  return {
    ...query,
    customerPhone: query.customerPhone?.trim() || undefined,
    orderNo: query.orderNo?.trim() || undefined,
  };
}

function search() {
  if (activeTab.value === 'recharge') {
    rechargeQuery.pageNum = 1;
    void loadRechargeOrders();
  } else {
    consumptionQuery.pageNum = 1;
    void loadConsumptionOrders();
  }
}

function resetSearch() {
  const soleStoreId =
    storeOptions.value.length === 1
      ? storeOptions.value[0]?.storeId
      : undefined;
  if (activeTab.value === 'recharge') {
    Object.assign(rechargeQuery, {
      customerPhone: undefined,
      orderNo: undefined,
      pageNum: 1,
      status: undefined,
      storeId: soleStoreId,
    });
    void loadRechargeOrders();
  } else {
    Object.assign(consumptionQuery, {
      customerPhone: undefined,
      orderNo: undefined,
      pageNum: 1,
      status: undefined,
      storeId: soleStoreId,
    });
    void loadConsumptionOrders();
  }
}

function handleRechargeTableChange(value: TablePagination) {
  rechargeQuery.pageNum = value.current ?? 1;
  rechargeQuery.pageSize = value.pageSize ?? 20;
  void loadRechargeOrders();
}

function handleConsumptionTableChange(value: TablePagination) {
  consumptionQuery.pageNum = value.current ?? 1;
  consumptionQuery.pageSize = value.pageSize ?? 20;
  void loadConsumptionOrders();
}

function openRefund(order: AdminRechargeOrder) {
  if (!isSuperAdmin.value || order.orderStatus !== 'COMPLETED') return;
  refundOrder.value = order;
  Object.assign(refundModel, {
    actualRefundConfirmed: false,
    reason: '',
    refundMethod: 'ORIGINAL_CHANNEL',
    refundReference: '',
  });
  refundAttempt = undefined;
  refundModalOpen.value = true;
}

function validateRefund(): RechargeRefundParams | undefined {
  if (!refundOrder.value) return;
  if (!refundModel.actualRefundConfirmed) {
    message.warning('请先确认退款资金已经实际退回用户');
    return;
  }
  const refundReference = refundModel.refundReference.trim();
  const reason = refundModel.reason.trim();
  if (!refundReference || refundReference.length > 128) {
    message.warning('请填写不超过128个字符的实际退款交易参考号');
    return;
  }
  if (!reason || reason.length > 500) {
    message.warning('请填写不超过500个字符的退款原因');
    return;
  }
  return {
    reason,
    refundMethod: refundModel.refundMethod,
    refundReference,
  };
}

async function submitRefund() {
  const order = refundOrder.value;
  const payload = validateRefund();
  if (!order || !payload) return;
  const fingerprint = JSON.stringify({ orderNo: order.orderNo, ...payload });
  refundAttempt =
    refundAttempt?.fingerprint === fingerprint
      ? refundAttempt
      : { fingerprint, key: createIdempotencyKey('refund') };
  refundSaving.value = true;
  try {
    const result = await refundRechargeOrderApi(
      order.orderNo,
      payload,
      refundAttempt.key,
    );
    refundAttempt = undefined;
    refundModalOpen.value = false;
    message.success(
      `退款登记完成，已退回 ${result.refundPoints} 积分（退款单 ${result.refundNo}）`,
    );
    await loadRechargeOrders();
  } finally {
    refundSaving.value = false;
  }
}

function openReversal(order: AdminConsumptionOrder) {
  if (!isSuperAdmin.value || order.orderStatus !== 'COMPLETED') return;
  reversalOrder.value = order;
  reversalModel.reason = '';
  reversalAttempt = undefined;
  reversalModalOpen.value = true;
}

function reversalSettlementHint(order?: AdminConsumptionOrder) {
  if (!order || order.settlementStatus === 'NOT_INCLUDED') {
    return '该消费尚未计入门店结算，冲正后不会产生门店应付款。';
  }
  if (order.settlementStatus === 'INCLUDED') {
    return '该消费已进入一张待处理结算单。历史结算单保持不变，结清后系统会在后续月结生成负数冲正调整。';
  }
  if (order.settlementStatus === 'SETTLED') {
    return '该消费已经与门店结算，系统会在后续月结中生成负数冲正调整，从门店应结金额中扣回。';
  }
  return '该消费的结算影响已经处理。';
}

async function submitReversal() {
  const order = reversalOrder.value;
  const reason = reversalModel.reason.trim();
  if (!order) return;
  if (!reason || reason.length > 500) {
    message.warning('请填写不超过500个字符的冲正原因');
    return;
  }
  const payload: ConsumptionReversalParams = { reason };
  const fingerprint = JSON.stringify({ orderNo: order.orderNo, ...payload });
  reversalAttempt =
    reversalAttempt?.fingerprint === fingerprint
      ? reversalAttempt
      : { fingerprint, key: createIdempotencyKey('reversal') };
  reversalSaving.value = true;
  try {
    const result = await reverseConsumptionOrderApi(
      order.orderNo,
      payload,
      reversalAttempt.key,
    );
    reversalAttempt = undefined;
    reversalModalOpen.value = false;
    message.success(
      `消费冲正完成，已退回 ${result.reversedPoints} 积分，当前余额 ${result.availablePoints} 积分`,
    );
    await loadConsumptionOrders();
  } finally {
    reversalSaving.value = false;
  }
}

function createIdempotencyKey(prefix: string) {
  try {
    if (globalThis.crypto?.randomUUID) {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
  } catch {
    // 非安全本地域名可能不开放 randomUUID，唯一键不承担鉴权用途。
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function storeOptionLabel(store: OrderStoreOption) {
  const status =
    store.storeStatus === 'ACTIVE'
      ? ''
      : ` · ${storeStatusLabel[store.storeStatus]}`;
  return `${store.storeName}（${store.storeCode}）${status}`;
}

function customerName(order: AdminConsumptionOrder | AdminRechargeOrder) {
  return (
    order.customerNickname || order.customerPhone || `用户 ${order.customerId}`
  );
}

function storeName(order: AdminConsumptionOrder | AdminRechargeOrder) {
  return order.storeName || `门店 ${order.storeId}`;
}

function operatorName(order: AdminConsumptionOrder | AdminRechargeOrder) {
  return (
    order.operatorName ||
    (order.operatorId ? `操作员 ${order.operatorId}` : '-')
  );
}

function formatTime(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatYuan(amountCent: number) {
  return `¥${(amountCent / 100).toFixed(2)}`;
}

onMounted(async () => {
  await loadStoreOptions();
  await Promise.all([loadRechargeOrders(), loadConsumptionOrders()]);
});
</script>

<template>
  <Page
    description="查询当前账号门店范围内的充值和消费记录；超级管理员可登记符合规则的全额退款。"
    title="订单中心"
  >
    <Alert
      class="mb-4"
      message="订单记录按后台账号的数据权限隔离。门店停用或关闭后，历史订单仍会保留并可查询。"
      show-icon
      type="info"
    />

    <Card class="mb-4">
      <Tabs v-model:active-key="activeTab">
        <Tabs.TabPane key="recharge" tab="充值订单" />
        <Tabs.TabPane key="consumption" tab="消费订单" />
      </Tabs>

      <Row :gutter="12">
        <Col :lg="5" :md="12" :xs="24">
          <Input
            v-if="activeTab === 'recharge'"
            v-model:value="rechargeQuery.orderNo"
            allow-clear
            placeholder="充值订单号"
            @press-enter="search"
          />
          <Input
            v-else
            v-model:value="consumptionQuery.orderNo"
            allow-clear
            placeholder="消费订单号"
            @press-enter="search"
          />
        </Col>
        <Col :lg="5" :md="12" :xs="24">
          <Input
            v-if="activeTab === 'recharge'"
            v-model:value="rechargeQuery.customerPhone"
            allow-clear
            placeholder="用户完整手机号"
            @press-enter="search"
          />
          <Input
            v-else
            v-model:value="consumptionQuery.customerPhone"
            allow-clear
            placeholder="用户完整手机号"
            @press-enter="search"
          />
        </Col>
        <Col :lg="5" :md="12" :xs="24">
          <Select
            v-if="activeTab === 'recharge'"
            v-model:value="rechargeQuery.storeId"
            allow-clear
            class="w-full"
            placeholder="全部可查看门店"
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
          <Select
            v-else
            v-model:value="consumptionQuery.storeId"
            allow-clear
            class="w-full"
            placeholder="全部可查看门店"
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
        <Col :lg="4" :md="12" :xs="24">
          <Select
            v-if="activeTab === 'recharge'"
            v-model:value="rechargeQuery.status"
            allow-clear
            class="w-full"
            placeholder="全部状态"
          >
            <SelectOption
              v-for="(meta, status) in rechargeStatusMeta"
              :key="status"
              :value="status"
            >
              {{ meta.label }}
            </SelectOption>
          </Select>
          <Select
            v-else
            v-model:value="consumptionQuery.status"
            allow-clear
            class="w-full"
            placeholder="全部状态"
          >
            <SelectOption
              v-for="(meta, status) in consumptionStatusMeta"
              :key="status"
              :value="status"
            >
              {{ meta.label }}
            </SelectOption>
          </Select>
        </Col>
        <Col :lg="5" :md="24" :xs="24">
          <Space wrap>
            <Button type="primary" @click="search">查询</Button>
            <Button @click="resetSearch">重置</Button>
            <Button v-if="canExportOrders" @click="openOrderExport">
              导出 Excel
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <Card>
      <Table
        v-if="activeTab === 'recharge'"
        :columns="rechargeColumns"
        :data-source="rechargeOrders"
        :loading="rechargeLoading"
        :pagination="rechargePagination"
        :row-key="(record: AdminRechargeOrder) => record.orderNo"
        :scroll="{ x: 1560 }"
        @change="handleRechargeTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order'">
            <div class="font-medium">{{ record.orderNo }}</div>
            <div class="text-xs text-gray-400">
              {{ formatTime(record.createTime) }}
            </div>
          </template>
          <template v-else-if="column.key === 'customer'">
            <div>{{ customerName(record as AdminRechargeOrder) }}</div>
            <div class="text-xs text-gray-400">
              {{ record.customerPhone || `用户编号 ${record.customerId}` }}
            </div>
          </template>
          <template v-else-if="column.key === 'store'">
            <div>{{ storeName(record as AdminRechargeOrder) }}</div>
            <div class="text-xs text-gray-400">
              {{ record.storeCode || `门店编号 ${record.storeId}` }}
            </div>
          </template>
          <template v-else-if="column.key === 'amount'">
            <div class="font-medium">{{ formatYuan(record.amountCent) }}</div>
            <div class="text-xs text-gray-400">
              {{ record.rechargePoints }} 积分
            </div>
          </template>
          <template v-else-if="column.key === 'payment'">
            <div>
              {{ paymentMethodLabel[record.paymentMethod as PaymentMethod] }}
            </div>
            <div
              class="max-w-48 truncate text-xs text-gray-400"
              :title="record.paymentReference"
            >
              {{ record.paymentReference }}
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag
              :color="
                rechargeStatusMeta[record.orderStatus as RechargeOrderStatus]
                  .color
              "
            >
              {{
                rechargeStatusMeta[record.orderStatus as RechargeOrderStatus]
                  .label
              }}
            </Tag>
            <div v-if="record.refundNo" class="mt-1 text-xs text-gray-400">
              退款单：{{ record.refundNo }}
            </div>
            <div v-if="record.refundReference" class="text-xs text-gray-400">
              流水：{{ record.refundReference }}
            </div>
          </template>
          <template v-else-if="column.key === 'operator'">
            {{ operatorName(record as AdminRechargeOrder) }}
          </template>
          <template v-else-if="column.key === 'remark'">
            <span :title="record.remark || ''">{{ record.remark || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <Button
              v-if="isSuperAdmin && record.orderStatus === 'COMPLETED'"
              danger
              size="small"
              type="link"
              @click="openRefund(record as AdminRechargeOrder)"
            >
              全额退款
            </Button>
            <span v-else class="text-gray-400">-</span>
          </template>
        </template>
      </Table>

      <Table
        v-else
        :columns="consumptionColumns"
        :data-source="consumptionOrders"
        :loading="consumptionLoading"
        :pagination="consumptionPagination"
        :row-key="(record: AdminConsumptionOrder) => record.orderNo"
        :scroll="{ x: 1460 }"
        @change="handleConsumptionTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order'">
            <div class="font-medium">{{ record.orderNo }}</div>
            <div class="text-xs text-gray-400">
              {{ formatTime(record.createTime) }}
            </div>
          </template>
          <template v-else-if="column.key === 'customer'">
            <div>{{ customerName(record as AdminConsumptionOrder) }}</div>
            <div class="text-xs text-gray-400">
              {{ record.customerPhone || `用户编号 ${record.customerId}` }}
            </div>
          </template>
          <template v-else-if="column.key === 'store'">
            <div>{{ storeName(record as AdminConsumptionOrder) }}</div>
            <div class="text-xs text-gray-400">
              {{ record.storeCode || `门店编号 ${record.storeId}` }}
            </div>
          </template>
          <template v-else-if="column.key === 'amount'">
            <div class="font-medium">{{ record.consumePoints }} 积分</div>
            <div class="text-xs text-gray-400">
              {{ formatYuan(record.amountCent) }}
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag
              :color="
                consumptionStatusMeta[
                  record.orderStatus as ConsumptionOrderStatus
                ].color
              "
            >
              {{
                consumptionStatusMeta[
                  record.orderStatus as ConsumptionOrderStatus
                ].label
              }}
            </Tag>
            <div
              v-if="record.orderStatus === 'PENDING_CONFIRM'"
              class="mt-1 text-xs text-gray-400"
            >
              截止 {{ formatTime(record.expiresTime) }}
            </div>
            <div v-if="record.completedTime" class="mt-1 text-xs text-gray-400">
              完成 {{ formatTime(record.completedTime) }}
            </div>
            <div v-if="record.reversedTime" class="mt-1 text-xs text-red-400">
              冲正 {{ formatTime(record.reversedTime) }}
            </div>
          </template>
          <template v-else-if="column.key === 'settlement'">
            <template v-if="record.settlementStatus">
              <Tag
                :color="
                  settlementStatusMeta[
                    record.settlementStatus as SettlementStatus
                  ].color
                "
              >
                {{
                  settlementStatusMeta[
                    record.settlementStatus as SettlementStatus
                  ].label
                }}
              </Tag>
              <div class="mt-1 text-xs text-gray-400">
                应结 {{ formatYuan(record.storePayableCent) }} · 手续费
                {{ formatYuan(record.platformFeeCent) }}
              </div>
            </template>
            <span v-else class="text-gray-400">尚未产生结算金额</span>
          </template>
          <template v-else-if="column.key === 'operator'">
            {{ operatorName(record as AdminConsumptionOrder) }}
          </template>
          <template v-else-if="column.key === 'remark'">
            <div :title="record.remark || ''">{{ record.remark || '-' }}</div>
            <div
              v-if="record.reversalReason"
              class="mt-1 text-xs text-red-400"
              :title="record.reversalReason"
            >
              冲正：{{ record.reversalReason }}
            </div>
          </template>
          <template v-else-if="column.key === 'action'">
            <Button
              v-if="isSuperAdmin && record.orderStatus === 'COMPLETED'"
              danger
              size="small"
              type="link"
              @click="openReversal(record as AdminConsumptionOrder)"
            >
              异常冲正
            </Button>
            <span v-else class="text-gray-400">-</span>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="exportModalOpen"
      :confirm-loading="exportLoading"
      cancel-text="取消"
      ok-text="生成并下载"
      :title="activeTab === 'recharge' ? '导出充值订单' : '导出消费订单'"
      width="560px"
      @ok="submitOrderExport"
    >
      <Alert
        class="mb-4"
        description="文件会沿用订单中心当前选择的门店、状态、订单号和手机号筛选条件，单次最多导出93天、10000条记录。"
        message="请选择订单创建日期范围"
        show-icon
        type="info"
      />
      <DatePicker.RangePicker
        v-model:value="exportRange"
        :disabled-date="disabledFutureDate"
        class="w-full"
        value-format="YYYY-MM-DD"
      />
    </Modal>

    <Modal
      v-model:open="reversalModalOpen"
      :confirm-loading="reversalSaving"
      cancel-text="取消"
      ok-text="确认冲正"
      title="消费订单异常冲正"
      width="620px"
      @ok="submitReversal"
    >
      <Alert
        class="mb-4"
        description="冲正会把本次消费实际扣除的积分按原充值批次全部退回客户，但不会自动向客户退还现金。该操作不可撤销，只应用于重复扣减、金额录入错误等异常处理。"
        message="这不是普通消费退款"
        show-icon
        type="error"
      />
      <div v-if="reversalOrder" class="mb-4 rounded bg-gray-50 p-3">
        <div>订单：{{ reversalOrder.orderNo }}</div>
        <div>
          用户：{{ customerName(reversalOrder) }} ·
          {{ reversalOrder.consumePoints }} 积分 /
          {{ formatYuan(reversalOrder.amountCent) }}
        </div>
        <div class="mt-2 text-xs text-orange-600">
          {{ reversalSettlementHint(reversalOrder) }}
        </div>
      </div>
      <Form layout="vertical" :model="reversalModel">
        <FormItem label="冲正原因" required>
          <Input.TextArea
            v-model:value="reversalModel.reason"
            :maxlength="500"
            :rows="4"
            placeholder="请填写可核查的异常原因或关联工单号"
            show-count
          />
        </FormItem>
      </Form>
    </Modal>

    <Modal
      v-model:open="refundModalOpen"
      :confirm-loading="refundSaving"
      cancel-text="取消"
      ok-text="确认登记全额退款"
      title="充值订单全额退款"
      width="620px"
      @ok="submitRefund"
    >
      <Alert
        class="mb-4"
        description="本操作只登记已经完成的实际退款并扣回对应积分，不会自动从银行或支付渠道把钱退给用户。订单积分只要发生过消费，后端就会拒绝退款。"
        message="请先在平台收款账户完成资金退款"
        show-icon
        type="warning"
      />
      <div v-if="refundOrder" class="mb-4 rounded bg-gray-50 p-3">
        <div>订单：{{ refundOrder.orderNo }}</div>
        <div>
          用户：{{ customerName(refundOrder) }} · 全额
          {{ formatYuan(refundOrder.amountCent) }} /
          {{ refundOrder.rechargePoints }}
          积分
        </div>
      </div>
      <Form layout="vertical" :model="refundModel">
        <FormItem label="实际退款方式" required>
          <Select v-model:value="refundModel.refundMethod">
            <SelectOption
              v-for="(label, method) in refundMethodLabel"
              :key="method"
              :value="method"
            >
              {{ label }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="实际退款交易参考号" required>
          <Input
            v-model:value="refundModel.refundReference"
            :maxlength="128"
            placeholder="银行流水号、支付退款单号或其他退款凭证号"
          />
        </FormItem>
        <FormItem label="退款原因" required>
          <Input.TextArea
            v-model:value="refundModel.reason"
            :maxlength="500"
            :rows="3"
            show-count
          />
        </FormItem>
        <Checkbox v-model:checked="refundModel.actualRefundConfirmed">
          我已核对平台账户，确认上述全部资金已经实际退回用户
        </Checkbox>
      </Form>
    </Modal>
  </Page>
</template>
