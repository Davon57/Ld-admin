import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type VersionUpdate = {
  versionUpdateId: string;
  versionName: string;
  versionCode: number | null;
  releaseAt: string;
  content: string;
  seq: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VersionUpdateListParams = {
  page?: number;
  pageSize?: number;
  isEnabled?: boolean;
  versionKeyword?: string;
  versionUpdateId?: string;
};

export type VersionUpdateListResult = PageData<VersionUpdate>;

export type CreateVersionUpdatePayload = {
  versionName: string;
  versionCode?: number | null;
  releaseAt: string;
  content: string;
  seq?: number;
  isEnabled?: boolean;
};

export type UpdateVersionUpdatePayload = {
  versionUpdateId: string;
} & Partial<Omit<CreateVersionUpdatePayload, "releaseAt">> & {
    releaseAt?: string;
  };

export type DeleteResult = {
  ok: boolean;
};

export const getVersionUpdateList = (data: VersionUpdateListParams = {}) => {
  return http.request<VersionUpdateListResult>("post", "/version-updates", {
    data
  });
};

export const createVersionUpdate = (data: CreateVersionUpdatePayload) => {
  return http.request<VersionUpdate>(
    "post",
    "/version-updates/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateVersionUpdate = (data: UpdateVersionUpdatePayload) => {
  return http.request<VersionUpdate>(
    "post",
    "/version-updates/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteVersionUpdate = (data: { versionUpdateId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/version-updates/delete",
    { data },
    { showSuccessMessage: true }
  );
};
