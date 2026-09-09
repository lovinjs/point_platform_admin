<script lang="ts" setup>
import type { TableProps } from 'ant-design-vue';

import type {
  MerchantCreateParams,
  MerchantManagementItem,
  MerchantPageParams,
  MerchantStatus,
  MerchantUpdateParams,
} from '#/api';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
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
  createMerchantApi,
  getMerchantPageApi,
  updateMerchantApi,
  updateMerchantStatusApi,
} from '#/api';

interface MerchantFormModel {
  agreementNo: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  legalName: string;
  merchantCode: string;
  unifiedSocialCreditCode: string;
}

interface TablePagination {
  current?: number;
  pageSize?: number;
}

const statusMeta: Record<MerchantStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: '合作中' },
  PENDING: { color: 'orange', label: '待启用' },
  SUSPENDED: { color: 'red', label: '已停用' },
  TERMINATED: { color: 'default', label: '已终止' },
};

const columns: TableProps<MerchantManagementItem>['columns'] = [
  {
    dataIndex: 'merchantCode',
    key: 'merchantCode',
    title: '商户编码',
    width: 150,
  },
  {
    dataIndex: 'businessName',
    key: 'businessName',
    title: '商户名称',
    width: 180,
  },
  {
    dataIndex: 'legalName',
    key: 'legalName',
    title: '签约主体',
    width: 220,
  },
  {
    dataIndex: 'contactName',
    key: 'contact',
    title: '联系人',
    width: 180,
  },
  {
    dataIndex: 'unifiedSocialCreditCode',
    key: 'contract',
    title: '主体与协议',
    width: 210,
  },
  { dataIndex: 'status', key: 'status', title: '状态', width: 100 },
  { dataIndex: 'updateTime', key: 'updateTime', title: '更新时间', width: 170 },
  { fixed: 'right', key: 'action', title: '操作', width: 150 },
];

const query = reactive<MerchantPageParams>({
  pageNum: 1,
  pageSize: 20,
});
const merchants = ref<MerchantManagementItem[]>([]);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const editingMerchant = ref<MerchantManagementItem>();
const formRef = ref<{
  clearValidate: () => void;
  validate: () => Promise<void>;
}>();
const formModel = reactive<MerchantFormModel>({
  agreementNo: '',
  businessName: '',
  contactName: '',
  contactPhone: '',
  legalName: '',
  merchantCode: '',
  unifiedSocialCreditCode: '',
});

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 个合作商户`,
  total: total.value,
}));
const modalTitle = computed(() =>
  editingMerchant.value ? '编辑合作商户' : '新增合作商户',
);
const formRules = {
  agreementNo: [{ max: 100, message: '合作协议编号不能超过100个字符' }],
  businessName: [
    { message: '请输入商户名称', required: true },
    { max: 200, message: '商户名称不能超过200个字符' },
  ],
  contactName: [
    { message: '请输入联系人', required: true },
    { max: 64, message: '联系人不能超过64个字符' },
  ],
  contactPhone: [
    { message: '请输入联系电话', required: true },
    { message: '联系电话格式不正确', pattern: /^[0-9+()\-\s]{5,32}$/ },
  ],
  legalName: [
    { message: '请输入签约主体名称', required: true },
    { max: 200, message: '签约主体名称不能超过200个字符' },
  ],
  merchantCode: [
    { message: '请输入商户编码', required: true },
    {
      message: '只能输入字母、数字、横线和下划线',
      pattern: /^[A-Za-z0-9_-]+$/,
    },
    { max: 64, message: '商户编码不能超过64个字符' },
  ],
  unifiedSocialCreditCode: [
    {
      message: '统一社会信用代码应为18位字母或数字',
      pattern: /^$|^[0-9A-Za-z]{18}$/,
    },
  ],
};

async function loadMerchants() {
  loading.value = true;
  try {
    const result = await getMerchantPageApi({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    });
    merchants.value = result.items;
    total.value = result.total;
    query.pageNum = result.pageNum;
    query.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

function search() {
  query.pageNum = 1;
  void loadMerchants();
}

function resetSearch() {
  query.keyword = undefined;
  query.status = undefined;
  query.pageNum = 1;
  void loadMerchants();
}

function handleTableChange(value: TablePagination) {
  query.pageNum = value.current ?? 1;
  query.pageSize = value.pageSize ?? 20;
  void loadMerchants();
}

function resetForm() {
  Object.assign(formModel, {
    agreementNo: '',
    businessName: '',
    contactName: '',
    contactPhone: '',
    legalName: '',
    merchantCode: '',
    unifiedSocialCreditCode: '',
  });
}

function openCreate() {
  editingMerchant.value = undefined;
  resetForm();
  modalOpen.value = true;
  void nextTick(() => formRef.value?.clearValidate());
}

function openEdit(merchant: MerchantManagementItem) {
  editingMerchant.value = merchant;
  Object.assign(formModel, {
    agreementNo: merchant.agreementNo ?? '',
    businessName: merchant.businessName,
    contactName: merchant.contactName,
    contactPhone: merchant.contactPhone,
    legalName: merchant.legalName,
    merchantCode: merchant.merchantCode,
    unifiedSocialCreditCode: merchant.unifiedSocialCreditCode ?? '',
  });
  modalOpen.value = true;
  void nextTick(() => formRef.value?.clearValidate());
}

function optionalValue(value: string) {
  return value.trim() || undefined;
}

async function submitForm() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    const editableFields: MerchantUpdateParams = {
      agreementNo: optionalValue(formModel.agreementNo),
      businessName: formModel.businessName.trim(),
      contactName: formModel.contactName.trim(),
      contactPhone: formModel.contactPhone.trim(),
      legalName: formModel.legalName.trim(),
      unifiedSocialCreditCode: optionalValue(
        formModel.unifiedSocialCreditCode.toUpperCase(),
      ),
    };
    if (editingMerchant.value) {
      await updateMerchantApi(editingMerchant.value.merchantId, editableFields);
      message.success('合作商户资料已更新');
    } else {
      const data: MerchantCreateParams = {
        ...editableFields,
        merchantCode: formModel.merchantCode.trim().toUpperCase(),
      };
      await createMerchantApi(data);
      message.success('合作商户创建成功');
    }
    modalOpen.value = false;
    await loadMerchants();
  } finally {
    saving.value = false;
  }
}

function changeStatus(merchant: MerchantManagementItem) {
  const targetStatus: MerchantStatus =
    merchant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const actionText = targetStatus === 'ACTIVE' ? '启用' : '停用';
  Modal.confirm({
    cancelText: '取消',
    content:
      targetStatus === 'ACTIVE'
        ? '启用后，商户名下原本处于营业状态的门店可恢复充值和消费。门店自身的停用状态不会改变。'
        : '停用后，商户名下全部门店将立即停止新的充值、发起消费及待消费确认。历史订单和结算数据不受影响。',
    okButtonProps: { danger: targetStatus === 'SUSPENDED' },
    okText: `确认${actionText}`,
    onOk: async () => {
      await updateMerchantStatusApi(merchant.merchantId, targetStatus);
      message.success(`合作商户已${actionText}`);
      await loadMerchants();
    },
    title: `${actionText}“${merchant.businessName}”？`,
  });
}

function formatTime(value?: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
}

onMounted(loadMerchants);
</script>

<template>
  <Page description="维护合作主体、协议与合作状态。" title="合作商户">
    <Alert
      class="mb-4"
      message="停用商户会立即阻止其全部门店继续充值和消费，但不会修改门店自身状态，也不会影响历史订单与结算。"
      show-icon
      type="info"
    />

    <Card class="mb-4">
      <Row :gutter="12">
        <Col :lg="8" :md="12" :xs="24">
          <Input
            v-model:value="query.keyword"
            allow-clear
            placeholder="编码、名称、签约主体或联系人"
            @press-enter="search"
          />
        </Col>
        <Col :lg="5" :md="12" :xs="24">
          <Select
            v-model:value="query.status"
            allow-clear
            class="w-full"
            placeholder="全部状态"
          >
            <SelectOption
              v-for="(meta, status) in statusMeta"
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
            <Button ghost type="primary" @click="openCreate">
              新增合作商户
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <Card>
      <Table
        :columns="columns"
        :data-source="merchants"
        :loading="loading"
        :pagination="pagination"
        :row-key="(record: MerchantManagementItem) => record.merchantId"
        :scroll="{ x: 1360 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'businessName'">
            <div>{{ record.businessName }}</div>
            <div class="text-xs text-gray-400">{{ record.merchantCode }}</div>
          </template>
          <template v-else-if="column.key === 'contact'">
            <div>{{ record.contactName }}</div>
            <div class="text-xs text-gray-400">{{ record.contactPhone }}</div>
          </template>
          <template v-else-if="column.key === 'contract'">
            <div>{{ record.unifiedSocialCreditCode || '未填写信用代码' }}</div>
            <div class="text-xs text-gray-400">
              协议：{{ record.agreementNo || '未填写' }}
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="statusMeta[record.status as MerchantStatus].color">
              {{ statusMeta[record.status as MerchantStatus].label }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'updateTime'">
            {{ formatTime(record.updateTime) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button
                type="link"
                size="small"
                @click="openEdit(record as MerchantManagementItem)"
              >
                编辑
              </Button>
              <Button
                v-if="record.status !== 'TERMINATED'"
                :danger="record.status === 'ACTIVE'"
                type="link"
                size="small"
                @click="changeStatus(record as MerchantManagementItem)"
              >
                {{ record.status === 'ACTIVE' ? '停用' : '启用' }}
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="modalOpen"
      :confirm-loading="saving"
      :title="modalTitle"
      cancel-text="取消"
      ok-text="保存"
      width="680px"
      @ok="submitForm"
    >
      <Form
        ref="formRef"
        :label-col="{ span: 24 }"
        :model="formModel"
        :rules="formRules"
        :wrapper-col="{ span: 24 }"
      >
        <Row :gutter="16">
          <Col :md="12" :xs="24">
            <FormItem label="商户编码" name="merchantCode">
              <Input
                v-model:value="formModel.merchantCode"
                :disabled="Boolean(editingMerchant)"
                placeholder="例如 MERCHANT-001"
              />
            </FormItem>
          </Col>
          <Col :md="12" :xs="24">
            <FormItem label="商户名称" name="businessName">
              <Input v-model:value="formModel.businessName" />
            </FormItem>
          </Col>
        </Row>
        <FormItem label="签约主体名称" name="legalName">
          <Input
            v-model:value="formModel.legalName"
            placeholder="营业执照或协议中的主体全称"
          />
        </FormItem>
        <FormItem
          label="统一社会信用代码（选填）"
          name="unifiedSocialCreditCode"
        >
          <Input
            v-model:value="formModel.unifiedSocialCreditCode"
            :maxlength="18"
            placeholder="18位统一社会信用代码"
          />
        </FormItem>
        <Row :gutter="16">
          <Col :md="12" :xs="24">
            <FormItem label="联系人" name="contactName">
              <Input v-model:value="formModel.contactName" />
            </FormItem>
          </Col>
          <Col :md="12" :xs="24">
            <FormItem label="联系电话" name="contactPhone">
              <Input v-model:value="formModel.contactPhone" />
            </FormItem>
          </Col>
        </Row>
        <FormItem label="合作协议编号（选填）" name="agreementNo">
          <Input v-model:value="formModel.agreementNo" />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
