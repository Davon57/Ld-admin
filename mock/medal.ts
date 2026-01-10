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

type MedalTypeItem = {
  id: number;
  name: string;
  code: string;
  status: Status;
  createdAt: string;
};

type MedalItem = {
  id: number;
  typeId: number;
  name: string;
  code: string;
  description: string;
  status: Status;
  createdAt: string;
};

type MedalTypeListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

type MedalItemListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
  typeId?: number;
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

function normalizeCode(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const now = Date.now();

const initialTypes: MedalTypeItem[] = [
  {
    id: 1,
    name: "OTA升级",
    code: "ota",
    status: 1,
    createdAt: formatDateTime(new Date(now - 6 * 864e5))
  },
  {
    id: 2,
    name: "发文章",
    code: "post",
    status: 1,
    createdAt: formatDateTime(new Date(now - 5 * 864e5))
  },
  {
    id: 3,
    name: "提问",
    code: "qa",
    status: 1,
    createdAt: formatDateTime(new Date(now - 4 * 864e5))
  }
];

let medalTypes: MedalTypeItem[] = [...initialTypes];
let nextTypeId = medalTypes.reduce((max, t) => Math.max(max, t.id), 0) + 1;

const initialItems: MedalItem[] = [
  {
    id: 1,
    typeId: 1,
    name: "首次成功升级",
    code: "first-upgrade",
    description: "完成第一次OTA升级后获得",
    status: 1,
    createdAt: formatDateTime(new Date(now - 3 * 864e5))
  },
  {
    id: 2,
    typeId: 2,
    name: "首发文章",
    code: "first-post",
    description: "发布第一篇文章后获得",
    status: 1,
    createdAt: formatDateTime(new Date(now - 2 * 864e5))
  },
  {
    id: 3,
    typeId: 3,
    name: "好奇宝宝",
    code: "curious",
    description: "累计提问达到一定次数后获得",
    status: 1,
    createdAt: formatDateTime(new Date(now - 1 * 864e5))
  }
];

let medalItems: MedalItem[] = [...initialItems];
let nextItemId = medalItems.reduce((max, t) => Math.max(max, t.id), 0) + 1;

export default defineFakeRoute([
  {
    url: "/medal/type/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<MedalTypeItem>> => {
      const params = body as MedalTypeListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;

      const filtered = medalTypes
        .filter(t => matchKeyword([t.name, t.code], keyword))
        .filter(t => (typeof status === "number" ? t.status === status : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return { success: true, data: { list, total } };
    }
  },
  {
    url: "/medal/type/create",
    method: "post",
    response: ({ body }): BaseResult<MedalTypeItem | EmptyData> => {
      const payload = body as Partial<MedalTypeItem>;
      const name = String(payload?.name || "").trim();
      if (!name)
        return { success: false, data: {}, message: "类型名称不能为空" };

      const rawCode = typeof payload?.code === "string" ? payload.code : "";
      const code = normalizeCode(rawCode || name);
      if (!code) return { success: false, data: {}, message: "code 不能为空" };
      if (!/^[a-z0-9-]+$/.test(code)) {
        return {
          success: false,
          data: {},
          message: "code 仅支持小写字母/数字/连字符"
        };
      }

      const exists = medalTypes.some(t => t.name === name || t.code === code);
      if (exists) return { success: false, data: {}, message: "类型已存在" };

      const status = (payload?.status ?? 1) as Status;
      const item: MedalTypeItem = {
        id: nextTypeId++,
        name,
        code,
        status,
        createdAt: formatDateTime(new Date())
      };
      medalTypes = [item, ...medalTypes];
      return { success: true, data: item };
    }
  },
  {
    url: "/medal/type/update",
    method: "post",
    response: ({ body }): BaseResult<MedalTypeItem | EmptyData> => {
      const payload = body as Partial<MedalTypeItem> & { id: number };
      const id = Number(payload?.id);
      const index = medalTypes.findIndex(t => t.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "类型不存在" };

      const current = medalTypes[index];
      const name =
        typeof payload.name === "string" ? payload.name.trim() : current.name;
      const rawCode =
        typeof payload.code === "string" ? payload.code : current.code;
      const code = normalizeCode(rawCode);
      const status = (payload.status ?? current.status) as Status;

      if (!name)
        return { success: false, data: {}, message: "类型名称不能为空" };
      if (!code) return { success: false, data: {}, message: "code 不能为空" };
      if (!/^[a-z0-9-]+$/.test(code)) {
        return {
          success: false,
          data: {},
          message: "code 仅支持小写字母/数字/连字符"
        };
      }

      const conflict = medalTypes.some(
        t => t.id !== id && (t.name === name || t.code === code)
      );
      if (conflict) return { success: false, data: {}, message: "类型已存在" };

      const updated: MedalTypeItem = { ...current, name, code, status };
      medalTypes = medalTypes.map(t => (t.id === id ? updated : t));
      return { success: true, data: updated };
    }
  },
  {
    url: "/medal/type/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const payload = body as { id: number };
      const id = Number(payload?.id);
      if (!id) return { success: false, data: {}, message: "id 不能为空" };

      const used = medalItems.some(m => m.typeId === id);
      if (used)
        return {
          success: false,
          data: {},
          message: "该类型下存在勋章，无法删除"
        };

      medalTypes = medalTypes.filter(t => t.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/medal/type/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const payload = body as { ids: number[] };
      const ids = Array.isArray(payload?.ids)
        ? payload.ids.map(Number).filter(Boolean)
        : [];

      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };

      const used = medalItems.some(m => ids.includes(m.typeId));
      if (used)
        return {
          success: false,
          data: {},
          message: "选中类型下存在勋章，无法删除"
        };

      medalTypes = medalTypes.filter(t => !ids.includes(t.id));
      return { success: true, data: {} };
    }
  },
  {
    url: "/medal/item/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<MedalItem>> => {
      const params = body as MedalItemListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;
      const typeId =
        typeof params?.typeId === "number" ? Number(params.typeId) : undefined;

      const filtered = medalItems
        .filter(t => matchKeyword([t.name, t.code, t.description], keyword))
        .filter(t => (typeof status === "number" ? t.status === status : true))
        .filter(t => (typeof typeId === "number" ? t.typeId === typeId : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return { success: true, data: { list, total } };
    }
  },
  {
    url: "/medal/item/create",
    method: "post",
    response: ({ body }): BaseResult<MedalItem | EmptyData> => {
      const payload = body as Partial<MedalItem>;
      const name = String(payload?.name || "").trim();
      if (!name)
        return { success: false, data: {}, message: "勋章名称不能为空" };

      const rawCode = typeof payload?.code === "string" ? payload.code : "";
      const code = normalizeCode(rawCode || name);
      if (!code) return { success: false, data: {}, message: "code 不能为空" };
      if (!/^[a-z0-9-]+$/.test(code)) {
        return {
          success: false,
          data: {},
          message: "code 仅支持小写字母/数字/连字符"
        };
      }

      const typeId = Number(payload?.typeId);
      if (!typeId) return { success: false, data: {}, message: "请选择类型" };
      if (!medalTypes.some(t => t.id === typeId))
        return { success: false, data: {}, message: "类型不存在" };

      const exists = medalItems.some(t => t.name === name || t.code === code);
      if (exists) return { success: false, data: {}, message: "勋章已存在" };

      const status = (payload?.status ?? 1) as Status;
      const description = String(payload?.description || "").trim();

      const item: MedalItem = {
        id: nextItemId++,
        typeId,
        name,
        code,
        description,
        status,
        createdAt: formatDateTime(new Date())
      };
      medalItems = [item, ...medalItems];
      return { success: true, data: item };
    }
  },
  {
    url: "/medal/item/update",
    method: "post",
    response: ({ body }): BaseResult<MedalItem | EmptyData> => {
      const payload = body as Partial<MedalItem> & { id: number };
      const id = Number(payload?.id);
      const index = medalItems.findIndex(t => t.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "勋章不存在" };

      const current = medalItems[index];
      const name =
        typeof payload.name === "string" ? payload.name.trim() : current.name;
      const rawCode =
        typeof payload.code === "string" ? payload.code : current.code;
      const code = normalizeCode(rawCode);
      const status = (payload.status ?? current.status) as Status;
      const description =
        typeof payload.description === "string"
          ? payload.description.trim()
          : current.description;

      const typeId =
        typeof payload.typeId === "number"
          ? Number(payload.typeId)
          : current.typeId;

      if (!name)
        return { success: false, data: {}, message: "勋章名称不能为空" };
      if (!code) return { success: false, data: {}, message: "code 不能为空" };
      if (!/^[a-z0-9-]+$/.test(code)) {
        return {
          success: false,
          data: {},
          message: "code 仅支持小写字母/数字/连字符"
        };
      }
      if (!typeId) return { success: false, data: {}, message: "请选择类型" };
      if (!medalTypes.some(t => t.id === typeId))
        return { success: false, data: {}, message: "类型不存在" };

      const conflict = medalItems.some(
        t => t.id !== id && (t.name === name || t.code === code)
      );
      if (conflict) return { success: false, data: {}, message: "勋章已存在" };

      const updated: MedalItem = {
        ...current,
        name,
        code,
        status,
        typeId,
        description
      };
      medalItems = medalItems.map(t => (t.id === id ? updated : t));
      return { success: true, data: updated };
    }
  },
  {
    url: "/medal/item/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const payload = body as { id: number };
      const id = Number(payload?.id);
      if (!id) return { success: false, data: {}, message: "id 不能为空" };
      medalItems = medalItems.filter(t => t.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/medal/item/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const payload = body as { ids: number[] };
      const ids = Array.isArray(payload?.ids)
        ? payload.ids.map(Number).filter(Boolean)
        : [];

      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };

      medalItems = medalItems.filter(t => !ids.includes(t.id));
      return { success: true, data: {} };
    }
  }
]);
