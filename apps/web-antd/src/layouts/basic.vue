<script lang="ts" setup>
import { computed, watch } from 'vue';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { BasicLayout, LockScreen, UserDropdown } from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const roleLabels: Record<string, string> = {
  CLERK: '店员',
  STORE_MANAGER: '店长',
  SUPER_ADMIN: '超级管理员',
};

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();

const avatar = computed(
  () => userStore.userInfo?.avatar || preferences.app.defaultAvatar,
);
const roleText = computed(() => {
  const roles = userStore.userInfo?.roles ?? [];
  return roles.map((role) => roleLabels[role] ?? role).join('、') || '后台用户';
});

async function handleLogout() {
  await authStore.logout(false);
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (!enable) {
      destroyWatermark();
      return;
    }
    await updateWatermark({
      advancedStyle: {
        colorStops: [
          {
            color: isDarkValue
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.12)',
            offset: 0,
          },
          {
            color: isDarkValue
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.12)',
            offset: 1,
          },
        ],
        type: 'linear',
      },
      content:
        content ||
        `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
    });
  },
  { immediate: true },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :description="userStore.userInfo?.username"
        :menus="[]"
        :tag-text="roleText"
        :text="userStore.userInfo?.realName"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
