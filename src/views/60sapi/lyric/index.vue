<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "SixtySLyric"
});

type Encoding = "json" | "text" | "markdown";

type LyricLine = {
  ms: number;
  time: string;
  label: string;
  lyric: string;
};

type LyricData = {
  title: string;
  artists: string[];
  album: string;
  offset: number;
  lyrics: LyricLine[];
  formatted: string;
  raw_lyric: string;
};

type LyricPayload = {
  code: number;
  message: string;
  data: LyricData;
};

const API_DOC_URL = "https://60s.viki.moe/v2/lyric?encoding=json&query=小宇";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/lyric"
  : "https://60s.viki.moe/v2/lyric";

const query = ref("小宇");
const encoding = ref<Encoding>("json");
const includeMeta = ref(false);

const loading = ref(false);
const lyricData = ref<LyricData | null>(null);
const textPayload = ref("");
const lastError = ref("");

const ctrl = reactive<{ abort?: AbortController }>({});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asSafeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function normalizeLyricLine(value: unknown): LyricLine | null {
  if (!isRecord(value)) return null;
  const ms = asSafeNumber(value["ms"]);
  const time = asNonEmptyString(value["time"]);
  const label = asNonEmptyString(value["label"]);
  const lyric = asNonEmptyString(value["lyric"]);
  if (!time || !label) return null;
  return { ms, time, label, lyric };
}

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("encoding", encoding.value);
  params.set("query", query.value.trim());
  if (includeMeta.value) params.set("clean", "false");
  return `${API_BASE_URL}?${params.toString()}`;
});

const artistText = computed((): string => {
  const list = lyricData.value?.artists ?? [];
  return list.length ? list.join(" / ") : "-";
});

const lyricsCount = computed(
  (): number => lyricData.value?.lyrics?.length ?? 0
);

const metaSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  const d = lyricData.value;
  if (!d) return "-";
  const song = d.title || "未命名";
  const artist = d.artists.length ? d.artists.join(" / ") : "未知歌手";
  return `${song} · ${artist}`;
});

const statusText = computed((): string => {
  if (loading.value) return "加载中";
  if (encoding.value === "json") return lyricData.value ? "已获取" : "暂无";
  return textPayload.value ? "已获取" : "暂无";
});

async function fetchLyricJson(signal: AbortSignal): Promise<LyricData> {
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
    payload = JSON.parse(text) as LyricPayload;
  } catch {
    throw new Error("invalid_json");
  }
  if (!isRecord(payload)) throw new Error("invalid_payload");
  const code = payload["code"];
  if (typeof code !== "number") throw new Error("invalid_code");
  if (code !== 200) throw new Error("api_failed");

  const data = payload["data"];
  if (!isRecord(data)) throw new Error("invalid_data");
  const title = asNonEmptyString(data["title"]);
  const artistsRaw = data["artists"];
  const album = asNonEmptyString(data["album"]);
  const offset = asSafeNumber(data["offset"]);
  const lyricsRaw = data["lyrics"];
  const formatted = asNonEmptyString(data["formatted"]);
  const raw_lyric = asNonEmptyString(data["raw_lyric"]);
  if (!title || !Array.isArray(artistsRaw) || !Array.isArray(lyricsRaw)) {
    throw new Error("invalid_data_shape");
  }
  const artists = artistsRaw
    .map(v => asNonEmptyString(v))
    .filter(Boolean)
    .slice(0, 20);
  const lyrics = lyricsRaw
    .map(normalizeLyricLine)
    .filter(Boolean) as LyricLine[];
  if (!artists.length || !lyrics.length) throw new Error("invalid_data_shape");
  return { title, artists, album, offset, lyrics, formatted, raw_lyric };
}

async function fetchLyricText(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadLyric(): Promise<void> {
  if (loading.value) return;
  if (!query.value.trim()) {
    message("请输入歌曲名称", { type: "warning" });
    return;
  }
  loading.value = true;
  lastError.value = "";
  lyricData.value = null;
  textPayload.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      lyricData.value = await fetchLyricJson(abort.signal);
    } else {
      textPayload.value = await fetchLyricText(abort.signal);
    }
  } catch (e) {
    const errMsg =
      e instanceof Error && e.message ? e.message : "unknown_error";
    lastError.value = errMsg;
    message("歌词获取失败，请稍后重试", { type: "error" });
  } finally {
    window.clearTimeout(timer);
    loading.value = false;
  }
}

function resetFilters(): void {
  query.value = "小宇";
  encoding.value = "json";
  includeMeta.value = false;
  void loadLyric();
}

onMounted(() => {
  void loadLyric();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">歌词搜索</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：QQ 音乐 / 60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-input
            v-model="query"
            clearable
            placeholder="输入歌曲名称"
            style="width: 220px"
            @keyup.enter="loadLyric"
          />
          <el-radio-group v-model="encoding" @change="loadLyric">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="text">Text</el-radio-button>
            <el-radio-button label="markdown">Markdown</el-radio-button>
          </el-radio-group>
          <el-switch
            v-model="includeMeta"
            inline-prompt
            active-text="含词曲"
            inactive-text="精简"
            @change="loadLyric"
          />
          <el-button :loading="loading" @click="loadLyric">
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
              <div class="flex items-center justify-between gap-2">
                <div class="text-[14px] font-semibold">歌词结果</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ statusText }}
                </div>
              </div>
            </template>

            <div v-if="encoding !== 'json'" class="space-y-3">
              <el-input
                v-model="textPayload"
                type="textarea"
                :rows="20"
                readonly
                resize="vertical"
              />
            </div>

            <div
              v-else-if="lyricData"
              class="space-y-3"
              role="list"
              aria-label="歌词时间轴列表"
            >
              <div
                class="rounded-md border border-[var(--el-border-color)] bg-[var(--el-fill-color-extra-light)] p-3"
              >
                <div class="text-[16px] font-semibold">
                  {{ lyricData.title }}
                </div>
                <div
                  class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]"
                >
                  <span>歌手：{{ artistText }}</span>
                  <span class="mx-2 text-[var(--el-border-color)]">|</span>
                  <span>专辑：{{ lyricData.album || "-" }}</span>
                </div>
              </div>

              <div
                class="max-h-[min(760px,calc(100vh-340px))] space-y-2 overflow-y-auto pr-1"
              >
                <div
                  v-for="(line, idx) in lyricData.lyrics"
                  :key="`${line.ms}-${idx}`"
                  class="rounded-md border border-[var(--el-border-color)] p-2.5"
                  role="listitem"
                >
                  <div
                    class="flex items-center justify-between gap-3 text-[12px] text-[var(--el-text-color-secondary)]"
                  >
                    <span>{{ line.time }}</span>
                    <span>{{ line.label }}</span>
                  </div>
                  <div class="mt-1 whitespace-pre-line text-[14px] leading-6">
                    {{ line.lyric || " " }}
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex h-[min(720px,calc(100vh-320px))] min-h-[260px] items-center justify-center rounded-md bg-[var(--el-fill-color-light)] p-3 text-[13px] text-[var(--el-text-color-secondary)]"
            >
              暂无数据，请输入歌曲名后刷新
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
                  v-else-if="encoding === 'json' ? !!lyricData : !!textPayload"
                  type="success"
                  effect="plain"
                  >已获取</el-tag
                >
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="行数">
                {{
                  encoding === "json"
                    ? lyricsCount || "-"
                    : textPayload
                      ? `${textPayload.length} 字符`
                      : "-"
                }}
              </el-descriptions-item>
              <el-descriptions-item v-if="encoding === 'json'" label="偏移">
                {{ lyricData?.offset ?? "-" }} ms
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
