<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import Link from "~icons/ep/link";
import CopyDocument from "~icons/ep/copy-document";

defineOptions({
  name: "SixtySBing"
});

type Encoding = "json" | "text" | "markdown" | "image";

type BingPayload = {
  code: number;
  message: string;
  data: {
    title: string;
    headline: string;
    description: string;
    main_text: string;
    cover: string;
    cover_4k: string;
    copyright: string;
    update_date: string;
    update_date_at: number;
  };
};

type BingData = BingPayload["data"];

const API_DOC_URL = "https://60s.viki.moe/v2/bing?encoding=json";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/bing"
  : "https://60s.viki.moe/v2/bing";

const encoding = ref<Encoding>("json");
const prefer4k = ref(true);

const loading = ref(false);
const bingData = ref<BingData | null>(null);
const textPayload = ref<string>("");
const imageObjectUrl = ref<string>("");
const lastError = ref<string>("");

const ctrl = reactive<{ abort?: AbortController }>({});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function guessFileExtFromUrl(rawUrl: string): string {
  const u = rawUrl.trim();
  if (!u) return "jpg";
  try {
    const url = new URL(u);
    const pathname = url.pathname;
    const m = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return m?.[1]?.toLowerCase() || "jpg";
  } catch {
    const m = u.split("?")[0]?.match(/\.([a-zA-Z0-9]+)$/);
    return m?.[1]?.toLowerCase() || "jpg";
  }
}

function revokeObjectUrl(url: string): void {
  const raw = (url ?? "").trim();
  if (!raw) return;
  if (!raw.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(raw);
  } catch {
    void 0;
  }
}

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("encoding", encoding.value);
  return `${API_BASE_URL}?${params.toString()}`;
});

const statusText = computed((): string => {
  if (loading.value) return "加载中";
  if (encoding.value === "json") return bingData.value ? "已获取" : "暂无";
  if (encoding.value === "image")
    return imageObjectUrl.value ? "已获取" : "暂无";
  return textPayload.value ? "已获取" : "暂无";
});

const previewUrl = computed((): string => {
  if (encoding.value === "image") return imageObjectUrl.value;
  const d = bingData.value;
  if (!d) return "";
  if (prefer4k.value && d.cover_4k) return d.cover_4k;
  return d.cover || d.cover_4k;
});

const previewLabel = computed((): string => {
  if (encoding.value === "image") return "API原图";
  if (prefer4k.value && bingData.value?.cover_4k) return "4K";
  return "标准";
});

const downloadName = computed((): string => {
  const baseDate =
    bingData.value?.update_date?.trim() ||
    new Date().toISOString().slice(0, 10);
  const ext = guessFileExtFromUrl(previewUrl.value);
  return `蓝友圈-必应每日壁纸-${baseDate}.${ext}`;
});

function normalizeBingData(value: unknown): BingData {
  if (!isRecord(value)) throw new Error("invalid_data");
  const title = asNonEmptyString(value["title"]);
  const headline = asNonEmptyString(value["headline"]);
  const description = asNonEmptyString(value["description"]);
  const main_text = asNonEmptyString(value["main_text"]);
  const cover = asNonEmptyString(value["cover"]);
  const cover_4k = asNonEmptyString(value["cover_4k"]);
  const copyright = asNonEmptyString(value["copyright"]);
  const update_date = asNonEmptyString(value["update_date"]);
  const update_date_at = value["update_date_at"];
  if (
    !title ||
    !headline ||
    !description ||
    !main_text ||
    !cover ||
    !cover_4k ||
    !copyright ||
    !update_date ||
    typeof update_date_at !== "number"
  ) {
    throw new Error("invalid_data_shape");
  }
  return {
    title,
    headline,
    description,
    main_text,
    cover,
    cover_4k,
    copyright,
    update_date,
    update_date_at
  };
}

async function fetchBingJson(signal: AbortSignal): Promise<BingData> {
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
  return normalizeBingData(payload["data"]);
}

async function fetchBingText(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function fetchBingImage(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "image/*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

async function loadBing(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";
  bingData.value = null;
  textPayload.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      const data = await fetchBingJson(abort.signal);
      bingData.value = data;
      if (imageObjectUrl.value) revokeObjectUrl(imageObjectUrl.value);
      imageObjectUrl.value = "";
    } else if (encoding.value === "image") {
      const url = await fetchBingImage(abort.signal);
      if (imageObjectUrl.value) revokeObjectUrl(imageObjectUrl.value);
      imageObjectUrl.value = url;
    } else {
      const text = await fetchBingText(abort.signal);
      textPayload.value = text;
      if (imageObjectUrl.value) revokeObjectUrl(imageObjectUrl.value);
      imageObjectUrl.value = "";
    }
  } catch (e) {
    if (imageObjectUrl.value) revokeObjectUrl(imageObjectUrl.value);
    imageObjectUrl.value = "";
    bingData.value = null;
    textPayload.value = "";
    const errMsg =
      e instanceof Error && e.message ? e.message : "unknown_error";
    lastError.value = errMsg;
    message("获取失败，请稍后重试", { type: "error" });
  } finally {
    window.clearTimeout(timer);
    loading.value = false;
  }
}

function openPreviewInNewTab(): void {
  const url = previewUrl.value.trim();
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyRequestUrl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(apiUrl.value);
    message("已复制请求地址", { type: "success" });
  } catch {
    message("复制失败，请手动复制", { type: "warning" });
  }
}

function downloadBlobUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadCurrent(): Promise<void> {
  const url = previewUrl.value.trim();
  if (!url) return;
  const filename = downloadName.value;

  if (url.startsWith("blob:")) {
    downloadBlobUrl(url, filename);
    return;
  }

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    try {
      downloadBlobUrl(blobUrl, filename);
    } finally {
      revokeObjectUrl(blobUrl);
    }
  } catch {
    openPreviewInNewTab();
  }
}

onMounted(() => {
  void loadBing();
});

onBeforeUnmount(() => {
  if (ctrl.abort) ctrl.abort.abort();
  if (imageObjectUrl.value) revokeObjectUrl(imageObjectUrl.value);
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">必应每日壁纸</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>输出：{{ encoding }}</span>
            <span
              v-if="encoding === 'json' && bingData?.update_date"
              class="mx-2 text-[var(--el-border-color)]"
              >|</span
            >
            <span v-if="encoding === 'json' && bingData?.update_date">
              更新：{{ bingData.update_date }}
            </span>
          </div>
        </div>

        <el-space wrap>
          <el-select
            v-model="encoding"
            style="width: 160px"
            :disabled="loading"
            @change="loadBing"
          >
            <el-option label="JSON（推荐）" value="json" />
            <el-option label="Text" value="text" />
            <el-option label="Markdown" value="markdown" />
            <el-option label="Image" value="image" />
          </el-select>

          <el-switch
            v-if="encoding === 'json'"
            v-model="prefer4k"
            inline-prompt
            active-text="4K"
            inactive-text="标清"
          />

          <el-button :loading="loading" @click="loadBing">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button :disabled="!previewUrl" @click="openPreviewInNewTab">
            <el-icon><Link /></el-icon>
            打开原图
          </el-button>
          <el-button
            type="primary"
            :disabled="!previewUrl"
            :loading="loading"
            @click="downloadCurrent"
          >
            <el-icon><Download /></el-icon>
            下载
          </el-button>
        </el-space>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div class="space-y-4">
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-[14px] font-semibold">预览</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  <span v-if="previewUrl"
                    >{{ previewLabel }} · {{ downloadName }}</span
                  >
                  <span v-else>-</span>
                </div>
              </div>
            </template>

            <div
              class="flex h-[min(900px,calc(100vh-320px))] min-h-[420px] items-center justify-center overflow-hidden rounded-md bg-[var(--el-fill-color-light)] p-3"
            >
              <el-image
                v-if="
                  previewUrl && encoding !== 'text' && encoding !== 'markdown'
                "
                :src="previewUrl"
                :preview-src-list="[previewUrl]"
                preview-teleported
                fit="contain"
                style="width: 100%; height: 100%"
                class="h-full w-full"
              />
              <div
                v-else-if="encoding === 'text' || encoding === 'markdown'"
                class="h-full w-full overflow-auto rounded-md bg-[var(--el-bg-color)] p-3"
              >
                <pre
                  class="whitespace-pre-wrap break-words text-[13px] leading-6 text-[var(--el-text-color-primary)]"
                  >{{ textPayload || "暂无内容" }}</pre
                >
              </div>
              <div
                v-else
                class="text-[13px] text-[var(--el-text-color-secondary)]"
              >
                {{ loading ? "加载中…" : "暂无内容，请点击“刷新”" }}
              </div>
            </div>
          </el-card>

          <el-card
            v-if="encoding === 'json'"
            shadow="never"
            :body-style="{ padding: '12px' }"
          >
            <template #header>
              <div class="text-[14px] font-semibold">壁纸文案</div>
            </template>

            <div v-if="bingData" class="space-y-3">
              <div class="text-[16px] font-semibold leading-6">
                {{ bingData.title }}
              </div>
              <div
                class="text-[13px] leading-6 text-[var(--el-text-color-regular)]"
              >
                {{ bingData.headline }}
              </div>
              <el-divider class="my-2" />
              <div class="text-[13px] leading-6">
                {{ bingData.description }}
              </div>
              <el-collapse>
                <el-collapse-item title="展开长描述" name="main_text">
                  <div class="whitespace-pre-line text-[13px] leading-6">
                    {{ bingData.main_text }}
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
            <div
              v-else
              class="flex min-h-[180px] items-center justify-center rounded-md bg-[var(--el-fill-color-light)] p-3 text-[13px] text-[var(--el-text-color-secondary)]"
            >
              暂无数据，请点击“刷新”
            </div>
          </el-card>
        </div>

        <div>
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-[14px] font-semibold">接口信息</div>
                <el-button link :disabled="loading" @click="copyRequestUrl">
                  <el-icon><CopyDocument /></el-icon>
                  复制请求
                </el-button>
              </div>
            </template>

            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="接口">
                <span class="break-all">{{ API_DOC_URL }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="请求">
                <span class="break-all">{{ apiUrl }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag v-if="loading" type="warning" effect="plain">
                  加载中
                </el-tag>
                <el-tag
                  v-else-if="statusText === '已获取'"
                  type="success"
                  effect="plain"
                >
                  已获取
                </el-tag>
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>

              <template v-if="encoding === 'json'">
                <el-descriptions-item label="标题">
                  {{ bingData?.title || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="版权方">
                  {{ bingData?.copyright || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ bingData?.update_date || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间戳">
                  {{ bingData?.update_date_at ?? "-" }}
                </el-descriptions-item>
              </template>

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
