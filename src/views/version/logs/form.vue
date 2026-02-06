<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { FormInstance, FormRules } from "element-plus";
import QuestionFilled from "~icons/ep/question-filled";
import { message } from "@/utils/message";
import {
  type VersionUpdate,
  type VersionUpdateListParams,
  createVersionUpdate,
  getVersionUpdateList,
  updateVersionUpdate
} from "@/api/version";

defineOptions({
  name: "VersionUpdateForm"
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

const formRules: FormRules<UpdateFormModel> = {
  versionName: [{ required: true, message: "请输入版本号", trigger: "blur" }],
  releaseAt: [{ required: true, message: "请选择版本日期", trigger: "change" }],
  content: [{ required: true, message: "请输入更新内容", trigger: "blur" }]
};

const route = useRoute();
const router = useRouter();

const isEditing = computed(() => route.name === "VersionUpdateEdit");
const versionUpdateId = computed(() =>
  String(route.params.versionUpdateId ?? "").trim()
);
const pageTitle = computed(() =>
  isEditing.value ? "编辑版本更新" : "新增版本更新"
);

const loading = ref(false);
const saving = ref(false);
const formRef = ref<FormInstance>();

const model = reactive<UpdateFormModel>({
  versionUpdateId: undefined,
  versionName: "",
  versionCode: null,
  releaseAt: "",
  content: "",
  seq: 0,
  isEnabled: true
});

function toIsoDateString(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.includes("T")) return v;
  return `${v}T00:00:00.000Z`;
}

async function fetchDetail(id: string): Promise<VersionUpdate | null> {
  try {
    const params: VersionUpdateListParams = {
      versionUpdateId: id,
      page: 1,
      pageSize: 1
    };
    const res = await getVersionUpdateList(params);
    return res.list[0] ?? null;
  } catch {
    return null;
  }
}

async function initForEdit(): Promise<void> {
  if (!isEditing.value) return;
  if (!versionUpdateId.value) {
    message("版本信息异常", { type: "error" });
    router.replace("/version/updates");
    return;
  }

  loading.value = true;
  try {
    const detail = await fetchDetail(versionUpdateId.value);
    if (!detail) {
      message("未找到版本数据", { type: "warning" });
      router.replace("/version/updates");
      return;
    }

    model.versionUpdateId = detail.versionUpdateId;
    model.versionName = detail.versionName ?? "";
    model.versionCode = detail.versionCode ?? null;
    model.releaseAt = String(detail.releaseAt ?? "").slice(0, 10);
    model.content = detail.content ?? "";
    model.seq = detail.seq ?? 0;
    model.isEnabled = detail.isEnabled ?? true;
  } finally {
    loading.value = false;
  }
}

function onCancel(): void {
  router.push("/version/updates");
}

async function onSubmit(): Promise<void> {
  saving.value = true;
  try {
    await formRef.value?.validate();

    const payload = {
      versionName: model.versionName.trim(),
      versionCode: model.versionCode,
      content: model.content.trim(),
      releaseAt: toIsoDateString(model.releaseAt),
      seq: model.seq,
      isEnabled: model.isEnabled
    };

    if (!isEditing.value) {
      await createVersionUpdate(payload);
      router.push("/version/updates");
      return;
    }

    if (!model.versionUpdateId) {
      message("版本信息异常", { type: "error" });
      return;
    }

    await updateVersionUpdate({
      versionUpdateId: model.versionUpdateId,
      ...payload
    });
    router.push("/version/updates");
  } catch {
  } finally {
    saving.value = false;
  }
}

initForEdit();
</script>

<template>
  <div>
    <el-card shadow="never">
      <div class="flex justify-between items-center">
        <div class="text-[16px] font-600">{{ pageTitle }}</div>
        <el-space>
          <el-button @click="onCancel">取消</el-button>
          <el-button type="primary" :loading="saving" @click="onSubmit">
            保存
          </el-button>
        </el-space>
      </div>
    </el-card>

    <el-card v-loading="loading" shadow="never" class="mt-2">
      <el-form
        ref="formRef"
        :model="model"
        :rules="formRules"
        label-width="150px"
      >
        <el-form-item v-if="isEditing">
          <template #label>
            <span class="version-form-label">
              <span>版本更新ID</span>
              <el-tooltip content="示例：LD0007YZAB" placement="top">
                <el-icon class="version-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input :model-value="model.versionUpdateId" disabled />
        </el-form-item>

        <el-form-item prop="versionName">
          <template #label>
            <span class="version-form-label">
              <span>版本号</span>
              <el-tooltip
                content="示例：V1.3.0 / V1.3.0-beta.1"
                placement="top"
              >
                <el-icon class="version-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="model.versionName" clearable />
        </el-form-item>

        <el-form-item prop="versionCode">
          <template #label>
            <span class="version-form-label">
              <span>版本数值</span>
              <el-tooltip
                content="可选，用于程序比较（例如：130）"
                placement="top"
              >
                <el-icon class="version-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input-number
            v-model="model.versionCode"
            class="w-full"
            controls-position="right"
            :min="0"
          />
        </el-form-item>

        <el-form-item prop="releaseAt">
          <template #label>
            <span class="version-form-label">
              <span>版本日期</span>
              <el-tooltip content="示例：2026-02-06" placement="top">
                <el-icon class="version-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-date-picker
            v-model="model.releaseAt"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item prop="content">
          <template #label>
            <span class="version-form-label">
              <span>更新内容</span>
              <el-tooltip content="可选，最长 20000 字" placement="top">
                <el-icon class="version-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="model.content"
            type="textarea"
            :rows="8"
            resize="vertical"
          />
        </el-form-item>

        <el-form-item prop="seq">
          <template #label>
            <span class="version-form-label">
              <span>排序号</span>
              <el-tooltip content="数字越小越靠前" placement="top">
                <el-icon class="version-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input-number
            v-model="model.seq"
            class="w-full"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item prop="isEnabled">
          <template #label>
            <span class="version-form-label">
              <span>启用</span>
              <el-tooltip content="启用后才会对外展示" placement="top">
                <el-icon class="version-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-segmented
            v-model="model.isEnabled"
            :options="[
              { label: '启用', value: true },
              { label: '禁用', value: false }
            ]"
          />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.version-form-label {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

.version-form-label__icon {
  flex: 0 0 auto;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
}
</style>
