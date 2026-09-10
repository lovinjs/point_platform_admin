import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['SUPER_ADMIN', 'STORE_MANAGER', 'CLERK'],
      icon: 'lucide:scan-line',
      order: 5,
      title: '门店业务',
    },
    name: 'StoreOperation',
    path: '/operation',
    children: [
      {
        name: 'CashierWorkbench',
        path: '/operation/cashier',
        component: () => import('#/views/operation/cashier/index.vue'),
        meta: {
          authority: ['SUPER_ADMIN', 'STORE_MANAGER', 'CLERK'],
          icon: 'lucide:badge-dollar-sign',
          title: '门店收银台',
        },
      },
      {
        name: 'OrderCenter',
        path: '/operation/orders',
        component: () => import('#/views/operation/orders/index.vue'),
        meta: {
          authority: ['SUPER_ADMIN', 'STORE_MANAGER', 'CLERK'],
          icon: 'lucide:receipt-text',
          title: '订单中心',
        },
      },
    ],
  },
];

export default routes;
