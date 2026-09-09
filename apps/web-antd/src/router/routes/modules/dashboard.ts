import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: '工作台',
    },
    name: 'Dashboard',
    path: '/dashboard',
    children: [
      {
        name: 'DashboardOverview',
        path: '/dashboard/overview',
        component: () => import('#/views/dashboard/overview/index.vue'),
        meta: {
          affixTab: true,
          icon: 'lucide:gauge',
          title: '平台概览',
        },
      },
    ],
  },
];

export default routes;
