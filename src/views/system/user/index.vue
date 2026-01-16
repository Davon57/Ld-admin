<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules, CascaderOption } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  type CsvColumn
} from "@/utils/table";
import {
  type UserItem,
  type UserRole,
  type UserStatus,
  type UserListParams,
  getUserList,
  createUser,
  updateUser,
  deleteUser,
  batchDeleteUsers
} from "@/api/user";

defineOptions({
  name: "SystemUser"
});

type RoleOption = { label: string; value: UserRole };
type StatusOption = { label: string; value: UserStatus };

const roleOptions: RoleOption[] = [
  { label: "管理员", value: "admin" },
  { label: "版主", value: "moderator" },
  { label: "普通用户", value: "user" }
];

const statusOptions: StatusOption[] = [
  { label: "启用", value: "active" },
  { label: "停用", value: "inactive" },
  { label: "封禁", value: "banned" }
];

const queryState = reactive<
  Required<Pick<UserListParams, "page" | "pageSize">> & {
    keyword: string;
    role: "" | UserRole;
    status: "" | UserStatus;
  }
>({
  page: 1,
  pageSize: 10,
  keyword: "",
  role: "",
  status: ""
});

const loading = ref(false);
const tableData = ref<UserItem[]>([]);
const total = ref(0);
const selectionIds = ref<string[]>([]);

const exporting = ref(false);

const exportColumns: CsvColumn<UserItem>[] = [
  { label: "头像", key: "avatar" },
  { label: "用户名", key: "username" },
  { label: "昵称", key: "nickname" },
  { label: "城市", key: "city" },
  {
    label: "角色",
    key: "role",
    format: (_value, row) =>
      row.role === "admin"
        ? "管理员"
        : row.role === "moderator"
          ? "版主"
          : "普通用户"
  },
  {
    label: "状态",
    key: "status",
    format: (_value, row) =>
      row.status === "active"
        ? "启用"
        : row.status === "inactive"
          ? "停用"
          : "封禁"
  },
  { label: "手机号", key: "phone" },
  { label: "邮箱", key: "email" },
  { label: "创建时间", key: "createdAt" },
  { label: "修改时间", key: "updatedAt" }
];

const listParams = computed((): UserListParams => {
  const params: UserListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.role) params.role = queryState.role;
  if (queryState.status !== "") params.status = queryState.status;
  return params;
});

async function fetchUsers(): Promise<void> {
  loading.value = true;
  try {
    const res = await getUserList(listParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } catch {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchUsers();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.role = "";
  queryState.status = "";
  fetchUsers();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchUsers();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchUsers();
}

function onSelectionChange(rows: UserItem[]): void {
  selectionIds.value = rows.map(r => r.userId);
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "用户列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type UserFormMode = "create" | "edit";

type UserFormModel = {
  userId?: string;
  username: string;
  nickname: string;
  avatar: string;
  city: string;
  role: UserRole;
  status: UserStatus;
  phone: string;
  email: string;
  password: string;
};

const userFormRules: FormRules<UserFormModel> = {
  username: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback(new Error("请输入用户名"));
        if (v.length < 3) return callback(new Error("用户名长度至少 3 位"));
        if (v.length > 50) return callback(new Error("用户名长度最多 50 位"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  nickname: [],
  avatar: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback();
        try {
          const url = new URL(v);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return callback(new Error("头像链接需为 http/https"));
          }
          return callback();
        } catch {
          return callback(new Error("头像链接格式不正确"));
        }
      },
      trigger: "blur"
    }
  ],
  role: [{ required: true, message: "请选择角色", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
  email: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback();
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return ok ? callback() : callback(new Error("邮箱格式不正确"));
      },
      trigger: "blur"
    }
  ],
  phone: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback();
        const ok = /^1\d{10}$/.test(value);
        return ok ? callback() : callback(new Error("手机号格式不正确"));
      },
      trigger: "blur"
    }
  ],
  password: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback(new Error("请输入密码"));
        if (value.length < 6) return callback(new Error("密码至少 6 位"));
        if (value.length > 100) return callback(new Error("密码最多 100 位"));
        return callback();
      },
      trigger: "blur"
    }
  ]
};

type CascaderValue = string[];

type CascaderProps = {
  value: string;
  label: string;
  children: string;
  emitPath: boolean;
};

const cityCascaderProps: CascaderProps = {
  value: "value",
  label: "label",
  children: "children",
  emitPath: true
};

function findCascaderPathByLabels(
  options: CascaderOption[],
  labels: string[]
): CascaderValue | null {
  if (labels.length === 0) return [];

  let currentOptions = options;
  const path: CascaderValue = [];

  for (const label of labels) {
    const next = currentOptions.find(o => String(o.label) === label);
    if (!next) return null;
    path.push(String(next.value));
    currentOptions = (next.children ?? []) as CascaderOption[];
  }

  return path;
}

function getCascaderLabelsByPath(
  options: CascaderOption[],
  path: CascaderValue
): string[] | null {
  if (path.length === 0) return [];

  let currentOptions = options;
  const labels: string[] = [];

  for (const value of path) {
    const next = currentOptions.find(o => String(o.value) === String(value));
    if (!next) return null;
    labels.push(String(next.label));
    currentOptions = (next.children ?? []) as CascaderOption[];
  }

  return labels;
}

function openUserDialog(mode: UserFormMode, row?: UserItem): void {
  const formRef = ref<FormInstance>();
  const cityOptions = ref<CascaderOption[]>([]);
  const cityLoading = ref(false);
  const cityCodePath = ref<CascaderValue>([]);

  async function ensureCityOptions(): Promise<void> {
    if (cityOptions.value.length > 0 || cityLoading.value) return;
    cityLoading.value = true;
    try {
      const mod = await import("element-china-area-data");
      const regionData = (mod as unknown as { regionData?: unknown })
        .regionData;
      cityOptions.value = Array.isArray(regionData)
        ? (regionData as unknown as CascaderOption[])
        : [];
    } catch {
      message("城市数据加载失败", { type: "error" });
      cityOptions.value = [];
    } finally {
      cityLoading.value = false;
    }
  }

  const model = reactive<UserFormModel>({
    userId: mode === "edit" ? row?.userId : undefined,
    username: mode === "edit" ? (row?.username ?? "") : "",
    nickname: mode === "edit" ? (row?.nickname ?? "") : "",
    avatar: mode === "edit" ? (row?.avatar ?? "") : "",
    city: mode === "edit" ? (row?.city ?? "") : "",
    role: mode === "edit" ? (row?.role ?? "user") : "user",
    status: mode === "edit" ? (row?.status ?? "active") : "active",
    phone: mode === "edit" ? (row?.phone ?? "") : "",
    email: mode === "edit" ? (row?.email ?? "") : "",
    password: ""
  });

  const UserFormDialog = defineComponent({
    name: "UserFormDialog",
    setup() {
      const isEdit = computed(() => mode === "edit");
      const rules = computed(() => {
        const base: FormRules<UserFormModel> = { ...userFormRules };
        if (isEdit.value) {
          return {
            username: base.username,
            nickname: base.nickname,
            avatar: base.avatar,
            role: base.role,
            status: base.status,
            email: base.email,
            phone: base.phone
          };
        }

        return base;
      });

      nextTick(() => {
        formRef.value?.clearValidate();
      });

      void ensureCityOptions().then(() => {
        const labelPath = model.city
          .split("/")
          .map(s => s.trim())
          .filter(Boolean);
        const found = findCascaderPathByLabels(cityOptions.value, labelPath);
        if (found) cityCodePath.value = found;
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={rules.value}
          label-width="90px"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model={model.username}
              placeholder="请输入用户名"
              clearable
              disabled={isEdit.value}
            />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input
              v-model={model.nickname}
              placeholder="请输入昵称"
              clearable
            />
          </el-form-item>
          <el-form-item label="头像" prop="avatar">
            <el-input
              v-model={model.avatar}
              placeholder="请输入头像 URL"
              clearable
            />
          </el-form-item>
          <el-form-item label="角色" prop="role">
            <el-select v-model={model.role} class="w-full" clearable={false}>
              {roleOptions.map(opt => (
                <el-option
                  label={opt.label}
                  value={opt.value}
                  key={opt.value}
                />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-segmented
              v-model={model.status}
              options={statusOptions.map(s => ({
                label: s.label,
                value: s.value
              }))}
            />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input
              v-model={model.phone}
              placeholder="请输入手机号"
              clearable
              maxlength={11}
            />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input
              v-model={model.email}
              placeholder="请输入邮箱"
              clearable
            />
          </el-form-item>
          <el-form-item label="城市" prop="city">
            <el-cascader
              v-model={cityCodePath.value}
              options={cityOptions.value}
              props={cityCascaderProps}
              filterable
              clearable
              class="w-full"
              loading={cityLoading.value}
              placeholder="请选择省/市/区"
              onChange={(value: unknown) => {
                const path = Array.isArray(value)
                  ? (value.map(v => String(v)) as CascaderValue)
                  : [];
                cityCodePath.value = path;
                const labels = getCascaderLabelsByPath(cityOptions.value, path);
                model.city = labels ? labels.join("/") : "";
              }}
              onClear={() => {
                cityCodePath.value = [];
                model.city = "";
              }}
            />
          </el-form-item>
          {isEdit.value ? null : (
            <el-form-item label="密码" prop="password">
              <el-input
                v-model={model.password}
                type="password"
                show-password
                placeholder="请输入密码"
                clearable
              />
            </el-form-item>
          )}
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增用户" : "编辑用户",
    width: "520px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(UserFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        if (mode === "create") {
          const email = model.email.trim();
          const avatar = model.avatar.trim();
          const nickname = model.nickname.trim();
          const city = model.city.trim();
          await createUser({
            username: model.username.trim(),
            nickname: nickname ? nickname : undefined,
            avatar: avatar ? avatar : undefined,
            city: city ? city : undefined,
            role: model.role,
            status: model.status,
            phone: model.phone.trim() ? model.phone.trim() : null,
            email: email ? email : undefined,
            password: model.password
          });
          done();
          queryState.page = 1;
          fetchUsers();
          return;
        }

        if (!model.userId) {
          message("用户信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateUser({
          userId: model.userId,
          nickname: model.nickname.trim(),
          avatar: model.avatar.trim() ? model.avatar.trim() : undefined,
          city: model.city.trim(),
          role: model.role,
          status: model.status,
          phone: model.phone.trim() ? model.phone.trim() : null,
          email: model.email.trim() ? model.email.trim() : null
        });
        done();
        fetchUsers();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: UserItem): Promise<void> {
  try {
    await deleteUser({ userId: row.userId });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchUsers();
  } catch {}
}

async function onBatchDelete(): Promise<void> {
  if (selectionIds.value.length === 0) {
    message("请选择要删除的用户", { type: "warning" });
    return;
  }

  const deletingCount = selectionIds.value.length;
  const currentRows = tableData.value.length;

  const BatchDeleteContent = defineComponent({
    name: "BatchDeleteContent",
    setup() {
      return () => (
        <div class="text-[14px] leading-6">
          确认删除选中的 {selectionIds.value.length} 个用户？
        </div>
      );
    }
  });

  addDialog({
    title: "批量删除",
    width: "420px",
    closeOnClickModal: false,
    sureBtnLoading: true,
    contentRenderer: () => h(BatchDeleteContent),
    beforeSure: async (done, { closeLoading }) => {
      try {
        const userIds = [...selectionIds.value];
        const res = await batchDeleteUsers({ userIds });
        if (res.failedCount > 0) {
          message(`删除失败 ${res.failedCount} 个用户`, { type: "warning" });
        } else {
          message("删除成功", { type: "success" });
        }
        done();
        if (queryState.page > 1 && deletingCount >= currentRows) {
          queryState.page -= 1;
        }
        selectionIds.value = [];
        fetchUsers();
      } catch {
        closeLoading();
      }
    }
  });
}

fetchUsers();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="用户名/昵称/手机号/邮箱/城市"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="queryState.role" clearable class="w-[160px]!">
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in roleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryState.status" clearable class="w-[160px]!">
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="用户列表" @refresh="fetchUsers">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openUserDialog('create')">
            新增用户
          </el-button>
          <el-button
            type="success"
            plain
            :loading="exporting"
            @click="onExportList"
          >
            导出列表
          </el-button>
          <el-button type="danger" plain @click="onBatchDelete">
            批量删除
          </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="userId"
        class="w-full"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="avatar" label="头像" width="70">
          <template #default="{ row }">
            <el-image
              v-if="row.avatar"
              :src="row.avatar"
              fit="cover"
              class="h-8 w-8 rounded-full"
              :preview-src-list="[row.avatar]"
              preview-teleported
            />
            <div
              v-else
              class="h-8 w-8 rounded-full bg-[var(--el-fill-color-light)]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="nickname" label="昵称" min-width="140" />
        <el-table-column prop="city" label="城市" min-width="120" />
        <el-table-column prop="role" label="角色" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.role === 'admin'" type="warning">管理员</el-tag>
            <el-tag v-else-if="row.role === 'moderator'" type="success">
              版主
            </el-tag>
            <el-tag v-else>普通用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'active'" type="success">启用</el-tag>
            <el-tag v-else-if="row.status === 'inactive'" type="info">
              停用
            </el-tag>
            <el-tag v-else type="danger">封禁</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="修改时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openUserDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该用户？"
                confirm-button-text="删除"
                confirm-button-type="danger"
                cancel-button-text="取消"
                @confirm="onDeleteRow(row)"
              >
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end pt-4">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="queryState.page"
          :page-size="queryState.pageSize"
          :page-sizes="DEFAULT_PAGE_SIZES"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
