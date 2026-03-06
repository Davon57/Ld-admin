<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";

defineOptions({
  name: "SixtySWorld"
});

type SixtySApiPayload = {
  code: number;
  message: string;
  data: {
    date: string;
    day_of_week?: string;
    lunar_date?: string;
    news: string[];
    tip?: string;
    created?: string;
    api_updated?: string;
    image?: string;
    cover?: string;
  };
};

type SixtySWorldData = SixtySApiPayload["data"];

const API_DOC_URL = "https://60s.viki.moe/v2/60s?encoding=json";
const API_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/60s?encoding=json"
  : API_DOC_URL;

const loading = ref(false);
const worldData = ref<SixtySWorldData | null>(null);
const imageDataUrl = ref<string>("");
const lastError = ref<string>("");

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

const metaSummary = computed((): string => {
  const d = worldData.value;
  if (!d) return "-";
  const parts = [d.date, d.day_of_week, d.lunar_date].filter(Boolean);
  return parts.join(" · ");
});

const downloadName = computed((): string => {
  const d = worldData.value;
  const date = d?.date?.trim() ? d.date.trim() : "60s";
  return `蓝友圈-60s-${date}.png`;
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const raw = (text ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return [];
  const tokens = tokenizeForMeasure(raw);
  const lines: string[] = [];
  let line = "";

  const pushLine = (): void => {
    const normalized = line.trimEnd();
    if (normalized) lines.push(normalized);
    line = "";
  };

  for (const token of tokens) {
    if (!line && token === " ") continue;
    const candidate = line + token;
    if (ctx.measureText(candidate.trimEnd()).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) pushLine();

    if (token === " ") continue;
    if (ctx.measureText(token).width <= maxWidth) {
      line = token;
      continue;
    }

    const chars = Array.from(token);
    let frag = "";
    for (const ch of chars) {
      const next = frag + ch;
      if (ctx.measureText(next).width <= maxWidth) {
        frag = next;
        continue;
      }
      if (frag) lines.push(frag);
      frag = ch;
    }
    if (frag) line = frag;
  }

  if (line.trim()) pushLine();
  return lines;
}

function truncateByWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const raw = (text ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (ctx.measureText(raw).width <= maxWidth) return raw;

  const ellipsis = "…";

  const tokens = tokenizeForMeasure(raw);
  let out = "";
  for (const token of tokens) {
    const next = out + token;
    const nextMeasure = next.trimEnd();
    if (ctx.measureText(nextMeasure + ellipsis).width > maxWidth) break;
    out = next;
  }
  const normalized = out.trimEnd();
  return normalized ? `${normalized}${ellipsis}` : ellipsis;
}

function formatDateZh(input: string): string {
  const raw = (input ?? "").trim();
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  if (!m) return raw;
  const y = m[1];
  const mm = String(Number(m[2]));
  const dd = String(Number(m[3]));
  return `${y}年${mm}月${dd}日`;
}

const ASCII_MEASURE_TOKEN_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%+.,:_-/#@&=?!~()[]{}<>$¥";

function isAsciiMeasureTokenChar(ch: string): boolean {
  return ch.length === 1 && ASCII_MEASURE_TOKEN_CHARS.includes(ch);
}

function tokenizeForMeasure(input: string): string[] {
  const raw = (input ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return [];

  const chars = Array.from(raw);
  const tokens: string[] = [];
  let buf = "";
  let lastSpace = false;

  for (const ch of chars) {
    if (ch === " ") {
      if (buf) {
        tokens.push(buf);
        buf = "";
      }
      if (!lastSpace) tokens.push(" ");
      lastSpace = true;
      continue;
    }

    lastSpace = false;
    if (isAsciiMeasureTokenChar(ch)) {
      buf += ch;
      continue;
    }

    if (buf) {
      tokens.push(buf);
      buf = "";
    }
    tokens.push(ch);
  }

  if (buf) tokens.push(buf);
  return tokens;
}

function drawBrandMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const r = size / 2;
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, "#EA580C");
  g.addColorStop(1, "#F59E0B");
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font =
    "800 18px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("蓝", x + r, y + r + 0.5);
  ctx.restore();
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("blob_failed"));
    }, type);
  });
}

async function buildPosterObjectUrl(data: SixtySWorldData): Promise<string> {
  const exportScale = 2;
  const width = 1080;
  const height = 1920;

  const canvas = document.createElement("canvas");
  canvas.width = width * exportScale;
  canvas.height = height * exportScale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_not_supported");
  ctx.scale(exportScale, exportScale);
  ctx.imageSmoothingEnabled = true;
  ctx.textBaseline = "top";

  const theme = {
    ink: "#2B1B12",
    inkStrong: "rgba(43,27,18,0.92)",
    inkMuted: "rgba(43,27,18,0.72)",
    divider: "rgba(43,27,18,0.14)",
    cardFill: "rgba(255,252,248,0.96)",
    shadow: "rgba(90,42,18,0.14)",
    accent: "#EA580C",
    badgeFill: "rgba(234,88,12,0.10)",
    badgeStroke: "rgba(234,88,12,0.22)",
    badgeText: "rgba(43,27,18,0.80)",
    footerFill: "rgba(255,233,210,0.72)",
    brandText: "rgba(43,27,18,0.62)"
  } as const;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#FFF5EE");
  bg.addColorStop(0.6, "#FFE8DA");
  bg.addColorStop(1, "#F9D8C2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cardX = 64;
  const cardY = 64;
  const cardW = width - cardX * 2;
  const cardH = height - cardY * 2;
  ctx.save();
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, 34);
  ctx.fillStyle = theme.cardFill;
  ctx.fill();
  ctx.shadowColor = theme.shadow;
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 10;
  ctx.fill();
  ctx.restore();

  const padding = 56;
  const contentX = cardX + padding;
  const contentW = cardW - padding * 2;
  let y = cardY + 62;

  ctx.font =
    "700 56px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const leftTitle = "每天 ";
  ctx.fillStyle = theme.ink;
  ctx.fillText(leftTitle, contentX, y + 26);
  const leftW = ctx.measureText(leftTitle).width;

  ctx.fillStyle = theme.accent;
  ctx.font =
    "900 60px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const midTitle = "60s";
  ctx.fillText(midTitle, contentX + leftW, y + 22);
  const midW = ctx.measureText(midTitle).width;

  ctx.fillStyle = theme.ink;
  ctx.font =
    "700 56px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("读懂世界", contentX + leftW + midW + 10, y + 26);

  const dayOfWeek = asNonEmptyString(data.day_of_week) || "星期";
  ctx.save();
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(43,27,18,0.78)";
  ctx.font =
    "800 72px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(dayOfWeek, contentX + contentW, y + 28);
  ctx.restore();

  y += 88;
  ctx.fillStyle = theme.inkMuted;
  ctx.font =
    "600 28px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const metaParts = [
    formatDateZh(asNonEmptyString(data.date)),
    asNonEmptyString(data.lunar_date)
      ? `农历 · ${asNonEmptyString(data.lunar_date)}`
      : ""
  ].filter(Boolean);
  const meta = truncateByWidth(ctx, metaParts.join("  ·  "), contentW);
  ctx.fillText(meta, contentX, y + 4);

  y += 50;
  ctx.save();
  ctx.beginPath();
  ctx.rect(contentX, y, contentW, 2);
  ctx.fillStyle = theme.divider;
  ctx.fill();
  ctx.restore();
  y += 22;

  const listTopY = y + 24;
  const footerReserve = 214;
  const maxY = cardY + cardH - footerReserve;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = theme.inkStrong;
  ctx.font =
    "500 26px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const itemGap = 14;
  const lineHeight = 40;
  const badgeSize = 30;
  const textStartX = contentX + badgeSize + 18;
  const textMaxW = Math.max(1, contentX + contentW - textStartX);
  const sampleMetrics = ctx.measureText("国");
  const firstLineCenterOffsetY =
    ((sampleMetrics.actualBoundingBoxAscent || 0) +
      (sampleMetrics.actualBoundingBoxDescent || 0)) /
      2 || 16;

  y = listTopY;
  const items = (Array.isArray(data.news) ? data.news : []).slice(0, 15);
  for (let i = 0; i < items.length; i += 1) {
    const text = asNonEmptyString(items[i]);
    if (!text) continue;

    const remainingItems = items.length - i;
    const remainingHeight = Math.max(0, maxY - y);
    const avgLines = Math.floor(
      remainingHeight / Math.max(1, remainingItems) / lineHeight
    );
    let lineBudget = Math.min(2, Math.max(1, avgLines));

    const lines = wrapTextLines(ctx, text, textMaxW);
    if (lines.length === 0) continue;
    let showLines = lines.slice(0, lineBudget);
    if (lines.length > lineBudget && showLines.length > 0) {
      const lastIdx = showLines.length - 1;
      showLines[lastIdx] = truncateByWidth(ctx, showLines[lastIdx], textMaxW);
    }

    let needH = showLines.length * lineHeight;
    if (needH > remainingHeight) {
      lineBudget = 1;
      showLines = [truncateByWidth(ctx, text, textMaxW)];
      needH = lineHeight;
    }

    const badgeX = contentX;
    const badgeY = y + firstLineCenterOffsetY - badgeSize / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      badgeX + badgeSize / 2,
      badgeY + badgeSize / 2,
      badgeSize / 2,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.fillStyle = theme.badgeFill;
    ctx.fill();
    ctx.strokeStyle = theme.badgeStroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.badgeText;
    ctx.font =
      "700 18px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(String(i + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2);
    ctx.restore();

    for (let li = 0; li < showLines.length; li += 1) {
      ctx.fillText(showLines[li], textStartX, y + li * lineHeight);
    }

    y += needH + itemGap;
  }
  ctx.restore();

  const footerY = cardY + cardH - 176;
  const footerH = 128;
  ctx.save();
  roundedRectPath(ctx, contentX, footerY, contentW, footerH, 22);
  ctx.fillStyle = theme.footerFill;
  ctx.fill();
  ctx.restore();

  const tip = asNonEmptyString(data.tip);
  const tipText = tip || "祝你今天顺利。";
  ctx.save();
  ctx.fillStyle = theme.inkStrong;
  ctx.font =
    "italic 700 30px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const tipMaxW = contentW - 64;
  const tipLines = wrapTextLines(ctx, tipText, tipMaxW);
  const showTip = tipLines
    .slice(0, 2)
    .map(v => truncateByWidth(ctx, v, tipMaxW));
  const tipLineHeight = 44;

  ctx.translate(contentX + contentW / 2, footerY + footerH / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(43,27,18,0.14)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  const totalH = showTip.length > 0 ? showTip.length * tipLineHeight : 0;
  const firstY =
    totalH > 0 ? -totalH / 2 + tipLineHeight / 2 : tipLineHeight / 2;
  for (let i = 0; i < showTip.length; i += 1) {
    ctx.fillText(showTip[i], 0, firstY + i * tipLineHeight);
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = theme.brandText;
  ctx.font =
    "600 20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "alphabetic";
  const brandY = cardY + cardH - 24;
  const rightText = "蓝友圈 http://davon-ld.icu";
  const rightW = ctx.measureText(rightText).width;
  const gap = 16;

  const updatedAt =
    asNonEmptyString(data.api_updated) ||
    asNonEmptyString(data.created) ||
    asNonEmptyString(data.date);
  const leftTextRaw = `共15条国内外精选新闻 更新于 ${updatedAt || "-"}`;
  const leftMaxW = Math.max(1, contentW - rightW - gap);
  const leftText = truncateByWidth(ctx, leftTextRaw, leftMaxW);

  ctx.textAlign = "left";
  ctx.fillText(leftText, contentX, brandY);
  ctx.textAlign = "right";
  ctx.fillText(rightText, contentX + contentW, brandY);
  ctx.restore();

  const blob = await canvasToBlob(canvas, "image/png");
  return URL.createObjectURL(blob);
}

async function fetch60sWorldData(
  signal: AbortSignal
): Promise<SixtySWorldData> {
  const res = await fetch(API_URL, {
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

  return {
    date,
    day_of_week: asNonEmptyString(data["day_of_week"]) || undefined,
    lunar_date: asNonEmptyString(data["lunar_date"]) || undefined,
    news: news.map(v => asNonEmptyString(v)).filter(Boolean),
    tip: asNonEmptyString(data["tip"]) || undefined,
    created: asNonEmptyString(data["created"]) || undefined,
    api_updated: asNonEmptyString(data["api_updated"]) || undefined,
    image: asNonEmptyString(data["image"]) || undefined,
    cover: asNonEmptyString(data["cover"]) || undefined
  };
}

const ctrl = reactive<{ abort?: AbortController }>({});

async function loadAndGenerate(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    const data = await fetch60sWorldData(abort.signal);
    worldData.value = data;
    const url = await buildPosterObjectUrl(data);
    if (imageDataUrl.value) revokeObjectUrl(imageDataUrl.value);
    imageDataUrl.value = url;
  } catch (e) {
    worldData.value = null;
    if (imageDataUrl.value) revokeObjectUrl(imageDataUrl.value);
    imageDataUrl.value = "";
    const errMsg =
      e instanceof Error && e.message ? e.message : "unknown_error";
    lastError.value = errMsg;
    message("获取或生成失败，请稍后重试", { type: "error" });
  } finally {
    window.clearTimeout(timer);
    loading.value = false;
  }
}

function downloadImage(): void {
  if (!imageDataUrl.value) return;
  const a = document.createElement("a");
  a.href = imageDataUrl.value;
  a.download = downloadName.value;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

onMounted(() => {
  void loadAndGenerate();
});

onBeforeUnmount(() => {
  if (imageDataUrl.value) revokeObjectUrl(imageDataUrl.value);
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">60S看世界</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
            <span
              v-if="worldData?.api_updated"
              class="mx-2 text-[var(--el-border-color)]"
              >|</span
            >
            <span v-if="worldData?.api_updated"
              >接口更新：{{ worldData.api_updated }}</span
            >
          </div>
        </div>

        <el-space wrap>
          <el-button :loading="loading" @click="loadAndGenerate">
            <el-icon><Refresh /></el-icon>
            刷新并生成
          </el-button>
          <el-button
            type="primary"
            :disabled="!imageDataUrl"
            :loading="loading"
            @click="downloadImage"
          >
            <el-icon><Download /></el-icon>
            下载图片
          </el-button>
        </el-space>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-[14px] font-semibold">图片预览</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ downloadName }}
                </div>
              </div>
            </template>

            <div
              class="flex h-[min(900px,calc(100vh-320px))] min-h-[420px] items-center justify-center overflow-hidden rounded-md bg-[var(--el-fill-color-light)] p-3"
            >
              <el-image
                v-if="imageDataUrl"
                :src="imageDataUrl"
                :preview-src-list="[imageDataUrl]"
                preview-teleported
                fit="contain"
                style="width: 100%; height: 100%"
                class="h-full w-full"
              />
              <div
                v-else
                class="text-[13px] text-[var(--el-text-color-secondary)]"
              >
                暂无图片，请点击“刷新并生成”
              </div>
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
              <el-descriptions-item label="状态">
                <el-tag v-if="loading" type="warning" effect="plain"
                  >加载中</el-tag
                >
                <el-tag v-else-if="imageDataUrl" type="success" effect="plain"
                  >已生成</el-tag
                >
                <el-tag v-else type="info" effect="plain">未生成</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="日期">
                {{ worldData?.date || "-" }}
              </el-descriptions-item>
              <el-descriptions-item label="星期">
                {{ worldData?.day_of_week || "-" }}
              </el-descriptions-item>
              <el-descriptions-item label="农历">
                {{ worldData?.lunar_date || "-" }}
              </el-descriptions-item>
              <el-descriptions-item label="新闻条数">
                {{ worldData?.news?.length ?? "-" }}
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
