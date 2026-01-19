<script setup lang="ts">
import echarts from "@/plugins/echarts";
import { useResizeObserver } from "@pureadmin/utils";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({
  name: "Welcome"
});

type Metric = {
  label: string;
  value: string;
  helper?: string;
  delta?: { label: string; value: string };
};

const colors = {
  primary: "#4091f7",
  secondary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827"
  }
} as const;

const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px"
} as const;

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function formatMonthDay(date: Date): string {
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 864e5);
}

const mock = {
  membersTotal: 5218,
  membersNewThisWeek: 186,
  weeklyActive: 423,
  weeklyActiveDelta: 28,
  solveRate: 0.94,
  solveRateDelta: 0.01,
  dailyInteractionsAvg: 312,
  dailyInteractionsDelta: 24,
  unresolvedCount: 37,
  avgSolveHours: 9.6,
  contributorRate: 0.18,
  firstContributionAvgDays: 3.4,
  topExperts: [
    { name: "陈工", score: 86 },
    { name: "阿杰", score: 79 },
    { name: "小李", score: 72 },
    { name: "Neo", score: 61 },
    { name: "Tom", score: 58 }
  ],
  hotTags: [
    { name: "电池管理", heat: 92 },
    { name: "OTA升级", heat: 88 },
    { name: "车机互联", heat: 76 },
    { name: "智能驾驶", heat: 69 },
    { name: "保养攻略", heat: 62 }
  ]
} as const;

const headerMetrics = computed((): Metric[] => {
  return [
    {
      label: "总成员数",
      value: mock.membersTotal.toLocaleString(),
      helper: "社区规模",
      delta: { label: "本周新增", value: `+${mock.membersNewThisWeek}` }
    },
    {
      label: "本周活跃成员",
      value: mock.weeklyActive.toLocaleString(),
      helper: "参与度",
      delta: {
        label: "较上周",
        value: `${mock.weeklyActiveDelta >= 0 ? "+" : ""}${mock.weeklyActiveDelta}`
      }
    },
    {
      label: "内容解决率",
      value: `${Math.round(mock.solveRate * 100)}%`,
      helper: "质量",
      delta: {
        label: "较上周",
        value: `${mock.solveRateDelta >= 0 ? "+" : ""}${Math.round(mock.solveRateDelta * 100)}%`
      }
    },
    {
      label: "日均互动量",
      value: mock.dailyInteractionsAvg.toLocaleString(),
      helper: "热闹程度",
      delta: {
        label: "较上周",
        value: `${mock.dailyInteractionsDelta >= 0 ? "+" : ""}${mock.dailyInteractionsDelta}`
      }
    }
  ];
});

const memberTrendRef = ref<HTMLDivElement | null>(null);
const activityTrendRef = ref<HTMLDivElement | null>(null);
const valueStructureRef = ref<HTMLDivElement | null>(null);

let memberTrendChart: echarts.ECharts | null = null;
let activityTrendChart: echarts.ECharts | null = null;
let valueStructureChart: echarts.ECharts | null = null;

function safeDispose(chart: echarts.ECharts | null): void {
  if (!chart) return;
  chart.dispose();
}

function buildMemberTrendOption(): echarts.EChartsCoreOption {
  const labels = Array.from({ length: 12 }).map((_, idx) => {
    const d = daysAgo((11 - idx) * 7);
    return formatMonthDay(d);
  });

  const values = [18, 22, 26, 31, 28, 34, 41, 37, 45, 48, 52, 61];

  return {
    grid: { left: 12, right: 12, top: 36, bottom: 8, containLabel: true },
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
        name: "新增成员",
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

function buildActivityTrendOption(): echarts.EChartsCoreOption {
  const labels = Array.from({ length: 14 }).map((_, idx) => {
    const d = daysAgo(13 - idx);
    return formatMonthDay(d);
  });

  const questions = [22, 26, 28, 30, 24, 31, 33, 29, 36, 40, 38, 34, 30, 27];
  const answers = [26, 24, 31, 34, 27, 35, 38, 33, 40, 45, 41, 39, 36, 30];

  return {
    grid: { left: 12, right: 12, top: 44, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis" },
    legend: {
      top: 8,
      left: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: colors.gray[600] }
    },
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
        name: "提问数",
        data: questions,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: colors.warning }
      },
      {
        type: "line",
        name: "解答数",
        data: answers,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: colors.success },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16,185,129,0.16)" },
              { offset: 1, color: "rgba(16,185,129,0.00)" }
            ]
          }
        }
      }
    ]
  };
}

function buildValueStructureOption(): echarts.EChartsCoreOption {
  const barCats = ["精华帖", "最佳答案", "高质量回复", "普通回复"];
  const barVals = [68, 142, 486, 1320];
  const contributor = Math.round(mock.contributorRate * 100);

  return {
    grid: [
      { left: 8, right: "52%", top: 44, bottom: 8, containLabel: true },
      { left: "56%", right: 8, top: 36, bottom: 8, containLabel: false }
    ],
    tooltip: { trigger: "item" },
    title: [
      {
        text: "内容价值结构",
        left: 0,
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 600, color: colors.gray[800] }
      }
    ],
    xAxis: [
      {
        gridIndex: 0,
        type: "value",
        axisLabel: { color: colors.gray[500] },
        splitLine: { lineStyle: { color: colors.gray[100] } }
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: "category",
        data: barCats,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: colors.gray[200] } },
        axisLabel: { color: colors.gray[600] }
      }
    ],
    series: [
      {
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: barVals,
        barWidth: 12,
        itemStyle: {
          borderRadius: [8, 8, 8, 8],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: colors.secondary },
              { offset: 1, color: colors.primary }
            ]
          }
        }
      },
      {
        type: "pie",
        radius: ["62%", "78%"],
        center: ["78%", "58%"],
        label: { show: false },
        data: [
          {
            name: "活跃贡献者",
            value: contributor,
            itemStyle: { color: colors.primary }
          },
          {
            name: "其他活跃",
            value: 100 - contributor,
            itemStyle: { color: colors.gray[200] }
          }
        ]
      },
      {
        type: "pie",
        radius: [0, 0],
        center: ["78%", "58%"],
        label: {
          show: true,
          position: "center",
          formatter: `{a|${contributor}%}\n{b|贡献者比例}`,
          rich: {
            a: { fontSize: 22, fontWeight: 700, color: colors.gray[900] },
            b: { fontSize: 12, color: colors.gray[500], padding: [6, 0, 0, 0] }
          }
        },
        data: [{ name: "", value: 1, itemStyle: { color: "transparent" } }]
      }
    ]
  };
}

function initCharts(): void {
  if (memberTrendRef.value) {
    safeDispose(memberTrendChart);
    memberTrendChart = echarts.init(memberTrendRef.value);
    memberTrendChart.setOption(buildMemberTrendOption(), true);
  }

  if (activityTrendRef.value) {
    safeDispose(activityTrendChart);
    activityTrendChart = echarts.init(activityTrendRef.value);
    activityTrendChart.setOption(buildActivityTrendOption(), true);
  }

  if (valueStructureRef.value) {
    safeDispose(valueStructureChart);
    valueStructureChart = echarts.init(valueStructureRef.value);
    valueStructureChart.setOption(buildValueStructureOption(), true);
  }
}

function resizeAll(): void {
  memberTrendChart?.resize();
  activityTrendChart?.resize();
  valueStructureChart?.resize();
}

onMounted(() => {
  initCharts();
});

useResizeObserver(memberTrendRef, () => resizeAll());
useResizeObserver(activityTrendRef, () => resizeAll());
useResizeObserver(valueStructureRef, () => resizeAll());

onBeforeUnmount(() => {
  safeDispose(memberTrendChart);
  safeDispose(activityTrendChart);
  safeDispose(valueStructureChart);
  memberTrendChart = null;
  activityTrendChart = null;
  valueStructureChart = null;
});

const solveTrack = computed(() => {
  const solved = Math.round(1200 * mock.solveRate);
  const total = 1200;
  return {
    unresolved: mock.unresolvedCount,
    avgSolveHours: mock.avgSolveHours,
    solved,
    total,
    percent: Math.round((solved / total) * 100)
  };
});

const firstContributionText = computed((): string => {
  return `${mock.firstContributionAvgDays.toFixed(1)} 天`;
});
</script>

<template>
  <div class="welcome-page">
    <div class="mb-4 flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="text-[20px] font-semibold leading-[28px] text-gray-900">
          社区核心仪表盘
        </div>
        <div class="mt-1 text-[14px] leading-[20px] text-gray-500">
          规模指标 + 价值指标，展示热闹与门道
        </div>
      </div>
      <div class="shrink-0">
        <el-tag type="info" effect="plain">模拟数据</el-tag>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <el-card
        v-for="m in headerMetrics"
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
              class="mt-2 text-[28px] font-semibold leading-[36px] text-gray-900"
            >
              {{ m.value }}
            </div>
          </div>
          <div class="shrink-0">
            <div
              class="rounded-full bg-gray-50 px-3 py-1 text-[12px] leading-[16px] text-gray-600"
            >
              {{ m.helper }}
            </div>
          </div>
        </div>
        <div v-if="m.delta" class="mt-3 flex items-center justify-between">
          <div class="text-[12px] leading-[16px] text-gray-500">
            {{ m.delta.label }}
          </div>
          <div class="text-[12px] font-medium leading-[16px] text-gray-900">
            {{ m.delta.value }}
          </div>
        </div>
      </el-card>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <el-card shadow="never" class="chart-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-gray-900">
            新成员增长趋势（周）
          </div>
          <div class="text-[12px] text-gray-500">近 12 周</div>
        </div>
        <div ref="memberTrendRef" class="chart h-[280px]" />
      </el-card>

      <el-card shadow="never" class="chart-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-gray-900">
            活跃互动趋势（提问 vs 解答）
          </div>
          <div class="text-[12px] text-gray-500">近 14 天</div>
        </div>
        <div ref="activityTrendRef" class="chart h-[280px]" />
      </el-card>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <el-card shadow="never" class="value-card xl:col-span-1">
        <div class="text-[14px] font-semibold text-gray-900">问题解决追踪</div>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-lg bg-gray-50 p-3">
            <div class="text-[12px] leading-[16px] text-gray-500">待解决</div>
            <div class="mt-2 text-[18px] font-semibold text-gray-900">
              {{ solveTrack.unresolved }}
            </div>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <div class="text-[12px] leading-[16px] text-gray-500">
              平均解决时间
            </div>
            <div class="mt-2 text-[18px] font-semibold text-gray-900">
              {{ solveTrack.avgSolveHours.toFixed(1) }} 小时
            </div>
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between">
            <div class="text-[12px] leading-[16px] text-gray-500">解决率</div>
            <div class="text-[12px] font-medium leading-[16px] text-gray-900">
              {{ solveTrack.percent }}%
            </div>
          </div>
          <el-progress :percentage="solveTrack.percent" :stroke-width="10" />
        </div>

        <div class="mt-4 rounded-lg bg-gray-50 p-3">
          <div class="text-[12px] leading-[16px] text-gray-500">
            新成员首次贡献时间
          </div>
          <div class="mt-2 text-[18px] font-semibold text-gray-900">
            {{ firstContributionText }}
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="value-card xl:col-span-2">
        <div ref="valueStructureRef" class="chart h-[340px]" />
      </el-card>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <el-card shadow="never" class="list-card">
        <div class="text-[14px] font-semibold text-gray-900">本周专家榜</div>
        <div class="mt-3 space-y-3">
          <div
            v-for="(p, idx) in mock.topExperts"
            :key="p.name"
            class="flex items-center justify-between"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[12px] font-semibold text-gray-700"
              >
                {{ idx + 1 }}
              </div>
              <div class="truncate text-[13px] text-gray-800">
                {{ p.name }}
              </div>
            </div>
            <div class="text-[12px] font-medium text-gray-900">
              {{ p.score }}
            </div>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="list-card">
        <div class="text-[14px] font-semibold text-gray-900">热门知识标签</div>
        <div class="mt-3 flex flex-wrap gap-2">
          <el-tag
            v-for="t in mock.hotTags"
            :key="t.name"
            effect="plain"
            class="tag-item"
          >
            {{ t.name }} · {{ t.heat }}
          </el-tag>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.metric-card :deep(.el-card__body),
.chart-card :deep(.el-card__body),
.value-card :deep(.el-card__body),
.list-card :deep(.el-card__body) {
  padding: 16px;
}

.metric-card {
  border-color: #f0f2f5;
  border-radius: 12px;
}

.chart-card,
.value-card,
.list-card {
  border-color: #f0f2f5;
  border-radius: 12px;
}

.chart {
  width: 100%;
}

.tag-item {
  border-radius: 9999px;
}
</style>
