<script setup lang="ts">
import echarts from "@/plugins/echarts";
import { useResizeObserver } from "@pureadmin/utils";
import {
  getDashboardHome,
  type DashboardCard,
  type DashboardHomeResult
} from "@/api/dashboard";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";

import InformationLine from "~icons/ri/information-line";

defineOptions({
  name: "Welcome"
});

const panelToggleIcons = {
  userQa: "ri/question-answer-line",
  articleBill: "ri/shopping-bag-3-line"
} as const;

const metricIconKeys = {
  goodThing: "ri/shopping-bag-3-line",
  accounting: "ri/bill-line",
  article: "ri/article-line"
} as const;

type Metric = {
  key: string;
  label: string;
  value: string;
  helper?: string;
  delta?: { label: string; value: string };
};

type CardAccent = "primary" | "success" | "warning" | "danger" | "info";

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

function formatMonthDay(ymd: string): string {
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

function formatAmount(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCount(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString();
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSeriesDataItem(value: unknown): unknown {
  const n = normalizeNumberLike(value);
  if (n != null) return n;
  if (value == null) return null;
  if (typeof value === "object") return value;
  return null;
}

function normalizeAxisSeries(seriesList: unknown[]): Record<string, unknown>[] {
  return seriesList
    .map(v => toRecord(v))
    .filter((v): v is Record<string, unknown> => !!v)
    .map(series => {
      const normalizedType =
        typeof series.type === "string" && series.type.trim()
          ? series.type
          : "line";
      const rawData = series.data;
      const data = Array.isArray(rawData)
        ? rawData.map(normalizeSeriesDataItem)
        : rawData == null
          ? []
          : [normalizeSeriesDataItem(rawData)];

      return {
        ...series,
        type: normalizedType,
        data
      };
    });
}

function normalizeEchartsOptionKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeEchartsOptionKeys);
  const record = toRecord(value);
  if (!record) return value;

  const keyMap: Record<string, string> = {
    xaxis: "xAxis",
    yaxis: "yAxis"
  };

  const normalized: Record<string, unknown> = {};
  for (const [rawKey, rawVal] of Object.entries(record)) {
    const mappedKey = keyMap[rawKey] ?? rawKey;
    if (
      mappedKey !== rawKey &&
      Object.prototype.hasOwnProperty.call(record, mappedKey)
    ) {
      if (!Object.prototype.hasOwnProperty.call(normalized, mappedKey)) {
        normalized[mappedKey] = normalizeEchartsOptionKeys(record[mappedKey]);
      }
      continue;
    }
    normalized[mappedKey] = normalizeEchartsOptionKeys(rawVal);
  }
  return normalized;
}

function normalizeEchartsOption(
  value: unknown
): Record<string, unknown> | null {
  const record = toRecord(value);
  if (!record) return null;
  const normalized = normalizeEchartsOptionKeys(record);
  return toRecord(normalized);
}

function normalizeOptionSeries(
  option: Record<string, unknown>
): Record<string, unknown> {
  const normalizedOption = normalizeEchartsOption(option) ?? option;
  const rawSeries = normalizedOption.series;
  if (!rawSeries) return option;

  const list = Array.isArray(rawSeries) ? rawSeries : [rawSeries];
  const normalized = normalizeAxisSeries(list);
  return {
    ...normalizedOption,
    series: Array.isArray(rawSeries) ? normalized : (normalized[0] ?? rawSeries)
  };
}

function getOption(value: unknown): Record<string, unknown> | null {
  const record = toRecord(value);
  if (!record) return null;
  const option = record.option;
  return toRecord(option);
}

function pickString(value: unknown, keys: string[]): string | null {
  const record = toRecord(value);
  if (!record) return null;
  for (const k of keys) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function extractArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = toRecord(value);
  if (!record) return [];
  const list = record.list;
  if (Array.isArray(list)) return list;
  const items = record.items;
  if (Array.isArray(items)) return items;
  return [];
}

const dashboard = ref<DashboardHomeResult | null>(null);
const dashboardLoading = ref(false);

type WelcomePanel = "userQa" | "articleBill";

const activePanel = ref<WelcomePanel>("userQa");

function setActivePanel(panel: WelcomePanel): void {
  activePanel.value = panel;
}

const contentValueExplainText = computed((): string => {
  return (
    pickString(dashboard.value?.charts?.contentValueStructure, [
      "explain",
      "description",
      "desc",
      "note",
      "remark",
      "tips"
    ]) ?? ""
  ).trim();
});

async function fetchDashboard(): Promise<void> {
  dashboardLoading.value = true;
  try {
    dashboard.value = await getDashboardHome({
      rangeType: "14d",
      includeLists: true,
      listSize: 10
    });
    queueUpdateCharts();
  } catch {
    dashboard.value = null;
    queueUpdateCharts();
  } finally {
    dashboardLoading.value = false;
  }
}

function formatCardValue(card: DashboardCard): string {
  const raw = card?.value;
  if (typeof raw !== "number" || Number.isNaN(raw)) return "-";
  const unit = typeof card?.unit === "string" ? card.unit : "";
  if (unit.includes("元") || unit.includes("￥") || unit.includes("¥")) {
    return formatAmount(raw);
  }
  return formatCount(raw);
}

function mapCardsToMetrics(cards: DashboardCard[]): Metric[] {
  return cards.map(card => ({
    key: card.key,
    label: card.title,
    value: formatCardValue(card),
    helper: card.unit
  }));
}

function uniqCardsByKey(cards: DashboardCard[]): DashboardCard[] {
  const map = new Map<string, DashboardCard>();
  for (const card of cards) {
    if (!card || typeof card.key !== "string" || !card.key.trim()) continue;
    if (!map.has(card.key)) map.set(card.key, card);
  }
  return Array.from(map.values());
}

function matchesAny(text: string, fragments: string[]): boolean {
  for (const frag of fragments) {
    if (!frag) continue;
    if (text.includes(frag)) return true;
  }
  return false;
}

const articleBillExcludedTitleFragments = ["内容解决率", "热帖程度"] as const;

function isExcludedForArticleBillCard(card: DashboardCard): boolean {
  const title = typeof card.title === "string" ? card.title : "";
  return matchesAny(title, [...articleBillExcludedTitleFragments]);
}

function isUserQaCard(card: DashboardCard): boolean {
  const key = typeof card.key === "string" ? card.key.toLowerCase() : "";
  const title = typeof card.title === "string" ? card.title : "";
  return (
    key.includes("member") ||
    key.includes("qa") ||
    matchesAny(title, ["成员", "问答", "提问", "解答", "互动", "解决", "参与"])
  );
}

function isArticleCard(card: DashboardCard): boolean {
  const key = typeof card.key === "string" ? card.key.toLowerCase() : "";
  const title = typeof card.title === "string" ? card.title : "";
  return (
    key.includes("article") ||
    key.includes("content") ||
    matchesAny(title, ["文章", "热帖", "帖子", "内容"])
  );
}

function isGoodThingCard(card: DashboardCard): boolean {
  const key = typeof card.key === "string" ? card.key.toLowerCase() : "";
  const title = typeof card.title === "string" ? card.title : "";
  return key.includes("goodthing") || matchesAny(title, ["好物"]);
}

function isAccountingCard(card: DashboardCard): boolean {
  const key = typeof card.key === "string" ? card.key.toLowerCase() : "";
  const title = typeof card.title === "string" ? card.title : "";
  return (
    key.includes("accounting") ||
    key.includes("cashflow") ||
    matchesAny(title, ["记账", "账单", "收入", "支出", "净额"])
  );
}

const baseCards = computed((): DashboardCard[] => {
  return Array.isArray(dashboard.value?.cards) ? dashboard.value!.cards : [];
});

const accountingCards = computed((): DashboardCard[] => {
  const cards = dashboard.value?.accounting?.cards;
  return Array.isArray(cards) ? cards : [];
});

const goodThingCards = computed((): DashboardCard[] => {
  return baseCards.value.filter(isGoodThingCard);
});

const userQaCards = computed((): DashboardCard[] => {
  const matched = baseCards.value.filter(isUserQaCard);
  return matched.length ? matched : baseCards.value;
});

const articleCards = computed((): DashboardCard[] => {
  return baseCards.value.filter(isArticleCard);
});

function getArticleBillCardSortScore(card: DashboardCard): number {
  const key = typeof card.key === "string" ? card.key.toLowerCase() : "";
  const title = typeof card.title === "string" ? card.title : "";

  if (key.includes("goodthingtotal") || title.includes("好物总")) return 10;
  if (key.includes("goodthingbought") || title.includes("买过")) return 11;
  if (key.includes("goodthingself") || title.includes("自出")) return 12;
  if (key.includes("goodthing")) return 19;

  if (matchesAny(title, ["收入"])) return 20;
  if (matchesAny(title, ["支出"])) return 21;
  if (matchesAny(title, ["净额", "结余"])) return 22;
  if (isAccountingCard(card)) return 29;

  if (matchesAny(title, ["文章总", "文章数", "发帖"])) return 30;
  if (matchesAny(title, ["热帖"])) return 31;
  if (matchesAny(title, ["帖子"])) return 32;
  if (isArticleCard(card)) return 39;

  return 100;
}

const articleBillCards = computed((): DashboardCard[] => {
  const merged = uniqCardsByKey([
    ...articleCards.value,
    ...accountingCards.value,
    ...goodThingCards.value
  ]);
  const source = merged.length
    ? merged
    : uniqCardsByKey([
        ...baseCards.value,
        ...accountingCards.value,
        ...goodThingCards.value
      ]);
  const list = source.filter(card => !isExcludedForArticleBillCard(card));
  const scored = list.map((card, index) => ({
    card,
    index,
    score: getArticleBillCardSortScore(card)
  }));
  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.map(i => i.card);
});

const panelMetrics = computed((): Metric[] => {
  const cards =
    activePanel.value === "userQa" ? userQaCards.value : articleBillCards.value;
  return mapCardsToMetrics(cards);
});

function getMetricIcon(m: Metric): string | null {
  if (activePanel.value !== "articleBill") return null;

  const key = typeof m.key === "string" ? m.key.toLowerCase() : "";
  const label = typeof m.label === "string" ? m.label : "";

  if (key.includes("goodthing") || label.includes("好物"))
    return metricIconKeys.goodThing;
  if (
    key.includes("accounting") ||
    key.includes("cashflow") ||
    label.includes("记账") ||
    label.includes("账单") ||
    label.includes("收入") ||
    label.includes("支出") ||
    label.includes("净额") ||
    label.includes("结余")
  ) {
    return metricIconKeys.accounting;
  }
  if (
    key.includes("article") ||
    key.includes("content") ||
    label.includes("文章") ||
    label.includes("热帖") ||
    label.includes("帖子")
  ) {
    return metricIconKeys.article;
  }
  return null;
}

const panelMetricsPrimary = computed((): Metric[] => {
  if (activePanel.value === "userQa") return panelMetrics.value.slice(0, 7);

  const pickedCards: DashboardCard[] = [];
  const pickedKeys = new Set<string>();

  function pickFrom(cards: DashboardCard[], limit: number): void {
    let picked = 0;
    for (const card of cards) {
      if (pickedCards.length >= 7) break;
      if (picked >= limit) break;
      const key = typeof card.key === "string" ? card.key : "";
      if (!key.trim()) continue;
      if (pickedKeys.has(key)) continue;
      pickedKeys.add(key);
      pickedCards.push(card);
      picked += 1;
    }
  }

  pickFrom(goodThingCards.value, 3);
  pickFrom(accountingCards.value, 2);
  pickFrom(articleCards.value, 2);

  for (const card of articleBillCards.value) {
    if (pickedCards.length >= 7) break;
    const key = typeof card.key === "string" ? card.key : "";
    if (!key.trim()) continue;
    if (pickedKeys.has(key)) continue;
    pickedKeys.add(key);
    pickedCards.push(card);
  }

  return mapCardsToMetrics(pickedCards).slice(0, 7);
});

const panelMetricAccentOffset = computed((): number => {
  return activePanel.value === "userQa" ? 0 : 2;
});

const accentOrder: ReadonlyArray<CardAccent> = [
  "primary",
  "success",
  "warning",
  "danger",
  "info"
];

function getAccentByIndex(index: number, offset = 0): CardAccent {
  const safeIndex = Math.max(0, Math.trunc(index));
  const safeOffset = Math.trunc(offset);
  const i = (safeIndex + safeOffset) % accentOrder.length;
  return accentOrder[i] ?? "primary";
}

function getCardAccentStyle(accent: CardAccent): Record<string, string> {
  return {
    "--card-accent": `var(--el-color-${accent})`,
    "--card-accent-light-3": `var(--el-color-${accent}-light-3)`,
    "--card-accent-light-7": `var(--el-color-${accent}-light-7)`,
    "--card-accent-light-8": `var(--el-color-${accent}-light-8)`,
    "--card-accent-light-9": `var(--el-color-${accent}-light-9)`
  };
}

function getMetricCardStyle(index: number, offset = 0): Record<string, string> {
  return getCardAccentStyle(getAccentByIndex(index, offset));
}

const memberTrendRef = ref<HTMLDivElement | null>(null);
const activityTrendRef = ref<HTMLDivElement | null>(null);
const valueStructureRef = ref<HTMLDivElement | null>(null);
const accountingSummaryRef = ref<HTMLDivElement | null>(null);
const goodThingPublishTypePieRef = ref<HTMLDivElement | null>(null);

let memberTrendChart: echarts.ECharts | null = null;
let activityTrendChart: echarts.ECharts | null = null;
let valueStructureChart: echarts.ECharts | null = null;
let accountingSummaryChart: echarts.ECharts | null = null;
let goodThingPublishTypePieChart: echarts.ECharts | null = null;

function safeDispose(chart: echarts.ECharts | null): void {
  if (!chart) return;
  chart.dispose();
}

function buildAxisSeriesOption(
  chartValue: unknown,
  config: {
    top?: number;
    showLegend?: boolean;
    tooltipTrigger?: "axis" | "item";
  } = {}
): echarts.EChartsCoreOption {
  const option = getOption(chartValue);
  if (option) {
    const normalized = normalizeEchartsOption(option) ?? option;
    return normalizeOptionSeries(
      normalized
    ) as unknown as echarts.EChartsCoreOption;
  }

  const record = toRecord(chartValue);
  const normalizedRecord = normalizeEchartsOption(record) ?? record;
  const xAxisRaw = normalizedRecord?.xAxis;
  const seriesRaw = normalizedRecord?.series;
  const xAxisList = Array.isArray(xAxisRaw) ? xAxisRaw : [];
  const seriesList = Array.isArray(seriesRaw) ? seriesRaw : [];

  const hasFullOptionKey =
    !!normalizedRecord &&
    ("grid" in normalizedRecord ||
      "yAxis" in normalizedRecord ||
      "legend" in normalizedRecord ||
      "tooltip" in normalizedRecord ||
      "dataset" in normalizedRecord);
  if (hasFullOptionKey && normalizedRecord) {
    return normalizeOptionSeries(
      normalizedRecord
    ) as unknown as echarts.EChartsCoreOption;
  }

  const labels = xAxisList
    .map(v => (typeof v === "string" ? formatMonthDay(v) : String(v)))
    .filter(v => v.trim());
  const series = normalizeAxisSeries(seriesList);

  return {
    grid: {
      left: 12,
      right: 12,
      top: typeof config.top === "number" ? config.top : 44,
      bottom: 8,
      containLabel: true
    },
    tooltip: { trigger: config.tooltipTrigger ?? "axis" },
    legend: config.showLegend
      ? {
          top: 8,
          left: 0,
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: colors.gray[600] }
        }
      : undefined,
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
    series: series as unknown as echarts.EChartsCoreOption["series"]
  };
}

function buildMemberTrendOption(): echarts.EChartsCoreOption {
  return buildAxisSeriesOption(dashboard.value?.charts?.newMemberTrend, {
    top: 36,
    showLegend: false,
    tooltipTrigger: "axis"
  });
}

function buildActivityTrendOption(): echarts.EChartsCoreOption {
  return buildAxisSeriesOption(dashboard.value?.charts?.interactionTrend, {
    top: 44,
    showLegend: true,
    tooltipTrigger: "axis"
  });
}

function buildAccountingSummaryOption(): echarts.EChartsCoreOption {
  return buildAxisSeriesOption(dashboard.value?.charts?.accountingSummary, {
    top: 44,
    showLegend: false,
    tooltipTrigger: "axis"
  });
}

function buildPieOption(chartValue: unknown): echarts.EChartsCoreOption {
  const option = getOption(chartValue);
  if (option) {
    const normalized = normalizeEchartsOption(option) ?? option;
    return normalizeOptionSeries(
      normalized
    ) as unknown as echarts.EChartsCoreOption;
  }

  const record = toRecord(chartValue);
  const normalizedRecord = normalizeEchartsOption(record) ?? record;
  const hasFullOptionKey =
    !!normalizedRecord &&
    ("grid" in normalizedRecord ||
      "yAxis" in normalizedRecord ||
      "legend" in normalizedRecord ||
      "tooltip" in normalizedRecord ||
      "dataset" in normalizedRecord ||
      "series" in normalizedRecord);
  if (hasFullOptionKey && normalizedRecord) {
    return normalizeOptionSeries(
      normalizedRecord
    ) as unknown as echarts.EChartsCoreOption;
  }

  const extracted = extractContentValuePairs(chartValue);
  if (!extracted || !extracted.categories.length) {
    return { series: [] } as unknown as echarts.EChartsCoreOption;
  }

  return {
    tooltip: { trigger: "item" },
    legend: {
      top: 8,
      left: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: colors.gray[600] }
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        center: ["50%", "58%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: extracted.categories.map((name, i) => ({
          name,
          value: extracted.values[i] ?? 0
        }))
      }
    ]
  } as unknown as echarts.EChartsCoreOption;
}

function buildGoodThingPublishTypePieOption(): echarts.EChartsCoreOption {
  return buildPieOption(dashboard.value?.charts?.goodThingPublishTypePie);
}

function hasRenderableSeries(chartValue: unknown): boolean {
  const option = getOption(chartValue);
  const base = option ?? toRecord(chartValue);
  if (!base) return false;
  const normalized = normalizeEchartsOption(base) ?? base;
  const series = normalized.series;
  if (Array.isArray(series)) return series.length > 0;
  if (series && typeof series === "object") return true;
  return false;
}

const hasAccountingSummarySeries = computed((): boolean => {
  return hasRenderableSeries(dashboard.value?.charts?.accountingSummary);
});

const hasGoodThingPublishTypePieSeries = computed((): boolean => {
  return hasRenderableSeries(dashboard.value?.charts?.goodThingPublishTypePie);
});

const accountingSummaryTitle = computed((): string => {
  return (
    pickString(dashboard.value?.charts?.accountingSummary, ["title"]) ??
    "记账汇总（收入 / 支出 / 净额）"
  );
});

const goodThingPublishTypePieTitle = computed((): string => {
  return (
    pickString(dashboard.value?.charts?.goodThingPublishTypePie, ["title"]) ??
    "好物类型关系（买过 vs 自出）"
  );
});

function extractContentValuePairs(
  chartValue: unknown
): { categories: string[]; values: number[] } | null {
  const record = toRecord(chartValue);
  if (!record) return null;

  const rawCategories = record.categories;
  const rawValues = record.values;

  if (Array.isArray(rawCategories) && Array.isArray(rawValues)) {
    const categories = rawCategories
      .map(v => (typeof v === "string" ? v : v == null ? "" : String(v)))
      .map(v => v.trim())
      .filter(v => v.length > 0);

    const values = rawValues
      .map(v => normalizeNumberLike(v) ?? 0)
      .map(v => (Number.isFinite(v) ? v : 0));

    const len = Math.min(categories.length, values.length);
    return {
      categories: categories.slice(0, len),
      values: values.slice(0, len)
    };
  }

  const candidates: unknown[] = [];
  for (const key of ["items", "list", "data"]) {
    const raw = record[key];
    if (Array.isArray(raw)) {
      candidates.push(...raw);
      break;
    }
  }

  if (!candidates.length) return null;

  const pairs = candidates
    .map(item => {
      const label = pickString(item, [
        "label",
        "name",
        "title",
        "category",
        "key"
      ]);
      const itemRecord = toRecord(item);
      const rawValue = itemRecord
        ? (itemRecord.value ??
          itemRecord.count ??
          itemRecord.metric ??
          itemRecord.num ??
          itemRecord.total)
        : null;
      const value = normalizeNumberLike(rawValue) ?? 0;
      if (!label) return null;
      return { label, value: Number.isFinite(value) ? value : 0 };
    })
    .filter((v): v is { label: string; value: number } => !!v);

  if (!pairs.length) return null;

  return {
    categories: pairs.map(v => v.label),
    values: pairs.map(v => v.value)
  };
}

function buildContentValueStructureOption(
  chartValue: unknown
): echarts.EChartsCoreOption {
  const option = getOption(chartValue);
  if (option) {
    return normalizeOptionSeries(
      option
    ) as unknown as echarts.EChartsCoreOption;
  }

  const record = toRecord(chartValue);
  const hasFullOptionKey =
    !!record &&
    ("grid" in record ||
      "yAxis" in record ||
      "legend" in record ||
      "tooltip" in record ||
      "dataset" in record);
  if (hasFullOptionKey && record) {
    return normalizeOptionSeries(
      record
    ) as unknown as echarts.EChartsCoreOption;
  }

  const extracted = extractContentValuePairs(chartValue);
  if (!extracted || !extracted.categories.length) {
    return {
      grid: {
        left: 12,
        right: 12,
        top: 44,
        bottom: 8,
        containLabel: true
      },
      xAxis: { type: "category", data: [] },
      yAxis: { type: "value" },
      series: []
    };
  }

  return {
    grid: {
      left: 12,
      right: 12,
      top: 44,
      bottom: 8,
      containLabel: true
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" }
    },
    xAxis: {
      type: "category",
      data: extracted.categories,
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
        data: extracted.values,
        barWidth: 22,
        itemStyle: {
          color: colors.success
        }
      }
    ]
  } as unknown as echarts.EChartsCoreOption;
}

function buildValueStructureOption(): echarts.EChartsCoreOption {
  return buildContentValueStructureOption(
    dashboard.value?.charts?.contentValueStructure
  );
}

function initCharts(): void {
  if (memberTrendRef.value) {
    safeDispose(memberTrendChart);
    memberTrendChart = echarts.init(memberTrendRef.value);
  }

  if (activityTrendRef.value) {
    safeDispose(activityTrendChart);
    activityTrendChart = echarts.init(activityTrendRef.value);
  }

  if (valueStructureRef.value) {
    safeDispose(valueStructureChart);
    valueStructureChart = echarts.init(valueStructureRef.value);
  }

  if (accountingSummaryRef.value) {
    safeDispose(accountingSummaryChart);
    accountingSummaryChart = echarts.init(accountingSummaryRef.value);
  }

  if (goodThingPublishTypePieRef.value) {
    safeDispose(goodThingPublishTypePieChart);
    goodThingPublishTypePieChart = echarts.init(
      goodThingPublishTypePieRef.value
    );
  }
}

function updateCharts(): void {
  if (memberTrendChart) {
    memberTrendChart.setOption(buildMemberTrendOption(), {
      notMerge: true,
      lazyUpdate: true
    });
  }
  if (activityTrendChart) {
    activityTrendChart.setOption(buildActivityTrendOption(), {
      notMerge: true,
      lazyUpdate: true
    });
  }
  if (valueStructureChart) {
    valueStructureChart.setOption(buildValueStructureOption(), {
      notMerge: true,
      lazyUpdate: true
    });
  }
  if (accountingSummaryChart) {
    accountingSummaryChart.setOption(buildAccountingSummaryOption(), {
      notMerge: true,
      lazyUpdate: true
    });
  }
  if (goodThingPublishTypePieChart) {
    goodThingPublishTypePieChart.setOption(
      buildGoodThingPublishTypePieOption(),
      {
        notMerge: true,
        lazyUpdate: true
      }
    );
  }
}

let pendingUpdateChartsRaf = 0;

function queueUpdateCharts(): void {
  if (pendingUpdateChartsRaf) {
    cancelAnimationFrame(pendingUpdateChartsRaf);
  }

  pendingUpdateChartsRaf = requestAnimationFrame(() => {
    pendingUpdateChartsRaf = 0;
    updateCharts();
  });
}

function resizeAll(): void {
  memberTrendChart?.resize();
  activityTrendChart?.resize();
  valueStructureChart?.resize();
  accountingSummaryChart?.resize();
  goodThingPublishTypePieChart?.resize();
}

watch(
  () => activePanel.value,
  async () => {
    await nextTick();
    resizeAll();
    queueUpdateCharts();
  }
);

onMounted(() => {
  initCharts();
  queueUpdateCharts();
  fetchDashboard();
});

useResizeObserver(memberTrendRef, () => resizeAll());
useResizeObserver(activityTrendRef, () => resizeAll());
useResizeObserver(valueStructureRef, () => resizeAll());
useResizeObserver(accountingSummaryRef, () => resizeAll());
useResizeObserver(goodThingPublishTypePieRef, () => resizeAll());

onBeforeUnmount(() => {
  if (pendingUpdateChartsRaf) {
    cancelAnimationFrame(pendingUpdateChartsRaf);
    pendingUpdateChartsRaf = 0;
  }
  safeDispose(memberTrendChart);
  safeDispose(activityTrendChart);
  safeDispose(valueStructureChart);
  safeDispose(accountingSummaryChart);
  safeDispose(goodThingPublishTypePieChart);
  memberTrendChart = null;
  activityTrendChart = null;
  valueStructureChart = null;
  accountingSummaryChart = null;
  goodThingPublishTypePieChart = null;
});

const latestFeedbackItems = computed(() => {
  const items = extractArray(dashboard.value?.lists?.latestFeedback);
  return items
    .map(item => {
      const title =
        pickString(item, ["title", "content", "summary", "name"]) ?? "-";
      const secondary = pickString(item, ["createdAt", "updatedAt"]);
      return { title, secondary };
    })
    .slice(0, 10);
});

type HotContentItemView = {
  title: string;
  createdAt: string | null;
  metric: number;
};

const hotContentItems = computed((): HotContentItemView[] => {
  const items = extractArray(dashboard.value?.lists?.hotContent);
  return items
    .map(item => {
      const title = pickString(item, ["title", "name", "content"]) ?? "-";
      const createdAt = pickString(item, ["createdAt", "updatedAt"]);
      const record = toRecord(item);
      const metricRaw = record
        ? (record.metric ??
          record.value ??
          record.count ??
          record.score ??
          record.hot)
        : null;
      const metric = normalizeNumberLike(metricRaw) ?? 0;
      return {
        title,
        createdAt,
        metric: Number.isFinite(metric) ? metric : 0
      };
    })
    .slice(0, 10);
});

const maxHotContentMetric = computed((): number => {
  let max = 0;
  for (const item of hotContentItems.value) {
    if (item.metric > max) max = item.metric;
  }
  return max;
});
</script>

<template>
  <div class="welcome-page">
    <div class="mb-4 flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div
          class="text-[20px] font-semibold leading-[28px] text-[var(--el-text-color-primary)]"
        >
          社区核心仪表盘
        </div>
        <div
          class="mt-1 text-[14px] leading-[20px] text-[var(--el-text-color-secondary)]"
        >
          规模指标 + 价值指标，展示热闹与门道
        </div>
      </div>
      <div class="shrink-0 flex items-center gap-3">
        <div
          class="inline-flex items-center rounded-full border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-light)] p-1"
          role="group"
          aria-label="首页内容切换"
        >
          <button
            type="button"
            :aria-pressed="activePanel === 'userQa'"
            class="inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--el-color-primary)]"
            :class="
              activePanel === 'userQa'
                ? 'bg-[var(--el-color-primary)] text-white'
                : 'text-[var(--el-text-color-secondary)] hover:bg-[var(--el-fill-color)]'
            "
            @click="setActivePanel('userQa')"
          >
            <IconifyIconOffline
              :icon="panelToggleIcons.userQa"
              width="16px"
              height="16px"
            />
            用户·问答
          </button>
          <button
            type="button"
            :aria-pressed="activePanel === 'articleBill'"
            class="inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--el-color-primary)]"
            :class="
              activePanel === 'articleBill'
                ? 'bg-[var(--el-color-primary)] text-white'
                : 'text-[var(--el-text-color-secondary)] hover:bg-[var(--el-fill-color)]'
            "
            @click="setActivePanel('articleBill')"
          >
            <IconifyIconOffline
              :icon="panelToggleIcons.articleBill"
              width="16px"
              height="16px"
            />
            文章·账单·好物
          </button>
        </div>
        <el-tag type="info" effect="plain">
          {{ dashboardLoading ? "加载中" : dashboard ? "已加载" : "暂无数据" }}
        </el-tag>
      </div>
    </div>

    <div
      class="grid grid-cols-2 items-stretch justify-items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
    >
      <el-card
        v-for="(m, idx) in panelMetricsPrimary"
        :key="m.key"
        shadow="never"
        class="metric-card"
        :style="getMetricCardStyle(idx, panelMetricAccentOffset)"
      >
        <div
          class="relative w-full flex flex-col items-center justify-center text-center"
        >
          <div v-if="getMetricIcon(m)" class="absolute right-1.5 top-1.5">
            <div
              class="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-light)] text-[var(--el-text-color-secondary)]"
            >
              <IconifyIconOffline
                :icon="getMetricIcon(m)"
                width="14px"
                height="14px"
              />
            </div>
          </div>

          <div
            class="inline-flex items-baseline justify-center text-[20px] font-semibold leading-[26px] text-[var(--el-text-color-primary)]"
          >
            {{ m.value }}
            <span
              v-if="m.helper"
              class="ml-1 text-[12px] font-medium leading-[16px] text-[var(--el-text-color-secondary)]"
            >
              {{ m.helper }}
            </span>
          </div>

          <div
            class="mt-1 truncate text-[12px] leading-[16px] text-[var(--el-text-color-secondary)]"
          >
            {{ m.label }}
          </div>

          <div
            v-if="m.delta"
            class="mt-2 flex w-full items-center justify-between"
          >
            <div
              class="text-[11px] leading-[14px] text-[var(--el-text-color-secondary)]"
            >
              {{ m.delta.label }}
            </div>
            <div
              class="text-[11px] font-medium leading-[14px] text-[var(--el-text-color-primary)]"
            >
              {{ m.delta.value }}
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <div
      v-show="activePanel === 'userQa'"
      class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2"
    >
      <el-card
        shadow="never"
        class="chart-card"
        :style="getCardAccentStyle('info')"
      >
        <div class="flex items-center justify-between">
          <div
            class="text-[14px] font-semibold text-[var(--el-text-color-primary)]"
          >
            新成员增长趋势（周）
          </div>
          <div class="text-[12px] text-[var(--el-text-color-secondary)]">
            近 12 周
          </div>
        </div>
        <div ref="memberTrendRef" class="chart h-[clamp(200px,26vh,260px)]" />
      </el-card>

      <el-card
        shadow="never"
        class="chart-card"
        :style="getCardAccentStyle('warning')"
      >
        <div class="flex items-center justify-between">
          <div
            class="text-[14px] font-semibold text-[var(--el-text-color-primary)]"
          >
            活跃互动趋势（提问 vs 解答）
          </div>
          <div class="text-[12px] text-[var(--el-text-color-secondary)]">
            近 14 天
          </div>
        </div>
        <div ref="activityTrendRef" class="chart h-[clamp(200px,26vh,260px)]" />
      </el-card>

      <el-card
        shadow="never"
        class="list-card xl:col-span-2"
        :style="getCardAccentStyle('info')"
      >
        <div
          class="text-[14px] font-semibold text-[var(--el-text-color-primary)]"
        >
          最新反馈
        </div>
        <div
          class="mt-3 space-y-3 max-h-[clamp(200px,26vh,260px)] overflow-auto"
        >
          <div
            v-for="(p, idx) in latestFeedbackItems"
            :key="`${p.title}-${idx}`"
            class="flex items-center justify-between"
          >
            <div
              class="min-w-0 truncate text-[13px] text-[var(--el-text-color-regular)]"
            >
              {{ p.title }}
            </div>
            <div
              class="ml-3 shrink-0 text-[12px] text-[var(--el-text-color-secondary)]"
            >
              {{ p.secondary ?? "" }}
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <div v-show="activePanel === 'userQa'" class="mt-4">
      <el-card
        shadow="never"
        class="value-card"
        :style="getCardAccentStyle('primary')"
      >
        <div class="flex items-center justify-between gap-3">
          <div
            class="text-[14px] font-semibold text-[var(--el-text-color-primary)]"
          >
            内容价值结构
          </div>
          <el-popover
            v-if="contentValueExplainText"
            placement="bottom-end"
            trigger="click"
            width="420"
          >
            <template #reference>
              <button
                type="button"
                class="group inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-light)] px-2.5 text-[12px] font-medium text-[var(--el-text-color-secondary)] transition-colors hover:border-[var(--el-border-color)] hover:bg-[var(--el-fill-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--el-color-primary)]"
                aria-label="查看内容价值结构口径说明"
              >
                <span
                  class="text-[14px] leading-none text-[var(--el-text-color-secondary)]"
                >
                  <IconifyIconOffline :icon="InformationLine" />
                </span>
                <span class="leading-none">口径说明</span>
              </button>
            </template>

            <div class="max-h-[240px] overflow-auto">
              <div
                class="mb-2 text-[13px] font-semibold text-[var(--el-text-color-primary)]"
              >
                口径说明
              </div>
              <div
                class="whitespace-pre-wrap text-[12px] leading-[18px] text-[var(--el-text-color-regular)]"
              >
                {{ contentValueExplainText }}
              </div>
            </div>
          </el-popover>
        </div>
        <div
          ref="valueStructureRef"
          class="mt-3 chart h-[clamp(240px,34vh,360px)]"
        />
      </el-card>
    </div>

    <div
      v-show="activePanel === 'articleBill'"
      class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2"
    >
      <el-card
        shadow="never"
        class="chart-card"
        :style="getCardAccentStyle('warning')"
      >
        <div class="flex items-center justify-between">
          <div
            class="text-[14px] font-semibold text-[var(--el-text-color-primary)]"
          >
            {{ accountingSummaryTitle }}
          </div>
          <div class="text-[12px] text-[var(--el-text-color-secondary)]">
            {{
              dashboard?.accounting?.month
                ? `${dashboard.accounting.month} 月`
                : ""
            }}
          </div>
        </div>
        <div class="mt-3">
          <div
            v-show="hasAccountingSummarySeries"
            ref="accountingSummaryRef"
            class="chart h-[clamp(200px,26vh,260px)]"
          />
          <div
            v-show="!hasAccountingSummarySeries"
            class="chart h-[clamp(200px,26vh,260px)] flex items-center justify-center"
          >
            <el-empty description="暂无图表数据" />
          </div>
        </div>
      </el-card>

      <el-card
        shadow="never"
        class="chart-card"
        :style="getCardAccentStyle('info')"
      >
        <div class="flex items-center justify-between">
          <div
            class="text-[14px] font-semibold text-[var(--el-text-color-primary)]"
          >
            {{ goodThingPublishTypePieTitle }}
          </div>
          <div class="text-[12px] text-[var(--el-text-color-secondary)]">
            {{
              dashboard?.meta?.rangeStart
                ? `${dashboard.meta.rangeStart} ~ ${dashboard.meta.rangeEnd}`
                : ""
            }}
          </div>
        </div>
        <div class="mt-3">
          <div
            v-show="hasGoodThingPublishTypePieSeries"
            ref="goodThingPublishTypePieRef"
            class="chart h-[clamp(200px,26vh,260px)]"
          />
          <div
            v-show="!hasGoodThingPublishTypePieSeries"
            class="chart h-[clamp(200px,26vh,260px)] flex items-center justify-center"
          >
            <el-empty description="暂无图表数据" />
          </div>
        </div>
      </el-card>

      <el-card
        shadow="never"
        class="list-card xl:col-span-2"
        :style="getCardAccentStyle('primary')"
      >
        <div class="flex items-center justify-between">
          <div
            class="text-[14px] font-semibold text-[var(--el-text-color-primary)]"
          >
            热帖（文章）
          </div>
          <div class="text-[12px] text-[var(--el-text-color-secondary)]">
            {{
              dashboard?.meta?.rangeStart
                ? `${dashboard.meta.rangeStart} ~ ${dashboard.meta.rangeEnd}`
                : ""
            }}
          </div>
        </div>

        <div
          class="mt-3 space-y-3 max-h-[clamp(220px,28vh,300px)] overflow-auto"
        >
          <el-empty
            v-if="hotContentItems.length === 0"
            description="暂无热帖"
            :image-size="60"
          />
          <div
            v-for="(p, idx) in hotContentItems"
            v-else
            :key="`${p.title}-${idx}`"
            class="flex items-start justify-between gap-4"
          >
            <div class="min-w-0 flex-1">
              <div
                class="truncate text-[13px] font-medium text-[var(--el-text-color-regular)]"
              >
                {{ p.title }}
              </div>
              <div class="mt-2">
                <el-progress
                  :percentage="
                    maxHotContentMetric > 0
                      ? Math.round((p.metric / maxHotContentMetric) * 100)
                      : 0
                  "
                  :stroke-width="10"
                  :show-text="false"
                />
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                热度 {{ formatCount(p.metric) }}
              </div>
              <div
                class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]"
              >
                {{ p.createdAt ?? "" }}
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.metric-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: clamp(88px, 8vw, 108px);
  padding: 12px 10px 10px;
}

.chart-card :deep(.el-card__body),
.value-card :deep(.el-card__body),
.list-card :deep(.el-card__body) {
  padding: 16px;
}

.metric-card,
.chart-card,
.value-card,
.list-card {
  --card-accent: var(--el-color-primary);
  --card-accent-light-3: var(--el-color-primary-light-3);
  --card-accent-light-7: var(--el-color-primary-light-7);
  --card-accent-light-8: var(--el-color-primary-light-8);
  --card-accent-light-9: var(--el-color-primary-light-9);

  overflow: hidden;
  background: var(--el-card-bg-color);
  border-color: var(--pure-card-border-color, var(--pure-border-color));
  border-radius: 14px;
  box-shadow: var(--pure-card-shadow);
  transition:
    background-color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}

.metric-card::before,
.chart-card::before,
.value-card::before,
.list-card::before {
  display: block;
  height: 4px;
  content: "";
  background: linear-gradient(
    90deg,
    var(--card-accent) 0%,
    var(--card-accent-light-3) 60%,
    transparent 100%
  );
  opacity: 0.95;
}

.metric-card {
  width: 100%;
  max-width: 100%;
  background: linear-gradient(
    180deg,
    var(--el-fill-color-light) 0%,
    var(--el-card-bg-color) 72%
  );
}

.metric-card:active {
  transform: translateY(0);
}

.metric-card:hover,
.chart-card:hover,
.value-card:hover,
.list-card:hover {
  border-color: var(--card-accent-light-7);
  box-shadow: var(--pure-card-shadow-hover);
  transform: translateY(-1px);
}

.metric-card:hover {
  border-color: var(--card-accent-light-8);
  transform: translateY(-1px);
}

:global(html.dark) .metric-card,
:global(html.dark) .chart-card,
:global(html.dark) .value-card,
:global(html.dark) .list-card {
  box-shadow: none;
}

:global(html.dark) .metric-card::before,
:global(html.dark) .chart-card::before,
:global(html.dark) .value-card::before,
:global(html.dark) .list-card::before {
  opacity: 0.35;
}

:global(html.dark) .metric-card {
  background: var(--el-card-bg-color);
}

:global(html.dark) .metric-card:hover,
:global(html.dark) .chart-card:hover,
:global(html.dark) .value-card:hover,
:global(html.dark) .list-card:hover {
  border-color: var(--pure-border-color);
  box-shadow: none;
  transform: none;
}

.chart {
  width: 100%;
}
</style>
