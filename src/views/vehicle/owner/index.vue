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
  type CarFriend,
  type CarFriendListParams,
  getCarFriendList
} from "@/api/vehicle";

defineOptions({
  name: "VehicleOwnerList"
});

const queryState = reactive<{
  page: number;
  pageSize: number;
  userId: string;
  carId: string;
  vin: string;
}>({
  page: 1,
  pageSize: 10,
  userId: "",
  carId: "",
  vin: ""
});

const loading = ref(false);
const exporting = ref(false);
const tableData = ref<CarFriend[]>([]);
const total = ref(0);

const exportColumns: CsvColumn<CarFriend>[] = [
  {
    label: "用户名",
    key: "username",
    format: (value, row) => {
      const v = typeof value === "string" ? value.trim() : "";
      return v || row.userId;
    }
  },
  { label: "车辆标识", key: "carId" },
  { label: "VIN", key: "vin" },
  { label: "车辆型号", key: "carModel" },
  { label: "车辆版本", key: "carVersion" },
  { label: "备注", key: "remark" },
  { label: "创建时间", key: "createdAt" },
  { label: "更新时间", key: "updatedAt" }
];

const listParams = computed((): CarFriendListParams => {
  const params: CarFriendListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const userId = queryState.userId.trim();
  const carId = queryState.carId.trim();
  const vin = queryState.vin.trim();
  if (userId) params.userId = userId;
  if (carId) params.carId = carId;
  if (vin) params.vin = vin;
  return params;
});

async function fetchOwners(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCarFriendList(listParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } catch (err) {
    tableData.value = [];
    total.value = 0;
    message(err instanceof Error ? err.message : "网络异常，请稍后重试", {
      type: "error"
    });
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchOwners();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.userId = "";
  queryState.carId = "";
  queryState.vin = "";
  fetchOwners();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchOwners();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchOwners();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }

  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "车主列表");
  } catch (err) {
    message(err instanceof Error ? err.message : "网络异常，请稍后重试", {
      type: "error"
    });
  } finally {
    exporting.value = false;
  }
}

fetchOwners();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="用户ID">
          <el-input
            v-model="queryState.userId"
            placeholder="精确匹配 userId"
            clearable
            class="w-[260px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="车辆标识">
          <el-input
            v-model="queryState.carId"
            placeholder="精确匹配 carId"
            clearable
            class="w-[260px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="VIN">
          <el-input
            v-model="queryState.vin"
            placeholder="精确匹配 VIN"
            clearable
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

    <PureTableBar class="mt-2" title="车主列表" @refresh="fetchOwners">
      <template #buttons>
        <el-space wrap>
          <el-button
            type="success"
            plain
            :loading="exporting"
            @click="onExportList"
            >导出列表</el-button
          >
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="id"
        class="w-full"
      >
        <el-table-column prop="username" label="用户名" min-width="140">
          <template #default="{ row }">{{
            row.username || row.userId
          }}</template>
        </el-table-column>
        <el-table-column prop="carId" label="车辆标识" min-width="120" />
        <el-table-column prop="vin" label="VIN" min-width="180" />
        <el-table-column prop="carModel" label="车辆型号" min-width="140" />
        <el-table-column prop="carVersion" label="车辆版本" min-width="140" />
        <el-table-column prop="remark" label="备注" min-width="160" />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
      </el-table>

      <div class="flex justify-end mt-4">
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
