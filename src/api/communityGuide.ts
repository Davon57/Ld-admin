import { http } from "@/utils/http";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

export type DeleteResult = {
  ok: boolean;
};

export type CommunityGuideContentBlock = {
  title: string;
  content: string;
};

export type CommunityGuide = {
  communityGuideId: string;
  title: string;
  summary: string;
  tags: string[];
  contentBlocks: CommunityGuideContentBlock[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCommunityGuidePayload = {
  title: string;
  summary?: string;
  tags?: string[];
  contentBlocks?: CommunityGuideContentBlock[];
  isEnabled?: boolean;
};

export type UpdateCommunityGuidePayload = {
  title?: string;
  summary?: string;
  tags?: string[];
  contentBlocks?: CommunityGuideContentBlock[];
  isEnabled?: boolean;
};

export const getCommunityGuide = (
  data: Record<string, never> = {},
  config?: PureHttpRequestConfig
) => {
  return http.request<CommunityGuide>(
    "post",
    "/community-guides",
    { data },
    config
  );
};

export const createCommunityGuide = (data: CreateCommunityGuidePayload) => {
  return http.request<CommunityGuide>(
    "post",
    "/community-guides/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCommunityGuide = (data: UpdateCommunityGuidePayload) => {
  return http.request<CommunityGuide>(
    "post",
    "/community-guides/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCommunityGuide = (data: Record<string, never> = {}) => {
  return http.request<DeleteResult>(
    "post",
    "/community-guides/delete",
    { data },
    { showSuccessMessage: true }
  );
};
