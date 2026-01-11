<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES, exportToCsv, type CsvColumn } from "@/utils/table";
import {
  type VehicleItem,
  type Status,
  type VehicleListParams,
  getVehicleList,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  batchDeleteVehicles
} from "@/api/vehicle";

defineOptions({
  name: "VehicleManage"
});

type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

const queryState = reactive<
  Required<Pick<VehicleListParams, "page" | "pageSize">> & {
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
const tableData = ref<VehicleItem[]>([]);
const total = ref(0);
const selectionIds = ref<number[]>([]);

const exportColumns: CsvColumn<VehicleItem>[] = [
  { label: "年份", key: "year" },
  { label: "车型", key: "model" },
  { label: "版本", key: "version" },
  {
    label: "状态",
    key: "status",
    format: (_value, row) => (row.status === 1 ? "启用" : "禁用")
  },
  { label: "创建时间", key: "createdAt" }
];

const listParams = computed((): VehicleListParams => {
  const params: VehicleListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.status !== "") params.status = queryState.status;
  return params;
});

async function fetchVehicles(): Promise<void> {
  loading.value = true;
  try {
    const res = await getVehicleList(listParams.value);
    if (!res.success) {
      message(res.message || "获取车辆列表失败", { type: "error" });
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
  fetchVehicles();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.status = "";
  fetchVehicles();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchVehicles();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchVehicles();
}

function onSelectionChange(rows: VehicleItem[]): void {
  selectionIds.value = rows.map(r => r.id);
}

function onExportList(): void {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exportToCsv(tableData.value, exportColumns, "车型列表");
}

type VehicleFormMode = "create" | "edit";

type VehicleFormModel = {
  id?: number;
  year: number | null;
  model: string;
  version: string;
  status: Status;
  remark: string;
};

const vehicleFormRules: FormRules<VehicleFormModel> = {
  year: [{ required: true, message: "请输入年份", trigger: "change" }],
  model: [{ required: true, message: "请输入车型", trigger: "blur" }],
  version: [{ required: true, message: "请输入版本", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
  remark: []
};

function openVehicleDialog(mode: VehicleFormMode, row?: VehicleItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<VehicleFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    year: mode === "edit" ? (row?.year ?? null) : null,
    model: mode === "edit" ? (row?.model ?? "") : "",
    version: mode === "edit" ? (row?.version ?? "") : "",
    status: mode === "edit" ? (row?.status ?? 1) : 1,
    remark: mode === "edit" ? (row?.remark ?? "") : ""
  });

  const VehicleFormDialog = defineComponent({
    name: "VehicleFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={vehicleFormRules}
          label-width="90px"
        >
          <el-form-item label="年份" prop="year">
            <el-input-number
              v-model={model.year}
              min={1900}
              max={2100}
              step={1}
              controls-position="right"
              class="w-full"
              placeholder="例如：2025"
            />
          </el-form-item>
          <el-form-item label="车型" prop="model">
            <el-input
              v-model={model.model}
              placeholder="例如：第二代蓝电E5PLUS"
              clearable
            />
          </el-form-item>
          <el-form-item label="版本" prop="version">
            <el-input
              v-model={model.version}
              placeholder="例如：科技包版"
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
          <el-form-item label="备注" prop="remark">
            <el-input
              v-model={model.remark}
              type="textarea"
              rows={4}
              placeholder="可选"
              resize="vertical"
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增车型" : "编辑车型",
    width: "760px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(VehicleFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const payload = {
          year: Number(model.year),
          model: model.model.trim(),
          version: model.version.trim(),
          status: model.status,
          remark: model.remark.trim()
        };

        if (mode === "create") {
          const res = await createVehicle(payload);
          if (!res.success) {
            message(res.message || "新增失败", { type: "error" });
            closeLoading();
            return;
          }
          message("新增成功", { type: "success" });
          done();
          queryState.page = 1;
          fetchVehicles();
          return;
        }

        if (!model.id) {
          message("车型信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateVehicle({ id: model.id, ...payload });
        if (!res.success) {
          message(res.message || "更新失败", { type: "error" });
          closeLoading();
          return;
        }
        message("更新成功", { type: "success" });
        done();
        fetchVehicles();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: VehicleItem): Promise<void> {
  try {
    const res = await deleteVehicle({ id: row.id });
    if (!res.success) {
      message(res.message || "删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchVehicles();
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  }
}

async function onBatchDelete(): Promise<void> {
  if (selectionIds.value.length === 0) {
    message("请选择要删除的车辆", { type: "warning" });
    return;
  }

  const deletingCount = selectionIds.value.length;
  const currentRows = tableData.value.length;

  const BatchDeleteContent = defineComponent({
    name: "VehicleBatchDeleteContent",
    setup() {
      return () => (
        <div class="text-[14px] leading-6">
          确认删除选中的 {deletingCount} 条车型？
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
        const res = await batchDeleteVehicles({ ids });
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
        fetchVehicles();
      } catch {
        closeLoading();
        message("网络异常，请稍后重试", { type: "error" });
      }
    }
  });
}

fetchVehicles();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="年份/车型/版本"
            clearable
            class="w-[260px]!"
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

    <PureTableBar class="mt-2" title="车型列表" @refresh="fetchVehicles">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openVehicleDialog('create')">
            新增车型
          </el-button>
          <el-button type="success" plain @click="onExportList"
            >导出列表</el-button
          >
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
        <el-table-column prop="year" label="年份" width="100" />
        <el-table-column prop="model" label="车型" min-width="160" />
        <el-table-column prop="version" label="版本" min-width="120" />
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
                @click="openVehicleDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该车型？"
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
