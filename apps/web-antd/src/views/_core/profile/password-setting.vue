<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, ref } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { changePasswordApi } from '#/api';
import { useAuthStore } from '#/store';

const authStore = useAuthStore();
const submitting = ref(false);

const isStrongPassword = (value: string): boolean =>
  value.length >= 12 &&
  value.length <= 128 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'oldPassword',
      label: '旧密码',
      component: 'VbenInputPassword',
      componentProps: {
        autocomplete: 'current-password',
        placeholder: '请输入旧密码',
      },
      rules: z
        .string({ required_error: '请输入旧密码' })
        .min(1, { message: '请输入旧密码' })
        .max(128, { message: '旧密码长度不能超过128位' }),
    },
    {
      fieldName: 'newPassword',
      label: '新密码',
      component: 'VbenInputPassword',
      componentProps: {
        autocomplete: 'new-password',
        passwordStrength: true,
        placeholder: '请输入新密码',
      },
      rules: z
        .string({ required_error: '请输入新密码' })
        .refine(isStrongPassword, {
          message: '至少12位，并包含大小写字母、数字和特殊字符',
        }),
    },
    {
      fieldName: 'confirmPassword',
      label: '确认密码',
      component: 'VbenInputPassword',
      componentProps: {
        autocomplete: 'new-password',
        passwordStrength: true,
        placeholder: '请再次输入新密码',
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({ required_error: '请再次输入新密码' })
            .min(1, { message: '请再次输入新密码' })
            .refine((value) => value === newPassword, {
              message: '两次输入的密码不一致',
            });
        },
        triggerFields: ['newPassword'],
      },
    },
  ];
});

async function handleSubmit(values: Recordable<any>) {
  if (submitting.value) return;
  const currentPassword = String(values.oldPassword ?? '');
  const newPassword = String(values.newPassword ?? '');
  submitting.value = true;
  try {
    await changePasswordApi({ currentPassword, newPassword });
    message.success('密码修改成功，请使用新密码重新登录');
    await authStore.logout(false);
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <ProfilePasswordSetting
    class="w-1/3"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
