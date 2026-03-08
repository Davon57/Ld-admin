<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "SixtySAiNews"
});

type AiNewsItem = {
  title: string;
  detail: string;
  link: string;
  source: string;
  date: string;
};

type AiNewsPayload = {
  code: number;
  message: string;
  data: {
    date: string;
    news: AiNewsItem[];
  };
};

type AiNewsData = AiNewsPayload["data"];

const API_DOC_URL = "https://60s.viki.moe/v2/ai-news?encoding=json";
const API_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/ai-news"
  : "https://60s.viki.moe/v2/ai-news";

const loading = ref(false);
const aiNewsData = ref<AiNewsData | null>(null);
const lastError = ref<string>("");

const ctrl = reactive<{ abort?: AbortController }>({});

const selectedDate = ref<string>("");
const fetchAll = ref(false);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAiNewsItem(value: unknown): AiNewsItem | null {
  if (!isRecord(value)) return null;
  const title = asNonEmptyString(value["title"]);
  const detail = asNonEmptyString(value["detail"]);
  const link = asNonEmptyString(value["link"]);
  const source = asNonEmptyString(value["source"]);
  const date = asNonEmptyString(value["date"]);
  if (!title || !detail || !link || !source || !date) return null;
  return { title, detail, link, source, date };
}

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("encoding", "json");
  if (fetchAll.value) params.set("all", "1");
  if (selectedDate.value.trim()) params.set("date", selectedDate.value.trim());
  return `${API_URL}?${params.toString()}`;
});

const metaSummary = computed((): string => {
  const d = aiNewsData.value;
  if (!d) return "-";
  const count = d.news?.length ?? 0;
  return `${d.date || "-"} · ${count} 条`;
});

async function fetchAiNews(signal: AbortSignal): Promise<AiNewsData> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);

  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw new Error("invalid_json");
  }
  if (!isRecord(payload)) throw new Error("invalid_payload");

  const code = payload["code"];
  if (typeof code !== "number") throw new Error("invalid_code");
  if (code !== 200) throw new Error("api_failed");

  const data = payload["data"];
  if (!isRecord(data)) throw new Error("invalid_data");
  const date = asNonEmptyString(data["date"]);
  const news = data["news"];
  if (!date || !Array.isArray(news)) throw new Error("invalid_data_shape");

  const list = news.map(normalizeAiNewsItem).filter(Boolean) as AiNewsItem[];

  return {
    date,
    news: list
  };
}

async function loadAiNews(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    const data = await fetchAiNews(abort.signal);
    aiNewsData.value = data;
  } catch (e) {
    aiNewsData.value = null;
    const errMsg =
      e instanceof Error && e.message ? e.message : "unknown_error";
    lastError.value = errMsg;
    message("获取失败，请稍后重试", { type: "error" });
  } finally {
    window.clearTimeout(timer);
    loading.value = false;
  }
}

function resetFilters(): void {
  selectedDate.value = "";
  fetchAll.value = false;
  void loadAiNews();
}

onMounted(() => {
  void loadAiNews();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">AI资讯快报</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：ai-bot.cn / 60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-date-picker
            v-model="selectedDate"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            :clearable="true"
            style="width: 160px"
            @change="loadAiNews"
          />
          <el-checkbox
            v-model="fetchAll"
            label="拉取全部"
            @change="loadAiNews"
          />
          <el-button :loading="loading" @click="loadAiNews">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button :disabled="loading" @click="resetFilters">重置</el-button>
        </el-space>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-[14px] font-semibold">今日要闻</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ aiNewsData?.date || "-" }}
                </div>
              </div>
            </template>

            <div v-if="aiNewsData?.news?.length" class="space-y-3" role="list">
              <div
                v-for="(item, idx) in aiNewsData.news"
                :key="`${item.link}-${idx}`"
                class="rounded-md border border-[var(--el-border-color)] p-3"
                role="listitem"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <a
                      class="text-[14px] font-semibold text-[var(--el-color-primary)] hover:underline"
                      :href="item.link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ item.title }}
                    </a>
                    <div
                      class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]"
                    >
                      <span>{{ item.source }}</span>
                      <span class="mx-2 text-[var(--el-border-color)]">|</span>
                      <span>{{ item.date }}</span>
                    </div>
                  </div>
                </div>
                <div class="mt-2 whitespace-pre-line text-[13px] leading-6">
                  {{ item.detail }}
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex h-[min(720px,calc(100vh-320px))] min-h-[260px] items-center justify-center rounded-md bg-[var(--el-fill-color-light)] p-3 text-[13px] text-[var(--el-text-color-secondary)]"
            >
              暂无数据，请尝试“刷新”或选择日期（建议 22:00 后获取当天数据）
            </div>
          </el-card>
        </div>

        <div>
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="text-[14px] font-semibold">接口信息</div>
            </template>

            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="接口">
                <span class="break-all">{{ API_DOC_URL }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="请求">
                <span class="break-all">{{ apiUrl }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag v-if="loading" type="warning" effect="plain"
                  >加载中</el-tag
                >
                <el-tag
                  v-else-if="aiNewsData?.news?.length"
                  type="success"
                  effect="plain"
                  >已获取</el-tag
                >
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="新闻条数">
                {{ aiNewsData?.news?.length ?? "-" }}
              </el-descriptions-item>
              <el-descriptions-item v-if="lastError" label="错误">
                <span class="break-all text-[var(--el-color-danger)]">
                  {{ lastError }}
                </span>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </div>
      </div>
    </el-card>
  </div>
</template>
