<script setup lang="ts">
import { computed, reactive, ref, onMounted } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  createCarExpenseRecord,
  createCarIncomeRecord,
  deleteCarExpenseRecord,
  deleteCarIncomeRecord,
  getCarExpenseCategoryList,
  getCarIncomeCategoryList,
  getCarExpenseRecordList,
  getCarIncomeRecordList,
  type CarExpenseCategory,
  type CarExpenseRecord,
  type CarIncomeCategory,
  type CarIncomeRecord,
  updateCarExpenseRecord,
  updateCarIncomeRecord
} from "@/api/carExpense";

defineOptions({
  name: "CarExpenseRecords"
});

type BillKind = "expense" | "income";
const billKind = ref<BillKind>("expense");

const isIncome = computed((): boolean => billKind.value === "income");
const tableTitle = computed((): string =>
  isIncome.value ? "收入记账" : "支出记账"
);
const createButtonText = computed((): string =>
  isIncome.value ? "新增收入" : "新增支出"
);
const dialogTitle = computed((): string => {
  const prefix = isIncome.value ? "收入" : "支出";
  return dialogMode.value === "create"
    ? `新增${prefix}记账`
    : `编辑${prefix}记账`;
});

const categories = ref<Array<CarExpenseCategory | CarIncomeCategory>>([]);
const categoryMap = computed((): Record<string, string> => {
  return categories.value.reduce<Record<string, string>>((acc, cur) => {
    acc[cur.categoryId] = cur.name;
    return acc;
  }, {});
});

const queryState = reactive<{
  page: number;
  pageSize: number;
  month: string;
  categoryId: string;
  keyword: string;
}>({
  page: 1,
  pageSize: 10,
  month: "",
  categoryId: "",
  keyword: ""
});

const loading = ref(false);
const list = ref<Array<CarExpenseRecord | CarIncomeRecord>>([]);
const total = ref(0);

const tableData = computed(
  (): Array<CarExpenseRecord | CarIncomeRecord> => list.value
);

async function fetchCategories(): Promise<void> {
  const res = isIncome.value
    ? await getCarIncomeCategoryList({
        page: 1,
        pageSize: 1000,
        isEnabled: true
      })
    : await getCarExpenseCategoryList({
        page: 1,
        pageSize: 1000,
        isEnabled: true
      });
  categories.value = res.list as Array<CarExpenseCategory | CarIncomeCategory>;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = isIncome.value
      ? await getCarIncomeRecordList({
          page: queryState.page,
          pageSize: queryState.pageSize,
          month: queryState.month || undefined,
          categoryId: queryState.categoryId || undefined,
          keyword: queryState.keyword.trim() || undefined
        })
      : await getCarExpenseRecordList({
          page: queryState.page,
          pageSize: queryState.pageSize,
          month: queryState.month || undefined,
          categoryId: queryState.categoryId || undefined,
          keyword: queryState.keyword.trim() || undefined
        });
    list.value = res.list as Array<CarExpenseRecord | CarIncomeRecord>;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function onKindChange(): void {
  queryState.page = 1;
  queryState.categoryId = "";
  fetchCategories().finally(() => {
    fetchList();
  });
}

function onSearch(): void {
  queryState.page = 1;
  fetchList();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.month = "";
  queryState.categoryId = "";
  queryState.keyword = "";
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

function categoryNameOf(categoryId: string): string {
  return categoryMap.value[categoryId] ?? categoryId;
}

type DialogMode = "create" | "edit";
const dialogVisible = ref(false);
const dialogMode = ref<DialogMode>("create");
const saving = ref(false);
const formRef = ref<FormInstance>();

const formModel = reactive<{
  recordId: string;
  date: string;
  categoryId: string;
  amount: number;
  remark: string;
}>({
  recordId: "",
  date: "",
  categoryId: "",
  amount: 0,
  remark: ""
});

const rules: FormRules = {
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  categoryId: [{ required: true, message: "请选择分类", trigger: "change" }],
  amount: [{ required: true, message: "请输入金额", trigger: "blur" }]
};

function openCreate(): void {
  dialogMode.value = "create";
  formModel.recordId = "";
  formModel.date = "";
  formModel.categoryId = "";
  formModel.amount = 0;
  formModel.remark = "";
  dialogVisible.value = true;
}

function openEdit(row: CarExpenseRecord | CarIncomeRecord): void {
  dialogMode.value = "edit";
  formModel.recordId = row.recordId;
  formModel.date = row.date;
  formModel.categoryId = row.categoryId;
  formModel.amount = row.amount;
  formModel.remark = row.remark ?? "";
  dialogVisible.value = true;
}

async function onSave(): Promise<void> {
  await formRef.value?.validate();
  saving.value = true;
  try {
    const payload = {
      date: formModel.date,
      categoryId: formModel.categoryId,
      amount: Number(formModel.amount),
      remark: formModel.remark.trim() || null
    };

    if (dialogMode.value === "create") {
      if (isIncome.value) {
        await createCarIncomeRecord(payload);
      } else {
        await createCarExpenseRecord(payload);
      }
      dialogVisible.value = false;
      queryState.page = 1;
      fetchList();
      return;
    }

    if (isIncome.value) {
      await updateCarIncomeRecord({
        recordId: formModel.recordId,
        ...payload
      });
    } else {
      await updateCarExpenseRecord({
        recordId: formModel.recordId,
        ...payload
      });
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function onDelete(
  row: CarExpenseRecord | CarIncomeRecord
): Promise<void> {
  if (isIncome.value) {
    await deleteCarIncomeRecord({ recordId: row.recordId });
  } else {
    await deleteCarExpenseRecord({ recordId: row.recordId });
  }
  if (queryState.page > 1 && tableData.value.length === 1) {
    queryState.page -= 1;
  }
  fetchList();
}

onMounted(() => {
  fetchCategories().finally(() => {
    fetchList();
  });
});
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
        <el-form-item label="月份">
          <el-date-picker
            v-model="queryState.month"
            type="month"
            value-format="YYYY-MM"
            placeholder="选择月份"
            class="w-[160px]!"
            @change="onSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="queryState.categoryId"
            clearable
            class="w-[180px]!"
            @change="onSearch"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="c in categories"
              :key="c.categoryId"
              :label="c.name"
              :value="c.categoryId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            clearable
            placeholder="备注关键词"
            class="w-[260px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" :title="tableTitle" @refresh="fetchList">
      <template #buttons>
        <el-button type="primary" @click="openCreate">{{
          createButtonText
        }}</el-button>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="recordId"
        class="w-full"
      >
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column label="分类" min-width="160">
          <template #default="{ row }">
            {{ categoryNameOf(row.categoryId) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="amount"
          label="金额(元)"
          width="120"
          align="right"
        />
        <el-table-column
          prop="remark"
          label="备注"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="180">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="openEdit(row)"
                >编辑</el-button
              >
              <el-popconfirm
                title="确认删除该记账？"
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
      :title="dialogTitle"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formModel" :rules="rules" label-width="90">
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="formModel.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="formModel.categoryId" filterable class="w-full">
            <el-option
              v-for="c in categories"
              :key="c.categoryId"
              :label="c.name"
              :value="c.categoryId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="formModel.amount"
            :min="0"
            :max="999999999"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formModel.remark"
            type="textarea"
            :rows="3"
            maxlength="500"
            resize="vertical"
          />
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
