import { http } from "@/utils/http";

export type Status = 0 | 1;

export type EmptyData = Record<string, never>;

export type PageResult<T> = {
  list: T[];
  total: number;
};

export type OtaTypeItem = {
  id: number;
  name: string;
  code: string;
  status: Status;
  createdAt: string;
};

export type OtaContentItem = {
  id: number;
  typeId: number;
  version: string;
  title: string;
  vehicleModelVersion: string;
  packageSize: string;
  releaseAt: string;
  status: Status;
  content: string;
  createdAt: string;
};

export type OtaTypeListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

export type OtaContentListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
  typeId?: number;
};

export type CreateOtaTypePayload = Omit<OtaTypeItem, "id" | "createdAt">;

export type UpdateOtaTypePayload = Pick<OtaTypeItem, "id"> &
  Partial<Omit<OtaTypeItem, "id" | "createdAt">>;

export const getOtaTypeList = (data: OtaTypeListParams) => {
  return http.request<PageResult<OtaTypeItem>>("post", "/ota/type/list", {
    data
  });
};

export const createOtaType = (data: CreateOtaTypePayload) => {
  return http.request<OtaTypeItem | EmptyData>(
    "post",
    "/ota/type/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateOtaType = (data: UpdateOtaTypePayload) => {
  return http.request<OtaTypeItem | EmptyData>(
    "post",
    "/ota/type/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteOtaType = (data: { id: number }) => {
  return http.request<EmptyData>(
    "post",
    "/ota/type/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const batchDeleteOtaTypes = (data: { ids: number[] }) => {
  return http.request<EmptyData>(
    "post",
    "/ota/type/batchDelete",
    { data },
    { showSuccessMessage: true }
  );
};

export type CreateOtaContentPayload = Omit<OtaContentItem, "id" | "createdAt">;

export type UpdateOtaContentPayload = Pick<OtaContentItem, "id"> &
  Partial<Omit<OtaContentItem, "id" | "createdAt">>;

export const getOtaContentList = (data: OtaContentListParams) => {
  return http.request<PageResult<OtaContentItem>>("post", "/ota/content/list", {
    data
  });
};

export const createOtaContent = (data: CreateOtaContentPayload) => {
  return http.request<OtaContentItem | EmptyData>(
    "post",
    "/ota/content/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateOtaContent = (data: UpdateOtaContentPayload) => {
  return http.request<OtaContentItem | EmptyData>(
    "post",
    "/ota/content/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteOtaContent = (data: { id: number }) => {
  return http.request<EmptyData>(
    "post",
    "/ota/content/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const batchDeleteOtaContents = (data: { ids: number[] }) => {
  return http.request<EmptyData>(
    "post",
    "/ota/content/batchDelete",
    {
      data
    },
    { showSuccessMessage: true }
  );
};
