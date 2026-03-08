<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";
import CopyDocument from "~icons/ep/copy-document";
import SwapLine from "~icons/ri/swap-line";

defineOptions({
  name: "SixtySExchangeRate"
});

type Encoding = "json" | "text" | "markdown";

type RateItem = {
  currency: string;
  rate: number;
};

type ExchangeRateData = {
  base_code: string;
  updated: string;
  updated_at: number;
  next_updated: string;
  next_updated_at: number;
  rates: RateItem[];
};

type ExchangeRatePayload = {
  code: number;
  message: string;
  data: ExchangeRateData;
};

type CurrencyMeta = {
  nameZh: string;
  symbol?: string;
};

const currencyMetaMap: Readonly<Record<string, CurrencyMeta>> = {
  AED: { nameZh: "阿联酋迪拉姆", symbol: "د.إ" },
  AFN: { nameZh: "阿富汗尼", symbol: "؋" },
  ALL: { nameZh: "阿尔巴尼列克", symbol: "Lek" },
  AMD: { nameZh: "亚美尼亚德拉姆", symbol: "֏" },
  ANG: { nameZh: "荷兰盾", symbol: "ƒ" },
  AOA: { nameZh: "安哥拉宽扎", symbol: "Kz" },
  ARS: { nameZh: "阿根廷比索", symbol: "$" },
  AUD: { nameZh: "澳大利亚元", symbol: "$" },
  AWG: { nameZh: "阿鲁巴或荷兰盾", symbol: "ƒ" },
  AZN: { nameZh: "阿塞拜疆马纳特", symbol: "₼" },
  BAM: { nameZh: "波斯尼亚可兑换马尔卡", symbol: "KM" },
  BBD: { nameZh: "巴巴多斯元", symbol: "$" },
  BDT: { nameZh: "孟加拉国塔卡", symbol: "৳" },
  BGN: { nameZh: "保加利亚列弗", symbol: "лв" },
  BHD: { nameZh: "巴林第纳尔", symbol: ".د.ب" },
  BIF: { nameZh: "布隆迪法郎", symbol: "Fr" },
  BMD: { nameZh: "百慕大元", symbol: "$" },
  BND: { nameZh: "文莱元", symbol: "$" },
  BOB: { nameZh: "玻利维亚诺", symbol: "$b" },
  BRL: { nameZh: "巴西雷亚尔", symbol: "R$" },
  BSD: { nameZh: "巴哈马元", symbol: "$" },
  BTN: { nameZh: "不丹努尔特鲁姆", symbol: "Nu." },
  BWP: { nameZh: "博茨瓦纳普拉", symbol: "P" },
  BYN: { nameZh: "白俄罗斯卢布", symbol: "Br" },
  BZD: { nameZh: "伯利兹元", symbol: "BZ$" },
  CAD: { nameZh: "加拿大元", symbol: "$" },
  CDF: { nameZh: "刚果法郎", symbol: "Fr" },
  CHF: { nameZh: "瑞士法郎", symbol: "CHF" },
  CLF: { nameZh: "智利计价单位", symbol: "" },
  CLP: { nameZh: "智利比索", symbol: "$" },
  CNH: { nameZh: "离岸人民币", symbol: "¥" },
  CNY: { nameZh: "人民币", symbol: "¥" },
  COP: { nameZh: "哥伦比亚比索", symbol: "$" },
  CRC: { nameZh: "哥斯达黎加科朗", symbol: "₡" },
  CUP: { nameZh: "古巴比索", symbol: "₱" },
  CVE: { nameZh: "佛得角埃斯库多", symbol: "$" },
  CZK: { nameZh: "捷克克朗", symbol: "Kč" },
  DJF: { nameZh: "吉布提法郎", symbol: "Fr" },
  DKK: { nameZh: "丹麦克朗", symbol: "kr" },
  DOP: { nameZh: "多米尼加比索", symbol: "RD$" },
  DZD: { nameZh: "阿尔及利亚第纳尔", symbol: "د.ج" },
  EGP: { nameZh: "埃及镑", symbol: "£" },
  ERN: { nameZh: "厄立特里亚纳克法", symbol: "Nfk" },
  ETB: { nameZh: "埃塞俄比亚比尔", symbol: "Br" },
  EUR: { nameZh: "欧元", symbol: "€" },
  FJD: { nameZh: "斐济元", symbol: "$" },
  FKP: { nameZh: "福克兰群岛镑", symbol: "£" },
  FOK: { nameZh: "法罗群岛克朗", symbol: "kr" },
  GEL: { nameZh: "格鲁吉亚拉里", symbol: "₾" },
  GGP: { nameZh: "根西镑", symbol: "£" },
  GHS: { nameZh: "加纳塞地", symbol: "₵" },
  GIP: { nameZh: "直布罗陀镑", symbol: "£" },
  GMD: { nameZh: "冈比亚达拉西", symbol: "D" },
  GNF: { nameZh: "几内亚法郎", symbol: "Fr" },
  GTQ: { nameZh: "危地马拉格查尔", symbol: "Q" },
  GYD: { nameZh: "圭亚那元", symbol: "$" },
  HKD: { nameZh: "港币", symbol: "$" },
  HNL: { nameZh: "洪都拉斯伦皮拉", symbol: "L" },
  HRK: { nameZh: "克罗地亚库纳", symbol: "kn" },
  HTG: { nameZh: "海地古德", symbol: "G" },
  HUF: { nameZh: "匈牙利福林", symbol: "Ft" },
  IDR: { nameZh: "印度尼西亚卢比", symbol: "Rp" },
  ILS: { nameZh: "以色列谢克尔", symbol: "₪" },
  IMP: { nameZh: "马恩岛镑", symbol: "£" },
  INR: { nameZh: "印度卢比", symbol: "₹" },
  IQD: { nameZh: "伊拉克第纳尔", symbol: "ع.د" },
  IRR: { nameZh: "伊朗里亚尔", symbol: "﷼" },
  ISK: { nameZh: "冰岛克朗", symbol: "kr" },
  JEP: { nameZh: "泽西镑", symbol: "£" },
  JMD: { nameZh: "牙买加元", symbol: "J$" },
  JOD: { nameZh: "约旦第纳尔", symbol: "د.ا" },
  JPY: { nameZh: "日元", symbol: "¥" },
  KES: { nameZh: "肯尼亚先令", symbol: "Sh" },
  KGS: { nameZh: "吉尔吉斯斯坦索姆", symbol: "лв" },
  KHR: { nameZh: "柬埔寨瑞尔", symbol: "៛" },
  KID: { nameZh: "基里巴斯元", symbol: "$" },
  KMF: { nameZh: "科摩罗法郎", symbol: "Fr" },
  KPW: { nameZh: "朝鲜元", symbol: "₩" },
  KRW: { nameZh: "韩元", symbol: "₩" },
  KWD: { nameZh: "科威特第纳尔", symbol: "د.ك" },
  KYD: { nameZh: "开曼元", symbol: "$" },
  KZT: { nameZh: "哈萨克斯坦坚戈", symbol: "лв" },
  LAK: { nameZh: "老挝基普", symbol: "₭" },
  LBP: { nameZh: "黎巴嫩镑", symbol: "£" },
  LKR: { nameZh: "斯里兰卡卢比", symbol: "₨" },
  LRD: { nameZh: "利比里亚元", symbol: "$" },
  LSL: { nameZh: "巴索托洛蒂", symbol: "L" },
  LYD: { nameZh: "利比亚第纳尔", symbol: "ل.د" },
  MAD: { nameZh: "摩洛哥迪拉姆", symbol: "د.م." },
  MDL: { nameZh: "摩尔多瓦列伊", symbol: "L" },
  MGA: { nameZh: "马尔加什阿里亚", symbol: "Ar" },
  MKD: { nameZh: "马其顿第纳尔", symbol: "ден" },
  MMK: { nameZh: "缅元", symbol: "Ks" },
  MNT: { nameZh: "蒙古图格里克", symbol: "₮" },
  MOP: { nameZh: "澳门元", symbol: "P" },
  MRU: { nameZh: "毛里塔尼亚乌吉亚", symbol: "UM" },
  MUR: { nameZh: "毛里求斯卢比", symbol: "₨" },
  MVR: { nameZh: "马尔代夫拉菲亚", symbol: ".ރ" },
  MWK: { nameZh: "马拉维克瓦查", symbol: "MK" },
  MXN: { nameZh: "墨西哥比索", symbol: "$" },
  MYR: { nameZh: "马来西亚林吉特", symbol: "RM" },
  MZN: { nameZh: "莫桑比克梅蒂卡尔", symbol: "MT" },
  NAD: { nameZh: "纳米比亚元", symbol: "$" },
  NGN: { nameZh: "尼日利亚奈拉", symbol: "₦" },
  NIO: { nameZh: "尼加拉瓜科多巴", symbol: "C$" },
  NOK: { nameZh: "挪威克朗", symbol: "kr" },
  NPR: { nameZh: "尼泊尔卢比", symbol: "₨" },
  NZD: { nameZh: "新西兰元", symbol: "$" },
  OMR: { nameZh: "阿曼里亚尔", symbol: "﷼" },
  PAB: { nameZh: "巴拿马巴波亚", symbol: "B/." },
  PEN: { nameZh: "秘鲁索尔", symbol: "S/." },
  PGK: { nameZh: "巴布亚新几内亚基那", symbol: "K" },
  PHP: { nameZh: "菲律宾比索", symbol: "₱" },
  PKR: { nameZh: "巴基斯坦卢比", symbol: "₨" },
  PLN: { nameZh: "波兰兹罗提", symbol: "zł" },
  PYG: { nameZh: "巴拉圭瓜拉尼", symbol: "Gs" },
  QAR: { nameZh: "卡塔尔里亚尔", symbol: "﷼" },
  RON: { nameZh: "罗马尼亚新列伊", symbol: "lei" },
  RSD: { nameZh: "塞尔维亚第纳尔", symbol: "Дин." },
  RUB: { nameZh: "俄罗斯卢布", symbol: "₽" },
  RWF: { nameZh: "卢旺达法郎", symbol: "Fr" },
  SAR: { nameZh: "沙特里亚尔", symbol: "﷼" },
  SBD: { nameZh: "所罗门群岛元", symbol: "$" },
  SCR: { nameZh: "塞舌尔卢比", symbol: "₨" },
  SDG: { nameZh: "苏丹镑", symbol: "ج.س." },
  SEK: { nameZh: "瑞典克朗", symbol: "kr" },
  SGD: { nameZh: "新加坡元", symbol: "$" },
  SHP: { nameZh: "圣赫勒拿镑", symbol: "£" },
  SLE: { nameZh: "塞拉利昂利昂", symbol: "Le" },
  SLL: { nameZh: "塞拉利昂利昂", symbol: "Le" },
  SOS: { nameZh: "索马里先令", symbol: "S" },
  SRD: { nameZh: "苏里南元", symbol: "$" },
  SSP: { nameZh: "南苏丹镑", symbol: "£" },
  STN: { nameZh: "圣多美多布拉", symbol: "Db" },
  SVC: { nameZh: "萨尔瓦多科朗", symbol: "$" },
  SYP: { nameZh: "叙利亚镑", symbol: "£" },
  SZL: { nameZh: "斯威士兰里兰吉尼", symbol: "L" },
  THB: { nameZh: "泰铢", symbol: "฿" },
  TJS: { nameZh: "塔吉克斯坦索莫尼", symbol: "ЅМ" },
  TMT: { nameZh: "土库曼斯坦马纳特", symbol: "m" },
  TND: { nameZh: "突尼斯第纳尔", symbol: "د.ت" },
  TOP: { nameZh: "汤加潘加", symbol: "T$" },
  TRY: { nameZh: "土耳其里拉", symbol: "₺" },
  TTD: { nameZh: "特立尼达元", symbol: "TT$" },
  TVD: { nameZh: "图瓦卢元", symbol: "$" },
  TWD: { nameZh: "新台币", symbol: "NT$" },
  TZS: { nameZh: "坦桑尼亚先令", symbol: "Sh" },
  UAH: { nameZh: "乌克兰格里夫纳", symbol: "₴" },
  UGX: { nameZh: "乌干达先令", symbol: "Sh" },
  USD: { nameZh: "美元", symbol: "$" },
  UYU: { nameZh: "乌拉圭比索", symbol: "$U" },
  UZS: { nameZh: "乌兹别克斯坦索姆", symbol: "лв" },
  VES: { nameZh: "委内瑞拉玻利瓦尔", symbol: "" },
  VND: { nameZh: "越南盾", symbol: "₫" },
  VUV: { nameZh: "瓦努阿图瓦图", symbol: "Vt" },
  WST: { nameZh: "萨摩亚塔拉", symbol: "T" },
  XAF: { nameZh: "中非金融合作法郎", symbol: "Fr" },
  XCD: { nameZh: "东加勒比元", symbol: "$" },
  XDR: { nameZh: "特别提款权", symbol: "XDR" },
  XOF: { nameZh: "CFA 法郎", symbol: "Fr" },
  XPF: { nameZh: "CFP 法郎", symbol: "Fr" },
  YER: { nameZh: "也门里亚尔", symbol: "﷼" },
  ZAR: { nameZh: "南非兰特", symbol: "R" },
  ZMW: { nameZh: "赞比亚克瓦查", symbol: "Z$" },
  ZWG: { nameZh: "津巴布韦金", symbol: "" },
  ZWL: { nameZh: "津巴布韦元", symbol: "" }
};

const API_DOC_URL = "https://60s.viki.moe/v2/exchange-rate?encoding=json";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/exchange-rate"
  : "https://60s.viki.moe/v2/exchange-rate";

const encoding = ref<Encoding>("json");
const currency = ref<string>("CNY");
const searchKeyword = ref<string>("");
const converterVisible = ref(false);
const converterAmount = ref<number>(1);
const converterKeyword = ref<string>("");
const converterSmartReverse = ref(true);

const loading = ref(false);
const exchangeRateData = ref<ExchangeRateData | null>(null);
const textPayload = ref<string>("");
const lastError = ref<string>("");

const ctrl = reactive<{ abort?: AbortController }>({});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCurrencyCode(raw: string): string {
  const c = raw.trim().toUpperCase();
  return c || "CNY";
}

function normalizeRateItem(value: unknown): RateItem | null {
  if (!isRecord(value)) return null;
  const currency = asNonEmptyString(value["currency"]).toUpperCase();
  const rate = value["rate"];
  if (!currency || typeof rate !== "number" || !Number.isFinite(rate))
    return null;
  return { currency, rate };
}

function normalizeExchangeRateData(value: unknown): ExchangeRateData {
  if (!isRecord(value)) throw new Error("invalid_data");

  const base_code = asNonEmptyString(value["base_code"]).toUpperCase();
  const updated = asNonEmptyString(value["updated"]);
  const updated_at = value["updated_at"];
  const next_updated = asNonEmptyString(value["next_updated"]);
  const next_updated_at = value["next_updated_at"];
  const ratesRaw = value["rates"];

  if (
    !base_code ||
    !updated ||
    typeof updated_at !== "number" ||
    !Number.isFinite(updated_at) ||
    !next_updated ||
    typeof next_updated_at !== "number" ||
    !Number.isFinite(next_updated_at) ||
    !Array.isArray(ratesRaw)
  ) {
    throw new Error("invalid_data_shape");
  }

  const rates = ratesRaw.map(normalizeRateItem).filter(Boolean) as RateItem[];
  if (!rates.length) throw new Error("invalid_rates");

  return {
    base_code,
    updated,
    updated_at,
    next_updated,
    next_updated_at,
    rates
  };
}

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("encoding", encoding.value);
  params.set("currency", normalizeCurrencyCode(currency.value));
  return `${API_BASE_URL}?${params.toString()}`;
});

const statusText = computed((): string => {
  if (loading.value) return "加载中";
  if (encoding.value === "json")
    return exchangeRateData.value ? "已获取" : "暂无";
  return textPayload.value ? "已获取" : "暂无";
});

const metaSummary = computed((): string => {
  const d = exchangeRateData.value;
  if (!d) return "-";
  return `${formatCurrencyLabel(d.base_code)} · ${d.updated}`;
});

function getCurrencyMeta(code: string): CurrencyMeta | null {
  const c = normalizeCurrencyCode(code);
  return currencyMetaMap[c] ?? null;
}

function formatCurrencyLabel(code: string): string {
  const c = normalizeCurrencyCode(code);
  const meta = getCurrencyMeta(c);
  if (!meta) return c;
  const symbol = meta.symbol?.trim() ? `（${meta.symbol.trim()}）` : "";
  return `${meta.nameZh} ${c}${symbol}`;
}

function formatCurrencyCompact(code: string): string {
  const c = normalizeCurrencyCode(code);
  const meta = getCurrencyMeta(c);
  if (!meta) return c;
  const symbol = meta.symbol?.trim() ? ` · ${meta.symbol.trim()}` : "";
  return `${c}${symbol}`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const s = value.toFixed(6);
  return s.replace(/\.?0+$/, "");
}

type ConverterRow = {
  leftCode: string;
  rightCode: string;
  unitRate: number;
  amountLeft: number;
  amountRight: number;
  displayText: string;
  hintText: string;
};

const filteredRates = computed((): RateItem[] => {
  const list = exchangeRateData.value?.rates ?? [];
  const rawKw = searchKeyword.value.trim();
  if (!rawKw) return list;
  const kwUpper = rawKw.toUpperCase();
  return list.filter(item => {
    if (item.currency.includes(kwUpper)) return true;
    const meta = getCurrencyMeta(item.currency);
    if (!meta) return false;
    return meta.nameZh.includes(rawKw);
  });
});

function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "-";
  return rate.toFixed(4);
}

const canOpenConverter = computed((): boolean => {
  return encoding.value === "json" && !!exchangeRateData.value;
});

const converterRows = computed((): ConverterRow[] => {
  const d = exchangeRateData.value;
  if (!d) return [];
  const baseCode = normalizeCurrencyCode(d.base_code);
  const kwRaw = converterKeyword.value.trim();
  const kwUpper = kwRaw.toUpperCase();
  const amount = Number.isFinite(converterAmount.value)
    ? converterAmount.value
    : 1;

  return d.rates
    .filter(item => {
      if (!kwRaw) return true;
      if (item.currency.includes(kwUpper)) return true;
      const meta = getCurrencyMeta(item.currency);
      if (!meta) return false;
      return meta.nameZh.includes(kwRaw);
    })
    .map(item => {
      const targetCode = normalizeCurrencyCode(item.currency);
      const rate = item.rate;
      const shouldReverse =
        converterSmartReverse.value &&
        targetCode !== baseCode &&
        typeof rate === "number" &&
        Number.isFinite(rate) &&
        rate > 0 &&
        rate < 1;

      const leftCode = shouldReverse ? targetCode : baseCode;
      const rightCode = shouldReverse ? baseCode : targetCode;
      const unitRate = shouldReverse ? 1 / rate : rate;
      const amountLeft = amount;
      const amountRight =
        Number.isFinite(unitRate) && unitRate > 0 ? amountLeft * unitRate : NaN;

      const displayText = `${formatNumber(amountLeft)} ${formatCurrencyLabel(
        leftCode
      )} = ${formatNumber(amountRight)} ${formatCurrencyLabel(rightCode)}`;
      const hintText = `1 ${formatCurrencyCompact(leftCode)} = ${formatNumber(
        unitRate
      )} ${formatCurrencyCompact(rightCode)}`;

      return {
        leftCode,
        rightCode,
        unitRate,
        amountLeft,
        amountRight,
        displayText,
        hintText
      };
    })
    .filter(
      row => row.leftCode && row.rightCode && Number.isFinite(row.unitRate)
    );
});

async function fetchExchangeRateJson(
  signal: AbortSignal
): Promise<ExchangeRateData> {
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
  return normalizeExchangeRateData(payload["data"]);
}

async function fetchExchangeRateText(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadExchangeRate(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";
  exchangeRateData.value = null;
  textPayload.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      const data = await fetchExchangeRateJson(abort.signal);
      exchangeRateData.value = data;
    } else {
      const text = await fetchExchangeRateText(abort.signal);
      textPayload.value = text;
    }
  } catch (e) {
    exchangeRateData.value = null;
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

async function copyRequestUrl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(apiUrl.value);
    message("已复制请求地址", { type: "success" });
  } catch {
    message("复制失败，请手动复制", { type: "warning" });
  }
}

function onCurrencyChange(): void {
  currency.value = normalizeCurrencyCode(currency.value);
  void loadExchangeRate();
}

function openConverter(): void {
  if (!canOpenConverter.value) return;
  converterAmount.value = 1;
  converterKeyword.value = "";
  converterSmartReverse.value = true;
  converterVisible.value = true;
}

onMounted(() => {
  currency.value = normalizeCurrencyCode(currency.value);
  void loadExchangeRate();
});

onBeforeUnmount(() => {
  if (ctrl.abort) ctrl.abort.abort();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">当日货币汇率</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-select
            v-model="encoding"
            style="width: 160px"
            :disabled="loading"
            @change="loadExchangeRate"
          >
            <el-option label="JSON（推荐）" value="json" />
            <el-option label="Text" value="text" />
            <el-option label="Markdown" value="markdown" />
          </el-select>

          <el-select
            v-model="currency"
            filterable
            allow-create
            default-first-option
            style="width: 160px"
            :disabled="loading"
            placeholder="货币代码（默认 CNY）"
            @change="onCurrencyChange"
            @blur="onCurrencyChange"
          >
            <el-option label="人民币 CNY（¥）" value="CNY" />
            <el-option label="美元 USD（$）" value="USD" />
            <el-option label="欧元 EUR（€）" value="EUR" />
            <el-option label="日元 JPY（¥）" value="JPY" />
            <el-option label="英镑 GBP（£）" value="GBP" />
            <el-option label="港币 HKD（$）" value="HKD" />
            <el-option label="澳元 AUD（$）" value="AUD" />
            <el-option label="加元 CAD（$）" value="CAD" />
            <el-option label="瑞士法郎 CHF（CHF）" value="CHF" />
            <el-option label="新加坡元 SGD（$）" value="SGD" />
            <el-option label="韩元 KRW（₩）" value="KRW" />
            <el-option label="泰铢 THB（฿）" value="THB" />
          </el-select>

          <el-button :loading="loading" @click="loadExchangeRate">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button :disabled="loading" @click="copyRequestUrl">
            <el-icon><CopyDocument /></el-icon>
            复制请求
          </el-button>
          <el-button
            type="primary"
            :disabled="!canOpenConverter"
            @click="openConverter"
          >
            <el-icon><SwapLine /></el-icon>
            换算
          </el-button>
        </el-space>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div class="space-y-4">
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="text-[14px] font-semibold">
                  {{ encoding === "json" ? "汇率列表" : "输出内容" }}
                </div>
                <div v-if="encoding === 'json'" class="flex items-center gap-2">
                  <el-input
                    v-model="searchKeyword"
                    clearable
                    style="width: 220px"
                    placeholder="筛选货币/中文名称（如 USD/美元）"
                  />
                </div>
              </div>
            </template>

            <div
              class="h-[min(900px,calc(100vh-320px))] min-h-[420px] overflow-hidden rounded-md bg-[var(--el-fill-color-light)]"
            >
              <div
                v-if="encoding === 'json'"
                class="h-full w-full overflow-auto p-2"
              >
                <el-table
                  v-if="exchangeRateData"
                  :data="filteredRates"
                  size="small"
                  stripe
                  style="width: 100%"
                >
                  <el-table-column label="货币" min-width="220">
                    <template #default="{ row }">
                      <div class="flex min-w-0 flex-col">
                        <div class="truncate text-[13px] font-semibold">
                          {{
                            getCurrencyMeta(row.currency)?.nameZh ||
                            row.currency
                          }}
                        </div>
                        <div
                          class="mt-0.5 truncate font-mono text-[12px] text-[var(--el-text-color-secondary)]"
                        >
                          {{ formatCurrencyCompact(row.currency) }}
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="汇率" align="right">
                    <template #default="{ row }">
                      <span class="font-mono">{{ formatRate(row.rate) }}</span>
                    </template>
                  </el-table-column>
                </el-table>

                <div
                  v-else
                  class="flex h-full items-center justify-center p-3 text-[13px] text-[var(--el-text-color-secondary)]"
                >
                  {{ loading ? "加载中…" : "暂无数据，请点击“刷新”" }}
                </div>
              </div>

              <div
                v-else
                class="h-full w-full overflow-auto rounded-md bg-[var(--el-bg-color)] p-3"
              >
                <pre
                  class="whitespace-pre-wrap break-words text-[13px] leading-6 text-[var(--el-text-color-primary)]"
                  >{{ textPayload || (loading ? "加载中…" : "暂无内容") }}</pre
                >
              </div>
            </div>
          </el-card>
        </div>

        <div>
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-[14px] font-semibold">接口信息</div>
                <el-tag
                  v-if="loading"
                  type="warning"
                  effect="plain"
                  size="small"
                >
                  加载中
                </el-tag>
                <el-tag
                  v-else-if="statusText === '已获取'"
                  type="success"
                  effect="plain"
                  size="small"
                >
                  已获取
                </el-tag>
                <el-tag v-else type="info" effect="plain" size="small">
                  暂无
                </el-tag>
              </div>
            </template>

            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="接口">
                <span class="break-all">{{ API_DOC_URL }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="请求">
                <span class="break-all">{{ apiUrl }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="输出">
                {{ encoding }}
              </el-descriptions-item>

              <template v-if="encoding === 'json'">
                <el-descriptions-item label="基准货币">
                  {{
                    exchangeRateData
                      ? formatCurrencyLabel(exchangeRateData.base_code)
                      : "-"
                  }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ exchangeRateData?.updated || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间戳">
                  {{ exchangeRateData?.updated_at ?? "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="下次更新">
                  {{ exchangeRateData?.next_updated || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="下次更新时间戳">
                  {{ exchangeRateData?.next_updated_at ?? "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="汇率条数">
                  {{ exchangeRateData?.rates?.length ?? "-" }}
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

    <el-dialog
      v-model="converterVisible"
      title="汇率换算"
      width="min(980px, calc(100vw - 32px))"
      destroy-on-close
    >
      <div class="space-y-3">
        <div class="text-[12px] text-[var(--el-text-color-secondary)]">
          <span
            >基准：{{
              exchangeRateData
                ? formatCurrencyLabel(exchangeRateData.base_code)
                : "-"
            }}</span
          >
          <span class="mx-2 text-[var(--el-border-color)]">|</span>
          <span>更新时间：{{ exchangeRateData?.updated || "-" }}</span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <el-input-number
            v-model="converterAmount"
            :min="0"
            :precision="6"
            controls-position="right"
            style="width: 220px"
          />
          <el-input
            v-model="converterKeyword"
            clearable
            style="width: 260px"
            placeholder="筛选货币/中文名称（如 USD/美元）"
          />
          <el-switch
            v-model="converterSmartReverse"
            inline-prompt
            active-text="智能反向"
            inactive-text="正向"
          />
        </div>

        <el-table
          v-if="converterRows.length"
          :data="converterRows"
          size="small"
          stripe
          style="width: 100%"
          height="520"
        >
          <el-table-column label="换算结果" min-width="520">
            <template #default="{ row }">
              <div class="min-w-0">
                <div class="truncate text-[13px] font-semibold">
                  {{ row.displayText }}
                </div>
                <div
                  class="mt-0.5 truncate font-mono text-[12px] text-[var(--el-text-color-secondary)]"
                >
                  {{ row.hintText }}
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单位汇率" align="right" width="160">
            <template #default="{ row }">
              <span class="font-mono">{{ formatNumber(row.unitRate) }}</span>
            </template>
          </el-table-column>
        </el-table>

        <div
          v-else
          class="flex h-[200px] items-center justify-center rounded-md bg-[var(--el-fill-color-light)] p-3 text-[13px] text-[var(--el-text-color-secondary)]"
        >
          暂无可展示数据
        </div>
      </div>
    </el-dialog>
  </div>
</template>
