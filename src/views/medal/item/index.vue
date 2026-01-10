<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  type MedalItem,
  type MedalTypeItem,
  type Status,
  type MedalItemListParams,
  getMedalItemList,
  createMedalItem,
  updateMedalItem,
  deleteMedalItem,
  batchDeleteMedalItems,
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

type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

const typeOptions = ref<MedalTypeItem[]>([]);

const typeLabelMap = computed((): Map<number, string> => {
  return new Map(typeOptions.value.map(t => [t.id, t.name]));
});

async function fetchTypeOptions(): Promise<void> {
  try {
    const res = await getMedalTypeList({ page: 1, pageSize: 999 });
    if (!res.success) {
      typeOptions.value = [];
      return;
    }
    typeOptions.value = res.data.list;
  } catch {
    typeOptions.value = [];
  }
}

const queryState = reactive<
  Required<Pick<MedalItemListParams, "page" | "pageSize">> & {
    keyword: string;
    status: "" | Status;
    typeId: "" | number;
  }
>({
  page: 1,
  pageSize: 10,
  keyword: "",
  status: "",
  typeId: ""
});

const loading = ref(false);
const tableData = ref<MedalItem[]>([]);
const total = ref(0);
const selectionIds = ref<number[]>([]);

const listParams = computed((): MedalItemListParams => {
  const params: MedalItemListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.status !== "") params.status = queryState.status;
  if (queryState.typeId !== "") params.typeId = queryState.typeId;
  return params;
});

async function fetchItems(): Promise<void> {
  loading.value = true;
  try {
    const res = await getMedalItemList(listParams.value);
    if (!res.success) {
      message(res.message || "获取勋章列表失败", { type: "error" });
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
  fetchItems();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.status = "";
  queryState.typeId = "";
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

function onSelectionChange(rows: MedalItem[]): void {
  selectionIds.value = rows.map(r => r.id);
}

type ItemFormMode = "create" | "edit";

type ItemFormModel = {
  id?: number;
  typeId: number | "";
  name: string;
  code: string;
  description: string;
  status: Status;
};

const itemFormRules: FormRules<ItemFormModel> = {
  typeId: [{ required: true, message: "请选择类型", trigger: "change" }],
  name: [{ required: true, message: "请输入勋章名称", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
};

function openItemDialog(mode: ItemFormMode, row?: MedalItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<ItemFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    typeId: mode === "edit" ? (row?.typeId ?? "") : "",
    name: mode === "edit" ? (row?.name ?? "") : "",
    code: mode === "edit" ? (row?.code ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    status: mode === "edit" ? (row?.status ?? 1) : 1
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
          <el-form-item label="类型" prop="typeId">
            <el-select
              v-model={model.typeId}
              class="w-full"
              placeholder="请选择"
            >
              {typeOptions.value.map(t => (
                <el-option key={t.id} label={t.name} value={t.id} />
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
          <el-form-item label="标识" prop="code">
            <el-input
              v-model={model.code}
              placeholder="例如：first-upgrade（留空将自动使用名称）"
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
        const code = model.code.trim() || name;
        const description = model.description.trim();

        if (model.typeId === "") {
          message("请选择类型", { type: "warning" });
          closeLoading();
          return;
        }

        if (mode === "create") {
          const res = await createMedalItem({
            typeId: model.typeId,
            name,
            code,
            description,
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
          fetchItems();
          return;
        }

        if (!model.id) {
          message("勋章信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateMedalItem({
          id: model.id,
          typeId: model.typeId,
          name,
          code,
          description,
          status: model.status
        });
        if (!res.success) {
          message(res.message || "更新失败", { type: "error" });
          closeLoading();
          return;
        }
        message("更新成功", { type: "success" });
        done();
        fetchItems();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: MedalItem): Promise<void> {
  try {
    const res = await deleteMedalItem({ id: row.id });
    if (!res.success) {
      message(res.message || "删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchItems();
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  }
}

async function onBatchDelete(): Promise<void> {
  if (selectionIds.value.length === 0) {
    message("请选择要删除的勋章", { type: "warning" });
    return;
  }

  const deletingCount = selectionIds.value.length;
  const currentRows = tableData.value.length;

  const BatchDeleteContent = defineComponent({
    name: "MedalItemBatchDeleteContent",
    setup() {
      return () => (
        <div class="text-[14px] leading-6">
          确认删除选中的 {deletingCount} 枚勋章？
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
        const res = await batchDeleteMedalItems({ ids });
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
        fetchItems();
      } catch {
        closeLoading();
        message("网络异常，请稍后重试", { type: "error" });
      }
    }
  });
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
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="名称/标识/描述"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="queryState.typeId" clearable class="w-[180px]!">
            <el-option label="全部" value="" />
            <el-option
              v-for="t in typeOptions"
              :key="t.id"
              :label="t.name"
              :value="t.id"
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

    <PureTableBar class="mt-2" title="勋章列表" @refresh="fetchItems">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openItemDialog('create')">
            新增勋章
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
        <el-table-column prop="typeId" label="类型" min-width="140">
          <template #default="{ row }">
            <el-tag
              :style="{ borderColor: colors.primary, color: colors.primary }"
              effect="plain"
            >
              {{ typeLabelMap.get(row.typeId) || `#${row.typeId}` }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="标识" min-width="140" />
        <el-table-column
          prop="description"
          label="描述"
          min-width="260"
          show-overflow-tooltip
        />
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
          :page-sizes="[10, 20, 50]"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
