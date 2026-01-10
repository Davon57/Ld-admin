<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
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
  { label: "普通用户", value: "common" }
];

const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
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
const selectionIds = ref<number[]>([]);

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
    if (!res.success) {
      message(res.message || "获取用户列表失败", { type: "error" });
      tableData.value = [];
      total.value = 0;
      return;
    }
    tableData.value = res.data.list;
    total.value = res.data.total;
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
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
  selectionIds.value = rows.map(r => r.id);
}

type UserFormMode = "create" | "edit";

type UserFormModel = {
  id?: number;
  username: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  phone: string;
  email: string;
  password: string;
};

const userFormRules: FormRules<UserFormModel> = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  nickname: [{ required: true, message: "请输入昵称", trigger: "blur" }],
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
        return callback();
      },
      trigger: "blur"
    }
  ]
};

function openUserDialog(mode: UserFormMode, row?: UserItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<UserFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    username: mode === "edit" ? (row?.username ?? "") : "",
    nickname: mode === "edit" ? (row?.nickname ?? "") : "",
    role: mode === "edit" ? (row?.role ?? "common") : "common",
    status: mode === "edit" ? (row?.status ?? 1) : 1,
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
          const res = await createUser({
            username: model.username.trim(),
            nickname: model.nickname.trim(),
            role: model.role,
            status: model.status,
            phone: model.phone.trim(),
            email: model.email.trim(),
            password: model.password
          });
          if (!res.success) {
            message(res.message || "新增失败", { type: "error" });
            closeLoading();
            return;
          }
          message("新增成功", { type: "success" });
          done();
          queryState.page = 1;
          fetchUsers();
          return;
        }

        if (!model.id) {
          message("用户信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateUser({
          id: model.id,
          nickname: model.nickname.trim(),
          role: model.role,
          status: model.status,
          phone: model.phone.trim(),
          email: model.email.trim()
        });
        if (!res.success) {
          message(res.message || "更新失败", { type: "error" });
          closeLoading();
          return;
        }
        message("更新成功", { type: "success" });
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
    const res = await deleteUser({ id: row.id });
    if (!res.success) {
      message(res.message || "删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchUsers();
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  }
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
        const ids = [...selectionIds.value];
        const res = await batchDeleteUsers({ ids });
        if (!res.success) {
          message(res.message || "批量删除失败", { type: "error" });
          closeLoading();
          return;
        }
        message("删除成功", { type: "success" });
        done();
        if (queryState.page > 1 && deletingCount >= currentRows) {
          queryState.page -= 1;
        }
        selectionIds.value = [];
        fetchUsers();
      } catch {
        closeLoading();
        message("网络异常，请稍后重试", { type: "error" });
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
            placeholder="用户名/昵称/手机号/邮箱"
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
          <el-button type="danger" plain @click="onBatchDelete">
            批量删除
          </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="id"
        class="w-full"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="nickname" label="昵称" min-width="140" />
        <el-table-column prop="role" label="角色" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.role === 'admin'" type="warning">管理员</el-tag>
            <el-tag v-else>普通用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
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
          :page-sizes="[10, 20, 50]"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
