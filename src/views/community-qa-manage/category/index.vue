<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  type CommunityQaCategory,
  type CommunityQaCategoryListParams,
  getCommunityQaCategoryList,
  createCommunityQaCategory,
  updateCommunityQaCategory,
  deleteCommunityQaCategory
} from "@/api/communityQaManage";

defineOptions({
  name: "CommunityQaManageCategory"
});

const COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const queryState = reactive<
  Required<Pick<CommunityQaCategoryListParams, "page" | "pageSize">> & {
    communityQaCategoryId: string;
    nameKeyword: string;
    isEnabled: "" | boolean;
  }
>({
  page: 1,
  pageSize: 10,
  communityQaCategoryId: "",
  nameKeyword: "",
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<CommunityQaCategory[]>([]);
const total = ref(0);

const listParams = computed((): CommunityQaCategoryListParams => {
  const params: CommunityQaCategoryListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };

  const id = queryState.communityQaCategoryId.trim();
  if (id) params.communityQaCategoryId = id;

  const nameKeyword = queryState.nameKeyword.trim();
  if (nameKeyword) params.nameKeyword = nameKeyword;

  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchCategories(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCommunityQaCategoryList(listParams.value);
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
  queryState.communityQaCategoryId = "";
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

type CategoryFormMode = "create" | "edit";

type CategoryFormModel = {
  name: string;
  description: string;
  color: string;
  isEnabled: boolean;
};

const categoryFormRules: FormRules<CategoryFormModel> = {
  name: [{ required: true, message: "请输入分类名称", trigger: "blur" }],
  color: [
    { required: true, message: "请输入代表颜色", trigger: ["blur", "change"] },
    {
      validator: (_rule, value: unknown, cb) => {
        const v = typeof value === "string" ? value.trim() : "";
        if (!v) {
          cb();
          return;
        }
        if (!COLOR_RE.test(v)) {
          cb(new Error("颜色格式不正确，请输入 #RRGGBB 或 #RRGGBBAA"));
          return;
        }
        cb();
      },
      trigger: ["blur", "change"]
    }
  ]
};

function openCategoryDialog(
  mode: CategoryFormMode,
  row?: CommunityQaCategory
): void {
  const formRef = ref<FormInstance>();
  const model = reactive<CategoryFormModel>({
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    color: mode === "edit" ? (row?.color ?? "") : "#00B894",
    isEnabled: mode === "edit" ? Boolean(row?.isEnabled) : true
  });

  const CategoryFormDialog = defineComponent({
    name: "CommunityQaManageCategoryFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      const predefineColors = [
        "#00B894",
        "#00CEC9",
        "#0984E3",
        "#74B9FF",
        "#6C5CE7",
        "#A29BFE",
        "#E84393",
        "#FD79A8",
        "#D63031",
        "#E17055",
        "#FDCB6E",
        "#2D3436"
      ];

      const previewColor = computed(() => {
        const c = normalizeColor(model.color).trim();
        return COLOR_RE.test(c) ? c : "transparent";
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={categoryFormRules}
          label-width="100px"
        >
          <el-form-item label="名称" prop="name">
            <el-input
              v-model={model.name}
              clearable
              placeholder="例如：续航与能耗"
            />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model={model.description}
              type="textarea"
              autosize={{ minRows: 2, maxRows: 4 }}
              maxlength={5000}
              show-word-limit
              placeholder="可选"
            />
          </el-form-item>
          <el-form-item label="代表颜色" prop="color">
            <div class="flex items-center gap-3 w-full">
              <el-input
                v-model={model.color}
                clearable
                placeholder="#00B894"
                onBlur={() => {
                  model.color = normalizeColor(model.color);
                }}
              />
              <el-color-picker
                v-model={model.color}
                showAlpha
                colorFormat="hex"
                predefine={predefineColors}
              />
              <div
                class="h-8 w-8 rounded border"
                style={{
                  backgroundColor: previewColor.value,
                  borderColor: "var(--el-border-color)"
                }}
              />
            </div>
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model={model.isEnabled} />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增QA分类" : "编辑QA分类",
    width: "560px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(CategoryFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const payload = {
          name: model.name.trim(),
          description: model.description.trim(),
          color: normalizeColor(model.color).trim(),
          isEnabled: model.isEnabled
        };

        if (!COLOR_RE.test(payload.color)) {
          message("颜色格式不正确，请输入 #RRGGBB 或 #RRGGBBAA", {
            type: "warning"
          });
          closeLoading();
          return;
        }

        if (mode === "create") {
          await createCommunityQaCategory(payload);
          done();
          queryState.page = 1;
          fetchCategories();
          return;
        }

        if (!row?.communityQaCategoryId) {
          message("分类信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateCommunityQaCategory({
          communityQaCategoryId: row.communityQaCategoryId,
          ...payload
        });
        done();
        fetchCategories();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: CommunityQaCategory): Promise<void> {
  try {
    await deleteCommunityQaCategory({
      communityQaCategoryId: row.communityQaCategoryId
    });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchCategories();
  } catch {}
}

function normalizeColor(input: string): string {
  const v = (input ?? "").trim();
  if (!v) return "";
  if (!v.startsWith("#")) return `#${v}`;
  return v;
}

fetchCategories();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="分类ID">
          <el-input
            v-model="queryState.communityQaCategoryId"
            placeholder="LD0000ABCD"
            clearable
            class="w-[220px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.nameKeyword"
            placeholder="分类名称"
            clearable
            class="w-[220px]!"
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

    <PureTableBar class="mt-2" title="QA分类" @refresh="fetchCategories">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openCategoryDialog('create')">
            新增分类
          </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="communityQaCategoryId"
        class="w-full"
      >
        <el-table-column
          prop="communityQaCategoryId"
          label="分类ID"
          min-width="160"
        />
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="description" label="描述" min-width="260" />
        <el-table-column label="颜色" width="140">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-3 w-3 rounded border"
                :style="{
                  backgroundColor: normalizeColor(row.color) || 'transparent',
                  borderColor: 'var(--el-border-color)'
                }"
              />
              <span class="text-[13px]">{{ row.color }}</span>
            </div>
          </template>
        </el-table-column>
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
