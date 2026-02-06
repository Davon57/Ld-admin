# 接口清单（Vue 对接版）

基础信息：

- Base URL：`http://localhost:3000`
- 全部接口仅支持 `POST`（无 GET）
- Content-Type：`application/json`
- 鉴权：需要登录的接口在 Header 里带 `Authorization: Bearer <token>`

通用说明：

- 本项目所有接口返回值均采用统一结构：`{ code, message, data }`。
- 成功：`code='0'`、`message='success'`，`data` 为原业务返回数据（对象/数组等）。
- 失败：`code` 为 HTTP 状态码字符串（如 `'400'`/`'401'`/`'404'`/`'500'`），`message` 为明确错误描述，`data` 固定返回空数组 `[]`。
- 业务 ID（对外 ID）：统一为 10 位字符串，格式 `LD` + 4 位数字 + 4 位大写字母（示例：`LD0001ABCD`）。

---

## 1. 健康检查

**接口标题**：健康检查

**功能描述**：用于判断服务是否启动正常。

**接口路由**：`POST /health`

**参数（Body）**：

- 无

**返回值（Success 200）**：

| 字段    | 类型   | 说明           | 示例      |
| ------- | ------ | -------------- | --------- |
| code    | string | 状态码         | '0'       |
| message | string | 状态描述       | 'success' |
| data    | object | 数据（Health） | -         |

`data` 字段结构（Health）：

| 字段    | 类型    | 说明         | 示例 |
| ------- | ------- | ------------ | ---- |
| data.ok | boolean | 服务是否正常 | true |

---

## 2. 用户注册

**接口标题**：用户注册

**功能描述**：创建新用户账号。

**接口路由**：`POST /auth/register`

**参数（Body）**：

- `username`（string，必填）：用户名，长度 3-50
- `password`（string，必填）：密码，长度 6-100

**返回值（Success 201）**：

| 字段    | 类型   | 说明         | 示例      |
| ------- | ------ | ------------ | --------- |
| code    | string | 状态码       | '0'       |
| message | string | 状态描述     | 'success' |
| data    | object | 数据（User） | -         |

`data` 字段结构（User）：

| 字段          | 类型   | 说明                            | 示例       |
| ------------- | ------ | ------------------------------- | ---------- |
| data.userId   | string | 用户业务 ID（格式：LD####AAAA） | LD0001ABCD |
| data.username | string | 用户名                          | 张三       |

---

## 3. 用户登录

**接口标题**：用户登录

**功能描述**：使用账号 + 密码登录，返回 token。

**接口路由**：`POST /auth/login`

**参数（Body）**：

- `account`（string，必填）：账号（当前为用户名；后端也兼容 `username` / `identifier` 字段名）
- `password`（string，必填）：密码

**返回值（Success 200）**：

| 字段    | 类型   | 说明                | 示例      |
| ------- | ------ | ------------------- | --------- |
| code    | string | 状态码              | '0'       |
| message | string | 状态描述            | 'success' |
| data    | object | 数据（LoginResult） | -         |

`data` 字段结构（LoginResult）：

| 字段                         | 类型          | 说明                                  | 示例                                    |
| ---------------------------- | ------------- | ------------------------------------- | --------------------------------------- |
| data.token                   | string        | JWT token                             | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| data.user                    | object        | 用户信息                              | -                                       |
| data.user.userId             | string        | 用户业务 ID（格式：LD####AAAA）       | LD0001ABCD                              |
| data.user.username           | string        | 用户名                                | 张三                                    |
| data.user.nickname           | string        | 昵称                                  | 三哥                                    |
| data.user.avatar             | string        | 头像 ID（avatarId，格式：LD####AAAA） | LD0002EFGH                              |
| data.user.city               | string        | 所在城市                              | 北京                                    |
| data.user.email              | string \ null | 邮箱                                  | zhangsan@example.com                    |
| data.user.phone              | string \ null | 手机号                                | 13800138000                             |
| data.user.role               | string        | 角色（user/admin/moderator）          | user                                    |
| data.user.mustChangePassword | boolean       | 是否需要改密（首次登录/自举）         | false                                   |

---

## 3.1 系统自举状态（无需登录）

**接口标题**：系统自举状态

**功能描述**：判断系统是否已存在管理员；若未存在且启用自举，则前端展示初始化入口。

**接口路由**：`POST /system/bootstrap/status`

**参数（Body）**：

- 无

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                    | 示例      |
| ------- | ------ | ----------------------- | --------- |
| code    | string | 状态码                  | '0'       |
| message | string | 状态描述                | 'success' |
| data    | object | 数据（BootstrapStatus） | -         |

`data` 字段结构（BootstrapStatus）：

| 字段                  | 类型    | 说明                               | 示例  |
| --------------------- | ------- | ---------------------------------- | ----- |
| data.bootstrapEnabled | boolean | 是否启用自举机制（由环境变量控制） | true  |
| data.adminExists      | boolean | 是否已存在 admin                   | false |
| data.needsBootstrap   | boolean | 是否需要执行初始化                 | true  |

---

## 3.2 系统自举初始化（无需登录）

**接口标题**：系统自举初始化

**功能描述**：在不存在 admin 时创建首个管理员账号，并标记首次登录必须改密。

**接口路由**：`POST /system/bootstrap/init`

**参数（Body）**：

- `token`（string \ null，可选）：自举口令（当后端配置 `BOOTSTRAP_TOKEN` 时必填）
- `username`（string，必填）：管理员用户名，长度 3-50
- `email`（string \ null，可选）：邮箱；不传时后端会生成 `@local.invalid`
- `password`（string，必填）：初始密码，长度 8-100

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明                        | 示例      |
| ------- | ------ | --------------------------- | --------- |
| code    | string | 状态码                      | '0'       |
| message | string | 状态描述                    | 'success' |
| data    | object | 数据（BootstrapInitResult） | -         |

`data` 字段结构（BootstrapInitResult）：

| 字段                    | 类型    | 说明                            | 示例                |
| ----------------------- | ------- | ------------------------------- | ------------------- |
| data.userId             | string  | 用户业务 ID（格式：LD####AAAA） | LD0001ABCD          |
| data.username           | string  | 用户名                          | admin               |
| data.email              | string  | 邮箱                            | admin@local.invalid |
| data.role               | string  | 角色                            | admin               |
| data.mustChangePassword | boolean | 是否需要改密                    | true                |

---

## 4. 获取用户列表（需登录）

**接口标题**：用户列表

**功能描述**：获取用户列表，支持分页与筛选。

**接口路由**：`POST /users`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选）：关键词（对 username/nickname/city 做模糊匹配）
- `role`（string，可选）：角色 code（来自「9.6 获取角色列表」的 data.list[].code）
- `status`（string，可选）：状态（active/inactive/banned）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（UserListResult） | -         |

`data` 字段结构（UserListResult）：

| 字段          | 类型   | 说明               | 示例 |
| ------------- | ------ | ------------------ | ---- |
| data.list     | array  | 用户列表（User[]） | -    |
| data.page     | number | 当前页码           | 1    |
| data.pageSize | number | 每页条数           | 10   |
| data.total    | number | 总条数             | 100  |

`data.list` 字段结构（User[]）：

| 字段                  | 类型          | 说明                                  | 示例                 |
| --------------------- | ------------- | ------------------------------------- | -------------------- |
| data.list[].userId    | string        | 用户业务 ID（格式：LD####AAAA）       | LD0001ABCD           |
| data.list[].username  | string        | 用户名                                | 张三                 |
| data.list[].nickname  | string        | 昵称                                  | 三哥                 |
| data.list[].avatar    | string        | 头像 ID（avatarId，格式：LD####AAAA） | LD0002EFGH           |
| data.list[].city      | string        | 所在城市                              | 北京                 |
| data.list[].email     | string \ null | 邮箱                                  | zhangsan@example.com |
| data.list[].phone     | string \ null | 手机号                                | 13800138000          |
| data.list[].role      | string        | 角色 code（来自 /roles）              | user                 |
| data.list[].status    | string        | 状态（active/inactive/banned）        | active               |
| data.list[].createdAt | string        | 创建时间（YYYY-MM-DD HH:mm:ss）       | 2026-01-10 00:00:00  |
| data.list[].updatedAt | string        | 更新时间（YYYY-MM-DD HH:mm:ss）       | 2026-01-10 00:00:00  |

---

## 5. 获取当前登录用户（需登录）

**接口标题**：当前用户信息

**功能描述**：根据 token 获取当前登录用户信息。

**接口路由**：`POST /users/me`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- 无（可传 `{}`，当前不会被使用）

**返回值（Success 200）**：对象 `User | null`

| 字段    | 类型          | 说明                | 示例      |
| ------- | ------------- | ------------------- | --------- |
| code    | string        | 状态码              | '0'       |
| message | string        | 状态描述            | 'success' |
| data    | object \ null | 数据（User \ null） | -         |

`data` 字段结构（User \ null）：

| 字段          | 类型          | 说明                                  | 示例                 |
| ------------- | ------------- | ------------------------------------- | -------------------- |
| data.userId   | string        | 用户业务 ID（格式：LD####AAAA）       | LD0001ABCD           |
| data.username | string        | 用户名                                | 张三                 |
| data.nickname | string        | 昵称                                  | 三哥                 |
| data.avatar   | string        | 头像 ID（avatarId，格式：LD####AAAA） | LD0002EFGH           |
| data.city     | string        | 所在城市                              | 北京                 |
| data.email    | string \ null | 邮箱                                  | zhangsan@example.com |
| data.phone    | string \ null | 手机号                                | 13800138000          |
| data.role     | string        | 角色 code（来自 /roles）              | user                 |
| data.status   | string        | 状态（active/inactive/banned）        | active               |

---

## 6. 获取用户详情（需登录）

**接口标题**：用户详情

**功能描述**：根据用户业务 ID 获取用户详情。

**接口路由**：`POST /users/detail`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `userId`（string，必填）：用户业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象 `User`

| 字段    | 类型   | 说明         | 示例      |
| ------- | ------ | ------------ | --------- |
| code    | string | 状态码       | '0'       |
| message | string | 状态描述     | 'success' |
| data    | object | 数据（User） | -         |

`data` 字段结构（User）：

| 字段                    | 类型          | 说明                                  | 示例                 |
| ----------------------- | ------------- | ------------------------------------- | -------------------- |
| data.userId             | string        | 用户业务 ID（格式：LD####AAAA）       | LD0001ABCD           |
| data.username           | string        | 用户名                                | 张三                 |
| data.nickname           | string        | 昵称                                  | 三哥                 |
| data.avatar             | string        | 头像 ID（avatarId，格式：LD####AAAA） | LD0002EFGH           |
| data.city               | string        | 所在城市                              | 北京                 |
| data.email              | string \ null | 邮箱                                  | zhangsan@example.com |
| data.phone              | string \ null | 手机号                                | 13800138000          |
| data.role               | string        | 角色 code（来自 /roles）              | user                 |
| data.status             | string        | 状态（active/inactive/banned）        | active               |
| data.mustChangePassword | boolean       | 是否需要改密（首次登录/自举）         | false                |

---

## 7. 创建用户（需登录）

**接口标题**：创建用户

**功能描述**：创建新用户（仅 admin/moderator 可用）。

**接口路由**：`POST /users/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `username`（string，必填）：用户名，长度 3-50
- `password`（string，必填）：密码，长度 6-100
- `email`（string \ null，可选）：邮箱
- `avatar`（string，可选）：头像 ID（avatarId，格式：LD####AAAA）
- `nickname`（string，可选）：昵称
- `city`（string，可选）：所在城市
- `phone`（string \ null，可选）：手机号
- `role`（string，可选）：角色 code（来自 /roles）
- `status`（string，可选）：状态（active/inactive/banned）

**返回值（Success 201）**：对象 `User`

| 字段    | 类型   | 说明         | 示例      |
| ------- | ------ | ------------ | --------- |
| code    | string | 状态码       | '0'       |
| message | string | 状态描述     | 'success' |
| data    | object | 数据（User） | -         |

`data` 字段结构（User）：

| 字段                    | 类型          | 说明                                  | 示例                 |
| ----------------------- | ------------- | ------------------------------------- | -------------------- |
| data.userId             | string        | 用户业务 ID（格式：LD####AAAA）       | LD0001ABCD           |
| data.username           | string        | 用户名                                | 张三                 |
| data.nickname           | string        | 昵称                                  | 三哥                 |
| data.avatar             | string        | 头像 ID（avatarId，格式：LD####AAAA） | LD0002EFGH           |
| data.city               | string        | 所在城市                              | 北京                 |
| data.email              | string \ null | 邮箱                                  | zhangsan@example.com |
| data.phone              | string \ null | 手机号                                | 13800138000          |
| data.role               | string        | 角色 code（来自 /roles）              | user                 |
| data.status             | string        | 状态（active/inactive/banned）        | active               |
| data.mustChangePassword | boolean       | 是否需要改密（首次登录/自举）         | false                |

---

## 8. 更新用户（需登录）

**接口标题**：更新用户

**功能描述**：更新用户信息（必须传 userId；修改他人信息需 admin/moderator）。

**接口路由**：`POST /users/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `userId`（string，必填）：用户业务 ID（格式：LD####AAAA）
- `avatar`（string，可选）：头像 ID（avatarId，格式：LD####AAAA）
- `nickname`（string，可选）：昵称
- `city`（string，可选）：所在城市
- `email`（string，可选）：邮箱
- `phone`（string \ null，可选）：手机号
- `role`（string，可选）：角色 code（来自 /roles，仅 admin/moderator 可修改）
- `status`（string，可选）：状态（active/inactive/banned，仅 admin/moderator 可修改）

**返回值（Success 200）**：对象 `User`

| 字段    | 类型   | 说明         | 示例      |
| ------- | ------ | ------------ | --------- |
| code    | string | 状态码       | '0'       |
| message | string | 状态描述     | 'success' |
| data    | object | 数据（User） | -         |

`data` 字段结构（User）：

| 字段                    | 类型          | 说明                                  | 示例                 |
| ----------------------- | ------------- | ------------------------------------- | -------------------- |
| data.userId             | string        | 用户业务 ID（格式：LD####AAAA）       | LD0001ABCD           |
| data.username           | string        | 用户名                                | 张三                 |
| data.nickname           | string        | 昵称                                  | 三哥                 |
| data.avatar             | string        | 头像 ID（avatarId，格式：LD####AAAA） | LD0002EFGH           |
| data.city               | string        | 所在城市                              | 北京                 |
| data.email              | string \ null | 邮箱                                  | zhangsan@example.com |
| data.phone              | string \ null | 手机号                                | 13800138000          |
| data.role               | string        | 角色 code（来自 /roles）              | user                 |
| data.status             | string        | 状态（active/inactive/banned）        | active               |
| data.mustChangePassword | boolean       | 是否需要改密（首次登录/自举）         | false                |

---

## 9. 删除用户（需登录）

**接口标题**：删除用户

**功能描述**：删除用户（硬删除，仅 admin/moderator 可用）；删除时会同步清理该用户的车辆与车友绑定记录。

**接口路由**：`POST /users/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `userId`（string，必填）：用户业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 9.1 修改密码（需登录）

**接口标题**：修改密码

**功能描述**：修改当前登录用户密码；当 `user.mustChangePassword=true` 时必须先调用此接口。

**接口路由**：`POST /users/change-password`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `currentPassword`（string，必填）：当前密码
- `newPassword`（string，必填）：新密码（长度 8-100）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                         | 示例      |
| ------- | ------ | ---------------------------- | --------- |
| code    | string | 状态码                       | '0'       |
| message | string | 状态描述                     | 'success' |
| data    | object | 数据（ChangePasswordResult） | -         |

`data` 字段结构（ChangePasswordResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 9.2 获取头像列表（需登录）

**接口标题**：头像列表

**功能描述**：返回系统头像列表（需登录）。普通用户仅返回启用头像；admin/moderator 可通过参数控制是否包含禁用/按启用状态筛选。

**接口路由**：`POST /avatars`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `includeDisabled`（boolean，可选，默认 false）：是否包含禁用头像（仅 admin/moderator 生效）
- `isEnabled`（boolean，可选）：是否启用（仅 admin/moderator 生效；与 includeDisabled 同时使用时以 isEnabled 为准）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                     | 示例      |
| ------- | ------ | ------------------------ | --------- |
| code    | string | 状态码                   | '0'       |
| message | string | 状态描述                 | 'success' |
| data    | object | 数据（AvatarListResult） | -         |

`data` 字段结构（AvatarListResult）：

| 字段          | 类型   | 说明                 | 示例 |
| ------------- | ------ | -------------------- | ---- |
| data.list     | array  | 头像列表（Avatar[]） | -    |
| data.page     | number | 当前页码             | 1    |
| data.pageSize | number | 每页条数             | 10   |
| data.total    | number | 总条数               | 100  |

`data.list` 字段结构（Avatar[]）：

| 字段                    | 类型    | 说明                            | 示例                |
| ----------------------- | ------- | ------------------------------- | ------------------- |
| data.list[].avatarId    | string  | 头像业务 ID（格式：LD####AAAA） | LD0002EFGH          |
| data.list[].imageBase64 | string  | base64 图片内容                 | iVBORw0KGgoAAA...   |
| data.list[].description | string  | 描述（最长 50）                 | 默认头像-1          |
| data.list[].isEnabled   | boolean | 是否启用                        | true                |
| data.list[].createdAt   | string  | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00 |
| data.list[].updatedAt   | string  | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00 |

---

## 9.3 新增头像（需登录）

**接口标题**：新增头像

**功能描述**：新增一条系统头像记录（仅 admin/moderator 可用）。

**接口路由**：`POST /avatars/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `imageBase64`（string，必填）：base64 图片内容
- `description`（string，可选）：描述（最长 50，默认空字符串）
- `isEnabled`（boolean，可选）：是否启用（默认 true）

**返回值（Success 201）**：对象 `Avatar`

| 字段    | 类型   | 说明           | 示例      |
| ------- | ------ | -------------- | --------- |
| code    | string | 状态码         | '0'       |
| message | string | 状态描述       | 'success' |
| data    | object | 数据（Avatar） | -         |

`data` 字段结构（Avatar）：

| 字段             | 类型    | 说明                            | 示例                |
| ---------------- | ------- | ------------------------------- | ------------------- |
| data.avatarId    | string  | 头像业务 ID（格式：LD####AAAA） | LD0002EFGH          |
| data.imageBase64 | string  | base64 图片内容                 | iVBORw0KGgoAAA...   |
| data.description | string  | 描述（最长 50）                 | 默认头像-1          |
| data.isEnabled   | boolean | 是否启用                        | true                |
| data.createdAt   | string  | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00 |
| data.updatedAt   | string  | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00 |

---

## 9.4 修改头像（需登录）

**接口标题**：修改头像

**功能描述**：更新一条系统头像记录（仅 admin/moderator 可用）。

**接口路由**：`POST /avatars/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `avatarId`（string，必填）：头像业务 ID（格式：LD####AAAA）
- `imageBase64`（string，可选）：base64 图片内容
- `description`（string，可选）：描述（最长 50）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象 `Avatar`

| 字段    | 类型   | 说明           | 示例      |
| ------- | ------ | -------------- | --------- |
| code    | string | 状态码         | '0'       |
| message | string | 状态描述       | 'success' |
| data    | object | 数据（Avatar） | -         |

`data` 字段结构（Avatar）：同「9.3 新增头像」

---

## 9.5 删除头像（需登录）

**接口标题**：删除头像

**功能描述**：删除一条系统头像记录（仅 admin/moderator 可用）。

**接口路由**：`POST /avatars/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `avatarId`（string，必填）：头像业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 9.6 获取角色列表（需登录）

**接口标题**：角色列表

**功能描述**：返回系统角色列表（仅 admin/moderator 可用；不分页，支持按 code/name/isEnabled 筛选）。

**接口路由**：`POST /roles`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `code`（string，可选）：角色 code（精确匹配）
- `nameKeyword`（string，可选）：角色名称关键词（对 name 做模糊匹配）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（RoleListResult） | -         |

`data` 字段结构（RoleListResult）：

| 字段      | 类型  | 说明               | 示例 |
| --------- | ----- | ------------------ | ---- |
| data.list | array | 角色列表（Role[]） | -    |

`data.list` 字段结构（Role[]）：

| 字段                    | 类型    | 说明                            | 示例                                 |
| ----------------------- | ------- | ------------------------------- | ------------------------------------ |
| data.list[].id          | string  | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].code        | string  | 角色 code（用于 users.role）    | admin                                |
| data.list[].name        | string  | 角色名称                        | 管理员                               |
| data.list[].description | string  | 角色描述                        | 系统管理员角色                       |
| data.list[].isEnabled   | boolean | 是否启用                        | true                                 |
| data.list[].updatedAt   | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-22 12:00:00                  |

---

## 9.7 新增角色（需登录）

**接口标题**：新增角色

**功能描述**：新增一条角色记录（仅 admin/moderator 可用）。

**接口路由**：`POST /roles/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `code`（string，必填）：角色 code（1-50，唯一；用于 users.role）
- `name`（string，可选）：角色名称（默认空字符串）
- `description`（string，可选）：角色描述（默认空字符串）
- `isEnabled`（boolean，可选）：是否启用（默认 true）

**返回值（Success 201）**：对象 `Role`

| 字段    | 类型   | 说明         | 示例      |
| ------- | ------ | ------------ | --------- |
| code    | string | 状态码       | '0'       |
| message | string | 状态描述     | 'success' |
| data    | object | 数据（Role） | -         |

`data` 字段结构（Role）：同「9.6 获取角色列表」的 Role 字段。

---

## 9.8 修改角色（需登录）

**接口标题**：修改角色

**功能描述**：更新一条角色记录（按 code 定位，仅 admin/moderator 可用；支持禁用）。

**接口路由**：`POST /roles/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `code`（string，必填）：角色 code
- `name`（string，可选）：角色名称
- `description`（string，可选）：角色描述
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象 `Role`

| 字段    | 类型   | 说明         | 示例      |
| ------- | ------ | ------------ | --------- |
| code    | string | 状态码       | '0'       |
| message | string | 状态描述     | 'success' |
| data    | object | 数据（Role） | -         |

`data` 字段结构（Role）：同「9.6 获取角色列表」的 Role 字段。

---

## 9.9 删除角色（需登录）

**接口标题**：删除角色

**功能描述**：删除一条角色记录（硬删除，仅 admin/moderator 可用；被用户使用中的角色不允许删除）。

**接口路由**：`POST /roles/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `code`（string，必填）：角色 code

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：同「9.5 删除头像」。

---

## 10. 获取车辆列表（需登录）

**接口标题**：车辆列表

**功能描述**：返回车辆列表（需登录），默认仅返回启用数据，可通过参数控制是否包含禁用。

**接口路由**：`POST /cars`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `includeDisabled`（boolean，可选，默认 false）：是否包含禁用车辆
- `status`（string，可选）：状态（on_sale/discontinued）
- `modelKeyword`（string，可选）：车型关键词（对 model 做模糊匹配）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（CarListResult） | -         |

`data` 字段结构（CarListResult）：

| 字段          | 类型   | 说明              | 示例 |
| ------------- | ------ | ----------------- | ---- |
| data.list     | array  | 车辆列表（Car[]） | -    |
| data.page     | number | 当前页码          | 1    |
| data.pageSize | number | 每页条数          | 10   |
| data.total    | number | 总条数            | 100  |

`data.list` 字段结构（Car[]）：

| 字段                  | 类型    | 说明                                | 示例                |
| --------------------- | ------- | ----------------------------------- | ------------------- |
| data.list[].carId     | string  | 车辆业务 ID（格式：LD####AAAA）     | LD0002EFGH          |
| data.list[].userId    | string  | 归属用户业务 ID（格式：LD####AAAA） | LD0001ABCD          |
| data.list[].year      | number  | 年份                                | 2022                |
| data.list[].model     | string  | 型号                                | A4L                 |
| data.list[].version   | string  | 版本号                              | 2.0T-2022           |
| data.list[].status    | string  | 状态（on_sale/discontinued）        | on_sale             |
| data.list[].isEnabled | boolean | 是否启用                            | true                |
| data.list[].remark    | string  | 备注                                | 试驾车              |
| data.list[].createdAt | string  | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-10 00:00:00 |
| data.list[].updatedAt | string  | 更新时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-10 00:00:00 |

---

## 10.1 新增车辆（需登录）

**接口标题**：新增车辆

**功能描述**：新增一条车辆记录（仅 admin/moderator 可用）。

**接口路由**：`POST /cars/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `year`（number，必填）：年份
- `model`（string，必填）：型号
- `version`（string，可选）：版本号
- `status`（string，可选）：状态（on_sale/discontinued，默认 on_sale）
- `isEnabled`（boolean，可选）：是否启用（默认 true）
- `remark`（string，可选）：备注

**返回值（Success 201）**：对象 `Car`

| 字段    | 类型   | 说明        | 示例      |
| ------- | ------ | ----------- | --------- |
| code    | string | 状态码      | '0'       |
| message | string | 状态描述    | 'success' |
| data    | object | 数据（Car） | -         |

`data` 字段结构（Car）：

| 字段           | 类型    | 说明                                | 示例                |
| -------------- | ------- | ----------------------------------- | ------------------- |
| data.carId     | string  | 车辆业务 ID（格式：LD####AAAA）     | LD0002EFGH          |
| data.userId    | string  | 归属用户业务 ID（格式：LD####AAAA） | LD0001ABCD          |
| data.year      | number  | 年份                                | 2022                |
| data.model     | string  | 型号                                | A4L                 |
| data.version   | string  | 版本号                              | 2.0T-2022           |
| data.status    | string  | 状态（on_sale/discontinued）        | on_sale             |
| data.isEnabled | boolean | 是否启用                            | true                |
| data.remark    | string  | 备注                                | 试驾车              |
| data.createdAt | string  | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-10 00:00:00 |
| data.updatedAt | string  | 更新时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-10 00:00:00 |

---

## 10.2 修改车辆（需登录）

**接口标题**：修改车辆

**功能描述**：更新一条车辆记录（仅 admin/moderator 可用）。

**接口路由**：`POST /cars/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carId`（string，必填）：车辆业务 ID（格式：LD####AAAA）
- `year`（number，可选）：年份
- `model`（string，可选）：型号
- `version`（string，可选）：版本号
- `status`（string，可选）：状态（on_sale/discontinued）
- `isEnabled`（boolean，可选）：是否启用
- `remark`（string，可选）：备注

**返回值（Success 200）**：对象 `Car`

| 字段    | 类型   | 说明        | 示例      |
| ------- | ------ | ----------- | --------- |
| code    | string | 状态码      | '0'       |
| message | string | 状态描述    | 'success' |
| data    | object | 数据（Car） | -         |

`data` 字段结构（Car）：

| 字段           | 类型    | 说明                                | 示例                |
| -------------- | ------- | ----------------------------------- | ------------------- |
| data.carId     | string  | 车辆业务 ID（格式：LD####AAAA）     | LD0002EFGH          |
| data.userId    | string  | 归属用户业务 ID（格式：LD####AAAA） | LD0001ABCD          |
| data.year      | number  | 年份                                | 2022                |
| data.model     | string  | 型号                                | A4L                 |
| data.version   | string  | 版本号                              | 2.0T-2022           |
| data.status    | string  | 状态（on_sale/discontinued）        | on_sale             |
| data.isEnabled | boolean | 是否启用                            | true                |
| data.remark    | string  | 备注                                | 试驾车              |
| data.createdAt | string  | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-10 00:00:00 |
| data.updatedAt | string  | 更新时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-10 00:00:00 |

---

## 10.3 删除车辆（需登录）

**接口标题**：删除车辆

**功能描述**：删除一条车辆记录（物理删除，仅 admin/moderator 可用）。

**接口路由**：`POST /cars/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carId`（string，必填）：车辆业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 10.4 获取车友列表（需登录）

**接口标题**：车友列表

**功能描述**：获取车友列表，支持按 userId 查询、按 carId/vin 查询，并支持分页。

**接口路由**：`POST /car-friends`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `userId`（string，可选）：车友用户业务 ID（格式：LD####AAAA；用于查询 username 进行过滤，不存在则返回空列表）
- `carId`（string，可选）：车辆业务 ID（格式：LD####AAAA）
- `vin`（string，可选）：VIN 码（17 位）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                        | 示例      |
| ------- | ------ | --------------------------- | --------- |
| code    | string | 状态码                      | '0'       |
| message | string | 状态描述                    | 'success' |
| data    | object | 数据（CarFriendListResult） | -         |

`data` 字段结构（CarFriendListResult）：

| 字段          | 类型   | 说明     | 示例 |
| ------------- | ------ | -------- | ---- |
| data.list     | array  | 车友列表 | -    |
| data.total    | number | 总条数   | 32   |
| data.page     | number | 当前页码 | 1    |
| data.pageSize | number | 每页条数 | 10   |

列表项 `CarFriend`：

| 字段                    | 类型          | 说明                                | 示例                |
| ----------------------- | ------------- | ----------------------------------- | ------------------- |
| data.list[].carFriendId | string        | 车友记录业务 ID（格式：LD####AAAA） | LD0004MNOP          |
| data.list[].userId      | string        | 归属用户业务 ID（格式：LD####AAAA） | LD0001ABCD          |
| data.list[].username    | string        | 用户名                              | 张三                |
| data.list[].carId       | string        | 车辆业务 ID（格式：LD####AAAA）     | LD0002EFGH          |
| data.list[].vin         | string \ null | VIN 码（17 位）                     | LFV2A21J3G1234567   |
| data.list[].carModel    | string        | 车辆型号                            | A4L                 |
| data.list[].carVersion  | string        | 车辆版本                            | 2.0T-2022           |
| data.list[].remark      | string        | 备注                                | 车友群 1            |
| data.list[].createdAt   | string        | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-16 12:00:00 |
| data.list[].updatedAt   | string        | 修改时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-16 12:00:00 |

---

## 10.5 新增车友（需登录）

**接口标题**：新增车友

**功能描述**：新增一条车友记录（通过 userId 关联用户，服务端会写入对应 username）。

**接口路由**：`POST /car-friends/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `userId`（string，必填）：车友用户业务 ID（格式：LD####AAAA；服务端会换算为 username 写入记录）
- `carId`（string，必填）：车辆业务 ID（格式：LD####AAAA）
- `vin`（string | null，可选）：VIN 码（17 位）
- `carModel`（string | null，可选）：车辆型号
- `carVersion`（string | null，可选）：车辆版本
- `remark`（string | null，可选）：备注

**返回值（Success 201）**：对象 `CarFriend`

| 字段    | 类型   | 说明              | 示例      |
| ------- | ------ | ----------------- | --------- |
| code    | string | 状态码            | '0'       |
| message | string | 状态描述          | 'success' |
| data    | object | 数据（CarFriend） | -         |

`data` 字段结构（CarFriend）：

| 字段             | 类型          | 说明                                | 示例                |
| ---------------- | ------------- | ----------------------------------- | ------------------- |
| data.carFriendId | string        | 车友记录业务 ID（格式：LD####AAAA） | LD0004MNOP          |
| data.userId      | string        | 归属用户业务 ID（格式：LD####AAAA） | LD0001ABCD          |
| data.username    | string        | 用户名                              | 张三                |
| data.carId       | string        | 车辆业务 ID（格式：LD####AAAA）     | LD0002EFGH          |
| data.vin         | string \ null | VIN 码（17 位）                     | LFV2A21J3G1234567   |
| data.carModel    | string        | 车辆型号                            | A4L                 |
| data.carVersion  | string        | 车辆版本                            | 2.0T-2022           |
| data.remark      | string        | 备注                                | 车友群 1            |
| data.createdAt   | string        | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-16 12:00:00 |
| data.updatedAt   | string        | 修改时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-16 12:00:00 |

---

## 10.6 修改车友（需登录）

**接口标题**：修改车友

**功能描述**：修改一条车友记录（按 carFriendId 定位，支持部分字段更新；传 userId 会同步更新 username）。

**接口路由**：`POST /car-friends/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carFriendId`（string，必填）：车友记录业务 ID（格式：LD####AAAA）
- `userId`（string，可选）：车友用户业务 ID（格式：LD####AAAA；传入会同步更新 username）
- `carId`（string，可选）：车辆业务 ID（格式：LD####AAAA）
- `vin`（string，可选）：VIN 码（17 位）
- `carModel`（string，可选）：车辆型号
- `carVersion`（string，可选）：车辆版本
- `remark`（string，可选）：备注

**返回值（Success 200）**：对象 `CarFriend`

| 字段    | 类型   | 说明              | 示例      |
| ------- | ------ | ----------------- | --------- |
| code    | string | 状态码            | '0'       |
| message | string | 状态描述          | 'success' |
| data    | object | 数据（CarFriend） | -         |

`data` 字段结构（CarFriend）：

| 字段             | 类型          | 说明                                | 示例                |
| ---------------- | ------------- | ----------------------------------- | ------------------- |
| data.carFriendId | string        | 车友记录业务 ID（格式：LD####AAAA） | LD0004MNOP          |
| data.userId      | string        | 归属用户业务 ID（格式：LD####AAAA） | LD0001ABCD          |
| data.username    | string        | 用户名                              | 张三                |
| data.carId       | string        | 车辆业务 ID（格式：LD####AAAA）     | LD0002EFGH          |
| data.vin         | string \ null | VIN 码（17 位）                     | LFV2A21J3G1234567   |
| data.carModel    | string        | 车辆型号                            | A4L                 |
| data.carVersion  | string        | 车辆版本                            | 2.0T-2022           |
| data.remark      | string        | 备注                                | 车友群 1            |
| data.createdAt   | string        | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-16 12:00:00 |
| data.updatedAt   | string        | 修改时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-16 12:00:00 |

---

## 10.7 删除车友（需登录）

**接口标题**：删除车友

**功能描述**：删除一条车友记录（物理删除）。

**接口路由**：`POST /car-friends/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carFriendId`（string，必填）：车友记录业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 11. 获取帖子列表（需登录）

**接口标题**：帖子列表

**功能描述**：获取帖子列表，支持分页与筛选。

**接口路由**：`POST /posts`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `status`（string，可选）：状态（draft/published/hidden）
- `userId`（string，可选）：作者用户业务 ID（格式：LD####AAAA）
- `carId`（string，可选）：关联车辆业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（PostListResult） | -         |

`data` 字段结构（PostListResult）：

| 字段          | 类型   | 说明               | 示例 |
| ------------- | ------ | ------------------ | ---- |
| data.list     | array  | 帖子列表（Post[]） | -    |
| data.page     | number | 当前页码           | 1    |
| data.pageSize | number | 每页条数           | 10   |
| data.total    | number | 总条数             | 100  |

`data.list` 字段结构（Post[]）：

| 字段                  | 类型           | 说明                                | 示例                |
| --------------------- | -------------- | ----------------------------------- | ------------------- |
| data.list[].postId    | string         | 帖子业务 ID（格式：LD####AAAA）     | LD0003IJKL          |
| data.list[].userId    | string         | 作者用户业务 ID（格式：LD####AAAA） | LD0001ABCD          |
| data.list[].carId     | string \\ null | 关联车辆业务 ID（格式：LD####AAAA） | LD0002EFGH          |
| data.list[].title     | string         | 标题                                | 我的第一台车        |
| data.list[].content   | string         | 内容                                | ...                 |
| data.list[].status    | string         | 状态（draft/published/hidden）      | published           |
| data.list[].createdAt | string         | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-10 00:00:00 |
| data.list[].updatedAt | string         | 更新时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-10 00:00:00 |

## 12. 获取反馈列表（需登录）

**接口标题**：反馈列表

**功能描述**：获取反馈列表，支持分页与筛选（按创建时间倒序）。

**接口路由**：`POST /feedbacks`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `type`（string，可选）：反馈问题类型
- `cbyKeyword`（string，可选）：创建人关键词（对 cby 做模糊匹配）
- `createdAtStart`（string，可选）：开始时间（ISO 字符串，createdAt >=）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                       | 示例      |
| ------- | ------ | -------------------------- | --------- |
| code    | string | 状态码                     | '0'       |
| message | string | 状态描述                   | 'success' |
| data    | object | 数据（FeedbackListResult） | -         |

`data` 字段结构（FeedbackListResult）：

| 字段          | 类型   | 说明                   | 示例 |
| ------------- | ------ | ---------------------- | ---- |
| data.list     | array  | 反馈列表（Feedback[]） | -    |
| data.page     | number | 当前页码               | 1    |
| data.pageSize | number | 每页条数               | 10   |
| data.total    | number | 总条数                 | 100  |

`data.list` 字段结构（Feedback[]）：

| 字段                            | 类型          | 说明                            | 示例                             |
| ------------------------------- | ------------- | ------------------------------- | -------------------------------- |
| data.list[].feedbackId          | string        | 反馈业务 ID（格式：LD####AAAA） | LD0006UVWX                       |
| data.list[].cby                 | string        | 用户名（创建人）                | 张三                             |
| data.list[].type                | string        | 反馈问题类型                    | bug                              |
| data.list[].description         | string        | 反馈描述                        | 页面无法加载                     |
| data.list[].contact             | string \ null | 联系方式（可选）                | 13800138000                      |
| data.list[].env                 | string        | 环境信息（字符串）              | Windows 11 / Chrome 120          |
| data.list[].images              | array         | 图片数组                        | -                                |
| data.list[].images[].url        | string        | 图片 base64（或 dataURL）       | data:image/png;base64,iVBORw0... |
| data.list[].images[].uploadTime | string        | 上传时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |
| data.list[].createdAt           | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |
| data.list[].updatedAt           | string        | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |

---

## 13. 新增反馈（需登录）

**接口标题**：新增反馈

**功能描述**：创建一条新的反馈记录。

**接口路由**：`POST /feedbacks/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `cby`（string，必填）：用户名
- `type`（string，必填）：反馈问题类型
- `description`（string，必填）：描述
- `contact`（string \ null，可选）：联系方式
- `env`（string，必填）：环境信息（字符串）
- `images`（array，可选）：图片数组
  - `images[].url`（string，必填）：图片 base64（或 dataURL）
  - `images[].uploadTime`（string，必填）：上传时间（可传任意可解析日期字符串，返回会格式化）

**返回值（Success 201）**：对象 `Feedback`

| 字段    | 类型   | 说明             | 示例      |
| ------- | ------ | ---------------- | --------- |
| code    | string | 状态码           | '0'       |
| message | string | 状态描述         | 'success' |
| data    | object | 数据（Feedback） | -         |

`data` 字段结构（Feedback）：

| 字段                     | 类型          | 说明                            | 示例                             |
| ------------------------ | ------------- | ------------------------------- | -------------------------------- |
| data.feedbackId          | string        | 反馈业务 ID（格式：LD####AAAA） | LD0006UVWX                       |
| data.cby                 | string        | 用户名（创建人）                | 张三                             |
| data.type                | string        | 反馈问题类型                    | bug                              |
| data.description         | string        | 反馈描述                        | 页面无法加载                     |
| data.contact             | string \ null | 联系方式（可选）                | 13800138000                      |
| data.env                 | string        | 环境信息（字符串）              | Windows 11 / Chrome 120          |
| data.images              | array         | 图片数组（uploadTime 已格式化） | -                                |
| data.images[].url        | string        | 图片 base64（或 dataURL）       | data:image/png;base64,iVBORw0... |
| data.images[].uploadTime | string        | 上传时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |
| data.createdAt           | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |
| data.updatedAt           | string        | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |

---

## 14. 修改反馈（需登录）

**接口标题**：修改反馈

**功能描述**：更新反馈内容（按 feedbackId 定位，支持部分字段更新）。

**接口路由**：`POST /feedbacks/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `feedbackId`（string，必填）：反馈业务 ID（格式：LD####AAAA）
- `type`（string，可选）：反馈问题类型
- `description`（string，可选）：描述
- `contact`（string \ null，可选）：联系方式
- `env`（string，可选）：环境信息（字符串）
- `images`（array，可选）：图片数组（整体替换）

**返回值（Success 200）**：对象 `Feedback`

| 字段    | 类型   | 说明             | 示例      |
| ------- | ------ | ---------------- | --------- |
| code    | string | 状态码           | '0'       |
| message | string | 状态描述         | 'success' |
| data    | object | 数据（Feedback） | -         |

`data` 字段结构（Feedback）：

| 字段                     | 类型          | 说明                            | 示例                             |
| ------------------------ | ------------- | ------------------------------- | -------------------------------- |
| data.feedbackId          | string        | 反馈业务 ID（格式：LD####AAAA） | LD0006UVWX                       |
| data.cby                 | string        | 用户名（创建人）                | 张三                             |
| data.type                | string        | 反馈问题类型                    | bug                              |
| data.description         | string        | 反馈描述                        | 页面无法加载                     |
| data.contact             | string \ null | 联系方式（可选）                | 13800138000                      |
| data.env                 | string        | 环境信息（字符串）              | Windows 11 / Chrome 120          |
| data.images              | array         | 图片数组（uploadTime 已格式化） | -                                |
| data.images[].url        | string        | 图片 base64（或 dataURL）       | data:image/png;base64,iVBORw0... |
| data.images[].uploadTime | string        | 上传时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |
| data.createdAt           | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |
| data.updatedAt           | string        | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00              |

---

## 15. 删除反馈（需登录）

**接口标题**：删除反馈

**功能描述**：删除反馈（硬删除）。

**接口路由**：`POST /feedbacks/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `feedbackId`（string，必填）：反馈业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 16. 获取反馈类型列表（需登录）

**接口标题**：反馈类型列表

**功能描述**：获取反馈类型列表，支持分页与筛选（按创建时间倒序）。

**接口路由**：`POST /feedback-types`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `nameKeyword`（string，可选）：类型名关键词（对 name 做模糊匹配）
- `createdAtStart`（string，可选）：开始时间（ISO 字符串，createdAt >=）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                           | 示例      |
| ------- | ------ | ------------------------------ | --------- |
| code    | string | 状态码                         | '0'       |
| message | string | 状态描述                       | 'success' |
| data    | object | 数据（FeedbackTypeListResult） | -         |

`data` 字段结构（FeedbackTypeListResult）：

| 字段          | 类型   | 说明                       | 示例 |
| ------------- | ------ | -------------------------- | ---- |
| data.list     | array  | 类型列表（FeedbackType[]） | -    |
| data.page     | number | 当前页码                   | 1    |
| data.pageSize | number | 每页条数                   | 10   |
| data.total    | number | 总条数                     | 100  |

`data.list` 字段结构（FeedbackType[]）：

| 字段                       | 类型   | 说明                            | 示例                 |
| -------------------------- | ------ | ------------------------------- | -------------------- |
| data.list[].feedbackTypeId | string | 类型业务 ID（格式：LD####AAAA） | LD0007YZAB           |
| data.list[].name           | string | 类型名                          | BUG 反馈             |
| data.list[].description    | string | 类型描述                        | 影响使用的错误与异常 |
| data.list[].createdAt      | string | 新增时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00  |
| data.list[].updatedAt      | string | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00  |

---

## 17. 新增反馈类型（需登录）

**接口标题**：新增反馈类型

**功能描述**：创建一条新的反馈类型记录。

**接口路由**：`POST /feedback-types/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `name`（string，必填）：类型名
- `description`（string，可选）：类型描述

**返回值（Success 201）**：对象 `FeedbackType`

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（FeedbackType） | -         |

`data` 字段结构（FeedbackType）：

| 字段                | 类型   | 说明                            | 示例                 |
| ------------------- | ------ | ------------------------------- | -------------------- |
| data.feedbackTypeId | string | 类型业务 ID（格式：LD####AAAA） | LD0007YZAB           |
| data.name           | string | 类型名                          | BUG 反馈             |
| data.description    | string | 类型描述                        | 影响使用的错误与异常 |
| data.createdAt      | string | 新增时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00  |
| data.updatedAt      | string | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00  |

---

## 18. 修改反馈类型（需登录）

**接口标题**：修改反馈类型

**功能描述**：更新反馈类型内容（按 feedbackTypeId 定位，支持部分字段更新）。

**接口路由**：`POST /feedback-types/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `feedbackTypeId`（string，必填）：类型业务 ID（格式：LD####AAAA）
- `name`（string，可选）：类型名
- `description`（string，可选）：类型描述

**返回值（Success 200）**：对象 `FeedbackType`

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（FeedbackType） | -         |

`data` 字段结构（FeedbackType）：

| 字段                | 类型   | 说明                            | 示例                 |
| ------------------- | ------ | ------------------------------- | -------------------- |
| data.feedbackTypeId | string | 类型业务 ID（格式：LD####AAAA） | LD0007YZAB           |
| data.name           | string | 类型名                          | BUG 反馈             |
| data.description    | string | 类型描述                        | 影响使用的错误与异常 |
| data.createdAt      | string | 新增时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00  |
| data.updatedAt      | string | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00  |

---

## 19. 删除反馈类型（需登录）

**接口标题**：删除反馈类型

**功能描述**：删除反馈类型（硬删除）。

**接口路由**：`POST /feedback-types/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `feedbackTypeId`（string，必填）：类型业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 20. 获取勋章类型列表（需登录）

**接口标题**：勋章类型列表

**功能描述**：获取勋章类型列表，支持筛选（无分页，按修改时间倒序）。

**接口路由**：`POST /medal-types`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `medalTypeId`（string，可选）：勋章类型业务 ID（格式：LD####AAAA）
- `nameKeyword`（string，可选）：勋章名字关键词（对 name 做模糊匹配）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                        | 示例      |
| ------- | ------ | --------------------------- | --------- |
| code    | string | 状态码                      | '0'       |
| message | string | 状态描述                    | 'success' |
| data    | object | 数据（MedalTypeListResult） | -         |

`data` 字段结构（MedalTypeListResult）：

| 字段      | 类型  | 说明                | 示例 |
| --------- | ----- | ------------------- | ---- |
| data.list | array | 列表（MedalType[]） | -    |

`data.list` 字段结构（MedalType[]）：

| 字段                    | 类型    | 说明                            | 示例                                 |
| ----------------------- | ------- | ------------------------------- | ------------------------------------ |
| data.list[].id          | string  | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].medalTypeId | string  | 业务 ID（格式：LD####AAAA）     | LD0007YZAB                           |
| data.list[].name        | string  | 勋章名字                        | 新手勋章                             |
| data.list[].description | string  | 勋章描述                        | 完成注册获得                         |
| data.list[].isEnabled   | boolean | 是否启用                        | true                                 |
| data.list[].updatedAt   | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 21. 新增勋章类型（需登录）

**接口标题**：新增勋章类型

**功能描述**：创建一条新的勋章类型记录。

**接口路由**：`POST /medal-types/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `name`（string，必填）：勋章名字
- `description`（string，可选）：勋章描述
- `isEnabled`（boolean，可选，默认 true）：是否启用（仅 admin/moderator 可设置；普通用户创建时会强制为 true）

**返回值（Success 201）**：对象 `MedalType`

| 字段    | 类型   | 说明              | 示例      |
| ------- | ------ | ----------------- | --------- |
| code    | string | 状态码            | '0'       |
| message | string | 状态描述          | 'success' |
| data    | object | 数据（MedalType） | -         |

`data` 字段结构（MedalType）：

| 字段             | 类型    | 说明                            | 示例                                 |
| ---------------- | ------- | ------------------------------- | ------------------------------------ |
| data.id          | string  | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.medalTypeId | string  | 业务 ID（格式：LD####AAAA）     | LD0007YZAB                           |
| data.name        | string  | 勋章名字                        | 新手勋章                             |
| data.description | string  | 勋章描述                        | 完成注册获得                         |
| data.isEnabled   | boolean | 是否启用                        | true                                 |
| data.updatedAt   | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 22. 修改勋章类型（需登录）

**接口标题**：修改勋章类型

**功能描述**：更新勋章类型内容（按 medalTypeId 定位，支持部分字段更新）。

**接口路由**：`POST /medal-types/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `medalTypeId`（string，必填）：勋章类型业务 ID（格式：LD####AAAA）
- `name`（string，可选）：勋章名字
- `description`（string，可选）：勋章描述
- `isEnabled`（boolean，可选）：是否启用（仅 admin/moderator 可修改）

**返回值（Success 200）**：对象 `MedalType`

| 字段    | 类型   | 说明              | 示例      |
| ------- | ------ | ----------------- | --------- |
| code    | string | 状态码            | '0'       |
| message | string | 状态描述          | 'success' |
| data    | object | 数据（MedalType） | -         |

`data` 字段结构（MedalType）：

| 字段             | 类型    | 说明                            | 示例                                 |
| ---------------- | ------- | ------------------------------- | ------------------------------------ |
| data.id          | string  | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.medalTypeId | string  | 业务 ID（格式：LD####AAAA）     | LD0007YZAB                           |
| data.name        | string  | 勋章名字                        | 新手勋章                             |
| data.description | string  | 勋章描述                        | 完成注册获得                         |
| data.isEnabled   | boolean | 是否启用                        | true                                 |
| data.updatedAt   | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 23. 删除勋章类型（需登录）

**接口标题**：删除勋章类型

**功能描述**：删除勋章类型。

**接口路由**：`POST /medal-types/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `medalTypeId`（string，必填）：勋章类型业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 24. 获取勋章列表（管理端，需登录）

**接口标题**：勋章列表（定义）

**功能描述**：获取勋章定义列表（管理端使用，支持分页与筛选）。

**接口路由**：`POST /medals`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `medalTypeId`（string，可选）：勋章类型业务 ID（格式：LD####AAAA）
- `nameKeyword`（string，可选）：勋章名字关键词（对 name 做模糊匹配）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                    | 示例      |
| ------- | ------ | ----------------------- | --------- |
| code    | string | 状态码                  | '0'       |
| message | string | 状态描述                | 'success' |
| data    | object | 数据（MedalListResult） | -         |

`data` 字段结构（MedalListResult）：

| 字段          | 类型   | 说明            | 示例 |
| ------------- | ------ | --------------- | ---- |
| data.list     | array  | 列表（Medal[]） | -    |
| data.page     | number | 当前页码        | 1    |
| data.pageSize | number | 每页条数        | 10   |
| data.total    | number | 总条数          | 100  |

`data.list` 字段结构（Medal[]）：

| 字段                    | 类型    | 说明                                | 示例                                 |
| ----------------------- | ------- | ----------------------------------- | ------------------------------------ |
| data.list[].id          | string  | 主键 ID（UUID）                     | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].medalId     | string  | 勋章业务 ID（格式：LD####AAAA）     | LD0007YZAB                           |
| data.list[].medalTypeId | string  | 勋章类型业务 ID（格式：LD####AAAA） | LD0001ABCD                           |
| data.list[].name        | string  | 勋章名字                            | 新手勋章                             |
| data.list[].description | string  | 勋章描述                            | 完成注册获得                         |
| data.list[].iconBase64  | string  | 勋章图标 base64                     | data:image/png;base64,iVBORw0...     |
| data.list[].isEnabled   | boolean | 是否启用                            | true                                 |
| data.list[].updatedAt   | string  | 修改时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-14 12:00:00                  |

---

## 25. 新增勋章（管理端，需登录）

**接口标题**：新增勋章

**功能描述**：创建一条新的勋章定义记录。

**接口路由**：`POST /medals/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `medalTypeId`（string，必填）：勋章类型业务 ID（格式：LD####AAAA）
- `name`（string，必填）：勋章名字
- `description`（string，可选）：勋章描述
- `iconBase64`（string，必填）：勋章图标 base64
- `isEnabled`（boolean，可选，默认 true）：是否启用

**返回值（Success 201）**：对象 `Medal`

| 字段    | 类型   | 说明          | 示例      |
| ------- | ------ | ------------- | --------- |
| code    | string | 状态码        | '0'       |
| message | string | 状态描述      | 'success' |
| data    | object | 数据（Medal） | -         |

`data` 字段结构（Medal）：同上 `Medal[]` 单项字段。

---

## 26. 修改勋章（管理端，需登录）

**接口标题**：修改勋章

**功能描述**：更新勋章定义内容（按 medalId 定位，支持部分字段更新）。

**接口路由**：`POST /medals/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `medalId`（string，必填）：勋章业务 ID（格式：LD####AAAA）
- `medalTypeId`（string，可选）：勋章类型业务 ID（格式：LD####AAAA）
- `name`（string，可选）：勋章名字
- `description`（string，可选）：勋章描述
- `iconBase64`（string，可选）：勋章图标 base64
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象 `Medal`

| 字段    | 类型   | 说明          | 示例      |
| ------- | ------ | ------------- | --------- |
| code    | string | 状态码        | '0'       |
| message | string | 状态描述      | 'success' |
| data    | object | 数据（Medal） | -         |

---

## 27. 删除勋章（管理端，需登录）

**接口标题**：删除勋章

**功能描述**：删除勋章定义。

**接口路由**：`POST /medals/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `medalId`（string，必填）：勋章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 28. 全部勋章（点亮融合列表，需登录）

**接口标题**：全部勋章（点亮）

**功能描述**：获取全部启用的勋章列表，并返回当前用户是否已获得、获得时间与是否佩戴。

**接口路由**：`POST /medals/all`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `medalTypeId`（string，可选）：勋章类型业务 ID（格式：LD####AAAA）
- `nameKeyword`（string，可选）：勋章名字关键词（对 name 做模糊匹配）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（MedalAllResult） | -         |

`data` 字段结构（MedalAllResult）：

| 字段          | 类型   | 说明                   | 示例 |
| ------------- | ------ | ---------------------- | ---- |
| data.list     | array  | 列表（MedalAllItem[]） | -    |
| data.page     | number | 当前页码               | 1    |
| data.pageSize | number | 每页条数               | 10   |
| data.total    | number | 总条数                 | 100  |

`data.list` 字段结构（MedalAllItem[]）：

| 字段                    | 类型          | 说明                                | 示例                             |
| ----------------------- | ------------- | ----------------------------------- | -------------------------------- |
| data.list[].medalId     | string        | 勋章业务 ID（格式：LD####AAAA）     | LD0007YZAB                       |
| data.list[].medalTypeId | string        | 勋章类型业务 ID（格式：LD####AAAA） | LD0001ABCD                       |
| data.list[].name        | string        | 勋章名字                            | 新手勋章                         |
| data.list[].description | string        | 勋章描述                            | 完成注册获得                     |
| data.list[].iconBase64  | string        | 勋章图标 base64                     | data:image/png;base64,iVBORw0... |
| data.list[].isEnabled   | boolean       | 是否启用                            | true                             |
| data.list[].updatedAt   | string        | 修改时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-14 12:00:00              |
| data.list[].isOwned     | boolean       | 是否已获得                          | false                            |
| data.list[].obtainedAt  | string \ null | 获得时间（已获得才有）              | 2026-01-14 12:00:00              |
| data.list[].isWorn      | boolean       | 是否佩戴中                          | false                            |

---

## 29. 我的勋章列表（需登录）

**接口标题**：我的勋章

**功能描述**：获取当前用户已获得的勋章列表。

**接口路由**：`POST /my/medals`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `medalTypeId`（string，可选）：勋章类型业务 ID（格式：LD####AAAA）
- `isWorn`（boolean，可选）：是否佩戴中

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                      | 示例      |
| ------- | ------ | ------------------------- | --------- |
| code    | string | 状态码                    | '0'       |
| message | string | 状态描述                  | 'success' |
| data    | object | 数据（MyMedalListResult） | -         |

`data` 字段结构（MyMedalListResult）：

| 字段          | 类型   | 说明              | 示例 |
| ------------- | ------ | ----------------- | ---- |
| data.list     | array  | 列表（MyMedal[]） | -    |
| data.page     | number | 当前页码          | 1    |
| data.pageSize | number | 每页条数          | 10   |
| data.total    | number | 总条数            | 100  |

`data.list` 字段结构（MyMedal[]）：

| 字段                    | 类型    | 说明                                | 示例                             |
| ----------------------- | ------- | ----------------------------------- | -------------------------------- |
| data.list[].medalId     | string  | 勋章业务 ID（格式：LD####AAAA）     | LD0007YZAB                       |
| data.list[].medalTypeId | string  | 勋章类型业务 ID（格式：LD####AAAA） | LD0001ABCD                       |
| data.list[].name        | string  | 勋章名字                            | 新手勋章                         |
| data.list[].description | string  | 勋章描述                            | 完成注册获得                     |
| data.list[].iconBase64  | string  | 勋章图标 base64                     | data:image/png;base64,iVBORw0... |
| data.list[].updatedAt   | string  | 修改时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-14 12:00:00              |
| data.list[].obtainedAt  | string  | 获得时间                            | 2026-01-14 12:00:00              |
| data.list[].isWorn      | boolean | 是否佩戴中                          | false                            |

---

## 30. 佩戴/取消佩戴勋章（需登录）

**接口标题**：佩戴勋章

**功能描述**：设置当前用户佩戴的勋章；传空则取消佩戴。

**接口路由**：`POST /my/medals/wear`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `medalId`（string，可选）：勋章业务 ID（格式：LD####AAAA）；传空字符串或 null 表示取消佩戴

**返回值（Success 200）**：

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（WearResult） | -         |

`data` 字段结构（WearResult）：

| 字段             | 类型          | 说明               | 示例       |
| ---------------- | ------------- | ------------------ | ---------- |
| data.ok          | boolean       | 是否成功           | true       |
| data.wornMedalId | string \ null | 当前佩戴的 medalId | LD0007YZAB |

---

## 31. 管理员发放勋章（需登录）

**接口标题**：发放勋章

**功能描述**：管理员手动给用户发放勋章（幂等，不重复获得），并写入发放流水。

**接口路由**：`POST /medals/grant`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `userId`（string，必填）：用户业务 ID（格式：LD####AAAA）
- `medalId`（string，必填）：勋章业务 ID（格式：LD####AAAA）
- `reason`（string，可选）：发放原因

**返回值（Success 200）**：

| 字段    | 类型   | 说明                | 示例      |
| ------- | ------ | ------------------- | --------- |
| code    | string | 状态码              | '0'       |
| message | string | 状态描述            | 'success' |
| data    | object | 数据（GrantResult） | -         |

`data` 字段结构（GrantResult）：

| 字段              | 类型    | 说明             | 示例  |
| ----------------- | ------- | ---------------- | ----- |
| data.ok           | boolean | 是否成功         | true  |
| data.granted      | boolean | 是否本次新增获得 | true  |
| data.alreadyOwned | boolean | 是否之前已拥有   | false |

---

## 32. 发放记录查询（需登录）

**接口标题**：勋章发放流水

**功能描述**：查询勋章发放流水（管理员审计）。

**接口路由**：`POST /medal-grant-logs`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `userId`（string，可选）：用户业务 ID（格式：LD####AAAA）
- `medalId`（string，可选）：勋章业务 ID（格式：LD####AAAA）
- `sourceType`（string，可选）：来源类型（如 admin_manual）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                            | 示例      |
| ------- | ------ | ------------------------------- | --------- |
| code    | string | 状态码                          | '0'       |
| message | string | 状态描述                        | 'success' |
| data    | object | 数据（MedalGrantLogListResult） | -         |

`data` 字段结构（MedalGrantLogListResult）：

| 字段          | 类型   | 说明                    | 示例 |
| ------------- | ------ | ----------------------- | ---- |
| data.list     | array  | 列表（MedalGrantLog[]） | -    |
| data.page     | number | 当前页码                | 1    |
| data.pageSize | number | 每页条数                | 10   |
| data.total    | number | 总条数                  | 100  |

`data.list` 字段结构（MedalGrantLog[]）：

| 字段                       | 类型          | 说明                            | 示例                                 |
| -------------------------- | ------------- | ------------------------------- | ------------------------------------ |
| data.list[].id             | string        | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].userId         | string        | 用户业务 ID（格式：LD####AAAA） | LD0001ABCD                           |
| data.list[].medalId        | string        | 勋章业务 ID（格式：LD####AAAA） | LD0007YZAB                           |
| data.list[].operatorUserId | string \ null | 操作人用户业务 ID               | LD0002EFGH                           |
| data.list[].sourceType     | string        | 来源类型                        | admin_manual                         |
| data.list[].reason         | string        | 发放原因                        | 活动奖励                             |
| data.list[].createdAt      | string        | 发放时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 33. 获取问答标签列表（需登录）

**接口标题**：问答标签列表

**功能描述**：获取问答标签列表（管理端使用，支持分页与筛选，按 seq 升序、updatedAt 降序）。

**接口路由**：`POST /qa-tags`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `qaTagId`（string，可选）：标签业务 ID（格式：LD####AAAA）
- `nameKeyword`（string，可选）：标签名关键词（对 name 做模糊匹配）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                    | 示例      |
| ------- | ------ | ----------------------- | --------- |
| code    | string | 状态码                  | '0'       |
| message | string | 状态描述                | 'success' |
| data    | object | 数据（QaTagListResult） | -         |

`data` 字段结构（QaTagListResult）：

| 字段          | 类型   | 说明            | 示例 |
| ------------- | ------ | --------------- | ---- |
| data.list     | array  | 列表（QaTag[]） | -    |
| data.page     | number | 当前页码        | 1    |
| data.pageSize | number | 每页条数        | 10   |
| data.total    | number | 总条数          | 100  |

`data.list` 字段结构（QaTag[]）：

| 字段                    | 类型    | 说明                            | 示例                                 |
| ----------------------- | ------- | ------------------------------- | ------------------------------------ |
| data.list[].id          | string  | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].qaTagId     | string  | 标签业务 ID（格式：LD####AAAA） | LD0007YZAB                           |
| data.list[].name        | string  | 标签名                          | 续航                                 |
| data.list[].description | string  | 标签描述                        | 续航相关问题                         |
| data.list[].seq         | number  | 排序号                          | 1                                    |
| data.list[].isEnabled   | boolean | 是否启用                        | true                                 |
| data.list[].updatedAt   | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 34. 新增问答标签（需登录）

**接口标题**：新增问答标签

**功能描述**：创建一条新的问答标签记录。

**接口路由**：`POST /qa-tags/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `name`（string，必填）：标签名
- `description`（string，可选）：标签描述
- `seq`（number，可选，默认 0）：排序号
- `isEnabled`（boolean，可选，默认 true）：是否启用

**返回值（Success 201）**：对象 `QaTag`

| 字段    | 类型   | 说明          | 示例      |
| ------- | ------ | ------------- | --------- |
| code    | string | 状态码        | '0'       |
| message | string | 状态描述      | 'success' |
| data    | object | 数据（QaTag） | -         |

`data` 字段结构（QaTag）：

| 字段             | 类型    | 说明                            | 示例                                 |
| ---------------- | ------- | ------------------------------- | ------------------------------------ |
| data.id          | string  | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.qaTagId     | string  | 标签业务 ID（格式：LD####AAAA） | LD0007YZAB                           |
| data.name        | string  | 标签名                          | 续航                                 |
| data.description | string  | 标签描述                        | 续航相关问题                         |
| data.seq         | number  | 排序号                          | 1                                    |
| data.isEnabled   | boolean | 是否启用                        | true                                 |
| data.updatedAt   | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 35. 修改问答标签（需登录）

**接口标题**：修改问答标签

**功能描述**：更新问答标签内容（按 qaTagId 定位，支持部分字段更新）。

**接口路由**：`POST /qa-tags/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaTagId`（string，必填）：标签业务 ID（格式：LD####AAAA）
- `name`（string，可选）：标签名
- `description`（string，可选）：标签描述
- `seq`（number，可选）：排序号
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象 `QaTag`

| 字段    | 类型   | 说明          | 示例      |
| ------- | ------ | ------------- | --------- |
| code    | string | 状态码        | '0'       |
| message | string | 状态描述      | 'success' |
| data    | object | 数据（QaTag） | -         |

`data` 字段结构（QaTag）：同上 `QaTag` 字段。

---

## 36. 删除问答标签（需登录）

**接口标题**：删除问答标签

**功能描述**：删除问答标签（硬删除）。

**接口路由**：`POST /qa-tags/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaTagId`（string，必填）：标签业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 37. 获取问答问题列表（需登录）

**接口标题**：问答问题列表

**功能描述**：获取问答问题列表（支持分页与筛选）。通过 `type` 控制 4 种列表：最新 / 待解答 / 热门 / 精选。

**接口路由**：`POST /qa-questions`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `type`（string，可选）：列表类型，默认 `latest`
  - `latest`：最新（按最后互动时间 `activityAt` 倒序；如新增回答、采纳/取消采纳、编辑问题等会刷新）
  - `unanswered`：待解答（未采纳的问题，即 `acceptedAnswerId` 为空）
  - `hot`：热门（已采纳 + 回答数≥5 + 点赞数≥10；按浏览量 `viewCount` 倒序）
  - `featured`：精选（仅版主/管理员设置；按 `featuredAt` 倒序）
- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选）：标题关键词（对 title 做模糊匹配）
- `tagId`（string，可选）：标签业务 ID（格式：LD####AAAA）
- `isSolved`（boolean，可选）：是否已解决（是否已采纳回答）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                         | 示例      |
| ------- | ------ | ---------------------------- | --------- |
| code    | string | 状态码                       | '0'       |
| message | string | 状态描述                     | 'success' |
| data    | object | 数据（QaQuestionListResult） | -         |

`data` 字段结构（QaQuestionListResult）：

| 字段          | 类型   | 说明                 | 示例 |
| ------------- | ------ | -------------------- | ---- |
| data.list     | array  | 列表（QaQuestion[]） | -    |
| data.page     | number | 当前页码             | 1    |
| data.pageSize | number | 每页条数             | 10   |
| data.total    | number | 总条数               | 100  |

`data.list` 字段结构（QaQuestion[]）：

| 字段                         | 类型          | 说明                                                     | 示例                                 |
| ---------------------------- | ------------- | -------------------------------------------------------- | ------------------------------------ |
| data.list[].id               | string        | 主键 ID（UUID）                                          | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].qaQuestionId     | string        | 问答问题业务 ID（格式：LD####AAAA）                      | LD0007YZAB                           |
| data.list[].authorUserId     | string        | 作者用户业务 ID                                          | LD0001ABCD                           |
| data.list[].title            | string        | 标题                                                     | 充电口盖怎么打开？                   |
| data.list[].description      | string        | 描述                                                     | 车型 XX，找不到开关                  |
| data.list[].images           | array         | 图片 base64 列表（string[]，最多 9 张）                  | -                                    |
| data.list[].tagIds           | array         | 标签业务 ID 列表                                         | ["LD0001ABCD"]                       |
| data.list[].likeCount        | number        | 点赞数                                                   | 12                                   |
| data.list[].answerCount      | number        | 回答数                                                   | 3                                    |
| data.list[].viewCount        | number        | 浏览量                                                   | 256                                  |
| data.list[].acceptedAnswerId | string \ null | 已采纳回答业务 ID                                        | LD0009WXYZ                           |
| data.list[].isSolved         | boolean       | 是否已解决                                               | true                                 |
| data.list[].collectCount     | number        | 收藏数量（已采纳回答的收藏数量；未采纳时为 0）           | 12                                   |
| data.list[].isEnabled        | boolean       | 是否启用                                                 | true                                 |
| data.list[].isFeatured       | boolean       | 是否精选                                                 | false                                |
| data.list[].featuredAt       | string \ null | 精选设置时间（YYYY-MM-DD HH:mm:ss）                      | 2026-01-22 12:00:00                  |
| data.list[].publishedAt      | string        | 发布时间（YYYY-MM-DD HH:mm:ss）                          | 2026-01-20 12:00:00                  |
| data.list[].createdAt        | string        | 创建时间（YYYY-MM-DD HH:mm:ss）                          | 2026-01-20 12:00:00                  |
| data.list[].updatedAt        | string        | 最后互动时间（评论/采纳变更时更新，YYYY-MM-DD HH:mm:ss） | 2026-01-20 12:00:00                  |

`data.list[].images` 字段结构（string[]）：

| 字段                 | 类型   | 说明                                     | 示例                                 |
| -------------------- | ------ | ---------------------------------------- | ------------------------------------ |
| data.list[].images[] | string | 图片 base64（可为 data URL 或纯 base64） | data:image/png;base64,iVBORw0KGgo... |

---

## 38. 获取问答问题详情（需登录）

**接口标题**：问答问题详情

**功能描述**：获取问答问题详情（会累加浏览量 viewCount + 1）。

**接口路由**：`POST /qa-questions/detail`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                           | 示例      |
| ------- | ------ | ------------------------------ | --------- |
| code    | string | 状态码                         | '0'       |
| message | string | 状态描述                       | 'success' |
| data    | object | 数据（QaQuestionDetailResult） | -         |

`data` 字段结构（QaQuestionDetailResult）：

| 字段                | 类型          | 说明                   | 示例 |
| ------------------- | ------------- | ---------------------- | ---- |
| data.question       | object        | 问题（QaQuestion）     | -    |
| data.acceptedAnswer | object \ null | 已采纳回答（QaAnswer） | -    |

`data.question` 字段结构：包含上文 `QaQuestion` 字段（其中 updatedAt 为最后互动时间：评论/采纳变更时更新），并额外返回：

| 字段                       | 类型    | 说明                                                                          | 示例  |
| -------------------------- | ------- | ----------------------------------------------------------------------------- | ----- |
| data.question.nickname     | string  | 作者昵称（未设置时为空字符串）                                                | 张三  |
| data.question.isLiked      | boolean | 当前登录用户是否已点赞该问题                                                  | true  |
| data.question.isCollected  | boolean | 当前登录用户是否已收藏已采纳回答（仅在存在采纳回答且该回答已被收藏时为 true） | false |
| data.question.collectCount | number  | 收藏数量（已采纳回答的收藏数量；未采纳时为 0）                                | 12    |

`data.acceptedAnswer` 字段结构（QaAnswer）：

| 字段                             | 类型          | 说明                                | 示例                                 |
| -------------------------------- | ------------- | ----------------------------------- | ------------------------------------ |
| data.acceptedAnswer.id           | string        | 主键 ID（UUID）                     | 550e8400-e29b-41d4-a716-446655440000 |
| data.acceptedAnswer.qaAnswerId   | string        | 回答业务 ID（格式：LD####AAAA）     | LD0009WXYZ                           |
| data.acceptedAnswer.qaQuestionId | string        | 问题业务 ID                         | LD0007YZAB                           |
| data.acceptedAnswer.authorUserId | string        | 作者用户业务 ID                     | LD0002EFGH                           |
| data.acceptedAnswer.content      | string        | 回答内容                            | 按住左侧按钮 3 秒                    |
| data.acceptedAnswer.likeCount    | number        | 点赞数                              | 5                                    |
| data.acceptedAnswer.isLiked      | boolean       | 当前登录用户是否已点赞该回答        | false                                |
| data.acceptedAnswer.isCollected  | boolean       | 当前登录用户是否已收藏该回答        | false                                |
| data.acceptedAnswer.isAccepted   | boolean       | 是否已采纳                          | true                                 |
| data.acceptedAnswer.acceptedAt   | string \ null | 采纳时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-20 12:00:00                  |
| data.acceptedAnswer.createdAt    | string        | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-20 12:00:00                  |
| data.acceptedAnswer.updatedAt    | string        | 记录更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-20 12:00:00                  |
| data.acceptedAnswer.modifiedAt   | string \ null | 内容修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-20 12:00:00                  |

---

## 39. 新增问答问题（需登录）

**接口标题**：新增问答问题

**功能描述**：创建一条新的问答问题记录。

**接口路由**：`POST /qa-questions/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `title`（string，必填）：标题
- `description`（string，可选）：描述
- `images`（array，可选，默认 []）：图片 base64 列表（最多 9 张）
- `tagIds`（array，可选，默认 []）：标签业务 ID 列表（格式：LD####AAAA）
- `isEnabled`（boolean，可选，默认 true）：是否启用

`images` 字段结构（string[]）：

| 字段     | 类型   | 说明                                     | 示例                                 |
| -------- | ------ | ---------------------------------------- | ------------------------------------ |
| images[] | string | 图片 base64（可为 data URL 或纯 base64） | data:image/png;base64,iVBORw0KGgo... |

**返回值（Success 201）**：对象 `QaQuestion`

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（QaQuestion） | -         |

`data` 字段结构（QaQuestion）：同上 `QaQuestion` 字段。

---

## 40. 修改问答问题（需登录）

**接口标题**：修改问答问题

**功能描述**：更新问答问题内容（按 qaQuestionId 定位，支持部分字段更新）。

**接口路由**：`POST /qa-questions/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）
- `title`（string，可选）：标题
- `description`（string，可选）：描述
- `images`（array，可选）：图片 base64 列表（最多 9 张）
- `tagIds`（array，可选）：标签业务 ID 列表（格式：LD####AAAA）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象 `QaQuestion`

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（QaQuestion） | -         |

`data` 字段结构（QaQuestion）：同上 `QaQuestion` 字段。

---

## 41. 删除问答问题（需登录）

**接口标题**：删除问答问题

**功能描述**：删除问答问题（硬删除，同时会清理该问题下的回答与标签关联）。

**接口路由**：`POST /qa-questions/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 42. 采纳回答（需登录）

**接口标题**：采纳回答

**功能描述**：问题作者采纳某条回答（同一问题只能采纳 1 条，可切换采纳）。仅允许采纳根回答（楼中楼回复不可采纳）。

**接口路由**：`POST /qa-questions/adopt`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）
- `qaAnswerId`（string，必填）：回答业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                | 示例      |
| ------- | ------ | ------------------- | --------- |
| code    | string | 状态码              | '0'       |
| message | string | 状态描述            | 'success' |
| data    | object | 数据（AdoptResult） | -         |

`data` 字段结构（AdoptResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

**错误说明**：

- 当 `qaAnswerId` 为楼中楼回复（非根回答）时，返回 HTTP 400，message 为 `Only root answer can be adopted`。

---

## 43. 取消采纳（需登录）

**接口标题**：取消采纳

**功能描述**：问题作者取消当前已采纳的回答。

**接口路由**：`POST /qa-questions/unadopt`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                | 示例      |
| ------- | ------ | ------------------- | --------- |
| code    | string | 状态码              | '0'       |
| message | string | 状态描述            | 'success' |
| data    | object | 数据（AdoptResult） | -         |

`data` 字段结构（AdoptResult）：同上 `AdoptResult` 字段。

---

## 44. 问答问题点赞（需登录）

**接口标题**：问答问题点赞

**功能描述**：对问答问题点赞（同一用户对同一问题只能点赞一次）。

**接口路由**：`POST /qa-questions/like`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（LikeResult） | -         |

`data` 字段结构（LikeResult）：

| 字段           | 类型   | 说明       | 示例 |
| -------------- | ------ | ---------- | ---- |
| data.likeCount | number | 最新点赞数 | 12   |

---

## 45. 问答问题取消点赞（需登录）

**接口标题**：问答问题取消点赞

**功能描述**：取消对问答问题的点赞。

**接口路由**：`POST /qa-questions/unlike`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（LikeResult） | -         |

`data` 字段结构（LikeResult）：同上 `LikeResult` 字段。

---

## 46. 获取问答回答列表（需登录）

**接口标题**：问答回答列表

**功能描述**：获取指定问题下的回答列表（支持分页，采纳回答置顶）。

- 不传 `rootQaAnswerId`：返回该问题下的根回答列表；每条根回答会返回 `replyCount`（该根回答引发的回复数）。
- 传 `rootQaAnswerId`：返回该根回答下的回复列表（包含多级回复）。

**接口路由**：`POST /qa-answers`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）
- `rootQaAnswerId`（string，可选）：根回答业务 ID（格式：LD####AAAA）。传入时表示拉取该根回答下的回复列表。

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                       | 示例      |
| ------- | ------ | -------------------------- | --------- |
| code    | string | 状态码                     | '0'       |
| message | string | 状态描述                   | 'success' |
| data    | object | 数据（QaAnswerListResult） | -         |

`data` 字段结构（QaAnswerListResult）：

| 字段          | 类型   | 说明               | 示例 |
| ------------- | ------ | ------------------ | ---- |
| data.list     | array  | 列表（QaAnswer[]） | -    |
| data.page     | number | 当前页码           | 1    |
| data.pageSize | number | 每页条数           | 10   |
| data.total    | number | 总条数             | 100  |

`data.list` 字段结构（QaAnswer[]）：

| 字段                         | 类型          | 说明                                           | 示例                                 |
| ---------------------------- | ------------- | ---------------------------------------------- | ------------------------------------ |
| data.list[].id               | string        | 主键 ID（UUID）                                | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].qaAnswerId       | string        | 回答业务 ID（格式：LD####AAAA）                | LD0009WXYZ                           |
| data.list[].qaQuestionId     | string        | 问题业务 ID                                    | LD0007YZAB                           |
| data.list[].authorUserId     | string        | 作者用户业务 ID                                | LD0002EFGH                           |
| data.list[].nickname         | string        | 作者昵称（未设置时为空字符串）                 | 张三                                 |
| data.list[].content          | string        | 回答内容                                       | 按住左侧按钮 3 秒                    |
| data.list[].likeCount        | number        | 点赞数                                         | 5                                    |
| data.list[].isLiked          | boolean       | 当前登录用户是否已点赞该回答                   | true                                 |
| data.list[].isCollected      | boolean       | 当前登录用户是否已收藏该回答                   | false                                |
| data.list[].isAccepted       | boolean       | 是否已采纳                                     | false                                |
| data.list[].acceptedAt       | string \ null | 采纳时间（YYYY-MM-DD HH:mm:ss）                | 2026-01-20 12:00:00                  |
| data.list[].createdAt        | string        | 创建时间（YYYY-MM-DD HH:mm:ss）                | 2026-01-20 12:00:00                  |
| data.list[].updatedAt        | string        | 记录更新时间（YYYY-MM-DD HH:mm:ss）            | 2026-01-20 12:00:00                  |
| data.list[].modifiedAt       | string \ null | 内容修改时间（YYYY-MM-DD HH:mm:ss）            | 2026-01-20 12:00:00                  |
| data.list[].parentQaAnswerId | string \ null | 父回答业务 ID（根回答固定为 null）             | null                                 |
| data.list[].rootQaAnswerId   | string \ null | 根回答业务 ID（根回答固定为 null）             | null                                 |
| data.list[].replyCount       | number        | 该根回答引发的回复数（仅根回答列表场景有意义） | 3                                    |

---

## 47. 新增问答回答（需登录）

**接口标题**：新增问答回答

**功能描述**：在指定问题下新增一条回答；也可用于对某条回答进行回复（楼中楼）。

**接口路由**：`POST /qa-answers/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）
- `content`（string，必填）：回答内容
- `parentQaAnswerId`（string \ null，可选）：父回答业务 ID。不传/传 null 表示根回答；传值表示新增楼中楼回复。

**返回值（Success 201）**：对象 `QaAnswer`

| 字段    | 类型   | 说明             | 示例      |
| ------- | ------ | ---------------- | --------- |
| code    | string | 状态码           | '0'       |
| message | string | 状态描述         | 'success' |
| data    | object | 数据（QaAnswer） | -         |

`data` 字段结构（QaAnswer）：同上 `QaAnswer` 字段。

---

## 48. 修改问答回答（需登录）

**接口标题**：修改问答回答

**功能描述**：更新回答内容（按 qaAnswerId 定位）。

**接口路由**：`POST /qa-answers/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaAnswerId`（string，必填）：回答业务 ID（格式：LD####AAAA）
- `content`（string，必填）：回答内容

**返回值（Success 200）**：对象 `QaAnswer`

| 字段    | 类型   | 说明             | 示例      |
| ------- | ------ | ---------------- | --------- |
| code    | string | 状态码           | '0'       |
| message | string | 状态描述         | 'success' |
| data    | object | 数据（QaAnswer） | -         |

`data` 字段结构（QaAnswer）：同上 `QaAnswer` 字段。

---

## 49. 删除问答回答（需登录）

**接口标题**：删除问答回答

**功能描述**：删除回答（硬删除）。若删除的是根回答，会连带删除该根回答下所有回复。若删除涉及已采纳回答（包含线程内回复的历史采纳数据），会自动清除问题的采纳状态。

**接口路由**：`POST /qa-answers/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaAnswerId`（string，必填）：回答业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：同上 `DeleteResult` 字段。

---

## 50. 问答回答点赞（需登录）

**接口标题**：问答回答点赞

**功能描述**：对回答点赞（同一用户对同一回答只能点赞一次）。

**接口路由**：`POST /qa-answers/like`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaAnswerId`（string，必填）：回答业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（LikeResult） | -         |

`data` 字段结构（LikeResult）：

| 字段           | 类型   | 说明       | 示例 |
| -------------- | ------ | ---------- | ---- |
| data.likeCount | number | 最新点赞数 | 5    |

---

## 51. 问答回答取消点赞（需登录）

**接口标题**：问答回答取消点赞

**功能描述**：取消对回答的点赞。

**接口路由**：`POST /qa-answers/unlike`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaAnswerId`（string，必填）：回答业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（LikeResult） | -         |

`data` 字段结构（LikeResult）：同上 `LikeResult` 字段。

---

## 52. 设置问答精选（需登录）

**接口标题**：设置问答精选

**功能描述**：将指定问答问题设置为精选（仅版主/管理员可操作）。

**接口路由**：`POST /qa-questions/feature`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（FeatureResult） | -         |

`data` 字段结构（FeatureResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 53. 问答回答收藏（需登录）

**接口标题**：问答回答收藏

**功能描述**：将指定回答加入当前登录用户的收藏列表（同一用户对同一回答只能收藏一次，重复收藏视为幂等）。

**接口路由**：`POST /qa-answers/collect`

**请求头（Headers）：**

- `Authorization: Bearer <token>`

**参数（Body）：**

- `qaAnswerId`（string，必填）：回答业务 ID（格式：LD####AAAA）

**返回值（Success 200）：**对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（CollectResult） | -         |

`data` 字段结构（CollectResult）：

| 字段             | 类型    | 说明                                 | 示例 |
| ---------------- | ------- | ------------------------------------ | ---- |
| data.isCollected | boolean | 是否已收藏（成功收藏或已在收藏夹中） | true |

---

## 54. 问答回答取消收藏（需登录）

**接口标题**：问答回答取消收藏

**功能描述**：将指定回答从当前登录用户的收藏列表中移除（幂等操作，未收藏时也视为成功）。

**接口路由**：`POST /qa-answers/uncollect`

**请求头（Headers）：**

- `Authorization: Bearer <token>`

**参数（Body）：**

- `qaAnswerId`（string，必填）：回答业务 ID（格式：LD####AAAA）

**返回值（Success 200）：**对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（CollectResult） | -         |

`data` 字段结构（CollectResult）：同上 `CollectResult` 字段。

---

## 55. 取消问答精选（需登录）

**接口标题**：取消问答精选

**功能描述**：取消指定问答问题的精选状态（仅版主/管理员可操作）。

**接口路由**：`POST /qa-questions/unfeature`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `qaQuestionId`（string，必填）：问答问题业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（FeatureResult） | -         |

`data` 字段结构（FeatureResult）：同上 `FeatureResult` 字段。

---

## 56. 获取文章分类列表（需登录）

**接口标题**：文章分类列表

**功能描述**：获取文章分类列表，支持按分类名关键词筛选，支持分页。

**接口路由**：`POST /article-categories`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 1000，最大 1000）
- `nameKeyword`（string，可选）：分类名关键词（对 name 做模糊匹配）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                              | 示例      |
| ------- | ------ | --------------------------------- | --------- |
| code    | string | 状态码                            | '0'       |
| message | string | 状态描述                          | 'success' |
| data    | object | 数据（ArticleCategoryListResult） | -         |

`data` 字段结构（ArticleCategoryListResult）：

| 字段          | 类型   | 说明                      | 示例 |
| ------------- | ------ | ------------------------- | ---- |
| data.list     | array  | 列表（ArticleCategory[]） | -    |
| data.page     | number | 当前页码                  | 1    |
| data.pageSize | number | 每页条数                  | 1000 |
| data.total    | number | 总条数                    | 20   |

`data.list` 字段结构（ArticleCategory[]）：

| 字段                          | 类型    | 说明                            | 示例                                 |
| ----------------------------- | ------- | ------------------------------- | ------------------------------------ |
| data.list[].id                | string  | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].articleCategoryId | string  | 分类业务 ID（格式：LD####AAAA） | LD0001ABCD                           |
| data.list[].name              | string  | 分类名字                        | 新闻                                 |
| data.list[].description       | string  | 分类描述                        | 新闻类文章分类                       |
| data.list[].seq               | number  | 排序 seq                        | 0                                    |
| data.list[].isEnabled         | boolean | 是否启用                        | true                                 |
| data.list[].updatedAt         | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-24 12:00:00                  |

---

## 55. 新增文章分类（需登录）

**接口标题**：新增文章分类

**功能描述**：创建一条新的文章分类记录。

**接口路由**：`POST /article-categories/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `name`（string，必填）：分类名字
- `description`（string，可选，默认 ''）：分类描述
- `seq`（number，可选，默认 0）：排序 seq
- `isEnabled`（boolean，可选，默认 true）：是否启用

**返回值（Success 201）**：对象 `ArticleCategory`

| 字段    | 类型   | 说明                    | 示例      |
| ------- | ------ | ----------------------- | --------- |
| code    | string | 状态码                  | '0'       |
| message | string | 状态描述                | 'success' |
| data    | object | 数据（ArticleCategory） | -         |

`data` 字段结构（ArticleCategory）：同上 `ArticleCategory` 字段。

---

## 56. 修改文章分类（需登录）

**接口标题**：修改文章分类

**功能描述**：更新文章分类内容（按 articleCategoryId 定位，支持部分字段更新）。

**接口路由**：`POST /article-categories/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleCategoryId`（string，必填）：分类业务 ID（格式：LD####AAAA）
- `name`（string，可选）：分类名字
- `description`（string，可选）：分类描述
- `seq`（number，可选）：排序 seq
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象 `ArticleCategory`

| 字段    | 类型   | 说明                    | 示例      |
| ------- | ------ | ----------------------- | --------- |
| code    | string | 状态码                  | '0'       |
| message | string | 状态描述                | 'success' |
| data    | object | 数据（ArticleCategory） | -         |

`data` 字段结构（ArticleCategory）：同上 `ArticleCategory` 字段。

---

## 57. 删除文章分类（需登录）

**接口标题**：删除文章分类

**功能描述**：删除一条文章分类记录（软删除）。

**接口路由**：`POST /article-categories/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleCategoryId`（string，必填）：分类业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 58. 获取文章列表（需登录）

**接口标题**：文章列表

**功能描述**：获取文章列表，支持分页与筛选。

**接口路由**：`POST /articles`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选）：标题关键词（对 title 做模糊匹配）
- `articleCategoryId`（string，可选）：文章分类业务 ID（格式：LD####AAAA）
- `authorUserId`（string，可选）：作者用户业务 ID（格式：LD####AAAA）
- `isEnabled`（boolean，可选）：是否启用（仅管理员/版主可用）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                      | 示例      |
| ------- | ------ | ------------------------- | --------- |
| code    | string | 状态码                    | '0'       |
| message | string | 状态描述                  | 'success' |
| data    | object | 数据（ArticleListResult） | -         |

`data` 字段结构（ArticleListResult）：

| 字段          | 类型   | 说明              | 示例 |
| ------------- | ------ | ----------------- | ---- |
| data.list     | array  | 列表（Article[]） | -    |
| data.page     | number | 当前页码          | 1    |
| data.pageSize | number | 每页条数          | 10   |
| data.total    | number | 总条数            | 100  |

`data.list` 字段结构（Article[]）：

| 字段                              | 类型    | 说明                                           | 示例                                 |
| --------------------------------- | ------- | ---------------------------------------------- | ------------------------------------ |
| data.list[].id                    | string  | 主键 ID（UUID）                                | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].articleId             | string  | 文章业务 ID（格式：LD####AAAA）                | LD0001ABCD                           |
| data.list[].authorUserId          | string  | 作者用户业务 ID                                | LD0002EFGH                           |
| data.list[].articleCategoryId     | string  | 分类业务 ID                                    | LD0003IJKL                           |
| data.list[].title                 | string  | 标题                                           | 标题示例                             |
| data.list[].content               | string  | 正文（textarea 纯文本）                        | ...                                  |
| data.list[].coverScreenshotBase64 | string  | 封面截图（base64/dataURL）                     | data:image/png;base64,...            |
| data.list[].coverPhotoBase64      | string  | 封面图（base64/dataURL）                       | data:image/jpeg;base64,...           |
| data.list[].contentImages         | array   | 正文图片 base64/dataURL 数组                   | []                                   |
| data.list[].isEnabled             | boolean | 是否启用                                       | true                                 |
| data.list[].isHot                 | boolean | 是否热门                                       | false                                |
| data.list[].viewCount             | number  | 浏览量                                         | 0                                    |
| data.list[].likeCount             | number  | 点赞数                                         | 0                                    |
| data.list[].commentCount          | number  | 评论数（含楼中楼回复，口径同问答 answerCount） | 0                                    |
| data.list[].collectCount          | number  | 收藏数量                                       | 12                                   |
| data.list[].publishedAt           | string  | 发布时间（YYYY-MM-DD HH:mm:ss）                | 2026-01-25 12:00:00                  |
| data.list[].modifiedAt            | string  | 最近评论更新时间（YYYY-MM-DD HH:mm:ss）        | 2026-01-25 12:00:00                  |
| data.list[].createdAt             | string  | 创建时间（YYYY-MM-DD HH:mm:ss）                | 2026-01-25 12:00:00                  |
| data.list[].updatedAt             | string  | 更新时间（YYYY-MM-DD HH:mm:ss）                | 2026-01-25 12:00:00                  |

---

## 59. 获取文章详情（需登录）

**接口标题**：文章详情

**功能描述**：获取文章详情（按 articleId）。

**接口路由**：`POST /articles/detail`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象 `Article`

| 字段    | 类型   | 说明            | 示例      |
| ------- | ------ | --------------- | --------- |
| code    | string | 状态码          | '0'       |
| message | string | 状态描述        | 'success' |
| data    | object | 数据（Article） | -         |

`data` 字段结构（Article）：同上 `Article[]` 的字段结构。

并额外返回：

| 字段              | 类型    | 说明                         | 示例  |
| ----------------- | ------- | ---------------------------- | ----- |
| data.isLiked      | boolean | 当前登录用户是否已点赞该文章 | true  |
| data.isCollected  | boolean | 当前登录用户是否已收藏该文章 | false |
| data.collectCount | number  | 收藏数量                     | 12    |

---

## 60. 新增文章（需登录）

**接口标题**：新增文章

**功能描述**：创建一篇新文章，图片字段均为 base64/dataURL。

**接口路由**：`POST /articles/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleCategoryId`（string，必填）：分类业务 ID（格式：LD####AAAA）
- `title`（string，必填）：标题
- `content`（string，必填）：正文内容（textarea 纯文本）
- `coverScreenshotBase64`（string，必填）：封面截图 base64/dataURL
- `coverPhotoBase64`（string，必填）：封面图 base64/dataURL
- `contentImages`（array，可选，默认 []）：正文图片 base64/dataURL 数组
- `isEnabled`（boolean，可选，默认 true）：是否启用（仅管理员/版主可关闭）

**返回值（Success 201）**：对象 `Article`

| 字段    | 类型   | 说明            | 示例      |
| ------- | ------ | --------------- | --------- |
| code    | string | 状态码          | '0'       |
| message | string | 状态描述        | 'success' |
| data    | object | 数据（Article） | -         |

---

## 61. 修改文章（需登录）

**接口标题**：修改文章

**功能描述**：更新文章内容（不修改 publishedAt；modifiedAt 仅由评论变更触发）。

**接口路由**：`POST /articles/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）
- `articleCategoryId`（string，可选）：分类业务 ID
- `title`（string，可选）：标题
- `content`（string，可选）：正文内容（textarea 纯文本）
- `coverScreenshotBase64`（string，可选）：封面截图 base64/dataURL
- `coverPhotoBase64`（string，可选）：封面图 base64/dataURL
- `contentImages`（array，可选）：正文图片 base64/dataURL 数组
- `isEnabled`（boolean，可选）：是否启用（仅管理员/版主可修改）

**返回值（Success 200）**：对象 `Article`

| 字段    | 类型   | 说明            | 示例      |
| ------- | ------ | --------------- | --------- |
| code    | string | 状态码          | '0'       |
| message | string | 状态描述        | 'success' |
| data    | object | 数据（Article） | -         |

---

## 62. 删除文章（需登录）

**接口标题**：删除文章

**功能描述**：删除一篇文章（软删除）。

**接口路由**：`POST /articles/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

---

## 63. 获取文章评论列表（需登录）

**接口标题**：文章评论列表

**功能描述**：获取文章评论列表，支持楼外楼（不传 rootArticleCommentId 获取根评论；传 rootArticleCommentId 获取该根评论的回复列表）。

**接口路由**：`POST /article-comments`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）
- `rootArticleCommentId`（string，可选）：根评论业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                             | 示例      |
| ------- | ------ | -------------------------------- | --------- |
| code    | string | 状态码                           | '0'       |
| message | string | 状态描述                         | 'success' |
| data    | object | 数据（ArticleCommentListResult） | -         |

`data` 字段结构（ArticleCommentListResult）：

| 字段          | 类型   | 说明                     | 示例 |
| ------------- | ------ | ------------------------ | ---- |
| data.list     | array  | 列表（ArticleComment[]） | -    |
| data.page     | number | 当前页码                 | 1    |
| data.pageSize | number | 每页条数                 | 10   |
| data.total    | number | 总条数                   | 100  |

`data.list` 字段结构（ArticleComment[]）：

| 字段                               | 类型          | 说明                            | 示例                                 |
| ---------------------------------- | ------------- | ------------------------------- | ------------------------------------ |
| data.list[].id                     | string        | 主键 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].articleCommentId       | string        | 评论业务 ID（格式：LD####AAAA） | LD0001ABCD                           |
| data.list[].articleId              | string        | 文章业务 ID                     | LD0002EFGH                           |
| data.list[].authorUserId           | string        | 作者用户业务 ID                 | LD0003IJKL                           |
| data.list[].nickname               | string        | 作者昵称                        | 张三                                 |
| data.list[].content                | string        | 评论内容                        | ...                                  |
| data.list[].likeCount              | number        | 点赞数                          | 0                                    |
| data.list[].isLiked                | boolean       | 当前用户是否已点赞              | false                                |
| data.list[].replyCount             | number        | 回复数（仅根评论列表返回有效）  | 0                                    |
| data.list[].parentArticleCommentId | string \ null | 父评论业务 ID                   | null                                 |
| data.list[].rootArticleCommentId   | string \ null | 根评论业务 ID                   | null                                 |
| data.list[].createdAt              | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-25 12:00:00                  |
| data.list[].updatedAt              | string        | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-25 12:00:00                  |
| data.list[].modifiedAt             | string \ null | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-25 12:00:00                  |

---

## 64. 新增文章评论（需登录）

**接口标题**：新增文章评论

**功能描述**：新增一条评论或回复（parentArticleCommentId 不传/为空则为根评论）。

**接口路由**：`POST /article-comments/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）
- `content`（string，必填）：评论内容
- `parentArticleCommentId`（string \ null，可选）：父评论业务 ID（格式：LD####AAAA）

**返回值（Success 201）**：对象 `ArticleComment`

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（ArticleComment） | -         |

---

## 65. 修改文章评论（需登录）

**接口标题**：修改文章评论

**功能描述**：修改评论内容。

**接口路由**：`POST /article-comments/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleCommentId`（string，必填）：评论业务 ID（格式：LD####AAAA）
- `content`（string，必填）：评论内容

**返回值（Success 200）**：对象 `ArticleComment`

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（ArticleComment） | -         |

---

## 66. 删除文章评论（需登录）

**接口标题**：删除文章评论

**功能描述**：删除评论（根评论删除时会一并删除该楼全部回复）。

**接口路由**：`POST /article-comments/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleCommentId`（string，必填）：评论业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象 `DeleteResult`

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

---

## 67. 点赞文章评论（需登录）

**接口标题**：点赞文章评论

**功能描述**：对评论点赞。

**接口路由**：`POST /article-comments/like`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleCommentId`（string，必填）：评论业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（LikeResult） | -         |

`data` 字段结构（LikeResult）：

| 字段           | 类型   | 说明       | 示例 |
| -------------- | ------ | ---------- | ---- |
| data.likeCount | number | 最新点赞数 | 10   |

---

## 68. 取消点赞文章评论（需登录）

**接口标题**：取消点赞文章评论

**功能描述**：取消对评论的点赞。

**接口路由**：`POST /article-comments/unlike`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleCommentId`（string，必填）：评论业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象 `LikeResult`

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（LikeResult） | -         |

---

## 69. 文章点赞（需登录）

**接口标题**：文章点赞

**功能描述**：对文章点赞（同一用户对同一文章只能点赞一次）。

**接口路由**：`POST /articles/like`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（LikeResult） | -         |

`data` 字段结构（LikeResult）：

| 字段           | 类型   | 说明       | 示例 |
| -------------- | ------ | ---------- | ---- |
| data.likeCount | number | 最新点赞数 | 12   |

---

## 70. 文章取消点赞（需登录）

**接口标题**：文章取消点赞

**功能描述**：取消对文章的点赞。

**接口路由**：`POST /articles/unlike`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象 `LikeResult`

| 字段    | 类型   | 说明               | 示例      |
| ------- | ------ | ------------------ | --------- |
| code    | string | 状态码             | '0'       |
| message | string | 状态描述           | 'success' |
| data    | object | 数据（LikeResult） | -         |

`data` 字段结构（LikeResult）：同上 `LikeResult` 字段。

---

## 71. 文章收藏（需登录）

**接口标题**：文章收藏

**功能描述**：将指定文章加入当前登录用户的收藏列表（同一用户对同一文章只能收藏一次，重复收藏视为幂等）。

**接口路由**：`POST /articles/collect`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（CollectResult） | -         |

`data` 字段结构（CollectResult）：

| 字段             | 类型    | 说明                                 | 示例 |
| ---------------- | ------- | ------------------------------------ | ---- |
| data.isCollected | boolean | 是否已收藏（成功收藏或已在收藏夹中） | true |

---

## 72. 文章取消收藏（需登录）

---

## 72.1 设置文章热门（需登录）

**接口标题**：设置文章热门

**功能描述**：将指定文章设置为热门（仅管理员/版主可操作）。重复设置会刷新热门时间，用于排序。

**接口路由**：`POST /articles/hot`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明              | 示例      |
| ------- | ------ | ----------------- | --------- |
| code    | string | 状态码            | '0'       |
| message | string | 状态描述          | 'success' |
| data    | object | 数据（HotResult） | -         |

`data` 字段结构（HotResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

**错误说明**：

- 非管理员/版主操作时，HTTP 403，message 为 `Forbidden`。
- articleId 不存在时，HTTP 404，message 为 `Article not found`。

---

## 72.2 取消文章热门（需登录）

**接口标题**：取消文章热门

**功能描述**：取消指定文章的热门状态（仅管理员/版主可操作）。幂等操作。

**接口路由**：`POST /articles/unhot`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明              | 示例      |
| ------- | ------ | ----------------- | --------- |
| code    | string | 状态码            | '0'       |
| message | string | 状态描述          | 'success' |
| data    | object | 数据（HotResult） | -         |

`data` 字段结构（HotResult）：同上 `HotResult` 字段结构。

**错误说明**：

- 非管理员/版主操作时，HTTP 403，message 为 `Forbidden`。
- articleId 不存在时，HTTP 404，message 为 `Article not found`。

---

## 72.3 获取热门文章列表（需登录）

**接口标题**：热门文章列表

**功能描述**：获取热门文章列表，支持分页与筛选。

**接口路由**：`POST /articles/hot-list`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选）：标题关键词（对 title 做模糊匹配）
- `articleCategoryId`（string，可选）：文章分类业务 ID（格式：LD####AAAA）
- `isEnabled`（boolean，可选）：是否启用（仅管理员/版主可用）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                         | 示例      |
| ------- | ------ | ---------------------------- | --------- |
| code    | string | 状态码                       | '0'       |
| message | string | 状态描述                     | 'success' |
| data    | object | 数据（HotArticleListResult） | -         |

`data` 字段结构（HotArticleListResult）：

| 字段          | 类型   | 说明              | 示例 |
| ------------- | ------ | ----------------- | ---- |
| data.list     | array  | 列表（Article[]） | -    |
| data.page     | number | 当前页码          | 1    |
| data.pageSize | number | 每页条数          | 10   |
| data.total    | number | 总条数            | 100  |

`data.list` 字段结构（Article[]）：同上 `Article[]` 的字段结构。

---

## 73. 获取当前用户收藏列表（需登录）

**接口标题**：我的收藏列表

**功能描述**：获取当前登录用户的收藏列表，支持按类型（文章/问答回答/好物）分别查询，整体为一个统一接口。

**接口路由**：`POST /my/favorites`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `type`（string，必填）：收藏类型，可选值：
  - `'article'`：文章收藏列表
  - `'qa_answer'`：问答回答收藏列表
  - `'good_thing'`：好物收藏列表
- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选，默认空字符串）：
  - 当 `type = 'article'` 时，对文章标题 `title` 做模糊匹配
  - 当 `type = 'qa_answer'` 时，对问题标题 `questionTitle` 做模糊匹配
  - 当 `type = 'good_thing'` 时，对好物 `title/description/buyConfig` 做模糊匹配

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                       | 示例      |
| ------- | ------ | -------------------------- | --------- |
| code    | string | 状态码                     | '0'       |
| message | string | 状态描述                   | 'success' |
| data    | object | 数据（FavoriteListResult） | -         |

`data` 字段结构（FavoriteListResult）：

| 字段          | 类型   | 说明     | 示例 |
| ------------- | ------ | -------- | ---- |
| data.list     | array  | 列表     | -    |
| data.page     | number | 当前页码 | 1    |
| data.pageSize | number | 每页条数 | 10   |
| data.total    | number | 总条数   | 20   |

当 `type = 'article'` 时，`data.list` 结构同上 `Article[]` 字段结构，并额外包含：

| 字段                    | 类型    | 说明                                      | 示例 |
| ----------------------- | ------- | ----------------------------------------- | ---- |
| data.list[].isLiked     | boolean | 当前登录用户是否已点赞该文章              | true |
| data.list[].isCollected | boolean | 当前登录用户是否已收藏该文章（恒为 true） | true |

当 `type = 'qa_answer'` 时，`data.list` 中每一项为一个回答对象（QaAnswer），字段包含：

| 字段                         | 类型          | 说明                                      | 示例                                 |
| ---------------------------- | ------------- | ----------------------------------------- | ------------------------------------ |
| data.list[].id               | string        | 主键 ID（UUID）                           | 550e8400-e29b-41d4-a716-446655440000 |
| data.list[].qaAnswerId       | string        | 回答业务 ID（格式：LD####AAAA）           | LD0009WXYZ                           |
| data.list[].qaQuestionId     | string        | 问题业务 ID                               | LD0007YZAB                           |
| data.list[].authorUserId     | string        | 作者用户业务 ID                           | LD0002EFGH                           |
| data.list[].nickname         | string        | 作者昵称                                  | 张三                                 |
| data.list[].questionTitle    | string        | 所属问题标题                              | 我的车钥匙没电怎么办？               |
| data.list[].content          | string        | 回答内容                                  | 按住左侧按钮 3 秒                    |
| data.list[].likeCount        | number        | 点赞数                                    | 5                                    |
| data.list[].isLiked          | boolean       | 当前登录用户是否已点赞该回答              | true                                 |
| data.list[].isAccepted       | boolean       | 是否已采纳                                | false                                |
| data.list[].acceptedAt       | string \ null | 采纳时间（YYYY-MM-DD HH:mm:ss）           | 2026-01-20 12:00:00                  |
| data.list[].createdAt        | string        | 创建时间（YYYY-MM-DD HH:mm:ss）           | 2026-01-20 12:00:00                  |
| data.list[].updatedAt        | string        | 记录更新时间（YYYY-MM-DD HH:mm:ss）       | 2026-01-20 12:00:00                  |
| data.list[].modifiedAt       | string \ null | 内容修改时间（YYYY-MM-DD HH:mm:ss）       | 2026-01-20 12:00:00                  |
| data.list[].parentQaAnswerId | string \ null | 父回答业务 ID                             | null                                 |
| data.list[].rootQaAnswerId   | string \ null | 根回答业务 ID                             | null                                 |
| data.list[].isCollected      | boolean       | 当前登录用户是否已收藏该回答（恒为 true） | true                                 |

当 `type = 'good_thing'` 时，`data.list` 中每一项为一个好物对象（GoodThing），字段结构同「106. 获取好物列表」的 `GoodThing`，并额外包含：

| 字段                    | 类型    | 说明                                      | 示例 |
| ----------------------- | ------- | ----------------------------------------- | ---- |
| data.list[].isLiked     | boolean | 当前登录用户是否已点赞该好物              | true |
| data.list[].isCollected | boolean | 当前登录用户是否已收藏该好物（恒为 true） | true |

**接口标题**：文章取消收藏

**功能描述**：将指定文章从当前登录用户的收藏列表中移除（幂等操作，未收藏时也视为成功）。

**接口路由**：`POST /articles/uncollect`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `articleId`（string，必填）：文章业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（CollectResult） | -         |

`data` 字段结构（CollectResult）：同上 `CollectResult` 字段。

## 74. 获取当前用户发布列表（需登录）

**接口标题**：我的发布列表

**功能描述**：获取当前登录用户发布的内容列表，支持按类型（文章/问答问题）分别查询。

**接口路由**：`POST /my/posts`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `type`（string，必填）：发布内容类型，可选值：
  - `'article'`：文章发布列表（当前用户作为作者）
  - `'qa_question'`：问答问题发布列表（当前用户作为提问者）
- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选，默认空字符串）：标题关键词（对文章/问题标题 `title` 做模糊匹配）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                     | 示例      |
| ------- | ------ | ------------------------ | --------- |
| code    | string | 状态码                   | '0'       |
| message | string | 状态描述                 | 'success' |
| data    | object | 数据（MyPostListResult） | -         |

`data` 字段结构（MyPostListResult）：

| 字段          | 类型   | 说明     | 示例 |
| ------------- | ------ | -------- | ---- |
| data.list     | array  | 列表     | -    |
| data.page     | number | 当前页码 | 1    |
| data.pageSize | number | 每页条数 | 10   |
| data.total    | number | 总条数   | 20   |

当 `type = 'article'` 时，`data.list` 结构同上 `Article[]` 字段结构。

当 `type = 'qa_question'` 时，`data.list` 结构同上 `QaQuestion[]` 字段结构。

## 75. 获取社区系统指南（需登录）

**接口标题**：社区系统指南

**功能描述**：获取社区系统指南（系统唯一一份指南），不需要任何参数。

**接口路由**：`POST /community-guides`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：无（可传空对象 `{}`）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（CommunityGuide） | -         |

`data` 字段结构（CommunityGuide）：

| 字段                         | 类型    | 说明                            | 示例                                       |
| ---------------------------- | ------- | ------------------------------- | ------------------------------------------ |
| data.communityGuideId        | string  | 指南业务 ID（格式：LD####AAAA） | LD0009WXYZ                                 |
| data.title                   | string  | 标题                            | 社区指南：如何使用蓝电信息系统             |
| data.summary                 | string  | 简介                            | 第一次使用本系统？这篇指南将带你快速上手。 |
| data.tags                    | array   | 标签数组                        | ['通知', '新手必读']                       |
| data.contentBlocks           | array   | 正文块数组                      | -                                          |
| data.contentBlocks[].title   | string  | 小标题                          | 首页模块说明                               |
| data.contentBlocks[].content | string  | 小正文                          | 当前页面，帮助你理解系统结构与入口。       |
| data.isEnabled               | boolean | 是否启用                        | true                                       |
| data.createdAt               | string  | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-31 12:00:00                        |
| data.updatedAt               | string  | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-31 12:00:00                        |

## 76. 创建社区系统指南（需登录）

**接口标题**：创建社区系统指南

**功能描述**：创建系统唯一一份社区指南（若已存在则报错）。

**接口路由**：`POST /community-guides/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `title`（string，必填）：标题（1~100）
- `summary`（string，可选）：简介（0~5000，默认空字符串）
- `tags`（string[]，可选）：标签数组（最多 50 个）
- `contentBlocks`（array，可选）：正文块数组（最多 200 条）
  - `contentBlocks[].title`（string，必填）：小标题（1~100）
  - `contentBlocks[].content`（string，必填）：小正文（1~20000）
- `isEnabled`（boolean，可选）：是否启用（默认 true）

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（CommunityGuide） | -         |

`data` 字段结构（CommunityGuide）：同上。

## 77. 更新社区系统指南（需登录）

**接口标题**：更新社区系统指南

**功能描述**：更新系统唯一一份社区指南。

**接口路由**：`POST /community-guides/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：至少传一个字段

- `title`（string，可选）：标题（1~100）
- `summary`（string，可选）：简介（0~5000）
- `tags`（string[]，可选）：标签数组（最多 50 个）
- `contentBlocks`（array，可选）：正文块数组（最多 200 条）
  - `contentBlocks[].title`（string，必填）：小标题（1~100）
  - `contentBlocks[].content`（string，必填）：小正文（1~20000）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                   | 示例      |
| ------- | ------ | ---------------------- | --------- |
| code    | string | 状态码                 | '0'       |
| message | string | 状态描述               | 'success' |
| data    | object | 数据（CommunityGuide） | -         |

`data` 字段结构（CommunityGuide）：同上。

## 78. 删除社区系统指南（需登录）

**接口标题**：删除社区系统指南

**功能描述**：删除系统唯一一份社区指南（软删除）。

**接口路由**：`POST /community-guides/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：无（可传空对象 `{}`）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

## 79. 获取 OTA 更新日志列表（需登录）

**接口标题**：OTA 更新日志列表

**功能描述**：获取 OTA 更新日志列表，支持分页与筛选。

**接口路由**：`POST /ota-logs`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `channel`（string，可选）：渠道（stable/beta）
- `pushStatus`（string，可选）：推送状态（scheduled/pushing/paused/completed）
- `isEnabled`（boolean，可选）：是否启用
- `versionKeyword`（string，可选）：版本关键词（对 versionName 做模糊匹配）
- `otaLogId`（string，可选）：OTA 日志业务 ID（格式：LD####AAAA；传入则按单条精确查询）
- `includeDetail`（boolean，可选）：是否包含详情字段 sections/cautions/faqs（默认 false）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                     | 示例      |
| ------- | ------ | ------------------------ | --------- |
| code    | string | 状态码                   | '0'       |
| message | string | 状态描述                 | 'success' |
| data    | object | 数据（OtaLogListResult） | -         |

`data` 字段结构（OtaLogListResult）：

| 字段          | 类型   | 说明             | 示例 |
| ------------- | ------ | ---------------- | ---- |
| data.list     | array  | 列表（OtaLog[]） | -    |
| data.page     | number | 当前页码         | 1    |
| data.pageSize | number | 每页条数         | 10   |
| data.total    | number | 总条数           | 100  |

`data.list` 字段结构（OtaLog[]）：

| 字段                             | 类型          | 说明                                           | 示例                             |
| -------------------------------- | ------------- | ---------------------------------------------- | -------------------------------- |
| data.list[].otaLogId             | string        | OTA 日志业务 ID（格式：LD####AAAA）            | LD0007YZAB                       |
| data.list[].channel              | string        | 渠道（stable/beta）                            | stable                           |
| data.list[].versionName          | string        | 版本号展示                                     | V1.3.0                           |
| data.list[].versionCode          | number \ null | 版本数值（可选）                               | 10300                            |
| data.list[].pushStatus           | string        | 推送状态（scheduled/pushing/paused/completed） | pushing                          |
| data.list[].publishedAt          | string        | 发布日期（YYYY-MM-DD）                         | 2026-01-03                       |
| data.list[].packageSizeBytes     | number \ null | 包大小（字节，可选）                           | 1288490188                       |
| data.list[].packageSizeText      | string        | 包大小展示（可选）                             | 1.2 GB                           |
| data.list[].applicableModelsText | string        | 适用车型文案                                   | 蓝电 SUV 全系、蓝电 轿车 2024 款 |
| data.list[].summary              | string        | 列表简述                                       | 本次优化续航与稳定性             |
| data.list[].seq                  | number        | 排序号                                         | 0                                |
| data.list[].isEnabled            | boolean       | 是否启用                                       | true                             |
| data.list[].createdAt            | string        | 创建时间（YYYY-MM-DD HH:mm:ss）                | 2026-01-28 12:00:00              |
| data.list[].updatedAt            | string        | 更新时间（YYYY-MM-DD HH:mm:ss）                | 2026-01-28 12:00:00              |
| data.list[].sections             | array         | 更新内容分组（includeDetail=true 时返回）      | -                                |
| data.list[].cautions             | array         | 注意事项（includeDetail=true 时返回）          | -                                |
| data.list[].faqs                 | array         | 常见问题（includeDetail=true 时返回）          | -                                |

`data.list[].sections` 字段结构：

| 字段                         | 类型     | 说明     | 示例           |
| ---------------------------- | -------- | -------- | -------------- |
| data.list[].sections[].title | string   | 分组标题 | 续航与能耗优化 |
| data.list[].sections[].items | string[] | 要点列表 | -              |

`data.list[].faqs` 字段结构：

| 字段                        | 类型     | 说明     | 示例                                          |
| --------------------------- | -------- | -------- | --------------------------------------------- |
| data.list[].faqs[].question | string   | 问题     | 升级过程一直停在“正在校验/安装”，需要等多久？ |
| data.list[].faqs[].answers  | string[] | 解决要点 | -                                             |

## 80. 新增 OTA 更新日志（需登录）

**接口标题**：新增 OTA 更新日志

**功能描述**：新增一条 OTA 更新日志。

**接口路由**：`POST /ota-logs/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `channel`（string，必填）：渠道（stable/beta）
- `versionName`（string，必填）：版本号展示（1~50）
- `versionCode`（number \ null，可选）：版本数值（0~2000000000）
- `pushStatus`（string，必填）：推送状态（scheduled/pushing/paused/completed）
- `publishedAt`（string，必填）：发布日期（ISO 字符串）
- `packageSizeBytes`（number \ null，可选）：包大小（字节）
- `packageSizeText`（string，可选）：包大小展示（0~50，默认空字符串）
- `applicableModelsText`（string，必填）：适用车型文案（1~5000）
- `summary`（string，可选）：列表简述（0~5000，默认空字符串）
- `sections`（array，可选）：更新内容分组（最多 50 组，默认 []）
  - `sections[].title`（string，必填）：分组标题（1~100）
  - `sections[].items`（string[]，必填）：要点列表（最多 50 条）
- `cautions`（string[]，可选）：注意事项（最多 200 条，默认 []）
- `faqs`（array，可选）：常见问题（最多 50 题，默认 []）
  - `faqs[].question`（string，必填）：问题（1~2000）
  - `faqs[].answers`（string[]，必填）：解决要点（最多 50 条）
- `seq`（number，可选）：排序号（默认 0）
- `isEnabled`（boolean，可选）：是否启用（默认 true）

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明           | 示例      |
| ------- | ------ | -------------- | --------- |
| code    | string | 状态码         | '0'       |
| message | string | 状态描述       | 'success' |
| data    | object | 数据（OtaLog） | -         |

`data` 字段结构（OtaLog）：同上 `OtaLog[]` 单项字段。

## 81. 更新 OTA 更新日志（需登录）

**接口标题**：更新 OTA 更新日志

**功能描述**：更新一条 OTA 更新日志（按 otaLogId 定位，支持部分字段更新）。

**接口路由**：`POST /ota-logs/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：至少传一个字段

- `otaLogId`（string，必填）：OTA 日志业务 ID（格式：LD####AAAA）
- `channel`（string，可选）：渠道（stable/beta）
- `versionName`（string，可选）：版本号展示（1~50）
- `versionCode`（number \ null，可选）：版本数值
- `pushStatus`（string，可选）：推送状态（scheduled/pushing/paused/completed）
- `publishedAt`（string，可选）：发布日期（ISO 字符串）
- `packageSizeBytes`（number \ null，可选）：包大小（字节）
- `packageSizeText`（string，可选）：包大小展示（0~50）
- `applicableModelsText`（string，可选）：适用车型文案（1~5000）
- `summary`（string，可选）：列表简述（0~5000）
- `sections`（array，可选）：更新内容分组（最多 50 组）
- `cautions`（string[]，可选）：注意事项（最多 200 条）
- `faqs`（array，可选）：常见问题（最多 50 题）
- `seq`（number，可选）：排序号
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明           | 示例      |
| ------- | ------ | -------------- | --------- |
| code    | string | 状态码         | '0'       |
| message | string | 状态描述       | 'success' |
| data    | object | 数据（OtaLog） | -         |

`data` 字段结构（OtaLog）：同上 `OtaLog[]` 单项字段。

## 82. 删除 OTA 更新日志（需登录）

**接口标题**：删除 OTA 更新日志

**功能描述**：删除一条 OTA 更新日志（软删除）。

**接口路由**：`POST /ota-logs/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `otaLogId`（string，必填）：OTA 日志业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

## 83. 获取社区 QA 列表（需登录）

**接口标题**：社区 QA 列表

**功能描述**：获取社区 QA 列表，支持分页与筛选。普通用户仅返回启用数据；管理员/版主可按 isEnabled 筛选。

**接口路由**：`POST /community-qas`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选）：标题关键词（对 title 做模糊匹配）
- `categoryId`（string，可选）：分类 ID（格式：LD####AAAA）
- `isEnabled`（boolean，可选）：是否启用（仅 admin/moderator 生效）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                          | 示例      |
| ------- | ------ | ----------------------------- | --------- |
| code    | string | 状态码                        | '0'       |
| message | string | 状态描述                      | 'success' |
| data    | object | 数据（CommunityQaListResult） | -         |

`data` 字段结构（CommunityQaListResult）：

| 字段          | 类型   | 说明                  | 示例 |
| ------------- | ------ | --------------------- | ---- |
| data.list     | array  | 列表（CommunityQa[]） | -    |
| data.page     | number | 当前页码              | 1    |
| data.pageSize | number | 每页条数              | 10   |
| data.total    | number | 总条数                | 100  |

`data.list` 字段结构（CommunityQa[]）：

| 字段                                       | 类型          | 说明                                | 示例                |
| ------------------------------------------ | ------------- | ----------------------------------- | ------------------- |
| data.list[].communityQaId                  | string        | 社区 QA 业务 ID（格式：LD####AAAA） | LD0007YZAB          |
| data.list[].title                          | string        | 标题                                | 如何绑定车辆？      |
| data.list[].categoryId                     | string        | 分类 ID（格式：LD####AAAA）         | LD0000ABCD          |
| data.list[].categoryName                   | string        | 分类名称                            | 续航与能耗          |
| data.list[].categoryColor                  | string        | 分类代表颜色（HEX）                 | #00B894             |
| data.list[].category                       | object \ null | 分类信息                            | -                   |
| data.list[].category.communityQaCategoryId | string        | 分类业务 ID（格式：LD####AAAA）     | LD0000ABCD          |
| data.list[].category.name                  | string        | 分类名称                            | 续航与能耗          |
| data.list[].category.description           | string        | 分类描述                            | -                   |
| data.list[].category.color                 | string        | 分类代表颜色（HEX）                 | #00B894             |
| data.list[].category.isEnabled             | boolean       | 分类是否启用                        | true                |
| data.list[].category.createdAt             | string        | 分类创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-29 12:00:00 |
| data.list[].category.updatedAt             | string        | 分类更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-29 12:00:00 |
| data.list[].contentBlocks                  | array         | 正文块数组                          | -                   |
| data.list[].contentBlocks[].title          | string        | 小标题                              | 操作步骤            |
| data.list[].contentBlocks[].content        | string        | 小正文                              | 打开 App -> ...     |
| data.list[].contentBlocks[].seq            | number        | 排序号                              | 0                   |
| data.list[].viewCount                      | number        | 浏览数                              | 12                  |
| data.list[].usefulCount                    | number        | 有用数                              | 3                   |
| data.list[].uselessCount                   | number        | 没用数                              | 0                   |
| data.list[].watchCount                     | number        | 关注数                              | 1                   |
| data.list[].isEnabled                      | boolean       | 是否启用                            | true                |
| data.list[].publishedAt                    | string        | 发布时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-29 12:00:00 |
| data.list[].createdAt                      | string        | 创建时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-29 12:00:00 |
| data.list[].updatedAt                      | string        | 更新时间（YYYY-MM-DD HH:mm:ss）     | 2026-01-29 12:00:00 |

## 84. 获取社区 QA 详情（需登录）

**接口标题**：社区 QA 详情

**功能描述**：获取单条社区 QA 详情，并将 viewCount +1；返回当前用户态度 myAttitude。

**接口路由**：`POST /community-qas/detail`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `communityQaId`（string，必填）：社区 QA 业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                      | 示例      |
| ------- | ------ | ------------------------- | --------- |
| code    | string | 状态码                    | '0'       |
| message | string | 状态描述                  | 'success' |
| data    | object | 数据（CommunityQaDetail） | -         |

`data` 字段结构（CommunityQaDetail）：

| 字段                                | 类型          | 说明                                 | 示例                |
| ----------------------------------- | ------------- | ------------------------------------ | ------------------- |
| data.communityQaId                  | string        | 社区 QA 业务 ID（格式：LD####AAAA）  | LD0007YZAB          |
| data.title                          | string        | 标题                                 | 如何绑定车辆？      |
| data.categoryId                     | string        | 分类 ID（格式：LD####AAAA）          | LD0000ABCD          |
| data.categoryName                   | string        | 分类名称                             | 续航与能耗          |
| data.categoryColor                  | string        | 分类代表颜色（HEX）                  | #00B894             |
| data.category                       | object \ null | 分类信息                             | -                   |
| data.category.communityQaCategoryId | string        | 分类业务 ID（格式：LD####AAAA）      | LD0000ABCD          |
| data.category.name                  | string        | 分类名称                             | 续航与能耗          |
| data.category.description           | string        | 分类描述                             | -                   |
| data.category.color                 | string        | 分类代表颜色（HEX）                  | #00B894             |
| data.category.isEnabled             | boolean       | 分类是否启用                         | true                |
| data.category.createdAt             | string        | 分类创建时间（YYYY-MM-DD HH:mm:ss）  | 2026-01-29 12:00:00 |
| data.category.updatedAt             | string        | 分类更新时间（YYYY-MM-DD HH:mm:ss）  | 2026-01-29 12:00:00 |
| data.contentBlocks                  | array         | 正文块数组                           | -                   |
| data.viewCount                      | number        | 浏览数                               | 13                  |
| data.usefulCount                    | number        | 有用数                               | 3                   |
| data.uselessCount                   | number        | 没用数                               | 0                   |
| data.watchCount                     | number        | 关注数                               | 1                   |
| data.isEnabled                      | boolean       | 是否启用                             | true                |
| data.publishedAt                    | string        | 发布时间（YYYY-MM-DD HH:mm:ss）      | 2026-01-29 12:00:00 |
| data.createdAt                      | string        | 创建时间（YYYY-MM-DD HH:mm:ss）      | 2026-01-29 12:00:00 |
| data.updatedAt                      | string        | 更新时间（YYYY-MM-DD HH:mm:ss）      | 2026-01-29 12:00:00 |
| data.myAttitude                     | string \ null | 当前用户态度（useful/useless/watch） | useful              |

## 85. 创建社区 QA（需登录）

**接口标题**：创建社区 QA

**功能描述**：创建一条社区 QA（仅 admin/moderator 可用）。

**接口路由**：`POST /community-qas/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `title`（string，必填）：标题（1~100）
- `categoryId`（string，必填）：分类 ID（格式：LD####AAAA）
- `contentBlocks`（array，可选）：正文块数组（最多 200 条，默认 []）
  - `contentBlocks[].title`（string，必填）：小标题（1~100）
  - `contentBlocks[].content`（string，必填）：小正文（1~20000）
  - `contentBlocks[].seq`（number，可选）：排序号（默认 0）
- `isEnabled`（boolean，可选）：是否启用（默认 true）

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明                | 示例      |
| ------- | ------ | ------------------- | --------- |
| code    | string | 状态码              | '0'       |
| message | string | 状态描述            | 'success' |
| data    | object | 数据（CommunityQa） | -         |

`data` 字段结构（CommunityQa）：同上 CommunityQaDetail 去掉 myAttitude。

## 86. 更新社区 QA（需登录）

**接口标题**：更新社区 QA

**功能描述**：更新一条社区 QA（仅 admin/moderator 可用；按 communityQaId 定位，支持部分字段更新）。

**接口路由**：`POST /community-qas/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：至少传一个字段

- `communityQaId`（string，必填）：社区 QA 业务 ID（格式：LD####AAAA）
- `title`（string，可选）：标题（1~100）
- `categoryId`（string，可选）：分类 ID（格式：LD####AAAA）
- `contentBlocks`（array，可选）：正文块数组（最多 200 条）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                | 示例      |
| ------- | ------ | ------------------- | --------- |
| code    | string | 状态码              | '0'       |
| message | string | 状态描述            | 'success' |
| data    | object | 数据（CommunityQa） | -         |

`data` 字段结构（CommunityQa）：同上。

## 87. 删除社区 QA（需登录）

**接口标题**：删除社区 QA

**功能描述**：删除一条社区 QA（仅 admin/moderator 可用；软删除）。

**接口路由**：`POST /community-qas/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `communityQaId`（string，必填）：社区 QA 业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

## 88. 设置/取消社区 QA 态度（需登录）

**接口标题**：社区 QA 态度

**功能描述**：设置当前用户对 QA 的态度（useful/useless/watch），三态互斥；传 null 表示取消态度并回滚计数。

**接口路由**：`POST /community-qas/attitude`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `communityQaId`（string，必填）：社区 QA 业务 ID（格式：LD####AAAA）
- `attitude`（string \ null，可选）：态度（useful/useless/watch；传 null 表示取消）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                              | 示例      |
| ------- | ------ | --------------------------------- | --------- |
| code    | string | 状态码                            | '0'       |
| message | string | 状态描述                          | 'success' |
| data    | object | 数据（CommunityQaAttitudeResult） | -         |

`data` 字段结构（CommunityQaAttitudeResult）：

| 字段              | 类型          | 说明                                 | 示例  |
| ----------------- | ------------- | ------------------------------------ | ----- |
| data.myAttitude   | string \ null | 当前用户态度（useful/useless/watch） | watch |
| data.usefulCount  | number        | 有用数                               | 3     |
| data.uselessCount | number        | 没用数                               | 0     |
| data.watchCount   | number        | 关注数                               | 2     |

## 89. 获取社区 QA 分类列表（需登录）

**接口标题**：社区 QA 分类列表

**功能描述**：获取社区 QA 分类列表，支持分页与筛选。普通用户仅返回启用分类；管理员/版主可按 isEnabled 筛选。

**接口路由**：`POST /community-qa-categories`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `communityQaCategoryId`（string，可选）：分类业务 ID（格式：LD####AAAA）
- `nameKeyword`（string，可选）：名称关键词（对 name 做模糊匹配）
- `isEnabled`（boolean，可选）：是否启用（仅 admin/moderator 生效）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                                  | 示例      |
| ------- | ------ | ------------------------------------- | --------- |
| code    | string | 状态码                                | '0'       |
| message | string | 状态描述                              | 'success' |
| data    | object | 数据（CommunityQaCategoryListResult） | -         |

`data` 字段结构（CommunityQaCategoryListResult）：

| 字段          | 类型   | 说明                          | 示例 |
| ------------- | ------ | ----------------------------- | ---- |
| data.list     | array  | 列表（CommunityQaCategory[]） | -    |
| data.page     | number | 当前页码                      | 1    |
| data.pageSize | number | 每页条数                      | 10   |
| data.total    | number | 总条数                        | 100  |

`data.list` 字段结构（CommunityQaCategory[]）：

| 字段                              | 类型    | 说明                            | 示例                |
| --------------------------------- | ------- | ------------------------------- | ------------------- |
| data.list[].communityQaCategoryId | string  | 分类业务 ID（格式：LD####AAAA） | LD0000ABCD          |
| data.list[].name                  | string  | 名称                            | 续航与能耗          |
| data.list[].description           | string  | 描述                            | -                   |
| data.list[].color                 | string  | 代表颜色（HEX）                 | #00B894             |
| data.list[].isEnabled             | boolean | 是否启用                        | true                |
| data.list[].createdAt             | string  | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-29 12:00:00 |
| data.list[].updatedAt             | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-29 12:00:00 |

## 90. 创建社区 QA 分类（需登录）

**接口标题**：创建社区 QA 分类

**功能描述**：创建一条社区 QA 分类（仅 admin/moderator 可用）。

**接口路由**：`POST /community-qa-categories/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `name`（string，必填）：名称（1~50）
- `description`（string，可选）：描述（0~5000，默认 ''）
- `color`（string，必填）：代表颜色（HEX，支持 6/8 位，例如 #00B894 或 #00B894FF）
- `isEnabled`（boolean，可选）：是否启用（默认 true）

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明                        | 示例      |
| ------- | ------ | --------------------------- | --------- |
| code    | string | 状态码                      | '0'       |
| message | string | 状态描述                    | 'success' |
| data    | object | 数据（CommunityQaCategory） | -         |

`data` 字段结构（CommunityQaCategory）：同上 `CommunityQaCategory[]` 单项字段。

## 91. 更新社区 QA 分类（需登录）

**接口标题**：更新社区 QA 分类

**功能描述**：更新一条社区 QA 分类（仅 admin/moderator 可用；按 communityQaCategoryId 定位，支持部分字段更新）。

**接口路由**：`POST /community-qa-categories/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：至少传一个字段

- `communityQaCategoryId`（string，必填）：分类业务 ID（格式：LD####AAAA）
- `name`（string，可选）：名称（1~50）
- `description`（string，可选）：描述（0~5000）
- `color`（string，可选）：代表颜色（HEX）
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                        | 示例      |
| ------- | ------ | --------------------------- | --------- |
| code    | string | 状态码                      | '0'       |
| message | string | 状态描述                    | 'success' |
| data    | object | 数据（CommunityQaCategory） | -         |

## 92. 删除社区 QA 分类（需登录）

**接口标题**：删除社区 QA 分类

**功能描述**：删除一条社区 QA 分类（仅 admin/moderator 可用；软删除）。

**接口路由**：`POST /community-qa-categories/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `communityQaCategoryId`（string，必填）：分类业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

## 93. 获取社区公告标签列表（需登录）

**接口标题**：社区公告标签列表

**功能描述**：获取社区公告标签列表，支持分页与筛选。普通用户仅返回启用标签；管理员/版主可按 isEnabled 筛选。

**接口路由**：`POST /community-announcement-tags`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `communityAnnouncementTagId`（string，可选）：标签业务 ID（格式：LD####AAAA）
- `nameKeyword`（string，可选）：标签名关键词（对 name 做模糊匹配）
- `isEnabled`（boolean，可选）：是否启用（仅 admin/moderator 生效）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                                       | 示例      |
| ------- | ------ | ------------------------------------------ | --------- |
| code    | string | 状态码                                     | '0'       |
| message | string | 状态描述                                   | 'success' |
| data    | object | 数据（CommunityAnnouncementTagListResult） | -         |

`data` 字段结构（CommunityAnnouncementTagListResult）：

| 字段          | 类型   | 说明                               | 示例 |
| ------------- | ------ | ---------------------------------- | ---- |
| data.list     | array  | 列表（CommunityAnnouncementTag[]） | -    |
| data.page     | number | 当前页码                           | 1    |
| data.pageSize | number | 每页条数                           | 10   |
| data.total    | number | 总条数                             | 100  |

`data.list` 字段结构（CommunityAnnouncementTag[]）：

| 字段                                   | 类型    | 说明                            | 示例                |
| -------------------------------------- | ------- | ------------------------------- | ------------------- |
| data.list[].communityAnnouncementTagId | string  | 标签业务 ID（格式：LD####AAAA） | LD0000ABCD          |
| data.list[].name                       | string  | 标签名                          | 通知                |
| data.list[].description                | string  | 描述                            | -                   |
| data.list[].seq                        | number  | 排序号                          | 0                   |
| data.list[].isEnabled                  | boolean | 是否启用                        | true                |
| data.list[].createdAt                  | string  | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-02-03 12:00:00 |
| data.list[].updatedAt                  | string  | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-02-03 12:00:00 |

## 94. 创建社区公告标签（需登录）

**接口标题**：创建社区公告标签

**功能描述**：创建一条社区公告标签（仅 admin/moderator 可用）。

**接口路由**：`POST /community-announcement-tags/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `name`（string，必填）：标签名（1~50）
- `description`（string，可选）：描述（0~5000，默认 ''）
- `seq`（number，可选）：排序号（默认 0）
- `isEnabled`（boolean，可选）：是否启用（默认 true）

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明                             | 示例      |
| ------- | ------ | -------------------------------- | --------- |
| code    | string | 状态码                           | '0'       |
| message | string | 状态描述                         | 'success' |
| data    | object | 数据（CommunityAnnouncementTag） | -         |

`data` 字段结构（CommunityAnnouncementTag）：同上 `CommunityAnnouncementTag[]` 单项字段。

## 95. 更新社区公告标签（需登录）

**接口标题**：更新社区公告标签

**功能描述**：更新一条社区公告标签（仅 admin/moderator 可用；按 communityAnnouncementTagId 定位，支持部分字段更新）。

**接口路由**：`POST /community-announcement-tags/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：至少传一个字段

- `communityAnnouncementTagId`（string，必填）：标签业务 ID（格式：LD####AAAA）
- `name`（string，可选）：标签名（1~50）
- `description`（string，可选）：描述（0~5000）
- `seq`（number，可选）：排序号
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                             | 示例      |
| ------- | ------ | -------------------------------- | --------- |
| code    | string | 状态码                           | '0'       |
| message | string | 状态描述                         | 'success' |
| data    | object | 数据（CommunityAnnouncementTag） | -         |

## 96. 删除社区公告标签（需登录）

**接口标题**：删除社区公告标签

**功能描述**：删除一条社区公告标签（仅 admin/moderator 可用；软删除）。

**接口路由**：`POST /community-announcement-tags/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `communityAnnouncementTagId`（string，必填）：标签业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

## 97. 获取社区公告列表（需登录）

**接口标题**：社区公告列表

**功能描述**：获取社区公告列表，支持分页与筛选。普通用户仅返回启用公告；管理员/版主可按 isEnabled 筛选。普通用户传入禁用标签进行筛选会返回空列表。

**接口路由**：`POST /community-announcements`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选）：关键词（对 title/summary 做模糊匹配）
- `communityAnnouncementTagId`（string，可选）：标签业务 ID（格式：LD####AAAA）
- `isEnabled`（boolean，可选）：是否启用（仅 admin/moderator 生效）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                                    | 示例      |
| ------- | ------ | --------------------------------------- | --------- |
| code    | string | 状态码                                  | '0'       |
| message | string | 状态描述                                | 'success' |
| data    | object | 数据（CommunityAnnouncementListResult） | -         |

`data` 字段结构（CommunityAnnouncementListResult）：

| 字段          | 类型   | 说明                            | 示例 |
| ------------- | ------ | ------------------------------- | ---- |
| data.list     | array  | 列表（CommunityAnnouncement[]） | -    |
| data.page     | number | 当前页码                        | 1    |
| data.pageSize | number | 每页条数                        | 10   |
| data.total    | number | 总条数                          | 100  |

`data.list` 字段结构（CommunityAnnouncement[]）：

| 字段                                | 类型    | 说明                                   | 示例                |
| ----------------------------------- | ------- | -------------------------------------- | ------------------- |
| data.list[].communityAnnouncementId | string  | 公告业务 ID（格式：LD####AAAA）        | LD0000ABCD          |
| data.list[].title                   | string  | 标题                                   | 社区维护通知        |
| data.list[].summary                 | string  | 摘要                                   | -                   |
| data.list[].contentBlocks           | array   | 内容块（ContentBlock[]）               | -                   |
| data.list[].tagIds                  | array   | 标签业务 ID 列表                       | ['LD0000ABCD']      |
| data.list[].tags                    | array   | 标签列表（CommunityAnnouncementTag[]） | -                   |
| data.list[].seq                     | number  | 排序号                                 | 0                   |
| data.list[].isEnabled               | boolean | 是否启用                               | true                |
| data.list[].publishedAt             | string  | 发布时间（YYYY-MM-DD HH:mm:ss）        | 2026-02-03 12:00:00 |
| data.list[].createdAt               | string  | 创建时间（YYYY-MM-DD HH:mm:ss）        | 2026-02-03 12:00:00 |
| data.list[].updatedAt               | string  | 修改时间（YYYY-MM-DD HH:mm:ss）        | 2026-02-03 12:00:00 |

`data.list[].contentBlocks` 字段结构（ContentBlock[]）：

| 字段                                | 类型   | 说明   | 示例                     |
| ----------------------------------- | ------ | ------ | ------------------------ |
| data.list[].contentBlocks[].title   | string | 小标题 | 维护时间                 |
| data.list[].contentBlocks[].content | string | 内容   | 本周六凌晨 2:00-6:00 ... |
| data.list[].contentBlocks[].seq     | number | 排序号 | 0                        |

## 98. 创建社区公告（需登录）

**接口标题**：创建社区公告

**功能描述**：创建一条社区公告（仅 admin/moderator 可用）。

**接口路由**：`POST /community-announcements/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `title`（string，必填）：标题（1~100）
- `summary`（string，可选）：摘要（0~5000，默认 ''）
- `tagIds`（array，可选）：标签业务 ID 列表（最多 50）
- `contentBlocks`（array，可选）：内容块列表（最多 200）
- `seq`（number，可选）：排序号（默认 0）
- `isEnabled`（boolean，可选）：是否启用（默认 true）
- `publishedAt`（string，可选）：发布时间（ISO8601，默认当前时间）

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明                          | 示例      |
| ------- | ------ | ----------------------------- | --------- |
| code    | string | 状态码                        | '0'       |
| message | string | 状态描述                      | 'success' |
| data    | object | 数据（CommunityAnnouncement） | -         |

`data` 字段结构（CommunityAnnouncement）：同上 `CommunityAnnouncement[]` 单项字段。

## 99. 更新社区公告（需登录）

**接口标题**：更新社区公告

**功能描述**：更新一条社区公告（仅 admin/moderator 可用；按 communityAnnouncementId 定位，支持部分字段更新）。

**接口路由**：`POST /community-announcements/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：至少传一个字段

- `communityAnnouncementId`（string，必填）：公告业务 ID（格式：LD####AAAA）
- `title`（string，可选）：标题（1~100）
- `summary`（string，可选）：摘要（0~5000）
- `tagIds`（array，可选）：标签业务 ID 列表（最多 50）
- `contentBlocks`（array，可选）：内容块列表（最多 200）
- `seq`（number，可选）：排序号
- `isEnabled`（boolean，可选）：是否启用
- `publishedAt`（string，可选）：发布时间（ISO8601）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                          | 示例      |
| ------- | ------ | ----------------------------- | --------- |
| code    | string | 状态码                        | '0'       |
| message | string | 状态描述                      | 'success' |
| data    | object | 数据（CommunityAnnouncement） | -         |

## 100. 删除社区公告（需登录）

**接口标题**：删除社区公告

**功能描述**：删除一条社区公告（仅 admin/moderator 可用；软删除）。

**接口路由**：`POST /community-announcements/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `communityAnnouncementId`（string，必填）：公告业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

## 101. 用户行为心跳上报（需登录）

**接口标题**：用户行为心跳上报

**功能描述**：登录用户在使用过程中周期性上报一次；后端按“用户 + 当天”维度累计当日上报次数与估算在线时长，用于统计活跃与在线趋势。

**接口路由**：`POST /user-activity/ping`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `clientTs`（string，可选）：客户端上报时间（ISO8601）；不传或非法时使用服务端当前时间
- `scene`（string，可选）：场景标识（最长 100，可为空字符串；当前仅校验，不参与统计）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                           | 示例      |
| ------- | ------ | ------------------------------ | --------- |
| code    | string | 状态码                         | '0'       |
| message | string | 状态描述                       | 'success' |
| data    | object | 数据（UserActivityPingResult） | -         |

`data` 字段结构（UserActivityPingResult）：

| 字段               | 类型          | 说明                                | 示例                |
| ------------------ | ------------- | ----------------------------------- | ------------------- |
| data.day           | string        | 当天日期（YYYY-MM-DD）              | 2026-02-03          |
| data.visitCount    | number        | 当天累计上报次数                    | 12                  |
| data.onlineSeconds | number        | 当天累计在线秒数                    | 1800                |
| data.lastPingAt    | string \ null | 最后上报时间（YYYY-MM-DD HH:mm:ss） | 2026-02-03 12:00:00 |
| data.deltaSeconds  | number        | 本次计入的在线秒数增量              | 60                  |

## 102. 全站用户活跃统计（管理端）（需登录）

**接口标题**：全站用户活跃统计（管理端）

**功能描述**：按日期范围聚合全站活跃与在线数据，返回区间汇总与按天趋势列表（用于数据中心图表）。仅 admin/moderator 可用。

**接口路由**：`POST /user-activity/stats`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 30，最大 366）
- `dateStart`（string，可选）：起始日期（ISO8601 / YYYY-MM-DD）；默认：dateEnd 往前 6 天
- `dateEnd`（string，可选）：结束日期（ISO8601 / YYYY-MM-DD）；默认：当天
- `userRole`（string，可选）：用户角色筛选（admin/moderator/user）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                            | 示例      |
| ------- | ------ | ------------------------------- | --------- |
| code    | string | 状态码                          | '0'       |
| message | string | 状态描述                        | 'success' |
| data    | object | 数据（UserActivityStatsResult） | -         |

`data` 字段结构（UserActivityStatsResult）：

| 字段                            | 类型   | 说明                           | 示例       |
| ------------------------------- | ------ | ------------------------------ | ---------- |
| data.summary                    | object | 区间汇总                       | -          |
| data.summary.rangeStart         | string | 区间起始日期（YYYY-MM-DD）     | 2026-02-01 |
| data.summary.rangeEnd           | string | 区间结束日期（YYYY-MM-DD）     | 2026-02-03 |
| data.summary.activeUsers        | number | 区间内去重活跃用户数           | 120        |
| data.summary.totalVisitCount    | number | 区间内上报次数总和             | 5600       |
| data.summary.totalOnlineSeconds | number | 区间内在线秒数总和             | 180000     |
| data.trend                      | object | 趋势列表（带分页）             | -          |
| data.trend.list                 | array  | 按天列表（缺失日期会补齐为 0） | -          |
| data.trend.list[].day           | string | 日期（YYYY-MM-DD）             | 2026-02-02 |
| data.trend.list[].dau           | number | 当日去重活跃用户数             | 80         |
| data.trend.list[].visitCount    | number | 当日上报次数总和               | 1200       |
| data.trend.list[].onlineSeconds | number | 当日在线秒数总和               | 36000      |
| data.trend.page                 | number | 当前页码                       | 1          |
| data.trend.pageSize             | number | 每页条数                       | 30         |
| data.trend.total                | number | 总条数（日期点数量）           | 7          |

## 103. 发布好物（需登录）

**接口标题**：发布好物

**功能描述**：发布一条好物内容；支持「买过 / 自出」两种类型。

**接口路由**：`POST /good-things/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `publishType`（string，必填）：发布类型（bought/self）
- `title`（string，必填）：物品标题（1~30）
- `images`（array，必填）：实拍图（1~9）
  - `images[].url`（string，必填）：图片 URL
  - `images[].uploadTime`（any，可选）：上传时间（前端可传，后端不强制格式）
- `description`（string，必填）：描述/使用感受（10~400）
- `buyLinkOrCode`（string，publishType=bought 必填）：购买链接/口令（不限制具体格式）
- `buyConfig`（string，可选）：购买配置（0~200）
- `buyPrice`（number，publishType=bought/self 必填）：价格（买过：购买价；自出：出价；支持两位小数）
- `contactWechat`（string，publishType=self 必填）：微信号（1~100）
- `isEnabled`（boolean，可选，默认 true）：是否启用（仅 admin/moderator 生效；普通用户发布固定启用）

**返回值（Success 201）**：对象 `GoodThing`

| 字段    | 类型   | 说明              | 示例      |
| ------- | ------ | ----------------- | --------- |
| code    | string | 状态码            | '0'       |
| message | string | 状态描述          | 'success' |
| data    | object | 数据（GoodThing） | -         |

`data` 字段结构（GoodThing）：

| 字段               | 类型          | 说明                             | 示例                 |
| ------------------ | ------------- | -------------------------------- | -------------------- |
| data.goodThingId   | string        | 好物业务 ID（格式：LD####AAAA）  | LD0001ABCD           |
| data.authorUserId  | string        | 发布人用户业务 ID                | LD0002EFGH           |
| data.publishType   | string        | 发布类型（bought/self）          | bought               |
| data.title         | string        | 标题                             | 车门防踢垫：耐脏好擦 |
| data.images        | array         | 实拍图数组                       | -                    |
| data.description   | string        | 描述/使用感受                    | ...                  |
| data.buyLinkOrCode | string \ null | 购买链接/口令（买过）            | https://example.com  |
| data.buyConfig     | string \ null | 购买配置（买过）                 | 四门套装             |
| data.buyPrice      | number \ null | 价格（买过：购买价；自出：出价） | 59                   |
| data.contactWechat | string \ null | 微信号（自出）                   | wechat123            |
| data.isEnabled     | boolean       | 是否启用                         | true                 |
| data.isRecommended | boolean       | 是否推荐                         | false                |
| data.likeCount     | number        | 点赞数                           | 36                   |
| data.collectCount  | number        | 收藏数                           | 26                   |
| data.viewCount     | number        | 浏览数                           | 120                  |
| data.createdAt     | string        | 创建时间（YYYY-MM-DD HH:mm:ss）  | 2026-02-03 12:00:00  |
| data.updatedAt     | string        | 更新时间（YYYY-MM-DD HH:mm:ss）  | 2026-02-03 12:00:00  |

---

## 104. 修改好物（需登录）

**接口标题**：修改好物

**功能描述**：修改一条好物内容（作者本人或 admin/moderator 可用）；支持部分字段更新。

**接口路由**：`POST /good-things/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：至少传一个更新字段

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）
- `publishType`（string，可选）：发布类型（bought/self）
- `title`（string，可选）：标题（1~30）
- `images`（array，可选）：实拍图（1~9）
- `description`（string，可选）：描述/使用感受（10~400）
- `buyLinkOrCode`（string \ null，可选）：购买链接/口令（买过）
- `buyConfig`（string \ null，可选）：购买配置（0~200）
- `buyPrice`（number \ null，可选）：购买价格（支持两位小数）
- `contactWechat`（string \ null，可选）：微信号（自出）
- `isEnabled`（boolean，可选）：是否启用（仅 admin/moderator 可改）

**返回值（Success 200）**：对象 `GoodThing`

| 字段    | 类型   | 说明              | 示例      |
| ------- | ------ | ----------------- | --------- |
| code    | string | 状态码            | '0'       |
| message | string | 状态描述          | 'success' |
| data    | object | 数据（GoodThing） | -         |

`data` 字段结构（GoodThing）：同「103. 发布好物」。

---

## 105. 删除好物（需登录）

**接口标题**：删除好物

**功能描述**：删除一条好物（作者本人或 admin/moderator 可用；软删除）。

**接口路由**：`POST /good-things/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

---

## 106. 获取好物列表（需登录）

**接口标题**：好物列表

**功能描述**：获取好物列表，支持分页与筛选；普通用户仅返回启用数据，管理员/版主可按 isEnabled 筛选。

**接口路由**：`POST /good-things`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `keyword`（string，可选）：关键词（对 title/description/buyConfig 做模糊匹配）
- `publishType`（string，可选）：发布类型筛选（bought/self）
- `isEnabled`（boolean，可选）：是否启用（仅 admin/moderator 生效）
- `isRecommended`（boolean，可选）：是否推荐

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                        | 示例      |
| ------- | ------ | --------------------------- | --------- |
| code    | string | 状态码                      | '0'       |
| message | string | 状态描述                    | 'success' |
| data    | object | 数据（GoodThingListResult） | -         |

`data` 字段结构（GoodThingListResult）：

| 字段          | 类型   | 说明                | 示例 |
| ------------- | ------ | ------------------- | ---- |
| data.list     | array  | 列表（GoodThing[]） | -    |
| data.page     | number | 当前页码            | 1    |
| data.pageSize | number | 每页条数            | 10   |
| data.total    | number | 总条数              | 100  |

列表项 `GoodThing`：同「103. 发布好物」的 `GoodThing` 字段。

---

## 107. 获取好物详情（需登录）

**接口标题**：好物详情

**功能描述**：获取好物详情；普通用户仅可查看启用内容（作者本人可查看自己未启用内容），管理员/版主可查看全部。

**接口路由**：`POST /good-things/detail`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                    | 示例      |
| ------- | ------ | ----------------------- | --------- |
| code    | string | 状态码                  | '0'       |
| message | string | 状态描述                | 'success' |
| data    | object | 数据（GoodThingDetail） | -         |

`data` 字段结构（GoodThingDetail）：

| 字段                | 类型          | 说明                             | 示例                 |
| ------------------- | ------------- | -------------------------------- | -------------------- |
| data.goodThingId    | string        | 好物业务 ID                      | LD0001ABCD           |
| data.authorUsername | string        | 发布人用户名（用于展示“XX车友”） | 蓝电车友             |
| data.publishType    | string        | 发布类型（bought/self）          | bought               |
| data.title          | string        | 标题                             | 车门防踢垫：耐脏好擦 |
| data.images         | array         | 图片数组                         | -                    |
| data.description    | string        | 描述/使用感受                    | ...                  |
| data.buyConfig      | string \ null | 购买配置                         | 四门套装             |
| data.buyPrice       | number \ null | 购买价                           | 59                   |
| data.buyLinkOrCode  | string \ null | 链接/口令                        | https://example.com  |
| data.contactWechat  | string \ null | 微信号（自出）                   | wechat123            |
| data.isEnabled      | boolean       | 是否启用                         | true                 |
| data.isRecommended  | boolean       | 是否推荐                         | true                 |
| data.likeCount      | number        | 点赞数                           | 36                   |
| data.collectCount   | number        | 收藏数                           | 26                   |
| data.viewCount      | number        | 浏览数                           | 120                  |
| data.createdAt      | string        | 创建时间（YYYY-MM-DD HH:mm:ss）  | 2026-02-03 12:00:00  |
| data.updatedAt      | string        | 更新时间（YYYY-MM-DD HH:mm:ss）  | 2026-02-03 12:00:00  |

---

## 108. 推荐好物（需登录）

**接口标题**：推荐好物

**功能描述**：将指定好物设为推荐（仅 admin/moderator 可用）。

**接口路由**：`POST /good-things/recommend`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

**错误说明**：

- 非管理员/版主操作时，HTTP 403，message 为 `Forbidden`。
- goodThingId 不存在时，HTTP 404，message 为 `Good thing not found`。

---

## 109. 取消推荐好物（需登录）

**接口标题**：取消推荐好物

**功能描述**：取消指定好物的推荐状态（仅 admin/moderator 可用）。

**接口路由**：`POST /good-things/unrecommend`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

**错误说明**：同「108. 推荐好物」。

---

## 110. 点赞好物（需登录）

**接口标题**：点赞好物

**功能描述**：对指定好物点一次赞；重复点赞不会重复计数。

**接口路由**：`POST /good-things/like`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例             |
| ------- | ------ | -------- | ---------------- |
| code    | string | 状态码   | '0'              |
| message | string | 状态描述 | 'success'        |
| data    | object | 数据     | { likeCount: 1 } |

`data` 字段结构：

| 字段           | 类型   | 说明           | 示例 |
| -------------- | ------ | -------------- | ---- |
| data.likeCount | number | 点赞数（最新） | 36   |

**错误说明**：

- goodThingId 不存在时，HTTP 404，message 为 `Good thing not found`。
- 普通用户无权操作未启用且非本人发布的数据时，HTTP 403，message 为 `Forbidden`。

---

## 111. 取消点赞好物（需登录）

**接口标题**：取消点赞好物

**功能描述**：取消对指定好物的点赞；如果未点赞则不做计数变更。

**接口路由**：`POST /good-things/unlike`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例             |
| ------- | ------ | -------- | ---------------- |
| code    | string | 状态码   | '0'              |
| message | string | 状态描述 | 'success'        |
| data    | object | 数据     | { likeCount: 0 } |

`data` 字段结构：

| 字段           | 类型   | 说明           | 示例 |
| -------------- | ------ | -------------- | ---- |
| data.likeCount | number | 点赞数（最新） | 35   |

**错误说明**：同「110. 点赞好物」。

---

## 112. 收藏好物（需登录）

**接口标题**：收藏好物

**功能描述**：收藏指定好物；重复收藏不会重复计数。

**接口路由**：`POST /good-things/collect`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例                                   |
| ------- | ------ | -------- | -------------------------------------- |
| code    | string | 状态码   | '0'                                    |
| message | string | 状态描述 | 'success'                              |
| data    | object | 数据     | { collectCount: 1, isCollected: true } |

`data` 字段结构：

| 字段              | 类型    | 说明           | 示例 |
| ----------------- | ------- | -------------- | ---- |
| data.collectCount | number  | 收藏数（最新） | 26   |
| data.isCollected  | boolean | 是否已收藏     | true |

**错误说明**：同「110. 点赞好物」。

---

## 113. 取消收藏好物（需登录）

**接口标题**：取消收藏好物

**功能描述**：取消收藏指定好物；如果未收藏则不做计数变更。

**接口路由**：`POST /good-things/uncollect`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `goodThingId`（string，必填）：好物业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例                                    |
| ------- | ------ | -------- | --------------------------------------- |
| code    | string | 状态码   | '0'                                     |
| message | string | 状态描述 | 'success'                               |
| data    | object | 数据     | { collectCount: 0, isCollected: false } |

`data` 字段结构：

| 字段              | 类型    | 说明           | 示例  |
| ----------------- | ------- | -------------- | ----- |
| data.collectCount | number  | 收藏数（最新） | 25    |
| data.isCollected  | boolean | 是否已收藏     | false |

**错误说明**：同「110. 点赞好物」。

---

## 114. 获取车机壁纸分类列表（需登录）

**接口标题**：车机壁纸分类列表

**功能描述**：分页获取车机壁纸分类列表；支持按名称筛选。

**接口路由**：`POST /car-wallpaper-categories`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，选填，默认 1）：页码
- `pageSize`（number，选填，默认 10）：每页数量（最大 1000）
- `nameKeyword`（string，选填）：名称关键字
- `isEnabled`（boolean，选填）：是否启用（仅管理员/版主可用）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例                                          |
| ------- | ------ | -------- | --------------------------------------------- |
| code    | string | 状态码   | '0'                                           |
| message | string | 状态描述 | 'success'                                     |
| data    | object | 数据     | { list: [], page: 1, pageSize: 10, total: 0 } |

`data` 字段结构：

| 字段          | 类型   | 说明     | 示例 |
| ------------- | ------ | -------- | ---- |
| data.list     | array  | 列表     | []   |
| data.page     | number | 页码     | 1    |
| data.pageSize | number | 每页数量 | 10   |
| data.total    | number | 总数     | 5    |

`data.list` 元素结构：

| 字段                   | 类型    | 说明        | 示例                |
| ---------------------- | ------- | ----------- | ------------------- |
| carWallpaperCategoryId | string  | 分类业务 ID | LD0000AAAA          |
| name                   | string  | 分类名称    | 风景                |
| description            | string  | 描述        | 默认分类            |
| seq                    | number  | 排序号      | 0                   |
| isEnabled              | boolean | 是否启用    | true                |
| createdAt              | string  | 创建时间    | 2026-02-05 12:00:00 |
| updatedAt              | string  | 更新时间    | 2026-02-05 12:00:00 |

---

## 115. 新增车机壁纸分类（需登录，管理员/版主）

**接口标题**：新增车机壁纸分类

**功能描述**：创建车机壁纸分类。

**接口路由**：`POST /car-wallpaper-categories/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `name`（string，必填）：分类名称
- `description`（string，选填）：描述
- `seq`（number，选填，默认 0）：排序号
- `isEnabled`（boolean，选填，默认 true）：是否启用

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明     | 示例                                     |
| ------- | ------ | -------- | ---------------------------------------- |
| code    | string | 状态码   | '0'                                      |
| message | string | 状态描述 | 'success'                                |
| data    | object | 数据     | { carWallpaperCategoryId: 'LD0000AAAA' } |

---

## 116. 修改车机壁纸分类（需登录，管理员/版主）

**接口标题**：修改车机壁纸分类

**功能描述**：更新车机壁纸分类信息。

**接口路由**：`POST /car-wallpaper-categories/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carWallpaperCategoryId`（string，必填）：分类业务 ID
- `name`（string，选填）：分类名称
- `description`（string，选填）：描述
- `seq`（number，选填）：排序号
- `isEnabled`（boolean，选填）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例                                     |
| ------- | ------ | -------- | ---------------------------------------- |
| code    | string | 状态码   | '0'                                      |
| message | string | 状态描述 | 'success'                                |
| data    | object | 数据     | { carWallpaperCategoryId: 'LD0000AAAA' } |

---

## 117. 删除车机壁纸分类（需登录，管理员/版主）

**接口标题**：删除车机壁纸分类

**功能描述**：删除车机壁纸分类；当分类下存在壁纸时不可删除。

**接口路由**：`POST /car-wallpaper-categories/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carWallpaperCategoryId`（string，必填）：分类业务 ID

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

---

## 118. 获取车机壁纸列表（需登录）

**接口标题**：车机壁纸列表

**功能描述**：分页获取车机壁纸列表；支持按分类与关键词筛选。

**接口路由**：`POST /car-wallpapers`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，选填，默认 1）：页码
- `pageSize`（number，选填，默认 10）：每页数量（最大 1000）
- `keyword`（string，选填）：名称关键词
- `carWallpaperCategoryId`（string，选填）：分类业务 ID
- `isEnabled`（boolean，选填）：是否启用（仅管理员/版主可用）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例                                          |
| ------- | ------ | -------- | --------------------------------------------- |
| code    | string | 状态码   | '0'                                           |
| message | string | 状态描述 | 'success'                                     |
| data    | object | 数据     | { list: [], page: 1, pageSize: 10, total: 0 } |

`data.list` 元素结构：

| 字段                   | 类型    | 说明                       | 示例                                           |
| ---------------------- | ------- | -------------------------- | ---------------------------------------------- |
| carWallpaperId         | string  | 壁纸业务 ID                | LD0000AAAA                                     |
| carWallpaperCategoryId | string  | 分类业务 ID                | LD0000BBBB                                     |
| categoryName           | string  | 分类名称                   | 风景                                           |
| name                   | string  | 壁纸名称                   | 海边日落                                       |
| description            | string  | 描述                       | 4K                                             |
| seq                    | number  | 排序号                     | 0                                              |
| isEnabled              | boolean | 是否启用                   | true                                           |
| width                  | number  | 宽度（像素）               | 1920                                           |
| height                 | number  | 高度（像素）               | 1080                                           |
| sizeBytes              | number  | 文件大小（字节）           | 123456                                         |
| mimeType               | string  | MIME 类型                  | image/jpeg                                     |
| ext                    | string  | 扩展名                     | jpg                                            |
| qiniuBucket            | string  | 七牛空间                   | wallpaper                                      |
| qiniuKey               | string  | 七牛 Key                   | car-wallpapers/2026/02/05/xxx.jpg              |
| qiniuDomain            | string  | 访问域名                   | https://cdn.example.com                        |
| isQiniuPrivate         | boolean | 是否私有                   | false                                          |
| url                    | string  | 公网访问 URL               | https://cdn.example.com/car-wallpapers/xxx.jpg |
| downloadUrl            | string  | 私有下载 URL（私有时有值） | https://...&token=...                          |
| downloadUrlExpiredAt   | string  | 私有链接过期时间           | 2026-02-05 13:00:00                            |
| hash                   | string  | 七牛 hash                  | Ft...                                          |
| createdAt              | string  | 创建时间                   | 2026-02-05 12:00:00                            |
| updatedAt              | string  | 更新时间                   | 2026-02-05 12:00:00                            |

---

## 119. 新增车机壁纸（需登录，管理员/版主）

**接口标题**：新增车机壁纸

**功能描述**：创建车机壁纸记录；支持上传 Base64 到七牛或直接指定七牛 Key。

**接口路由**：`POST /car-wallpapers/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carWallpaperCategoryId`（string，必填）：分类业务 ID
- `name`（string，必填）：壁纸名称
- `description`（string，选填）：描述
- `seq`（number，选填，默认 0）：排序号
- `isEnabled`（boolean，选填，默认 true）：是否启用
- `fileBase64`（string，选填）：Base64 文件内容（dataURL 或纯 base64）
- `mimeType`（string，选填）：当 fileBase64 为纯 base64 时必填
- `qiniuKey`（string，选填）：七牛 Key（不上传文件时使用）
- `qiniuBucket`（string，选填）：七牛空间（默认取环境变量 QINIU_BUCKET）
- `qiniuDomain`（string，选填）：访问域名（默认取环境变量 QINIU_DOMAIN）
- `isQiniuPrivate`（boolean，选填）：是否私有（默认取环境变量 QINIU_IS_PRIVATE）
- `hash`（string，选填）：七牛 hash（仅当直接指定 qiniuKey 时可填）
- `width` / `height` / `sizeBytes`（number，选填）：图片元信息

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明     | 示例                             |
| ------- | ------ | -------- | -------------------------------- |
| code    | string | 状态码   | '0'                              |
| message | string | 状态描述 | 'success'                        |
| data    | object | 数据     | { carWallpaperId: 'LD0000AAAA' } |

---

## 120. 修改车机壁纸（需登录，管理员/版主）

**接口标题**：修改车机壁纸

**功能描述**：更新车机壁纸信息；支持更新分类、启用状态、替换图片（Base64 上传或指定 qiniuKey）。

**接口路由**：`POST /car-wallpapers/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carWallpaperId`（string，必填）：壁纸业务 ID
- 其余字段同「119. 新增车机壁纸」中的可选字段

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例                             |
| ------- | ------ | -------- | -------------------------------- |
| code    | string | 状态码   | '0'                              |
| message | string | 状态描述 | 'success'                        |
| data    | object | 数据     | { carWallpaperId: 'LD0000AAAA' } |

---

## 121. 删除车机壁纸（需登录，管理员/版主）

**接口标题**：删除车机壁纸

**功能描述**：删除车机壁纸记录。

**接口路由**：`POST /car-wallpapers/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `carWallpaperId`（string，必填）：壁纸业务 ID

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明     | 示例         |
| ------- | ------ | -------- | ------------ |
| code    | string | 状态码   | '0'          |
| message | string | 状态描述 | 'success'    |
| data    | object | 数据     | { ok: true } |

---

## 122. 获取版本更新列表（需登录）

**接口标题**：版本更新列表

**功能描述**：分页获取版本更新记录列表。普通用户仅返回启用数据；管理员/版主可按 isEnabled 筛选。

**接口路由**：`POST /version-updates`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 1000）
- `isEnabled`（boolean，可选）：是否启用（仅管理员/版主生效）
- `versionKeyword`（string，可选）：版本关键词（对 versionName 做模糊匹配）
- `versionUpdateId`（string，可选）：版本更新业务 ID（格式：LD####AAAA；传入则按单条精确查询）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                            | 示例      |
| ------- | ------ | ------------------------------- | --------- |
| code    | string | 状态码                          | '0'       |
| message | string | 状态描述                        | 'success' |
| data    | object | 数据（VersionUpdateListResult） | -         |

`data` 字段结构（VersionUpdateListResult）：

| 字段          | 类型   | 说明                    | 示例 |
| ------------- | ------ | ----------------------- | ---- |
| data.list     | array  | 列表（VersionUpdate[]） | -    |
| data.page     | number | 当前页码                | 1    |
| data.pageSize | number | 每页条数                | 10   |
| data.total    | number | 总条数                  | 100  |

`data.list` 字段结构（VersionUpdate[]）：

| 字段                        | 类型          | 说明                                          | 示例                |
| --------------------------- | ------------- | --------------------------------------------- | ------------------- |
| data.list[].versionUpdateId | string        | 版本更新业务 ID                               | LD0007YZAB          |
| data.list[].versionName     | string        | 版本号展示                                    | 1.3.0               |
| data.list[].versionCode     | number \ null | 版本数值（可选）                              | 10300               |
| data.list[].releaseAt       | string        | 版本更新时间（用户手动设置；返回 YYYY-MM-DD） | 2026-02-06          |
| data.list[].content         | string        | 更新内容                                      | 修复若干问题...     |
| data.list[].seq             | number        | 排序号                                        | 0                   |
| data.list[].isEnabled       | boolean       | 是否启用                                      | true                |
| data.list[].createdAt       | string        | 创建时间（YYYY-MM-DD HH:mm:ss）               | 2026-02-06 12:00:00 |
| data.list[].updatedAt       | string        | 更新时间（YYYY-MM-DD HH:mm:ss）               | 2026-02-06 12:00:00 |

---

## 123. 新增版本更新（需登录，管理员/版主）

**接口标题**：新增版本更新

**功能描述**：新增一条版本更新记录。

**接口路由**：`POST /version-updates/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `versionName`（string，必填）：版本号展示（1~50）
- `versionCode`（number \ null，可选）：版本数值（0~2000000000）
- `releaseAt`（string，必填）：版本更新时间（用户手动设置；入参 ISO 8601 字符串）
- `content`（string，必填）：更新内容（1~20000）
- `seq`（number，可选）：排序号（默认 0）
- `isEnabled`（boolean，可选）：是否启用（默认 true）

**返回值（Success 201）**：对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（VersionUpdate） | -         |

`data` 字段结构（VersionUpdate）：同「122. 获取版本更新列表」中的 `VersionUpdate[]` 单项字段。

---

## 124. 更新版本更新（需登录，管理员/版主）

**接口标题**：更新版本更新

**功能描述**：更新一条版本更新记录（按 versionUpdateId 定位，支持部分字段更新）。

**接口路由**：`POST /version-updates/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：至少传一个字段

- `versionUpdateId`（string，必填）：版本更新业务 ID（格式：LD####AAAA）
- `versionName`（string，可选）：版本号展示（1~50）
- `versionCode`（number \ null，可选）：版本数值
- `releaseAt`（string，可选）：版本更新时间（用户手动设置；入参 ISO 8601 字符串）
- `content`（string，可选）：更新内容（1~20000）
- `seq`（number，可选）：排序号
- `isEnabled`（boolean，可选）：是否启用

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                  | 示例      |
| ------- | ------ | --------------------- | --------- |
| code    | string | 状态码                | '0'       |
| message | string | 状态描述              | 'success' |
| data    | object | 数据（VersionUpdate） | -         |

`data` 字段结构（VersionUpdate）：同「122. 获取版本更新列表」中的 `VersionUpdate[]` 单项字段。

---

## 125. 删除版本更新（需登录，管理员/版主）

**接口标题**：删除版本更新

**功能描述**：删除一条版本更新记录（软删除）。

**接口路由**：`POST /version-updates/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `versionUpdateId`（string，必填）：版本更新业务 ID（格式：LD####AAAA）

**返回值（Success 200）**：对象

| 字段    | 类型   | 说明                 | 示例      |
| ------- | ------ | -------------------- | --------- |
| code    | string | 状态码               | '0'       |
| message | string | 状态描述             | 'success' |
| data    | object | 数据（DeleteResult） | -         |

`data` 字段结构（DeleteResult）：

| 字段    | 类型    | 说明     | 示例 |
| ------- | ------- | -------- | ---- |
| data.ok | boolean | 是否成功 | true |

## 通用错误响应

### 1) 业务/鉴权等错误（errorHandler 兜底）

错误时 HTTP 状态码为 `err.status` 或 `err.statusCode`，返回：

| 字段    | 类型   | 说明                               | 示例                 |
| ------- | ------ | ---------------------------------- | -------------------- |
| code    | string | 状态码（HTTP 状态码字符串）        | '401'                |
| message | string | 错误描述（仅 expose 的错误会透出） | Authentication Error |
| data    | array  | 数据（失败固定空数组）             | []                   |

示例：

```json
{ "code": "401", "message": "Authentication Error", "data": [] }
```

账号状态错误（中间件校验）：当账号状态为 inactive/banned 时，HTTP 403，message 分别为 `账号已停用` / `账号已被封禁`。

### 2) 参数校验错误（validator）

当路由使用了 Joi 校验中间件，校验失败时 HTTP 400，返回：

| 字段    | 类型   | 说明                                     | 示例                                          |
| ------- | ------ | ---------------------------------------- | --------------------------------------------- |
| code    | string | 状态码                                   | '400'                                         |
| message | string | 明确的参数错误描述（包含字段路径与原因） | 参数校验失败：password "password" is required |
| data    | array  | 数据（失败固定空数组）                   | []                                            |

示例：

```json
{
  "code": "400",
  "message": "参数校验失败：password \"password\" is required",
  "data": []
}
```

### 3) 404 未找到

当路由不存在时 HTTP 404，返回：

```json
{ "code": "404", "message": "Not Found", "data": [] }
```
