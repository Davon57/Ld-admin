import { defineFakeRoute } from "vite-plugin-fake-server/client";
import { Buffer } from "buffer";

type AvatarItem = {
  avatarId: string;
  imageBase64: string;
  description: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

type AvatarListParams = {
  page: number;
  pageSize: number;
  includeDisabled?: boolean;
  isEnabled?: boolean;
};

type ApiResponse<T> = {
  code: string;
  message: string;
  data: T;
};

type ApiErrorResponse = ApiResponse<[]>;

type PageData<T> = {
  list: T[];
  total: number;
  page?: number;
  pageSize?: number;
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

function lettersOf(n: number, len: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let num = Math.max(0, Math.floor(n));
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out = alphabet[num % 26] + out;
    num = Math.floor(num / 26);
  }
  return out;
}

function createBusinessId(seq: number): string {
  const num = Math.max(1, Math.floor(seq));
  const digits = String(num).padStart(4, "0");
  const letters = lettersOf(num - 1, 4);
  return `LD${digits}${letters}`;
}

function encodeSvgToBase64(svg: string): string {
  return Buffer.from(svg, "utf-8").toString("base64");
}

function error(code: string, message: string): ApiErrorResponse {
  return { code, message, data: [] };
}

function ensureBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function createSeedAvatars(): AvatarItem[] {
  const presets: Array<{ description: string; bg: string; fg: string }> = [
    { description: "默认头像-01", bg: "#3B82F6", fg: "#FFFFFF" },
    { description: "默认头像-02", bg: "#10B981", fg: "#FFFFFF" },
    { description: "默认头像-03", bg: "#F59E0B", fg: "#111827" },
    { description: "默认头像-04", bg: "#EF4444", fg: "#FFFFFF" },
    { description: "默认头像-05", bg: "#6366F1", fg: "#FFFFFF" },
    { description: "默认头像-06", bg: "#14B8A6", fg: "#FFFFFF" },
    { description: "默认头像-07", bg: "#0EA5E9", fg: "#FFFFFF" },
    { description: "默认头像-08", bg: "#334155", fg: "#FFFFFF" }
  ];

  const now = Date.now();
  return presets.map((it, idx) => {
    const createdAt = formatDateTime(new Date(now - idx * 36e5));
    const label = String(idx + 1).padStart(2, "0");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${it.bg}"/><stop offset="1" stop-color="#111827" stop-opacity="0.12"/></linearGradient></defs><rect x="0" y="0" width="96" height="96" rx="48" fill="url(#g)"/><text x="48" y="58" font-family="system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial" font-size="32" text-anchor="middle" fill="${it.fg}" font-weight="700">${label}</text></svg>`;
    return {
      avatarId: createBusinessId(idx + 1),
      imageBase64: encodeSvgToBase64(svg),
      description: it.description,
      isEnabled: true,
      createdAt,
      updatedAt: createdAt
    };
  });
}

function getNextSeq(): number {
  let max = 0;
  for (const item of avatars) {
    const digits = item.avatarId.slice(2, 6);
    const num = Number(digits);
    if (Number.isFinite(num)) max = Math.max(max, num);
  }
  return max + 1;
}

let avatars: AvatarItem[] = createSeedAvatars();

export default defineFakeRoute([
  {
    url: "/avatars",
    method: "post",
    response: ({ body }): ApiResponse<PageData<AvatarItem>> => {
      const params = body as Partial<AvatarListParams>;
      const page = Math.max(1, Number(params?.page || 1));
      const pageSize = Math.max(1, Number(params?.pageSize || 10));
      const includeDisabled = ensureBoolean(params?.includeDisabled, false);
      const isEnabled =
        typeof params?.isEnabled === "boolean" ? params.isEnabled : undefined;

      const filtered = avatars
        .filter(a => {
          if (typeof isEnabled === "boolean") return a.isEnabled === isEnabled;
          if (includeDisabled) return true;
          return a.isEnabled;
        })
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return {
        code: "0",
        message: "success",
        data: {
          list: filtered.slice(start, end),
          total,
          page,
          pageSize
        }
      };
    }
  },
  {
    url: "/avatars/create",
    method: "post",
    response: ({ body }): ApiResponse<AvatarItem> | ApiErrorResponse => {
      const payload = body as Partial<AvatarItem>;
      const imageBase64 = String(payload?.imageBase64 ?? "").trim();
      const description = String(payload?.description ?? "").trim();
      const isEnabled = ensureBoolean(payload?.isEnabled, true);

      if (!imageBase64) return error("400", "imageBase64 不能为空");
      if (description.length > 50) return error("400", "description 最长 50");

      const nextSeq = getNextSeq();
      const createdAt = formatDateTime(new Date());
      const item: AvatarItem = {
        avatarId: createBusinessId(nextSeq),
        imageBase64,
        description,
        isEnabled,
        createdAt,
        updatedAt: createdAt
      };

      avatars = [item, ...avatars];
      return { code: "0", message: "success", data: item };
    }
  },
  {
    url: "/avatars/update",
    method: "post",
    response: ({ body }): ApiResponse<AvatarItem> | ApiErrorResponse => {
      const payload = body as Partial<AvatarItem> & { avatarId?: string };
      const avatarId = String(payload?.avatarId ?? "").trim();
      if (!avatarId) return error("400", "avatarId 不能为空");

      const index = avatars.findIndex(a => a.avatarId === avatarId);
      if (index < 0) return error("404", "头像不存在");

      const current = avatars[index];
      const nextImageBase64 =
        typeof payload?.imageBase64 === "string" && payload.imageBase64.trim()
          ? payload.imageBase64.trim()
          : current.imageBase64;
      const nextDescription =
        typeof payload?.description === "string"
          ? payload.description.trim()
          : current.description;
      const nextIsEnabled =
        typeof payload?.isEnabled === "boolean"
          ? payload.isEnabled
          : current.isEnabled;

      if (!nextImageBase64) return error("400", "imageBase64 不能为空");
      if (nextDescription.length > 50)
        return error("400", "description 最长 50");

      const updatedAt = formatDateTime(new Date());
      const updated: AvatarItem = {
        ...current,
        imageBase64: nextImageBase64,
        description: nextDescription,
        isEnabled: nextIsEnabled,
        updatedAt
      };

      avatars = avatars.map(a => (a.avatarId === avatarId ? updated : a));
      return { code: "0", message: "success", data: updated };
    }
  },
  {
    url: "/avatars/delete",
    method: "post",
    response: ({ body }): ApiResponse<{ ok: boolean }> | ApiErrorResponse => {
      const avatarId = String((body as { avatarId?: string })?.avatarId ?? "");
      if (!avatarId.trim()) return error("400", "avatarId 不能为空");
      const exists = avatars.some(a => a.avatarId === avatarId);
      if (!exists) return error("404", "头像不存在");
      avatars = avatars.filter(a => a.avatarId !== avatarId);
      return { code: "0", message: "success", data: { ok: true } };
    }
  }
]);
