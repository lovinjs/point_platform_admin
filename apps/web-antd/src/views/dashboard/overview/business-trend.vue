<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { DashboardDailyMetrics } from '#/api';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import dayjs from 'dayjs';

const props = defineProps<{
  data: DashboardDailyMetrics[];
}>();

const chartRef = ref<EchartsUIType>();
const mounted = ref(false);
const { renderEcharts } = useEcharts(chartRef);

function render() {
  if (!mounted.value) return;
  renderEcharts({
    grid: {
      bottom: 8,
      containLabel: true,
      left: 16,
      right: 20,
      top: 50,
    },
    legend: {
      data: ['充值净现金', '消费总额'],
      top: 4,
    },
    series: [
      {
        areaStyle: { opacity: 0.12 },
        data: props.data.map((item) => item.netRechargeCashCent / 100),
        emphasis: { focus: 'series' },
        itemStyle: { color: '#1677ff' },
        name: '充值净现金',
        smooth: true,
        type: 'line',
      },
      {
        areaStyle: { opacity: 0.08 },
        data: props.data.map((item) => item.consumptionGrossCent / 100),
        emphasis: { focus: 'series' },
        itemStyle: { color: '#52c41a' },
        name: '消费总额',
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      axisTick: { show: false },
      boundaryGap: false,
      data: props.data.map((item) => dayjs(item.businessDate).format('MM-DD')),
      type: 'category',
    },
    yAxis: {
      axisLabel: {
        formatter: (value: number) => `¥${value}`,
      },
      splitLine: { lineStyle: { type: 'dashed' } },
      type: 'value',
    },
  });
}

watch(
  () => props.data,
  () => render(),
  { deep: true },
);

onMounted(() => {
  mounted.value = true;
  render();
});
</script>

<template>
  <div class="h-80 w-full">
    <EchartsUI ref="chartRef" />
  </div>
</template>
