<script lang="ts" setup>
import type { PlatformAdminRole, PlatformAdminUserInfo } from '#/api/core/user';

import { computed } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Row,
  Tag,
} from 'ant-design-vue';

const roleLabels: Record<PlatformAdminRole, string> = {
  CLERK: '店员',
  STORE_MANAGER: '店长',
  SUPER_ADMIN: '超级管理员',
};

const userStore = useUserStore();
const currentUser = computed(
  () => userStore.userInfo as null | PlatformAdminUserInfo,
);
const storeCount = computed(() => currentUser.value?.storeIds.length ?? 0);
</script>

<template>
  <Page
    description="后台基础认证已经接入，后续业务模块将按角色和门店范围逐步开放。"
    title="平台工作台"
  >
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
                storeCount > 0 ? `${storeCount} 家` : '全部门店或暂无绑定门店'
              }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </Col>
      <Col :lg="8" :xs="24">
        <Card class="mt-4 lg:mt-0" title="系统状态">
          <Alert
            description="管理员令牌和角色信息来自 Spring Boot 后端，页面刷新后会重新校验登录状态。"
            message="后台认证服务已接入"
            show-icon
            type="success"
          />
        </Card>
      </Col>
    </Row>
  </Page>
</template>
