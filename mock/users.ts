import { defineFakeRoute } from "vite-plugin-fake-server/client";

type UserRole = "admin" | "common";
type UserStatus = 0 | 1;

type UserItem = {
  id: number;
  username: string;
  nickname: string;
  phone: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

type UserListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: UserStatus;
  role?: UserRole;
};

type BaseResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type EmptyData = Record<string, never>;

type PageResult<T> = {
  list: T[];
  total: number;
};

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function matchKeyword(user: UserItem, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k) return true;
  return (
    user.username.toLowerCase().includes(k) ||
    user.nickname.toLowerCase().includes(k) ||
    user.phone.toLowerCase().includes(k) ||
    user.email.toLowerCase().includes(k)
  );
}

const initialUsers: UserItem[] = Array.from({ length: 28 }).map((_, idx) => {
  const id = idx + 1;
  const role: UserRole = id % 7 === 0 ? "admin" : "common";
  const status: UserStatus = id % 6 === 0 ? 0 : 1;
  return {
    id,
    username: `user_${pad2(id)}`,
    nickname: `用户${id}`,
    phone: `1380000${pad2(id)}${pad2((id * 3) % 100)}`,
    email: `user_${pad2(id)}@example.com`,
    role,
    status,
    createdAt: formatDateTime(new Date(Date.now() - id * 36e5))
  };
});

let users: UserItem[] = [...initialUsers];
let nextId = users.reduce((max, u) => Math.max(max, u.id), 0) + 1;

export default defineFakeRoute([
  {
    url: "/user/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<UserItem>> => {
      const params = body as UserListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;
      const role = params?.role;

      const filtered = users
        .filter(u => matchKeyword(u, keyword))
        .filter(u => (typeof status === "number" ? u.status === status : true))
        .filter(u => (role ? u.role === role : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const list = filtered.slice(start, end);

      return {
        success: true,
        data: {
          list,
          total
        }
      };
    }
  },
  {
    url: "/user/create",
    method: "post",
    response: ({ body }): BaseResult<UserItem | EmptyData> => {
      const payload = body as Partial<UserItem> & { password?: string };
      const username = String(payload?.username || "").trim();
      if (!username) {
        return { success: false, data: {}, message: "用户名不能为空" };
      }
      const exists = users.some(u => u.username === username);
      if (exists) {
        return { success: false, data: {}, message: "用户名已存在" };
      }
      const nickname = String(payload?.nickname || "").trim();
      if (!nickname) {
        return { success: false, data: {}, message: "昵称不能为空" };
      }

      const role = (payload?.role || "common") as UserRole;
      const status = (payload?.status ?? 1) as UserStatus;
      const phone = String(payload?.phone || "");
      const email = String(payload?.email || "");

      const newUser: UserItem = {
        id: nextId++,
        username,
        nickname,
        role,
        status,
        phone,
        email,
        createdAt: formatDateTime(new Date())
      };
      users = [newUser, ...users];
      return { success: true, data: newUser };
    }
  },
  {
    url: "/user/update",
    method: "post",
    response: ({ body }): BaseResult<UserItem | EmptyData> => {
      const payload = body as Partial<UserItem> & { id: number };
      const id = Number(payload?.id);
      const index = users.findIndex(u => u.id === id);
      if (index === -1) {
        return { success: false, data: {}, message: "用户不存在" };
      }

      const current = users[index];
      const nickname =
        typeof payload.nickname === "string"
          ? payload.nickname
          : current.nickname;
      const role = (payload.role ?? current.role) as UserRole;
      const status = (payload.status ?? current.status) as UserStatus;
      const phone =
        typeof payload.phone === "string" ? payload.phone : current.phone;
      const email =
        typeof payload.email === "string" ? payload.email : current.email;

      const updated: UserItem = {
        ...current,
        nickname,
        role,
        status,
        phone,
        email
      };
      users = users.map(u => (u.id === id ? updated : u));
      return { success: true, data: updated };
    }
  },
  {
    url: "/user/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = users.some(u => u.id === id);
      if (!exists) {
        return { success: false, data: {}, message: "用户不存在" };
      }
      users = users.filter(u => u.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/user/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0) {
        return { success: false, data: {}, message: "ids 不能为空" };
      }
      users = users.filter(u => !ids.includes(u.id));
      return { success: true, data: {} };
    }
  }
]);
