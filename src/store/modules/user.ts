import { defineStore } from "pinia";
import {
  type userType,
  store,
  router,
  resetRouter,
  routerArrays,
  storageLocal
} from "../utils";
import {
  getCurrentUser,
  getLogin,
  type CurrentUser,
  type UserResult
} from "@/api/user";
import { getAvatarList } from "@/api/avatar";
import { useMultiTagsStoreHook } from "./multiTags";
import { type DataInfo, setToken, removeToken, userKey } from "@/utils/auth";
import { ensureImageDataUrl } from "@/utils/image";

export const useUserStore = defineStore("pure-user", {
  state: (): userType => ({
    // 头像
    avatar: storageLocal().getItem<DataInfo<number>>(userKey)?.avatar ?? "",
    avatarSrc:
      storageLocal().getItem<DataInfo<number>>(userKey)?.avatarSrc ?? "",
    // 用户名
    username: storageLocal().getItem<DataInfo<number>>(userKey)?.username ?? "",
    // 昵称
    nickname: storageLocal().getItem<DataInfo<number>>(userKey)?.nickname ?? "",
    // 页面级别权限
    roles: storageLocal().getItem<DataInfo<number>>(userKey)?.roles ?? [],
    // 按钮级别权限
    permissions:
      storageLocal().getItem<DataInfo<number>>(userKey)?.permissions ?? [],
    profile: storageLocal().getItem<DataInfo<number>>(userKey)?.profile ?? null,
    // 是否勾选了登录页的免登录
    isRemembered: false,
    // 登录页的免登录存储几天，默认7天
    loginDay: 7
  }),
  actions: {
    /** 存储头像 */
    SET_AVATAR(avatar: string) {
      this.avatar = avatar;
    },
    SET_AVATAR_SRC(avatarSrc: string) {
      this.avatarSrc = avatarSrc;
    },
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username;
    },
    /** 存储昵称 */
    SET_NICKNAME(nickname: string) {
      this.nickname = nickname;
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles;
    },
    /** 存储按钮级别权限 */
    SET_PERMS(permissions: Array<string>) {
      this.permissions = permissions;
    },
    SET_PROFILE(profile: CurrentUser | null) {
      this.profile = profile;
    },
    /** 存储是否勾选了登录页的免登录 */
    SET_ISREMEMBERED(bool: boolean) {
      this.isRemembered = bool;
    },
    /** 设置登录页的免登录存储几天 */
    SET_LOGINDAY(value: number) {
      this.loginDay = Number(value);
    },
    /** 登入 */
    async loginByUsername(data: {
      account: string;
      password: string;
    }): Promise<UserResult> {
      const res = await getLogin(data);
      if (res?.token) {
        setToken(res);
        await this.fetchCurrentUser().catch(() => null);
      }
      return res;
    },

    async fetchCurrentUser(): Promise<CurrentUser | null> {
      const user = await getCurrentUser({});
      this.SET_PROFILE(user);

      const stored = storageLocal().getItem<DataInfo<number>>(userKey);
      if (stored) {
        storageLocal().setItem(userKey, {
          ...stored,
          profile: user
        });
      }

      if (!user) return null;

      this.SET_AVATAR(user.avatar);
      this.SET_USERNAME(user.username);
      this.SET_NICKNAME(user.nickname);
      this.SET_ROLES(user.role ? [user.role] : []);
      this.SET_PERMS(user.role === "admin" ? ["*:*:*"] : []);

      await this.ensureAvatarSrc();

      const storedAfter = storageLocal().getItem<DataInfo<number>>(userKey);

      if (storedAfter) {
        storageLocal().setItem(userKey, {
          ...storedAfter,
          avatar: user.avatar,
          avatarSrc: this.avatarSrc,
          username: user.username,
          nickname: user.nickname,
          roles: user.role ? [user.role] : (storedAfter.roles ?? []),
          permissions: user.role === "admin" ? ["*:*:*"] : [],
          profile: user
        });
      }

      return user;
    },
    async ensureAvatarSrc(): Promise<string> {
      const avatar = String(this.avatar ?? "").trim();

      if (!avatar) {
        this.SET_AVATAR_SRC("");
        const stored = storageLocal().getItem<DataInfo<number>>(userKey);
        if (stored) {
          storageLocal().setItem(userKey, { ...stored, avatarSrc: "" });
        }
        return "";
      }

      const directSrc =
        avatar.startsWith("data:") || /^https?:\/\//i.test(avatar);
      if (directSrc) {
        this.SET_AVATAR_SRC(avatar);
        const stored = storageLocal().getItem<DataInfo<number>>(userKey);
        if (stored) {
          storageLocal().setItem(userKey, { ...stored, avatarSrc: avatar });
        }
        return avatar;
      }

      const cachedSrc = String(this.avatarSrc ?? "").trim();
      if (
        cachedSrc &&
        (cachedSrc.startsWith("data:") || /^https?:\/\//i.test(cachedSrc))
      ) {
        return cachedSrc;
      }

      const isAvatarId = /^LD\d{4}[A-Z]{4}$/.test(avatar);
      if (!isAvatarId) {
        this.SET_AVATAR_SRC("");
        const stored = storageLocal().getItem<DataInfo<number>>(userKey);
        if (stored) {
          storageLocal().setItem(userKey, { ...stored, avatarSrc: "" });
        }
        return "";
      }

      try {
        const role =
          String(this.profile?.role ?? "").trim() ||
          String(this.roles?.[0] ?? "").trim();
        const includeDisabled = role === "admin" || role === "moderator";

        const res = await getAvatarList({
          page: 1,
          pageSize: 1000,
          ...(includeDisabled ? { includeDisabled: true } : {})
        });
        const found = res.list.find(item => item.avatarId === avatar);
        const src = found?.imageBase64
          ? ensureImageDataUrl(found.imageBase64)
          : "";

        this.SET_AVATAR_SRC(src);
        const stored = storageLocal().getItem<DataInfo<number>>(userKey);
        if (stored) {
          storageLocal().setItem(userKey, { ...stored, avatarSrc: src });
        }
        return src;
      } catch {
        this.SET_AVATAR_SRC("");
        const stored = storageLocal().getItem<DataInfo<number>>(userKey);
        if (stored) {
          storageLocal().setItem(userKey, { ...stored, avatarSrc: "" });
        }
        return "";
      }
    },
    /** 前端登出（不调用接口） */
    logOut() {
      this.username = "";
      this.roles = [];
      this.permissions = [];
      this.profile = null;
      removeToken();
      useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
      resetRouter();
      router.push("/login");
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}
