<script lang="ts" setup>
import type { TableProps } from 'ant-design-vue';

import type {
  CustomerAccountStatus,
  CustomerConsumptionOrder,
  CustomerManagementItem,
  CustomerPageParams,
  CustomerPointLedger,
  CustomerRechargeOrder,
} from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Drawer,
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
  getCustomerConsumptionOrdersApi,
  getCustomerDetailApi,
  getCustomerPageApi,
  getCustomerPointLedgersApi,
  getCustomerRechargeOrdersApi,
  updateCustomerStatusApi,
} from '#/api';

type DetailTab = 'consumption' | 'ledger' | 'recharge';

interface TablePagination {
  current?: number;
  pageSize?: number;
}

const customerStatusMeta: Record<
  CustomerAccountStatus,
  { color: string; label: string }
> = {
  ACTIVE: { color: 'green', label: '正常' },
  DISABLED: { color: 'red', label: '已冻结' },
};

const ledgerTypeLabel: Record<string, string> = {
  ADJUSTMENT: '调整',
  CONSUME: '消费',
  RECHARGE: '充值',
  REFUND: '退款',
  REVERSAL: '冲正',
};

const rechargeStatusLabel: Record<string, string> = {
  CANCELLED: '已取消',
  COMPLETED: '已完成',
  CREATED: '已创建',
  REFUNDED: '已退款',
};

const consumptionStatusLabel: Record<string, string> = {
  CANCELLED: '已取消',
  COMPLETED: '已完成',
  EXPIRED: '已过期',
  PENDING_CONFIRM: '待确认',
  REVERSED: '已冲正',
};

const paymentMethodLabel: Record<string, string> = {
  BANK_TRANSFER: '银行转账',
  OTHER: '其他',
  PLATFORM_QR: '平台收款码',
};

const customerColumns: TableProps<CustomerManagementItem>['columns'] = [
  { key: 'customer', title: '客户', width: 240 },
  { dataIndex: 'phone', key: 'phone', title: '绑定手机号', width: 150 },
  {
    dataIndex: 'availablePoints',
    key: 'availablePoints',
    title: '积分余额',
    width: 120,
  },
  { key: 'consumePin', title: '消费密码', width: 140 },
  { dataIndex: 'status', key: 'status', title: '账户状态', width: 110 },
  {
    dataIndex: 'lastLoginTime',
    key: 'lastLoginTime',
    title: '最后登录',
    width: 170,
  },
  { dataIndex: 'createTime', key: 'createTime', title: '注册时间', width: 170 },
  { fixed: 'right', key: 'action', title: '操作', width: 170 },
];

const ledgerColumns: TableProps<CustomerPointLedger>['columns'] = [
  { dataIndex: 'createTime', key: 'createTime', title: '时间', width: 165 },
  { dataIndex: 'ledgerType', key: 'ledgerType', title: '类型', width: 90 },
  {
    dataIndex: 'deltaPoints',
    key: 'deltaPoints',
    title: '积分变化',
    width: 105,
  },
  {
    dataIndex: 'balanceAfter',
    key: 'balanceAfter',
    title: '变动后余额',
    width: 110,
  },
  { key: 'business', title: '业务单据', width: 230 },
  { dataIndex: 'storeName', key: 'storeName', title: '关联门店', width: 150 },
  { dataIndex: 'remark', key: 'remark', title: '备注', width: 180 },
];

const rechargeColumns: TableProps<CustomerRechargeOrder>['columns'] = [
  { key: 'order', title: '充值订单', width: 220 },
  { dataIndex: 'storeName', key: 'storeName', title: '充值门店', width: 150 },
  { key: 'amount', title: '金额 / 积分', width: 130 },
  {
    dataIndex: 'paymentMethod',
    key: 'paymentMethod',
    title: '收款方式',
    width: 120,
  },
  { dataIndex: 'orderStatus', key: 'orderStatus', title: '状态', width: 100 },
  { dataIndex: 'remark', key: 'remark', title: '备注', width: 180 },
];

const consumptionColumns: TableProps<CustomerConsumptionOrder>['columns'] = [
  { key: 'order', title: '消费订单', width: 220 },
  { dataIndex: 'storeName', key: 'storeName', title: '消费门店', width: 150 },
  { key: 'amount', title: '金额 / 积分', width: 130 },
  { dataIndex: 'orderStatus', key: 'orderStatus', title: '状态', width: 100 },
  { dataIndex: 'remark', key: 'remark', title: '备注', width: 180 },
];

const query = reactive<CustomerPageParams>({ pageNum: 1, pageSize: 20 });
const customers = ref<CustomerManagementItem[]>([]);
const total = ref(0);
const loading = ref(false);
const drawerOpen = ref(false);
const detailLoading = ref(false);
const detail = ref<CustomerManagementItem>();
const activeDetailTab = ref<DetailTab>('ledger');

const ledgerQuery = reactive({ pageNum: 1, pageSize: 10 });
const rechargeQuery = reactive({ pageNum: 1, pageSize: 10 });
const consumptionQuery = reactive({ pageNum: 1, pageSize: 10 });
const ledgers = ref<CustomerPointLedger[]>([]);
const recharges = ref<CustomerRechargeOrder[]>([]);
const consumptions = ref<CustomerConsumptionOrder[]>([]);
const ledgerTotal = ref(0);
const rechargeTotal = ref(0);
const consumptionTotal = ref(0);
const transactionLoading = ref(false);

const statusModalOpen = ref(false);
const statusSaving = ref(false);
const statusCustomer = ref<CustomerManagementItem>();
const statusReason = ref('');
const targetStatus = computed<CustomerAccountStatus>(() =>
  statusCustomer.value?.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
);
const statusActionText = computed(() =>
  targetStatus.value === 'DISABLED' ? '冻结' : '恢复',
);

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 位客户`,
  total: total.value,
}));

function transactionPagination(
  queryValue: { pageNum: number; pageSize: number },
  totalValue: number,
) {
  return {
    current: queryValue.pageNum,
    pageSize: queryValue.pageSize,
    showSizeChanger: true,
    showTotal: (value: number) => `共 ${value} 条`,
    total: totalValue,
  };
}

async function loadCustomers() {
  loading.value = true;
  try {
    const result = await getCustomerPageApi({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    });
    customers.value = result.items;
    total.value = result.total;
    query.pageNum = result.pageNum;
    query.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

function search() {
  query.pageNum = 1;
  void loadCustomers();
}

function resetSearch() {
  query.keyword = undefined;
  query.status = undefined;
  query.pageNum = 1;
  void loadCustomers();
}

function handleCustomerTableChange(value: TablePagination) {
  query.pageNum = value.current ?? 1;
  query.pageSize = value.pageSize ?? 20;
  void loadCustomers();
}

async function openDetail(customer: CustomerManagementItem) {
  drawerOpen.value = true;
  activeDetailTab.value = 'ledger';
  Object.assign(ledgerQuery, { pageNum: 1, pageSize: 10 });
  Object.assign(rechargeQuery, { pageNum: 1, pageSize: 10 });
  Object.assign(consumptionQuery, { pageNum: 1, pageSize: 10 });
  detail.value = customer;
  detailLoading.value = true;
  try {
    const [customerDetail] = await Promise.all([
      getCustomerDetailApi(customer.customerId),
      loadLedgers(customer.customerId),
    ]);
    detail.value = customerDetail;
  } finally {
    detailLoading.value = false;
  }
}

async function loadLedgers(customerId = detail.value?.customerId) {
  if (!customerId) return;
  transactionLoading.value = true;
  try {
    const result = await getCustomerPointLedgersApi(customerId, ledgerQuery);
    ledgers.value = result.items;
    ledgerTotal.value = result.total;
    ledgerQuery.pageNum = result.pageNum;
    ledgerQuery.pageSize = result.pageSize;
  } finally {
    transactionLoading.value = false;
  }
}

async function loadRecharges(customerId = detail.value?.customerId) {
  if (!customerId) return;
  transactionLoading.value = true;
  try {
    const result = await getCustomerRechargeOrdersApi(
      customerId,
      rechargeQuery,
    );
    recharges.value = result.items;
    rechargeTotal.value = result.total;
    rechargeQuery.pageNum = result.pageNum;
    rechargeQuery.pageSize = result.pageSize;
  } finally {
    transactionLoading.value = false;
  }
}

async function loadConsumptions(customerId = detail.value?.customerId) {
  if (!customerId) return;
  transactionLoading.value = true;
  try {
    const result = await getCustomerConsumptionOrdersApi(
      customerId,
      consumptionQuery,
    );
    consumptions.value = result.items;
    consumptionTotal.value = result.total;
    consumptionQuery.pageNum = result.pageNum;
    consumptionQuery.pageSize = result.pageSize;
  } finally {
    transactionLoading.value = false;
  }
}

function changeDetailTab(value: number | string) {
  const tab = String(value) as DetailTab;
  activeDetailTab.value = tab;
  if (tab === 'recharge') void loadRecharges();
  if (tab === 'consumption') void loadConsumptions();
  if (tab === 'ledger') void loadLedgers();
}

function handleLedgerTableChange(value: TablePagination) {
  ledgerQuery.pageNum = value.current ?? 1;
  ledgerQuery.pageSize = value.pageSize ?? 10;
  void loadLedgers();
}

function handleRechargeTableChange(value: TablePagination) {
  rechargeQuery.pageNum = value.current ?? 1;
  rechargeQuery.pageSize = value.pageSize ?? 10;
  void loadRecharges();
}

function handleConsumptionTableChange(value: TablePagination) {
  consumptionQuery.pageNum = value.current ?? 1;
  consumptionQuery.pageSize = value.pageSize ?? 10;
  void loadConsumptions();
}

function openStatusChange(customer: CustomerManagementItem) {
  statusCustomer.value = customer;
  statusReason.value = '';
  statusModalOpen.value = true;
}

async function submitStatusChange() {
  const customer = statusCustomer.value;
  const reason = statusReason.value.trim();
  if (!customer || !reason) {
    message.warning(`请填写${statusActionText.value}原因`);
    return;
  }
  if (reason.length > 500) {
    message.warning('操作原因不能超过500个字符');
    return;
  }
  statusSaving.value = true;
  try {
    const result = await updateCustomerStatusApi(
      customer.customerId,
      targetStatus.value,
      reason,
    );
    statusModalOpen.value = false;
    const index = customers.value.findIndex(
      (item) => item.customerId === result.customerId,
    );
    if (index !== -1) customers.value[index] = result;
    if (detail.value?.customerId === result.customerId) detail.value = result;
    message.success(
      targetStatus.value === 'DISABLED'
        ? '客户账户已冻结，现有登录已失效'
        : '客户账户已恢复，可重新登录',
    );
  } finally {
    statusSaving.value = false;
  }
}

function customerName(customer: CustomerManagementItem) {
  return customer.nickname || customer.phone || `客户 ${customer.customerId}`;
}

function avatarText(customer: CustomerManagementItem) {
  return customerName(customer).slice(0, 1).toUpperCase();
}

function formatTime(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatYuan(amountCent: number) {
  return `¥${(amountCent / 100).toFixed(2)}`;
}

onMounted(loadCustomers);
</script>

<template>
  <Page
    description="查看平台客户、积分余额和交易记录；客户账户状态仅由超级管理员维护。"
    title="客户管理"
  >
    <Alert
      class="mb-4"
      message="冻结客户会让其当前登录立即失效，并取消尚未确认的消费订单；积分余额不会被修改。所有状态操作都会记录原因和审计日志。"
      show-icon
      type="info"
    />

    <Card class="mb-4">
      <Row :gutter="12">
        <Col :lg="8" :md="12" :xs="24">
          <Input
            v-model:value="query.keyword"
            allow-clear
            placeholder="手机号或微信昵称"
            @press-enter="search"
          />
        </Col>
        <Col :lg="5" :md="12" :xs="24">
          <Select
            v-model:value="query.status"
            allow-clear
            class="w-full"
            placeholder="全部账户状态"
          >
            <SelectOption
              v-for="(meta, status) in customerStatusMeta"
              :key="status"
              :value="status"
            >
              {{ meta.label }}
            </SelectOption>
          </Select>
        </Col>
        <Col :lg="11" :md="24" :xs="24">
          <Space wrap>
            <Button type="primary" @click="search">查询</Button>
            <Button @click="resetSearch">重置</Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <Card>
      <Table
        :columns="customerColumns"
        :data-source="customers"
        :loading="loading"
        :pagination="pagination"
        :row-key="(record: CustomerManagementItem) => record.customerId"
        :scroll="{ x: 1250 }"
        @change="handleCustomerTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'customer'">
            <Space>
              <Avatar :src="record.avatarUrl || undefined">
                {{ avatarText(record as CustomerManagementItem) }}
              </Avatar>
              <div>
                <div class="font-medium">
                  {{ customerName(record as CustomerManagementItem) }}
                </div>
                <div class="text-xs text-gray-400">
                  客户编号 {{ record.customerId }}
                </div>
              </div>
            </Space>
          </template>
          <template v-else-if="column.key === 'phone'">
            {{ record.phone || '未绑定' }}
          </template>
          <template v-else-if="column.key === 'availablePoints'">
            <span class="font-medium">{{ record.availablePoints }}</span>
          </template>
          <template v-else-if="column.key === 'consumePin'">
            <Tag v-if="!record.consumePinConfigured">未设置</Tag>
            <Tag v-else-if="record.consumePinLocked" color="orange">已锁定</Tag>
            <Tag v-else color="blue">已设置</Tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag
              :color="
                customerStatusMeta[record.status as CustomerAccountStatus].color
              "
            >
              {{
                customerStatusMeta[record.status as CustomerAccountStatus].label
              }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'lastLoginTime'">
            {{ formatTime(record.lastLoginTime) }}
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatTime(record.createTime) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Space :size="4">
              <Button
                size="small"
                type="link"
                @click="openDetail(record as CustomerManagementItem)"
              >
                详情
              </Button>
              <Button
                :danger="record.status === 'ACTIVE'"
                size="small"
                type="link"
                @click="openStatusChange(record as CustomerManagementItem)"
              >
                {{ record.status === 'ACTIVE' ? '冻结' : '恢复' }}
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Drawer
      v-model:open="drawerOpen"
      :loading="detailLoading"
      title="客户详情"
      width="min(1100px, 94vw)"
    >
      <template v-if="detail">
        <div class="mb-5 flex items-center gap-3">
          <Avatar :size="56" :src="detail.avatarUrl || undefined">
            {{ avatarText(detail) }}
          </Avatar>
          <div>
            <div class="text-lg font-semibold">{{ customerName(detail) }}</div>
            <div class="text-gray-400">客户编号 {{ detail.customerId }}</div>
          </div>
          <Tag class="ml-2" :color="customerStatusMeta[detail.status].color">
            {{ customerStatusMeta[detail.status].label }}
          </Tag>
        </div>

        <Descriptions :column="2" bordered class="mb-5" size="small">
          <DescriptionsItem label="绑定手机号">
            {{ detail.phone || '未绑定' }}
          </DescriptionsItem>
          <DescriptionsItem label="积分余额">
            <span class="font-semibold">{{ detail.availablePoints }} 积分</span>
          </DescriptionsItem>
          <DescriptionsItem label="消费密码">
            <template v-if="!detail.consumePinConfigured">未设置</template>
            <template v-else-if="detail.consumePinLocked">
              已锁定至 {{ formatTime(detail.consumePinLockedUntil) }}
            </template>
            <template v-else>已设置</template>
          </DescriptionsItem>
          <DescriptionsItem label="最后登录">
            {{ formatTime(detail.lastLoginTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="注册时间">
            {{ formatTime(detail.createTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="资料更新时间">
            {{ formatTime(detail.updateTime) }}
          </DescriptionsItem>
        </Descriptions>

        <Tabs :active-key="activeDetailTab" @change="changeDetailTab">
          <Tabs.TabPane key="ledger" tab="积分流水">
            <Table
              :columns="ledgerColumns"
              :data-source="ledgers"
              :loading="transactionLoading"
              :pagination="transactionPagination(ledgerQuery, ledgerTotal)"
              :row-key="(record: CustomerPointLedger) => record.ledgerNo"
              :scroll="{ x: 1030 }"
              size="small"
              @change="handleLedgerTableChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'createTime'">
                  {{ formatTime(record.createTime) }}
                </template>
                <template v-else-if="column.key === 'ledgerType'">
                  {{ ledgerTypeLabel[record.ledgerType] || record.ledgerType }}
                </template>
                <template v-else-if="column.key === 'deltaPoints'">
                  <span
                    :class="
                      record.deltaPoints > 0 ? 'text-green-600' : 'text-red-500'
                    "
                    class="font-semibold"
                  >
                    {{ record.deltaPoints > 0 ? '+' : ''
                    }}{{ record.deltaPoints }}
                  </span>
                </template>
                <template v-else-if="column.key === 'business'">
                  <div>{{ record.businessNo }}</div>
                  <div class="text-xs text-gray-400">
                    {{ record.businessType }}
                  </div>
                </template>
                <template v-else-if="column.key === 'storeName'">
                  {{ record.storeName || '-' }}
                </template>
                <template v-else-if="column.key === 'remark'">
                  {{ record.remark || '-' }}
                </template>
              </template>
            </Table>
          </Tabs.TabPane>

          <Tabs.TabPane key="recharge" tab="充值记录">
            <Table
              :columns="rechargeColumns"
              :data-source="recharges"
              :loading="transactionLoading"
              :pagination="transactionPagination(rechargeQuery, rechargeTotal)"
              :row-key="(record: CustomerRechargeOrder) => record.orderNo"
              :scroll="{ x: 950 }"
              size="small"
              @change="handleRechargeTableChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'order'">
                  <div>{{ record.orderNo }}</div>
                  <div class="text-xs text-gray-400">
                    {{ formatTime(record.createTime) }}
                  </div>
                </template>
                <template v-else-if="column.key === 'storeName'">
                  {{ record.storeName || `门店 ${record.storeId}` }}
                </template>
                <template v-else-if="column.key === 'amount'">
                  <div>{{ formatYuan(record.amountCent) }}</div>
                  <div class="text-xs text-gray-400">
                    {{ record.rechargePoints }} 积分
                  </div>
                </template>
                <template v-else-if="column.key === 'paymentMethod'">
                  {{
                    paymentMethodLabel[record.paymentMethod] ||
                    record.paymentMethod
                  }}
                </template>
                <template v-else-if="column.key === 'orderStatus'">
                  <Tag>
                    {{
                      rechargeStatusLabel[record.orderStatus] ||
                      record.orderStatus
                    }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'remark'">
                  {{ record.remark || '-' }}
                </template>
              </template>
            </Table>
          </Tabs.TabPane>

          <Tabs.TabPane key="consumption" tab="消费记录">
            <Table
              :columns="consumptionColumns"
              :data-source="consumptions"
              :loading="transactionLoading"
              :pagination="
                transactionPagination(consumptionQuery, consumptionTotal)
              "
              :row-key="(record: CustomerConsumptionOrder) => record.orderNo"
              :scroll="{ x: 850 }"
              size="small"
              @change="handleConsumptionTableChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'order'">
                  <div>{{ record.orderNo }}</div>
                  <div class="text-xs text-gray-400">
                    {{ formatTime(record.createTime) }}
                  </div>
                </template>
                <template v-else-if="column.key === 'storeName'">
                  {{ record.storeName || `门店 ${record.storeId}` }}
                </template>
                <template v-else-if="column.key === 'amount'">
                  <div>{{ record.consumePoints }} 积分</div>
                  <div class="text-xs text-gray-400">
                    {{ formatYuan(record.amountCent) }}
                  </div>
                </template>
                <template v-else-if="column.key === 'orderStatus'">
                  <Tag>
                    {{
                      consumptionStatusLabel[record.orderStatus] ||
                      record.orderStatus
                    }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'remark'">
                  {{ record.remark || '-' }}
                </template>
              </template>
            </Table>
          </Tabs.TabPane>
        </Tabs>
      </template>
    </Drawer>

    <Modal
      v-model:open="statusModalOpen"
      :confirm-loading="statusSaving"
      :ok-button-props="{ danger: targetStatus === 'DISABLED' }"
      :ok-text="`确认${statusActionText}`"
      :title="`${statusActionText}客户账户`"
      width="560px"
      @ok="submitStatusChange"
    >
      <Alert
        v-if="targetStatus === 'DISABLED'"
        class="mb-4"
        description="客户现有登录凭证会立即失效，尚未确认的消费订单会被取消；账户积分余额不会改变。"
        message="冻结影响"
        show-icon
        type="warning"
      />
      <Alert
        v-else
        class="mb-4"
        description="恢复后客户可以重新登录，已取消的消费订单不会自动恢复。"
        message="恢复影响"
        show-icon
        type="info"
      />
      <div class="mb-2">
        客户：{{ statusCustomer ? customerName(statusCustomer) : '-' }}
      </div>
      <div class="mb-2">{{ statusActionText }}原因（必填）</div>
      <Input.TextArea
        v-model:value="statusReason"
        :maxlength="500"
        :rows="4"
        placeholder="请填写具体原因，内容将写入审计日志"
        show-count
      />
    </Modal>
  </Page>
</template>
