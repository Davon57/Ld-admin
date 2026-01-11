<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES, exportToCsv, type CsvColumn } from "@/utils/table";
import {
  type TagItem,
  type Status,
  type TagListParams,
  getTagList,
  createTag,
  updateTag,
  deleteTag,
  batchDeleteTags
} from "@/api/article";

defineOptions({
  name: "ArticleTag"
});

type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

const queryState = reactive<
  Required<Pick<TagListParams, "page" | "pageSize">> & {
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
const tableData = ref<TagItem[]>([]);
const total = ref(0);
const selectionIds = ref<number[]>([]);

const exporting = ref(false);

const exportColumns: CsvColumn<TagItem>[] = [
  { label: "名称", key: "name" },
  { label: "Slug", key: "slug" },
  {
    label: "状态",
    key: "status",
    format: (_value, row) => (row.status === 1 ? "启用" : "禁用")
  },
  { label: "创建时间", key: "createdAt" }
];

const listParams = computed((): TagListParams => {
  const params: TagListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.status !== "") params.status = queryState.status;
  return params;
});

async function fetchTags(): Promise<void> {
  loading.value = true;
  try {
    const res = await getTagList(listParams.value);
    if (!res.success) {
      message(res.message || "获取标签列表失败", { type: "error" });
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
  fetchTags();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.status = "";
  fetchTags();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchTags();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchTags();
}

function onSelectionChange(rows: TagItem[]): void {
  selectionIds.value = rows.map(r => r.id);
}

async function onExportList(): Promise<void> {
  if (total.value === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    const res = await getTagList({
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
    exportToCsv(res.data.list, exportColumns, "标签列表");
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type TagFormMode = "create" | "edit";

type TagFormModel = {
  id?: number;
  name: string;
  slug: string;
  status: Status;
};

const tagFormRules: FormRules<TagFormModel> = {
  name: [{ required: true, message: "请输入标签名称", trigger: "blur" }],
  slug: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback(new Error("请输入 slug"));
        const ok = /^[a-z0-9-]+$/.test(value);
        return ok
          ? callback()
          : callback(new Error("slug 仅支持小写字母/数字/连字符"));
      },
      trigger: "blur"
    }
  ],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
};

function openTagDialog(mode: TagFormMode, row?: TagItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<TagFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    name: mode === "edit" ? (row?.name ?? "") : "",
    slug: mode === "edit" ? (row?.slug ?? "") : "",
    status: mode === "edit" ? (row?.status ?? 1) : 1
  });

  const TagFormDialog = defineComponent({
    name: "TagFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={tagFormRules}
          label-width="90px"
        >
          <el-form-item label="名称" prop="name">
            <el-input
              v-model={model.name}
              placeholder="请输入标签名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="Slug" prop="slug">
            <el-input
              v-model={model.slug}
              placeholder="如：frontend"
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
    title: mode === "create" ? "新增标签" : "编辑标签",
    width: "520px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(TagFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        if (mode === "create") {
          const res = await createTag({
            name: model.name.trim(),
            slug: model.slug.trim(),
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
          fetchTags();
          return;
        }

        if (!model.id) {
          message("标签信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateTag({
          id: model.id,
          name: model.name.trim(),
          slug: model.slug.trim(),
          status: model.status
        });
        if (!res.success) {
          message(res.message || "更新失败", { type: "error" });
          closeLoading();
          return;
        }
        message("更新成功", { type: "success" });
        done();
        fetchTags();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: TagItem): Promise<void> {
  try {
    const res = await deleteTag({ id: row.id });
    if (!res.success) {
      message(res.message || "删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchTags();
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  }
}

async function onBatchDelete(): Promise<void> {
  if (selectionIds.value.length === 0) {
    message("请选择要删除的标签", { type: "warning" });
    return;
  }

  const deletingCount = selectionIds.value.length;
  const currentRows = tableData.value.length;

  const BatchDeleteContent = defineComponent({
    name: "BatchDeleteContent",
    setup() {
      return () => (
        <div class="text-[14px] leading-6">
          确认删除选中的 {deletingCount} 个标签？
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
        const res = await batchDeleteTags({ ids });
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
        fetchTags();
      } catch {
        closeLoading();
        message("网络异常，请稍后重试", { type: "error" });
      }
    }
  });
}

fetchTags();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="名称/slug"
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

    <PureTableBar class="mt-2" title="标签列表" @refresh="fetchTags">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openTagDialog('create')">
            新增标签
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
        <el-table-column prop="slug" label="Slug" min-width="160" />
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
                @click="openTagDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该标签？"
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
