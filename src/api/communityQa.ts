import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type DeleteResult = {
  ok: boolean;
};

export type LikeResult = {
  likeCount: number;
};

export type AdoptResult = {
  ok: boolean;
};

export type QaTagItem = {
  id: string;
  qaTagId: string;
  name: string;
  description: string;
  seq: number;
  isEnabled: boolean;
  updatedAt: string;
};

export type QaTagListParams = {
  page?: number;
  pageSize?: number;
  qaTagId?: string;
  nameKeyword?: string;
  isEnabled?: boolean;
};

export type QaTagListResult = QaTagItem[] | PageData<QaTagItem>;

export type CreateQaTagPayload = {
  name: string;
  description?: string;
  seq?: number;
  isEnabled?: boolean;
};

export type UpdateQaTagPayload = {
  qaTagId: string;
  name?: string;
  description?: string;
  seq?: number;
  isEnabled?: boolean;
};

export const getQaTagList = (data: QaTagListParams = {}) => {
  return http.request<QaTagListResult>("post", "/qa-tags", { data });
};

export const createQaTag = (data: CreateQaTagPayload) => {
  return http.request<QaTagItem>(
    "post",
    "/qa-tags/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateQaTag = (data: UpdateQaTagPayload) => {
  return http.request<QaTagItem>(
    "post",
    "/qa-tags/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteQaTag = (data: { qaTagId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/qa-tags/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type QaQuestionItem = {
  id: string;
  qaQuestionId: string;
  authorUserId: string;
  title: string;
  description: string;
  images: string[];
  tagIds: string[];
  likeCount: number;
  answerCount: number;
  viewCount: number;
  acceptedAnswerId: string | null;
  isSolved: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QaQuestionListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  tagId?: string;
  isSolved?: boolean;
};

export type QaQuestionListResult = QaQuestionItem[] | PageData<QaQuestionItem>;

export type CreateQaQuestionPayload = {
  title: string;
  description?: string;
  images?: string[];
  tagIds?: string[];
  isEnabled?: boolean;
};

export type UpdateQaQuestionPayload = {
  qaQuestionId: string;
  title?: string;
  description?: string;
  images?: string[];
  tagIds?: string[];
  isEnabled?: boolean;
};

export const getQaQuestionList = (data: QaQuestionListParams = {}) => {
  return http.request<QaQuestionListResult>("post", "/qa-questions", { data });
};

export const createQaQuestion = (data: CreateQaQuestionPayload) => {
  return http.request<QaQuestionItem>(
    "post",
    "/qa-questions/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateQaQuestion = (data: UpdateQaQuestionPayload) => {
  return http.request<QaQuestionItem>(
    "post",
    "/qa-questions/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteQaQuestion = (data: { qaQuestionId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/qa-questions/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type QaQuestionDetailResult = {
  question: QaQuestionItem;
  acceptedAnswer: QaAnswerItem | null;
};

export const getQaQuestionDetail = (data: { qaQuestionId: string }) => {
  return http.request<QaQuestionDetailResult>("post", "/qa-questions/detail", {
    data
  });
};

export const adoptQaAnswer = (data: {
  qaQuestionId: string;
  qaAnswerId: string;
}) => {
  return http.request<AdoptResult>(
    "post",
    "/qa-questions/adopt",
    { data },
    { showSuccessMessage: true }
  );
};

export const unadoptQaAnswer = (data: { qaQuestionId: string }) => {
  return http.request<AdoptResult>(
    "post",
    "/qa-questions/unadopt",
    { data },
    { showSuccessMessage: true }
  );
};

export const likeQaQuestion = (data: { qaQuestionId: string }) => {
  return http.request<LikeResult>("post", "/qa-questions/like", { data });
};

export const unlikeQaQuestion = (data: { qaQuestionId: string }) => {
  return http.request<LikeResult>("post", "/qa-questions/unlike", { data });
};

export type QaAnswerItem = {
  id: string;
  qaAnswerId: string;
  qaQuestionId: string;
  authorUserId: string;
  content: string;
  likeCount: number;
  isAccepted: boolean;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QaAnswerListParams = {
  page?: number;
  pageSize?: number;
  qaQuestionId: string;
};

export type QaAnswerListResult = {
  list: QaAnswerItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateQaAnswerPayload = {
  qaQuestionId: string;
  content: string;
};

export type UpdateQaAnswerPayload = {
  qaAnswerId: string;
  content: string;
};

export const getQaAnswerList = (data: QaAnswerListParams) => {
  return http.request<QaAnswerListResult>("post", "/qa-answers", { data });
};

export const createQaAnswer = (data: CreateQaAnswerPayload) => {
  return http.request<QaAnswerItem>(
    "post",
    "/qa-answers/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateQaAnswer = (data: UpdateQaAnswerPayload) => {
  return http.request<QaAnswerItem>(
    "post",
    "/qa-answers/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteQaAnswer = (data: { qaAnswerId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/qa-answers/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const likeQaAnswer = (data: { qaAnswerId: string }) => {
  return http.request<LikeResult>("post", "/qa-answers/like", { data });
};

export const unlikeQaAnswer = (data: { qaAnswerId: string }) => {
  return http.request<LikeResult>("post", "/qa-answers/unlike", { data });
};

export type QaCommentItem = {
  id: string;
  qaCommentId: string;
  qaAnswerId: string;
  authorUserId: string;
  nickname?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type QaCommentListParams = {
  page?: number;
  pageSize?: number;
  qaAnswerId?: string;
};

export type QaCommentListResult = {
  list: QaCommentItem[];
  page: number;
  pageSize: number;
  total: number;
};

export const getQaCommentList = (data: QaCommentListParams) => {
  return http.request<QaCommentListResult>("post", "/qa-comments", { data });
};
