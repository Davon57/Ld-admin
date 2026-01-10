import { defineFakeRoute } from "vite-plugin-fake-server/client";

type Status = 0 | 1;

type EmptyData = Record<string, never>;

type BaseResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type PageResult<T> = {
  list: T[];
  total: number;
};

type ActivityItem = {
  id: number;
  name: string;
  description: string;
  status: Status;
  startAt: string;
  endAt: string;
  createdAt: string;
};

type ActivityListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function matchKeyword(texts: string[], keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k) return true;
  return texts.some(t => t.toLowerCase().includes(k));
}

function isValidDateTime(v: string): boolean {
  const t = Date.parse(v.replace(/-/g, "/"));
  return Number.isFinite(t);
}

function toTs(v: string): number {
  return Date.parse(v.replace(/-/g, "/"));
}

const now = Date.now();

const initialActivities: ActivityItem[] = [
  {
    id: 1,
    name: "新手福利活动",
    description: "新用户注册后 7 天内可参与，完成任务领取奖励。",
    status: 1,
    startAt: formatDateTime(new Date(now - 2 * 864e5)),
    endAt: formatDateTime(new Date(now + 5 * 864e5)),
    createdAt: formatDateTime(new Date(now - 3 * 864e5))
  },
  {
    id: 2,
    name: "节日限时活动",
    description: "节日期间限时开放，参与抽奖赢好礼。",
    status: 1,
    startAt: formatDateTime(new Date(now + 1 * 864e5)),
    endAt: formatDateTime(new Date(now + 3 * 864e5)),
    createdAt: formatDateTime(new Date(now - 2 * 864e5))
  },
  {
    id: 3,
    name: "运营活动（草稿）",
    description: "该活动处于草稿状态，仅用于演示。",
    status: 0,
    startAt: formatDateTime(new Date(now + 7 * 864e5)),
    endAt: formatDateTime(new Date(now + 10 * 864e5)),
    createdAt: formatDateTime(new Date(now - 1 * 864e5))
  }
];

let activities: ActivityItem[] = [...initialActivities];
let nextActivityId = activities.reduce((max, n) => Math.max(max, n.id), 0) + 1;

export default defineFakeRoute([
  {
    url: "/activity/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<ActivityItem>> => {
      const params = body as ActivityListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;

      const filtered = activities
        .filter(a => matchKeyword([a.name, a.description], keyword))
        .filter(a => (typeof status === "number" ? a.status === status : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return { success: true, data: { list, total } };
    }
  },
  {
    url: "/activity/create",
    method: "post",
    response: ({ body }): BaseResult<ActivityItem | EmptyData> => {
      const payload = body as Partial<ActivityItem>;
      const name = String(payload?.name || "").trim();
      if (!name)
        return { success: false, data: {}, message: "活动名称不能为空" };
      const description = String(payload?.description || "").trim();
      if (!description)
        return { success: false, data: {}, message: "活动描述不能为空" };

      const startAt = String(payload?.startAt || "").trim();
      const endAt = String(payload?.endAt || "").trim();
      if (!startAt || !endAt)
        return { success: false, data: {}, message: "活动时间不能为空" };
      if (!isValidDateTime(startAt) || !isValidDateTime(endAt)) {
        return { success: false, data: {}, message: "活动时间格式不正确" };
      }
      if (toTs(startAt) > toTs(endAt)) {
        return {
          success: false,
          data: {},
          message: "开始时间不能晚于结束时间"
        };
      }

      const status = (payload?.status ?? 1) as Status;
      const activity: ActivityItem = {
        id: nextActivityId++,
        name,
        description,
        status,
        startAt,
        endAt,
        createdAt: formatDateTime(new Date())
      };
      activities = [activity, ...activities];
      return { success: true, data: activity };
    }
  },
  {
    url: "/activity/update",
    method: "post",
    response: ({ body }): BaseResult<ActivityItem | EmptyData> => {
      const payload = body as Partial<ActivityItem> & { id: number };
      const id = Number(payload?.id);
      const index = activities.findIndex(a => a.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "活动不存在" };

      const current = activities[index];
      const name =
        typeof payload.name === "string" ? payload.name.trim() : current.name;
      const description =
        typeof payload.description === "string"
          ? payload.description.trim()
          : current.description;
      const startAt =
        typeof payload.startAt === "string"
          ? payload.startAt.trim()
          : current.startAt;
      const endAt =
        typeof payload.endAt === "string"
          ? payload.endAt.trim()
          : current.endAt;
      const status = (payload.status ?? current.status) as Status;

      if (!name)
        return { success: false, data: {}, message: "活动名称不能为空" };
      if (!description)
        return { success: false, data: {}, message: "活动描述不能为空" };
      if (!startAt || !endAt)
        return { success: false, data: {}, message: "活动时间不能为空" };
      if (!isValidDateTime(startAt) || !isValidDateTime(endAt)) {
        return { success: false, data: {}, message: "活动时间格式不正确" };
      }
      if (toTs(startAt) > toTs(endAt)) {
        return {
          success: false,
          data: {},
          message: "开始时间不能晚于结束时间"
        };
      }

      const updated: ActivityItem = {
        ...current,
        name,
        description,
        status,
        startAt,
        endAt
      };
      activities = activities.map(a => (a.id === id ? updated : a));
      return { success: true, data: updated };
    }
  },
  {
    url: "/activity/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = activities.some(a => a.id === id);
      if (!exists) return { success: false, data: {}, message: "活动不存在" };

      activities = activities.filter(a => a.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/activity/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };

      activities = activities.filter(a => !ids.includes(a.id));
      return { success: true, data: {} };
    }
  }
]);
