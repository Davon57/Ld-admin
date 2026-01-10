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

export type ActivityItem = {
  id: number;
  name: string;
  description: string;
  status: Status;
  startAt: string;
  endAt: string;
  createdAt: string;
};

export type ActivityListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

export type CreateActivityPayload = Omit<ActivityItem, "id" | "createdAt">;

export type UpdateActivityPayload = Pick<ActivityItem, "id"> &
  Partial<Omit<ActivityItem, "id" | "createdAt">>;

export const getActivityList = (data: ActivityListParams) => {
  return http.request<BaseResult<PageResult<ActivityItem>>>(
    "post",
    "/activity/list",
    { data }
  );
};

export const createActivity = (data: CreateActivityPayload) => {
  return http.request<BaseResult<ActivityItem | EmptyData>>(
    "post",
    "/activity/create",
    { data }
  );
};

export const updateActivity = (data: UpdateActivityPayload) => {
  return http.request<BaseResult<ActivityItem | EmptyData>>(
    "post",
    "/activity/update",
    { data }
  );
};

export const deleteActivity = (data: { id: number }) => {
  return http.request<BaseResult<EmptyData>>("post", "/activity/delete", {
    data
  });
};

export const batchDeleteActivities = (data: { ids: number[] }) => {
  return http.request<BaseResult<EmptyData>>("post", "/activity/batchDelete", {
    data
  });
};
