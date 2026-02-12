<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  createCarExpenseCategory,
  deleteCarExpenseCategory,
  getCarExpenseCategoryList,
  type CarExpenseCategory,
  updateCarExpenseCategory
} from "@/api/carExpense";

defineOptions({
  name: "CarExpenseCategories"
});

type EnabledFilter = "" | "true" | "false";

const queryState = reactive<{
  page: number;
  pageSize: number;
  nameKeyword: string;
  isEnabled: EnabledFilter;
}>({
  page: 1,
  pageSize: 10,
  nameKeyword: "",
  isEnabled: ""
});

const loading = ref(false);
const list = ref<CarExpenseCategory[]>([]);
const total = ref(0);

const tableData = computed((): CarExpenseCategory[] => list.value);

function toIsEnabledParam(v: EnabledFilter): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCarExpenseCategoryList({
      page: queryState.page,
      pageSize: queryState.pageSize,
      nameKeyword: queryState.nameKeyword.trim() || undefined,
      isEnabled: toIsEnabledParam(queryState.isEnabled)
    });
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchList();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.nameKeyword = "";
  queryState.isEnabled = "";
  fetchList();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchList();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchList();
}

type DialogMode = "create" | "edit";
const dialogVisible = ref(false);
const dialogMode = ref<DialogMode>("create");
const formRef = ref<FormInstance>();
const saving = ref(false);

const formModel = reactive<{
  categoryId: string;
  name: string;
  seq: number;
  isEnabled: boolean;
}>({
  categoryId: "",
  name: "",
  seq: 0,
  isEnabled: true
});

const rules: FormRules = {
  name: [{ required: true, message: "请输入分类名称", trigger: "blur" }]
};

function openCreate(): void {
  dialogMode.value = "create";
  formModel.categoryId = "";
  formModel.name = "";
  formModel.seq = 0;
  formModel.isEnabled = true;
  dialogVisible.value = true;
}

function openEdit(row: CarExpenseCategory): void {
  dialogMode.value = "edit";
  formModel.categoryId = row.categoryId;
  formModel.name = row.name;
  formModel.seq = row.seq;
  formModel.isEnabled = row.isEnabled;
  dialogVisible.value = true;
}

async function onSave(): Promise<void> {
  await formRef.value?.validate();
  saving.value = true;
  try {
    const payload = {
      name: formModel.name.trim(),
      seq: Number(formModel.seq),
      isEnabled: formModel.isEnabled
    };

    if (dialogMode.value === "create") {
      await createCarExpenseCategory(payload);
      dialogVisible.value = false;
      queryState.page = 1;
      fetchList();
      return;
    }

    await updateCarExpenseCategory({
      categoryId: formModel.categoryId,
      ...payload
    });
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function onToggleEnabled(row: CarExpenseCategory): Promise<void> {
  await updateCarExpenseCategory({
    categoryId: row.categoryId,
    isEnabled: !row.isEnabled
  });
  fetchList();
}

async function onDelete(row: CarExpenseCategory): Promise<void> {
  await deleteCarExpenseCategory({ categoryId: row.categoryId });
  if (queryState.page > 1 && tableData.value.length === 1) {
    queryState.page -= 1;
  }
  fetchList();
}

fetchList();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="分类名称">
          <el-input
            v-model="queryState.nameKeyword"
            clearable
            placeholder="例如：加油/停车/保养"
            class="w-[260px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryState.isEnabled"
            clearable
            class="w-[160px]!"
            @change="onSearch"
          >
            <el-option label="全部" value="" />
            <el-option label="启用" value="true" />
            <el-option label="禁用" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="费用分类" @refresh="fetchList">
      <template #buttons>
        <el-button type="primary" @click="openCreate">新增分类</el-button>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="categoryId"
        class="w-full"
      >
        <el-table-column prop="seq" label="排序" width="90" align="right" />
        <el-table-column prop="name" label="分类名称" min-width="220" />
        <el-table-column prop="categoryId" label="分类ID" min-width="160" />
        <el-table-column prop="isEnabled" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="220">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="openEdit(row)"
                >编辑</el-button
              >
              <el-button link type="primary" @click="onToggleEnabled(row)">
                {{ row.isEnabled ? "禁用" : "启用" }}
              </el-button>
              <el-popconfirm
                title="确认删除该分类？"
                confirm-button-text="删除"
                cancel-button-text="取消"
                @confirm="onDelete(row)"
              >
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="DEFAULT_PAGE_SIZES"
          :page-size="queryState.pageSize"
          :current-page="queryState.page"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增分类' : '编辑分类'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formModel" :rules="rules" label-width="90">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="formModel.name" clearable maxlength="50" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="formModel.seq"
            :min="0"
            :max="999999"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="formModel.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-space>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="onSave"
            >保存</el-button
          >
        </el-space>
      </template>
    </el-dialog>
  </div>
</template>
