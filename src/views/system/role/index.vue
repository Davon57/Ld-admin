<script setup lang="tsx">
import { computed, defineComponent, h, nextTick, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  createRole,
  deleteRole,
  getRoleList,
  updateRole,
  type RoleItem,
  type RoleListParams
} from "@/api/role";

defineOptions({
  name: "SystemRole"
});

const colors = {
  primary: "#3B82F6",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    600: "#4B5563",
    900: "#111827"
  }
} as const;

const spacing = {
  1: "4px",
  2: "8px",
  4: "16px",
  6: "24px"
} as const;

const codeTagStyle = {
  borderColor: colors.primary,
  color: colors.primary
} as const;

type EnabledOption = { label: string; value: boolean };
const enabledOptions: EnabledOption[] = [
  { label: "启用", value: true },
  { label: "禁用", value: false }
];

const queryState = reactive<{
  code: string;
  nameKeyword: string;
  isEnabled: "" | boolean;
}>({
  code: "",
  nameKeyword: "",
  isEnabled: ""
});

const listParams = computed((): RoleListParams => {
  const params: RoleListParams = {};
  const code = queryState.code.trim();
  const nameKeyword = queryState.nameKeyword.trim();
  if (code) params.code = code;
  if (nameKeyword) params.nameKeyword = nameKeyword;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

const loading = ref(false);
const tableData = ref<RoleItem[]>([]);

async function fetchRoles(): Promise<void> {
  loading.value = true;
  try {
    const res = await getRoleList(listParams.value);
    tableData.value = Array.isArray(res?.list) ? res.list : [];
  } catch {
    tableData.value = [];
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  fetchRoles();
}

function onReset(): void {
  queryState.code = "";
  queryState.nameKeyword = "";
  queryState.isEnabled = "";
  fetchRoles();
}

type RoleFormMode = "create" | "edit";

type RoleFormModel = {
  code: string;
  name: string;
  description: string;
  isEnabled: boolean;
};

const roleFormRules: FormRules<RoleFormModel> = {
  code: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback(new Error("请输入角色 code"));
        if (v.length < 1 || v.length > 50) {
          return callback(new Error("角色 code 长度 1-50"));
        }
        return callback();
      },
      trigger: "blur"
    }
  ],
  name: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (v.length > 50) return callback(new Error("角色名称最长 50"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  description: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (v.length > 200) return callback(new Error("角色描述最长 200"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  isEnabled: [{ required: true, message: "请选择状态", trigger: "change" }]
};

function openRoleDialog(mode: RoleFormMode, row?: RoleItem): void {
  const formRef = ref<FormInstance>();
  const isEdit = computed(() => mode === "edit");

  const model = reactive<RoleFormModel>({
    code: mode === "edit" ? (row?.code ?? "") : "",
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    isEnabled: mode === "edit" ? Boolean(row?.isEnabled) : true
  });

  const RoleFormDialog = defineComponent({
    name: "RoleFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={roleFormRules}
          label-width="96px"
          class="pt-2"
        >
          <el-form-item label="角色 code" prop="code">
            <el-input
              v-model={model.code}
              placeholder="例如：admin"
              clearable
              disabled={isEdit.value}
              maxlength={50}
            />
          </el-form-item>
          <el-form-item label="角色名称" prop="name">
            <el-input
              v-model={model.name}
              placeholder="例如：管理员"
              clearable
              maxlength={50}
            />
          </el-form-item>
          <el-form-item label="角色描述" prop="description">
            <el-input
              v-model={model.description}
              placeholder="可选"
              clearable
              type="textarea"
              rows={3}
              maxlength={200}
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="状态" prop="isEnabled">
            <el-segmented
              v-model={model.isEnabled}
              options={enabledOptions.map(opt => ({
                label: opt.label,
                value: opt.value
              }))}
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增角色" : "编辑角色",
    width: "520px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(RoleFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        if (mode === "create") {
          await createRole({
            code: model.code.trim(),
            name: model.name.trim() ? model.name.trim() : undefined,
            description: model.description.trim()
              ? model.description.trim()
              : undefined,
            isEnabled: model.isEnabled
          });
          done();
          fetchRoles();
          return;
        }

        await updateRole({
          code: model.code.trim(),
          name: model.name.trim() ? model.name.trim() : undefined,
          description: model.description.trim() ? model.description.trim() : "",
          isEnabled: model.isEnabled
        });
        done();
        fetchRoles();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: RoleItem): Promise<void> {
  const code = (row?.code ?? "").trim();
  if (!code) {
    message("角色信息异常", { type: "error" });
    return;
  }
  try {
    await deleteRole({ code });
    fetchRoles();
  } catch {}
}

fetchRoles();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="角色 code">
          <el-input
            v-model="queryState.code"
            placeholder="精确匹配"
            clearable
            class="w-[200px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input
            v-model="queryState.nameKeyword"
            placeholder="模糊匹配"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-select
            v-model="queryState.isEnabled"
            clearable
            class="w-[160px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in enabledOptions"
              :key="String(opt.value)"
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

    <PureTableBar class="mt-2" title="角色列表" @refresh="fetchRoles">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openRoleDialog('create')"
            >新增角色</el-button
          >
        </el-space>
      </template>

      <el-table :data="tableData" :loading="loading" row-key="code">
        <el-table-column prop="code" label="角色 code" min-width="140">
          <template #default="{ row }">
            <el-tag :style="codeTagStyle" effect="plain">
              {{ row.code }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="角色名称" min-width="180" />
        <el-table-column prop="description" label="描述" min-width="240" />
        <el-table-column prop="isEnabled" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="修改时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openRoleDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                :title="`确认删除角色 ${row.code}？`"
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

      <div class="pt-4" :style="{ color: colors.gray[600], fontSize: '12px' }">
        <span :style="{ marginRight: spacing[2] }">提示：</span>
        <span>用户的 role 字段应填写角色 code（来自本页列表）</span>
      </div>
    </PureTableBar>
  </div>
</template>
