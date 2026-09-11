import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['SUPER_ADMIN'],
      icon: 'lucide:settings-2',
      order: 9,
      title: '系统设置',
    },
    name: 'PlatformSettings',
    path: '/settings',
    children: [
      {
        name: 'PlatformBusinessSetting',
        path: '/settings/business',
        component: () => import('#/views/settings/business/index.vue'),
        meta: {
          authority: ['SUPER_ADMIN'],
          icon: 'lucide:badge-percent',
          title: '业务参数',
        },
      },
    ],
  },
];

export default routes;
