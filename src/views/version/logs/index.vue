<script setup lang="ts">
import { reactive, ref, computed, nextTick } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import QuestionFilled from "~icons/ep/question-filled";
import { PureTableBar } from "@/components/RePureTableBar";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  type VersionUpdate,
  type VersionUpdateListParams,
  getVersionUpdateList,
  deleteVersionUpdate,
  createVersionUpdate,
  updateVersionUpdate
} from "@/api/version";

defineOptions({
  name: "VersionUpdates"
});

type UpdateFormModel = {
  versionUpdateId?: string;
  versionName: string;
  versionCode: number | null;
  releaseAt: string;
  content: string;
  seq: number;
  isEnabled: boolean;
};

const queryState = reactive<{
  page: number;
  pageSize: number;
  isEnabled: "" | boolean;
  versionKeyword: string;
  versionUpdateId: string;
}>({
  page: 1,
  pageSize: 10,
  isEnabled: "",
  versionKeyword: "",
  versionUpdateId: ""
});

const loading = ref(false);
const tableData = ref<VersionUpdate[]>([]);
const total = ref(0);

const dialogVisible = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const saving = ref(false);
const formRef = ref<FormInstance>();

const formRules: FormRules<UpdateFormModel> = {
  versionName: [{ required: true, message: "请输入版本号", trigger: "blur" }],
  releaseAt: [{ required: true, message: "请选择版本日期", trigger: "change" }],
  content: [{ required: true, message: "请输入更新内容", trigger: "blur" }]
};

const formModel = reactive<UpdateFormModel>({
  versionUpdateId: undefined,
  versionName: "",
  versionCode: null,
  releaseAt: "",
  content: "",
  seq: 0,
  isEnabled: true
});

const dialogTitle = computed(() =>
  dialogMode.value === "create" ? "新增版本更新" : "编辑版本更新"
);

const listParams = computed((): VersionUpdateListParams => {
  const params: VersionUpdateListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };

  const versionKeyword = queryState.versionKeyword.trim();
  if (versionKeyword) params.versionKeyword = versionKeyword;

  const versionUpdateId = queryState.versionUpdateId.trim();
  if (versionUpdateId) params.versionUpdateId = versionUpdateId;

  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;

  return params;
});

async function fetchLogs(): Promise<void> {
  loading.value = true;
  try {
    const res = await getVersionUpdateList(listParams.value);
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
  queryState.isEnabled = "";
  queryState.versionKeyword = "";
  queryState.versionUpdateId = "";
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

function formatDateForBackend(value: unknown): string {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const v = String(value).trim();
  if (!v) return "";

  if (v.includes("T")) {
    return v.slice(0, 10);
  }

  const normalized = v.replaceAll("/", "-");
  return normalized.slice(0, 10);
}

function resetFormModel(): void {
  formModel.versionUpdateId = undefined;
  formModel.versionName = "";
  formModel.versionCode = null;
  formModel.releaseAt = "";
  formModel.content = "";
  formModel.seq = 0;
  formModel.isEnabled = true;
}

async function openCreateDialog(): Promise<void> {
  dialogMode.value = "create";
  resetFormModel();
  dialogVisible.value = true;
  await nextTick();
  formRef.value?.clearValidate();
}

async function openEditDialog(row: VersionUpdate): Promise<void> {
  dialogMode.value = "edit";
  formModel.versionUpdateId = row.versionUpdateId;
  formModel.versionName = row.versionName ?? "";
  formModel.versionCode = row.versionCode ?? null;
  formModel.releaseAt = String(row.releaseAt ?? "").slice(0, 10);
  formModel.content = row.content ?? "";
  formModel.seq = row.seq ?? 0;
  formModel.isEnabled = row.isEnabled ?? true;
  dialogVisible.value = true;
  await nextTick();
  formRef.value?.clearValidate();
}

function closeDialog(): void {
  dialogVisible.value = false;
}

function onDialogClosed(): void {
  resetFormModel();
  formRef.value?.clearValidate();
}

async function onSubmitDialog(): Promise<void> {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const payload: {
      versionName: string;
      releaseAt: string;
      content: string;
      seq: number;
      isEnabled: boolean;
      versionCode?: number;
    } = {
      versionName: formModel.versionName.trim(),
      releaseAt: formatDateForBackend(formModel.releaseAt),
      content: formModel.content.trim(),
      seq: formModel.seq,
      isEnabled: formModel.isEnabled
    };

    if (formModel.versionCode !== null) {
      payload.versionCode = formModel.versionCode;
    }

    if (dialogMode.value === "create") {
      await createVersionUpdate(payload);
      closeDialog();
      queryState.page = 1;
      fetchLogs();
      return;
    }

    const versionUpdateId = formModel.versionUpdateId;
    if (!versionUpdateId) return;
    await updateVersionUpdate({ versionUpdateId, ...payload });
    closeDialog();
    fetchLogs();
  } catch {
  } finally {
    saving.value = false;
  }
}

async function onDeleteRow(row: VersionUpdate): Promise<void> {
  try {
    await deleteVersionUpdate({ versionUpdateId: row.versionUpdateId });
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
        <el-form-item label="版本更新ID">
          <el-input
            v-model="queryState.versionUpdateId"
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

    <PureTableBar class="mt-2" title="版本更新" @refresh="fetchLogs">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openCreateDialog">
            新增版本更新
          </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="versionUpdateId"
        class="w-full"
      >
        <el-table-column
          prop="versionUpdateId"
          label="版本更新ID"
          min-width="140"
        />
        <el-table-column prop="versionName" label="版本" min-width="120" />
        <el-table-column prop="versionCode" label="版本数值" min-width="110">
          <template #default="{ row }">
            <span>{{ row.versionCode ?? "-" }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="releaseAt" label="版本日期" width="120">
          <template #default="{ row }">
            <span>{{ String(row.releaseAt ?? "").slice(0, 10) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="content"
          label="更新内容"
          min-width="240"
          show-overflow-tooltip
        />
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
              <el-button link type="primary" @click="openEditDialog(row)">
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该版本更新？"
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="620px"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="onDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        label-width="110px"
      >
        <el-form-item v-if="dialogMode === 'edit'">
          <template #label>
            <span class="inline-flex gap-2 items-center whitespace-nowrap">
              <span>版本更新ID</span>
              <el-tooltip content="示例：LD0007YZAB" placement="top">
                <el-icon
                  class="text-[14px] text-[var(--el-text-color-secondary)] cursor-help"
                >
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input :model-value="formModel.versionUpdateId" disabled />
        </el-form-item>

        <el-form-item prop="versionName">
          <template #label>
            <span class="inline-flex gap-2 items-center whitespace-nowrap">
              <span>版本号</span>
              <el-tooltip content="示例：1.3.0" placement="top">
                <el-icon
                  class="text-[14px] text-[var(--el-text-color-secondary)] cursor-help"
                >
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="formModel.versionName" clearable />
        </el-form-item>

        <el-form-item prop="versionCode">
          <template #label>
            <span class="inline-flex gap-2 items-center whitespace-nowrap">
              <span>版本数值</span>
              <el-tooltip content="可选，用于程序比较" placement="top">
                <el-icon
                  class="text-[14px] text-[var(--el-text-color-secondary)] cursor-help"
                >
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input-number
            v-model="formModel.versionCode"
            class="w-full"
            controls-position="right"
            :min="0"
          />
        </el-form-item>

        <el-form-item prop="releaseAt">
          <template #label>
            <span class="inline-flex gap-2 items-center whitespace-nowrap">
              <span>版本日期</span>
              <el-tooltip content="示例：2026-02-06" placement="top">
                <el-icon
                  class="text-[14px] text-[var(--el-text-color-secondary)] cursor-help"
                >
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-date-picker
            v-model="formModel.releaseAt"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item prop="content">
          <template #label>
            <span class="inline-flex gap-2 items-center whitespace-nowrap">
              <span>更新内容</span>
              <el-tooltip content="最长 20000 字" placement="top">
                <el-icon
                  class="text-[14px] text-[var(--el-text-color-secondary)] cursor-help"
                >
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="formModel.content"
            type="textarea"
            :rows="6"
            resize="vertical"
          />
        </el-form-item>

        <el-form-item prop="seq" label="排序号">
          <el-input-number
            v-model="formModel.seq"
            class="w-full"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item prop="isEnabled" label="启用">
          <el-segmented
            v-model="formModel.isEnabled"
            :options="[
              { label: '启用', value: true },
              { label: '禁用', value: false }
            ]"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-space>
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" :loading="saving" @click="onSubmitDialog">
            保存
          </el-button>
        </el-space>
      </template>
    </el-dialog>
  </div>
</template>
