<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  type CsvColumn
} from "@/utils/table";
import {
  type Medal,
  type MedalType,
  type MedalListParams,
  getMedalList,
  createMedal,
  updateMedal,
  deleteMedal,
  getMedalTypeList
} from "@/api/medal";

defineOptions({
  name: "MedalItemManage"
});

const colors = {
  primary: "#3B82F6",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
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

const typeOptions = ref<MedalType[]>([]);

const typeLabelMap = computed((): Map<string, string> => {
  return new Map(typeOptions.value.map(t => [t.medalTypeId, t.name]));
});

async function fetchTypeOptions(): Promise<void> {
  try {
    const res = await getMedalTypeList({});
    typeOptions.value = res.list;
  } catch {
    typeOptions.value = [];
  }
}

const queryState = reactive<
  Required<Pick<MedalListParams, "page" | "pageSize">> & {
    nameKeyword: string;
    isEnabled: "" | boolean;
    medalTypeId: string;
  }
>({
  page: 1,
  pageSize: 10,
  nameKeyword: "",
  isEnabled: "",
  medalTypeId: ""
});

const loading = ref(false);
const tableData = ref<Medal[]>([]);
const total = ref(0);

const exporting = ref(false);

const exportColumns: CsvColumn<Medal>[] = [
  { label: "编码", key: "medalId" },
  {
    label: "类型",
    key: "medalTypeId",
    format: (_value, row) =>
      typeLabelMap.value.get(row.medalTypeId) ?? row.medalTypeId
  },
  { label: "名称", key: "name" },
  { label: "描述", key: "description" },
  {
    label: "状态",
    key: "isEnabled",
    format: (_value, row) => (row.isEnabled ? "启用" : "禁用")
  },
  { label: "修改时间", key: "updatedAt" }
];

const listParams = computed((): MedalListParams => {
  const params: MedalListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };

  const keyword = queryState.nameKeyword.trim();
  const medalTypeId = queryState.medalTypeId.trim();
  if (keyword) params.nameKeyword = keyword;
  if (medalTypeId) params.medalTypeId = medalTypeId;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchItems(): Promise<void> {
  loading.value = true;
  try {
    const res = await getMedalList(listParams.value);
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
  fetchItems();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.nameKeyword = "";
  queryState.isEnabled = "";
  queryState.medalTypeId = "";
  fetchItems();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchItems();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchItems();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "勋章列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type ItemFormMode = "create" | "edit";

type ItemFormModel = {
  medalId?: string;
  medalTypeId: string;
  name: string;
  description: string;
  iconBase64: string;
  isEnabled: boolean;
};

const itemFormRules: FormRules<ItemFormModel> = {
  medalTypeId: [{ required: true, message: "请选择类型", trigger: "change" }],
  name: [{ required: true, message: "请输入勋章名称", trigger: "blur" }],
  iconBase64: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback(new Error("请选择图标"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  isEnabled: [{ required: true, message: "请选择状态", trigger: "change" }]
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Invalid file result"));
    };
    reader.onerror = () => reject(new Error("Read file failed"));
    reader.readAsDataURL(file);
  });
}

function openItemDialog(mode: ItemFormMode, row?: Medal): void {
  const formRef = ref<FormInstance>();
  const fileInputRef = ref<HTMLInputElement>();
  const model = reactive<ItemFormModel>({
    medalId: mode === "edit" ? row?.medalId : undefined,
    medalTypeId: mode === "edit" ? (row?.medalTypeId ?? "") : "",
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    iconBase64: mode === "edit" ? (row?.iconBase64 ?? "") : "",
    isEnabled: mode === "edit" ? (row?.isEnabled ?? true) : true
  });

  const ItemFormDialog = defineComponent({
    name: "MedalItemFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={itemFormRules}
          label-width="90px"
        >
          {mode === "edit" ? (
            <el-form-item label="编码">
              <el-input model-value={model.medalId ?? ""} disabled />
            </el-form-item>
          ) : null}
          <el-form-item label="类型" prop="medalTypeId">
            <el-select v-model={model.medalTypeId} class="w-full" clearable>
              {typeOptions.value.map(t => (
                <el-option
                  key={t.medalTypeId}
                  label={t.name}
                  value={t.medalTypeId}
                />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="名称" prop="name">
            <el-input
              v-model={model.name}
              placeholder="例如：首次成功升级"
              clearable
            />
          </el-form-item>
          <el-form-item label="图标" prop="iconBase64">
            <div class="w-full">
              <div class="flex items-center" style={{ gap: spacing[2] }}>
                {model.iconBase64.trim() ? (
                  <el-image
                    src={model.iconBase64}
                    fit="cover"
                    class="h-10 w-10 rounded"
                    preview-src-list={[model.iconBase64]}
                    preview-teleported
                  />
                ) : (
                  <div class="h-10 w-10 rounded bg-[var(--el-fill-color-light)]" />
                )}
                <div class="flex-1">
                  <el-button
                    type="primary"
                    plain
                    onClick={() => fileInputRef.value?.click()}
                  >
                    选择图片
                  </el-button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    class="hidden"
                    onChange={async e => {
                      const input = e.target as HTMLInputElement;
                      const file = input.files?.[0];
                      input.value = "";
                      if (!file) return;
                      try {
                        const dataUrl = await readAsDataUrl(file);
                        model.iconBase64 = dataUrl;
                      } catch {
                        message("读取图片失败", { type: "error" });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
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
          <el-form-item label="描述" prop="description">
            <el-input
              v-model={model.description}
              type="textarea"
              rows={6}
              resize="vertical"
              placeholder="用于说明获得条件或展示文案"
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增勋章" : "编辑勋章",
    width: "720px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(ItemFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const name = model.name.trim();
        const description = model.description.trim();
        const iconBase64 = model.iconBase64.trim();

        const medalTypeId = model.medalTypeId.trim();
        if (!medalTypeId) {
          message("请选择类型", { type: "warning" });
          closeLoading();
          return;
        }

        if (mode === "create") {
          await createMedal({
            medalTypeId,
            name,
            description: description ? description : undefined,
            iconBase64,
            isEnabled: model.isEnabled
          });
          done();
          queryState.page = 1;
          fetchItems();
          return;
        }

        const medalId = model.medalId?.trim() ?? "";
        if (!medalId) {
          message("勋章信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateMedal({
          medalId,
          medalTypeId,
          name,
          description: description ? description : undefined,
          iconBase64: iconBase64 ? iconBase64 : undefined,
          isEnabled: model.isEnabled
        });
        done();
        fetchItems();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: Medal): Promise<void> {
  try {
    await deleteMedal({ medalId: row.medalId });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchItems();
  } catch {}
}

fetchTypeOptions();
fetchItems();
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
          勋章归属某个类型，用于统一管理展示与发放规则
        </span>
      </div>

      <el-form inline>
        <el-form-item label="名称关键词">
          <el-input
            v-model="queryState.nameKeyword"
            placeholder="例如：新手"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="queryState.medalTypeId"
            clearable
            class="w-[180px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="t in typeOptions"
              :key="t.medalTypeId"
              :label="t.name"
              :value="t.medalTypeId"
            />
          </el-select>
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

    <PureTableBar class="mt-2" title="勋章列表" @refresh="fetchItems">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openItemDialog('create')">
            新增勋章
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
        row-key="medalId"
        class="w-full"
      >
        <el-table-column label="图标" width="76">
          <template #default="{ row }">
            <el-image
              v-if="row.iconBase64"
              :src="row.iconBase64"
              fit="cover"
              class="h-9 w-9 rounded"
              :preview-src-list="[row.iconBase64]"
              preview-teleported
            />
            <div
              v-else
              class="h-9 w-9 rounded bg-[var(--el-fill-color-light)]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="medalId" label="编码" min-width="140">
          <template #default="{ row }">
            <el-tag :style="codeTagStyle" effect="plain">
              {{ row.medalId }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="medalTypeId" label="类型" min-width="140">
          <template #default="{ row }">
            <el-tag
              :style="{ borderColor: colors.primary, color: colors.primary }"
              effect="plain"
            >
              {{ typeLabelMap.get(row.medalTypeId) || row.medalTypeId }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="description"
          label="描述"
          min-width="260"
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
                @click="openItemDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该勋章？"
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
