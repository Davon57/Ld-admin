<script setup lang="tsx">
import { reactive, ref, computed } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  type CsvColumn
} from "@/utils/table";
import {
  type MedalGrantLog,
  type MedalGrantLogListParams,
  getMedalGrantLogs
} from "@/api/medal";

defineOptions({
  name: "MedalGrantLogManage"
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

const queryState = reactive<
  Required<Pick<MedalGrantLogListParams, "page" | "pageSize">> & {
    userId: string;
    medalId: string;
    sourceType: string;
  }
>({
  page: 1,
  pageSize: 10,
  userId: "",
  medalId: "",
  sourceType: ""
});

const loading = ref(false);
const tableData = ref<MedalGrantLog[]>([]);
const total = ref(0);
const exporting = ref(false);

const exportColumns: CsvColumn<MedalGrantLog>[] = [
  { label: "用户编码", key: "userId" },
  { label: "勋章编码", key: "medalId" },
  {
    label: "操作人编码",
    key: "operatorUserId",
    format: (_value, row) => row.operatorUserId ?? "-"
  },
  { label: "来源类型", key: "sourceType" },
  { label: "发放原因", key: "reason" },
  { label: "发放时间", key: "createdAt" }
];

const listParams = computed((): MedalGrantLogListParams => {
  const params: MedalGrantLogListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };

  const userId = queryState.userId.trim();
  const medalId = queryState.medalId.trim();
  const sourceType = queryState.sourceType.trim();

  if (userId) params.userId = userId;
  if (medalId) params.medalId = medalId;
  if (sourceType) params.sourceType = sourceType;
  return params;
});

async function fetchLogs(): Promise<void> {
  loading.value = true;
  try {
    const res = await getMedalGrantLogs(listParams.value);
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
  fetchLogs();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.userId = "";
  queryState.medalId = "";
  queryState.sourceType = "";
  fetchLogs();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchLogs();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchLogs();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "勋章发放记录");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

fetchLogs();
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
          用于审计管理员发放勋章的流水记录（可按用户/勋章/来源筛选）
        </span>
      </div>

      <el-form inline>
        <el-form-item label="用户编码">
          <el-input
            v-model="queryState.userId"
            placeholder="例如：LD0001ABCD"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="勋章编码">
          <el-input
            v-model="queryState.medalId"
            placeholder="例如：LD0007YZAB"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="来源类型">
          <el-input
            v-model="queryState.sourceType"
            placeholder="例如：admin_manual"
            clearable
            class="w-[200px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="发放记录" @refresh="fetchLogs">
      <template #buttons>
        <el-space wrap>
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
        row-key="id"
        class="w-full"
      >
        <el-table-column prop="userId" label="用户编码" min-width="140" />
        <el-table-column prop="medalId" label="勋章编码" min-width="140" />
        <el-table-column prop="operatorUserId" label="操作人" min-width="140">
          <template #default="{ row }">
            <span>{{ row.operatorUserId || "-" }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sourceType" label="来源" min-width="140" />
        <el-table-column
          prop="reason"
          label="原因"
          min-width="260"
          show-overflow-tooltip
        />
        <el-table-column prop="createdAt" label="时间" min-width="170" />
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
