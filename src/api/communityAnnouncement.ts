import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type DeleteResult = {
  ok: boolean;
};

export type CommunityAnnouncementTag = {
  communityAnnouncementTagId: string;
  name: string;
  description: string;
  seq: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityAnnouncementContentBlock = {
  title: string;
  content: string;
  seq: number;
};

export type CommunityAnnouncement = {
  communityAnnouncementId: string;
  title: string;
  summary: string;
  contentBlocks: CommunityAnnouncementContentBlock[];
  tagIds: string[];
  tags: CommunityAnnouncementTag[];
  seq: number;
  isEnabled: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CommunityAnnouncementTagListParams = {
  page?: number;
  pageSize?: number;
  communityAnnouncementTagId?: string;
  nameKeyword?: string;
  isEnabled?: boolean;
};

export type CommunityAnnouncementTagListResult =
  PageData<CommunityAnnouncementTag>;

export type CreateCommunityAnnouncementTagPayload = {
  name: string;
  description?: string;
  seq?: number;
  isEnabled?: boolean;
};

export type UpdateCommunityAnnouncementTagPayload = {
  communityAnnouncementTagId: string;
  name?: string;
  description?: string;
  seq?: number;
  isEnabled?: boolean;
};

export const getCommunityAnnouncementTagList = (
  data: CommunityAnnouncementTagListParams = {}
) => {
  return http.request<CommunityAnnouncementTagListResult>(
    "post",
    "/community-announcement-tags",
    { data }
  );
};

export const createCommunityAnnouncementTag = (
  data: CreateCommunityAnnouncementTagPayload
) => {
  return http.request<CommunityAnnouncementTag>(
    "post",
    "/community-announcement-tags/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCommunityAnnouncementTag = (
  data: UpdateCommunityAnnouncementTagPayload
) => {
  return http.request<CommunityAnnouncementTag>(
    "post",
    "/community-announcement-tags/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCommunityAnnouncementTag = (data: {
  communityAnnouncementTagId: string;
}) => {
  return http.request<DeleteResult>(
    "post",
    "/community-announcement-tags/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type CommunityAnnouncementListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  communityAnnouncementTagId?: string;
  isEnabled?: boolean;
};

export type CommunityAnnouncementListResult = PageData<CommunityAnnouncement>;

export type CreateCommunityAnnouncementPayload = {
  title: string;
  summary?: string;
  tagIds?: string[];
  contentBlocks?: CommunityAnnouncementContentBlock[];
  seq?: number;
  isEnabled?: boolean;
  publishedAt?: string;
};

export type UpdateCommunityAnnouncementPayload = {
  communityAnnouncementId: string;
  title?: string;
  summary?: string;
  tagIds?: string[];
  contentBlocks?: CommunityAnnouncementContentBlock[];
  seq?: number;
  isEnabled?: boolean;
  publishedAt?: string;
};

export const getCommunityAnnouncementList = (
  data: CommunityAnnouncementListParams = {}
) => {
  return http.request<CommunityAnnouncementListResult>(
    "post",
    "/community-announcements",
    { data }
  );
};

export const createCommunityAnnouncement = (
  data: CreateCommunityAnnouncementPayload
) => {
  return http.request<CommunityAnnouncement>(
    "post",
    "/community-announcements/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCommunityAnnouncement = (
  data: UpdateCommunityAnnouncementPayload
) => {
  return http.request<CommunityAnnouncement>(
    "post",
    "/community-announcements/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCommunityAnnouncement = (data: {
  communityAnnouncementId: string;
}) => {
  return http.request<DeleteResult>(
    "post",
    "/community-announcements/delete",
    { data },
    { showSuccessMessage: true }
  );
};
