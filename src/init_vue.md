# 初始化 / 登录注册 对接说明（Vue）

本文件面向前端（Vue）用于对接当前后端的“登录/注册 + 自举初始化（bootstrap）”能力。

后端技术栈：Koa 2 + koa-router + koa-jwt + Joi + Sequelize。

> 注意：当前后端尚未全量切换到 `.trae/rules/api.md` 中定义的“统一响应格式”。
> 本文档以“当前项目实际返回结构”为准。

---

## 0. 基础约定

### 0.1 Base URL

- 开发环境默认：`http://localhost:3000`

### 0.2 请求方式

- 全部接口仅支持 `POST`（无 GET）
- Content-Type：`application/json`

### 0.3 鉴权

需要登录的接口在请求头带：

```
Authorization: Bearer <token>
```

`token` 由 `POST /auth/login` 返回。

### 0.4 错误返回（通用）

当前项目的错误返回大致分两类：

1. 业务/服务层抛错（由 `errorHandler` 统一兜底）

```json
{ "error": "Invalid credentials" }
```

2. Joi 参数校验失败（由 `validator` 中间件直接返回）

HTTP 400：

```json
{
  "error": "ValidationError",
  "details": [{ "message": "\"password\" is required", "path": ["password"] }]
}
```

### 0.5 常见 HTTP 状态码

- 200：成功
- 201：创建成功
- 400：参数校验失败（Joi）
- 401：未登录 / token 无效（koa-jwt） 或密码错误
- 403：无权限 / 自举被禁用 / 自举 token 不匹配
- 404：路由不存在 / 资源不存在
- 409：资源冲突（如已初始化、用户已存在）
- 428：必须先修改密码（首次登录/自举策略）
- 429：请求过多（bootstrap init 限流）
- 500：服务端错误

---

## 1. 首次安装/部署的推荐对接流程

### 1.1 启动时检查是否需要自举

1. 调用 `POST /system/bootstrap/status`
2. 若返回 `needsBootstrap=true`：进入“初始化管理员”页面/弹窗
3. 初始化成功后：进入登录页

### 1.2 登录后处理“首次登录必须改密”

`POST /auth/login` 返回的 `user.mustChangePassword` 可能为 `true`。

- 若为 `true`：
  - 允许访问 `/users/me`（用来渲染个人信息）
  - 允许访问 `/users/change-password`（用于改密）
  - 其它所有“需要登录的业务接口”都会返回 HTTP 428：

```json
{ "error": "Password change required" }
```

前端建议逻辑：

- 登录后如果 `mustChangePassword=true`，立即跳转到“修改密码”页，并在改密成功后再放开业务路由。

---

## 2. 接口：用户注册

### 2.1 接口信息

- 路由：`POST /auth/register`
- 是否需要登录：否

### 2.2 参数（Body）

| 字段     | 类型   | 必填 | 校验  | 说明   |
| -------- | ------ | ---- | ----- | ------ |
| username | string | 是   | 3-50  | 用户名 |
| password | string | 是   | 6-100 | 密码   |

请求示例：

```json
{
  "username": "zhangsan",
  "password": "123456"
}
```

### 2.3 返回（Success 201）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "zhangsan"
}
```

### 2.4 可能的错误

- 400 ValidationError：参数不符合校验规则
- 409 User already exists：用户名或邮箱重复（注册时后端会按 `username` 和默认 email 推断做重复检查）

---

## 3. 接口：用户登录

### 3.1 接口信息

- 路由：`POST /auth/login`
- 是否需要登录：否

### 3.2 参数（Body）

该接口兼容多个字段名，后端会取 `account || username || identifier` 作为登录键。

| 字段       | 类型   | 必填   | 说明                          |
| ---------- | ------ | ------ | ----------------------------- |
| account    | string | 三选一 | 推荐使用（账号：用户名/邮箱） |
| username   | string | 三选一 | 兼容字段                      |
| identifier | string | 三选一 | 兼容字段                      |
| password   | string | 是     | 密码                          |

请求示例（推荐）：

```json
{
  "account": "admin",
  "password": "admin123456"
}
```

### 3.3 返回（Success 200）

```json
{
  "token": "<jwt>",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "nickname": "",
    "avatar": "",
    "carModel": "",
    "city": "",
    "email": "admin@example.com",
    "phone": null,
    "role": "admin",
    "mustChangePassword": false
  }
}
```

字段说明：

| 字段                    | 类型                             | 说明                                          |
| ----------------------- | -------------------------------- | --------------------------------------------- |
| token                   | string                           | JWT token，后续请求放到 Authorization         |
| user.role               | 'user' \| 'admin' \| 'moderator' | 角色                                          |
| user.mustChangePassword | boolean                          | 是否必须先改密（自举创建的管理员默认为 true） |

### 3.4 可能的错误

- 400 ValidationError：参数校验失败
- 401 Invalid credentials：账号不存在或密码错误

---

## 4. 接口：自举状态（bootstrap）

用于“系统首次安装/部署后，没有超级管理员则初始化”的前端入口判断。

### 4.1 接口信息

- 路由：`POST /system/bootstrap/status`
- 是否需要登录：否

### 4.2 参数（Body）

- 无（可传 `{}`）

### 4.3 返回（Success 200）

```json
{
  "bootstrapEnabled": true,
  "adminExists": false,
  "needsBootstrap": true
}
```

字段说明：

| 字段             | 类型    | 说明                                                                   |
| ---------------- | ------- | ---------------------------------------------------------------------- |
| bootstrapEnabled | boolean | 是否启用自举机制（由环境变量控制）                                     |
| adminExists      | boolean | 当前数据库是否存在 `role=admin` 用户                                   |
| needsBootstrap   | boolean | `bootstrapEnabled && !adminExists`，前端一般据此决定是否展示初始化入口 |

---

## 5. 接口：自举初始化（创建首个管理员）

### 5.1 接口信息

- 路由：`POST /system/bootstrap/init`
- 是否需要登录：否
- 限流：按 IP 限流，60 秒最多 10 次，超过返回 429

### 5.2 参数（Body）

| 字段     | 类型           | 必填       | 校验         | 说明                                                           |
| -------- | -------------- | ---------- | ------------ | -------------------------------------------------------------- |
| token    | string \| null | 视配置而定 | -            | 若后端配置了 `BOOTSTRAP_TOKEN`，这里必须传同值；未配置则可不传 |
| username | string         | 是         | 3-50         | 管理员用户名                                                   |
| email    | string \| null | 否         | email/max100 | 不传时后端会生成 `@local.invalid`                              |
| password | string         | 是         | 8-100        | 初始密码（建议前端提示“仅用于首次登录，需立即改密”）           |

请求示例（无 token 场景）：

```json
{
  "username": "admin",
  "password": "admin123456",
  "email": "admin@example.com"
}
```

请求示例（有 token 场景）：

```json
{
  "token": "<BOOTSTRAP_TOKEN>",
  "username": "admin",
  "password": "admin123456",
  "email": "admin@example.com"
}
```

### 5.3 返回（Success 201）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "mustChangePassword": true
}
```

### 5.4 可能的错误

- 400 ValidationError：参数校验失败
- 403 Bootstrap disabled：后端关闭了自举
- 403 Forbidden：自举 token 不匹配（仅当后端配置 `BOOTSTRAP_TOKEN`）
- 409 Already initialized：已存在 admin，不能重复初始化
- 429 Too Many Requests：触发限流

---

## 6. （重要）接口：修改密码（首次登录改密）

自举创建的管理员默认 `mustChangePassword=true`。此时登录后需调用该接口改密，否则业务接口会被 428 拦截。

### 6.1 接口信息

- 路由：`POST /users/change-password`
- 是否需要登录：是

### 6.2 请求头

```
Authorization: Bearer <token>
```

### 6.3 参数（Body）

| 字段            | 类型   | 必填 | 校验  | 说明                             |
| --------------- | ------ | ---- | ----- | -------------------------------- |
| currentPassword | string | 是   | 6-100 | 当前密码（首次登录为初始化密码） |
| newPassword     | string | 是   | 8-100 | 新密码                           |

请求示例：

```json
{
  "currentPassword": "admin123456",
  "newPassword": "NewStrongPassw0rd"
}
```

### 6.4 返回（Success 200）

```json
{ "ok": true }
```

### 6.5 可能的错误

- 400 ValidationError：参数校验失败
- 401 Invalid credentials：当前密码错误

---

## 7. 前端对接建议（Vue）

### 7.1 建议的 TypeScript 类型（可直接拷贝）

```ts
export type UserRole = "user" | "admin" | "moderator";

export interface LoginUser {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  carModel: string;
  city: string;
  email: string;
  phone: string | null;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  token: string;
  user: LoginUser;
}

export interface BootstrapStatusResponse {
  bootstrapEnabled: boolean;
  adminExists: boolean;
  needsBootstrap: boolean;
}

export interface BootstrapInitResponse {
  id: string;
  username: string;
  email: string;
  role: "admin";
  mustChangePassword: boolean;
}
```

### 7.2 axios 调用示例（伪代码）

```ts
import axios from "axios";

const http = axios.create({
  baseURL: "http://localhost:3000",
  headers: { "Content-Type": "application/json" }
});

export async function bootstrapStatus(): Promise<BootstrapStatusResponse> {
  const { data } = await http.post("/system/bootstrap/status", {});
  return data;
}

export async function bootstrapInit(payload: {
  token?: string;
  username: string;
  email?: string;
  password: string;
}): Promise<BootstrapInitResponse> {
  const { data } = await http.post("/system/bootstrap/init", payload);
  return data;
}

export async function login(payload: {
  account: string;
  password: string;
}): Promise<LoginResponse> {
  const { data } = await http.post("/auth/login", payload);
  return data;
}

export async function changePassword(
  token: string,
  payload: {
    currentPassword: string;
    newPassword: string;
  }
): Promise<{ ok: true }> {
  const { data } = await http.post("/users/change-password", payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}
```

### 7.3 路由守卫建议

建议在前端维护一个 `mustChangePassword` 状态：

- `mustChangePassword=true` 时：
  - 只允许进入“修改密码页 / 个人中心页（可选）”
  - 业务页统一重定向到改密页
- 若接口返回 428：直接重定向到改密页（兼容服务端强制策略）

---

## 8. 自举相关的后端配置项（供联调排查）

| 环境变量          | 默认值   | 说明                                                         |
| ----------------- | -------- | ------------------------------------------------------------ |
| BOOTSTRAP_ENABLED | true     | 是否启用自举机制；关闭后 `/system/bootstrap/init` 会返回 403 |
| BOOTSTRAP_TOKEN   | (未设置) | 若设置，则初始化时必须提供同值 token，否则 403               |
