import { http } from "@/utils/http";

export type DashboardRangeType = "custom" | "7d" | "14d" | "30d" | "12w";

export type DashboardGranularity = "day" | "week";

export type DashboardHomeParams = {
  rangeType?: Exclude<DashboardRangeType, "custom">;
  dateStart?: string;
  dateEnd?: string;
  granularity?: DashboardGranularity;
  timezone?: string;
  cashflowMonth?: string;
  includeLists?: boolean;
  listSize?: number;
};

export type DashboardMeta = {
  rangeType: DashboardRangeType;
  rangeStart: string;
  rangeEnd: string;
  granularity: DashboardGranularity;
  timezone: string;
  updatedAt: string;
};

export type DashboardCard = {
  key: string;
  title: string;
  value: number;
  unit?: string;
};

export type DashboardEChartSeries = {
  type: string;
  name?: string;
  data: unknown[];
  [key: string]: unknown;
};

export type DashboardChartAxisSeries = {
  xAxis?: string[];
  series?: DashboardEChartSeries[];
};

export type DashboardChartOption = {
  option?: Record<string, unknown>;
};

export type DashboardContentValueStructure = {
  option?: Record<string, unknown>;

  explain?: string;
  categories?: unknown[];
  values?: unknown[];

  items?: unknown[];
  list?: unknown[];
  data?: unknown[];
} & Record<string, unknown>;

export type DashboardChart =
  | (DashboardChartAxisSeries & DashboardChartOption)
  | DashboardChartAxisSeries
  | DashboardChartOption
  | Record<string, unknown>;

export type DashboardHotContentItem = {
  title: string;
  createdAt: string | null;
  metric: number;
};

export type DashboardLatestFeedbackItem = {
  title: string;
  content: string;
  summary: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DashboardList<T> = {
  list: T[];
};

export type DashboardTrackingIssue = {
  pendingCount?: number;
  avgResolveHours?: number;
  resolveRate?: number;
};

export type DashboardHomeResult = {
  meta: DashboardMeta;
  cards: DashboardCard[];
  accounting?: {
    month?: string;
    cards?: DashboardCard[];
  };
  charts?: {
    newMemberTrend?: DashboardChart;
    interactionTrend?: DashboardChart;
    contentValueStructure?:
      | DashboardContentValueStructure
      | Record<string, unknown>;
    contributionPie?: DashboardChart;
    goodThingPublishTypePie?: DashboardChart;
    accountingSummary?: DashboardChart;
    [key: string]: unknown;
  };
  tracking?: {
    issue?: DashboardTrackingIssue;
    firstContributionAvgDays?: number;
    [key: string]: unknown;
  };
  lists?: {
    hotContent?:
      | DashboardList<DashboardHotContentItem>
      | Record<string, unknown>;
    latestFeedback?:
      | DashboardList<DashboardLatestFeedbackItem>
      | Record<string, unknown>;
    [key: string]: unknown;
  };
};

export const getDashboardHome = (data: DashboardHomeParams = {}) => {
  return http.request<DashboardHomeResult>("post", "/dashboards/home", {
    data
  });
};
