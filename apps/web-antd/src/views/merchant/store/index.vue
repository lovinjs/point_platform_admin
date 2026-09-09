<script lang="ts" setup>
import type { TableProps } from 'ant-design-vue';

import type {
  MerchantOption,
  StoreCreateParams,
  StoreManagementItem,
  StorePageParams,
  StoreStatus,
  StoreUpdateParams,
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
  createStoreApi,
  getMerchantOptionsApi,
  getStorePageApi,
  updateStoreApi,
  updateStoreStatusApi,
} from '#/api';

interface StoreFormModel {
  address: string;
  contactPhone: string;
  merchantId?: number;
  storeCode: string;
  storeName: string;
}

interface TablePagination {
  current?: number;
  pageSize?: number;
}

const statusMeta: Record<StoreStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: '营业中' },
  CLOSED: { color: 'default', label: '已关闭' },
  PENDING: { color: 'orange', label: '待启用' },
  SUSPENDED: { color: 'red', label: '已停用' },
};

const columns: TableProps<StoreManagementItem>['columns'] = [
  { dataIndex: 'storeCode', key: 'storeCode', title: '门店编码', width: 150 },
  { dataIndex: 'storeName', key: 'storeName', title: '门店名称', width: 180 },
  {
    dataIndex: 'merchantName',
    key: 'merchantName',
    title: '所属商户',
    width: 180,
  },
  { dataIndex: 'address', key: 'address', title: '地址', width: 260 },
  {
    dataIndex: 'contactPhone',
    key: 'contactPhone',
    title: '联系电话',
    width: 150,
  },
  { dataIndex: 'status', key: 'status', title: '状态', width: 100 },
  { dataIndex: 'updateTime', key: 'updateTime', title: '更新时间', width: 170 },
  { fixed: 'right', key: 'action', title: '操作', width: 150 },
];

const query = reactive<StorePageParams>({
  pageNum: 1,
  pageSize: 20,
});
const stores = ref<StoreManagementItem[]>([]);
const merchantOptions = ref<MerchantOption[]>([]);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const editingStore = ref<null | StoreManagementItem>(null);
const formRef = ref<{
  clearValidate: () => void;
  validate: () => Promise<void>;
}>();
const formModel = reactive<StoreFormModel>({
  address: '',
  contactPhone: '',
  merchantId: undefined,
  storeCode: '',
  storeName: '',
});

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 家门店`,
  total: total.value,
}));
const modalTitle = computed(() =>
  editingStore.value ? '编辑门店' : '新增门店',
);
const formRules = {
  address: [
    { message: '请输入门店地址', required: true },
    { max: 500, message: '门店地址不能超过500个字符' },
  ],
  contactPhone: [
    { message: '请输入联系电话', required: true },
    {
      message: '联系电话格式不正确',
      pattern: /^[0-9+()\-\s]{5,32}$/,
    },
  ],
  merchantId: [{ message: '请选择所属商户', required: true }],
  storeCode: [
    { message: '请输入门店编码', required: true },
    {
      message: '只能输入字母、数字、横线和下划线',
      pattern: /^[A-Za-z0-9_-]+$/,
    },
    { max: 64, message: '门店编码不能超过64个字符' },
  ],
  storeName: [
    { message: '请输入门店名称', required: true },
    { max: 200, message: '门店名称不能超过200个字符' },
  ],
};

async function loadStores() {
  loading.value = true;
  try {
    const result = await getStorePageApi({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    });
    stores.value = result.items;
    total.value = result.total;
    query.pageNum = result.pageNum;
    query.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

async function loadMerchantOptions() {
  merchantOptions.value = await getMerchantOptionsApi();
}

function search() {
  query.pageNum = 1;
  void loadStores();
}

function resetSearch() {
  query.keyword = undefined;
  query.merchantId = undefined;
  query.status = undefined;
  query.pageNum = 1;
  void loadStores();
}

function handleTableChange(value: TablePagination) {
  query.pageNum = value.current ?? 1;
  query.pageSize = value.pageSize ?? 20;
  void loadStores();
}

function resetForm() {
  Object.assign(formModel, {
    address: '',
    contactPhone: '',
    merchantId: undefined,
    storeCode: '',
    storeName: '',
  });
}

function openCreate() {
  editingStore.value = null;
  resetForm();
  modalOpen.value = true;
  void nextTick(() => formRef.value?.clearValidate());
}

function openEdit(store: StoreManagementItem) {
  editingStore.value = store;
  Object.assign(formModel, {
    address: store.address,
    contactPhone: store.contactPhone,
    merchantId: store.merchantId,
    storeCode: store.storeCode,
    storeName: store.storeName,
  });
  modalOpen.value = true;
  void nextTick(() => formRef.value?.clearValidate());
}

async function submitForm() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    if (editingStore.value) {
      const data: StoreUpdateParams = {
        address: formModel.address.trim(),
        contactPhone: formModel.contactPhone.trim(),
        storeName: formModel.storeName.trim(),
      };
      await updateStoreApi(editingStore.value.storeId, data);
      message.success('门店资料已更新');
    } else {
      const data: StoreCreateParams = {
        address: formModel.address.trim(),
        contactPhone: formModel.contactPhone.trim(),
        merchantId: formModel.merchantId as number,
        storeCode: formModel.storeCode.trim(),
        storeName: formModel.storeName.trim(),
      };
      await createStoreApi(data);
      message.success('门店创建成功');
    }
    modalOpen.value = false;
    await loadStores();
  } finally {
    saving.value = false;
  }
}

function changeStatus(store: StoreManagementItem) {
  const targetStatus: StoreStatus =
    store.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const actionText = targetStatus === 'ACTIVE' ? '启用' : '停用';
  Modal.confirm({
    cancelText: '取消',
    content:
      targetStatus === 'ACTIVE'
        ? '启用后，店员可在该门店进行充值和发起消费。'
        : '停用后，该门店将不能继续进行充值和消费操作。',
    okButtonProps: {
      danger: targetStatus === 'SUSPENDED',
    },
    okText: `确认${actionText}`,
    onOk: async () => {
      await updateStoreStatusApi(store.storeId, targetStatus);
      message.success(`门店已${actionText}`);
      await loadStores();
    },
    title: `${actionText}“${store.storeName}”？`,
  });
}

function formatTime(value?: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
}

onMounted(async () => {
  await Promise.all([loadMerchantOptions(), loadStores()]);
});
</script>

<template>
  <Page description="维护合作门店资料及营业状态。" title="门店管理">
    <Alert
      v-if="merchantOptions.length === 0"
      class="mb-4"
      message="当前没有有效合作商户，请先准备合作商户资料后再新增门店。"
      show-icon
      type="warning"
    />

    <Card class="mb-4">
      <Row :gutter="12">
        <Col :lg="6" :md="12" :xs="24">
          <Input
            v-model:value="query.keyword"
            allow-clear
            placeholder="门店编码或名称"
            @press-enter="search"
          />
        </Col>
        <Col :lg="6" :md="12" :xs="24">
          <Select
            v-model:value="query.merchantId"
            allow-clear
            class="w-full"
            placeholder="全部合作商户"
          >
            <SelectOption
              v-for="merchant in merchantOptions"
              :key="merchant.merchantId"
              :value="merchant.merchantId"
            >
              {{ merchant.businessName }}（{{ merchant.merchantCode }}）
            </SelectOption>
          </Select>
        </Col>
        <Col :lg="4" :md="12" :xs="24">
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
        <Col :lg="8" :md="12" :xs="24">
          <Space wrap>
            <Button type="primary" @click="search">查询</Button>
            <Button @click="resetSearch">重置</Button>
            <Button
              :disabled="merchantOptions.length === 0"
              type="primary"
              ghost
              @click="openCreate"
            >
              新增门店
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <Card>
      <Table
        :columns="columns"
        :data-source="stores"
        :loading="loading"
        :pagination="pagination"
        :row-key="(record: StoreManagementItem) => record.storeId"
        :scroll="{ x: 1280 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'merchantName'">
            <div>{{ record.merchantName || '-' }}</div>
            <div class="text-xs text-gray-400">{{ record.merchantCode }}</div>
          </template>
          <template v-else-if="column.key === 'address'">
            <span :title="record.address">{{ record.address }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="statusMeta[record.status as StoreStatus].color">
              {{ statusMeta[record.status as StoreStatus].label }}
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
                @click="openEdit(record as StoreManagementItem)"
              >
                编辑
              </Button>
              <Button
                v-if="record.status !== 'CLOSED'"
                :danger="record.status === 'ACTIVE'"
                type="link"
                size="small"
                @click="changeStatus(record as StoreManagementItem)"
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
      @ok="submitForm"
    >
      <Form
        ref="formRef"
        :label-col="{ span: 24 }"
        :model="formModel"
        :rules="formRules"
        :wrapper-col="{ span: 24 }"
      >
        <FormItem v-if="editingStore" label="所属商户">
          <Input
            :value="`${editingStore.merchantName}（${editingStore.merchantCode}）`"
            disabled
          />
        </FormItem>
        <FormItem v-else label="所属商户" name="merchantId">
          <Select
            v-model:value="formModel.merchantId"
            placeholder="请选择所属商户"
          >
            <SelectOption
              v-for="merchant in merchantOptions"
              :key="merchant.merchantId"
              :value="merchant.merchantId"
            >
              {{ merchant.businessName }}（{{ merchant.merchantCode }}）
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="门店编码" name="storeCode">
          <Input
            v-model:value="formModel.storeCode"
            :disabled="Boolean(editingStore)"
            placeholder="例如 STORE-001"
          />
        </FormItem>
        <FormItem label="门店名称" name="storeName">
          <Input v-model:value="formModel.storeName" />
        </FormItem>
        <FormItem label="联系电话" name="contactPhone">
          <Input v-model:value="formModel.contactPhone" />
        </FormItem>
        <FormItem label="门店地址" name="address">
          <Input.TextArea
            v-model:value="formModel.address"
            :auto-size="{ minRows: 2, maxRows: 5 }"
          />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
