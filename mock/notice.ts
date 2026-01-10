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

type NoticeItem = {
  id: number;
  title: string;
  content: string;
  status: Status;
  createdAt: string;
};

type NoticeListParams = {
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

const initialNotices: NoticeItem[] = [
  {
    id: 1,
    title: "系统升级通知",
    content: "今晚 23:00-24:00 进行系统升级维护，期间可能无法访问。",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 864e5))
  },
  {
    id: 2,
    title: "新功能上线：文章分类",
    content: "文章模块新增分类管理，支持增删改查与筛选。",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 2 * 864e5))
  },
  {
    id: 3,
    title: "安全提醒",
    content: "请勿将账号密码泄露给他人，定期更新密码并开启双因素验证。",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 3 * 864e5))
  },
  {
    id: 4,
    title: "运营公告（草稿）",
    content: "本条公告为草稿状态，仅用于演示。",
    status: 0,
    createdAt: formatDateTime(new Date(Date.now() - 4 * 864e5))
  }
];

let notices: NoticeItem[] = [...initialNotices];
let nextNoticeId = notices.reduce((max, n) => Math.max(max, n.id), 0) + 1;

export default defineFakeRoute([
  {
    url: "/notice/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<NoticeItem>> => {
      const params = body as NoticeListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;

      const filtered = notices
        .filter(n => matchKeyword([n.title, n.content], keyword))
        .filter(n => (typeof status === "number" ? n.status === status : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return { success: true, data: { list, total } };
    }
  },
  {
    url: "/notice/create",
    method: "post",
    response: ({ body }): BaseResult<NoticeItem | EmptyData> => {
      const payload = body as Partial<NoticeItem>;
      const title = String(payload?.title || "").trim();
      if (!title) return { success: false, data: {}, message: "标题不能为空" };
      const content = String(payload?.content || "").trim();
      if (!content)
        return { success: false, data: {}, message: "内容不能为空" };

      const status = (payload?.status ?? 1) as Status;
      const notice: NoticeItem = {
        id: nextNoticeId++,
        title,
        content,
        status,
        createdAt: formatDateTime(new Date())
      };
      notices = [notice, ...notices];
      return { success: true, data: notice };
    }
  },
  {
    url: "/notice/update",
    method: "post",
    response: ({ body }): BaseResult<NoticeItem | EmptyData> => {
      const payload = body as Partial<NoticeItem> & { id: number };
      const id = Number(payload?.id);
      const index = notices.findIndex(n => n.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "公告不存在" };

      const current = notices[index];
      const title =
        typeof payload.title === "string"
          ? payload.title.trim()
          : current.title;
      const content =
        typeof payload.content === "string"
          ? payload.content.trim()
          : current.content;
      const status = (payload.status ?? current.status) as Status;

      if (!title) return { success: false, data: {}, message: "标题不能为空" };
      if (!content)
        return { success: false, data: {}, message: "内容不能为空" };

      const updated: NoticeItem = { ...current, title, content, status };
      notices = notices.map(n => (n.id === id ? updated : n));
      return { success: true, data: updated };
    }
  },
  {
    url: "/notice/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = notices.some(n => n.id === id);
      if (!exists) return { success: false, data: {}, message: "公告不存在" };

      notices = notices.filter(n => n.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/notice/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };

      notices = notices.filter(n => !ids.includes(n.id));
      return { success: true, data: {} };
    }
  }
]);
