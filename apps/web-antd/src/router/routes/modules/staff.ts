import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['SUPER_ADMIN'],
      icon: 'lucide:shield-check',
      order: 20,
      title: '账号权限',
    },
    name: 'StaffPermissionManagement',
    path: '/permission',
    children: [
      {
        name: 'StaffManagement',
        path: '/permission/staff',
        component: () => import('#/views/staff/index.vue'),
        meta: {
          authority: ['SUPER_ADMIN'],
          icon: 'lucide:users-round',
          title: '员工账号',
        },
      },
    ],
  },
];

export default routes;
