<script lang="ts" setup>
import type {
  AccessibleStore,
  CashierCustomer,
  ConsumptionOrderStatus,
  ConsumptionOrderStatusResult,
  OfflineRechargeParams,
  OfflineRechargeResult,
  PaymentMethod,
  PrepareConsumptionParams,
  PrepareConsumptionResult,
} from '#/api';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  SelectOption,
  Space,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createOfflineRechargeApi,
  findCashierCustomerApi,
  getAccessibleStoresApi,
  getConsumptionOrderStatusApi,
  prepareConsumptionApi,
} from '#/api';

interface RechargeFormModel {
  amountYuan?: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  remark: string;
}

interface ConsumptionFormModel {
  consumePoints?: number;
  remark: string;
}

interface IdempotencyAttempt {
  fingerprint: string;
  key: string;
}

const paymentMethodMeta: Record<PaymentMethod, string> = {
  BANK_TRANSFER: '银行转账至平台账户',
  OTHER: '其他线下平台收款',
  PLATFORM_QR: '平台收款码',
};

const consumptionStatusMeta: Record<
  ConsumptionOrderStatus,
  { color: string; label: string }
> = {
  CANCELLED: { color: 'default', label: '已取消' },
  COMPLETED: { color: 'green', label: '消费成功' },
  EXPIRED: { color: 'orange', label: '已过期' },
  PENDING_CONFIRM: { color: 'blue', label: '等待用户确认' },
  REVERSED: { color: 'red', label: '已冲正' },
};

const phone = ref('');
const customer = ref<CashierCustomer>();
const stores = ref<AccessibleStore[]>([]);
const selectedStoreId = ref<number>();
const loadingStores = ref(false);
const searching = ref(false);
const recharging = ref(false);
const preparing = ref(false);
const refreshingOrder = ref(false);
const rechargeResult = ref<OfflineRechargeResult>();
const consumptionResult = ref<ConsumptionOrderStatusResult>();
const rechargeForm = reactive<RechargeFormModel>({
  amountYuan: undefined,
  paymentMethod: 'OTHER',
  paymentReference: '',
  remark: '',
});
const consumptionForm = reactive<ConsumptionFormModel>({
  consumePoints: undefined,
  remark: '',
});

let rechargeAttempt: IdempotencyAttempt | undefined;
let consumptionAttempt: IdempotencyAttempt | undefined;
let orderPollTimer: number | undefined;

const selectedStore = computed(() =>
  stores.value.find((store) => store.storeId === selectedStoreId.value),
);
const customerActive = computed(() => customer.value?.status === 'ACTIVE');
const cashierReady = computed(() =>
  Boolean(customer.value && customerActive.value && selectedStore.value),
);

watch(phone, (value) => {
  if (customer.value && value.trim() !== customer.value.phone) {
    clearCustomerContext();
  }
});

watch(selectedStoreId, () => {
  rechargeResult.value = undefined;
});

async function loadStores() {
  loadingStores.value = true;
  try {
    stores.value = await getAccessibleStoresApi();
    if (stores.value.length === 1) {
      selectedStoreId.value = stores.value[0]?.storeId;
    } else if (
      selectedStoreId.value &&
      !stores.value.some((item) => item.storeId === selectedStoreId.value)
    ) {
      selectedStoreId.value = undefined;
    }
  } finally {
    loadingStores.value = false;
  }
}

async function searchCustomer() {
  const normalizedPhone = phone.value.trim();
  if (!/^\+?[0-9]{6,20}$/.test(normalizedPhone)) {
    message.warning('请输入正确的用户手机号');
    return;
  }
  searching.value = true;
  clearCustomerContext();
  try {
    customer.value = await findCashierCustomerApi(normalizedPhone);
    phone.value = customer.value.phone;
  } finally {
    searching.value = false;
  }
}

async function reloadCustomerBalance() {
  if (!customer.value) return;
  customer.value = await findCashierCustomerApi(customer.value.phone);
}

function clearCustomerContext() {
  customer.value = undefined;
  rechargeResult.value = undefined;
  clearConsumptionResult();
  rechargeAttempt = undefined;
  consumptionAttempt = undefined;
}

function clearConsumptionResult() {
  stopOrderPolling();
  consumptionResult.value = undefined;
}

function normalizeOptional(value: string) {
  return value.trim() || undefined;
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

function reuseSafeKey(
  prefix: string,
  payload: OfflineRechargeParams | PrepareConsumptionParams,
  current?: IdempotencyAttempt,
) {
  const fingerprint = JSON.stringify(payload);
  return current?.fingerprint === fingerprint
    ? current
    : { fingerprint, key: createIdempotencyKey(prefix) };
}

function validateRecharge(): OfflineRechargeParams | undefined {
  if (!cashierReady.value || !customer.value || !selectedStoreId.value) {
    message.warning('请先查询用户并选择可操作门店');
    return;
  }
  if (
    !Number.isSafeInteger(rechargeForm.amountYuan) ||
    Number(rechargeForm.amountYuan) <= 0
  ) {
    message.warning('充值金额必须是大于0的整数元');
    return;
  }
  const paymentReference = rechargeForm.paymentReference.trim();
  if (!paymentReference || paymentReference.length > 128) {
    message.warning('请填写不超过128个字符的平台收款交易参考号');
    return;
  }
  if (rechargeForm.remark.length > 500) {
    message.warning('备注不能超过500个字符');
    return;
  }
  return {
    amountYuan: rechargeForm.amountYuan as number,
    customerId: customer.value.customerId,
    paymentMethod: rechargeForm.paymentMethod,
    paymentReference,
    remark: normalizeOptional(rechargeForm.remark),
    storeId: selectedStoreId.value,
  };
}

function confirmRecharge() {
  const payload = validateRecharge();
  if (!payload || !customer.value || !selectedStore.value) return;
  Modal.confirm({
    cancelText: '取消',
    content: `确认平台账户已收到 ${payload.amountYuan} 元后，再为 ${customer.value.nickname || customer.value.phone} 增加 ${payload.amountYuan} 积分。`,
    okText: '已核实收款，确认充值',
    onOk: () => executeRecharge(payload),
    title: '确认线下充值',
  });
}

async function executeRecharge(payload: OfflineRechargeParams) {
  rechargeAttempt = reuseSafeKey('recharge', payload, rechargeAttempt);
  recharging.value = true;
  try {
    rechargeResult.value = await createOfflineRechargeApi(
      payload,
      rechargeAttempt.key,
    );
    rechargeAttempt = undefined;
    rechargeForm.amountYuan = undefined;
    rechargeForm.paymentReference = '';
    rechargeForm.remark = '';
    message.success('充值成功，积分已实时到账');
    await reloadCustomerBalance();
  } finally {
    recharging.value = false;
  }
}

function validateConsumption(): PrepareConsumptionParams | undefined {
  if (!cashierReady.value || !customer.value || !selectedStoreId.value) {
    message.warning('请先查询用户并选择可操作门店');
    return;
  }
  if (!customer.value.consumePinConfigured) {
    message.warning('该用户尚未设置消费密码，暂时不能发起消费');
    return;
  }
  if (
    !Number.isSafeInteger(consumptionForm.consumePoints) ||
    Number(consumptionForm.consumePoints) <= 0
  ) {
    message.warning('消费积分必须是大于0的整数');
    return;
  }
  if (Number(consumptionForm.consumePoints) > customer.value.availablePoints) {
    message.warning('用户当前积分余额不足');
    return;
  }
  if (consumptionForm.remark.length > 500) {
    message.warning('备注不能超过500个字符');
    return;
  }
  return {
    consumePoints: consumptionForm.consumePoints as number,
    customerId: customer.value.customerId,
    remark: normalizeOptional(consumptionForm.remark),
    storeId: selectedStoreId.value,
  };
}

function confirmConsumption() {
  const payload = validateConsumption();
  if (!payload || !customer.value || !selectedStore.value) return;
  Modal.confirm({
    cancelText: '取消',
    content: `将由 ${selectedStore.value.storeName} 发起 ${payload.consumePoints} 积分消费，用户需要在H5中输入消费密码确认，确认前不会扣分。`,
    okText: '发起消费',
    onOk: () => executeConsumption(payload),
    title: '确认消费信息',
  });
}

async function executeConsumption(payload: PrepareConsumptionParams) {
  consumptionAttempt = reuseSafeKey('consume', payload, consumptionAttempt);
  preparing.value = true;
  clearConsumptionResult();
  try {
    const result = await prepareConsumptionApi(payload, consumptionAttempt.key);
    consumptionAttempt = undefined;
    consumptionResult.value = fromPreparation(result, payload.remark);
    consumptionForm.consumePoints = undefined;
    consumptionForm.remark = '';
    message.success('消费订单已发起，请让用户打开H5确认');
    scheduleOrderPolling();
  } finally {
    preparing.value = false;
  }
}

function fromPreparation(
  result: PrepareConsumptionResult,
  remark?: string,
): ConsumptionOrderStatusResult {
  return {
    amountCent: result.grossAmountCent,
    completedTime: null,
    confirmedTime: null,
    consumePoints: result.consumePoints,
    createTime: new Date().toISOString(),
    customerId: result.customerId,
    expiresTime: result.expiresTime,
    orderNo: result.orderNo,
    orderStatus: result.orderStatus,
    remark: remark ?? null,
    storeId: result.storeId,
    verificationMode: result.verificationMode,
  };
}

async function refreshConsumptionStatus(manual = false) {
  const currentOrder = consumptionResult.value;
  if (!currentOrder || refreshingOrder.value) return;
  const orderNo = currentOrder.orderNo;
  stopOrderPolling();
  refreshingOrder.value = true;
  const previousStatus = currentOrder.orderStatus;
  let shouldContinuePolling = false;
  try {
    const result = await getConsumptionOrderStatusApi(orderNo);
    if (consumptionResult.value?.orderNo !== orderNo) return;
    consumptionResult.value = result;
    if (result.orderStatus === 'COMPLETED' && previousStatus !== 'COMPLETED') {
      message.success('用户已确认，消费完成');
      await reloadCustomerBalance();
    } else if (
      result.orderStatus === 'EXPIRED' &&
      previousStatus !== 'EXPIRED'
    ) {
      message.warning('消费订单已过期，如仍需消费请重新发起');
    } else if (manual && result.orderStatus === 'PENDING_CONFIRM') {
      message.info('用户尚未确认消费');
    }
    shouldContinuePolling = result.orderStatus === 'PENDING_CONFIRM';
  } finally {
    refreshingOrder.value = false;
    if (shouldContinuePolling) {
      scheduleOrderPolling();
    }
  }
}

function scheduleOrderPolling() {
  stopOrderPolling();
  if (consumptionResult.value?.orderStatus !== 'PENDING_CONFIRM') return;
  orderPollTimer = window.setTimeout(() => {
    void refreshConsumptionStatus();
  }, 3000);
}

function stopOrderPolling() {
  if (orderPollTimer !== undefined) {
    window.clearTimeout(orderPollTimer);
    orderPollTimer = undefined;
  }
}

function formatTime(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatYuan(amountCent: number) {
  return `${(amountCent / 100).toFixed(2)} 元`;
}

function storeLabel(storeId: number) {
  const store = stores.value.find((item) => item.storeId === storeId);
  return store ? `${store.storeName}（${store.storeCode}）` : `门店 ${storeId}`;
}

onMounted(() => {
  void loadStores();
});

onBeforeUnmount(stopOrderPolling);
</script>

<template>
  <Page
    description="按手机号确认用户身份，在有权限的门店完成平台充值或发起积分消费。"
    title="门店收银台"
  >
    <Alert
      class="mb-4"
      description="充值资金必须已经进入平台指定账户。不要在未核实到账、资金进入门店个人账户或仅凭用户口头说明时增加积分。如果提交超时，请保持表单内容不变原样重试，系统会避免重复记账。"
      message="线下充值属于平台收款"
      show-icon
      type="warning"
    />

    <Card class="mb-4" title="1. 查询用户与选择门店">
      <Row :gutter="16">
        <Col :lg="10" :xs="24">
          <FormItem label="用户手机号">
            <Space.Compact class="w-full">
              <Input
                v-model:value="phone"
                allow-clear
                placeholder="请输入用户已绑定的手机号"
                @press-enter="searchCustomer"
              />
              <Button
                :loading="searching"
                type="primary"
                @click="searchCustomer"
              >
                查询
              </Button>
            </Space.Compact>
          </FormItem>
        </Col>
        <Col :lg="14" :xs="24">
          <FormItem label="本次操作门店">
            <Select
              v-model:value="selectedStoreId"
              :loading="loadingStores"
              class="w-full"
              placeholder="请选择当前收银门店"
              show-search
              :filter-option="
                (input: string, option: any) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
              "
            >
              <SelectOption
                v-for="store in stores"
                :key="store.storeId"
                :label="`${store.storeName}（${store.storeCode}）`"
                :value="store.storeId"
              >
                {{ store.storeName }}（{{ store.storeCode }}）
              </SelectOption>
            </Select>
          </FormItem>
        </Col>
      </Row>

      <Alert
        v-if="!loadingStores && stores.length === 0"
        message="当前账号没有可操作的营业门店，请联系超级管理员检查门店状态和账号权限。"
        show-icon
        type="error"
      />

      <Descriptions v-if="customer" bordered :column="3" size="small">
        <DescriptionsItem label="用户">
          {{ customer.nickname || '微信用户' }}
        </DescriptionsItem>
        <DescriptionsItem label="手机号">
          {{ customer.phone }}
        </DescriptionsItem>
        <DescriptionsItem label="账号状态">
          <Tag :color="customerActive ? 'green' : 'red'">
            {{ customerActive ? '正常' : '已停用' }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem label="可用积分">
          <span class="text-lg font-semibold text-blue-600">
            {{ customer.availablePoints }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem label="消费密码">
          <Tag :color="customer.consumePinConfigured ? 'green' : 'orange'">
            {{ customer.consumePinConfigured ? '已设置' : '未设置' }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem label="用户编号">
          {{ customer.customerId }}
        </DescriptionsItem>
      </Descriptions>
      <Alert
        v-else
        message="请让用户提供其已绑定手机号，查询成功后才能进行充值或消费。"
        show-icon
        type="info"
      />
    </Card>

    <Row :gutter="16">
      <Col :lg="12" :xs="24">
        <Card class="mb-4" title="2A. 线下充值">
          <Form layout="vertical" :model="rechargeForm">
            <FormItem label="充值金额（元）" required>
              <InputNumber
                v-model:value="rechargeForm.amountYuan"
                class="w-full"
                :min="1"
                :precision="0"
                placeholder="1元增加1积分，仅支持整数元"
              />
            </FormItem>
            <FormItem label="平台收款方式" required>
              <Select v-model:value="rechargeForm.paymentMethod">
                <SelectOption
                  v-for="(label, method) in paymentMethodMeta"
                  :key="method"
                  :value="method"
                >
                  {{ label }}
                </SelectOption>
              </Select>
            </FormItem>
            <FormItem label="平台收款交易参考号" required>
              <Input
                v-model:value="rechargeForm.paymentReference"
                :maxlength="128"
                placeholder="填写平台流水号、转账单号或线下收款凭证号"
              />
            </FormItem>
            <FormItem label="备注">
              <Input.TextArea
                v-model:value="rechargeForm.remark"
                :maxlength="500"
                :rows="3"
                show-count
              />
            </FormItem>
            <Button
              block
              :disabled="!cashierReady"
              :loading="recharging"
              type="primary"
              @click="confirmRecharge"
            >
              核实平台到账并充值
            </Button>
          </Form>

          <Alert
            v-if="rechargeResult"
            class="mt-4"
            :description="`充值订单：${rechargeResult.orderNo}`"
            :message="`充值成功，已增加 ${rechargeResult.rechargePoints} 积分`"
            show-icon
            type="success"
          />
        </Card>
      </Col>

      <Col :lg="12" :xs="24">
        <Card class="mb-4" title="2B. 发起积分消费">
          <Alert
            v-if="customer && !customer.consumePinConfigured"
            class="mb-4"
            message="该用户还未设置消费密码，请先让用户在H5个人中心完成设置。"
            show-icon
            type="warning"
          />
          <Form layout="vertical" :model="consumptionForm">
            <FormItem label="消费积分" required>
              <InputNumber
                v-model:value="consumptionForm.consumePoints"
                class="w-full"
                :min="1"
                :precision="0"
                placeholder="用户确认后才会扣除积分"
              />
            </FormItem>
            <FormItem label="备注">
              <Input.TextArea
                v-model:value="consumptionForm.remark"
                :maxlength="500"
                :rows="3"
                placeholder="可填写本次服务内容"
                show-count
              />
            </FormItem>
            <Button
              block
              :disabled="!cashierReady || !customer?.consumePinConfigured"
              :loading="preparing"
              type="primary"
              @click="confirmConsumption"
            >
              发起消费并等待用户确认
            </Button>
          </Form>

          <Card
            v-if="consumptionResult"
            class="mt-4"
            size="small"
            title="当前消费订单"
          >
            <template #extra>
              <Button
                :loading="refreshingOrder"
                size="small"
                type="link"
                @click="refreshConsumptionStatus(true)"
              >
                刷新状态
              </Button>
            </template>
            <Descriptions :column="1" size="small">
              <DescriptionsItem label="订单号">
                {{ consumptionResult.orderNo }}
              </DescriptionsItem>
              <DescriptionsItem label="状态">
                <Tag
                  :color="
                    consumptionStatusMeta[consumptionResult.orderStatus].color
                  "
                >
                  {{
                    consumptionStatusMeta[consumptionResult.orderStatus].label
                  }}
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="消费门店">
                {{ storeLabel(consumptionResult.storeId) }}
              </DescriptionsItem>
              <DescriptionsItem label="消费积分">
                {{ consumptionResult.consumePoints }} 积分（{{
                  formatYuan(consumptionResult.amountCent)
                }}）
              </DescriptionsItem>
              <DescriptionsItem label="确认截止时间">
                {{ formatTime(consumptionResult.expiresTime) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="consumptionResult.completedTime"
                label="完成时间"
              >
                {{ formatTime(consumptionResult.completedTime) }}
              </DescriptionsItem>
            </Descriptions>
            <Alert
              v-if="consumptionResult.orderStatus === 'PENDING_CONFIRM'"
              class="mt-3"
              message="请让用户打开H5，在待确认消费中核对门店和积分并输入消费密码。页面每3秒自动检查一次结果。"
              show-icon
              type="info"
            />
          </Card>
        </Card>
      </Col>
    </Row>
  </Page>
</template>
