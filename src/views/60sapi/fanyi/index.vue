<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";
import SwapLine from "~icons/ri/swap-line";

defineOptions({
  name: "SixtySFanyi"
});

type Encoding = "json" | "text" | "markdown";

type LanguageItem = {
  code: string;
  label: string;
  alphabet: string;
};

type TranslatePart = {
  text: string;
  type: string;
  type_desc: string;
  pronounce: string;
};

type TranslateData = {
  source: TranslatePart;
  target: TranslatePart;
};

type TranslatePayload = {
  code: number;
  message: string;
  data: TranslateData;
};

type LangsPayload = {
  code: number;
  message: string;
  data: LanguageItem[];
};

const API_DOC_URL =
  "https://60s.viki.moe/v2/fanyi?encoding=json&text=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF";
const LANGS_DOC_URL = "https://60s.viki.moe/v2/fanyi/langs";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/fanyi"
  : "https://60s.viki.moe/v2/fanyi";
const LANGS_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/fanyi/langs"
  : "https://60s.viki.moe/v2/fanyi/langs";
const QUICK_LANGUAGE_PAIRS = [
  { from: "auto", to: "zh-CHS" },
  { from: "auto", to: "en" },
  { from: "auto", to: "ja" },
  { from: "auto", to: "ko" },
  { from: "zh-CHS", to: "en" },
  { from: "en", to: "zh-CHS" }
] as const;

const inputText = ref("こんにちは");
const fromLang = ref("auto");
const toLang = ref("auto");
const encoding = ref<Encoding>("json");

const loading = ref(false);
const langsLoading = ref(false);
const translateData = ref<TranslateData | null>(null);
const textPayload = ref("");
const lastError = ref("");
const langsError = ref("");
const languageList = ref<LanguageItem[]>([]);

const ctrl = reactive<{ translate?: AbortController; langs?: AbortController }>(
  {}
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLanguageItem(value: unknown): LanguageItem | null {
  if (!isRecord(value)) return null;
  const code = asNonEmptyString(value["code"]).toLowerCase();
  const label = asNonEmptyString(value["label"]);
  const alphabet = asNonEmptyString(value["alphabet"]).toUpperCase();
  if (!code || !label || !alphabet) return null;
  return { code, label, alphabet };
}

function normalizeTranslatePart(value: unknown): TranslatePart {
  if (!isRecord(value)) throw new Error("invalid_translate_part");
  const text = asNonEmptyString(value["text"]);
  const type = asNonEmptyString(value["type"]).toLowerCase();
  const type_desc = asNonEmptyString(value["type_desc"]);
  const pronounce = asNonEmptyString(value["pronounce"]);
  if (!text || !type || !type_desc) throw new Error("invalid_translate_part");
  return { text, type, type_desc, pronounce };
}

const languageMap = computed((): Readonly<Record<string, LanguageItem>> => {
  const map: Record<string, LanguageItem> = {};
  for (const item of languageList.value) {
    map[item.code] = item;
  }
  return map;
});

const languageOptions = computed((): LanguageItem[] => {
  const list = [...languageList.value].sort((a, b) => {
    if (a.alphabet !== b.alphabet) return a.alphabet.localeCompare(b.alphabet);
    return a.label.localeCompare(b.label, "zh-Hans-CN");
  });
  return [{ code: "auto", label: "自动检测", alphabet: "AUTO" }, ...list];
});

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("text", inputText.value.trim());
  params.set("from", fromLang.value);
  params.set("to", toLang.value);
  params.set("encoding", encoding.value);
  return `${API_BASE_URL}?${params.toString()}`;
});

const metaSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  const d = translateData.value;
  if (!d) return "-";
  return `${d.source.type_desc} → ${d.target.type_desc}`;
});

const statusText = computed((): string => {
  if (loading.value) return "加载中";
  if (encoding.value === "json") return translateData.value ? "已获取" : "暂无";
  return textPayload.value ? "已获取" : "暂无";
});

const langStatsText = computed((): string => {
  if (langsLoading.value) return "加载中";
  if (languageList.value.length) return `${languageList.value.length} 种`;
  return "暂无";
});

const quickLanguagePairs = computed(
  (): Array<{ key: string; from: string; to: string; label: string }> => {
    return QUICK_LANGUAGE_PAIRS.map(item => {
      const from = item.from;
      const to = item.to;
      return {
        key: `${from}->${to}`,
        from,
        to,
        label: `${getLangLabel(from)} → ${getLangLabel(to)}`
      };
    });
  }
);

function getLangLabel(code: string): string {
  const c = asNonEmptyString(code).toLowerCase();
  if (!c || c === "auto") return "自动检测";
  const item = languageMap.value[c];
  return item ? `${item.label}（${item.code}）` : c;
}

function getPronounceText(value: string): string {
  const v = asNonEmptyString(value);
  return v || "-";
}

function normalizeCurrentLanguages(): void {
  const from = asNonEmptyString(fromLang.value).toLowerCase() || "auto";
  const to = asNonEmptyString(toLang.value).toLowerCase() || "auto";
  const hasFrom = from === "auto" || !!languageMap.value[from];
  const hasTo = to === "auto" || !!languageMap.value[to];
  fromLang.value = hasFrom ? from : "auto";
  toLang.value = hasTo ? to : "auto";
}

async function fetchLangs(signal: AbortSignal): Promise<LanguageItem[]> {
  const res = await fetch(LANGS_BASE_URL, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(text) as LangsPayload;
  } catch {
    throw new Error("invalid_json");
  }
  if (!isRecord(payload)) throw new Error("invalid_payload");
  const code = payload["code"];
  const data = payload["data"];
  if (typeof code !== "number") throw new Error("invalid_code");
  if (code !== 200) throw new Error("api_failed");
  if (!Array.isArray(data)) throw new Error("invalid_data_shape");

  const list = data
    .map(normalizeLanguageItem)
    .filter(Boolean) as LanguageItem[];
  if (!list.length) throw new Error("invalid_data_shape");
  return list;
}

async function fetchTranslateJson(signal: AbortSignal): Promise<TranslateData> {
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
    payload = JSON.parse(text) as TranslatePayload;
  } catch {
    throw new Error("invalid_json");
  }
  if (!isRecord(payload)) throw new Error("invalid_payload");
  const code = payload["code"];
  if (typeof code !== "number") throw new Error("invalid_code");
  if (code !== 200) throw new Error("api_failed");

  const data = payload["data"];
  if (!isRecord(data)) throw new Error("invalid_data");
  const source = normalizeTranslatePart(data["source"]);
  const target = normalizeTranslatePart(data["target"]);
  return { source, target };
}

async function fetchTranslateText(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadLanguages(): Promise<void> {
  if (langsLoading.value) return;
  langsLoading.value = true;
  langsError.value = "";
  if (ctrl.langs) ctrl.langs.abort();
  const abort = new AbortController();
  ctrl.langs = abort;
  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    languageList.value = await fetchLangs(abort.signal);
    normalizeCurrentLanguages();
  } catch (e) {
    const errMsg =
      e instanceof Error && e.message ? e.message : "unknown_error";
    langsError.value = errMsg;
    message("语言列表加载失败，已回退为自动检测", { type: "warning" });
    languageList.value = [];
    fromLang.value = "auto";
    toLang.value = "auto";
  } finally {
    window.clearTimeout(timer);
    langsLoading.value = false;
  }
}

async function loadTranslate(): Promise<void> {
  if (loading.value) return;
  if (!inputText.value.trim()) {
    message("请输入要翻译的文本", { type: "warning" });
    return;
  }

  loading.value = true;
  lastError.value = "";
  translateData.value = null;
  textPayload.value = "";

  if (ctrl.translate) ctrl.translate.abort();
  const abort = new AbortController();
  ctrl.translate = abort;
  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      translateData.value = await fetchTranslateJson(abort.signal);
    } else {
      textPayload.value = await fetchTranslateText(abort.signal);
    }
  } catch (e) {
    const errMsg =
      e instanceof Error && e.message ? e.message : "unknown_error";
    lastError.value = errMsg;
    message("翻译失败，请稍后重试", { type: "error" });
  } finally {
    window.clearTimeout(timer);
    loading.value = false;
  }
}

function swapLanguage(): void {
  const left = fromLang.value;
  fromLang.value = toLang.value;
  toLang.value = left;
  void loadTranslate();
}

function applyQuickPair(from: string, to: string): void {
  fromLang.value = from;
  toLang.value = to;
  void loadTranslate();
}

function resetFilters(): void {
  inputText.value = "こんにちは";
  fromLang.value = "auto";
  toLang.value = "auto";
  encoding.value = "json";
  void loadTranslate();
}

onMounted(async () => {
  await loadLanguages();
  void loadTranslate();
});

onBeforeUnmount(() => {
  if (ctrl.translate) ctrl.translate.abort();
  if (ctrl.langs) ctrl.langs.abort();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">在线翻译</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：有道翻译 / 60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-radio-group v-model="encoding" @change="loadTranslate">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="text">Text</el-radio-button>
            <el-radio-button label="markdown">Markdown</el-radio-button>
          </el-radio-group>
          <el-button :loading="langsLoading" @click="loadLanguages">
            语言列表
          </el-button>
          <el-button :loading="loading" @click="loadTranslate">
            <el-icon><Refresh /></el-icon>
            翻译
          </el-button>
          <el-button :disabled="loading" @click="resetFilters">重置</el-button>
        </el-space>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div class="space-y-4">
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="text-[14px] font-semibold">输入与语言方向</div>
            </template>

            <div class="space-y-3">
              <el-input
                v-model="inputText"
                type="textarea"
                :rows="4"
                resize="vertical"
                placeholder="输入要翻译的文本"
                @keyup.enter.ctrl="loadTranslate"
              />

              <div class="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <el-select
                  v-model="fromLang"
                  filterable
                  clearable
                  placeholder="源语言"
                  @change="loadTranslate"
                >
                  <el-option
                    v-for="item in languageOptions"
                    :key="`from-${item.code}`"
                    :label="`${item.label}（${item.code}）`"
                    :value="item.code"
                  />
                </el-select>

                <el-button
                  class="w-full sm:w-auto"
                  :disabled="loading"
                  @click="swapLanguage"
                >
                  <el-icon><SwapLine /></el-icon>
                </el-button>

                <el-select
                  v-model="toLang"
                  filterable
                  clearable
                  placeholder="目标语言"
                  @change="loadTranslate"
                >
                  <el-option
                    v-for="item in languageOptions"
                    :key="`to-${item.code}`"
                    :label="`${item.label}（${item.code}）`"
                    :value="item.code"
                  />
                </el-select>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[12px] text-[var(--el-text-color-secondary)]">
                  常用方向
                </span>
                <el-button
                  v-for="item in quickLanguagePairs"
                  :key="item.key"
                  size="small"
                  :type="
                    fromLang === item.from && toLang === item.to
                      ? 'primary'
                      : 'default'
                  "
                  plain
                  @click="applyQuickPair(item.from, item.to)"
                >
                  {{ item.label }}
                </el-button>
              </div>
            </div>
          </el-card>

          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <div class="text-[14px] font-semibold">翻译结果</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ statusText }}
                </div>
              </div>
            </template>

            <div v-if="encoding !== 'json'">
              <el-input
                v-model="textPayload"
                type="textarea"
                :rows="14"
                readonly
                resize="vertical"
              />
            </div>

            <div v-else-if="translateData" class="space-y-3">
              <div
                class="rounded-md border border-[var(--el-border-color)] bg-[var(--el-fill-color-extra-light)] p-3"
              >
                <div class="text-[13px] font-semibold">源文本</div>
                <div
                  class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]"
                >
                  <span>{{ getLangLabel(translateData.source.type) }}</span>
                  <span class="mx-2 text-[var(--el-border-color)]">|</span>
                  <span
                    >发音：{{
                      getPronounceText(translateData.source.pronounce)
                    }}</span
                  >
                </div>
                <div class="mt-2 whitespace-pre-line text-[14px] leading-6">
                  {{ translateData.source.text }}
                </div>
              </div>

              <div
                class="rounded-md border border-[var(--el-border-color)] bg-[var(--el-fill-color-extra-light)] p-3"
              >
                <div class="text-[13px] font-semibold">目标文本</div>
                <div
                  class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]"
                >
                  <span>{{ getLangLabel(translateData.target.type) }}</span>
                  <span class="mx-2 text-[var(--el-border-color)]">|</span>
                  <span
                    >发音：{{
                      getPronounceText(translateData.target.pronounce)
                    }}</span
                  >
                </div>
                <div class="mt-2 whitespace-pre-line text-[14px] leading-6">
                  {{ translateData.target.text }}
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex h-[260px] items-center justify-center rounded-md bg-[var(--el-fill-color-light)] p-3 text-[13px] text-[var(--el-text-color-secondary)]"
            >
              暂无数据，请输入文本后点击翻译
            </div>
          </el-card>
        </div>

        <div>
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="text-[14px] font-semibold">接口信息</div>
            </template>

            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="翻译接口">
                <span class="break-all">{{ API_DOC_URL }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="语言接口">
                <span class="break-all">{{ LANGS_DOC_URL }}</span>
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
                    encoding === 'json' ? !!translateData : !!textPayload
                  "
                  type="success"
                  effect="plain"
                  >已获取</el-tag
                >
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="支持语言">
                {{ langStatsText }}
              </el-descriptions-item>
              <el-descriptions-item label="当前方向">
                {{ getLangLabel(fromLang) }} → {{ getLangLabel(toLang) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="lastError" label="翻译错误">
                <span class="break-all text-[var(--el-color-danger)]">
                  {{ lastError }}
                </span>
              </el-descriptions-item>
              <el-descriptions-item v-if="langsError" label="语言列表错误">
                <span class="break-all text-[var(--el-color-danger)]">
                  {{ langsError }}
                </span>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </div>
      </div>
    </el-card>
  </div>
</template>
