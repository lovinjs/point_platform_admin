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
      {
        name: 'FinancialReconciliation',
        path: '/settlement/reconciliation',
        component: () => import('#/views/finance/index.vue'),
        meta: {
          authority: ['SUPER_ADMIN'],
          icon: 'lucide:scan-search',
          title: '财务对账与审计',
        },
      },
    ],
  },
];

export default routes;
