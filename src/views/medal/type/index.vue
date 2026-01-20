<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { exportToXlsx, type CsvColumn } from "@/utils/table";
import {
  type MedalType,
  type MedalTypeListParams,
  getMedalTypeList,
  createMedalType,
  updateMedalType,
  deleteMedalType
} from "@/api/medal";

defineOptions({
  name: "MedalTypeManage"
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
  medalTypeId: string;
  nameKeyword: string;
  isEnabled: "" | boolean;
}>({
  medalTypeId: "",
  nameKeyword: "",
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<MedalType[]>([]);
const exporting = ref(false);

const exportColumns: CsvColumn<MedalType>[] = [
  { label: "编码", key: "medalTypeId" },
  { label: "名称", key: "name" },
  { label: "描述", key: "description" },
  {
    label: "状态",
    key: "isEnabled",
    format: (_value, row) => (row.isEnabled ? "启用" : "禁用")
  },
  { label: "修改时间", key: "updatedAt" }
];

const listParams = computed((): MedalTypeListParams => {
  const params: MedalTypeListParams = {};
  const id = queryState.medalTypeId.trim();
  const keyword = queryState.nameKeyword.trim();
  if (id) params.medalTypeId = id;
  if (keyword) params.nameKeyword = keyword;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchTypes(): Promise<void> {
  loading.value = true;
  try {
    const res = await getMedalTypeList(listParams.value);
    tableData.value = res.list;
  } catch {
    tableData.value = [];
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  fetchTypes();
}

function onReset(): void {
  queryState.medalTypeId = "";
  queryState.nameKeyword = "";
  queryState.isEnabled = "";
  fetchTypes();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "勋章类型列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type TypeFormMode = "create" | "edit";

type TypeFormModel = {
  medalTypeId?: string;
  name: string;
  description: string;
  isEnabled: boolean;
};

const typeFormRules: FormRules<TypeFormModel> = {
  name: [{ required: true, message: "请输入类型名称", trigger: "blur" }],
  isEnabled: [{ required: true, message: "请选择状态", trigger: "change" }]
};

function openTypeDialog(mode: TypeFormMode, row?: MedalType): void {
  const formRef = ref<FormInstance>();
  const model = reactive<TypeFormModel>({
    medalTypeId: mode === "edit" ? row?.medalTypeId : undefined,
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    isEnabled: mode === "edit" ? (row?.isEnabled ?? true) : true
  });

  const TypeFormDialog = defineComponent({
    name: "MedalTypeFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={typeFormRules}
          label-width="90px"
        >
          {mode === "edit" ? (
            <el-form-item label="编码">
              <el-input model-value={model.medalTypeId ?? ""} disabled />
            </el-form-item>
          ) : null}
          <el-form-item label="名称" prop="name">
            <el-input v-model={model.name} placeholder="例如：新手" clearable />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input
              v-model={model.description}
              type="textarea"
              rows={5}
              resize="vertical"
              placeholder="可选"
            />
          </el-form-item>
          <el-form-item label="状态" prop="isEnabled">
            <el-segmented
              v-model={model.isEnabled}
              options={enabledOptions.map(s => ({
                label: s.label,
                value: s.value
              }))}
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增勋章类型" : "编辑勋章类型",
    width: "640px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(TypeFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();
        const name = model.name.trim();
        const description = model.description.trim();

        if (mode === "create") {
          await createMedalType({
            name,
            description: description ? description : undefined,
            isEnabled: model.isEnabled
          });
          done();
          fetchTypes();
          return;
        }

        const medalTypeId = model.medalTypeId?.trim() ?? "";
        if (!medalTypeId) {
          message("类型信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateMedalType({
          medalTypeId,
          name,
          description: description ? description : undefined,
          isEnabled: model.isEnabled
        });
        done();
        fetchTypes();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: MedalType): Promise<void> {
  try {
    await deleteMedalType({ medalTypeId: row.medalTypeId });
    fetchTypes();
  } catch {}
}

fetchTypes();
</script>

<template>
  <div>
    <el-card shadow="never">
      <div class="mb-3" :style="{ color: colors.gray[600] }">
        <span
          class="inline-block rounded"
          :style="{
            background: colors.gray[50],
            border: `1px solid ${colors.gray[200]}`,
            padding: `${spacing[1]} ${spacing[2]}`
          }"
        >
          类型用于对勋章做分组（如活动/成长/运营），便于筛选与管理
        </span>
      </div>

      <el-form inline>
        <el-form-item label="类型编码">
          <el-input
            v-model="queryState.medalTypeId"
            placeholder="例如：LD0001ABCD"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="名称关键词">
          <el-input
            v-model="queryState.nameKeyword"
            placeholder="例如：新手"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
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

    <PureTableBar class="mt-2" title="类型列表" @refresh="fetchTypes">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openTypeDialog('create')">
            新增类型
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
        row-key="medalTypeId"
        class="w-full"
      >
        <el-table-column prop="medalTypeId" label="编码" min-width="140">
          <template #default="{ row }">
            <el-tag :style="codeTagStyle" effect="plain">
              {{ row.medalTypeId }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column
          prop="description"
          label="描述"
          min-width="280"
          show-overflow-tooltip
        />
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
                @click="openTypeDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该类型？"
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
    </PureTableBar>
  </div>
</template>
