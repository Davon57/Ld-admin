<script setup lang="tsx">
import { computed, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import {
  type CommunityGuide,
  type CommunityGuideContentBlock,
  getCommunityGuide,
  createCommunityGuide,
  updateCommunityGuide,
  deleteCommunityGuide
} from "@/api/communityGuide";
import Plus from "~icons/ep/plus";
import Refresh from "~icons/ep/refresh";
import DeleteIcon from "~icons/ep/delete";
import ArrowUp from "~icons/ep/arrow-up";
import ArrowDown from "~icons/ep/arrow-down";

defineOptions({
  name: "CommunityGuideManage"
});

const colors = {
  primary: "#3B82F6",
  secondary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827"
  }
};

const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px"
} as const;

const OFFICIAL_QA_RE = /官方\s*QA/g;

type GuideFormModel = {
  title: string;
  summary: string;
  tags: string[];
  contentBlocks: CommunityGuideContentBlock[];
  isEnabled: boolean;
};

const formRef = ref<FormInstance>();
const loading = ref(false);
const saving = ref(false);
const initializing = ref(false);
const deleting = ref(false);

const guideMeta = reactive<{
  exists: boolean;
  communityGuideId: string;
  createdAt: string;
  updatedAt: string;
}>({
  exists: false,
  communityGuideId: "",
  createdAt: "",
  updatedAt: ""
});

const loadedGuide = ref<CommunityGuide | null>(null);

const model = reactive<GuideFormModel>({
  title: "",
  summary: "",
  tags: [],
  contentBlocks: [],
  isEnabled: true
});

const rules: FormRules<GuideFormModel> = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }]
};

function normalizeTags(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= 50) break;
  }
  return out;
}

function normalizeBlocks(
  input: CommunityGuideContentBlock[]
): CommunityGuideContentBlock[] {
  const out: CommunityGuideContentBlock[] = [];
  for (const b of input) {
    const title = (b?.title ?? "").trim();
    const content = (b?.content ?? "").trim();
    if (!title && !content) continue;
    out.push({ title, content });
    if (out.length >= 200) break;
  }
  return out;
}

function replaceOfficialQa(input: string): string {
  return input.replace(OFFICIAL_QA_RE, "社区QA");
}

function resetToEmpty(): void {
  guideMeta.exists = false;
  guideMeta.communityGuideId = "";
  guideMeta.createdAt = "";
  guideMeta.updatedAt = "";
  loadedGuide.value = null;
  model.title = "";
  model.summary = "";
  model.tags = [];
  model.contentBlocks = [];
  model.isEnabled = true;
  formRef.value?.clearValidate();
}

function resetToLoaded(): void {
  const g = loadedGuide.value;
  if (!g) {
    resetToEmpty();
    return;
  }
  guideMeta.exists = true;
  guideMeta.communityGuideId = g.communityGuideId;
  guideMeta.createdAt = g.createdAt;
  guideMeta.updatedAt = g.updatedAt;
  model.title = g.title ?? "";
  model.summary = g.summary ?? "";
  model.tags = Array.isArray(g.tags) ? [...g.tags] : [];
  model.contentBlocks = Array.isArray(g.contentBlocks)
    ? g.contentBlocks.map(b => ({
        title: b.title ?? "",
        content: b.content ?? ""
      }))
    : [];
  model.isEnabled = g.isEnabled ?? true;
  formRef.value?.clearValidate();
}

async function fetchGuide(): Promise<void> {
  loading.value = true;
  try {
    const g = await getCommunityGuide({}, { showErrorMessage: false });
    loadedGuide.value = g;
    resetToLoaded();
  } catch {
    resetToEmpty();
  } finally {
    loading.value = false;
  }
}

function addBlock(): void {
  if (model.contentBlocks.length >= 200) {
    message("正文块最多 200 条", { type: "warning" });
    return;
  }
  model.contentBlocks.push({ title: "", content: "" });
}

function deleteBlock(index: number): void {
  if (index < 0 || index >= model.contentBlocks.length) return;
  model.contentBlocks.splice(index, 1);
}

function moveBlock(from: number, to: number): void {
  if (from === to) return;
  if (from < 0 || from >= model.contentBlocks.length) return;
  if (to < 0 || to >= model.contentBlocks.length) return;
  const item = model.contentBlocks[from];
  model.contentBlocks.splice(from, 1);
  model.contentBlocks.splice(to, 0, item);
}

const canSave = computed(() => {
  if (loading.value || saving.value || deleting.value) return false;
  return true;
});

async function onSave(): Promise<void> {
  if (!canSave.value) return;
  saving.value = true;
  try {
    await formRef.value?.validate();

    const title = model.title.trim();
    const summary = model.summary.trim();
    const tags = normalizeTags(model.tags);
    const contentBlocks = normalizeBlocks(model.contentBlocks);

    for (const [i, b] of contentBlocks.entries()) {
      if (!b.title) {
        message(`第 ${i + 1} 段缺少小标题`, { type: "warning" });
        return;
      }
      if (!b.content) {
        message(`第 ${i + 1} 段缺少正文`, { type: "warning" });
        return;
      }
    }

    if (guideMeta.exists) {
      const g = await updateCommunityGuide({
        title,
        summary,
        tags,
        contentBlocks,
        isEnabled: model.isEnabled
      });
      loadedGuide.value = g;
      resetToLoaded();
      return;
    }

    const g = await createCommunityGuide({
      title,
      summary,
      tags,
      contentBlocks,
      isEnabled: model.isEnabled
    });
    loadedGuide.value = g;
    resetToLoaded();
  } catch {
    void 0;
  } finally {
    saving.value = false;
  }
}

async function onInitGuide(): Promise<void> {
  if (loading.value || saving.value || deleting.value || initializing.value)
    return;

  initializing.value = true;
  try {
    await formRef.value?.validate();

    const title = replaceOfficialQa(model.title.trim());
    const summary = replaceOfficialQa(model.summary.trim());
    const tags = normalizeTags(model.tags).map(replaceOfficialQa);
    const contentBlocks = normalizeBlocks(model.contentBlocks).map(b => ({
      title: replaceOfficialQa(b.title),
      content: replaceOfficialQa(b.content)
    }));

    for (const [i, b] of contentBlocks.entries()) {
      if (!b.title) {
        message(`第 ${i + 1} 段缺少小标题`, { type: "warning" });
        return;
      }
      if (!b.content) {
        message(`第 ${i + 1} 段缺少正文`, { type: "warning" });
        return;
      }
    }

    const payload = {
      title,
      summary,
      tags,
      contentBlocks,
      isEnabled: model.isEnabled
    };

    if (guideMeta.exists) {
      const g = await updateCommunityGuide(payload);
      loadedGuide.value = g;
      resetToLoaded();
      return;
    }

    try {
      const g = await createCommunityGuide(payload);
      loadedGuide.value = g;
      resetToLoaded();
    } catch {
      await fetchGuide();
      if (!guideMeta.exists) throw new Error("init_failed");
      const g = await updateCommunityGuide(payload);
      loadedGuide.value = g;
      resetToLoaded();
    }
  } catch {
    message("初始化失败", { type: "error" });
  } finally {
    initializing.value = false;
  }
}

async function onDelete(): Promise<void> {
  if (loading.value || saving.value || deleting.value) return;
  deleting.value = true;
  try {
    const res = await deleteCommunityGuide({});
    if (!res?.ok) {
      message("删除失败", { type: "error" });
      return;
    }
    resetToEmpty();
  } catch {
    void 0;
  } finally {
    deleting.value = false;
  }
}

const headerTitle = computed(() =>
  guideMeta.exists ? "社区指南管理" : "社区指南管理（未创建）"
);

fetchGuide();
</script>

<template>
  <div>
    <el-card shadow="never" :body-style="{ padding: spacing[4] }">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <div class="text-[16px] font-semibold">{{ headerTitle }}</div>
            <el-tag v-if="guideMeta.exists" type="success" effect="plain">
              已创建
            </el-tag>
            <el-tag v-else type="info" effect="plain">未创建</el-tag>
            <el-tag
              v-if="guideMeta.exists"
              :type="model.isEnabled ? 'success' : 'warning'"
              effect="plain"
            >
              {{ model.isEnabled ? "启用" : "禁用" }}
            </el-tag>
          </div>
          <div
            v-if="guideMeta.exists"
            class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]"
          >
            <span>GuideID：{{ guideMeta.communityGuideId }}</span>
            <span class="mx-2" :style="{ color: colors.gray[300] }">|</span>
            <span>创建：{{ guideMeta.createdAt }}</span>
            <span class="mx-2" :style="{ color: colors.gray[300] }">|</span>
            <span>更新：{{ guideMeta.updatedAt }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-button :loading="loading" @click="fetchGuide">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-popconfirm
            :title="
              guideMeta.exists
                ? '确认用当前内容覆盖社区指南？'
                : '确认用当前内容创建社区指南？'
            "
            confirm-button-text="确认"
            confirm-button-type="warning"
            cancel-button-text="取消"
            @confirm="onInitGuide"
          >
            <template #reference>
              <el-button
                type="warning"
                plain
                :loading="initializing"
                :disabled="loading || saving || deleting"
              >
                初始化
              </el-button>
            </template>
          </el-popconfirm>
          <el-button
            type="primary"
            :loading="saving"
            :disabled="!canSave"
            @click="onSave"
          >
            {{ guideMeta.exists ? "保存更新" : "创建指南" }}
          </el-button>
          <el-popconfirm
            v-if="guideMeta.exists"
            title="确认删除社区指南？"
            confirm-button-text="删除"
            confirm-button-type="danger"
            cancel-button-text="取消"
            @confirm="onDelete"
          >
            <template #reference>
              <el-button type="danger" plain :loading="deleting">
                <el-icon><DeleteIcon /></el-icon>
                删除
              </el-button>
            </template>
          </el-popconfirm>
          <el-button
            :disabled="loading || saving || deleting"
            plain
            @click="resetToLoaded"
          >
            重置
          </el-button>
        </el-space>
      </div>
    </el-card>

    <el-card
      v-loading="loading"
      shadow="never"
      class="mt-2"
      :body-style="{ padding: spacing[4] }"
    >
      <el-form ref="formRef" :model="model" :rules="rules" label-width="90px">
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="model.title"
            clearable
            placeholder="请输入标题（1~100）"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="model.summary"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="可选，填写简介（0~5000）"
            clearable
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="model.tags"
            multiple
            filterable
            allow-create
            default-first-option
            clearable
            class="w-full"
            placeholder="输入并回车添加标签，最多 50 个"
          />
        </el-form-item>
        <el-form-item label="启用">
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

    <el-card
      v-loading="loading"
      shadow="never"
      class="mt-2"
      :body-style="{ padding: spacing[4] }"
    >
      <div class="flex items-center justify-between">
        <div class="text-[14px] font-medium">正文块</div>
        <el-button
          type="primary"
          plain
          :disabled="loading || saving || deleting"
          @click="addBlock"
        >
          <el-icon><Plus /></el-icon>
          新增段落
        </el-button>
      </div>

      <div
        class="mt-3"
        :style="{ display: 'flex', flexDirection: 'column', gap: spacing[3] }"
      >
        <el-card
          v-for="(block, idx) in model.contentBlocks"
          :key="idx"
          shadow="never"
          :body-style="{ padding: spacing[4] }"
          class="border border-[var(--el-border-color-light)]"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="min-w-0">
                <span class="text-[13px] font-medium">第 {{ idx + 1 }} 段</span>
                <span
                  v-if="block.title"
                  class="ml-2 truncate text-[12px] text-[var(--el-text-color-secondary)]"
                >
                  {{ block.title }}
                </span>
              </div>
              <el-space>
                <el-button
                  :disabled="idx === 0 || loading || saving || deleting"
                  text
                  @click="moveBlock(idx, idx - 1)"
                >
                  <el-icon><ArrowUp /></el-icon>
                </el-button>
                <el-button
                  :disabled="
                    idx === model.contentBlocks.length - 1 ||
                    loading ||
                    saving ||
                    deleting
                  "
                  text
                  @click="moveBlock(idx, idx + 1)"
                >
                  <el-icon><ArrowDown /></el-icon>
                </el-button>
                <el-popconfirm
                  title="确认删除该段落？"
                  confirm-button-text="删除"
                  confirm-button-type="danger"
                  cancel-button-text="取消"
                  @confirm="deleteBlock(idx)"
                >
                  <template #reference>
                    <el-button
                      type="danger"
                      text
                      :disabled="loading || saving || deleting"
                    >
                      <el-icon><DeleteIcon /></el-icon>
                    </el-button>
                  </template>
                </el-popconfirm>
              </el-space>
            </div>
          </template>

          <el-form label-width="90px">
            <el-form-item label="小标题">
              <el-input
                v-model="block.title"
                placeholder="请输入小标题（1~100）"
                clearable
              />
            </el-form-item>
            <el-form-item label="正文">
              <el-input
                v-model="block.content"
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 12 }"
                placeholder="请输入正文（1~20000）"
                resize="vertical"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <div
          v-if="model.contentBlocks.length === 0"
          class="rounded border border-dashed border-[var(--el-border-color)] p-6 text-center text-[13px] text-[var(--el-text-color-secondary)]"
        >
          暂无正文块，点击右上角“新增段落”开始编辑
        </div>
      </div>
    </el-card>
  </div>
</template>
