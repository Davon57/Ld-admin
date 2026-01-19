<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  isPageData,
  type CsvColumn
} from "@/utils/table";
import {
  type Car,
  type CarStatus,
  getCarList,
  createCar,
  updateCar,
  deleteCar,
  batchDeleteCars
} from "@/api/vehicle";

defineOptions({
  name: "VehicleManage"
});

type StatusOption = { label: string; value: CarStatus };
const statusOptions: StatusOption[] = [
  { label: "在售", value: "on_sale" },
  { label: "停产", value: "discontinued" }
];

type EnabledOption = { label: string; value: boolean };
const enabledOptions: EnabledOption[] = [
  { label: "启用", value: true },
  { label: "停用", value: false }
];

const queryState = reactive<{
  page: number;
  pageSize: number;
  includeDisabled: boolean;
}>({
  page: 1,
  pageSize: 10,
  includeDisabled: false
});

const loading = ref(false);
const exporting = ref(false);
const allCars = ref<Car[]>([]);
const serverCars = ref<Car[]>([]);
const selectionIds = ref<string[]>([]);
const paginationEnabled = ref(false);
const total = ref(0);

const tableData = computed((): Car[] =>
  paginationEnabled.value ? serverCars.value : allCars.value
);

const exportColumns: CsvColumn<Car>[] = [
  { label: "车辆标识", key: "carId" },
  { label: "年份", key: "year" },
  { label: "车型", key: "model" },
  { label: "版本", key: "version" },
  {
    label: "状态",
    key: "status",
    format: (_value, row) => (row.status === "on_sale" ? "在售" : "停产")
  },
  {
    label: "启用",
    key: "isEnabled",
    format: (_value, row) => (row.isEnabled ? "启用" : "停用")
  },
  { label: "备注", key: "remark" },
  { label: "创建时间", key: "createdAt" },
  { label: "更新时间", key: "updatedAt" }
];

async function fetchCars(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCarList({
      includeDisabled: queryState.includeDisabled,
      page: queryState.page,
      pageSize: queryState.pageSize
    });

    if (isPageData<Car>(res)) {
      paginationEnabled.value = true;
      serverCars.value = res.list;
      total.value = res.total;
      return;
    }

    paginationEnabled.value = false;
    allCars.value = res;
  } catch (err) {
    allCars.value = [];
    serverCars.value = [];
    paginationEnabled.value = false;
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
  fetchCars();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.includeDisabled = false;
  fetchCars();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchCars();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchCars();
}

function onSelectionChange(rows: Car[]): void {
  selectionIds.value = rows.map(r => r.carId);
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }

  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "车辆列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type VehicleFormMode = "create" | "edit";

type VehicleFormModel = {
  id?: string;
  carId?: string;
  year: number | null;
  model: string;
  version: string;
  status: CarStatus;
  isEnabled: boolean;
  remark: string;
};

const vehicleFormRules: FormRules<VehicleFormModel> = {
  year: [{ required: true, message: "请输入年份", trigger: "change" }],
  model: [{ required: true, message: "请输入车型", trigger: "blur" }],
  version: [{ required: true, message: "请输入版本", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
  isEnabled: [{ required: true, message: "请选择是否启用", trigger: "change" }],
  remark: []
};

function openVehicleDialog(mode: VehicleFormMode, row?: Car): void {
  const formRef = ref<FormInstance>();
  const model = reactive<VehicleFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    carId: mode === "edit" ? row?.carId : undefined,
    year: mode === "edit" ? (row?.year ?? null) : null,
    model: mode === "edit" ? (row?.model ?? "") : "",
    version: mode === "edit" ? (row?.version ?? "") : "",
    status: mode === "edit" ? (row?.status ?? "on_sale") : "on_sale",
    isEnabled: mode === "edit" ? (row?.isEnabled ?? true) : true,
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
          <el-form-item label="启用" prop="isEnabled">
            <el-segmented
              v-model={model.isEnabled}
              options={enabledOptions.map(s => ({
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
    title: mode === "create" ? "新增车辆" : "编辑车辆",
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
          isEnabled: model.isEnabled,
          remark: model.remark.trim()
        };

        if (mode === "create") {
          await createCar(payload);
          message("新增成功", { type: "success" });
          done();
          queryState.page = 1;
          fetchCars();
          return;
        }

        if (!model.carId) {
          message("车型信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateCar({ carId: model.carId, ...payload });
        message("更新成功", { type: "success" });
        done();
        fetchCars();
      } catch (err) {
        if (err instanceof Error) {
          message(err.message, { type: "error" });
        }
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: Car): Promise<void> {
  try {
    const res = await deleteCar({ carId: row.carId });
    if (!res.ok) {
      message("删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (
      paginationEnabled.value &&
      queryState.page > 1 &&
      tableData.value.length === 1
    ) {
      queryState.page -= 1;
    }
    fetchCars();
  } catch (err) {
    message(err instanceof Error ? err.message : "网络异常，请稍后重试", {
      type: "error"
    });
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
        const carIds = [...selectionIds.value];
        const res = await batchDeleteCars({ carIds });
        if (!res.ok) {
          message(
            res.failedCount > 0
              ? `批量删除失败 ${res.failedCount} 条`
              : "批量删除失败",
            { type: "error" }
          );
          closeLoading();
          return;
        }
        message("删除成功", { type: "success" });
        done();
        if (
          paginationEnabled.value &&
          queryState.page > 1 &&
          deletingCount >= currentRows
        ) {
          queryState.page -= 1;
        }
        selectionIds.value = [];
        fetchCars();
      } catch (err) {
        closeLoading();
        message(err instanceof Error ? err.message : "网络异常，请稍后重试", {
          type: "error"
        });
      }
    }
  });
}

fetchCars();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="包含停用">
          <el-switch
            v-model="queryState.includeDisabled"
            inline-prompt
            active-text="是"
            inactive-text="否"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="车辆列表" @refresh="fetchCars">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openVehicleDialog('create')">
            新增车辆
          </el-button>
          <el-button
            type="success"
            plain
            :loading="exporting"
            @click="onExportList"
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
        row-key="carId"
        class="w-full"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="carId" label="车辆标识" min-width="120" />
        <el-table-column prop="year" label="年份" width="100" />
        <el-table-column prop="model" label="车型" min-width="160" />
        <el-table-column prop="version" label="版本" min-width="140" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'on_sale'" type="success">在售</el-tag>
            <el-tag v-else type="info">停产</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="启用" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">停用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
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
                title="确认删除该车辆？"
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

      <div v-if="paginationEnabled" class="flex justify-end pt-4">
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
