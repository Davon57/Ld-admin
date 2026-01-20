import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type DeleteResult = {
  ok: boolean;
};

export type MedalType = {
  id: string;
  medalTypeId: string;
  name: string;
  description: string;
  isEnabled: boolean;
  updatedAt: string;
};

export type MedalTypeListParams = {
  medalTypeId?: string;
  nameKeyword?: string;
  isEnabled?: boolean;
};

export type MedalTypeListResult = {
  list: MedalType[];
};

export type CreateMedalTypePayload = {
  name: string;
  description?: string;
  isEnabled?: boolean;
};

export type UpdateMedalTypePayload = {
  medalTypeId: string;
  name?: string;
  description?: string;
  isEnabled?: boolean;
};

export const getMedalTypeList = (data: MedalTypeListParams = {}) => {
  return http.request<MedalTypeListResult>("post", "/medal-types", { data });
};

export const createMedalType = (data: CreateMedalTypePayload) => {
  return http.request<MedalType>(
    "post",
    "/medal-types/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateMedalType = (data: UpdateMedalTypePayload) => {
  return http.request<MedalType>(
    "post",
    "/medal-types/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteMedalType = (data: { medalTypeId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/medal-types/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type Medal = {
  id: string;
  medalId: string;
  medalTypeId: string;
  name: string;
  description: string;
  iconBase64: string;
  isEnabled: boolean;
  updatedAt: string;
};

export type MedalListParams = {
  page?: number;
  pageSize?: number;
  medalTypeId?: string;
  nameKeyword?: string;
  isEnabled?: boolean;
};

export type CreateMedalPayload = {
  medalTypeId: string;
  name: string;
  description?: string;
  iconBase64: string;
  isEnabled?: boolean;
};

export type UpdateMedalPayload = {
  medalId: string;
  medalTypeId?: string;
  name?: string;
  description?: string;
  iconBase64?: string;
  isEnabled?: boolean;
};

export const getMedalList = (data: MedalListParams) => {
  return http.request<PageData<Medal>>("post", "/medals", { data });
};

export const createMedal = (data: CreateMedalPayload) => {
  return http.request<Medal>(
    "post",
    "/medals/create",
    { data },
    {
      showSuccessMessage: true
    }
  );
};

export const updateMedal = (data: UpdateMedalPayload) => {
  return http.request<Medal>(
    "post",
    "/medals/update",
    { data },
    {
      showSuccessMessage: true
    }
  );
};

export const deleteMedal = (data: { medalId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/medals/delete",
    { data },
    {
      showSuccessMessage: true
    }
  );
};

export type GrantMedalPayload = {
  userId: string;
  medalId: string;
  reason?: string;
};

export type GrantResult = {
  ok: boolean;
  granted: boolean;
  alreadyOwned: boolean;
};

export const grantMedal = (data: GrantMedalPayload) => {
  return http.request<GrantResult>(
    "post",
    "/medals/grant",
    { data },
    {
      showSuccessMessage: true
    }
  );
};

export type MedalGrantLog = {
  id: string;
  userId: string;
  medalId: string;
  operatorUserId: string | null;
  sourceType: string;
  reason: string;
  createdAt: string;
};

export type MedalGrantLogListParams = {
  page?: number;
  pageSize?: number;
  userId?: string;
  medalId?: string;
  sourceType?: string;
};

export const getMedalGrantLogs = (data: MedalGrantLogListParams) => {
  return http.request<PageData<MedalGrantLog>>("post", "/medal-grant-logs", {
    data
  });
};
