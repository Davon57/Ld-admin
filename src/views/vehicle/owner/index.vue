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
  type CarFriend,
  type CarFriendListParams,
  getCarFriendList,
  createCarFriend,
  updateCarFriend,
  deleteCarFriend,
  type Car,
  getCarList
} from "@/api/vehicle";
import { getUserList, type UserItem } from "@/api/user";

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
  { label: "用户ID", key: "userId" },
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

type OwnerFormMode = "create" | "edit";

type OwnerFormModel = {
  carFriendId?: string;
  userId: string;
  carId: string;
  vin: string;
  carModel: string;
  carVersion: string;
  remark: string;
};

const ownerFormRules: FormRules<OwnerFormModel> = {
  userId: [{ required: true, message: "请选择用户ID", trigger: "change" }],
  carId: [{ required: true, message: "请选择车辆标识", trigger: "change" }],
  vin: [],
  carModel: [],
  carVersion: [],
  remark: []
};

function openOwnerDialog(mode: OwnerFormMode, row?: CarFriend): void {
  const formRef = ref<FormInstance>();
  type SelectOption = { value: string; label: string };

  const userOptions = ref<SelectOption[]>([]);
  const userOptionsLoading = ref(false);
  const carOptions = ref<SelectOption[]>([]);
  const carOptionsLoading = ref(false);
  const model = reactive<OwnerFormModel>({
    carFriendId: mode === "edit" ? row?.carFriendId : undefined,
    userId: mode === "edit" ? (row?.userId ?? "") : "",
    carId: mode === "edit" ? (row?.carId ?? "") : "",
    vin: mode === "edit" ? (row?.vin ?? "") : "",
    carModel: mode === "edit" ? (row?.carModel ?? "") : "",
    carVersion: mode === "edit" ? (row?.carVersion ?? "") : "",
    remark: mode === "edit" ? (row?.remark ?? "") : ""
  });

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

      if (mode === "edit" && model.userId) {
        const exists = userOptions.value.some(
          opt => opt.value === model.userId
        );
        if (!exists && row) {
          userOptions.value.unshift({
            value: row.userId,
            label: row.username
              ? `${row.userId}（${row.username}）`
              : row.userId
          });
        }
      }
    } catch {
      userOptions.value = [];
    } finally {
      userOptionsLoading.value = false;
    }
  }

  async function loadCarOptions(): Promise<void> {
    carOptionsLoading.value = true;
    try {
      const res = await getCarList({
        includeDisabled: true,
        page: 1,
        pageSize: 1000
      });

      const list: Car[] = isPageData<Car>(res) ? res.list : res;

      carOptions.value = list.map(car => ({
        value: car.carId,
        label: `${car.carId}（${car.year}年 ${car.model} ${car.version}）`
      }));

      if (mode === "edit" && model.carId) {
        const exists = carOptions.value.some(opt => opt.value === model.carId);
        if (!exists && row) {
          carOptions.value.unshift({
            value: row.carId,
            label: row.carId
          });
        }
      }
    } catch {
      carOptions.value = [];
    } finally {
      carOptionsLoading.value = false;
    }
  }

  const OwnerFormDialog = defineComponent({
    name: "OwnerFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      void loadUserOptions();
      void loadCarOptions();

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={ownerFormRules}
          label-width="90px"
        >
          <el-form-item label="用户ID" prop="userId">
            <el-select
              v-model={model.userId}
              filterable
              clearable
              placeholder="请选择用户"
              loading={userOptionsLoading.value}
              class="w-full"
            >
              {userOptions.value.map(opt => (
                <el-option
                  label={opt.label}
                  value={opt.value}
                  key={opt.value}
                />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="车辆标识" prop="carId">
            <el-select
              v-model={model.carId}
              filterable
              clearable
              placeholder="请选择车辆"
              loading={carOptionsLoading.value}
              class="w-full"
            >
              {carOptions.value.map(opt => (
                <el-option
                  label={opt.label}
                  value={opt.value}
                  key={opt.value}
                />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="VIN" prop="vin">
            <el-input v-model={model.vin} placeholder="可选" clearable />
          </el-form-item>
          <el-form-item label="车辆型号" prop="carModel">
            <el-input v-model={model.carModel} placeholder="可选" clearable />
          </el-form-item>
          <el-form-item label="车辆版本" prop="carVersion">
            <el-input v-model={model.carVersion} placeholder="可选" clearable />
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
    title: mode === "create" ? "新增车主" : "编辑车主",
    width: "720px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(OwnerFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const payload = {
          userId: model.userId.trim(),
          carId: model.carId.trim(),
          vin: model.vin.trim() || undefined,
          carModel: model.carModel.trim() || undefined,
          carVersion: model.carVersion.trim() || undefined,
          remark: model.remark.trim() || undefined
        };

        if (!payload.userId || !payload.carId) {
          message("请完整填写必填信息", { type: "error" });
          closeLoading();
          return;
        }

        if (mode === "create") {
          await createCarFriend(payload);
          message("新增成功", { type: "success" });
          done();
          queryState.page = 1;
          fetchOwners();
          return;
        }

        if (!model.carFriendId) {
          message("车主信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateCarFriend({ carFriendId: model.carFriendId, ...payload });
        message("更新成功", { type: "success" });
        done();
        fetchOwners();
      } catch (err) {
        message(err instanceof Error ? err.message : "网络异常，请稍后重试", {
          type: "error"
        });
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: CarFriend): Promise<void> {
  try {
    const res = await deleteCarFriend({ carFriendId: row.carFriendId });
    if (!res.ok) {
      message("删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchOwners();
  } catch (err) {
    message(err instanceof Error ? err.message : "网络异常，请稍后重试", {
      type: "error"
    });
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
          <el-button type="primary" @click="openOwnerDialog('create')">
            新增车主
          </el-button>
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
        row-key="carFriendId"
        class="w-full"
      >
        <el-table-column prop="userId" label="用户ID" min-width="140" />
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
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openOwnerDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该车主？"
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
