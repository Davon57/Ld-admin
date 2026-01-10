<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  type ActivityItem,
  type Status,
  type ActivityListParams,
  getActivityList,
  createActivity,
  updateActivity,
  deleteActivity,
  batchDeleteActivities
} from "@/api/activity";

defineOptions({
  name: "ActivityManage"
});

type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

const queryState = reactive<
  Required<Pick<ActivityListParams, "page" | "pageSize">> & {
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
const tableData = ref<ActivityItem[]>([]);
const total = ref(0);
const selectionIds = ref<number[]>([]);

const listParams = computed((): ActivityListParams => {
  const params: ActivityListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.status !== "") params.status = queryState.status;
  return params;
});

async function fetchActivities(): Promise<void> {
  loading.value = true;
  try {
    const res = await getActivityList(listParams.value);
    if (!res.success) {
      message(res.message || "获取活动列表失败", { type: "error" });
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
  fetchActivities();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.status = "";
  fetchActivities();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchActivities();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchActivities();
}

function onSelectionChange(rows: ActivityItem[]): void {
  selectionIds.value = rows.map(r => r.id);
}

type ActivityFormMode = "create" | "edit";

type ActivityFormModel = {
  id?: number;
  name: string;
  description: string;
  status: Status;
  startAt: string;
  endAt: string;
};

function parseTs(v: string): number {
  return Date.parse(v.replace(/-/g, "/"));
}

const activityFormRules: FormRules<ActivityFormModel> = {
  name: [{ required: true, message: "请输入活动名称", trigger: "blur" }],
  description: [{ required: true, message: "请输入活动描述", trigger: "blur" }],
  startAt: [{ required: true, message: "请输入开始时间", trigger: "blur" }],
  endAt: [
    { required: true, message: "请输入结束时间", trigger: "blur" },
    {
      validator: (_rule, value: string, callback) => {
        const start = parseTs(String(formState.startAt || ""));
        const end = parseTs(String(value || ""));
        if (!Number.isFinite(start) || !Number.isFinite(end)) return callback();
        return start <= end
          ? callback()
          : callback(new Error("开始时间不能晚于结束时间"));
      },
      trigger: "blur"
    }
  ],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
};

const formState = reactive<{ startAt: string }>({ startAt: "" });

function openActivityDialog(mode: ActivityFormMode, row?: ActivityItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<ActivityFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    status: mode === "edit" ? (row?.status ?? 1) : 1,
    startAt: mode === "edit" ? (row?.startAt ?? "") : "",
    endAt: mode === "edit" ? (row?.endAt ?? "") : ""
  });

  formState.startAt = model.startAt;

  const ActivityFormDialog = defineComponent({
    name: "ActivityFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={activityFormRules}
          label-width="90px"
        >
          <el-form-item label="名称" prop="name">
            <el-input
              v-model={model.name}
              placeholder="请输入活动名称"
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
          <el-form-item label="开始时间" prop="startAt">
            <el-input
              v-model={model.startAt}
              placeholder="YYYY-MM-DD HH:mm:ss"
              clearable
              onInput={(v: string) => {
                formState.startAt = v;
              }}
            />
          </el-form-item>
          <el-form-item label="结束时间" prop="endAt">
            <el-input
              v-model={model.endAt}
              placeholder="YYYY-MM-DD HH:mm:ss"
              clearable
            />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input
              v-model={model.description}
              type="textarea"
              rows={6}
              placeholder="请输入活动描述"
              resize="vertical"
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增活动" : "编辑活动",
    width: "720px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(ActivityFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        if (mode === "create") {
          const res = await createActivity({
            name: model.name.trim(),
            description: model.description.trim(),
            status: model.status,
            startAt: model.startAt.trim(),
            endAt: model.endAt.trim()
          });
          if (!res.success) {
            message(res.message || "新增失败", { type: "error" });
            closeLoading();
            return;
          }
          message("新增成功", { type: "success" });
          done();
          queryState.page = 1;
          fetchActivities();
          return;
        }

        if (!model.id) {
          message("活动信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateActivity({
          id: model.id,
          name: model.name.trim(),
          description: model.description.trim(),
          status: model.status,
          startAt: model.startAt.trim(),
          endAt: model.endAt.trim()
        });
        if (!res.success) {
          message(res.message || "更新失败", { type: "error" });
          closeLoading();
          return;
        }
        message("更新成功", { type: "success" });
        done();
        fetchActivities();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: ActivityItem): Promise<void> {
  try {
    const res = await deleteActivity({ id: row.id });
    if (!res.success) {
      message(res.message || "删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchActivities();
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  }
}

async function onBatchDelete(): Promise<void> {
  if (selectionIds.value.length === 0) {
    message("请选择要删除的活动", { type: "warning" });
    return;
  }

  const deletingCount = selectionIds.value.length;
  const currentRows = tableData.value.length;

  const BatchDeleteContent = defineComponent({
    name: "BatchDeleteContent",
    setup() {
      return () => (
        <div class="text-[14px] leading-6">
          确认删除选中的 {deletingCount} 个活动？
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
        const res = await batchDeleteActivities({ ids });
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
        fetchActivities();
      } catch {
        closeLoading();
        message("网络异常，请稍后重试", { type: "error" });
      }
    }
  });
}

fetchActivities();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="名称/描述"
            clearable
            class="w-[240px]!"
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

    <PureTableBar class="mt-2" title="活动列表" @refresh="fetchActivities">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openActivityDialog('create')">
            新增活动
          </el-button>
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
        <el-table-column prop="name" label="名称" min-width="200" />
        <el-table-column prop="startAt" label="开始时间" min-width="170" />
        <el-table-column prop="endAt" label="结束时间" min-width="170" />
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
                @click="openActivityDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该活动？"
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
          :page-sizes="[10, 20, 50]"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
