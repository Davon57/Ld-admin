import { http } from "@/utils/http";

export type UserResult = {
  token: string;
  user: {
    id: string;
    userId: string;
    username: string;
    nickname: string;
    avatar: string;
    city: string;
    email: string;
    phone: string | null;
    role: "user" | "admin" | "moderator";
    mustChangePassword: boolean;
  };
};

export type BootstrapStatusResult = {
  bootstrapEnabled: boolean;
  adminExists: boolean;
  needsBootstrap: boolean;
};

export type BootstrapInitPayload = {
  token?: string | null;
  username: string;
  email?: string | null;
  password: string;
};

export type BootstrapInitResult = {
  id: string;
  username: string;
  email: string;
  role: "admin";
  mustChangePassword: boolean;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResult = {
  ok: true;
};

export type CurrentUser = {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  avatar: string;
  city: string;
  email: string;
  phone: string | null;
  role: "user" | "admin" | "moderator";
  status: "active" | "inactive" | "banned";
};

export type UserRole = "user" | "admin" | "moderator";
export type UserStatus = "active" | "inactive" | "banned";

export type UserItem = {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  avatar: string;
  city: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
};

export type UserListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: UserStatus;
  role?: UserRole;
};

export type PageResult<T> = {
  list: T[];
  total: number;
};

export type EmptyData = Record<string, never>;

/** 登录 */
export const getLogin = (data?: {
  account?: string;
  username?: string;
  identifier?: string;
  password: string;
}) => {
  return http.request<UserResult>("post", "/auth/login", { data });
};

export const getBootstrapStatus = (data: Record<string, never> = {}) => {
  return http.request<BootstrapStatusResult>(
    "post",
    "/system/bootstrap/status",
    {
      data
    }
  );
};

export const bootstrapInit = (data: BootstrapInitPayload) => {
  return http.request<BootstrapInitResult>("post", "/system/bootstrap/init", {
    data
  });
};

export const changePassword = (data: ChangePasswordPayload) => {
  return http.request<ChangePasswordResult>("post", "/users/change-password", {
    data
  });
};

export const getCurrentUser = (data: Record<string, never> = {}) => {
  return http.request<CurrentUser | null>("post", "/users/me", { data });
};

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function matchKeyword(user: UserItem, keyword: string): boolean {
  const k = normalizeText(keyword);
  if (!k) return true;
  const values = [
    user.username,
    user.nickname,
    user.email,
    user.phone ?? "",
    user.city
  ];
  return values.some(v => normalizeText(String(v)).includes(k));
}

export const getUserList = async (
  data: UserListParams
): Promise<PageResult<UserItem>> => {
  const users = await http.request<UserItem[]>("post", "/users", { data: {} });

  const filtered = users
    .filter(u => matchKeyword(u, data.keyword ?? ""))
    .filter(u => (data.role ? u.role === data.role : true))
    .filter(u => (data.status ? u.status === data.status : true));

  const page = Math.max(1, Number(data.page || 1));
  const pageSize = Math.max(1, Number(data.pageSize || 10));
  const start = (page - 1) * pageSize;
  const list = filtered.slice(start, start + pageSize);

  return { list, total: filtered.length };
};

export type CreateUserPayload = {
  username: string;
  password: string;
  email?: string | null;
  avatar?: string;
  nickname?: string;
  city?: string;
  phone?: string | null;
  role?: UserRole;
  status?: UserStatus;
};

export const createUser = async (
  data: CreateUserPayload
): Promise<UserItem> => {
  return http.request<UserItem>(
    "post",
    "/users/create",
    { data },
    { showSuccessMessage: true }
  );
};

export type UpdateUserPayload = {
  userId: string;
  avatar?: string;
  nickname?: string;
  city?: string;
  email?: string | null;
  phone?: string | null;
  role?: UserRole;
  status?: UserStatus;
};

export const updateUser = async (
  data: UpdateUserPayload
): Promise<UserItem> => {
  return http.request<UserItem>(
    "post",
    "/users/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteUser = async (data: {
  userId: string;
}): Promise<{ ok: boolean }> => {
  return http.request<{ ok: boolean }>(
    "post",
    "/users/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type BatchDeleteUsersResult = {
  failedCount: number;
};

export const batchDeleteUsers = async (data: {
  userIds: string[];
}): Promise<BatchDeleteUsersResult> => {
  const results = await Promise.allSettled(
    data.userIds.map(userId =>
      http.request<{ ok: boolean }>(
        "post",
        "/users/delete",
        { data: { userId } },
        { showSuccessMessage: false }
      )
    )
  );

  const rejectedCount = results.filter(r => r.status === "rejected").length;
  const okFalseCount = results
    .filter(r => r.status === "fulfilled")
    .filter(r => !r.value?.ok).length;

  return { failedCount: rejectedCount + okFalseCount };
};

export const getUserDetail = (data: { userId: string }) => {
  return http.request<UserItem>("post", "/users/detail", { data });
};
