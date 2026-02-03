<script setup lang="ts">
import echarts from "@/plugins/echarts";
import { useResizeObserver } from "@pureadmin/utils";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  getUserActivityStats,
  type UserActivityStatsResult,
  type UserActivityStatsTrendItem
} from "@/api/userActivity";

defineOptions({
  name: "UserActivityStats"
});

type TimeRangePreset = 0 | 7 | 14 | 30;

type MetricCard = {
  label: string;
  value: string;
  helper?: string;
};

const colors = {
  primary: "#4091f7",
  secondary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    500: "#6B7280",
    600: "#4B5563",
    800: "#1F2937",
    900: "#111827"
  }
} as const;

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 864e5);
}

function formatMonthDay(ymd: string): string {
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

function clampToInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function diffDaysInclusive(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const delta = Math.round((e.getTime() - s.getTime()) / 864e5);
  return delta + 1;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h <= 0) return `${m} 分钟`;
  return `${h} 小时 ${m} 分钟`;
}

function safeDispose(chart: echarts.ECharts | null): void {
  if (!chart) return;
  chart.dispose();
}

const presetOptions: Array<{ label: string; value: TimeRangePreset }> = [
  { label: "近 7 天", value: 7 },
  { label: "近 14 天", value: 14 },
  { label: "近 30 天", value: 30 },
  { label: "自定义", value: 0 }
];

const preset = ref<TimeRangePreset>(7);
const dateRange = ref<[Date, Date] | null>(null);

const loading = ref(false);
const result = ref<UserActivityStatsResult | null>(null);

const rangeText = computed(() => {
  const s = result.value?.summary?.rangeStart;
  const e = result.value?.summary?.rangeEnd;
  if (!s || !e) return "";
  return `${s} ~ ${e}`;
});

const metrics = computed((): MetricCard[] => {
  const summary = result.value?.summary;
  const activeUsers = summary?.activeUsers ?? 0;
  const totalVisitCount = summary?.totalVisitCount ?? 0;
  const totalOnlineSeconds = summary?.totalOnlineSeconds ?? 0;
  const perActiveSeconds =
    activeUsers > 0 ? Math.round(totalOnlineSeconds / activeUsers) : 0;

  return [
    {
      label: "区间活跃用户",
      value: activeUsers.toLocaleString(),
      helper: "去重"
    },
    {
      label: "上报次数",
      value: totalVisitCount.toLocaleString(),
      helper: "访问强度"
    },
    {
      label: "在线总时长",
      value: formatDuration(totalOnlineSeconds),
      helper: "总量"
    },
    {
      label: "人均在线时长",
      value: formatDuration(perActiveSeconds),
      helper: "活跃用户"
    }
  ];
});

const trendList = computed((): UserActivityStatsTrendItem[] => {
  return result.value?.trend?.list ?? [];
});

const dauChartRef = ref<HTMLDivElement | null>(null);
const onlineChartRef = ref<HTMLDivElement | null>(null);
const visitChartRef = ref<HTMLDivElement | null>(null);

let dauChart: echarts.ECharts | null = null;
let onlineChart: echarts.ECharts | null = null;
let visitChart: echarts.ECharts | null = null;

function buildDauOption(
  list: UserActivityStatsTrendItem[]
): echarts.EChartsCoreOption {
  const labels = list.map(i => formatMonthDay(i.day));
  const values = list.map(i => i.dau);

  return {
    grid: { left: 12, right: 12, top: 36, bottom: 10, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: colors.gray[200] } },
      axisLabel: { color: colors.gray[500] }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: colors.gray[100] } },
      axisLabel: { color: colors.gray[500] }
    },
    series: [
      {
        type: "line",
        name: "DAU",
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: colors.primary },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(64,145,247,0.22)" },
              { offset: 1, color: "rgba(64,145,247,0.00)" }
            ]
          }
        }
      }
    ]
  };
}

function buildOnlineOption(
  list: UserActivityStatsTrendItem[]
): echarts.EChartsCoreOption {
  const labels = list.map(i => formatMonthDay(i.day));
  const values = list.map(i => Number((i.onlineSeconds / 3600).toFixed(2)));

  return {
    grid: { left: 12, right: 12, top: 36, bottom: 10, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: colors.gray[200] } },
      axisLabel: { color: colors.gray[500] }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: colors.gray[100] } },
      axisLabel: { color: colors.gray[500] }
    },
    series: [
      {
        type: "line",
        name: "在线时长(小时)",
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: colors.success }
      }
    ]
  };
}

function buildVisitOption(
  list: UserActivityStatsTrendItem[]
): echarts.EChartsCoreOption {
  const labels = list.map(i => formatMonthDay(i.day));
  const values = list.map(i => i.visitCount);

  return {
    grid: { left: 12, right: 12, top: 36, bottom: 10, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: colors.gray[200] } },
      axisLabel: { color: colors.gray[500] }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: colors.gray[100] } },
      axisLabel: { color: colors.gray[500] }
    },
    series: [
      {
        type: "bar",
        name: "上报次数",
        data: values,
        barWidth: 14,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: colors.warning
        }
      }
    ]
  };
}

function initCharts(): void {
  if (dauChartRef.value) {
    safeDispose(dauChart);
    dauChart = echarts.init(dauChartRef.value);
  }
  if (onlineChartRef.value) {
    safeDispose(onlineChart);
    onlineChart = echarts.init(onlineChartRef.value);
  }
  if (visitChartRef.value) {
    safeDispose(visitChart);
    visitChart = echarts.init(visitChartRef.value);
  }
}

function updateCharts(): void {
  const list = trendList.value;
  dauChart?.setOption(buildDauOption(list), true);
  onlineChart?.setOption(buildOnlineOption(list), true);
  visitChart?.setOption(buildVisitOption(list), true);
}

function resizeAll(): void {
  dauChart?.resize();
  onlineChart?.resize();
  visitChart?.resize();
}

const rangeQuery = computed(() => {
  const now = new Date();
  if (preset.value === 7 || preset.value === 14 || preset.value === 30) {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(daysAgo(preset.value - 1));
    return {
      dateStart: toYmd(start),
      dateEnd: toYmd(end),
      pageSize: preset.value
    };
  }

  if (dateRange.value) {
    const [start, end] = dateRange.value;
    const days = diffDaysInclusive(start, end);
    return {
      dateStart: toYmd(start),
      dateEnd: toYmd(end),
      pageSize: clampToInt(days, 1, 366)
    };
  }

  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(daysAgo(6));
  return {
    dateStart: toYmd(start),
    dateEnd: toYmd(end),
    pageSize: 7
  };
});

async function fetchStats(): Promise<void> {
  loading.value = true;
  try {
    const data = await getUserActivityStats({
      page: 1,
      pageSize: rangeQuery.value.pageSize,
      dateStart: rangeQuery.value.dateStart,
      dateEnd: rangeQuery.value.dateEnd
    });
    result.value = data;
    updateCharts();
  } catch {
    result.value = null;
    updateCharts();
  } finally {
    loading.value = false;
  }
}

watch(
  () => preset.value,
  v => {
    if (v !== 0) dateRange.value = null;
  }
);

watch(
  () => dateRange.value,
  v => {
    if (v) preset.value = 0;
  }
);

watch(
  () => [preset.value, dateRange.value],
  () => {
    fetchStats();
  }
);

useResizeObserver(dauChartRef, () => resizeAll());
useResizeObserver(onlineChartRef, () => resizeAll());
useResizeObserver(visitChartRef, () => resizeAll());

onMounted(() => {
  initCharts();
  updateCharts();
  fetchStats();
});

onBeforeUnmount(() => {
  safeDispose(dauChart);
  safeDispose(onlineChart);
  safeDispose(visitChart);
  dauChart = null;
  onlineChart = null;
  visitChart = null;
});
</script>

<template>
  <div v-loading="loading" class="user-activity-page">
    <div
      class="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
    >
      <div class="min-w-0">
        <div class="text-[20px] font-semibold leading-[28px] text-gray-900">
          用户活跃统计
        </div>
        <div class="mt-1 text-[14px] leading-[20px] text-gray-500">
          {{ rangeText ? `数据区间：${rangeText}` : "按天趋势 + 区间汇总" }}
        </div>
      </div>

      <div
        class="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center"
      >
        <el-segmented
          v-model="preset"
          :options="presetOptions"
          class="w-full sm:w-auto"
        />
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          unlink-panels
          range-separator="~"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          class="w-full sm:w-[320px]!"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <el-card
        v-for="m in metrics"
        :key="m.label"
        shadow="never"
        class="metric-card"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="text-[13px] leading-[18px] text-gray-500">
              {{ m.label }}
            </div>
            <div
              class="mt-2 text-[26px] font-semibold leading-[34px] text-gray-900"
            >
              {{ m.value }}
            </div>
          </div>
          <div v-if="m.helper" class="shrink-0">
            <div
              class="rounded-full bg-gray-50 px-3 py-1 text-[12px] leading-[16px] text-gray-600"
            >
              {{ m.helper }}
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <el-card shadow="never" class="chart-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-gray-900">DAU 趋势</div>
          <div class="text-[12px] text-gray-500">按天</div>
        </div>
        <div ref="dauChartRef" class="chart h-[280px]" />
      </el-card>

      <el-card shadow="never" class="chart-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-gray-900">
            在线时长趋势
          </div>
          <div class="text-[12px] text-gray-500">小时</div>
        </div>
        <div ref="onlineChartRef" class="chart h-[280px]" />
      </el-card>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4">
      <el-card shadow="never" class="chart-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-gray-900">
            上报次数趋势
          </div>
          <div class="text-[12px] text-gray-500">按天</div>
        </div>
        <div ref="visitChartRef" class="chart h-[300px]" />
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.metric-card :deep(.el-card__body),
.chart-card :deep(.el-card__body) {
  padding: 16px;
}

.metric-card,
.chart-card {
  border-color: #f0f2f5;
  border-radius: 12px;
}

.chart {
  width: 100%;
}
</style>
