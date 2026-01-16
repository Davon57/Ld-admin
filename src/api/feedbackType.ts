import { http } from "@/utils/http";

export type FeedbackTypeItem = {
  feedbackTypeId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

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

export const getFeedbackTypeList = (data: Record<string, never> = {}) => {
  return http.request<FeedbackTypeItem[]>("post", "/feedback-types", { data });
};

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
