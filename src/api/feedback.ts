import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type FeedbackImage = {
  url: string;
  uploadTime: string;
};

export type FeedbackItem = {
  feedbackId: string;
  userId: string;
  cby?: string;
  type: string;
  description: string;
  contact: string | null;
  env: string;
  images: FeedbackImage[];
  createdAt: string;
  updatedAt: string;
};

export type CreateFeedbackPayload = {
  cby: string;
  type: string;
  description: string;
  contact?: string | null;
  env: string;
  images?: FeedbackImage[];
};

export type UpdateFeedbackPayload = {
  feedbackId: string;
  cby?: string;
  type?: string;
  description?: string;
  contact?: string | null;
  env?: string;
  images?: FeedbackImage[];
};

export type DeleteFeedbackResult = {
  ok: boolean;
};

export type FeedbackListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  type?: string;
};

export type FeedbackListResult = FeedbackItem[] | PageData<FeedbackItem>;

export const getFeedbackList = (data: FeedbackListParams = {}) => {
  return http.request<FeedbackListResult>("post", "/feedbacks", { data });
};

export const createFeedback = (data: CreateFeedbackPayload) => {
  return http.request<FeedbackItem>("post", "/feedbacks/create", { data });
};

export const updateFeedback = (data: UpdateFeedbackPayload) => {
  return http.request<FeedbackItem>("post", "/feedbacks/update", { data });
};

export const deleteFeedback = (data: { feedbackId: string }) => {
  return http.request<DeleteFeedbackResult>("post", "/feedbacks/delete", {
    data
  });
};
