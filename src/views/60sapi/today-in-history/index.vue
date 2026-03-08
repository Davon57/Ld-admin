<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "SixtySTodayInHistory"
});

type Encoding = "json" | "text" | "markdown";
type EventType = "death" | "event" | "birth";

type TodayInHistoryItem = {
  title: string;
  year: string;
  description: string;
  event_type: EventType;
  link: string;
};

type TodayInHistoryPayload = {
  code: number;
  message: string;
  data: {
    date: string;
    month: number;
    day: number;
    items: TodayInHistoryItem[];
  };
};

type TodayInHistoryData = TodayInHistoryPayload["data"];

const API_DOC_URL = "https://60s.viki.moe/v2/today-in-history?encoding=json";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/today-in-history"
  : "https://60s.viki.moe/v2/today-in-history";

const encoding = ref<Encoding>("json");
const selectedDate = ref<string>("");

const loading = ref(false);
const historyData = ref<TodayInHistoryData | null>(null);
const textPayload = ref<string>("");
const lastError = ref<string>("");

const ctrl = reactive<{ abort?: AbortController }>({});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLink(value: unknown): string {
  const raw = asNonEmptyString(value).replace(/`/g, " ").trim();
  if (!raw) return "";
  const tokens = raw.split(/\s+/).filter(Boolean);
  const candidate = tokens.find(t => /^https?:\/\//i.test(t)) || raw;
  try {
    return new URL(candidate).toString();
  } catch {
    return candidate;
  }
}

function normalizeEventType(value: unknown): EventType | null {
  const raw = asNonEmptyString(value).toLowerCase();
  if (raw === "death" || raw === "event" || raw === "birth") return raw;
  return null;
}

function normalizeItem(value: unknown): TodayInHistoryItem | null {
  if (!isRecord(value)) return null;
  const title = asNonEmptyString(value["title"]);
  const year = asNonEmptyString(value["year"]);
  const description = asNonEmptyString(value["description"]);
  const event_type = normalizeEventType(value["event_type"]);
  const link = normalizeLink(value["link"]);
  if (!title || !year || !description || !event_type || !link) return null;
  return { title, year, description, event_type, link };
}

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("encoding", encoding.value);
  if (selectedDate.value.trim()) params.set("date", selectedDate.value.trim());
  return `${API_BASE_URL}?${params.toString()}`;
});

const metaSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  const d = historyData.value;
  if (!d) return "-";
  return `${d.date || "-"} · ${d.items?.length ?? 0} 条`;
});

function eventTypeLabel(t: EventType): string {
  if (t === "birth") return "出生";
  if (t === "death") return "逝世";
  return "事件";
}

function eventTypeTag(t: EventType): "success" | "warning" | "info" {
  if (t === "birth") return "success";
  if (t === "death") return "warning";
  return "info";
}

async function fetchHistoryJson(
  signal: AbortSignal
): Promise<TodayInHistoryData> {
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
  const month = data["month"];
  const day = data["day"];
  const items = data["items"];
  if (!date || typeof month !== "number" || typeof day !== "number")
    throw new Error("invalid_data_shape");
  if (!Array.isArray(items)) throw new Error("invalid_data_shape");

  const list = items.map(normalizeItem).filter(Boolean) as TodayInHistoryItem[];
  return {
    date,
    month,
    day,
    items: list
  };
}

async function fetchHistoryText(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadHistory(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";
  historyData.value = null;
  textPayload.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      const data = await fetchHistoryJson(abort.signal);
      historyData.value = data;
    } else {
      const text = await fetchHistoryText(abort.signal);
      textPayload.value = text;
    }
  } catch (e) {
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
  encoding.value = "json";
  selectedDate.value = "";
  void loadHistory();
}

onMounted(() => {
  void loadHistory();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">历史上的今天</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：百度百科 / 60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-radio-group v-model="encoding" @change="loadHistory">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="text">Text</el-radio-button>
            <el-radio-button label="markdown">Markdown</el-radio-button>
          </el-radio-group>

          <el-date-picker
            v-model="selectedDate"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            :clearable="true"
            style="width: 160px"
            @change="loadHistory"
          />

          <el-button :loading="loading" @click="loadHistory">
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
                <div class="text-[14px] font-semibold">事件列表</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ encoding === "json" ? historyData?.date || "-" : "-" }}
                </div>
              </div>
            </template>

            <div v-if="encoding !== 'json'" class="space-y-3">
              <el-input
                v-model="textPayload"
                type="textarea"
                :rows="18"
                readonly
                resize="vertical"
              />
            </div>

            <div
              v-else-if="historyData?.items?.length"
              class="space-y-3"
              role="list"
            >
              <div
                v-for="(item, idx) in historyData.items"
                :key="`${item.link}-${idx}`"
                class="rounded-md border border-[var(--el-border-color)] p-3"
                role="listitem"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <div
                        class="text-[12px] text-[var(--el-text-color-secondary)]"
                      >
                        {{ item.year }}
                      </div>
                      <el-tag
                        :type="eventTypeTag(item.event_type)"
                        effect="plain"
                        size="small"
                      >
                        {{ eventTypeLabel(item.event_type) }}
                      </el-tag>
                    </div>

                    <a
                      class="mt-1 block text-[14px] font-semibold text-[var(--el-color-primary)] hover:underline"
                      :href="item.link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ item.title }}
                    </a>
                  </div>
                </div>
                <div class="mt-2 whitespace-pre-line text-[13px] leading-6">
                  {{ item.description }}
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex h-[min(720px,calc(100vh-320px))] min-h-[260px] items-center justify-center rounded-md bg-[var(--el-fill-color-light)] p-3 text-[13px] text-[var(--el-text-color-secondary)]"
            >
              暂无数据，请尝试“刷新”或选择日期
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
                  v-else-if="
                    encoding === 'json' ? !!historyData : !!textPayload
                  "
                  type="success"
                  effect="plain"
                  >已获取</el-tag
                >
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="条目数">
                {{
                  encoding === "json"
                    ? (historyData?.items?.length ?? "-")
                    : textPayload
                      ? `${textPayload.length} 字符`
                      : "-"
                }}
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
