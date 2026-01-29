import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type DeleteResult = {
  ok: boolean;
};

export type CommunityQaContentBlock = {
  title: string;
  content: string;
  seq: number;
};

export type CommunityQaCategory = {
  communityQaCategoryId: string;
  name: string;
  description: string;
  color: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityQaItem = {
  communityQaId: string;
  title: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  category: CommunityQaCategory | null;
  contentBlocks: CommunityQaContentBlock[];
  viewCount: number;
  usefulCount: number;
  uselessCount: number;
  watchCount: number;
  isEnabled: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CommunityQaAttitude = "useful" | "useless" | "watch";

export type CommunityQaListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: string;
  isEnabled?: boolean;
};

export type CommunityQaListResult = PageData<CommunityQaItem>;

export type CommunityQaDetailResult = CommunityQaItem & {
  myAttitude: CommunityQaAttitude | null;
};

export type CreateCommunityQaPayload = {
  title: string;
  categoryId: string;
  contentBlocks?: CommunityQaContentBlock[];
  isEnabled?: boolean;
};

export type UpdateCommunityQaPayload = {
  communityQaId: string;
  title?: string;
  categoryId?: string;
  contentBlocks?: CommunityQaContentBlock[];
  isEnabled?: boolean;
};

export type CommunityQaAttitudeResult = {
  myAttitude: CommunityQaAttitude | null;
  usefulCount: number;
  uselessCount: number;
  watchCount: number;
};

export const getCommunityQaList = (data: CommunityQaListParams = {}) => {
  return http.request<CommunityQaListResult>("post", "/community-qas", {
    data
  });
};

export const getCommunityQaDetail = (data: { communityQaId: string }) => {
  return http.request<CommunityQaDetailResult>(
    "post",
    "/community-qas/detail",
    { data }
  );
};

export const createCommunityQa = (data: CreateCommunityQaPayload) => {
  return http.request<CommunityQaItem>(
    "post",
    "/community-qas/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCommunityQa = (data: UpdateCommunityQaPayload) => {
  return http.request<CommunityQaItem>(
    "post",
    "/community-qas/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCommunityQa = (data: { communityQaId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/community-qas/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const setCommunityQaAttitude = (data: {
  communityQaId: string;
  attitude?: CommunityQaAttitude | null;
}) => {
  return http.request<CommunityQaAttitudeResult>(
    "post",
    "/community-qas/attitude",
    { data }
  );
};

export type CommunityQaCategoryListParams = {
  page?: number;
  pageSize?: number;
  communityQaCategoryId?: string;
  nameKeyword?: string;
  isEnabled?: boolean;
};

export type CommunityQaCategoryListResult = PageData<CommunityQaCategory>;

export type CreateCommunityQaCategoryPayload = {
  name: string;
  description?: string;
  color: string;
  isEnabled?: boolean;
};

export type UpdateCommunityQaCategoryPayload = {
  communityQaCategoryId: string;
  name?: string;
  description?: string;
  color?: string;
  isEnabled?: boolean;
};

export const getCommunityQaCategoryList = (
  data: CommunityQaCategoryListParams = {}
) => {
  return http.request<CommunityQaCategoryListResult>(
    "post",
    "/community-qa-categories",
    { data }
  );
};

export const createCommunityQaCategory = (
  data: CreateCommunityQaCategoryPayload
) => {
  return http.request<CommunityQaCategory>(
    "post",
    "/community-qa-categories/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCommunityQaCategory = (
  data: UpdateCommunityQaCategoryPayload
) => {
  return http.request<CommunityQaCategory>(
    "post",
    "/community-qa-categories/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCommunityQaCategory = (data: {
  communityQaCategoryId: string;
}) => {
  return http.request<DeleteResult>(
    "post",
    "/community-qa-categories/delete",
    { data },
    { showSuccessMessage: true }
  );
};
