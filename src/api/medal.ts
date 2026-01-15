import { http } from "@/utils/http";

export type Status = 0 | 1;

export type EmptyData = Record<string, never>;

export type PageResult<T> = {
  list: T[];
  total: number;
};

export type MedalTypeItem = {
  id: number;
  name: string;
  code: string;
  status: Status;
  createdAt: string;
};

export type MedalItem = {
  id: number;
  typeId: number;
  name: string;
  code: string;
  description: string;
  status: Status;
  createdAt: string;
};

export type MedalTypeListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

export type MedalItemListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
  typeId?: number;
};

export type CreateMedalTypePayload = Omit<MedalTypeItem, "id" | "createdAt">;

export type UpdateMedalTypePayload = Pick<MedalTypeItem, "id"> &
  Partial<Omit<MedalTypeItem, "id" | "createdAt">>;

export const getMedalTypeList = (data: MedalTypeListParams) => {
  return http.request<PageResult<MedalTypeItem>>("post", "/medal/type/list", {
    data
  });
};

export const createMedalType = (data: CreateMedalTypePayload) => {
  return http.request<MedalTypeItem | EmptyData>(
    "post",
    "/medal/type/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateMedalType = (data: UpdateMedalTypePayload) => {
  return http.request<MedalTypeItem | EmptyData>(
    "post",
    "/medal/type/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteMedalType = (data: { id: number }) => {
  return http.request<EmptyData>(
    "post",
    "/medal/type/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const batchDeleteMedalTypes = (data: { ids: number[] }) => {
  return http.request<EmptyData>(
    "post",
    "/medal/type/batchDelete",
    { data },
    { showSuccessMessage: true }
  );
};

export type CreateMedalItemPayload = Omit<MedalItem, "id" | "createdAt">;

export type UpdateMedalItemPayload = Pick<MedalItem, "id"> &
  Partial<Omit<MedalItem, "id" | "createdAt">>;

export const getMedalItemList = (data: MedalItemListParams) => {
  return http.request<PageResult<MedalItem>>("post", "/medal/item/list", {
    data
  });
};

export const createMedalItem = (data: CreateMedalItemPayload) => {
  return http.request<MedalItem | EmptyData>(
    "post",
    "/medal/item/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateMedalItem = (data: UpdateMedalItemPayload) => {
  return http.request<MedalItem | EmptyData>(
    "post",
    "/medal/item/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteMedalItem = (data: { id: number }) => {
  return http.request<EmptyData>(
    "post",
    "/medal/item/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const batchDeleteMedalItems = (data: { ids: number[] }) => {
  return http.request<EmptyData>(
    "post",
    "/medal/item/batchDelete",
    { data },
    { showSuccessMessage: true }
  );
};
