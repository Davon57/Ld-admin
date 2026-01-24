import { http } from "@/utils/http";

export type RoleItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  isEnabled: boolean;
  updatedAt: string;
};

export type RoleListParams = {
  code?: string;
  nameKeyword?: string;
  isEnabled?: boolean;
};

export type RoleListResult = {
  list: RoleItem[];
};

export const getRoleList = async (
  data: RoleListParams = {}
): Promise<RoleListResult> => {
  return http.request<RoleListResult>("post", "/roles", { data });
};

export type CreateRolePayload = {
  code: string;
  name?: string;
  description?: string;
  isEnabled?: boolean;
};

export const createRole = async (
  data: CreateRolePayload
): Promise<RoleItem> => {
  return http.request<RoleItem>(
    "post",
    "/roles/create",
    { data },
    { showSuccessMessage: true }
  );
};

export type UpdateRolePayload = {
  code: string;
  name?: string;
  description?: string;
  isEnabled?: boolean;
};

export const updateRole = async (
  data: UpdateRolePayload
): Promise<RoleItem> => {
  return http.request<RoleItem>(
    "post",
    "/roles/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteRole = async (data: {
  code: string;
}): Promise<{ ok: boolean }> => {
  return http.request<{ ok: boolean }>(
    "post",
    "/roles/delete",
    { data },
    { showSuccessMessage: true }
  );
};
