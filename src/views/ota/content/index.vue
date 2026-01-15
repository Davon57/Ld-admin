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
  type OtaContentItem,
  type OtaTypeItem,
  type Status,
  type OtaContentListParams,
  getOtaContentList,
  createOtaContent,
  updateOtaContent,
  deleteOtaContent,
  batchDeleteOtaContents,
  getOtaTypeList
} from "@/api/ota";

defineOptions({
  name: "OtaContent"
});

type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

const queryState = reactive<
  Required<Pick<OtaContentListParams, "page" | "pageSize">> & {
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
const tableData = ref<OtaContentItem[]>([]);
const total = ref(0);
const selectionIds = ref<number[]>([]);

const exporting = ref(false);

const exportColumns: CsvColumn<OtaContentItem>[] = [
  {
    label: "类型",
    key: "typeId",
    format: (_value, row) => getTypeName(row.typeId)
  },
  { label: "版本", key: "version" },
  { label: "标题", key: "title" },
  { label: "适用车型", key: "vehicleModelVersion" },
  { label: "包大小", key: "packageSize" },
  { label: "发布日期", key: "releaseAt" },
  {
    label: "状态",
    key: "status",
    format: (_value, row) => (row.status === 1 ? "启用" : "禁用")
  },
  { label: "创建时间", key: "createdAt" }
];

const typeOptions = ref<OtaTypeItem[]>([]);

const typeNameMap = computed((): Map<number, string> => {
  return new Map(typeOptions.value.map(t => [t.id, t.name]));
});

function getTypeName(typeId: number): string {
  return typeNameMap.value.get(typeId) ?? String(typeId);
}

const listParams = computed((): OtaContentListParams => {
  const params: OtaContentListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.status !== "") params.status = queryState.status;
  if (queryState.typeId !== "") params.typeId = queryState.typeId;
  return params;
});

async function fetchTypeOptions(): Promise<void> {
  try {
    const res = await getOtaTypeList({ page: 1, pageSize: 100, status: 1 });
    typeOptions.value = res.list;
  } catch {
    typeOptions.value = [];
  }
}

async function fetchContents(): Promise<void> {
  loading.value = true;
  try {
    const res = await getOtaContentList(listParams.value);
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
  fetchContents();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.status = "";
  queryState.typeId = "";
  fetchContents();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchContents();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchContents();
}

function onSelectionChange(rows: OtaContentItem[]): void {
  selectionIds.value = rows.map(r => r.id);
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "内容列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type ContentFormMode = "create" | "edit";

type ContentFormModel = {
  id?: number;
  typeId: "" | number;
  version: string;
  title: string;
  vehicleModelVersion: string;
  packageSize: string;
  releaseAt: string;
  status: Status;
  content: string;
};

const contentFormRules: FormRules<ContentFormModel> = {
  typeId: [{ required: true, message: "请选择类型", trigger: "change" }],
  version: [{ required: true, message: "请输入版本号", trigger: "blur" }],
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  vehicleModelVersion: [
    { required: true, message: "请输入适用车型版本", trigger: "blur" }
  ],
  packageSize: [{ required: true, message: "请输入包大小", trigger: "blur" }],
  releaseAt: [{ required: true, message: "请选择发布日期", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
  content: [{ required: true, message: "请输入内容", trigger: "blur" }]
};

function openContentDialog(mode: ContentFormMode, row?: OtaContentItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<ContentFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    typeId: mode === "edit" ? (row?.typeId ?? "") : "",
    version: mode === "edit" ? (row?.version ?? "") : "",
    title: mode === "edit" ? (row?.title ?? "") : "",
    vehicleModelVersion:
      mode === "edit" ? (row?.vehicleModelVersion ?? "") : "",
    packageSize: mode === "edit" ? (row?.packageSize ?? "") : "",
    releaseAt: mode === "edit" ? (row?.releaseAt ?? "") : "",
    status: mode === "edit" ? (row?.status ?? 1) : 1,
    content: mode === "edit" ? (row?.content ?? "") : ""
  });

  const ContentFormDialog = defineComponent({
    name: "OtaContentFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={contentFormRules}
          label-width="90px"
        >
          <el-form-item label="类型" prop="typeId">
            <el-select
              v-model={model.typeId}
              placeholder="请选择类型"
              clearable
              class="w-full"
            >
              {typeOptions.value.map(t => (
                <el-option key={t.id} label={t.name} value={t.id} />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="版本号" prop="version">
            <el-input
              v-model={model.version}
              placeholder="例如：V1.3.0"
              clearable
            />
          </el-form-item>
          <el-form-item label="标题" prop="title">
            <el-input
              v-model={model.title}
              placeholder="请输入标题"
              clearable
            />
          </el-form-item>
          <el-form-item label="适用车型" prop="vehicleModelVersion">
            <el-input
              v-model={model.vehicleModelVersion}
              placeholder="例如：S1 2025.1 / A2 2024.12"
              clearable
            />
          </el-form-item>
          <el-form-item label="包大小" prop="packageSize">
            <el-input
              v-model={model.packageSize}
              placeholder="例如：1.2 GB"
              clearable
            />
          </el-form-item>
          <el-form-item label="发布日期" prop="releaseAt">
            <el-date-picker
              v-model={model.releaseAt}
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择发布日期"
              class="w-full"
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
          <el-form-item label="内容" prop="content">
            <el-input
              v-model={model.content}
              type="textarea"
              rows={10}
              placeholder="请输入更新内容"
              resize="vertical"
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增内容" : "编辑内容",
    width: "760px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(ContentFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        if (typeof model.typeId !== "number") {
          message("请选择类型", { type: "warning" });
          closeLoading();
          return;
        }

        const payload = {
          typeId: model.typeId,
          version: model.version.trim(),
          title: model.title.trim(),
          vehicleModelVersion: model.vehicleModelVersion.trim(),
          packageSize: model.packageSize.trim(),
          releaseAt: model.releaseAt.trim(),
          status: model.status,
          content: model.content.trim()
        };

        if (mode === "create") {
          await createOtaContent(payload);
          done();
          queryState.page = 1;
          fetchContents();
          return;
        }

        if (!model.id) {
          message("内容信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateOtaContent({ id: model.id, ...payload });
        done();
        fetchContents();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: OtaContentItem): Promise<void> {
  try {
    await deleteOtaContent({ id: row.id });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchContents();
  } catch {}
}

async function onBatchDelete(): Promise<void> {
  if (selectionIds.value.length === 0) {
    message("请选择要删除的内容", { type: "warning" });
    return;
  }

  const deletingCount = selectionIds.value.length;
  const currentRows = tableData.value.length;

  const BatchDeleteContent = defineComponent({
    name: "OtaContentBatchDeleteContent",
    setup() {
      return () => (
        <div class="text-[14px] leading-6">
          确认删除选中的 {deletingCount} 条内容？
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
        await batchDeleteOtaContents({ ids });
        done();
        if (queryState.page > 1 && deletingCount >= currentRows) {
          queryState.page -= 1;
        }
        selectionIds.value = [];
        fetchContents();
      } catch {
        closeLoading();
      }
    }
  });
}

fetchTypeOptions();
fetchContents();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
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
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="版本/标题/内容"
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

    <PureTableBar class="mt-2" title="内容列表" @refresh="fetchContents">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openContentDialog('create')">
            新增内容
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
        <el-table-column label="类型" min-width="140">
          <template #default="{ row }">
            {{ getTypeName(row.typeId) }}
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" min-width="140" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column
          prop="vehicleModelVersion"
          label="适用车型"
          min-width="160"
        />
        <el-table-column prop="packageSize" label="包大小" width="110" />
        <el-table-column prop="releaseAt" label="发布日期" width="120" />
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
                @click="openContentDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该内容？"
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
