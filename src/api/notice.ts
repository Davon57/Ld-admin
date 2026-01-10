import { http } from "@/utils/http";

export type Status = 0 | 1;

export type EmptyData = Record<string, never>;

export type BaseResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type PageResult<T> = {
  list: T[];
  total: number;
};

export type NoticeItem = {
  id: number;
  title: string;
  content: string;
  status: Status;
  createdAt: string;
};

export type NoticeListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

export type CreateNoticePayload = Omit<NoticeItem, "id" | "createdAt">;

export type UpdateNoticePayload = Pick<NoticeItem, "id"> &
  Partial<Omit<NoticeItem, "id" | "createdAt">>;

export const getNoticeList = (data: NoticeListParams) => {
  return http.request<BaseResult<PageResult<NoticeItem>>>(
    "post",
    "/notice/list",
    { data }
  );
};

export const createNotice = (data: CreateNoticePayload) => {
  return http.request<BaseResult<NoticeItem | EmptyData>>(
    "post",
    "/notice/create",
    { data }
  );
};

export const updateNotice = (data: UpdateNoticePayload) => {
  return http.request<BaseResult<NoticeItem | EmptyData>>(
    "post",
    "/notice/update",
    { data }
  );
};

export const deleteNotice = (data: { id: number }) => {
  return http.request<BaseResult<EmptyData>>("post", "/notice/delete", {
    data
  });
};

export const batchDeleteNotices = (data: { ids: number[] }) => {
  return http.request<BaseResult<EmptyData>>("post", "/notice/batchDelete", {
    data
  });
};
