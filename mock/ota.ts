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

type OtaTypeItem = {
  id: number;
  name: string;
  code: string;
  status: Status;
  createdAt: string;
};

type OtaContentItem = {
  id: number;
  typeId: number;
  version: string;
  title: string;
  vehicleModelVersion: string;
  packageSize: string;
  releaseAt: string;
  status: Status;
  content: string;
  createdAt: string;
};

type OtaTypeListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

type OtaContentListParams = {
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

const initialTypes: OtaTypeItem[] = [
  {
    id: 1,
    name: "稳定版",
    code: "stable",
    status: 1,
    createdAt: formatDateTime(new Date(now - 6 * 864e5))
  },
  {
    id: 2,
    name: "体验版",
    code: "experience",
    status: 1,
    createdAt: formatDateTime(new Date(now - 5 * 864e5))
  },
  {
    id: 3,
    name: "内测版",
    code: "internal",
    status: 1,
    createdAt: formatDateTime(new Date(now - 4 * 864e5))
  },
  {
    id: 4,
    name: "公测版",
    code: "public",
    status: 1,
    createdAt: formatDateTime(new Date(now - 3 * 864e5))
  }
];

let otaTypes: OtaTypeItem[] = [...initialTypes];
let nextTypeId = otaTypes.reduce((max, t) => Math.max(max, t.id), 0) + 1;

const initialContents: OtaContentItem[] = [
  {
    id: 1,
    typeId: 1,
    version: "V1.3.0",
    title: "冬季安心版",
    vehicleModelVersion: "S1 2025.1",
    packageSize: "1.2 GB",
    releaseAt: "2026-01-03",
    status: 1,
    content:
      "续航与能耗优化\n- 低温环境下电池预热策略优化\n- SOC 估算更稳定\n\n升级前注意事项\n- 建议预留 20-30 分钟\n- 电量建议不低于 30%",
    createdAt: formatDateTime(new Date(now - 2 * 864e5))
  },
  {
    id: 2,
    typeId: 1,
    version: "V1.2.2",
    title: "稳定性增强版",
    vehicleModelVersion: "S1 2024.12",
    packageSize: "980 MB",
    releaseAt: "2025-12-10",
    status: 1,
    content:
      "其他优化与改进\n- 语音助手稳定性优化\n- 地图渲染性能提升\n\n已知问题\n- 弱网环境下第三方音乐应用加载较慢",
    createdAt: formatDateTime(new Date(now - 12 * 864e5))
  },
  {
    id: 3,
    typeId: 2,
    version: "V1.3.0-beta.1",
    title: "体验版内测推送",
    vehicleModelVersion: "S1 2025.1",
    packageSize: "1.3 GB",
    releaseAt: "2026-01-05",
    status: 1,
    content: "体验版功能预览\n- 新增仪表提示交互\n- 充电策略优化（实验性）",
    createdAt: formatDateTime(new Date(now - 1 * 864e5))
  }
];

let otaContents: OtaContentItem[] = [...initialContents];
let nextContentId = otaContents.reduce((max, c) => Math.max(max, c.id), 0) + 1;

export default defineFakeRoute([
  {
    url: "/ota/type/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<OtaTypeItem>> => {
      const params = body as OtaTypeListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;

      const filtered = otaTypes
        .filter(t => matchKeyword([t.name, t.code], keyword))
        .filter(t => (typeof status === "number" ? t.status === status : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return { success: true, data: { list, total } };
    }
  },
  {
    url: "/ota/type/create",
    method: "post",
    response: ({ body }): BaseResult<OtaTypeItem | EmptyData> => {
      const payload = body as Partial<OtaTypeItem>;
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

      const exists = otaTypes.some(t => t.name === name || t.code === code);
      if (exists) return { success: false, data: {}, message: "类型已存在" };

      const status = (payload?.status ?? 1) as Status;
      const item: OtaTypeItem = {
        id: nextTypeId++,
        name,
        code,
        status,
        createdAt: formatDateTime(new Date())
      };
      otaTypes = [item, ...otaTypes];
      return { success: true, data: item };
    }
  },
  {
    url: "/ota/type/update",
    method: "post",
    response: ({ body }): BaseResult<OtaTypeItem | EmptyData> => {
      const payload = body as Partial<OtaTypeItem> & { id: number };
      const id = Number(payload?.id);
      const index = otaTypes.findIndex(t => t.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "类型不存在" };

      const current = otaTypes[index];
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

      const conflict = otaTypes.some(
        t => t.id !== id && (t.name === name || t.code === code)
      );
      if (conflict) return { success: false, data: {}, message: "类型已存在" };

      const updated: OtaTypeItem = { ...current, name, code, status };
      otaTypes = otaTypes.map(t => (t.id === id ? updated : t));
      return { success: true, data: updated };
    }
  },
  {
    url: "/ota/type/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = otaTypes.some(t => t.id === id);
      if (!exists) return { success: false, data: {}, message: "类型不存在" };

      const used = otaContents.some(c => c.typeId === id);
      if (used)
        return {
          success: false,
          data: {},
          message: "该类型下存在内容，无法删除"
        };

      otaTypes = otaTypes.filter(t => t.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/ota/type/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };

      const used = otaContents.some(c => ids.includes(c.typeId));
      if (used)
        return {
          success: false,
          data: {},
          message: "选中类型下存在内容，无法删除"
        };

      otaTypes = otaTypes.filter(t => !ids.includes(t.id));
      return { success: true, data: {} };
    }
  },
  {
    url: "/ota/content/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<OtaContentItem>> => {
      const params = body as OtaContentListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;
      const typeId =
        typeof params?.typeId === "number" ? params.typeId : undefined;

      const filtered = otaContents
        .filter(c =>
          matchKeyword(
            [c.version, c.title, c.vehicleModelVersion, c.content],
            keyword
          )
        )
        .filter(c => (typeof status === "number" ? c.status === status : true))
        .filter(c => (typeof typeId === "number" ? c.typeId === typeId : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return { success: true, data: { list, total } };
    }
  },
  {
    url: "/ota/content/create",
    method: "post",
    response: ({ body }): BaseResult<OtaContentItem | EmptyData> => {
      const payload = body as Partial<OtaContentItem>;
      const typeId = Number(payload?.typeId);
      const type = otaTypes.find(t => t.id === typeId);
      if (!type || type.status !== 1) {
        return { success: false, data: {}, message: "请选择有效类型" };
      }

      const version = String(payload?.version || "").trim();
      if (!version)
        return { success: false, data: {}, message: "版本号不能为空" };
      const title = String(payload?.title || "").trim();
      if (!title) return { success: false, data: {}, message: "标题不能为空" };
      const vehicleModelVersion = String(
        payload?.vehicleModelVersion || ""
      ).trim();
      if (!vehicleModelVersion)
        return { success: false, data: {}, message: "适用车型版本不能为空" };
      const packageSize = String(payload?.packageSize || "").trim();
      if (!packageSize)
        return { success: false, data: {}, message: "包大小不能为空" };
      const releaseAt = String(payload?.releaseAt || "").trim();
      if (!releaseAt)
        return { success: false, data: {}, message: "发布日期不能为空" };
      const content = String(payload?.content || "").trim();
      if (!content)
        return { success: false, data: {}, message: "内容不能为空" };

      const status = (payload?.status ?? 1) as Status;
      const item: OtaContentItem = {
        id: nextContentId++,
        typeId,
        version,
        title,
        vehicleModelVersion,
        packageSize,
        releaseAt,
        status,
        content,
        createdAt: formatDateTime(new Date())
      };
      otaContents = [item, ...otaContents];
      return { success: true, data: item };
    }
  },
  {
    url: "/ota/content/update",
    method: "post",
    response: ({ body }): BaseResult<OtaContentItem | EmptyData> => {
      const payload = body as Partial<OtaContentItem> & { id: number };
      const id = Number(payload?.id);
      const index = otaContents.findIndex(c => c.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "内容不存在" };

      const current = otaContents[index];

      const typeId =
        typeof payload.typeId === "number" ? payload.typeId : current.typeId;
      const type = otaTypes.find(t => t.id === typeId);
      if (!type || type.status !== 1) {
        return { success: false, data: {}, message: "请选择有效类型" };
      }

      const version =
        typeof payload.version === "string"
          ? payload.version.trim()
          : current.version;
      const title =
        typeof payload.title === "string"
          ? payload.title.trim()
          : current.title;
      const vehicleModelVersion =
        typeof payload.vehicleModelVersion === "string"
          ? payload.vehicleModelVersion.trim()
          : current.vehicleModelVersion;
      const packageSize =
        typeof payload.packageSize === "string"
          ? payload.packageSize.trim()
          : current.packageSize;
      const releaseAt =
        typeof payload.releaseAt === "string"
          ? payload.releaseAt.trim()
          : current.releaseAt;
      const content =
        typeof payload.content === "string"
          ? payload.content.trim()
          : current.content;
      const status = (payload.status ?? current.status) as Status;

      if (!version)
        return { success: false, data: {}, message: "版本号不能为空" };
      if (!title) return { success: false, data: {}, message: "标题不能为空" };
      if (!vehicleModelVersion)
        return { success: false, data: {}, message: "适用车型版本不能为空" };
      if (!packageSize)
        return { success: false, data: {}, message: "包大小不能为空" };
      if (!releaseAt)
        return { success: false, data: {}, message: "发布日期不能为空" };
      if (!content)
        return { success: false, data: {}, message: "内容不能为空" };

      const updated: OtaContentItem = {
        ...current,
        typeId,
        version,
        title,
        vehicleModelVersion,
        packageSize,
        releaseAt,
        status,
        content
      };
      otaContents = otaContents.map(c => (c.id === id ? updated : c));
      return { success: true, data: updated };
    }
  },
  {
    url: "/ota/content/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = otaContents.some(c => c.id === id);
      if (!exists) return { success: false, data: {}, message: "内容不存在" };
      otaContents = otaContents.filter(c => c.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/ota/content/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };
      otaContents = otaContents.filter(c => !ids.includes(c.id));
      return { success: true, data: {} };
    }
  }
]);
