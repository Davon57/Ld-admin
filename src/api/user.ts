import { http } from "@/utils/http";

export type UserResult = {
  success: boolean;
  data: {
    /** 头像 */
    avatar: string;
    /** 用户名 */
    username: string;
    /** 昵称 */
    nickname: string;
    /** 当前登录用户的角色 */
    roles: Array<string>;
    /** 按钮级别权限 */
    permissions: Array<string>;
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type RefreshTokenResult = {
  success: boolean;
  data: {
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type UserRole = "admin" | "common";
export type UserStatus = 0 | 1;

export type UserItem = {
  id: number;
  username: string;
  nickname: string;
  phone: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
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

export type BaseResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type EmptyData = Record<string, never>;

/** 登录 */
export const getLogin = (data?: object) => {
  return http.request<UserResult>("post", "/login", { data });
};

/** 刷新`token` */
export const refreshTokenApi = (data?: object) => {
  return http.request<RefreshTokenResult>("post", "/refresh-token", { data });
};

export const getUserList = (data: UserListParams) => {
  return http.request<BaseResult<PageResult<UserItem>>>("post", "/user/list", {
    data
  });
};

export type CreateUserPayload = Omit<UserItem, "id" | "createdAt"> & {
  password?: string;
};

export const createUser = (data: CreateUserPayload) => {
  return http.request<BaseResult<UserItem | EmptyData>>(
    "post",
    "/user/create",
    {
      data
    }
  );
};

export type UpdateUserPayload = Pick<UserItem, "id"> &
  Partial<Omit<UserItem, "id" | "createdAt">>;

export const updateUser = (data: UpdateUserPayload) => {
  return http.request<BaseResult<UserItem | EmptyData>>(
    "post",
    "/user/update",
    {
      data
    }
  );
};

export const deleteUser = (data: { id: number }) => {
  return http.request<BaseResult<EmptyData>>("post", "/user/delete", { data });
};

export const batchDeleteUsers = (data: { ids: number[] }) => {
  return http.request<BaseResult<EmptyData>>("post", "/user/batchDelete", {
    data
  });
};
