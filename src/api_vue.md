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
- `pageSize`（number，可选）：每页条数（默认 10，最大 100）
- `keyword`（string，可选）：关键词（对 username/nickname/city 做模糊匹配）
- `role`（string，可选）：角色（user/admin/moderator）
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
| data.list[].role      | string        | 角色（user/admin/moderator）          | user                 |
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
| data.role     | string        | 角色（user/admin/moderator）          | user                 |
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
| data.role               | string        | 角色（user/admin/moderator）          | user                 |
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
- `role`（string，可选）：角色（user/admin/moderator）
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
| data.role               | string        | 角色（user/admin/moderator）          | user                 |
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
- `role`（string，可选）：角色（user/admin/moderator，仅 admin/moderator 可修改）
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
| data.role               | string        | 角色（user/admin/moderator）          | user                 |
| data.status             | string        | 状态（active/inactive/banned）        | active               |
| data.mustChangePassword | boolean       | 是否需要改密（首次登录/自举）         | false                |

---

## 9. 删除用户（需登录）

**接口标题**：删除用户

**功能描述**：删除用户（软删除，仅 admin/moderator 可用）；删除时会同步清理该用户的车辆与车友绑定记录。

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
- `pageSize`（number，可选）：每页条数（默认 10，最大 100）
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

## 10. 获取车辆列表（需登录）

**接口标题**：车辆列表

**功能描述**：返回车辆列表（需登录），默认仅返回启用数据，可通过参数控制是否包含禁用。

**接口路由**：`POST /cars`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 100）
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
- `pageSize`（number，可选）：每页条数（默认 10，最大 100）
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
- `pageSize`（number，可选）：每页条数（默认 10，最大 100）
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

---

## 12. 获取反馈列表（需登录）

**接口标题**：反馈列表

**功能描述**：获取反馈列表，支持分页与筛选（按创建时间倒序）。

**接口路由**：`POST /feedbacks`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `page`（number，可选）：页码（从 1 开始，默认 1）
- `pageSize`（number，可选）：每页条数（默认 10，最大 100）
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

**功能描述**：删除反馈（软删除）。

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
- `pageSize`（number，可选）：每页条数（默认 10，最大 100）
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

**功能描述**：删除反馈类型（软删除）。

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
