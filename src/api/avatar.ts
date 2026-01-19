import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type AvatarItem = {
  avatarId: string;
  imageBase64: string;
  description: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type AvatarListParams = {
  page: number;
  pageSize: number;
  includeDisabled?: boolean;
  isEnabled?: boolean;
};

export const getAvatarList = async (
  data: AvatarListParams
): Promise<PageData<AvatarItem>> => {
  return http.request<PageData<AvatarItem>>("post", "/avatars", { data });
};

export type CreateAvatarPayload = {
  imageBase64: string;
  description?: string;
  isEnabled?: boolean;
};

export const createAvatar = async (
  data: CreateAvatarPayload
): Promise<AvatarItem> => {
  return http.request<AvatarItem>(
    "post",
    "/avatars/create",
    { data },
    { showSuccessMessage: true }
  );
};

export type UpdateAvatarPayload = {
  avatarId: string;
  imageBase64?: string;
  description?: string;
  isEnabled?: boolean;
};

export const updateAvatar = async (
  data: UpdateAvatarPayload
): Promise<AvatarItem> => {
  return http.request<AvatarItem>(
    "post",
    "/avatars/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteAvatar = async (data: {
  avatarId: string;
}): Promise<{ ok: boolean }> => {
  return http.request<{ ok: boolean }>(
    "post",
    "/avatars/delete",
    { data },
    { showSuccessMessage: true }
  );
};
