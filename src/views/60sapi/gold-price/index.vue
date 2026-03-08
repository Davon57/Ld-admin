<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "SixtySGoldPrice"
});

type Encoding = "json" | "text" | "markdown";

type GoldMetalItem = {
  name: string;
  sell_price: string;
  today_price: string;
  high_price: string;
  low_price: string;
  unit: string;
  updated: string;
  updated_at: number;
};

type GoldStoreItem = {
  brand: string;
  product: string;
  price: string;
  unit: string;
  formatted: string;
  updated: string;
  updated_at: number;
};

type GoldBankItem = {
  bank: string;
  product: string;
  price: string;
  unit: string;
  formatted: string;
  time: string;
  updated: string;
  updated_at: number;
};

type GoldRecycleItem = {
  type: string;
  price: string;
  unit: string;
  formatted: string;
  purity: string;
  updated: string;
  updated_at: number;
};

type GoldPriceData = {
  date: string;
  metals: GoldMetalItem[];
  stores: GoldStoreItem[];
  banks: GoldBankItem[];
  recycle: GoldRecycleItem[];
};

type GoldPricePayload = {
  code: number;
  message: string;
  data: GoldPriceData;
};

const API_DOC_URL = "https://60s.viki.moe/v2/gold-price?encoding=json";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/gold-price"
  : "https://60s.viki.moe/v2/gold-price";

const encoding = ref<Encoding>("json");
const loading = ref(false);
const goldData = ref<GoldPriceData | null>(null);
const textPayload = ref<string>("");
const lastError = ref<string>("");

const ctrl = reactive<{ abort?: AbortController }>({});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTimestampNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeMetalItem(value: unknown): GoldMetalItem | null {
  if (!isRecord(value)) return null;
  const name = asNonEmptyString(value["name"]);
  const sell_price = asNonEmptyString(value["sell_price"]);
  const today_price = asNonEmptyString(value["today_price"]);
  const high_price = asNonEmptyString(value["high_price"]);
  const low_price = asNonEmptyString(value["low_price"]);
  const unit = asNonEmptyString(value["unit"]);
  const updated = asNonEmptyString(value["updated"]);
  const updated_at = asTimestampNumber(value["updated_at"]);
  if (
    !name ||
    !sell_price ||
    !today_price ||
    !high_price ||
    !low_price ||
    !unit ||
    !updated ||
    !updated_at
  )
    return null;
  return {
    name,
    sell_price,
    today_price,
    high_price,
    low_price,
    unit,
    updated,
    updated_at
  };
}

function normalizeStoreItem(value: unknown): GoldStoreItem | null {
  if (!isRecord(value)) return null;
  const brand = asNonEmptyString(value["brand"]);
  const product = asNonEmptyString(value["product"]);
  const price = asNonEmptyString(value["price"]);
  const unit = asNonEmptyString(value["unit"]);
  const formatted = asNonEmptyString(value["formatted"]);
  const updated = asNonEmptyString(value["updated"]);
  const updated_at = asTimestampNumber(value["updated_at"]);
  if (
    !brand ||
    !product ||
    !price ||
    !unit ||
    !formatted ||
    !updated ||
    !updated_at
  )
    return null;
  return {
    brand,
    product,
    price,
    unit,
    formatted,
    updated,
    updated_at
  };
}

function normalizeBankItem(value: unknown): GoldBankItem | null {
  if (!isRecord(value)) return null;
  const bank = asNonEmptyString(value["bank"]);
  const product = asNonEmptyString(value["product"]);
  const price = asNonEmptyString(value["price"]);
  const unit = asNonEmptyString(value["unit"]);
  const formatted = asNonEmptyString(value["formatted"]);
  const time = asNonEmptyString(value["time"]);
  const updated = asNonEmptyString(value["updated"]);
  const updated_at = asTimestampNumber(value["updated_at"]);
  if (
    !bank ||
    !product ||
    !price ||
    !unit ||
    !formatted ||
    !time ||
    !updated ||
    !updated_at
  )
    return null;
  return {
    bank,
    product,
    price,
    unit,
    formatted,
    time,
    updated,
    updated_at
  };
}

function normalizeRecycleItem(value: unknown): GoldRecycleItem | null {
  if (!isRecord(value)) return null;
  const type = asNonEmptyString(value["type"]);
  const price = asNonEmptyString(value["price"]);
  const unit = asNonEmptyString(value["unit"]);
  const formatted = asNonEmptyString(value["formatted"]);
  const purity = asNonEmptyString(value["purity"]);
  const updated = asNonEmptyString(value["updated"]);
  const updated_at = asTimestampNumber(value["updated_at"]);
  if (
    !type ||
    !price ||
    !unit ||
    !formatted ||
    !purity ||
    !updated ||
    !updated_at
  )
    return null;
  return {
    type,
    price,
    unit,
    formatted,
    purity,
    updated,
    updated_at
  };
}

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("encoding", encoding.value);
  return `${API_BASE_URL}?${params.toString()}`;
});

const metaSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  const d = goldData.value;
  if (!d) return "-";
  const count =
    d.metals.length + d.stores.length + d.banks.length + d.recycle.length;
  return `${d.date || "-"} · 共 ${count} 条`;
});

async function fetchGoldPriceJson(signal: AbortSignal): Promise<GoldPriceData> {
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
    payload = JSON.parse(text) as GoldPricePayload;
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
  const metalsRaw = data["metals"];
  const storesRaw = data["stores"];
  const banksRaw = data["banks"];
  const recycleRaw = data["recycle"];
  if (!date) throw new Error("invalid_data_shape");
  if (
    !Array.isArray(metalsRaw) ||
    !Array.isArray(storesRaw) ||
    !Array.isArray(banksRaw) ||
    !Array.isArray(recycleRaw)
  )
    throw new Error("invalid_data_shape");

  return {
    date,
    metals: metalsRaw
      .map(normalizeMetalItem)
      .filter(Boolean) as GoldMetalItem[],
    stores: storesRaw
      .map(normalizeStoreItem)
      .filter(Boolean) as GoldStoreItem[],
    banks: banksRaw.map(normalizeBankItem).filter(Boolean) as GoldBankItem[],
    recycle: recycleRaw
      .map(normalizeRecycleItem)
      .filter(Boolean) as GoldRecycleItem[]
  };
}

async function fetchGoldPriceText(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadGoldPrice(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";
  goldData.value = null;
  textPayload.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      goldData.value = await fetchGoldPriceJson(abort.signal);
    } else {
      textPayload.value = await fetchGoldPriceText(abort.signal);
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
  void loadGoldPrice();
}

onMounted(() => {
  void loadGoldPrice();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">黄金价格</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：http://www.huangjinjiage.cn/jinrijinjia.html</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-radio-group v-model="encoding" @change="loadGoldPrice">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="text">Text</el-radio-button>
            <el-radio-button label="markdown">Markdown</el-radio-button>
          </el-radio-group>
          <el-button :loading="loading" @click="loadGoldPrice">
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
                <div class="text-[14px] font-semibold">价格数据</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ encoding === "json" ? goldData?.date || "-" : "-" }}
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

            <div v-else-if="goldData" class="space-y-3">
              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">金属行情</div>
                </template>
                <el-table :data="goldData.metals" size="small" border>
                  <el-table-column prop="name" label="品类" min-width="90" />
                  <el-table-column
                    prop="sell_price"
                    label="卖出价"
                    min-width="110"
                  />
                  <el-table-column
                    prop="today_price"
                    label="今日开盘"
                    min-width="110"
                  />
                  <el-table-column
                    prop="high_price"
                    label="今日最高"
                    min-width="110"
                  />
                  <el-table-column
                    prop="low_price"
                    label="今日最低"
                    min-width="110"
                  />
                  <el-table-column prop="unit" label="单位" min-width="80" />
                  <el-table-column
                    prop="updated"
                    label="更新时间"
                    min-width="160"
                  />
                </el-table>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">金店报价</div>
                </template>
                <el-table :data="goldData.stores" size="small" border>
                  <el-table-column prop="brand" label="品牌" min-width="100" />
                  <el-table-column
                    prop="product"
                    label="产品"
                    min-width="120"
                  />
                  <el-table-column prop="price" label="价格" min-width="100" />
                  <el-table-column prop="unit" label="单位" min-width="80" />
                  <el-table-column
                    prop="formatted"
                    label="展示"
                    min-width="180"
                  />
                  <el-table-column
                    prop="updated"
                    label="更新时间"
                    min-width="160"
                  />
                </el-table>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">银行报价</div>
                </template>
                <el-table :data="goldData.banks" size="small" border>
                  <el-table-column prop="bank" label="银行" min-width="110" />
                  <el-table-column
                    prop="product"
                    label="产品"
                    min-width="120"
                  />
                  <el-table-column prop="price" label="价格" min-width="100" />
                  <el-table-column prop="unit" label="单位" min-width="80" />
                  <el-table-column prop="time" label="时间" min-width="110" />
                  <el-table-column
                    prop="formatted"
                    label="展示"
                    min-width="180"
                  />
                  <el-table-column
                    prop="updated"
                    label="更新时间"
                    min-width="160"
                  />
                </el-table>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">回收价格</div>
                </template>
                <el-table :data="goldData.recycle" size="small" border>
                  <el-table-column prop="type" label="类型" min-width="100" />
                  <el-table-column prop="price" label="价格" min-width="100" />
                  <el-table-column prop="unit" label="单位" min-width="80" />
                  <el-table-column prop="purity" label="纯度" min-width="120" />
                  <el-table-column
                    prop="formatted"
                    label="展示"
                    min-width="180"
                  />
                  <el-table-column
                    prop="updated"
                    label="更新时间"
                    min-width="160"
                  />
                </el-table>
              </el-card>
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
                <el-tag v-if="loading" type="warning" effect="plain"
                  >加载中</el-tag
                >
                <el-tag
                  v-else-if="encoding === 'json' ? !!goldData : !!textPayload"
                  type="success"
                  effect="plain"
                  >已获取</el-tag
                >
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="日期">
                {{ encoding === "json" ? goldData?.date || "-" : "-" }}
              </el-descriptions-item>
              <el-descriptions-item label="条目数">
                {{
                  encoding === "json"
                    ? goldData
                      ? goldData.metals.length +
                        goldData.stores.length +
                        goldData.banks.length +
                        goldData.recycle.length
                      : "-"
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
