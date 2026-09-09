import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['SUPER_ADMIN'],
      icon: 'lucide:store',
      order: 10,
      title: '商户门店',
    },
    name: 'MerchantManagement',
    path: '/merchant',
    children: [
      {
        name: 'StoreManagement',
        path: '/merchant/stores',
        component: () => import('#/views/merchant/store/index.vue'),
        meta: {
          authority: ['SUPER_ADMIN'],
          icon: 'lucide:map-pin-house',
          title: '门店管理',
        },
      },
    ],
  },
];

export default routes;
