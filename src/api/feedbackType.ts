import { http } from "@/utils/http";
import { isPageData, type PageData } from "@/utils/table";

export type FeedbackTypeItem = {
  feedbackTypeId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackTypeListParams = {
  page?: number;
  pageSize?: number;
  nameKeyword?: string;
  createdAtStart?: string;
};

export type FeedbackTypeListResult =
  | FeedbackTypeItem[]
  | PageData<FeedbackTypeItem>;

export type CreateFeedbackTypePayload = {
  name: string;
  description?: string;
};

export type UpdateFeedbackTypePayload = {
  feedbackTypeId: string;
  name?: string;
  description?: string;
};

export type DeleteFeedbackTypeResult = {
  ok: boolean;
};

export const getFeedbackTypeList = (data: FeedbackTypeListParams = {}) => {
  return http.request<FeedbackTypeListResult>("post", "/feedback-types", {
    data
  });
};

function normalizeFeedbackTypeItem(item: FeedbackTypeItem): FeedbackTypeItem {
  const maybe = item as unknown as Record<string, unknown>;
  const createdAt =
    typeof maybe.createdAt === "string"
      ? maybe.createdAt
      : typeof maybe.createAt === "string"
        ? maybe.createAt
        : "";
  const updatedAt =
    typeof maybe.updatedAt === "string"
      ? maybe.updatedAt
      : typeof maybe.updateAt === "string"
        ? maybe.updateAt
        : "";
  return {
    ...item,
    createdAt,
    updatedAt
  };
}

export async function getAllFeedbackTypes(
  params: Omit<FeedbackTypeListParams, "page" | "pageSize"> & {
    pageSize?: number;
  } = {}
): Promise<FeedbackTypeItem[]> {
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 100));
  const first = await getFeedbackTypeList({
    ...params,
    page: 1,
    pageSize
  });

  if (!isPageData<FeedbackTypeItem>(first)) {
    return first.map(normalizeFeedbackTypeItem);
  }

  const all: FeedbackTypeItem[] = [...first.list];
  const totalPages = Math.max(1, Math.ceil(first.total / pageSize));
  for (let page = 2; page <= totalPages; page += 1) {
    const res = await getFeedbackTypeList({
      ...params,
      page,
      pageSize
    });
    if (!isPageData<FeedbackTypeItem>(res)) {
      all.push(...res);
      break;
    }
    all.push(...res.list);
  }
  return all.map(normalizeFeedbackTypeItem);
}

export const createFeedbackType = (data: CreateFeedbackTypePayload) => {
  return http.request<FeedbackTypeItem>("post", "/feedback-types/create", {
    data
  });
};

export const updateFeedbackType = (data: UpdateFeedbackTypePayload) => {
  return http.request<FeedbackTypeItem>("post", "/feedback-types/update", {
    data
  });
};

export const deleteFeedbackType = (data: { feedbackTypeId: string }) => {
  return http.request<DeleteFeedbackTypeResult>(
    "post",
    "/feedback-types/delete",
    { data }
  );
};
