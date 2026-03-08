<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";

defineOptions({
  name: "SixtySMoyu"
});

type MoyuApiPayload = {
  code: number;
  message: string;
  data: {
    date: {
      gregorian: string;
      weekday: string;
      dayOfWeek: number;
      lunar: {
        year: number;
        month: number;
        day: number;
        yearCN: string;
        monthCN: string;
        dayCN: string;
        isLeapMonth: boolean;
        yearGanZhi: string;
        monthGanZhi: string;
        dayGanZhi: string;
        zodiac: string;
      };
    };
    today: {
      isWeekend: boolean;
      isHoliday: boolean;
      isWorkday: boolean;
      holidayName: string | null;
      solarTerm: string | null;
      lunarFestivals: string[];
    };
    progress: {
      week: {
        passed: number;
        total: number;
        remaining: number;
        percentage: number;
      };
      month: {
        passed: number;
        total: number;
        remaining: number;
        percentage: number;
      };
      year: {
        passed: number;
        total: number;
        remaining: number;
        percentage: number;
      };
    };
    currentHoliday: unknown | null;
    nextHoliday: {
      name: string;
      date: string;
      until: number;
      duration: number;
      workdays: string[];
    };
    nextWeekend: {
      date: string;
      weekday: string;
      daysUntil: number;
    };
    countdown: {
      toWeekEnd: number;
      toFriday: number;
      toMonthEnd: number;
      toYearEnd: number;
    };
    moyuQuote: string;
  };
};

type MoyuData = MoyuApiPayload["data"];

const API_DOC_URL = "https://60s.viki.moe/v2/moyu?encoding=json";
const API_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/moyu?encoding=json"
  : API_DOC_URL;

const loading = ref(false);
const moyuData = ref<MoyuData | null>(null);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
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

function drawFishGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  const w = size;
  const h = size * 0.62;
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.36, h * 0.38, 0, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.68, cy);
  ctx.lineTo(x + w, y + h * 0.18);
  ctx.lineTo(x + w, y + h * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(43,27,18,0.62)";
  ctx.beginPath();
  ctx.arc(
    x + w * 0.38,
    cy - h * 0.06,
    Math.max(2, size * 0.045),
    0,
    Math.PI * 2
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawProgressStat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  percentage: number,
  passed: number,
  total: number,
  remaining: number,
  label: string,
  theme: {
    inkStrong: string;
    inkMuted: string;
    inkFaint: string;
    divider: string;
    cardStroke: string;
    cardFillStrong: string;
    accent: string;
    accent2: string;
  }
): void {
  const value = `${Math.round(percentage)}%`;
  const safePassed = Math.max(0, passed);
  const safeTotal = Math.max(safePassed, total);
  const safeRemaining = Math.max(0, remaining);
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, 24);
  ctx.fillStyle = "rgba(255,252,248,0.98)";
  ctx.fill();
  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const topPad = 20;
  const sidePad = 20;

  ctx.save();
  ctx.fillStyle = theme.inkMuted;
  ctx.font =
    "700 20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(
    truncateByWidth(ctx, label, w - sidePad * 2),
    x + sidePad,
    y + topPad
  );
  ctx.restore();

  ctx.save();
  ctx.fillStyle = theme.inkStrong;
  const valueFontSize = value.length >= 5 ? 42 : 50;
  ctx.font = `900 ${valueFontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(value, x + sidePad, y + 62);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = theme.inkFaint;
  ctx.font =
    "650 18px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(`${safePassed}/${safeTotal} 已过`, x + sidePad, y + 122);
  const rightText = `剩余 ${safeRemaining} 天`;
  ctx.textAlign = "right";
  ctx.fillText(rightText, x + w - sidePad, y + 122);
  ctx.restore();
}

function drawCountdownMetric(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: number,
  theme: {
    inkStrong: string;
    inkMuted: string;
    inkFaint: string;
    divider: string;
    accent: string;
    accent2: string;
  }
): void {
  const safeValue = Math.max(0, Math.round(value));
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, 20);
  ctx.fillStyle = "rgba(255,250,245,0.98)";
  ctx.fill();
  ctx.strokeStyle = theme.divider;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = theme.inkMuted;
  ctx.font =
    "680 18px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(label, x + 18, y + 14);
  ctx.restore();

  const valueText = String(safeValue);
  const unitText = "天";
  const gap = 10;
  const numberFontSize =
    valueText.length >= 4 ? 36 : valueText.length >= 3 ? 40 : 44;
  const unitOffsetY = valueText.length >= 4 ? 10 : 16;

  ctx.save();
  ctx.font = `900 ${numberFontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
  const valueW = ctx.measureText(valueText).width;
  ctx.font =
    "700 20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const unitW = ctx.measureText(unitText).width;
  const groupW = valueW + gap + unitW;
  const startX = x + Math.max(18, Math.min(w - groupW - 18, (w - groupW) / 2));
  const valueY = y + 44;

  ctx.fillStyle = theme.inkStrong;
  ctx.font = `900 ${numberFontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(valueText, startX, valueY);

  ctx.fillStyle = theme.inkFaint;
  ctx.font =
    "700 20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(unitText, startX + valueW + gap, valueY + unitOffsetY);

  ctx.restore();
}

function drawSectionHeader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxX: number,
  title: string,
  subtitle: string,
  sideNote: string,
  theme: {
    inkStrong: string;
    inkFaint: string;
  }
): void {
  ctx.save();
  ctx.fillStyle = theme.inkStrong;
  ctx.font =
    "820 26px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(title, x, y);
  ctx.fillStyle = theme.inkFaint;
  ctx.font =
    "620 18px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  if (subtitle) ctx.fillText(subtitle, x + 120, y + 5);
  if (sideNote) {
    ctx.textAlign = "right";
    ctx.fillText(
      truncateByWidth(ctx, sideNote, Math.max(120, maxX - x - 360)),
      maxX,
      y + 5
    );
  }
  ctx.restore();
}

async function buildPosterObjectUrl(data: MoyuData): Promise<string> {
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
    inkFaint: "rgba(43,27,18,0.58)",
    divider: "rgba(43,27,18,0.14)",
    cardFill: "rgba(255,252,248,0.96)",
    cardFillStrong: "rgba(255,252,248,0.98)",
    cardStroke: "rgba(43,27,18,0.12)",
    accent: "#EA580C",
    accent2: "#F59E0B",
    badgeFill: "rgba(234,88,12,0.10)",
    badgeStroke: "rgba(234,88,12,0.22)",
    badgeText: "rgba(43,27,18,0.80)",
    shadow: "rgba(90,42,18,0.14)"
  } as const;
  const layout = {
    pagePadding: 56,
    sectionGap: 34,
    cardRadiusOuter: 38,
    cardRadiusInner: 26,
    cardRadiusChip: 20
  } as const;
  const typeScale = {
    titleMain: 60,
    titleSub: 26,
    body: 20
  } as const;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#FFF7F1");
  bg.addColorStop(1, "#FFF7F1");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cardX = 64;
  const cardY = 64;
  const cardW = width - cardX * 2;
  const cardH = height - cardY * 2;
  ctx.save();
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, layout.cardRadiusOuter);
  ctx.fillStyle = theme.cardFill;
  ctx.shadowColor = theme.shadow;
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, layout.cardRadiusOuter);
  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const padding = layout.pagePadding;
  const contentX = cardX + padding;
  const contentW = cardW - padding * 2;
  let y = cardY + 54;

  const weekday = asNonEmptyString(data.date.weekday) || "星期";
  const gregorian = formatDateZh(asNonEmptyString(data.date.gregorian));
  const lunarText = `${data.date.lunar.monthCN}${data.date.lunar.dayCN}`;
  const lunarFestivals = Array.isArray(data.today.lunarFestivals)
    ? data.today.lunarFestivals.map(v => asNonEmptyString(v)).filter(Boolean)
    : [];
  const festivalText = lunarFestivals.slice(0, 2).join(" · ");

  ctx.save();
  drawFishGlyph(ctx, contentX, y + 14, 58, theme.accent);
  ctx.fillStyle = theme.inkStrong;
  ctx.font = `900 ${typeScale.titleMain}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
  ctx.fillText("摸鱼日报", contentX + 72, y + 6);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(43,27,18,0.78)";
  ctx.font =
    "900 68px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(weekday, contentX + contentW, y + 8);
  ctx.restore();

  y += 92;
  ctx.save();
  ctx.fillStyle = theme.inkMuted;
  ctx.font = `650 ${typeScale.body + 8}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;

  const metaParts = [gregorian, `农历 · ${lunarText}`].filter(Boolean);
  const metaLeft = truncateByWidth(ctx, metaParts.join("  ·  "), contentW);
  ctx.fillText(metaLeft, contentX, y + 6);

  const chipText = data.today.isHoliday
    ? `假期${data.today.holidayName ? ` · ${data.today.holidayName}` : ""}`
    : data.today.isWeekend
      ? "周末"
      : data.today.isWorkday
        ? "工作日"
        : "今日";
  const chip = chipText.trim() || "今日";
  const chipPaddingX = 18;
  ctx.textAlign = "right";
  const statusChipW = ctx.measureText(chip).width + chipPaddingX * 2;
  const statusChipH = 40;
  const chipX = contentX + contentW - statusChipW;
  const chipY = y + 2;
  ctx.save();
  roundedRectPath(ctx, chipX, chipY, statusChipW, statusChipH, 18);
  ctx.fillStyle = theme.badgeFill;
  ctx.fill();
  ctx.strokeStyle = theme.badgeStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = theme.badgeText;
  ctx.font =
    "700 20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(chip, chipX + statusChipW / 2, chipY + statusChipH / 2);
  ctx.restore();

  y += 64;
  if (festivalText) {
    ctx.save();
    ctx.fillStyle = theme.inkFaint;
    ctx.font =
      "600 22px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(`节气/节日：${festivalText}`, contentX, y + 6);
    ctx.restore();
    y += 42;
  } else {
    y += 10;
  }

  drawSectionHeader(
    ctx,
    contentX,
    y + 14,
    contentX + contentW,
    "时间进度",
    "",
    "",
    theme
  );
  const statTopY = y + 58;
  const statH = 164;
  const week = data.progress.week;
  const month = data.progress.month;
  const year = data.progress.year;

  const statGap = 16;
  const statW = Math.floor((contentW - statGap * 2) / 3);
  const statX = (idx: number): number => contentX + idx * (statW + statGap);

  drawProgressStat(
    ctx,
    statX(0),
    statTopY,
    statW,
    statH,
    week.percentage,
    week.passed,
    week.total,
    week.remaining,
    "本周",
    theme
  );
  drawProgressStat(
    ctx,
    statX(1),
    statTopY,
    statW,
    statH,
    month.percentage,
    month.passed,
    month.total,
    month.remaining,
    "本月",
    theme
  );
  drawProgressStat(
    ctx,
    statX(2),
    statTopY,
    statW,
    statH,
    year.percentage,
    year.passed,
    year.total,
    year.remaining,
    "今年",
    theme
  );

  y = statTopY + statH + 30;

  const infoCardH = 208;
  const infoCardGap = 18;
  const infoCardW = Math.floor((contentW - infoCardGap) / 2);

  const leftCardX = contentX;
  const rightCardX = contentX + contentW - infoCardW;

  ctx.save();
  roundedRectPath(
    ctx,
    leftCardX,
    y,
    infoCardW,
    infoCardH,
    layout.cardRadiusInner
  );
  ctx.fillStyle = theme.cardFillStrong;
  ctx.fill();
  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  roundedRectPath(
    ctx,
    rightCardX,
    y,
    infoCardW,
    infoCardH,
    layout.cardRadiusInner
  );
  ctx.fillStyle = theme.cardFillStrong;
  ctx.fill();
  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = theme.inkStrong;
  ctx.font = `800 ${typeScale.titleSub}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
  ctx.fillText("下个周末", leftCardX + 26, y + 22);
  ctx.fillText("下个假期", rightCardX + 26, y + 22);

  ctx.fillStyle = theme.inkMuted;
  ctx.font =
    "650 20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const weekendDate = formatDateZh(asNonEmptyString(data.nextWeekend.date));
  ctx.fillText(weekendDate || "-", leftCardX + 26, y + 68);
  ctx.fillText(
    truncateByWidth(
      ctx,
      `${asNonEmptyString(data.nextHoliday.name)} · ${formatDateZh(
        asNonEmptyString(data.nextHoliday.date)
      )}`,
      infoCardW - 52
    ) || "-",
    rightCardX + 26,
    y + 68
  );

  ctx.fillStyle = theme.inkStrong;
  ctx.font =
    "900 46px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(`${data.nextWeekend.daysUntil}`, leftCardX + 26, y + 104);
  ctx.fillText(`${data.nextHoliday.until}`, rightCardX + 26, y + 104);

  ctx.fillStyle = theme.inkFaint;
  ctx.font =
    "700 18px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("天后开摆", leftCardX + 26, y + 158);
  ctx.fillText(
    `天后放假 · ${data.nextHoliday.duration} 天`,
    rightCardX + 26,
    y + 158
  );
  ctx.restore();

  y += infoCardH + layout.sectionGap;

  const countdownCardH = 296;
  ctx.save();
  roundedRectPath(
    ctx,
    contentX,
    y,
    contentW,
    countdownCardH,
    layout.cardRadiusInner
  );
  ctx.fillStyle = theme.cardFillStrong;
  ctx.fill();
  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  drawSectionHeader(
    ctx,
    contentX + 26,
    y + 20,
    contentX + contentW - 26,
    "倒计时",
    "",
    "",
    theme
  );

  const chips = [
    { k: "到周末", v: data.countdown.toWeekEnd },
    { k: "到周五", v: data.countdown.toFriday },
    { k: "到月末", v: data.countdown.toMonthEnd },
    { k: "到年末", v: data.countdown.toYearEnd }
  ];

  const countdownPadX = 26;
  const countdownGapX = 18;
  const countdownChipW = Math.floor(
    (contentW - countdownPadX * 2 - countdownGapX) / 2
  );
  const countdownChipH = 92;
  const countdownGapY = 14;
  const chipY0 = y + 84;
  const chipLeftX = contentX + countdownPadX;
  const chipRightX = contentX + contentW - countdownPadX - countdownChipW;

  for (let i = 0; i < chips.length; i += 1) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const cx = col === 0 ? chipLeftX : chipRightX;
    const cy = chipY0 + row * (countdownChipH + countdownGapY);
    drawCountdownMetric(
      ctx,
      cx,
      cy,
      countdownChipW,
      countdownChipH,
      chips[i].k,
      chips[i].v,
      theme
    );
  }

  y += countdownCardH + layout.sectionGap;

  const quoteCardH = 340;
  ctx.save();
  roundedRectPath(ctx, contentX, y, contentW, quoteCardH, 28);
  ctx.fillStyle = "rgba(255,252,248,0.98)";
  ctx.fill();
  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const quote = asNonEmptyString(data.moyuQuote) || "摸鱼使人快乐。";
  ctx.save();
  ctx.fillStyle = theme.inkStrong;
  ctx.font =
    "800 26px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("今日摸鱼语录", contentX + 26, y + 22);

  ctx.fillStyle = theme.ink;
  ctx.font =
    "700 34px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const quoteMaxW = contentW - 52;
  const quoteLines = wrapTextLines(ctx, quote, quoteMaxW);
  const showQuote = quoteLines
    .slice(0, 6)
    .map(v => truncateByWidth(ctx, v, quoteMaxW));
  const lineH = 54;
  const quoteStartY = y + 86;
  for (let i = 0; i < showQuote.length; i += 1) {
    ctx.fillText(showQuote[i], contentX + 26, quoteStartY + i * lineH);
  }

  const footerY = cardY + cardH - 28;
  ctx.fillStyle = theme.inkFaint;
  ctx.font =
    "650 20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(
    truncateByWidth(
      ctx,
      `数据源：60s-api.viki.moe · ${data.date.gregorian}`,
      contentW - 220
    ),
    contentX,
    footerY
  );
  ctx.textAlign = "right";
  ctx.fillText("蓝友圈 http://davon-ld.icu", contentX + contentW, footerY);
  ctx.restore();

  const blob = await canvasToBlob(canvas, "image/png");
  return URL.createObjectURL(blob);
}

function normalizeMoyuData(raw: unknown): MoyuData {
  if (!isRecord(raw)) throw new Error("invalid_data");

  const dateRaw = raw["date"];
  const todayRaw = raw["today"];
  const progressRaw = raw["progress"];
  const nextHolidayRaw = raw["nextHoliday"];
  const nextWeekendRaw = raw["nextWeekend"];
  const countdownRaw = raw["countdown"];

  if (!isRecord(dateRaw)) throw new Error("invalid_date");
  if (!isRecord(todayRaw)) throw new Error("invalid_today");
  if (!isRecord(progressRaw)) throw new Error("invalid_progress");
  if (!isRecord(nextHolidayRaw)) throw new Error("invalid_next_holiday");
  if (!isRecord(nextWeekendRaw)) throw new Error("invalid_next_weekend");
  if (!isRecord(countdownRaw)) throw new Error("invalid_countdown");

  const lunarRaw = dateRaw["lunar"];
  if (!isRecord(lunarRaw)) throw new Error("invalid_lunar");

  const gregorian = asNonEmptyString(dateRaw["gregorian"]);
  const weekday = asNonEmptyString(dateRaw["weekday"]);
  if (!gregorian || !weekday) throw new Error("invalid_date_shape");

  const lunar = {
    year: asNumberOr(lunarRaw["year"], 0),
    month: asNumberOr(lunarRaw["month"], 0),
    day: asNumberOr(lunarRaw["day"], 0),
    yearCN: asNonEmptyString(lunarRaw["yearCN"]),
    monthCN: asNonEmptyString(lunarRaw["monthCN"]),
    dayCN: asNonEmptyString(lunarRaw["dayCN"]),
    isLeapMonth: Boolean(lunarRaw["isLeapMonth"]),
    yearGanZhi: asNonEmptyString(lunarRaw["yearGanZhi"]),
    monthGanZhi: asNonEmptyString(lunarRaw["monthGanZhi"]),
    dayGanZhi: asNonEmptyString(lunarRaw["dayGanZhi"]),
    zodiac: asNonEmptyString(lunarRaw["zodiac"])
  };

  const festivalsRaw = todayRaw["lunarFestivals"];
  const lunarFestivals = Array.isArray(festivalsRaw)
    ? festivalsRaw.map(v => asNonEmptyString(v)).filter(Boolean)
    : [];

  const today = {
    isWeekend: Boolean(todayRaw["isWeekend"]),
    isHoliday: Boolean(todayRaw["isHoliday"]),
    isWorkday: Boolean(todayRaw["isWorkday"]),
    holidayName:
      todayRaw["holidayName"] === null
        ? null
        : asNonEmptyString(todayRaw["holidayName"]),
    solarTerm:
      todayRaw["solarTerm"] === null
        ? null
        : asNonEmptyString(todayRaw["solarTerm"]),
    lunarFestivals
  };

  const normalizeProgress = (v: unknown) => {
    if (!isRecord(v)) throw new Error("invalid_progress_item");
    return {
      passed: asNumberOr(v["passed"], 0),
      total: asNumberOr(v["total"], 0),
      remaining: asNumberOr(v["remaining"], 0),
      percentage: asNumberOr(v["percentage"], 0)
    };
  };

  const progress = {
    week: normalizeProgress(progressRaw["week"]),
    month: normalizeProgress(progressRaw["month"]),
    year: normalizeProgress(progressRaw["year"])
  };

  const nextHoliday = {
    name: asNonEmptyString(nextHolidayRaw["name"]),
    date: asNonEmptyString(nextHolidayRaw["date"]),
    until: asNumberOr(nextHolidayRaw["until"], 0),
    duration: asNumberOr(nextHolidayRaw["duration"], 0),
    workdays: Array.isArray(nextHolidayRaw["workdays"])
      ? nextHolidayRaw["workdays"].map(v => asNonEmptyString(v)).filter(Boolean)
      : []
  };

  const nextWeekend = {
    date: asNonEmptyString(nextWeekendRaw["date"]),
    weekday: asNonEmptyString(nextWeekendRaw["weekday"]),
    daysUntil: asNumberOr(nextWeekendRaw["daysUntil"], 0)
  };

  const countdown = {
    toWeekEnd: asNumberOr(countdownRaw["toWeekEnd"], 0),
    toFriday: asNumberOr(countdownRaw["toFriday"], 0),
    toMonthEnd: asNumberOr(countdownRaw["toMonthEnd"], 0),
    toYearEnd: asNumberOr(countdownRaw["toYearEnd"], 0)
  };

  return {
    date: {
      gregorian,
      weekday,
      dayOfWeek: asNumberOr(dateRaw["dayOfWeek"], 0),
      lunar
    },
    today,
    progress,
    currentHoliday: raw["currentHoliday"] ?? null,
    nextHoliday,
    nextWeekend,
    countdown,
    moyuQuote: asNonEmptyString(raw["moyuQuote"])
  };
}

async function fetchMoyuData(signal: AbortSignal): Promise<MoyuData> {
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

  return normalizeMoyuData(payload["data"]);
}

const ctrl = reactive<{ abort?: AbortController }>({});

const metaSummary = computed((): string => {
  const d = moyuData.value;
  if (!d) return "-";
  const festivals = d.today.lunarFestivals?.length
    ? d.today.lunarFestivals[0]
    : "";
  return [d.date.gregorian, d.date.weekday, festivals]
    .filter(Boolean)
    .join(" · ");
});

const downloadName = computed((): string => {
  const d = moyuData.value;
  const date = d?.date?.gregorian?.trim() ? d.date.gregorian.trim() : "moyu";
  return `蓝友圈-摸鱼日报-${date}.png`;
});

async function loadAndGenerate(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;

  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    const data = await fetchMoyuData(abort.signal);
    moyuData.value = data;
    const url = await buildPosterObjectUrl(data);
    if (imageDataUrl.value) revokeObjectUrl(imageDataUrl.value);
    imageDataUrl.value = url;
  } catch (e) {
    moyuData.value = null;
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
  if (ctrl.abort) ctrl.abort.abort();
  if (imageDataUrl.value) revokeObjectUrl(imageDataUrl.value);
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">摸鱼日报</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
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
                {{ moyuData?.date?.gregorian || "-" }}
              </el-descriptions-item>
              <el-descriptions-item label="星期">
                {{ moyuData?.date?.weekday || "-" }}
              </el-descriptions-item>
              <el-descriptions-item label="是否工作日">
                {{ moyuData ? (moyuData.today.isWorkday ? "是" : "否") : "-" }}
              </el-descriptions-item>
              <el-descriptions-item label="下个周末">
                {{
                  moyuData
                    ? `${moyuData.nextWeekend.date}（${moyuData.nextWeekend.daysUntil} 天）`
                    : "-"
                }}
              </el-descriptions-item>
              <el-descriptions-item label="下个假期">
                {{
                  moyuData
                    ? `${moyuData.nextHoliday.name} ${moyuData.nextHoliday.date}（${moyuData.nextHoliday.until} 天）`
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
