<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules, CascaderOption } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  isPageData,
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
  deleteUser
} from "@/api/user";
import { type AvatarItem, getAvatarList } from "@/api/avatar";
import { getRoleList, type RoleItem } from "@/api/role";

defineOptions({
  name: "SystemUser"
});

type RoleOption = { label: string; value: UserRole };
type StatusOption = { label: string; value: UserStatus };

const roleLoading = ref(false);
const roleList = ref<RoleItem[]>([]);

async function fetchRoles(): Promise<void> {
  if (roleLoading.value) return;
  roleLoading.value = true;
  try {
    const res = await getRoleList({});
    roleList.value = Array.isArray(res?.list) ? res.list : [];
  } catch {
    roleList.value = [];
  } finally {
    roleLoading.value = false;
  }
}

const roleNameByCode = computed((): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const item of roleList.value) {
    out[item.code] = item.name ? item.name : item.code;
  }
  return out;
});

const roleEnabledByCode = computed((): Record<string, boolean> => {
  const out: Record<string, boolean> = {};
  for (const item of roleList.value) {
    out[item.code] = Boolean(item.isEnabled);
  }
  return out;
});

const defaultRoleCode = computed((): string => {
  const enabledFirst = roleList.value.find(r => r.isEnabled)?.code;
  if (enabledFirst) return enabledFirst;
  return roleList.value[0]?.code ?? "";
});

const roleOptions = computed((): RoleOption[] => {
  return roleList.value.map(r => ({
    label: r.name ? `${r.name}（${r.code}）` : r.code,
    value: r.code
  }));
});

function resolveRoleLabel(roleCode: string): string {
  const code = (roleCode ?? "").trim();
  if (!code) return "-";
  return roleNameByCode.value[code] ?? code;
}

fetchRoles();

const statusOptions: StatusOption[] = [
  { label: "启用", value: "active" },
  { label: "停用", value: "inactive" },
  { label: "封禁", value: "banned" }
];

const queryState = reactive<{
  page: number;
  pageSize: number;
  keyword: string;
  role: "" | UserRole;
  status: "" | UserStatus;
}>({
  page: 1,
  pageSize: 10,
  keyword: "",
  role: "",
  status: ""
});

const loading = ref(false);
const allUsers = ref<UserItem[]>([]);
const serverUsers = ref<UserItem[]>([]);
const paginationEnabled = ref(false);
const total = ref(0);

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

function inferMimeFromBase64(base64: string): string {
  const v = (base64 ?? "").trim();
  if (!v) return "image/png";
  if (v.startsWith("iVBORw0KGgo")) return "image/png";
  if (v.startsWith("/9j/")) return "image/jpeg";
  if (v.startsWith("R0lGOD")) return "image/gif";
  if (v.startsWith("UklGR")) return "image/webp";
  if (v.startsWith("PHN2Zy")) return "image/svg+xml";
  return "image/png";
}

function toImageDataUrl(base64: string): string {
  const v = (base64 ?? "").trim();
  if (!v) return "";
  if (v.startsWith("data:")) return v;
  return `data:${inferMimeFromBase64(v)};base64,${v}`;
}

const avatarLoading = ref(false);
const avatarList = ref<AvatarItem[]>([]);

async function fetchAllAvatars(): Promise<void> {
  if (avatarLoading.value) return;
  avatarLoading.value = true;
  try {
    const pageSize = 100;
    const first = await getAvatarList({
      page: 1,
      pageSize,
      includeDisabled: true
    });
    const total = Math.max(0, Number(first.total || 0));
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const all: AvatarItem[] = [...first.list];

    for (let page = 2; page <= maxPage; page += 1) {
      const res = await getAvatarList({
        page,
        pageSize,
        includeDisabled: true
      });
      all.push(...res.list);
    }

    avatarList.value = all;
  } catch {
    avatarList.value = [];
  } finally {
    avatarLoading.value = false;
  }
}

const avatarSrcById = computed((): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const item of avatarList.value) {
    out[item.avatarId] = toImageDataUrl(item.imageBase64);
  }
  return out;
});

function resolveAvatarSrc(avatarId: string): string {
  const id = (avatarId ?? "").trim();
  if (!id) return "";
  return avatarSrcById.value[id] ?? "";
}

const filteredUsers = computed((): UserItem[] => {
  const keyword = queryState.keyword.trim();
  const role = queryState.role;
  const status = queryState.status;
  return allUsers.value
    .filter(u => matchKeyword(u, keyword))
    .filter(u => (role ? u.role === role : true))
    .filter(u => (status ? u.status === status : true));
});

const tableData = computed((): UserItem[] => {
  return paginationEnabled.value ? serverUsers.value : filteredUsers.value;
});

const exporting = ref(false);

const exportColumns: CsvColumn<UserItem>[] = [
  { label: "编码", key: "userId" },
  { label: "头像", key: "avatar" },
  { label: "用户名", key: "username" },
  { label: "昵称", key: "nickname" },
  { label: "城市", key: "city" },
  {
    label: "角色",
    key: "role",
    format: (_value, row) => resolveRoleLabel(row.role)
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
    if (isPageData<UserItem>(res)) {
      paginationEnabled.value = true;
      serverUsers.value = res.list;
      total.value = res.total;
      return;
    }

    paginationEnabled.value = false;
    allUsers.value = res;
  } catch {
    paginationEnabled.value = false;
    serverUsers.value = [];
    allUsers.value = [];
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
        const ok = /^LD\d{4}[A-Z]{4}$/.test(v);
        return ok ? callback() : callback(new Error("头像 ID 格式不正确"));
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

  async function ensureRoles(): Promise<void> {
    if (roleList.value.length > 0) return;
    await fetchRoles();
  }

  function openAvatarPicker(): void {
    const keyword = ref("");

    async function ensureAvatars(): Promise<void> {
      if (avatarList.value.length > 0) return;
      await fetchAllAvatars();
    }

    const filtered = computed(() => {
      const k = keyword.value.trim().toLowerCase();
      if (!k) return avatarList.value;
      return avatarList.value.filter(a => {
        const description = (a.description ?? "").toLowerCase();
        const avatarId = (a.avatarId ?? "").toLowerCase();
        return description.includes(k) || avatarId.includes(k);
      });
    });

    const AvatarPicker = defineComponent({
      name: "UserAvatarPicker",
      emits: ["close"],
      setup(_props, { emit }) {
        nextTick(() => {
          void ensureAvatars();
        });

        return () => (
          <div class="w-full">
            <div class="flex items-center gap-3 pb-3">
              <el-input
                v-model={keyword.value}
                placeholder="搜索描述/ID"
                clearable
              />
              <el-button
                plain
                loading={avatarLoading.value}
                onClick={() => {
                  void fetchAllAvatars();
                }}
              >
                刷新
              </el-button>
            </div>

            <div
              class={[
                "grid",
                "grid-cols-2",
                "gap-3",
                "sm:grid-cols-3",
                "md:grid-cols-4",
                "lg:grid-cols-5"
              ]}
            >
              {filtered.value.length === 0 ? (
                <div class="col-span-full py-8 text-center text-[13px] text-[var(--el-text-color-secondary)]">
                  {avatarLoading.value ? "加载中..." : "暂无可用头像"}
                </div>
              ) : (
                filtered.value.map(item => {
                  const url = resolveAvatarSrc(item.avatarId);
                  const selected = model.avatar.trim() === item.avatarId;
                  return (
                    <button
                      type="button"
                      class={[
                        "flex",
                        "items-center",
                        "gap-3",
                        "rounded-lg",
                        "border",
                        "p-3",
                        "text-left",
                        "transition-colors",
                        selected
                          ? "border-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]"
                          : "border-[var(--el-border-color)] hover:bg-[var(--el-fill-color-light)]"
                      ]}
                      aria-label={`选择头像：${item.description || item.avatarId}`}
                      onClick={() => {
                        model.avatar = item.avatarId;
                        emit("close", { command: "close" });
                      }}
                    >
                      <el-image
                        src={url}
                        fit="cover"
                        class="h-9 w-9 shrink-0 rounded-full"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-[14px] text-[var(--el-text-color-primary)]">
                          {item.description || "-"}
                        </div>
                        <div class="truncate text-[12px] text-[var(--el-text-color-secondary)]">
                          {item.avatarId}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      }
    });

    addDialog({
      title: "选择预设头像",
      width: "860px",
      fullscreenIcon: true,
      closeOnClickModal: false,
      hideFooter: true,
      contentRenderer: () => h(AvatarPicker)
    });
  }

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
    role:
      mode === "edit"
        ? (row?.role ?? defaultRoleCode.value)
        : defaultRoleCode.value,
    status: mode === "edit" ? (row?.status ?? "active") : "active",
    phone: mode === "edit" ? (row?.phone ?? "") : "",
    email: mode === "edit" ? (row?.email ?? "") : "",
    password: ""
  });

  const UserFormDialog = defineComponent({
    name: "UserFormDialog",
    setup() {
      const isEdit = computed(() => mode === "edit");
      const avatarPreviewSrc = computed(() => resolveAvatarSrc(model.avatar));
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

      nextTick(() => {
        void fetchAllAvatars();
      });

      nextTick(() => {
        void ensureRoles().then(() => {
          if (!model.role) model.role = defaultRoleCode.value;
        });
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
            <div class="w-full">
              <div class="flex items-center gap-3">
                {avatarPreviewSrc.value ? (
                  <el-image
                    src={avatarPreviewSrc.value}
                    fit="cover"
                    class="h-9 w-9 rounded-full"
                    preview-src-list={[avatarPreviewSrc.value]}
                    preview-teleported
                  />
                ) : (
                  <div class="h-9 w-9 rounded-full bg-[var(--el-fill-color-light)]" />
                )}
                <el-input
                  v-model={model.avatar}
                  placeholder="请选择系统头像"
                  readonly
                  class="flex-1"
                />
              </div>
              <div class="pt-2">
                <el-space wrap>
                  <el-button plain onClick={openAvatarPicker}>
                    选择头像
                  </el-button>
                  <el-button
                    plain
                    type="danger"
                    disabled={!model.avatar.trim()}
                    onClick={() => {
                      model.avatar = "";
                    }}
                  >
                    清空
                  </el-button>
                </el-space>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="角色" prop="role">
            <el-select v-model={model.role} class="w-full" clearable={false}>
              {roleOptions.value.map(opt => (
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
    if (
      paginationEnabled.value &&
      queryState.page > 1 &&
      tableData.value.length === 1
    ) {
      queryState.page -= 1;
    }
    fetchUsers();
  } catch {}
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
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="userId"
        class="w-full"
      >
        <el-table-column type="expand" width="44">
          <template #default="{ row }">
            <div class="px-6 py-4">
              <div
                class="flex items-center gap-8 overflow-x-auto whitespace-nowrap"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="text-[13px] text-[var(--el-text-color-secondary)]"
                  >
                    头像
                  </div>
                  <div class="flex items-center">
                    <el-image
                      v-if="resolveAvatarSrc(row.avatar)"
                      :src="resolveAvatarSrc(row.avatar)"
                      fit="cover"
                      class="h-8 w-8 rounded-full"
                      :preview-src-list="[resolveAvatarSrc(row.avatar)]"
                      preview-teleported
                    />
                    <div
                      v-else
                      class="h-8 w-8 rounded-full bg-[var(--el-fill-color-light)]"
                    />
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div
                    class="text-[13px] text-[var(--el-text-color-secondary)]"
                  >
                    昵称
                  </div>
                  <div class="text-[14px] text-[var(--el-text-color-primary)]">
                    {{ row.nickname || "-" }}
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div
                    class="text-[13px] text-[var(--el-text-color-secondary)]"
                  >
                    城市
                  </div>
                  <div class="text-[14px] text-[var(--el-text-color-primary)]">
                    {{ row.city || "-" }}
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div
                    class="text-[13px] text-[var(--el-text-color-secondary)]"
                  >
                    手机号
                  </div>
                  <div class="text-[14px] text-[var(--el-text-color-primary)]">
                    {{ row.phone || "-" }}
                  </div>
                </div>

                <div class="flex min-w-0 items-center gap-3">
                  <div
                    class="text-[13px] text-[var(--el-text-color-secondary)]"
                  >
                    邮箱
                  </div>
                  <div
                    class="max-w-[520px] truncate text-[14px] text-[var(--el-text-color-primary)]"
                    :title="row.email || '-'"
                  >
                    {{ row.email || "-" }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="编码" min-width="150" />
        <el-table-column prop="username" label="用户名" min-width="160" />
        <el-table-column prop="role" label="角色" width="110">
          <template #default="{ row }">
            <el-tag
              v-if="row.role && roleEnabledByCode[row.role] === false"
              type="info"
            >
              {{ resolveRoleLabel(row.role) }}
            </el-tag>
            <el-tag v-else>
              {{ resolveRoleLabel(row.role) }}
            </el-tag>
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

      <div v-if="paginationEnabled" class="flex justify-end pt-4">
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
