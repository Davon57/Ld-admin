# 接口清单（Vue 对接版）

基础信息：

- Base URL：`http://localhost:3000`
- 全部接口仅支持 `POST`（无 GET）
- Content-Type：`application/json`
- 鉴权：需要登录的接口在 Header 里带 `Authorization: Bearer <token>`

通用说明：

- 本文件描述的是“当前项目实际返回结构”（目前接口成功时多为直接返回数据对象/数组，错误时返回 `{ error: string }` 或校验错误结构）。
- 后续若切换到统一响应格式（`{ code, message, data, meta, timestamp }`），再同步更新此文档。

---

## 1. 健康检查

**接口标题**：健康检查

**功能描述**：用于判断服务是否启动正常。

**接口路由**：`POST /health`

**参数（Body）**：

- 无

**返回值（Success 200）**：

| 字段 | 类型    | 说明         | 示例 |
| ---- | ------- | ------------ | ---- |
| ok   | boolean | 服务是否正常 | true |

---

## 2. 用户注册

**接口标题**：用户注册

**功能描述**：创建新用户账号。

**接口路由**：`POST /auth/register`

**参数（Body）**：

- `username`（string，必填）：用户名，长度 3-50
- `password`（string，必填）：密码，长度 6-100

**返回值（Success 201）**：

| 字段     | 类型   | 说明                      | 示例                                 |
| -------- | ------ | ------------------------- | ------------------------------------ |
| id       | string | 用户 ID（UUID）           | 550e8400-e29b-41d4-a716-446655440000 |
| userId   | string | 用户使用 ID（8 位随机数） | 00428100                             |
| username | string | 用户名                    | 张三                                 |

---

## 3. 用户登录

**接口标题**：用户登录

**功能描述**：使用账号 + 密码登录，返回 token。

**接口路由**：`POST /auth/login`

**参数（Body）**：

- `account`（string，必填）：账号（当前为用户名；后端也兼容 `username` / `identifier` 字段名）
- `password`（string，必填）：密码

**返回值（Success 200）**：

| 字段                    | 类型          | 说明                          | 示例                                    |
| ----------------------- | ------------- | ----------------------------- | --------------------------------------- |
| token                   | string        | JWT token                     | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| user                    | object        | 用户信息                      | -                                       |
| user.id                 | string        | 用户 ID（UUID）               | 550e8400-e29b-41d4-a716-446655440000    |
| user.userId             | string        | 用户使用 ID（8 位随机数）     | 00428100                                |
| user.username           | string        | 用户名                        | 张三                                    |
| user.nickname           | string        | 昵称                          | 三哥                                    |
| user.avatar             | string        | 头像 URL                      | https://example.com/avatar.png          |
| user.city               | string        | 所在城市                      | 北京                                    |
| user.email              | string \ null | 邮箱                          | zhangsan@example.com                    |
| user.phone              | string \ null | 手机号                        | 13800138000                             |
| user.role               | string        | 角色（user/admin/moderator）  | user                                    |
| user.mustChangePassword | boolean       | 是否需要改密（首次登录/自举） | false                                   |

---

## 3.1 系统自举状态（无需登录）

**接口标题**：系统自举状态

**功能描述**：判断系统是否已存在管理员；若未存在且启用自举，则前端展示初始化入口。

**接口路由**：`POST /system/bootstrap/status`

**参数（Body）**：

- 无

**返回值（Success 200）**：对象

| 字段             | 类型    | 说明                               | 示例  |
| ---------------- | ------- | ---------------------------------- | ----- |
| bootstrapEnabled | boolean | 是否启用自举机制（由环境变量控制） | true  |
| adminExists      | boolean | 是否已存在 admin                   | false |
| needsBootstrap   | boolean | 是否需要执行初始化                 | true  |

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

| 字段               | 类型    | 说明                      | 示例                                 |
| ------------------ | ------- | ------------------------- | ------------------------------------ |
| id                 | string  | 用户 ID（UUID）           | 550e8400-e29b-41d4-a716-446655440000 |
| userId             | string  | 用户使用 ID（8 位随机数） | 00428100                             |
| username           | string  | 用户名                    | admin                                |
| email              | string  | 邮箱                      | admin@local.invalid                  |
| role               | string  | 角色                      | admin                                |
| mustChangePassword | boolean | 是否需要改密              | true                                 |

---

## 4. 获取用户列表（需登录）

**接口标题**：用户列表

**功能描述**：获取用户列表（当前无分页/筛选逻辑，直接返回全部用户基础字段）。

**接口路由**：`POST /users`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- 无（可传 `{}`，当前不会被使用）

**返回值（Success 200）**：数组 `User[]`

| 字段      | 类型          | 说明                            | 示例                                 |
| --------- | ------------- | ------------------------------- | ------------------------------------ |
| id        | string        | 用户 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| userId    | string        | 用户使用 ID（8 位随机数）       | 00428100                             |
| username  | string        | 用户名                          | 张三                                 |
| nickname  | string        | 昵称                            | 三哥                                 |
| avatar    | string        | 头像 URL                        | https://example.com/avatar.png       |
| city      | string        | 所在城市                        | 北京                                 |
| email     | string \ null | 邮箱                            | zhangsan@example.com                 |
| phone     | string \ null | 手机号                          | 13800138000                          |
| role      | string        | 角色（user/admin/moderator）    | user                                 |
| status    | string        | 状态（active/inactive/banned）  | active                               |
| createdAt | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |
| updatedAt | string        | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |

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

| 字段     | 类型          | 说明                           | 示例                                 |
| -------- | ------------- | ------------------------------ | ------------------------------------ |
| id       | string        | 用户 ID（UUID）                | 550e8400-e29b-41d4-a716-446655440000 |
| userId   | string        | 用户使用 ID（8 位随机数）      | 00428100                             |
| username | string        | 用户名                         | 张三                                 |
| nickname | string        | 昵称                           | 三哥                                 |
| avatar   | string        | 头像 URL                       | https://example.com/avatar.png       |
| city     | string        | 所在城市                       | 北京                                 |
| email    | string \ null | 邮箱                           | zhangsan@example.com                 |
| phone    | string \ null | 手机号                         | 13800138000                          |
| role     | string        | 角色（user/admin/moderator）   | user                                 |
| status   | string        | 状态（active/inactive/banned） | active                               |

---

## 6. 获取用户详情（需登录）

**接口标题**：用户详情

**功能描述**：根据用户 ID 获取用户详情（支持 UUID 的 id 或 8 位 userId）。

**接口路由**：`POST /users/detail`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，可选）：用户 ID（UUID）
- `userId`（string，可选）：用户使用 ID（8 位随机数）

**返回值（Success 200）**：对象 `User`

| 字段     | 类型          | 说明                           | 示例                                 |
| -------- | ------------- | ------------------------------ | ------------------------------------ |
| id       | string        | 用户 ID（UUID）                | 550e8400-e29b-41d4-a716-446655440000 |
| userId   | string        | 用户使用 ID（8 位随机数）      | 00428100                             |
| username | string        | 用户名                         | 张三                                 |
| nickname | string        | 昵称                           | 三哥                                 |
| avatar   | string        | 头像 URL                       | https://example.com/avatar.png       |
| city     | string        | 所在城市                       | 北京                                 |
| email    | string \ null | 邮箱                           | zhangsan@example.com                 |
| phone    | string \ null | 手机号                         | 13800138000                          |
| role     | string        | 角色（user/admin/moderator）   | user                                 |
| status   | string        | 状态（active/inactive/banned） | active                               |

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
- `avatar`（string，可选）：头像 URL
- `nickname`（string，可选）：昵称
- `city`（string，可选）：所在城市
- `phone`（string \ null，可选）：手机号
- `role`（string，可选）：角色（user/admin/moderator）
- `status`（string，可选）：状态（active/inactive/banned）

**返回值（Success 201）**：对象 `User`

| 字段     | 类型          | 说明                           | 示例                                 |
| -------- | ------------- | ------------------------------ | ------------------------------------ |
| id       | string        | 用户 ID（UUID）                | 550e8400-e29b-41d4-a716-446655440000 |
| userId   | string        | 用户使用 ID（8 位随机数）      | 00428100                             |
| username | string        | 用户名                         | 张三                                 |
| nickname | string        | 昵称                           | 三哥                                 |
| avatar   | string        | 头像 URL                       | https://example.com/avatar.png       |
| city     | string        | 所在城市                       | 北京                                 |
| email    | string \ null | 邮箱                           | zhangsan@example.com                 |
| phone    | string \ null | 手机号                         | 13800138000                          |
| role     | string        | 角色（user/admin/moderator）   | user                                 |
| status   | string        | 状态（active/inactive/banned） | active                               |

---

## 8. 更新用户（需登录）

**接口标题**：更新用户

**功能描述**：更新用户信息（不传 id 时默认更新当前登录用户；传 id 需 admin/moderator 或本人）。

**接口路由**：`POST /users/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，可选）：用户 ID（UUID）
- `userId`（string，可选）：用户使用 ID（8 位随机数）
- `avatar`（string，可选）：头像 URL
- `nickname`（string，可选）：昵称
- `city`（string，可选）：所在城市
- `email`（string，可选）：邮箱
- `phone`（string \ null，可选）：手机号
- `role`（string，可选）：角色（user/admin/moderator，仅 admin/moderator 可修改）
- `status`（string，可选）：状态（active/inactive/banned，仅 admin/moderator 可修改）

**返回值（Success 200）**：对象 `User`

| 字段     | 类型          | 说明                           | 示例                                 |
| -------- | ------------- | ------------------------------ | ------------------------------------ |
| id       | string        | 用户 ID（UUID）                | 550e8400-e29b-41d4-a716-446655440000 |
| userId   | string        | 用户使用 ID（8 位随机数）      | 00428100                             |
| username | string        | 用户名                         | 张三                                 |
| nickname | string        | 昵称                           | 三哥                                 |
| avatar   | string        | 头像 URL                       | https://example.com/avatar.png       |
| city     | string        | 所在城市                       | 北京                                 |
| email    | string \ null | 邮箱                           | zhangsan@example.com                 |
| phone    | string \ null | 手机号                         | 13800138000                          |
| role     | string        | 角色（user/admin/moderator）   | user                                 |
| status   | string        | 状态（active/inactive/banned） | active                               |

---

## 9. 删除用户（需登录）

**接口标题**：删除用户

**功能描述**：删除用户（软删除，仅 admin/moderator 可用）。

**接口路由**：`POST /users/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，可选）：用户 ID（UUID）
- `userId`（string，可选）：用户使用 ID（8 位随机数）

**返回值（Success 200）**：

| 字段 | 类型    | 说明     | 示例 |
| ---- | ------- | -------- | ---- |
| ok   | boolean | 是否成功 | true |

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

| 字段 | 类型    | 说明     | 示例 |
| ---- | ------- | -------- | ---- |
| ok   | boolean | 是否成功 | true |

---

## 10. 获取车辆列表（需登录）

**接口标题**：车辆列表

**功能描述**：返回当前登录用户的车辆列表（按 token 内用户 id 过滤）。

**接口路由**：`POST /cars`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- 无（可传 `{}`，当前不会被使用）

**返回值（Success 200）**：数组 `Car[]`

| 字段      | 类型    | 说明                            | 示例                                 |
| --------- | ------- | ------------------------------- | ------------------------------------ |
| id        | string  | 车辆 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| carId     | string  | 车辆唯一标识（8 位随机数）      | 00428100                             |
| userId    | string  | 归属用户 ID（UUID）             | 550e8400-e29b-41d4-a716-446655440000 |
| year      | number  | 年份                            | 2022                                 |
| model     | string  | 型号                            | A4L                                  |
| version   | string  | 版本号                          | 2.0T-2022                            |
| status    | string  | 状态（on_sale/discontinued）    | on_sale                              |
| isEnabled | boolean | 是否启用                        | true                                 |
| remark    | string  | 备注                            | 试驾车                               |
| createdAt | string  | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |
| updatedAt | string  | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |

---

## 10.1 新增车辆（需登录）

**接口标题**：新增车辆

**功能描述**：为当前登录用户新增一条车辆记录。

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

| 字段      | 类型    | 说明                            | 示例                                 |
| --------- | ------- | ------------------------------- | ------------------------------------ |
| id        | string  | 车辆 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| carId     | string  | 车辆唯一标识（8 位随机数）      | 00428100                             |
| userId    | string  | 归属用户 ID（UUID）             | 550e8400-e29b-41d4-a716-446655440000 |
| year      | number  | 年份                            | 2022                                 |
| model     | string  | 型号                            | A4L                                  |
| version   | string  | 版本号                          | 2.0T-2022                            |
| status    | string  | 状态（on_sale/discontinued）    | on_sale                              |
| isEnabled | boolean | 是否启用                        | true                                 |
| remark    | string  | 备注                            | 试驾车                               |
| createdAt | string  | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |
| updatedAt | string  | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |

---

## 10.2 修改车辆（需登录）

**接口标题**：修改车辆

**功能描述**：更新一条车辆记录（仅允许操作当前登录用户自己的车辆）。

**接口路由**：`POST /cars/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，可选）：车辆 ID（UUID）
- `carId`（string，可选）：车辆唯一标识（8 位随机数）
- `year`（number，可选）：年份
- `model`（string，可选）：型号
- `version`（string，可选）：版本号
- `status`（string，可选）：状态（on_sale/discontinued）
- `isEnabled`（boolean，可选）：是否启用
- `remark`（string，可选）：备注

**返回值（Success 200）**：对象 `Car`

| 字段      | 类型    | 说明                            | 示例                                 |
| --------- | ------- | ------------------------------- | ------------------------------------ |
| id        | string  | 车辆 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| carId     | string  | 车辆唯一标识（8 位随机数）      | 00428100                             |
| userId    | string  | 归属用户 ID（UUID）             | 550e8400-e29b-41d4-a716-446655440000 |
| year      | number  | 年份                            | 2022                                 |
| model     | string  | 型号                            | A4L                                  |
| version   | string  | 版本号                          | 2.0T-2022                            |
| status    | string  | 状态（on_sale/discontinued）    | on_sale                              |
| isEnabled | boolean | 是否启用                        | true                                 |
| remark    | string  | 备注                            | 试驾车                               |
| createdAt | string  | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |
| updatedAt | string  | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |

---

## 10.3 删除车辆（需登录）

**接口标题**：删除车辆

**功能描述**：删除一条车辆记录（物理删除，仅允许操作当前登录用户自己的车辆）。

**接口路由**：`POST /cars/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，可选）：车辆 ID（UUID）
- `carId`（string，可选）：车辆唯一标识（8 位随机数）

**返回值（Success 200）**：

| 字段 | 类型    | 说明     | 示例 |
| ---- | ------- | -------- | ---- |
| ok   | boolean | 是否成功 | true |

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
- `userId`（string，可选）：用户使用 ID（8 位随机数）
- `carId`（string，可选）：车辆唯一标识（8 位随机数）
- `vin`（string，可选）：VIN 码（17 位）

**返回值（Success 200）**：对象

| 字段     | 类型   | 说明     | 示例 |
| -------- | ------ | -------- | ---- |
| list     | array  | 车友列表 | -    |
| total    | number | 总条数   | 32   |
| page     | number | 当前页码 | 1    |
| pageSize | number | 每页条数 | 10   |

列表项 `CarFriend`：

| 字段       | 类型          | 说明                            | 示例                                 |
| ---------- | ------------- | ------------------------------- | ------------------------------------ |
| id         | string        | 记录 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| userId     | string        | 归属用户 ID（UUID）             | 550e8400-e29b-41d4-a716-446655440000 |
| username   | string        | 用户名                          | 张三                                 |
| carId      | string        | 车辆唯一标识（8 位随机数）      | 00428100                             |
| vin        | string \ null | VIN 码（17 位）                 | LFV2A21J3G1234567                    |
| carModel   | string        | 车辆型号                        | A4L                                  |
| carVersion | string        | 车辆版本                        | 2.0T-2022                            |
| remark     | string        | 备注                            | 车友群 1                             |
| createdAt  | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-16 12:00:00                  |
| updatedAt  | string        | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-16 12:00:00                  |

---

## 10.5 新增车友（需登录）

**接口标题**：新增车友

**功能描述**：新增一条车友记录（通过 userId 关联用户，服务端会写入对应 username）。

**接口路由**：`POST /car-friends/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `userId`（string，必填）：用户使用 ID（8 位随机数）
- `carId`（string，必填）：车辆唯一标识（8 位随机数）
- `vin`（string，必填）：VIN 码（17 位）
- `carModel`（string，必填）：车辆型号
- `carVersion`（string，必填）：车辆版本
- `remark`（string，可选）：备注

**返回值（Success 201）**：对象 `CarFriend`

| 字段       | 类型          | 说明                            | 示例                                 |
| ---------- | ------------- | ------------------------------- | ------------------------------------ |
| id         | string        | 记录 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| userId     | string        | 归属用户 ID（UUID）             | 550e8400-e29b-41d4-a716-446655440000 |
| username   | string        | 用户名                          | 张三                                 |
| carId      | string        | 车辆唯一标识（8 位随机数）      | 00428100                             |
| vin        | string \ null | VIN 码（17 位）                 | LFV2A21J3G1234567                    |
| carModel   | string        | 车辆型号                        | A4L                                  |
| carVersion | string        | 车辆版本                        | 2.0T-2022                            |
| remark     | string        | 备注                            | 车友群 1                             |
| createdAt  | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-16 12:00:00                  |
| updatedAt  | string        | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-16 12:00:00                  |

---

## 10.6 修改车友（需登录）

**接口标题**：修改车友

**功能描述**：修改一条车友记录（按 id 定位，支持部分字段更新；传 userId 会同步更新 username）。

**接口路由**：`POST /car-friends/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，必填）：记录 ID（UUID）
- `userId`（string，可选）：用户使用 ID（8 位随机数）
- `carId`（string，可选）：车辆唯一标识（8 位随机数）
- `vin`（string，可选）：VIN 码（17 位）
- `carModel`（string，可选）：车辆型号
- `carVersion`（string，可选）：车辆版本
- `remark`（string，可选）：备注

**返回值（Success 200）**：对象 `CarFriend`

| 字段       | 类型          | 说明                            | 示例                                 |
| ---------- | ------------- | ------------------------------- | ------------------------------------ |
| id         | string        | 记录 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| userId     | string        | 归属用户 ID（UUID）             | 550e8400-e29b-41d4-a716-446655440000 |
| username   | string        | 用户名                          | 张三                                 |
| carId      | string        | 车辆唯一标识（8 位随机数）      | 00428100                             |
| vin        | string \ null | VIN 码（17 位）                 | LFV2A21J3G1234567                    |
| carModel   | string        | 车辆型号                        | A4L                                  |
| carVersion | string        | 车辆版本                        | 2.0T-2022                            |
| remark     | string        | 备注                            | 车友群 1                             |
| createdAt  | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-16 12:00:00                  |
| updatedAt  | string        | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-16 12:00:00                  |

---

## 10.7 删除车友（需登录）

**接口标题**：删除车友

**功能描述**：删除一条车友记录（物理删除）。

**接口路由**：`POST /car-friends/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，必填）：记录 ID（UUID）

**返回值（Success 200）**：

| 字段 | 类型    | 说明     | 示例 |
| ---- | ------- | -------- | ---- |
| ok   | boolean | 是否成功 | true |

---

## 11. 获取帖子列表（需登录）

**接口标题**：帖子列表

**功能描述**：获取帖子列表（当前无分页/筛选逻辑，直接返回全部）。

**接口路由**：`POST /posts`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- 无（可传 `{}`，当前不会被使用）

**返回值（Success 200）**：数组 `Post[]`

| 字段      | 类型           | 说明                            | 示例                                 |
| --------- | -------------- | ------------------------------- | ------------------------------------ |
| id        | string         | 帖子 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| userId    | string         | 作者用户 ID（UUID）             | 550e8400-e29b-41d4-a716-446655440000 |
| carId     | string \\ null | 关联车辆 ID（UUID）             | 550e8400-e29b-41d4-a716-446655440000 |
| title     | string         | 标题                            | 我的第一台车                         |
| content   | string         | 内容                            | ...                                  |
| status    | string         | 状态（draft/published/hidden）  | published                            |
| createdAt | string         | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |
| updatedAt | string         | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |

---

## 12. 获取俱乐部列表（需登录）

**接口标题**：俱乐部列表

**功能描述**：获取俱乐部列表（当前无分页/筛选逻辑，直接返回全部）。

**接口路由**：`POST /clubs`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- 无（可传 `{}`，当前不会被使用）

**返回值（Success 200）**：数组 `Club[]`

| 字段        | 类型   | 说明                            | 示例                                 |
| ----------- | ------ | ------------------------------- | ------------------------------------ |
| id          | string | 俱乐部 ID（UUID）               | 550e8400-e29b-41d4-a716-446655440000 |
| creatorId   | string | 创建者用户 ID（UUID）           | 550e8400-e29b-41d4-a716-446655440000 |
| name        | string | 名称（唯一）                    | 宝马车友会                           |
| description | string | 描述                            | -                                    |
| status      | string | 状态（active/inactive）         | active                               |
| createdAt   | string | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |
| updatedAt   | string | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-10 00:00:00                  |

---

## 13. 获取反馈列表（需登录）

**接口标题**：反馈列表

**功能描述**：获取反馈列表（当前无分页/筛选逻辑，按创建时间倒序返回）。

**接口路由**：`POST /feedbacks`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- 无（可传 `{}`，当前不会被使用）

**返回值（Success 200）**：数组 `Feedback[]`

| 字段                | 类型          | 说明                            | 示例                                 |
| ------------------- | ------------- | ------------------------------- | ------------------------------------ |
| id                  | string        | 反馈 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| cby                 | string        | 用户名（创建人）                | 张三                                 |
| type                | string        | 反馈问题类型                    | bug                                  |
| description         | string        | 反馈描述                        | 页面无法加载                         |
| contact             | string \ null | 联系方式（可选）                | 13800138000                          |
| env                 | string        | 环境信息（字符串）              | Windows 11 / Chrome 120              |
| images              | array         | 图片数组                        | -                                    |
| images[].url        | string        | 图片 base64（或 dataURL）       | data:image/png;base64,iVBORw0...     |
| images[].uploadTime | string        | 上传时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |
| createdAt           | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |
| updatedAt           | string        | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 14. 新增反馈（需登录）

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

| 字段        | 类型          | 说明                            | 示例                                 |
| ----------- | ------------- | ------------------------------- | ------------------------------------ |
| id          | string        | 反馈 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| cby         | string        | 用户名（创建人）                | 张三                                 |
| type        | string        | 反馈问题类型                    | bug                                  |
| description | string        | 反馈描述                        | 页面无法加载                         |
| contact     | string \ null | 联系方式（可选）                | 13800138000                          |
| env         | string        | 环境信息（字符串）              | Windows 11 / Chrome 120              |
| images      | array         | 图片数组（uploadTime 已格式化） | -                                    |
| createdAt   | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |
| updatedAt   | string        | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 15. 修改反馈（需登录）

**接口标题**：修改反馈

**功能描述**：更新反馈内容（按 id 定位，支持部分字段更新）。

**接口路由**：`POST /feedbacks/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，必填）：反馈 ID（UUID）
- `type`（string，可选）：反馈问题类型
- `description`（string，可选）：描述
- `contact`（string \ null，可选）：联系方式
- `env`（string，可选）：环境信息（字符串）
- `images`（array，可选）：图片数组（整体替换）

**返回值（Success 200）**：对象 `Feedback`

| 字段        | 类型          | 说明                            | 示例                                 |
| ----------- | ------------- | ------------------------------- | ------------------------------------ |
| id          | string        | 反馈 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| cby         | string        | 用户名（创建人）                | 张三                                 |
| type        | string        | 反馈问题类型                    | bug                                  |
| description | string        | 反馈描述                        | 页面无法加载                         |
| contact     | string \ null | 联系方式（可选）                | 13800138000                          |
| env         | string        | 环境信息（字符串）              | Windows 11 / Chrome 120              |
| images      | array         | 图片数组（uploadTime 已格式化） | -                                    |
| createdAt   | string        | 创建时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |
| updatedAt   | string        | 更新时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 16. 删除反馈（需登录）

**接口标题**：删除反馈

**功能描述**：删除反馈（软删除）。

**接口路由**：`POST /feedbacks/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，必填）：反馈 ID（UUID）

**返回值（Success 200）**：

| 字段 | 类型    | 说明     | 示例 |
| ---- | ------- | -------- | ---- |
| ok   | boolean | 是否成功 | true |

---

## 17. 获取反馈类型列表（需登录）

**接口标题**：反馈类型列表

**功能描述**：获取反馈类型列表（按创建时间倒序返回）。

**接口路由**：`POST /feedback-types`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- 无（可传 `{}`，当前不会被使用）

**返回值（Success 200）**：数组 `FeedbackType[]`

| 字段        | 类型   | 说明                            | 示例                                 |
| ----------- | ------ | ------------------------------- | ------------------------------------ |
| id          | string | 类型 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| code        | string | 随机 6 位编码（唯一）           | 004281                               |
| name        | string | 类型名                          | BUG 反馈                             |
| description | string | 类型描述                        | 影响使用的错误与异常                 |
| createdAt   | string | 新增时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |
| updatedAt   | string | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 18. 新增反馈类型（需登录）

**接口标题**：新增反馈类型

**功能描述**：创建一条新的反馈类型记录（`code` 由后端随机生成 6 位数）。

**接口路由**：`POST /feedback-types/create`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `name`（string，必填）：类型名
- `description`（string，可选）：类型描述

**返回值（Success 201）**：对象 `FeedbackType`

| 字段        | 类型   | 说明                            | 示例                                 |
| ----------- | ------ | ------------------------------- | ------------------------------------ |
| id          | string | 类型 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| code        | string | 随机 6 位编码（唯一）           | 004281                               |
| name        | string | 类型名                          | BUG 反馈                             |
| description | string | 类型描述                        | 影响使用的错误与异常                 |
| createdAt   | string | 新增时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |
| updatedAt   | string | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 19. 修改反馈类型（需登录）

**接口标题**：修改反馈类型

**功能描述**：更新反馈类型内容（按 id 定位，支持部分字段更新）。

**接口路由**：`POST /feedback-types/update`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，必填）：类型 ID（UUID）
- `name`（string，可选）：类型名
- `description`（string，可选）：类型描述

**返回值（Success 200）**：对象 `FeedbackType`

| 字段        | 类型   | 说明                            | 示例                                 |
| ----------- | ------ | ------------------------------- | ------------------------------------ |
| id          | string | 类型 ID（UUID）                 | 550e8400-e29b-41d4-a716-446655440000 |
| code        | string | 随机 6 位编码（唯一）           | 004281                               |
| name        | string | 类型名                          | BUG 反馈                             |
| description | string | 类型描述                        | 影响使用的错误与异常                 |
| createdAt   | string | 新增时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |
| updatedAt   | string | 修改时间（YYYY-MM-DD HH:mm:ss） | 2026-01-14 12:00:00                  |

---

## 20. 删除反馈类型（需登录）

**接口标题**：删除反馈类型

**功能描述**：删除反馈类型（软删除）。

**接口路由**：`POST /feedback-types/delete`

**请求头（Headers）**：

- `Authorization: Bearer <token>`

**参数（Body）**：

- `id`（string，必填）：类型 ID（UUID）

**返回值（Success 200）**：

| 字段 | 类型    | 说明     | 示例 |
| ---- | ------- | -------- | ---- |
| ok   | boolean | 是否成功 | true |

---

## 通用错误响应

### 1) 业务/鉴权等错误（errorHandler 兜底）

错误时 HTTP 状态码为 `err.status` 或 `err.statusCode`，返回：

| 字段  | 类型   | 说明                               | 示例                |
| ----- | ------ | ---------------------------------- | ------------------- |
| error | string | 错误信息（仅 expose 的错误会透出） | Invalid credentials |

示例：

```json
{ "error": "Invalid credentials" }
```

### 2) 参数校验错误（validator）

当路由使用了 Joi 校验中间件，校验失败时 HTTP 400，返回：

| 字段              | 类型   | 说明         | 示例                          |
| ----------------- | ------ | ------------ | ----------------------------- |
| error             | string | 固定值       | ValidationError               |
| details           | array  | 错误明细列表 | -                             |
| details[].message | string | 错误信息     | "email" must be a valid email |
| details[].path    | array  | 字段路径数组 | ["email"]                     |

示例：

```json
{
  "error": "ValidationError",
  "details": [
    { "message": "\"email\" must be a valid email", "path": ["email"] }
  ]
}
```
