<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "SixtySFuelPrice"
});

type Encoding = "json" | "text" | "markdown";

type FuelItem = {
  name: string;
  price: number;
  price_desc: string;
};

type FuelTrend = {
  next_adjustment_date: string;
  direction: string;
  change_ton: number;
  change_ton_desc: string;
  change_liter_min: number;
  change_liter_max: number;
  change_liter_desc: string;
  description: string;
};

type FuelPriceData = {
  region: string;
  trend?: FuelTrend;
  items: FuelItem[];
  link: string;
  updated: string;
  updated_at: number;
};

type FuelPricePayload = {
  code: number;
  message: string;
  data: FuelPriceData;
};

const API_DOC_URL =
  "https://60s.viki.moe/v2/fuel-price?encoding=json&region=%E9%83%AB%E5%8E%BF";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/fuel-price"
  : "https://60s.viki.moe/v2/fuel-price";

const region = ref("");
const encoding = ref<Encoding>("json");
const loading = ref(false);
const fuelData = ref<FuelPriceData | null>(null);
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

function normalizeFuelItem(value: unknown): FuelItem | null {
  if (!isRecord(value)) return null;
  const name = asNonEmptyString(value["name"]);
  const price = asSafeNumber(value["price"]);
  const price_desc = asNonEmptyString(value["price_desc"]);
  if (!name || !price || !price_desc) return null;
  return { name, price, price_desc };
}

function normalizeTrend(value: unknown): FuelTrend | undefined {
  if (!isRecord(value)) return undefined;
  const next_adjustment_date = asNonEmptyString(value["next_adjustment_date"]);
  const direction = asNonEmptyString(value["direction"]);
  const change_ton = asSafeNumber(value["change_ton"]);
  const change_ton_desc = asNonEmptyString(value["change_ton_desc"]);
  const change_liter_min = asSafeNumber(value["change_liter_min"]);
  const change_liter_max = asSafeNumber(value["change_liter_max"]);
  const change_liter_desc = asNonEmptyString(value["change_liter_desc"]);
  const description = asNonEmptyString(value["description"]);
  if (
    !next_adjustment_date ||
    !direction ||
    !change_ton ||
    !change_ton_desc ||
    !change_liter_min ||
    !change_liter_max ||
    !change_liter_desc ||
    !description
  )
    return undefined;
  return {
    next_adjustment_date,
    direction,
    change_ton,
    change_ton_desc,
    change_liter_min,
    change_liter_max,
    change_liter_desc,
    description
  };
}

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("encoding", encoding.value);
  if (region.value.trim()) {
    params.set("region", region.value.trim());
  }
  return `${API_BASE_URL}?${params.toString()}`;
});

const metaSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  const d = fuelData.value;
  if (!d) return "-";
  const trendDesc = d.trend?.direction ? ` · ${d.trend.direction}` : "";
  return `${d.region} · ${d.items.length} 条${trendDesc}`;
});

async function fetchFuelPriceJson(signal: AbortSignal): Promise<FuelPriceData> {
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
    payload = JSON.parse(text) as FuelPricePayload;
  } catch {
    throw new Error("invalid_json");
  }
  if (!isRecord(payload)) throw new Error("invalid_payload");
  const code = payload["code"];
  if (typeof code !== "number") throw new Error("invalid_code");
  if (code !== 200) throw new Error("api_failed");
  const data = payload["data"];
  if (!isRecord(data)) throw new Error("invalid_data");

  const resolvedRegion = asNonEmptyString(data["region"]);
  const itemsRaw = data["items"];
  const link = asNonEmptyString(data["link"]);
  const updated = asNonEmptyString(data["updated"]);
  const updated_at = asSafeNumber(data["updated_at"]);
  if (
    !resolvedRegion ||
    !Array.isArray(itemsRaw) ||
    !link ||
    !updated ||
    !updated_at
  )
    throw new Error("invalid_data_shape");

  const items = itemsRaw.map(normalizeFuelItem).filter(Boolean) as FuelItem[];
  if (!items.length) throw new Error("invalid_items");

  return {
    region: resolvedRegion,
    trend: normalizeTrend(data["trend"]),
    items,
    link,
    updated,
    updated_at
  };
}

async function fetchFuelPriceText(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadFuelPrice(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";
  fuelData.value = null;
  textPayload.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      fuelData.value = await fetchFuelPriceJson(abort.signal);
    } else {
      textPayload.value = await fetchFuelPriceText(abort.signal);
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
  region.value = "";
  encoding.value = "json";
  void loadFuelPrice();
}

onMounted(() => {
  void loadFuelPrice();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">汽油价格</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：http://www.qiyoujiage.com</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-input
            v-model="region"
            clearable
            placeholder="地区（例如：郫县）"
            style="width: 220px"
            @keyup.enter="loadFuelPrice"
          />
          <el-radio-group v-model="encoding" @change="loadFuelPrice">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="text">Text</el-radio-button>
            <el-radio-button label="markdown">Markdown</el-radio-button>
          </el-radio-group>
          <el-button :loading="loading" @click="loadFuelPrice">
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
                <div class="text-[14px] font-semibold">油价数据</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ encoding === "json" ? fuelData?.updated || "-" : "-" }}
                </div>
              </div>
            </template>

            <div v-if="encoding !== 'json'" class="space-y-3">
              <el-input
                v-model="textPayload"
                type="textarea"
                :rows="24"
                readonly
                resize="vertical"
              />
            </div>

            <div v-else-if="fuelData" class="space-y-3">
              <el-card
                v-if="fuelData.trend"
                shadow="never"
                :body-style="{ padding: '10px 12px' }"
              >
                <div class="text-[13px] font-semibold">调价趋势</div>
                <div
                  class="mt-2 text-[13px] leading-6 text-[var(--el-text-color-regular)]"
                >
                  {{ fuelData.trend.description }}
                </div>
                <div
                  class="mt-2 flex flex-wrap gap-2 text-[12px] text-[var(--el-text-color-secondary)]"
                >
                  <el-tag
                    :type="
                      fuelData.trend.direction.includes('上')
                        ? 'danger'
                        : 'info'
                    "
                    effect="plain"
                  >
                    {{ fuelData.trend.change_ton_desc }}
                  </el-tag>
                  <el-tag effect="plain">{{
                    fuelData.trend.change_liter_desc
                  }}</el-tag>
                  <el-tag effect="plain">{{
                    fuelData.trend.next_adjustment_date
                  }}</el-tag>
                </div>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">地区油价</div>
                </template>
                <el-table :data="fuelData.items" size="small" border>
                  <el-table-column prop="name" label="品类" min-width="120" />
                  <el-table-column prop="price" label="价格" min-width="100" />
                  <el-table-column
                    prop="price_desc"
                    label="价格说明"
                    min-width="180"
                  />
                </el-table>
              </el-card>

              <el-descriptions :column="1" size="small" border>
                <el-descriptions-item label="地区">
                  {{ fuelData.region }}
                </el-descriptions-item>
                <el-descriptions-item label="来源链接">
                  <a
                    :href="fuelData.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="break-all text-[var(--el-color-primary)]"
                  >
                    {{ fuelData.link }}
                  </a>
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <div
              v-else
              class="flex h-[min(720px,calc(100vh-320px))] min-h-[260px] items-center justify-center rounded-md bg-[var(--el-fill-color-light)] p-3 text-[13px] text-[var(--el-text-color-secondary)]"
            >
              暂无数据，请尝试“刷新”
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
                <el-tag v-if="loading" type="warning" effect="plain">
                  加载中
                </el-tag>
                <el-tag
                  v-else-if="encoding === 'json' ? !!fuelData : !!textPayload"
                  type="success"
                  effect="plain"
                >
                  已获取
                </el-tag>
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="地区">
                {{ encoding === "json" ? fuelData?.region || "-" : "-" }}
              </el-descriptions-item>
              <el-descriptions-item label="条目数">
                {{
                  encoding === "json"
                    ? fuelData
                      ? fuelData.items.length
                      : "-"
                    : textPayload
                      ? `${textPayload.length} 字符`
                      : "-"
                }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ encoding === "json" ? fuelData?.updated || "-" : "-" }}
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
