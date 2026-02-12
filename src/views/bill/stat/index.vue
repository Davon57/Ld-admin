<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import {
  getBillLogs,
  type BillLogAction,
  type BillLogItem
} from "@/api/carExpense";

defineOptions({
  name: "BillLogs"
});

const actionOptions: Array<{ label: string; value: "" | BillLogAction }> = [
  { label: "全部", value: "" },
  { label: "新增", value: "create" },
  { label: "修改", value: "update" },
  { label: "删除", value: "delete" }
];

const BILL_LOG_PAGE_SIZES = [10, 20, 50, 100, 1000];

const queryState = reactive<{
  page: number;
  pageSize: number;
  userId: string;
  month: string;
  action: "" | BillLogAction;
}>({
  page: 1,
  pageSize: 10,
  userId: "",
  month: "",
  action: ""
});

const loading = ref(false);
const tableData = ref<BillLogItem[]>([]);
const total = ref(0);

const listParams = computed(
  (): {
    page: number;
    pageSize: number;
    userId?: string;
    month?: string;
    action?: BillLogAction;
  } => {
    const params: {
      page: number;
      pageSize: number;
      userId?: string;
      month?: string;
      action?: BillLogAction;
    } = {
      page: queryState.page,
      pageSize: queryState.pageSize
    };

    const userId = queryState.userId.trim();
    const month = queryState.month.trim();
    const action = queryState.action;

    if (userId) params.userId = userId;
    if (month) params.month = month;
    if (action) params.action = action;
    return params;
  }
);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await getBillLogs(listParams.value);
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
  fetchList();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.userId = "";
  queryState.month = "";
  queryState.action = "";
  fetchList();
}

function onSizeChange(size: number): void {
  queryState.pageSize = Math.min(Math.max(1, size), 1000);
  queryState.page = 1;
  fetchList();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchList();
}

function formatAction(action: BillLogAction): string {
  if (action === "create") return "新增";
  if (action === "update") return "修改";
  return "删除";
}

function formatRecordType(recordType: BillLogItem["recordType"]): string {
  if (recordType === "income") return "收入";
  if (recordType === "expense") return "支出";
  return String(recordType);
}

function formatAmount(v: number): string {
  return Number(v).toFixed(2);
}

function formatUserLabel(
  userId: string,
  username: string,
  nickname: string
): string {
  const u = username?.trim();
  const n = nickname?.trim();
  if (u) return n ? `${u}（${n}）` : u;
  return userId;
}

function formatUserDisplay(
  userId: string,
  username: string,
  nickname: string
): string {
  const label = formatUserLabel(userId, username, nickname);
  if (label !== userId) return `${label}（${userId}）`;
  return userId;
}

function formatCategoryName(categoryId: string, categoryName: string): string {
  const name = categoryName?.trim();
  return name ? name : categoryId;
}

function formatCategoryDisplay(
  categoryId: string,
  categoryName: string
): string {
  const name = formatCategoryName(categoryId, categoryName);
  if (name !== categoryId) return `${name}（${categoryId}）`;
  return categoryId;
}

function resolveChangedFieldLabel(field: string): string {
  const map: Record<string, string> = {
    date: "日期",
    billDate: "日期",
    categoryId: "分类",
    amount: "金额",
    remark: "备注"
  };
  return map[field] ?? field;
}

function toPrettyJson(value: unknown): string {
  if (value == null) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const snapshotVisible = ref(false);
const snapshotRow = ref<BillLogItem | null>(null);

const beforeSnapshotText = computed((): string =>
  toPrettyJson(snapshotRow.value?.beforeSnapshot ?? null)
);
const afterSnapshotText = computed((): string =>
  toPrettyJson(snapshotRow.value?.afterSnapshot ?? null)
);

function openSnapshot(row: BillLogItem): void {
  snapshotRow.value = row;
  snapshotVisible.value = true;
}

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="用户">
          <el-input
            v-model="queryState.userId"
            class="w-[240px]!"
            clearable
            placeholder="输入用户ID"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="月份">
          <el-date-picker
            v-model="queryState.month"
            type="month"
            value-format="YYYY-MM"
            placeholder="选择月份"
            clearable
            class="w-[160px]!"
            @change="onSearch"
          />
        </el-form-item>
        <el-form-item label="操作">
          <el-select
            v-model="queryState.action"
            class="w-[140px]!"
            @change="onSearch"
          >
            <el-option
              v-for="opt in actionOptions"
              :key="opt.value || 'all'"
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

    <PureTableBar class="mt-2" title="账单日志" @refresh="fetchList">
      <el-table
        :data="tableData"
        :loading="loading"
        row-key="billLogId"
        class="w-full"
      >
        <el-table-column label="用户" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip :content="row.userId" placement="top">
              <span>
                {{ formatUserLabel(row.userId, row.username, row.nickname) }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作人" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip :content="row.operatorUserId" placement="top">
              <span>
                {{
                  formatUserLabel(
                    row.operatorUserId,
                    row.operatorUsername,
                    row.operatorNickname
                  )
                }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            {{ formatRecordType(row.recordType) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            {{ formatAction(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="billDate" label="账单日期" width="120" />
        <el-table-column label="分类" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip :content="row.categoryId" placement="top">
              <span>
                {{ formatCategoryName(row.categoryId, row.categoryName) }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="金额(元)" width="120" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.amount) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          label="备注"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column label="变更字段" min-width="200">
          <template #default="{ row }">
            <el-space v-if="row.changedFields.length" wrap>
              <el-tag v-for="f in row.changedFields" :key="f" size="small">
                {{ resolveChangedFieldLabel(f) }}
              </el-tag>
            </el-space>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="操作时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="110">
          <template #default="{ row }">
            <el-button link type="primary" @click="openSnapshot(row)">
              查看快照
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="BILL_LOG_PAGE_SIZES"
          :page-size="queryState.pageSize"
          :current-page="queryState.page"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>

    <el-dialog
      v-model="snapshotVisible"
      title="操作快照"
      width="920px"
      :close-on-click-modal="false"
    >
      <el-descriptions v-if="snapshotRow" :column="2" border>
        <el-descriptions-item label="日志ID">
          {{ snapshotRow.billLogId }}
        </el-descriptions-item>
        <el-descriptions-item label="操作时间">
          {{ snapshotRow.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          {{
            formatUserDisplay(
              snapshotRow.userId,
              snapshotRow.username,
              snapshotRow.nickname
            )
          }}
        </el-descriptions-item>
        <el-descriptions-item label="操作人">
          {{
            formatUserDisplay(
              snapshotRow.operatorUserId,
              snapshotRow.operatorUsername,
              snapshotRow.operatorNickname
            )
          }}
        </el-descriptions-item>
        <el-descriptions-item label="记账类型">
          {{ formatRecordType(snapshotRow.recordType) }}
        </el-descriptions-item>
        <el-descriptions-item label="操作类型">
          {{ formatAction(snapshotRow.action) }}
        </el-descriptions-item>
        <el-descriptions-item label="记账记录">
          <el-tooltip :content="snapshotRow.recordId" placement="top">
            <span>
              {{ snapshotRow.billDate }} ·
              {{
                formatCategoryName(
                  snapshotRow.categoryId,
                  snapshotRow.categoryName
                )
              }}
              · {{ formatAmount(snapshotRow.amount) }}元
            </span>
          </el-tooltip>
        </el-descriptions-item>
        <el-descriptions-item label="账单日期">
          {{ snapshotRow.billDate }}
        </el-descriptions-item>
        <el-descriptions-item label="分类">
          {{
            formatCategoryDisplay(
              snapshotRow.categoryId,
              snapshotRow.categoryName
            )
          }}
        </el-descriptions-item>
        <el-descriptions-item label="金额(元)">
          {{ formatAmount(snapshotRow.amount) }}
        </el-descriptions-item>
      </el-descriptions>

      <el-row class="mt-3" :gutter="12">
        <el-col :span="12">
          <el-card shadow="never" header="修改前">
            <pre class="whitespace-pre-wrap break-words text-xs leading-5">{{
              beforeSnapshotText
            }}</pre>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never" header="修改后">
            <pre class="whitespace-pre-wrap break-words text-xs leading-5">{{
              afterSnapshotText
            }}</pre>
          </el-card>
        </el-col>
      </el-row>

      <template #footer>
        <el-button @click="snapshotVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
