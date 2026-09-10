import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['SUPER_ADMIN'],
      icon: 'lucide:contact-round',
      order: 8,
      title: '客户中心',
    },
    name: 'CustomerCenter',
    path: '/customers',
    children: [
      {
        name: 'CustomerManagement',
        path: '/customers/list',
        component: () => import('#/views/customer/index.vue'),
        meta: {
          authority: ['SUPER_ADMIN'],
          icon: 'lucide:users',
          title: '客户管理',
        },
      },
    ],
  },
];

export default routes;
