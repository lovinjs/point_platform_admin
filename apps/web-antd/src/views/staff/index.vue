<script lang="ts" setup>
import type { TableProps } from 'ant-design-vue';

import type {
  StaffCreateParams,
  StaffManagementItem,
  StaffPageParams,
  StaffRoleCode,
  StaffStatus,
  StaffStoreItem,
  StaffUpdateParams,
  StaffWritableStatus,
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
  createStaffApi,
  getStaffPageApi,
  getStaffStoreOptionsApi,
  resetStaffPasswordApi,
  unlockStaffApi,
  updateStaffApi,
  updateStaffStatusApi,
} from '#/api';

type EditableStaffRole = Exclude<StaffRoleCode, 'SUPER_ADMIN'>;

interface StaffFormModel {
  initialPassword: string;
  phone: string;
  realName: string;
  roleCode?: EditableStaffRole;
  storeId?: number;
  username: string;
}

interface PasswordFormModel {
  confirmPassword: string;
  newPassword: string;
}

interface TablePagination {
  current?: number;
  pageSize?: number;
}

const roleMeta: Record<StaffRoleCode, { color: string; label: string }> = {
  CLERK: { color: 'blue', label: '店员' },
  STORE_MANAGER: { color: 'purple', label: '店长' },
  SUPER_ADMIN: { color: 'gold', label: '超级管理员' },
};

const statusMeta: Record<StaffStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: '已启用' },
  DISABLED: { color: 'red', label: '已停用' },
  LOCKED: { color: 'orange', label: '已锁定' },
};
const queryStatuses: StaffWritableStatus[] = ['ACTIVE', 'DISABLED'];

const storeStatusLabel = {
  ACTIVE: '营业中',
  CLOSED: '已关闭',
  PENDING: '待启用',
  SUSPENDED: '已停用',
};

const columns: TableProps<StaffManagementItem>['columns'] = [
  { dataIndex: 'username', key: 'account', title: '账号', width: 180 },
  { dataIndex: 'realName', key: 'realName', title: '姓名', width: 130 },
  { dataIndex: 'roleCodes', key: 'roleCodes', title: '角色', width: 150 },
  { dataIndex: 'stores', key: 'stores', title: '所属门店', width: 260 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 150 },
  {
    dataIndex: 'lastLoginTime',
    key: 'lastLoginTime',
    title: '最后登录',
    width: 170,
  },
  { dataIndex: 'updateTime', key: 'updateTime', title: '更新时间', width: 170 },
  { fixed: 'right', key: 'action', title: '操作', width: 270 },
];

const query = reactive<StaffPageParams>({
  pageNum: 1,
  pageSize: 20,
});
const staffItems = ref<StaffManagementItem[]>([]);
const storeOptions = ref<StaffStoreItem[]>([]);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const passwordModalOpen = ref(false);
const editingStaff = ref<StaffManagementItem>();
const passwordStaff = ref<StaffManagementItem>();
const formRef = ref<{
  clearValidate: () => void;
  validate: () => Promise<void>;
}>();
const formModel = reactive<StaffFormModel>({
  initialPassword: '',
  phone: '',
  realName: '',
  roleCode: undefined,
  storeId: undefined,
  username: '',
});
const passwordModel = reactive<PasswordFormModel>({
  confirmPassword: '',
  newPassword: '',
});

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 个后台账号`,
  total: total.value,
}));
const modalTitle = computed(() =>
  editingStaff.value ? '编辑员工账号' : '新增员工账号',
);
const editableRoles: EditableStaffRole[] = ['CLERK', 'STORE_MANAGER'];
const formRules = {
  initialPassword: [
    { message: '请输入初始密码', required: true },
    { max: 128, message: '密码不能超过128个字符', min: 12 },
    {
      message: '密码必须包含大小写字母、数字和特殊字符',
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/,
    },
  ],
  phone: [
    { max: 32, message: '手机号不能超过32个字符' },
    { message: '手机号格式不正确', pattern: /^$|^[0-9+()\-\s]{5,32}$/ },
  ],
  realName: [
    { message: '请输入姓名', required: true },
    { max: 64, message: '姓名不能超过64个字符' },
  ],
  roleCode: [{ message: '请选择员工角色', required: true }],
  storeId: [{ message: '请选择所属门店', required: true }],
  username: [
    { message: '请输入用户名', required: true },
    { max: 64, message: '用户名长度必须为3到64位', min: 3 },
    {
      message: '只能输入字母、数字、点、下划线或横线',
      pattern: /^[A-Za-z0-9._-]+$/,
    },
  ],
};

async function loadStaff() {
  loading.value = true;
  try {
    const result = await getStaffPageApi({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    });
    staffItems.value = result.items;
    total.value = result.total;
    query.pageNum = result.pageNum;
    query.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

async function loadStoreOptions() {
  storeOptions.value = await getStaffStoreOptionsApi();
}

function search() {
  query.pageNum = 1;
  void loadStaff();
}

function resetSearch() {
  query.keyword = undefined;
  query.roleCode = undefined;
  query.status = undefined;
  query.storeId = undefined;
  query.pageNum = 1;
  void loadStaff();
}

function handleTableChange(value: TablePagination) {
  query.pageNum = value.current ?? 1;
  query.pageSize = value.pageSize ?? 20;
  void loadStaff();
}

function resetForm() {
  Object.assign(formModel, {
    initialPassword: '',
    phone: '',
    realName: '',
    roleCode: undefined,
    storeId: undefined,
    username: '',
  });
}

function openCreate() {
  editingStaff.value = undefined;
  resetForm();
  modalOpen.value = true;
  void nextTick(() => formRef.value?.clearValidate());
}

function openEdit(staff: StaffManagementItem) {
  if (isProtected(staff)) return;
  editingStaff.value = staff;
  Object.assign(formModel, {
    initialPassword: '',
    phone: staff.phone ?? '',
    realName: staff.realName,
    roleCode: staff.roleCodes[0] as EditableStaffRole,
    storeId: staff.stores[0]?.storeId,
    username: staff.username,
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
    const editableFields: StaffUpdateParams = {
      phone: optionalValue(formModel.phone),
      realName: formModel.realName.trim(),
      roleCode: formModel.roleCode as EditableStaffRole,
      storeId: formModel.storeId as number,
    };
    if (editingStaff.value) {
      await updateStaffApi(editingStaff.value.userId, editableFields);
      message.success('员工账号已更新，权限有变化时原登录会自动失效');
    } else {
      const data: StaffCreateParams = {
        ...editableFields,
        initialPassword: formModel.initialPassword,
        username: formModel.username.trim().toLowerCase(),
      };
      await createStaffApi(data);
      message.success('员工账号创建成功');
    }
    modalOpen.value = false;
    await loadStaff();
  } finally {
    saving.value = false;
  }
}

function changeStatus(staff: StaffManagementItem) {
  const targetStatus: StaffWritableStatus =
    staff.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  const actionText = targetStatus === 'ACTIVE' ? '启用' : '停用';
  Modal.confirm({
    cancelText: '取消',
    content:
      targetStatus === 'ACTIVE'
        ? '启用后，员工可以使用现有账号和所属门店权限重新登录。'
        : '停用后，该账号当前登录凭证将立即失效，并且不能再次登录。',
    okButtonProps: { danger: targetStatus === 'DISABLED' },
    okText: `确认${actionText}`,
    onOk: async () => {
      await updateStaffStatusApi(staff.userId, targetStatus);
      message.success(`员工账号已${actionText}`);
      await loadStaff();
    },
    title: `${actionText}“${staff.realName}”？`,
  });
}

function openPasswordReset(staff: StaffManagementItem) {
  passwordStaff.value = staff;
  passwordModel.newPassword = '';
  passwordModel.confirmPassword = '';
  passwordModalOpen.value = true;
}

function isStrongPassword(value: string) {
  return (
    value.length >= 12 &&
    value.length <= 128 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

async function submitPasswordReset() {
  if (!isStrongPassword(passwordModel.newPassword)) {
    message.warning('密码必须为12到128位，并包含大小写字母、数字和特殊字符');
    return;
  }
  if (passwordModel.newPassword !== passwordModel.confirmPassword) {
    message.warning('两次输入的密码不一致');
    return;
  }
  if (!passwordStaff.value) return;
  saving.value = true;
  try {
    await resetStaffPasswordApi(
      passwordStaff.value.userId,
      passwordModel.newPassword,
    );
    passwordModalOpen.value = false;
    message.success('登录密码已重置，员工原登录凭证已失效');
    await loadStaff();
  } finally {
    saving.value = false;
  }
}

function unlock(staff: StaffManagementItem) {
  Modal.confirm({
    cancelText: '取消',
    content: '解除后，登录失败次数将清零，员工可以立即重新尝试登录。',
    okText: '解除锁定',
    onOk: async () => {
      await unlockStaffApi(staff.userId);
      message.success('员工登录锁定已解除');
      await loadStaff();
    },
    title: `解除“${staff.realName}”的登录锁定？`,
  });
}

function isProtected(staff: StaffManagementItem) {
  return staff.roleCodes.includes('SUPER_ADMIN');
}

function storeOptionLabel(store: StaffStoreItem) {
  const status =
    store.storeStatus === 'ACTIVE'
      ? ''
      : ` · ${storeStatusLabel[store.storeStatus]}`;
  return `${store.merchantName ?? '未知商户'} / ${store.storeName}（${store.storeCode}）${status}`;
}

function formatTime(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
}

onMounted(async () => {
  await Promise.all([loadStoreOptions(), loadStaff()]);
});
</script>

<template>
  <Page
    description="创建店员和店长账号，维护角色、门店范围及登录状态。"
    title="员工账号"
  >
    <Alert
      class="mb-4"
      message="当前按一名员工对应一家门店管理；底层权限结构已保留未来店长管理多家门店的能力。超级管理员账号不允许在此页面修改。"
      show-icon
      type="info"
    />

    <Alert
      v-if="storeOptions.length === 0"
      class="mb-4"
      message="当前没有可分配的门店，请先创建合作商户和门店。"
      show-icon
      type="warning"
    />

    <Card class="mb-4">
      <Row :gutter="12">
        <Col :lg="6" :md="12" :xs="24">
          <Input
            v-model:value="query.keyword"
            allow-clear
            placeholder="用户名、姓名或手机号"
            @press-enter="search"
          />
        </Col>
        <Col :lg="4" :md="12" :xs="24">
          <Select
            v-model:value="query.roleCode"
            allow-clear
            class="w-full"
            placeholder="全部角色"
          >
            <SelectOption
              v-for="(meta, roleCode) in roleMeta"
              :key="roleCode"
              :value="roleCode"
            >
              {{ meta.label }}
            </SelectOption>
          </Select>
        </Col>
        <Col :lg="4" :md="12" :xs="24">
          <Select
            v-model:value="query.storeId"
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
        <Col :lg="4" :md="12" :xs="24">
          <Select
            v-model:value="query.status"
            allow-clear
            class="w-full"
            placeholder="全部状态"
          >
            <SelectOption
              v-for="status in queryStatuses"
              :key="status"
              :value="status"
            >
              {{ statusMeta[status].label }}
            </SelectOption>
          </Select>
        </Col>
        <Col :lg="6" :md="24" :xs="24">
          <Space wrap>
            <Button type="primary" @click="search">查询</Button>
            <Button @click="resetSearch">重置</Button>
            <Button
              :disabled="storeOptions.length === 0"
              ghost
              type="primary"
              @click="openCreate"
            >
              新增员工
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <Card>
      <Table
        :columns="columns"
        :data-source="staffItems"
        :loading="loading"
        :pagination="pagination"
        :row-key="(record: StaffManagementItem) => record.userId"
        :scroll="{ x: 1450 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'account'">
            <div>{{ record.username }}</div>
            <div class="text-xs text-gray-400">
              {{ record.phone || '未填写手机号' }}
            </div>
          </template>
          <template v-else-if="column.key === 'roleCodes'">
            <Space :size="4" wrap>
              <Tag
                v-for="roleCode in record.roleCodes"
                :key="roleCode"
                :color="roleMeta[roleCode as StaffRoleCode].color"
              >
                {{ roleMeta[roleCode as StaffRoleCode].label }}
              </Tag>
            </Space>
          </template>
          <template v-else-if="column.key === 'stores'">
            <template v-if="record.stores.length > 0">
              <div v-for="store in record.stores" :key="store.storeId">
                {{ store.storeName }}
                <span class="opacity-60">（{{ store.storeCode }}）</span>
              </div>
            </template>
            <span v-else class="text-gray-400">全平台</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <Space :size="4" wrap>
              <Tag :color="statusMeta[record.status as StaffStatus].color">
                {{ statusMeta[record.status as StaffStatus].label }}
              </Tag>
              <Tag v-if="record.loginLocked" color="orange">临时锁定</Tag>
            </Space>
          </template>
          <template v-else-if="column.key === 'lastLoginTime'">
            {{ formatTime(record.lastLoginTime) }}
          </template>
          <template v-else-if="column.key === 'updateTime'">
            {{ formatTime(record.updateTime) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <span
              v-if="isProtected(record as StaffManagementItem)"
              class="text-gray-400"
            >
              受保护账号
            </span>
            <Space v-else :size="0" wrap>
              <Button
                size="small"
                type="link"
                @click="openEdit(record as StaffManagementItem)"
              >
                编辑
              </Button>
              <Button
                size="small"
                type="link"
                @click="openPasswordReset(record as StaffManagementItem)"
              >
                重置密码
              </Button>
              <Button
                v-if="record.loginLocked"
                size="small"
                type="link"
                @click="unlock(record as StaffManagementItem)"
              >
                解除锁定
              </Button>
              <Button
                :danger="record.status === 'ACTIVE'"
                size="small"
                type="link"
                @click="changeStatus(record as StaffManagementItem)"
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
      width="620px"
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
            <FormItem label="用户名" name="username">
              <Input
                v-model:value="formModel.username"
                :disabled="Boolean(editingStaff)"
                placeholder="例如 clerk.zhang"
              />
            </FormItem>
          </Col>
          <Col :md="12" :xs="24">
            <FormItem label="姓名" name="realName">
              <Input v-model:value="formModel.realName" />
            </FormItem>
          </Col>
        </Row>
        <FormItem v-if="!editingStaff" label="初始密码" name="initialPassword">
          <Input.Password
            v-model:value="formModel.initialPassword"
            autocomplete="new-password"
            placeholder="至少12位，包含大小写字母、数字和特殊字符"
          />
        </FormItem>
        <FormItem label="手机号（选填）" name="phone">
          <Input v-model:value="formModel.phone" />
        </FormItem>
        <Row :gutter="16">
          <Col :md="8" :xs="24">
            <FormItem label="员工角色" name="roleCode">
              <Select
                v-model:value="formModel.roleCode"
                placeholder="请选择角色"
              >
                <SelectOption
                  v-for="roleCode in editableRoles"
                  :key="roleCode"
                  :value="roleCode"
                >
                  {{ roleMeta[roleCode].label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :md="16" :xs="24">
            <FormItem label="所属门店" name="storeId">
              <Select
                v-model:value="formModel.storeId"
                placeholder="请选择门店"
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
            </FormItem>
          </Col>
        </Row>
      </Form>
    </Modal>

    <Modal
      v-model:open="passwordModalOpen"
      :confirm-loading="saving"
      :title="`重置“${passwordStaff?.realName ?? ''}”的密码`"
      cancel-text="取消"
      ok-text="确认重置"
      @ok="submitPasswordReset"
    >
      <Alert
        class="mb-4"
        message="密码重置后，该员工当前所有登录凭证会立即失效。"
        show-icon
        type="warning"
      />
      <Form
        :label-col="{ span: 24 }"
        :model="passwordModel"
        :wrapper-col="{ span: 24 }"
      >
        <FormItem label="新密码">
          <Input.Password
            v-model:value="passwordModel.newPassword"
            autocomplete="new-password"
            placeholder="至少12位，包含大小写字母、数字和特殊字符"
          />
        </FormItem>
        <FormItem label="确认新密码">
          <Input.Password
            v-model:value="passwordModel.confirmPassword"
            autocomplete="new-password"
          />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
