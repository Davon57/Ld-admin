<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES, exportToCsv, type CsvColumn } from "@/utils/table";
import {
  type MedalTypeItem,
  type Status,
  type MedalTypeListParams,
  getMedalTypeList,
  createMedalType,
  updateMedalType,
  deleteMedalType,
  batchDeleteMedalTypes
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

type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

const queryState = reactive<
  Required<Pick<MedalTypeListParams, "page" | "pageSize">> & {
    keyword: string;
    status: "" | Status;
  }
>({
  page: 1,
  pageSize: 10,
  keyword: "",
  status: ""
});

const loading = ref(false);
const tableData = ref<MedalTypeItem[]>([]);
const total = ref(0);
const selectionIds = ref<number[]>([]);

const exporting = ref(false);

const exportColumns: CsvColumn<MedalTypeItem>[] = [
  { label: "名称", key: "name" },
  { label: "标识", key: "code" },
  {
    label: "状态",
    key: "status",
    format: (_value, row) => (row.status === 1 ? "启用" : "禁用")
  },
  { label: "创建时间", key: "createdAt" }
];

const listParams = computed((): MedalTypeListParams => {
  const params: MedalTypeListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.status !== "") params.status = queryState.status;
  return params;
});

async function fetchTypes(): Promise<void> {
  loading.value = true;
  try {
    const res = await getMedalTypeList(listParams.value);
    if (!res.success) {
      message(res.message || "获取类型列表失败", { type: "error" });
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
  fetchTypes();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.status = "";
  fetchTypes();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchTypes();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchTypes();
}

function onSelectionChange(rows: MedalTypeItem[]): void {
  selectionIds.value = rows.map(r => r.id);
}

async function onExportList(): Promise<void> {
  if (total.value === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    const res = await getMedalTypeList({
      ...listParams.value,
      page: 1,
      pageSize: 3000
    });
    if (!res.success) {
      message(res.message || "导出失败", { type: "error" });
      return;
    }
    if (total.value > res.data.list.length) {
      message("仅导出前 3000 条", { type: "warning" });
    }
    exportToCsv(res.data.list, exportColumns, "类型列表");
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type TypeFormMode = "create" | "edit";

type TypeFormModel = {
  id?: number;
  name: string;
  code: string;
  status: Status;
};

const typeFormRules: FormRules<TypeFormModel> = {
  name: [{ required: true, message: "请输入类型名称", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
};

function openTypeDialog(mode: TypeFormMode, row?: MedalTypeItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<TypeFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    name: mode === "edit" ? (row?.name ?? "") : "",
    code: mode === "edit" ? (row?.code ?? "") : "",
    status: mode === "edit" ? (row?.status ?? 1) : 1
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
          <el-form-item label="名称" prop="name">
            <el-input
              v-model={model.name}
              placeholder="例如：OTA升级"
              clearable
            />
          </el-form-item>
          <el-form-item label="标识" prop="code">
            <el-input
              v-model={model.code}
              placeholder="例如：ota（留空将自动使用名称）"
              clearable
            />
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
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增类型" : "编辑类型",
    width: "640px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(TypeFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const name = model.name.trim();
        const code = model.code.trim() || name;

        if (mode === "create") {
          const res = await createMedalType({
            name,
            code,
            status: model.status
          });
          if (!res.success) {
            message(res.message || "新增失败", { type: "error" });
            closeLoading();
            return;
          }
          message("新增成功", { type: "success" });
          done();
          queryState.page = 1;
          fetchTypes();
          return;
        }

        if (!model.id) {
          message("类型信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateMedalType({
          id: model.id,
          name,
          code,
          status: model.status
        });
        if (!res.success) {
          message(res.message || "更新失败", { type: "error" });
          closeLoading();
          return;
        }
        message("更新成功", { type: "success" });
        done();
        fetchTypes();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: MedalTypeItem): Promise<void> {
  try {
    const res = await deleteMedalType({ id: row.id });
    if (!res.success) {
      message(res.message || "删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchTypes();
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  }
}

async function onBatchDelete(): Promise<void> {
  if (selectionIds.value.length === 0) {
    message("请选择要删除的类型", { type: "warning" });
    return;
  }

  const deletingCount = selectionIds.value.length;
  const currentRows = tableData.value.length;

  const BatchDeleteContent = defineComponent({
    name: "MedalTypeBatchDeleteContent",
    setup() {
      return () => (
        <div class="text-[14px] leading-6">
          确认删除选中的 {deletingCount} 个类型？
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
        const res = await batchDeleteMedalTypes({ ids });
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
        fetchTypes();
      } catch {
        closeLoading();
        message("网络异常，请稍后重试", { type: "error" });
      }
    }
  });
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
          类型用于区分不同业务场景的勋章（如OTA升级、发文章、提问）
        </span>
      </div>

      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="名称/标识"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
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
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="code" label="标识" min-width="140">
          <template #default="{ row }">
            <el-tag
              :style="{ borderColor: colors.primary, color: colors.primary }"
              effect="plain"
            >
              {{ row.code }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
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
