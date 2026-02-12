<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES, isPageData } from "@/utils/table";
import {
  getCarExpenseCategoryListByUser,
  getCarIncomeCategoryListByUser,
  type CarExpenseCategory,
  type CarIncomeCategory
} from "@/api/carExpense";
import { getUserList, type UserItem } from "@/api/user";

defineOptions({
  name: "CarExpenseUserCategories"
});

type BillKind = "expense" | "income";
const billKind = ref<BillKind>("expense");
const isIncome = computed((): boolean => billKind.value === "income");
const tableTitle = computed((): string =>
  isIncome.value ? "用户收入分类" : "用户费用分类"
);

type EnabledFilter = "" | "true" | "false";

type SelectOption = { value: string; label: string };
const userOptions = ref<SelectOption[]>([]);
const userOptionsLoading = ref(false);

const queryState = reactive<{
  userId: string;
  page: number;
  pageSize: number;
  nameKeyword: string;
  isEnabled: EnabledFilter;
  includeHidden: boolean;
}>({
  userId: "",
  page: 1,
  pageSize: 10,
  nameKeyword: "",
  isEnabled: "",
  includeHidden: false
});

const loading = ref(false);
const list = ref<Array<CarExpenseCategory | CarIncomeCategory>>([]);
const total = ref(0);

const tableData = computed(
  (): Array<CarExpenseCategory | CarIncomeCategory> => list.value
);

function toIsEnabledParam(v: EnabledFilter): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

type CategoryType = "system" | "custom";

function resolveTypeLabel(type: CategoryType): string {
  return type === "system" ? "系统" : "自定义";
}

function resolveTypeTag(type: CategoryType): "success" | "info" {
  return type === "system" ? "success" : "info";
}

async function loadUserOptions(keyword = ""): Promise<void> {
  userOptionsLoading.value = true;
  try {
    const res = await getUserList({
      page: 1,
      pageSize: 50,
      keyword: keyword.trim() || undefined
    });
    const list: UserItem[] = isPageData<UserItem>(res) ? res.list : res;
    userOptions.value = list.map(user => ({
      value: user.userId,
      label: `${user.userId}（${user.username}）`
    }));
  } finally {
    userOptionsLoading.value = false;
  }
}

async function fetchList(): Promise<void> {
  if (!queryState.userId.trim()) {
    list.value = [];
    total.value = 0;
    return;
  }

  loading.value = true;
  try {
    const res = isIncome.value
      ? await getCarIncomeCategoryListByUser({
          userId: queryState.userId.trim(),
          page: queryState.page,
          pageSize: queryState.pageSize,
          nameKeyword: queryState.nameKeyword.trim() || undefined,
          isEnabled: toIsEnabledParam(queryState.isEnabled),
          includeHidden: queryState.includeHidden ? true : undefined
        })
      : await getCarExpenseCategoryListByUser({
          userId: queryState.userId.trim(),
          page: queryState.page,
          pageSize: queryState.pageSize,
          nameKeyword: queryState.nameKeyword.trim() || undefined,
          isEnabled: toIsEnabledParam(queryState.isEnabled),
          includeHidden: queryState.includeHidden ? true : undefined
        });
    list.value = res.list as Array<CarExpenseCategory | CarIncomeCategory>;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function onKindChange(): void {
  queryState.page = 1;
  fetchList();
}

function onSearch(): void {
  if (!queryState.userId.trim()) {
    message("请选择用户", { type: "warning" });
    return;
  }
  queryState.page = 1;
  fetchList();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.nameKeyword = "";
  queryState.isEnabled = "";
  queryState.includeHidden = false;
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

function onUserChange(): void {
  queryState.page = 1;
  fetchList();
}

void loadUserOptions();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="类型">
          <el-radio-group v-model="billKind" @change="onKindChange">
            <el-radio-button label="expense">支出</el-radio-button>
            <el-radio-button label="income">收入</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="用户">
          <el-select
            v-model="queryState.userId"
            filterable
            clearable
            remote
            :remote-method="loadUserOptions"
            :loading="userOptionsLoading"
            placeholder="输入用户ID/用户名"
            class="w-[320px]!"
            @change="onUserChange"
          >
            <el-option
              v-for="opt in userOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分类名称">
          <el-input
            v-model="queryState.nameKeyword"
            clearable
            placeholder="分类名称关键词"
            class="w-[220px]!"
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
        <el-form-item label="包含隐藏">
          <el-switch v-model="queryState.includeHidden" @change="onSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" :title="tableTitle" @refresh="fetchList">
      <el-table
        :data="tableData"
        :loading="loading"
        row-key="categoryId"
        class="w-full"
      >
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="categoryId" label="分类ID" min-width="160" />
        <el-table-column prop="categoryType" label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="resolveTypeTag(row.categoryType)">
              {{ resolveTypeLabel(row.categoryType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isHidden" label="隐藏" width="90">
          <template #default="{ row }">
            <span v-if="row.categoryType !== 'system'">--</span>
            <el-tag v-else-if="row.isHidden" type="warning" effect="plain">
              是
            </el-tag>
            <el-tag v-else type="success" effect="plain">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
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
  </div>
</template>
