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

type VehicleItem = {
  id: number;
  year: number;
  model: string;
  version: string;
  status: Status;
  remark: string;
  createdAt: string;
};

type VehicleListParams = {
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

const now = Date.now();

const initialVehicles: VehicleItem[] = [
  {
    id: 1,
    year: 2025,
    model: "第二代蓝电E5PLUS",
    version: "科技包版",
    status: 1,
    remark: "测试车",
    createdAt: formatDateTime(new Date(now - 12 * 864e5))
  },
  {
    id: 2,
    year: 2025,
    model: "第二代蓝电E5PLUS",
    version: "先享版",
    status: 1,
    remark: "",
    createdAt: formatDateTime(new Date(now - 10 * 864e5))
  },
  {
    id: 3,
    year: 2024,
    model: "第二代蓝电E5PLUS",
    version: "科技包版",
    status: 0,
    remark: "停用",
    createdAt: formatDateTime(new Date(now - 8 * 864e5))
  },
  {
    id: 4,
    year: 2024,
    model: "第二代蓝电E5PLUS",
    version: "先享版",
    status: 1,
    remark: "",
    createdAt: formatDateTime(new Date(now - 6 * 864e5))
  },
  {
    id: 5,
    year: 2025,
    model: "第二代蓝电E5PLUS",
    version: "运动版",
    status: 1,
    remark: "长测",
    createdAt: formatDateTime(new Date(now - 4 * 864e5))
  }
];

let vehicles: VehicleItem[] = [...initialVehicles];
let nextId = vehicles.reduce((max, v) => Math.max(max, v.id), 0) + 1;

export default defineFakeRoute([
  {
    url: "/vehicle/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<VehicleItem>> => {
      const params = body as VehicleListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;

      const filtered = vehicles
        .filter(v =>
          matchKeyword([String(v.year), v.model, v.version, v.remark], keyword)
        )
        .filter(v => (typeof status === "number" ? v.status === status : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return { success: true, data: { list, total } };
    }
  },
  {
    url: "/vehicle/create",
    method: "post",
    response: ({ body }): BaseResult<VehicleItem | EmptyData> => {
      const payload = body as Partial<VehicleItem>;

      const year = Number(payload?.year);
      if (!year || !Number.isFinite(year) || year < 1900 || year > 2100) {
        return { success: false, data: {}, message: "年份不正确" };
      }

      const model = String(payload?.model || "").trim();
      if (!model) return { success: false, data: {}, message: "车型不能为空" };

      const version = String(payload?.version || "").trim();
      if (!version)
        return { success: false, data: {}, message: "版本不能为空" };

      const remark = String(payload?.remark || "").trim();
      const status = (payload?.status ?? 1) as Status;

      if (
        vehicles.some(
          v => v.year === year && v.model === model && v.version === version
        )
      )
        return { success: false, data: {}, message: "该车型版本已存在" };

      const item: VehicleItem = {
        id: nextId++,
        year,
        model,
        version,
        status,
        remark,
        createdAt: formatDateTime(new Date())
      };
      vehicles = [item, ...vehicles];
      return { success: true, data: item };
    }
  },
  {
    url: "/vehicle/update",
    method: "post",
    response: ({ body }): BaseResult<VehicleItem | EmptyData> => {
      const payload = body as Partial<VehicleItem> & { id: number };
      const id = Number(payload?.id);
      const index = vehicles.findIndex(v => v.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "车型不存在" };

      const current = vehicles[index];

      const year =
        typeof payload.year === "number" ? payload.year : Number(payload.year);
      const normalizedYear =
        Number.isFinite(year) && year ? year : current.year;
      const model =
        typeof payload.model === "string"
          ? payload.model.trim()
          : current.model;
      const version =
        typeof payload.version === "string"
          ? payload.version.trim()
          : current.version;
      const remark =
        typeof payload.remark === "string"
          ? payload.remark.trim()
          : current.remark;
      const status = (payload.status ?? current.status) as Status;

      if (
        !normalizedYear ||
        !Number.isFinite(normalizedYear) ||
        normalizedYear < 1900 ||
        normalizedYear > 2100
      )
        return { success: false, data: {}, message: "年份不正确" };
      if (!model) return { success: false, data: {}, message: "车型不能为空" };
      if (!version)
        return { success: false, data: {}, message: "版本不能为空" };

      if (
        vehicles.some(
          v =>
            v.id !== id &&
            v.year === normalizedYear &&
            v.model === model &&
            v.version === version
        )
      )
        return { success: false, data: {}, message: "该车型版本已存在" };

      const updated: VehicleItem = {
        ...current,
        year: normalizedYear,
        model,
        version,
        status,
        remark
      };
      vehicles = vehicles.map(v => (v.id === id ? updated : v));
      return { success: true, data: updated };
    }
  },
  {
    url: "/vehicle/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = vehicles.some(v => v.id === id);
      if (!exists) return { success: false, data: {}, message: "车型不存在" };
      vehicles = vehicles.filter(v => v.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/vehicle/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };
      vehicles = vehicles.filter(v => !ids.includes(v.id));
      return { success: true, data: {} };
    }
  }
]);
