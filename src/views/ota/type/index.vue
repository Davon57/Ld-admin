<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  type OtaTypeItem,
  type Status,
  type OtaTypeListParams,
  getOtaTypeList,
  createOtaType,
  updateOtaType,
  deleteOtaType,
  batchDeleteOtaTypes
} from "@/api/ota";

defineOptions({
  name: "OtaType"
});

type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

const queryState = reactive<
  Required<Pick<OtaTypeListParams, "page" | "pageSize">> & {
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
const tableData = ref<OtaTypeItem[]>([]);
const total = ref(0);
const selectionIds = ref<number[]>([]);

const listParams = computed((): OtaTypeListParams => {
  const params: OtaTypeListParams = {
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
    const res = await getOtaTypeList(listParams.value);
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

function onSelectionChange(rows: OtaTypeItem[]): void {
  selectionIds.value = rows.map(r => r.id);
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

function openTypeDialog(mode: TypeFormMode, row?: OtaTypeItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<TypeFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    name: mode === "edit" ? (row?.name ?? "") : "",
    code: mode === "edit" ? (row?.code ?? "") : "",
    status: mode === "edit" ? (row?.status ?? 1) : 1
  });

  const TypeFormDialog = defineComponent({
    name: "OtaTypeFormDialog",
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
              placeholder="例如：稳定版"
              clearable
            />
          </el-form-item>
          <el-form-item label="标识" prop="code">
            <el-input
              v-model={model.code}
              placeholder="例如：stable（留空将自动使用名称）"
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
          const res = await createOtaType({
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

        const res = await updateOtaType({
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

async function onDeleteRow(row: OtaTypeItem): Promise<void> {
  try {
    const res = await deleteOtaType({ id: row.id });
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
    name: "OtaTypeBatchDeleteContent",
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
        const res = await batchDeleteOtaTypes({ ids });
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
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="code" label="标识" min-width="160" />
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
          :page-sizes="[10, 20, 50]"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
