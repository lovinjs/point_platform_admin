<script lang="ts" setup>
import type { TableProps } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import type {
  OrderStoreOption,
  SettlementItemType,
  SettlementPageParams,
  StoreSettlementDetail,
  StoreSettlementItem,
  StoreSettlementStatus,
  StoreSettlementSummary,
} from '#/api';
import type { PlatformAdminUserInfo } from '#/api/core/user';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Drawer,
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
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  confirmSettlementApi,
  generateSettlementPeriodApi,
  getOrderStoreOptionsApi,
  getSettlementDetailApi,
  getSettlementPageApi,
  markSettlementPaidApi,
} from '#/api';

interface TablePagination {
  current?: number;
  pageSize?: number;
}

interface ConfirmFormModel {
  remark: string;
}

interface PaymentFormModel {
  actualPaymentConfirmed: boolean;
  paymentReference: string;
  remark: string;
}

const settlementStatusMeta: Record<
  StoreSettlementStatus,
  { color: string; label: string }
> = {
  CLOSED: { color: 'default', label: '已关闭' },
  CONFIRMED: { color: 'blue', label: '门店已确认' },
  GENERATED: { color: 'orange', label: '待门店确认' },
  PAID: { color: 'green', label: '已结清' },
};

const itemTypeLabel: Record<SettlementItemType, string> = {
  CONSUMPTION: '消费入账',
  MANUAL_ADJUSTMENT: '人工调整',
  REVERSAL_ADJUSTMENT: '冲正调整',
};

const storeStatusLabel = {
  ACTIVE: '营业中',
  CLOSED: '已关闭',
  PENDING: '待启用',
  SUSPENDED: '已停用',
};

const columns: TableProps<StoreSettlementSummary>['columns'] = [
  { dataIndex: 'settlementNo', key: 'settlement', title: '结算单', width: 220 },
  { dataIndex: 'storeName', key: 'store', title: '结算门店', width: 190 },
  {
    dataIndex: 'grossAmountCent',
    key: 'gross',
    title: '净消费金额',
    width: 140,
  },
  {
    dataIndex: 'platformFeeCent',
    key: 'platformFee',
    title: '平台手续费',
    width: 140,
  },
  {
    dataIndex: 'adjustmentAmountCent',
    key: 'adjustment',
    title: '调整金额',
    width: 125,
  },
  {
    dataIndex: 'payableAmountCent',
    key: 'payable',
    title: '结算净额',
    width: 140,
  },
  { dataIndex: 'settlementStatus', key: 'status', title: '状态', width: 180 },
  { fixed: 'right', key: 'action', title: '操作', width: 210 },
];

const itemColumns: TableProps<StoreSettlementItem>['columns'] = [
  { dataIndex: 'itemType', key: 'itemType', title: '明细类型', width: 110 },
  {
    dataIndex: 'consumptionOrderNo',
    key: 'order',
    title: '消费订单',
    width: 230,
  },
  { dataIndex: 'pointsDelta', key: 'points', title: '积分', width: 100 },
  { dataIndex: 'grossAmountCent', key: 'gross', title: '消费金额', width: 120 },
  {
    dataIndex: 'platformFeeCent',
    key: 'fee',
    title: '平台手续费',
    width: 120,
  },
  {
    dataIndex: 'storePayableCent',
    key: 'payable',
    title: '门店应结',
    width: 120,
  },
  {
    dataIndex: 'consumptionCompletedTime',
    key: 'completedTime',
    title: '消费完成时间',
    width: 170,
  },
  {
    dataIndex: 'adjustmentReason',
    key: 'reason',
    title: '调整原因',
    width: 200,
  },
];

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

const query = reactive<SettlementPageParams>({
  pageNum: 1,
  pageSize: 20,
});
const settlements = ref<StoreSettlementSummary[]>([]);
const storeOptions = ref<OrderStoreOption[]>([]);
const total = ref(0);
const loading = ref(false);
const generating = ref(false);
const detailLoading = ref(false);
const operationSaving = ref(false);
const detailOpen = ref(false);
const confirmModalOpen = ref(false);
const paymentModalOpen = ref(false);
const detail = ref<StoreSettlementDetail>();
const operationTarget = ref<StoreSettlementSummary>();
const generatePeriod = ref(dayjs().subtract(1, 'month').format('YYYY-MM'));
const confirmModel = reactive<ConfirmFormModel>({ remark: '' });
const paymentModel = reactive<PaymentFormModel>({
  actualPaymentConfirmed: false,
  paymentReference: '',
  remark: '',
});

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 张门店结算单`,
  total: total.value,
}));
const isMerchantRepayment = computed(
  () => (operationTarget.value?.payableAmountCent ?? 0) < 0,
);
const isZeroSettlement = computed(
  () => operationTarget.value?.payableAmountCent === 0,
);
const settlementFlowLabel = computed(() => {
  if (isZeroSettlement.value) return '无需实际收付款';
  return isMerchantRepayment.value ? '门店应退平台' : '平台应付门店';
});

async function loadStoreOptions() {
  storeOptions.value = await getOrderStoreOptionsApi();
  if (storeOptions.value.length === 1) {
    query.storeId = storeOptions.value[0]?.storeId;
  }
}

async function loadSettlements() {
  const periodCode = normalizePeriodCode(query.periodCode);
  if (query.periodCode?.trim() && !periodCode) {
    message.warning('结算月份格式应为 YYYY-MM');
    return;
  }
  loading.value = true;
  try {
    const result = await getSettlementPageApi({
      ...query,
      periodCode,
    });
    settlements.value = result.items;
    total.value = result.total;
    query.pageNum = result.pageNum;
    query.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

function search() {
  query.pageNum = 1;
  void loadSettlements();
}

function resetSearch() {
  Object.assign(query, {
    pageNum: 1,
    periodCode: undefined,
    status: undefined,
    storeId:
      storeOptions.value.length === 1
        ? storeOptions.value[0]?.storeId
        : undefined,
  });
  void loadSettlements();
}

function handleTableChange(value: TablePagination) {
  query.pageNum = value.current ?? 1;
  query.pageSize = value.pageSize ?? 20;
  void loadSettlements();
}

function generateSettlement() {
  const periodCode = normalizePeriodCode(generatePeriod.value);
  if (!periodCode || periodCode >= dayjs().format('YYYY-MM')) {
    message.warning('只能为已经结束的自然月生成结算单');
    return;
  }
  Modal.confirm({
    cancelText: '取消',
    content:
      '生成后，该月份所有尚未结算的成功消费将按门店归集并冻结为结算明细。同一月份重复操作不会重复计入订单。',
    okText: '确认生成',
    onOk: () => executeGeneration(periodCode),
    title: `生成 ${periodCode} 月度结算单？`,
  });
}

async function executeGeneration(periodCode: string) {
  generating.value = true;
  try {
    const result = await generateSettlementPeriodApi(periodCode);
    message.success(
      `${result.periodCode} 结算期间已生成，共 ${result.settlementCount} 张门店结算单`,
    );
    query.periodCode = result.periodCode;
    query.pageNum = 1;
    await loadSettlements();
  } finally {
    generating.value = false;
  }
}

async function openDetail(settlement: StoreSettlementSummary) {
  detailOpen.value = true;
  detail.value = undefined;
  detailLoading.value = true;
  try {
    detail.value = await getSettlementDetailApi(settlement.settlementNo);
  } finally {
    detailLoading.value = false;
  }
}

function openConfirm(settlement: StoreSettlementSummary) {
  if (!isStoreManager.value || settlement.settlementStatus !== 'GENERATED') {
    return;
  }
  operationTarget.value = settlement;
  confirmModel.remark = '';
  confirmModalOpen.value = true;
}

async function submitConfirm() {
  const target = operationTarget.value;
  if (!target) return;
  const remark = confirmModel.remark.trim();
  if (remark.length > 500) {
    message.warning('确认备注不能超过500个字符');
    return;
  }
  operationSaving.value = true;
  try {
    const result = await confirmSettlementApi(target.settlementNo, {
      remark: remark || undefined,
    });
    confirmModalOpen.value = false;
    detail.value = result;
    message.success('结算金额已确认，等待平台付款');
    await loadSettlements();
  } finally {
    operationSaving.value = false;
  }
}

function openPayment(settlement: StoreSettlementSummary) {
  if (!isSuperAdmin.value || settlement.settlementStatus !== 'CONFIRMED') {
    return;
  }
  operationTarget.value = settlement;
  Object.assign(paymentModel, {
    actualPaymentConfirmed: false,
    paymentReference: '',
    remark: '',
  });
  paymentModalOpen.value = true;
}

async function submitPayment() {
  const target = operationTarget.value;
  if (!target) return;
  if (!paymentModel.actualPaymentConfirmed) {
    let warning = '请先确认平台已经向门店实际付款';
    if (isZeroSettlement.value) {
      warning = '请先确认该结算单无需实际收付款';
    } else if (isMerchantRepayment.value) {
      warning = '请先确认平台已经收到门店退回的结算款';
    }
    message.warning(warning);
    return;
  }
  const paymentReference = paymentModel.paymentReference.trim();
  const remark = paymentModel.remark.trim();
  if (!paymentReference || paymentReference.length > 128) {
    message.warning('请填写不超过128个字符的结算交易参考号');
    return;
  }
  if (remark.length > 500) {
    message.warning('结算备注不能超过500个字符');
    return;
  }
  operationSaving.value = true;
  try {
    const result = await markSettlementPaidApi(target.settlementNo, {
      paymentReference,
      remark: remark || undefined,
    });
    paymentModalOpen.value = false;
    detail.value = result;
    message.success('结算收付款已登记，结算单已结清');
    await loadSettlements();
  } finally {
    operationSaving.value = false;
  }
}

function normalizePeriodCode(value?: null | string) {
  const normalized = value?.trim();
  return normalized && /^\d{4}-(0[1-9]|1[0-2])$/.test(normalized)
    ? normalized
    : undefined;
}

function disabledGenerateMonth(current: Dayjs) {
  return !current.isBefore(dayjs().startOf('month'), 'month');
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

onMounted(async () => {
  await loadStoreOptions();
  await loadSettlements();
});
</script>

<template>
  <Page
    description="按自然月核对门店消费、冲正调整、平台手续费及结算净额，完成门店确认和收付款登记。"
    title="月度结算"
  >
    <Alert
      class="mb-4"
      :message="
        isSuperAdmin
          ? '先生成已结束月份的结算单，系统会同时计入尚未处理的历史消费冲正；店长确认后再登记实际收付款。'
          : '请逐项核对本门店消费和冲正调整明细，确认结算净额后等待平台处理。'
      "
      show-icon
      type="info"
    />

    <Card v-if="isSuperAdmin" class="mb-4" title="生成月度结算单">
      <Space wrap>
        <DatePicker
          v-model:value="generatePeriod"
          :disabled-date="disabledGenerateMonth"
          picker="month"
          placeholder="选择已结束月份"
          value-format="YYYY-MM"
        />
        <Button
          :loading="generating"
          type="primary"
          @click="generateSettlement"
        >
          生成结算单
        </Button>
      </Space>
      <div class="mt-2 text-xs text-gray-400">
        每个自然月只生成一次；重复点击不会重复计算消费订单或历史冲正调整。
      </div>
    </Card>

    <Card class="mb-4">
      <Row :gutter="12">
        <Col :lg="5" :md="12" :xs="24">
          <Input
            v-model:value="query.periodCode"
            allow-clear
            placeholder="结算月份，例如 2026-08"
            @press-enter="search"
          />
        </Col>
        <Col :lg="7" :md="12" :xs="24">
          <Select
            v-model:value="query.storeId"
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
        <Col :lg="5" :md="12" :xs="24">
          <Select
            v-model:value="query.status"
            allow-clear
            class="w-full"
            placeholder="全部结算状态"
          >
            <SelectOption
              v-for="(meta, status) in settlementStatusMeta"
              :key="status"
              :value="status"
            >
              {{ meta.label }}
            </SelectOption>
          </Select>
        </Col>
        <Col :lg="7" :md="12" :xs="24">
          <Space wrap>
            <Button type="primary" @click="search">查询</Button>
            <Button @click="resetSearch">重置</Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <Card>
      <Table
        :columns="columns"
        :data-source="settlements"
        :loading="loading"
        :pagination="pagination"
        :row-key="(record: StoreSettlementSummary) => record.settlementNo"
        :scroll="{ x: 1340 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'settlement'">
            <div class="font-medium">{{ record.settlementNo }}</div>
            <div class="text-xs text-gray-400">
              {{ record.periodCode }}（{{ record.startDate }} 至
              {{ record.endDate }}）
            </div>
          </template>
          <template v-else-if="column.key === 'store'">
            <div>{{ record.storeName }}</div>
            <div class="text-xs text-gray-400">
              门店编号 {{ record.storeId }}
            </div>
          </template>
          <template v-else-if="column.key === 'gross'">
            <div class="font-medium">
              {{ formatYuan(record.grossAmountCent) }}
            </div>
            <div class="text-xs text-gray-400">
              {{ record.totalConsumePoints }} 积分
            </div>
          </template>
          <template v-else-if="column.key === 'platformFee'">
            {{ formatYuan(record.platformFeeCent) }}
          </template>
          <template v-else-if="column.key === 'adjustment'">
            {{ formatYuan(record.adjustmentAmountCent) }}
          </template>
          <template v-else-if="column.key === 'payable'">
            <span
              class="font-semibold"
              :class="
                record.payableAmountCent < 0 ? 'text-red-500' : 'text-blue-600'
              "
            >
              {{ formatYuan(record.payableAmountCent) }}
            </span>
            <div class="text-xs text-gray-400">
              {{
                record.payableAmountCent === 0
                  ? '无需收付款'
                  : record.payableAmountCent < 0
                    ? '门店应退平台'
                    : '平台应付门店'
              }}
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag
              :color="
                settlementStatusMeta[
                  record.settlementStatus as StoreSettlementStatus
                ].color
              "
            >
              {{
                settlementStatusMeta[
                  record.settlementStatus as StoreSettlementStatus
                ].label
              }}
            </Tag>
            <div v-if="record.confirmedTime" class="mt-1 text-xs text-gray-400">
              确认 {{ formatTime(record.confirmedTime) }}
            </div>
            <div v-if="record.paidTime" class="text-xs text-gray-400">
              付款 {{ formatTime(record.paidTime) }}
            </div>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space :size="0" wrap>
              <Button
                size="small"
                type="link"
                @click="openDetail(record as StoreSettlementSummary)"
              >
                查看明细
              </Button>
              <Button
                v-if="isStoreManager && record.settlementStatus === 'GENERATED'"
                size="small"
                type="link"
                @click="openConfirm(record as StoreSettlementSummary)"
              >
                确认金额
              </Button>
              <Button
                v-if="isSuperAdmin && record.settlementStatus === 'CONFIRMED'"
                size="small"
                type="link"
                @click="openPayment(record as StoreSettlementSummary)"
              >
                登记结清
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Drawer
      v-model:open="detailOpen"
      :loading="detailLoading"
      title="结算单明细"
      width="min(1100px, 94vw)"
    >
      <template v-if="detail">
        <Descriptions bordered :column="3" size="small">
          <DescriptionsItem label="结算单号">
            {{ detail.settlement.settlementNo }}
          </DescriptionsItem>
          <DescriptionsItem label="结算月份">
            {{ detail.settlement.periodCode }}
          </DescriptionsItem>
          <DescriptionsItem label="门店">
            {{ detail.settlement.storeName }}
          </DescriptionsItem>
          <DescriptionsItem label="净消费金额">
            {{ formatYuan(detail.settlement.grossAmountCent) }}
          </DescriptionsItem>
          <DescriptionsItem label="平台手续费">
            {{ formatYuan(detail.settlement.platformFeeCent) }}
          </DescriptionsItem>
          <DescriptionsItem label="结算净额">
            <strong>{{
              formatYuan(detail.settlement.payableAmountCent)
            }}</strong>
          </DescriptionsItem>
          <DescriptionsItem label="状态">
            <Tag
              :color="
                settlementStatusMeta[detail.settlement.settlementStatus].color
              "
            >
              {{
                settlementStatusMeta[detail.settlement.settlementStatus].label
              }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="结算流水">
            {{ detail.settlement.paymentReference || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="备注">
            {{ detail.settlement.remark || '-' }}
          </DescriptionsItem>
        </Descriptions>

        <Table
          class="mt-4"
          :columns="itemColumns"
          :data-source="detail.items"
          :pagination="false"
          :row-key="(record: StoreSettlementItem) => record.itemId"
          :scroll="{ x: 1170 }"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'itemType'">
              {{ itemTypeLabel[record.itemType as SettlementItemType] }}
            </template>
            <template v-else-if="column.key === 'order'">
              {{ record.consumptionOrderNo || '-' }}
            </template>
            <template v-else-if="column.key === 'points'">
              {{ record.pointsDelta }}
            </template>
            <template v-else-if="column.key === 'gross'">
              {{ formatYuan(record.grossAmountCent) }}
            </template>
            <template v-else-if="column.key === 'fee'">
              {{ formatYuan(record.platformFeeCent) }}
            </template>
            <template v-else-if="column.key === 'payable'">
              {{ formatYuan(record.storePayableCent) }}
            </template>
            <template v-else-if="column.key === 'completedTime'">
              {{ formatTime(record.consumptionCompletedTime) }}
            </template>
            <template v-else-if="column.key === 'reason'">
              {{ record.adjustmentReason || '-' }}
            </template>
          </template>
        </Table>
      </template>
    </Drawer>

    <Modal
      v-model:open="confirmModalOpen"
      :confirm-loading="operationSaving"
      cancel-text="取消"
      ok-text="确认金额无误"
      title="确认门店结算金额"
      @ok="submitConfirm"
    >
      <Alert
        class="mb-4"
        description="确认后平台才能登记结清。若消费或冲正调整明细有疑问，请先取消并联系平台管理员处理。"
        message="请先查看并核对全部结算明细"
        show-icon
        type="warning"
      />
      <div v-if="operationTarget" class="mb-4 rounded bg-gray-50 p-3">
        {{ operationTarget.storeName }} · {{ operationTarget.periodCode }} ·
        结算净额
        <strong>{{ formatYuan(operationTarget.payableAmountCent) }}</strong>
      </div>
      <Form layout="vertical" :model="confirmModel">
        <FormItem label="确认备注（选填）">
          <Input.TextArea
            v-model:value="confirmModel.remark"
            :maxlength="500"
            :rows="3"
            show-count
          />
        </FormItem>
      </Form>
    </Modal>

    <Modal
      v-model:open="paymentModalOpen"
      :confirm-loading="operationSaving"
      cancel-text="取消"
      ok-text="确认登记结清"
      :title="
        isZeroSettlement
          ? '登记零额结算单结清'
          : isMerchantRepayment
            ? '登记门店退款结清'
            : '登记门店结算付款'
      "
      @ok="submitPayment"
    >
      <Alert
        class="mb-4"
        :description="
          isZeroSettlement
            ? '该结算单净额为零，无需实际收付款。请完成明细核对后登记结清；若请求超时，请保持交易参考号不变后重试。'
            : isMerchantRepayment
              ? '系统不会自动扣款。请在平台账户确认收到门店退回的结算款后操作；若请求超时，请保持交易参考号不变后重试。'
              : '系统不会自动转账。请在平台账户实际付款后操作；若请求超时，请保持交易参考号不变后重试。'
        "
        :message="
          isZeroSettlement
            ? '无需实际收付款'
            : isMerchantRepayment
              ? '请先确认平台实际收款'
              : '请先完成实际付款'
        "
        show-icon
        type="warning"
      />
      <div v-if="operationTarget" class="mb-4 rounded bg-gray-50 p-3">
        {{ operationTarget.storeName }} · {{ settlementFlowLabel }}
        <strong>{{ formatYuan(operationTarget.payableAmountCent) }}</strong>
      </div>
      <Form layout="vertical" :model="paymentModel">
        <FormItem label="结算交易参考号" required>
          <Input
            v-model:value="paymentModel.paymentReference"
            :maxlength="128"
            :placeholder="
              isZeroSettlement
                ? '填写内部零额结清参考号'
                : isMerchantRepayment
                  ? '填写门店退款的银行流水号或其他收款凭证号'
                  : '填写银行转账流水号或其他平台付款凭证号'
            "
          />
        </FormItem>
        <FormItem label="结算备注（选填）">
          <Input.TextArea
            v-model:value="paymentModel.remark"
            :maxlength="500"
            :rows="3"
            show-count
          />
        </FormItem>
        <Checkbox v-model:checked="paymentModel.actualPaymentConfirmed">
          {{
            isZeroSettlement
              ? '我已核对全部明细，确认该结算单无需实际收付款'
              : isMerchantRepayment
                ? '我已核对平台账户，确认已收到门店退回的全部结算款'
                : '我已核对平台账户，确认全部应结资金已经实际支付给该门店'
          }}
        </Checkbox>
      </Form>
    </Modal>
  </Page>
</template>
