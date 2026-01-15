import { http } from "@/utils/http";

export type FeedbackImage = {
  url: string;
  uploadTime: string;
};

export type FeedbackItem = {
  id: string;
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
  userId: string;
  type: string;
  description: string;
  contact?: string | null;
  env: string;
  images?: FeedbackImage[];
};

export type UpdateFeedbackPayload = {
  id: string;
  type?: string;
  description?: string;
  contact?: string | null;
  env?: string;
  images?: FeedbackImage[];
};

export type DeleteFeedbackResult = {
  ok: boolean;
};

export const getFeedbackList = (data: Record<string, never> = {}) => {
  return http.request<FeedbackItem[]>("post", "/feedbacks", { data });
};

export const createFeedback = (data: CreateFeedbackPayload) => {
  return http.request<FeedbackItem>("post", "/feedbacks/create", { data });
};

export const updateFeedback = (data: UpdateFeedbackPayload) => {
  return http.request<FeedbackItem>("post", "/feedbacks/update", { data });
};

export const deleteFeedback = (data: { id: string }) => {
  return http.request<DeleteFeedbackResult>("post", "/feedbacks/delete", {
    data
  });
};
