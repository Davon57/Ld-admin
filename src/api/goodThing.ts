import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type GoodThingPublishType = "bought" | "self";

export type GoodThingImage = {
  url: string;
  uploadTime?: string;
};

export type GoodThingItem = {
  goodThingId: string;
  authorUserId: string;
  publishType: GoodThingPublishType;
  title: string;
  images: GoodThingImage[];
  description: string;
  buyLinkOrCode: string | null;
  buyConfig: string | null;
  buyPrice: number | null;
  contactWechat: string | null;
  isEnabled: boolean;
  isRecommended: boolean;
  likeCount: number;
  collectCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GoodThingDetail = Omit<GoodThingItem, "authorUserId"> & {
  authorUsername: string;
};

export type CreateGoodThingPayload = {
  publishType: GoodThingPublishType;
  title: string;
  images: GoodThingImage[];
  description: string;
  buyLinkOrCode?: string;
  buyConfig?: string;
  buyPrice?: number;
  contactWechat?: string;
  isEnabled?: boolean;
};

export type UpdateGoodThingPayload = {
  goodThingId: string;
  publishType?: GoodThingPublishType;
  title?: string;
  images?: GoodThingImage[];
  description?: string;
  buyLinkOrCode?: string | null;
  buyConfig?: string | null;
  buyPrice?: number | null;
  contactWechat?: string | null;
  isEnabled?: boolean;
};

export type GoodThingListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  publishType?: GoodThingPublishType;
  isEnabled?: boolean;
  isRecommended?: boolean;
};

export type GoodThingListResult = PageData<GoodThingItem> | GoodThingItem[];

export type DeleteResult = { ok: boolean };
export type RecommendResult = { ok: boolean };

function normalizeGoodThingImages(input: unknown): GoodThingImage[] {
  if (!Array.isArray(input)) return [];
  const out: GoodThingImage[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      const url = item.trim();
      if (url) out.push({ url });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    const url = typeof v.url === "string" ? v.url.trim() : "";
    if (!url) continue;
    const uploadTime =
      typeof v.uploadTime === "string" ? v.uploadTime : undefined;
    out.push(uploadTime ? { url, uploadTime } : { url });
  }
  return out;
}

function normalizeGoodThingItem(item: GoodThingItem): GoodThingItem {
  const v = item as unknown as Record<string, unknown>;
  return {
    ...item,
    images: normalizeGoodThingImages(v.images)
  };
}

export const createGoodThing = (data: CreateGoodThingPayload) => {
  return http.request<GoodThingItem>(
    "post",
    "/good-things/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateGoodThing = (data: UpdateGoodThingPayload) => {
  return http.request<GoodThingItem>(
    "post",
    "/good-things/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteGoodThing = (data: { goodThingId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/good-things/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const getGoodThingList = async (data: GoodThingListParams = {}) => {
  const res = await http.request<GoodThingListResult>("post", "/good-things", {
    data
  });

  if (Array.isArray(res)) return res.map(normalizeGoodThingItem);
  return {
    ...res,
    list: res.list.map(normalizeGoodThingItem)
  };
};

export const getGoodThingDetail = async (data: { goodThingId: string }) => {
  const res = await http.request<GoodThingDetail>(
    "post",
    "/good-things/detail",
    {
      data
    }
  );
  const v = res as unknown as Record<string, unknown>;
  return {
    ...res,
    images: normalizeGoodThingImages(v.images)
  };
};

export const recommendGoodThing = (data: { goodThingId: string }) => {
  return http.request<RecommendResult>(
    "post",
    "/good-things/recommend",
    { data },
    { showSuccessMessage: true }
  );
};

export const unrecommendGoodThing = (data: { goodThingId: string }) => {
  return http.request<RecommendResult>(
    "post",
    "/good-things/unrecommend",
    { data },
    { showSuccessMessage: true }
  );
};
