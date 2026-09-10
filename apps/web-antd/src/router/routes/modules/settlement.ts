import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['SUPER_ADMIN', 'STORE_MANAGER'],
      icon: 'lucide:landmark',
      order: 8,
      title: '财务结算',
    },
    name: 'FinancialSettlement',
    path: '/settlement',
    children: [
      {
        name: 'MonthlySettlement',
        path: '/settlement/monthly',
        component: () => import('#/views/settlement/index.vue'),
        meta: {
          authority: ['SUPER_ADMIN', 'STORE_MANAGER'],
          icon: 'lucide:calendar-check-2',
          title: '月度结算',
        },
      },
    ],
  },
];

export default routes;
