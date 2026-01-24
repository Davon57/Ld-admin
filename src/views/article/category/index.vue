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
  type CategoryItem,
  type CategoryListParams,
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory
} from "@/api/article";

defineOptions({
  name: "ArticleCategory"
});

const queryState = reactive<
  Required<Pick<CategoryListParams, "page" | "pageSize">> & {
    nameKeyword: string;
    isEnabled: "" | boolean;
  }
>({
  page: 1,
  pageSize: 10,
  nameKeyword: "",
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<CategoryItem[]>([]);
const total = ref(0);

const exporting = ref(false);

const initing = ref(false);

const presetCategories = [
  { name: "教程", description: "", seq: 0, isEnabled: true },
  { name: "改装", description: "", seq: 1, isEnabled: true },
  { name: "保养", description: "", seq: 2, isEnabled: true },
  { name: "原理", description: "", seq: 3, isEnabled: true }
] as const;

const exportColumns: CsvColumn<CategoryItem>[] = [
  { label: "分类编码", key: "articleCategoryId" },
  { label: "名称", key: "name" },
  { label: "描述", key: "description" },
  { label: "排序", key: "seq" },
  {
    label: "启用状态",
    key: "isEnabled",
    format: (_value, row) => (row.isEnabled ? "启用" : "禁用")
  },
  { label: "更新时间", key: "updatedAt" }
];

const listParams = computed((): CategoryListParams => {
  const params: CategoryListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const nameKeyword = queryState.nameKeyword.trim();
  if (nameKeyword) params.nameKeyword = nameKeyword;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchCategories(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCategoryList(listParams.value);
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
  fetchCategories();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.nameKeyword = "";
  queryState.isEnabled = "";
  fetchCategories();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchCategories();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchCategories();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "分类列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

async function onInitCategories(): Promise<void> {
  if (initing.value) return;
  initing.value = true;
  try {
    const existingNames = new Set(
      tableData.value.map(v => v.name.trim()).filter(Boolean)
    );
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const c of presetCategories) {
      if (existingNames.has(c.name)) {
        skipped += 1;
        continue;
      }
      try {
        await createCategory(c, { showSuccessMessage: false });
        created += 1;
      } catch {
        failed += 1;
      }
    }

    queryState.page = 1;
    await fetchCategories();
    message(`初始化完成：新增${created}，跳过${skipped}，失败${failed}`, {
      type: failed > 0 ? "warning" : "success"
    });
  } finally {
    initing.value = false;
  }
}

type CategoryFormMode = "create" | "edit";

type CategoryFormModel = {
  name: string;
  description: string;
  seq: number;
  isEnabled: boolean;
};

const categoryFormRules: FormRules<CategoryFormModel> = {
  name: [{ required: true, message: "请输入分类名称", trigger: "blur" }],
  seq: [{ required: true, message: "请输入排序值", trigger: "change" }]
};

function openCategoryDialog(mode: CategoryFormMode, row?: CategoryItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<CategoryFormModel>({
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    seq: mode === "edit" ? (row?.seq ?? 0) : 0,
    isEnabled: mode === "edit" ? (row?.isEnabled ?? true) : true
  });

  const CategoryFormDialog = defineComponent({
    name: "CategoryFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={categoryFormRules}
          label-width="90px"
        >
          <el-form-item label="名称" prop="name">
            <el-input
              v-model={model.name}
              placeholder="请输入分类名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model={model.description}
              type="textarea"
              autosize={{ minRows: 2, maxRows: 4 }}
              placeholder="可选"
              maxlength={200}
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="排序" prop="seq">
            <el-input-number
              v-model={model.seq}
              min={0}
              step={1}
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model={model.isEnabled} />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增分类" : "编辑分类",
    width: "520px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(CategoryFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        if (mode === "create") {
          const res = await createCategory({
            name: model.name.trim(),
            description: model.description.trim(),
            seq: model.seq,
            isEnabled: model.isEnabled
          });
          void res;
          done();
          queryState.page = 1;
          fetchCategories();
          return;
        }

        if (!row?.articleCategoryId) {
          message("分类信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateCategory({
          articleCategoryId: row.articleCategoryId,
          name: model.name.trim(),
          description: model.description.trim(),
          seq: model.seq,
          isEnabled: model.isEnabled
        });
        void res;
        done();
        fetchCategories();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: CategoryItem): Promise<void> {
  try {
    const res = await deleteCategory({
      articleCategoryId: row.articleCategoryId
    });
    void res;
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchCategories();
  } catch {}
}

fetchCategories();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.nameKeyword"
            placeholder="分类名称"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="启用">
          <el-select
            v-model="queryState.isEnabled"
            clearable
            class="w-[160px]!"
          >
            <el-option label="全部" value="" />
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="分类列表" @refresh="fetchCategories">
      <template #buttons>
        <el-space wrap>
          <el-popconfirm
            title="确认初始化分类？将创建：教程、改装、保养、原理"
            confirm-button-text="初始化"
            confirm-button-type="warning"
            cancel-button-text="取消"
            @confirm="onInitCategories"
          >
            <template #reference>
              <el-button
                type="warning"
                plain
                :loading="initing"
                :disabled="loading || initing"
              >
                初始化
              </el-button>
            </template>
          </el-popconfirm>
          <el-button type="primary" @click="openCategoryDialog('create')">
            新增分类
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
        row-key="articleCategoryId"
        class="w-full"
      >
        <el-table-column
          prop="articleCategoryId"
          label="编码"
          min-width="160"
        />
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="description" label="描述" min-width="260" />
        <el-table-column prop="seq" label="排序" width="90" />
        <el-table-column prop="isEnabled" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openCategoryDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该分类？"
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
