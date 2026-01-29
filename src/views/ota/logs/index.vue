<script setup lang="tsx">
import { reactive, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  type OtaChannel,
  type OtaPushStatus,
  type OtaLog,
  type OtaLogListParams,
  getOtaLogList,
  deleteOtaLog
} from "@/api/ota";

defineOptions({
  name: "OtaLogs"
});

const router = useRouter();

type ChannelOption = { label: string; value: OtaChannel };
const channelOptions: ChannelOption[] = [
  { label: "稳定版", value: "stable" },
  { label: "测试版", value: "beta" }
];

type PushStatusOption = { label: string; value: OtaPushStatus };
const pushStatusOptions: PushStatusOption[] = [
  { label: "待推送", value: "scheduled" },
  { label: "推送中", value: "pushing" },
  { label: "已暂停", value: "paused" },
  { label: "已完成", value: "completed" }
];

const channelLabelMap: Record<OtaChannel, string> = {
  stable: "稳定版",
  beta: "测试版"
};

const pushStatusLabelMap: Record<OtaPushStatus, string> = {
  scheduled: "待推送",
  pushing: "推送中",
  paused: "已暂停",
  completed: "已完成"
};

function getChannelLabel(value: OtaChannel): string {
  return channelLabelMap[value] ?? value;
}

function getPushStatusLabel(value: OtaPushStatus): string {
  return pushStatusLabelMap[value] ?? value;
}

const queryState = reactive<{
  page: number;
  pageSize: number;
  channel: "" | OtaChannel;
  pushStatus: "" | OtaPushStatus;
  isEnabled: "" | boolean;
  versionKeyword: string;
  otaLogId: string;
}>({
  page: 1,
  pageSize: 10,
  channel: "",
  pushStatus: "",
  isEnabled: "",
  versionKeyword: "",
  otaLogId: ""
});

const loading = ref(false);
const tableData = ref<OtaLog[]>([]);
const total = ref(0);

const listParams = computed((): OtaLogListParams => {
  const params: OtaLogListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize,
    includeDetail: false
  };

  const versionKeyword = queryState.versionKeyword.trim();
  if (versionKeyword) params.versionKeyword = versionKeyword;

  const otaLogId = queryState.otaLogId.trim();
  if (otaLogId) params.otaLogId = otaLogId;

  if (queryState.channel) params.channel = queryState.channel;
  if (queryState.pushStatus) params.pushStatus = queryState.pushStatus;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;

  return params;
});

async function fetchLogs(): Promise<void> {
  loading.value = true;
  try {
    const res = await getOtaLogList(listParams.value);
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
  queryState.channel = "";
  queryState.pushStatus = "";
  queryState.isEnabled = "";
  queryState.versionKeyword = "";
  queryState.otaLogId = "";
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

function goToCreate(): void {
  router.push({ name: "OtaLogCreate" });
}

function goToEdit(row: OtaLog): void {
  router.push({ name: "OtaLogEdit", params: { otaLogId: row.otaLogId } });
}

async function onDeleteRow(row: OtaLog): Promise<void> {
  try {
    await deleteOtaLog({ otaLogId: row.otaLogId });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchLogs();
  } catch {}
}

fetchLogs();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="渠道">
          <el-select v-model="queryState.channel" clearable class="w-[160px]!">
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in channelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="推送状态">
          <el-select
            v-model="queryState.pushStatus"
            clearable
            class="w-[180px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in pushStatusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-select
            v-model="queryState.isEnabled"
            clearable
            class="w-[140px]!"
          >
            <el-option label="全部" value="" />
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="版本关键词">
          <el-input
            v-model="queryState.versionKeyword"
            placeholder="对 versionName 模糊匹配"
            clearable
            class="w-[220px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="OTA日志ID">
          <el-input
            v-model="queryState.otaLogId"
            placeholder="LD####AAAA"
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

    <PureTableBar class="mt-2" title="OTA 列表" @refresh="fetchLogs">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="goToCreate"> 新增 OTA </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="otaLogId"
        class="w-full"
      >
        <el-table-column prop="otaLogId" label="OTA日志ID" min-width="140" />
        <el-table-column prop="channel" label="渠道" width="90">
          <template #default="{ row }">
            <span>{{ getChannelLabel(row.channel) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="versionName" label="版本" min-width="120" />
        <el-table-column prop="versionCode" label="版本数值" min-width="110">
          <template #default="{ row }">
            <span>{{ row.versionCode ?? "-" }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="pushStatus" label="推送状态" min-width="120">
          <template #default="{ row }">
            <span>{{ getPushStatusLabel(row.pushStatus) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="publishedAt" label="发布日期" width="120" />
        <el-table-column prop="packageSizeText" label="包大小" min-width="100">
          <template #default="{ row }">
            <span>{{ row.packageSizeText || "-" }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="启用" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="goToEdit(row)">
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该 OTA 日志？"
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
