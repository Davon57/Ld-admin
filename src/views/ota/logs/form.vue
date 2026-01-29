<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { FormInstance, FormRules } from "element-plus";
import QuestionFilled from "~icons/ep/question-filled";
import { message } from "@/utils/message";
import {
  type OtaChannel,
  type OtaLog,
  type OtaLogFaq,
  type OtaLogListParams,
  type OtaLogSection,
  type OtaPushStatus,
  createOtaLog,
  getOtaLogList,
  updateOtaLog
} from "@/api/ota";

defineOptions({
  name: "OtaLogForm"
});

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

type SectionDraft = {
  title: string;
  itemsText: string;
};

type FaqDraft = {
  question: string;
  answersText: string;
};

type LogFormModel = {
  otaLogId?: string;
  channel: OtaChannel;
  versionName: string;
  pushStatus: OtaPushStatus;
  publishedAt: string;
  packageSizeText: string;
  applicableModelsText: string;
  summary: string;
  seq: number;
  isEnabled: boolean;
  sections: SectionDraft[];
  cautionsText: string;
  faqs: FaqDraft[];
};

const logFormRules: FormRules<LogFormModel> = {
  channel: [{ required: true, message: "请选择渠道", trigger: "change" }],
  versionName: [{ required: true, message: "请输入版本号", trigger: "blur" }],
  pushStatus: [
    { required: true, message: "请选择推送状态", trigger: "change" }
  ],
  publishedAt: [
    { required: true, message: "请选择发布日期", trigger: "change" }
  ],
  applicableModelsText: [
    { required: true, message: "请输入适用车型文案", trigger: "blur" }
  ]
};

const route = useRoute();
const router = useRouter();

const isEditing = computed(() => route.name === "OtaLogEdit");
const otaLogId = computed(() => String(route.params.otaLogId ?? "").trim());
const pageTitle = computed(() => (isEditing.value ? "编辑 OTA" : "新增 OTA"));

const loading = ref(false);
const saving = ref(false);
const formRef = ref<FormInstance>();

const model = reactive<LogFormModel>({
  otaLogId: undefined,
  channel: "stable",
  versionName: "",
  pushStatus: "scheduled",
  publishedAt: "",
  packageSizeText: "",
  applicableModelsText: "",
  summary: "",
  seq: 0,
  isEnabled: true,
  sections: [],
  cautionsText: "",
  faqs: []
});

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean);
}

function parsePackageSizeTextToBytes(text: string): number | null {
  const raw = text.trim();
  if (!raw) return null;

  const normalized = raw.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0) return null;

  const unit = match[2].toUpperCase();
  const unitPower: Record<string, number> = {
    B: 0,
    KB: 1,
    MB: 2,
    GB: 3,
    TB: 4
  };

  const power = unitPower[unit];
  if (typeof power !== "number") return null;

  const bytes = Math.round(value * 1024 ** power);
  if (!Number.isFinite(bytes) || bytes < 0) return null;

  return bytes;
}

function normalizeSections(drafts: SectionDraft[]): OtaLogSection[] {
  return drafts
    .map(s => ({
      title: s.title.trim(),
      items: splitLines(s.itemsText)
    }))
    .filter(s => s.title && s.items.length > 0);
}

function normalizeFaqs(drafts: FaqDraft[]): OtaLogFaq[] {
  return drafts
    .map(f => ({
      question: f.question.trim(),
      answers: splitLines(f.answersText)
    }))
    .filter(f => f.question && f.answers.length > 0);
}

function toSectionDrafts(sections: OtaLogSection[] = []): SectionDraft[] {
  return sections.map(s => ({
    title: s.title,
    itemsText: (s.items ?? []).join("\n")
  }));
}

function toFaqDrafts(faqs: OtaLogFaq[] = []): FaqDraft[] {
  return faqs.map(f => ({
    question: f.question,
    answersText: (f.answers ?? []).join("\n")
  }));
}

async function fetchLogDetail(id: string): Promise<OtaLog | null> {
  try {
    const params: OtaLogListParams = {
      otaLogId: id,
      includeDetail: true,
      page: 1,
      pageSize: 1
    };
    const res = await getOtaLogList(params);
    return res.list[0] ?? null;
  } catch {
    return null;
  }
}

async function initForEdit(): Promise<void> {
  if (!isEditing.value) return;
  if (!otaLogId.value) {
    message("OTA 信息异常", { type: "error" });
    router.replace("/ota/logs");
    return;
  }

  loading.value = true;
  try {
    const detail = await fetchLogDetail(otaLogId.value);
    if (!detail) {
      message("未找到 OTA 数据", { type: "warning" });
      router.replace("/ota/logs");
      return;
    }

    model.otaLogId = detail.otaLogId;
    model.channel = detail.channel;
    model.versionName = detail.versionName ?? "";
    model.pushStatus = detail.pushStatus;
    model.publishedAt = detail.publishedAt ?? "";
    model.packageSizeText = detail.packageSizeText ?? "";
    model.applicableModelsText = detail.applicableModelsText ?? "";
    model.summary = detail.summary ?? "";
    model.seq = detail.seq ?? 0;
    model.isEnabled = detail.isEnabled ?? true;
    model.sections = toSectionDrafts(detail.sections ?? []);
    model.cautionsText = (detail.cautions ?? []).join("\n");
    model.faqs = toFaqDrafts(detail.faqs ?? []);
  } finally {
    loading.value = false;
  }
}

function addSection(): void {
  model.sections.push({ title: "", itemsText: "" });
}

function removeSection(index: number): void {
  model.sections.splice(index, 1);
}

function addFaq(): void {
  model.faqs.push({ question: "", answersText: "" });
}

function removeFaq(index: number): void {
  model.faqs.splice(index, 1);
}

function onCancel(): void {
  router.push("/ota/logs");
}

async function onSubmit(): Promise<void> {
  saving.value = true;
  try {
    await formRef.value?.validate();

    const packageSizeText = model.packageSizeText.trim();
    const computedPackageSizeBytes = packageSizeText
      ? parsePackageSizeTextToBytes(packageSizeText)
      : null;

    if (packageSizeText && computedPackageSizeBytes === null) {
      message("包大小格式无法识别（示例：1.2 GB）", { type: "warning" });
      return;
    }

    const payload = {
      channel: model.channel,
      versionName: model.versionName.trim(),
      pushStatus: model.pushStatus,
      publishedAt: model.publishedAt.trim(),
      packageSizeBytes: computedPackageSizeBytes,
      packageSizeText,
      applicableModelsText: model.applicableModelsText.trim(),
      summary: model.summary.trim(),
      seq: model.seq,
      isEnabled: model.isEnabled,
      sections: normalizeSections(model.sections),
      cautions: splitLines(model.cautionsText),
      faqs: normalizeFaqs(model.faqs)
    };

    if (!isEditing.value) {
      await createOtaLog(payload);
      router.push("/ota/logs");
      return;
    }

    if (!model.otaLogId) {
      message("OTA 信息异常", { type: "error" });
      return;
    }

    await updateOtaLog({ otaLogId: model.otaLogId, ...payload });
    router.push("/ota/logs");
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
        :rules="logFormRules"
        label-width="170px"
      >
        <el-form-item v-if="isEditing">
          <template #label>
            <span class="ota-form-label">
              <span>OTA日志ID</span>
              <el-tooltip content="示例：LD0007YZAB" placement="top">
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input :model-value="model.otaLogId" disabled />
        </el-form-item>

        <el-form-item prop="channel">
          <template #label>
            <span class="ota-form-label">
              <span>渠道</span>
              <el-tooltip content="stable=稳定版；beta=测试版" placement="top">
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select v-model="model.channel" class="w-full">
            <el-option
              v-for="opt in channelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="versionName">
          <template #label>
            <span class="ota-form-label">
              <span>版本号</span>
              <el-tooltip
                content="示例：V1.3.0 / V1.3.0-beta.1"
                placement="top"
              >
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="model.versionName" clearable />
        </el-form-item>

        <el-form-item prop="pushStatus">
          <template #label>
            <span class="ota-form-label">
              <span>推送状态</span>
              <el-tooltip
                content="scheduled=待推送；pushing=推送中；paused=已暂停；completed=已完成"
                placement="top"
              >
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select v-model="model.pushStatus" class="w-full">
            <el-option
              v-for="opt in pushStatusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="publishedAt">
          <template #label>
            <span class="ota-form-label">
              <span>发布日期</span>
              <el-tooltip content="示例：2026-01-03" placement="top">
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-date-picker
            v-model="model.publishedAt"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item prop="packageSizeText">
          <template #label>
            <span class="ota-form-label">
              <span>包大小展示</span>
              <el-tooltip content="示例：980 MB / 1.2 GB" placement="top">
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="model.packageSizeText" clearable />
        </el-form-item>

        <el-form-item prop="applicableModelsText">
          <template #label>
            <span class="ota-form-label">
              <span>适用车型文案</span>
              <el-tooltip
                content="示例：蓝电 SUV 全系、蓝电 轿车 2024 款"
                placement="top"
              >
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="model.applicableModelsText"
            type="textarea"
            :rows="4"
            resize="vertical"
          />
        </el-form-item>

        <el-form-item prop="summary">
          <template #label>
            <span class="ota-form-label">
              <span>升级内容（简述）</span>
              <el-tooltip content="示例：本次优化续航与稳定性" placement="top">
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="model.summary"
            type="textarea"
            :rows="4"
            resize="vertical"
          />
        </el-form-item>

        <el-form-item prop="seq">
          <template #label>
            <span class="ota-form-label">
              <span>排序号</span>
              <el-tooltip content="数字越小越靠前" placement="top">
                <el-icon class="ota-form-label__icon">
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
            <span class="ota-form-label">
              <span>启用</span>
              <el-tooltip content="启用后才会对外展示" placement="top">
                <el-icon class="ota-form-label__icon">
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

        <el-divider content-position="left">更新内容分组</el-divider>
        <el-space direction="vertical" alignment="stretch" class="w-full">
          <el-card
            v-for="(sec, index) in model.sections"
            :key="index"
            shadow="never"
          >
            <div class="flex justify-between items-center mb-2">
              <div class="text-[14px]">分组 {{ index + 1 }}</div>
              <el-button link type="danger" @click="removeSection(index)">
                删除分组
              </el-button>
            </div>
            <el-form-item label-width="110px">
              <template #label>
                <span class="ota-form-label">
                  <span>分组标题</span>
                  <el-tooltip content="示例：续航与能耗优化" placement="top">
                    <el-icon class="ota-form-label__icon">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input v-model="sec.title" clearable />
            </el-form-item>
            <el-form-item label-width="150px">
              <template #label>
                <span class="ota-form-label">
                  <span>要点(每行一条)</span>
                  <el-tooltip
                    content="示例：低温环境下电池预热策略优化（每行一条）"
                    placement="top"
                  >
                    <el-icon class="ota-form-label__icon">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input
                v-model="sec.itemsText"
                type="textarea"
                :rows="5"
                resize="vertical"
              />
            </el-form-item>
          </el-card>
          <div>
            <el-button type="primary" plain @click="addSection">
              新增分组
            </el-button>
          </div>
        </el-space>

        <el-divider content-position="left">注意事项</el-divider>
        <el-form-item label-width="170px">
          <template #label>
            <span class="ota-form-label">
              <span>注意事项(每行一条)</span>
              <el-tooltip content="示例：电量建议不低于 30%" placement="top">
                <el-icon class="ota-form-label__icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="model.cautionsText"
            type="textarea"
            :rows="6"
            resize="vertical"
          />
        </el-form-item>

        <el-divider content-position="left">常见问题</el-divider>
        <el-space direction="vertical" alignment="stretch" class="w-full">
          <el-card
            v-for="(faq, index) in model.faqs"
            :key="index"
            shadow="never"
          >
            <div class="flex justify-between items-center mb-2">
              <div class="text-[14px]">问题 {{ index + 1 }}</div>
              <el-button link type="danger" @click="removeFaq(index)">
                删除问题
              </el-button>
            </div>
            <el-form-item label-width="90px">
              <template #label>
                <span class="ota-form-label">
                  <span>问题</span>
                  <el-tooltip
                    content="示例：升级过程一直停在“正在校验/安装”，需要等多久？"
                    placement="top"
                  >
                    <el-icon class="ota-form-label__icon">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input v-model="faq.question" clearable />
            </el-form-item>
            <el-form-item label-width="150px">
              <template #label>
                <span class="ota-form-label">
                  <span>答案(每行一条)</span>
                  <el-tooltip
                    content="示例：弱网环境下建议连接 Wi-Fi"
                    placement="top"
                  >
                    <el-icon class="ota-form-label__icon">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input
                v-model="faq.answersText"
                type="textarea"
                :rows="5"
                resize="vertical"
              />
            </el-form-item>
          </el-card>
          <div>
            <el-button type="primary" plain @click="addFaq">新增问题</el-button>
          </div>
        </el-space>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.ota-form-label {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

.ota-form-label__icon {
  flex: 0 0 auto;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
}
</style>
