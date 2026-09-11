<script lang="ts" setup>
import type { PlatformBusinessSetting } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

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
  Space,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getPlatformBusinessSettingApi,
  updatePlatformBusinessSettingApi,
} from '#/api';

const setting = ref<PlatformBusinessSetting>();
const loading = ref(false);
const saving = ref(false);
const form = reactive({
  changeReason: '',
  consumptionPendingTtlMinutes: 5,
  platformFeeRateBps: 500,
  version: 0,
});

const feePercent = computed({
  get: () => form.platformFeeRateBps / 100,
  set: (value: null | number) => {
    form.platformFeeRateBps = Math.round((value ?? 0) * 100);
  },
});

const storeSharePercent = computed(
  () => (10_000 - form.platformFeeRateBps) / 100,
);

const changed = computed(() => {
  if (!setting.value) return false;
  return (
    setting.value.platformFeeRateBps !== form.platformFeeRateBps ||
    setting.value.consumptionPendingTtlMinutes !==
      form.consumptionPendingTtlMinutes
  );
});

const canSave = computed(
  () => changed.value && Boolean(form.changeReason.trim()) && !saving.value,
);

function syncForm(value: PlatformBusinessSetting) {
  Object.assign(form, {
    changeReason: '',
    consumptionPendingTtlMinutes: value.consumptionPendingTtlMinutes,
    platformFeeRateBps: value.platformFeeRateBps,
    version: value.version,
  });
}

async function loadSetting() {
  loading.value = true;
  try {
    const result = await getPlatformBusinessSettingApi();
    setting.value = result;
    syncForm(result);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  if (setting.value) syncForm(setting.value);
}

async function persistSetting() {
  saving.value = true;
  try {
    const result = await updatePlatformBusinessSettingApi({
      changeReason: form.changeReason.trim(),
      consumptionPendingTtlMinutes: form.consumptionPendingTtlMinutes,
      platformFeeRateBps: form.platformFeeRateBps,
      version: form.version,
    });
    setting.value = result;
    syncForm(result);
    message.success('业务参数已更新');
  } catch (error) {
    await loadSetting();
    throw error;
  } finally {
    saving.value = false;
  }
}

function confirmSave() {
  if (!canSave.value) return;
  Modal.confirm({
    cancelText: '取消',
    content:
      '新费率和确认时限只用于保存后新创建的消费订单，历史订单及已经创建的待确认订单不会重新计算。',
    okText: '确认生效',
    onOk: persistSetting,
    title: '确认修改平台业务参数？',
  });
}

function formatTime(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

onMounted(loadSetting);
</script>

<template>
  <Page
    description="维护影响新消费订单的全局规则。配置修改受到超级管理员权限、版本校验和审计日志保护。"
    title="平台业务参数"
  >
    <Alert
      class="mb-4"
      description="手续费率会影响平台收入和门店应结算金额。系统会把实际费率和金额保存在每笔消费订单中，修改配置不会追溯历史订单。"
      message="这是高风险财务配置，保存前请核对合作协议"
      show-icon
      type="warning"
    />

    <Row :gutter="16">
      <Col :lg="9" :xs="24">
        <Card :loading="loading" class="mb-4" title="固定业务规则">
          <Descriptions bordered :column="1" size="small">
            <DescriptionsItem label="充值兑换">
              1 元 = {{ setting?.pointsPerYuan ?? 1 }} 积分
              <Tag class="ml-2" color="blue">固定</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="积分有效期">
              永不过期
              <Tag class="ml-2" color="blue">固定</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="赠送积分">
              {{ setting?.bonusPointsEnabled ? '已启用' : '暂不启用' }}
              <Tag class="ml-2">当前阶段</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="消费确认方式">
              消费者输入 6 位消费密码
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card :loading="loading" class="mb-4" title="最近修改">
          <Descriptions :column="1" size="small">
            <DescriptionsItem label="修改人">
              {{ setting?.lastUpdatedByName || '系统初始值' }}
            </DescriptionsItem>
            <DescriptionsItem label="修改时间">
              {{ formatTime(setting?.updateTime) }}
            </DescriptionsItem>
            <DescriptionsItem label="配置版本">
              v{{ setting?.version ?? 0 }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </Col>

      <Col :lg="15" :xs="24">
        <Card :loading="loading" title="可调整参数">
          <Form layout="vertical">
            <FormItem
              extra="支持两位小数。5% 对应每消费 100 元，平台手续费 5 元。"
              label="平台手续费率"
              required
            >
              <InputNumber
                v-model:value="feePercent"
                addon-after="%"
                class="w-full"
                :max="100"
                :min="0"
                :precision="2"
                :step="0.1"
              />
            </FormItem>

            <Alert class="mb-5" show-icon type="info">
              <template #message>
                按当前设置，每消费 100 元，平台收取
                {{ feePercent.toFixed(2) }} 元，门店应结算
                {{ storeSharePercent.toFixed(2) }} 元。
              </template>
            </Alert>

            <FormItem
              extra="员工发起订单后，消费者需要在该时间内完成密码确认。"
              label="待消费订单确认有效期"
              required
            >
              <InputNumber
                v-model:value="form.consumptionPendingTtlMinutes"
                addon-after="分钟"
                class="w-full"
                :max="30"
                :min="1"
                :precision="0"
              />
            </FormItem>

            <FormItem
              extra="修改原因将原样记录到财务审计日志，最多 500 个字符。"
              label="修改原因"
              required
            >
              <Input.TextArea
                v-model:value="form.changeReason"
                :maxlength="500"
                placeholder="例如：根据 2026 年合作协议，将平台手续费调整为 6%"
                :rows="4"
                show-count
              />
            </FormItem>

            <Space>
              <Button
                :disabled="!canSave"
                :loading="saving"
                type="primary"
                @click="confirmSave"
              >
                保存并生效
              </Button>
              <Button :disabled="saving || !changed" @click="resetForm">
                放弃修改
              </Button>
              <Button :disabled="saving" @click="loadSetting">刷新</Button>
            </Space>
          </Form>
        </Card>
      </Col>
    </Row>
  </Page>
</template>
