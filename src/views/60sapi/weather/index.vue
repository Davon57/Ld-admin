<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "SixtySWeather"
});

type PanelType = "realtime" | "forecast";
type Encoding = "json" | "text" | "markdown";

type WeatherLocation = {
  name: string;
  province: string;
  city: string;
  county: string;
};

type WeatherNow = {
  condition: string;
  condition_code: string;
  temperature: number;
  humidity: number;
  pressure: number;
  precipitation: number;
  wind_direction: string;
  wind_power: string;
  weather_icon: string;
  weather_colors: string[];
  updated: string;
  updated_at: number;
};

type AirQuality = {
  aqi: number;
  level: number;
  quality: string;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  o3: number;
  so2: number;
  rank: number;
  total_cities: number;
  updated: string;
  updated_at: number;
};

type SunriseInfo = {
  sunrise: string;
  sunrise_at: number;
  sunrise_desc: string;
  sunset: string;
  sunset_at: number;
  sunset_desc: string;
};

type LifeIndex = {
  key: string;
  name: string;
  level: string;
  description: string;
};

type WeatherAlert = {
  type: string;
  level: string;
  level_code: string;
  province: string;
  city: string;
  county: string;
  detail: string;
  updated: string;
  updated_at: number;
};

type WeatherData = {
  location: WeatherLocation;
  weather: WeatherNow;
  air_quality: AirQuality;
  sunrise: SunriseInfo;
  life_indices: LifeIndex[];
  alerts: WeatherAlert[];
};

type WeatherPayload = {
  code: number;
  message: string;
  data: WeatherData;
};

type HourlyForecastItem = {
  datetime: string;
  temperature: number;
  condition: string;
  condition_code: string;
  wind_direction: string;
  wind_power: string;
  weather_icon: string;
};

type DailyForecastItem = {
  date: string;
  day_condition: string;
  day_condition_code: string;
  night_condition: string;
  night_condition_code: string;
  max_temperature: number;
  min_temperature: number;
  day_wind_direction: string;
  day_wind_power: string;
  night_wind_direction: string;
  night_wind_power: string;
  aqi: number;
  aqi_level: number;
  air_quality: string;
  day_weather_icon: string;
  night_weather_icon: string;
};

type SunriseSunsetItem = {
  sunrise: string;
  sunrise_at: number;
  sunrise_desc: string;
  sunset: string;
  sunset_at: number;
  sunset_desc: string;
};

type WeatherForecastData = {
  location: WeatherLocation;
  hourly_forecast: HourlyForecastItem[];
  daily_forecast: DailyForecastItem[];
  sunrise_sunset: SunriseSunsetItem[];
};

type WeatherForecastPayload = {
  code: number;
  message: string;
  data: WeatherForecastData;
};

const WEATHER_DOC_URL = "https://60s.viki.moe/v2/weather?encoding=json";
const WEATHER_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/weather"
  : "https://60s.viki.moe/v2/weather";
const FORECAST_DOC_URL =
  "https://60s.viki.moe/v2/weather/forecast?encoding=json";
const FORECAST_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/weather/forecast"
  : "https://60s.viki.moe/v2/weather/forecast";

const activePanel = ref<PanelType>("realtime");
const query = ref("");
const encoding = ref<Encoding>("json");

const realtimeLoading = ref(false);
const realtimeData = ref<WeatherData | null>(null);
const realtimeTextPayload = ref("");
const realtimeError = ref("");
const realtimeCtrl = reactive<{ abort?: AbortController }>({});

const forecastLoading = ref(false);
const forecastData = ref<WeatherForecastData | null>(null);
const forecastTextPayload = ref("");
const forecastError = ref("");
const forecastCtrl = reactive<{ abort?: AbortController }>({});

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

function buildApiUrl(base: string): string {
  const params = new URLSearchParams();
  params.set("encoding", encoding.value);
  if (query.value.trim()) params.set("query", query.value.trim());
  return `${base}?${params.toString()}`;
}

function normalizeLocation(value: unknown): WeatherLocation {
  if (!isRecord(value)) throw new Error("invalid_location");
  const name = asNonEmptyString(value["name"]);
  const province = asNonEmptyString(value["province"]);
  const city = asNonEmptyString(value["city"]);
  const county = asNonEmptyString(value["county"]);
  if (!name || !province || !city) throw new Error("invalid_location");
  return { name, province, city, county };
}

function normalizeWeather(value: unknown): WeatherNow {
  if (!isRecord(value)) throw new Error("invalid_weather");
  const condition = asNonEmptyString(value["condition"]);
  const condition_code = asNonEmptyString(value["condition_code"]);
  const temperature = asSafeNumber(value["temperature"]);
  const humidity = asSafeNumber(value["humidity"]);
  const pressure = asSafeNumber(value["pressure"]);
  const precipitation = asSafeNumber(value["precipitation"]);
  const wind_direction = asNonEmptyString(value["wind_direction"]);
  const wind_power = asNonEmptyString(value["wind_power"]);
  const weather_icon = asNonEmptyString(value["weather_icon"]);
  const weather_colors_raw = value["weather_colors"];
  const updated = asNonEmptyString(value["updated"]);
  const updated_at = asSafeNumber(value["updated_at"]);
  if (
    !condition ||
    !condition_code ||
    !wind_direction ||
    !wind_power ||
    !Array.isArray(weather_colors_raw) ||
    !updated ||
    !updated_at
  ) {
    throw new Error("invalid_weather_shape");
  }
  const weather_colors = weather_colors_raw
    .map(asNonEmptyString)
    .filter(Boolean);
  return {
    condition,
    condition_code,
    temperature,
    humidity,
    pressure,
    precipitation,
    wind_direction,
    wind_power,
    weather_icon,
    weather_colors,
    updated,
    updated_at
  };
}

function normalizeAirQuality(value: unknown): AirQuality {
  if (!isRecord(value)) throw new Error("invalid_air_quality");
  const aqi = asSafeNumber(value["aqi"]);
  const level = asSafeNumber(value["level"]);
  const quality = asNonEmptyString(value["quality"]);
  const pm25 = asSafeNumber(value["pm25"]);
  const pm10 = asSafeNumber(value["pm10"]);
  const co = asSafeNumber(value["co"]);
  const no2 = asSafeNumber(value["no2"]);
  const o3 = asSafeNumber(value["o3"]);
  const so2 = asSafeNumber(value["so2"]);
  const rank = asSafeNumber(value["rank"]);
  const total_cities = asSafeNumber(value["total_cities"]);
  const updated = asNonEmptyString(value["updated"]);
  const updated_at = asSafeNumber(value["updated_at"]);
  if (!quality || !updated || !updated_at) {
    throw new Error("invalid_air_quality_shape");
  }
  return {
    aqi,
    level,
    quality,
    pm25,
    pm10,
    co,
    no2,
    o3,
    so2,
    rank,
    total_cities,
    updated,
    updated_at
  };
}

function normalizeSunrise(value: unknown): SunriseInfo {
  if (!isRecord(value)) throw new Error("invalid_sunrise");
  const sunrise = asNonEmptyString(value["sunrise"]);
  const sunrise_at = asSafeNumber(value["sunrise_at"]);
  const sunrise_desc = asNonEmptyString(value["sunrise_desc"]);
  const sunset = asNonEmptyString(value["sunset"]);
  const sunset_at = asSafeNumber(value["sunset_at"]);
  const sunset_desc = asNonEmptyString(value["sunset_desc"]);
  if (!sunrise || !sunrise_desc || !sunset || !sunset_desc) {
    throw new Error("invalid_sunrise_shape");
  }
  return { sunrise, sunrise_at, sunrise_desc, sunset, sunset_at, sunset_desc };
}

function normalizeLifeIndex(value: unknown): LifeIndex | null {
  if (!isRecord(value)) return null;
  const key = asNonEmptyString(value["key"]);
  const name = asNonEmptyString(value["name"]);
  const level = asNonEmptyString(value["level"]);
  const description = asNonEmptyString(value["description"]);
  if (!key || !name || !level || !description) return null;
  return { key, name, level, description };
}

function normalizeAlert(value: unknown): WeatherAlert | null {
  if (!isRecord(value)) return null;
  const type = asNonEmptyString(value["type"]);
  const level = asNonEmptyString(value["level"]);
  const level_code = asNonEmptyString(value["level_code"]);
  const province = asNonEmptyString(value["province"]);
  const city = asNonEmptyString(value["city"]);
  const county = asNonEmptyString(value["county"]);
  const detail = asNonEmptyString(value["detail"]);
  const updated = asNonEmptyString(value["updated"]);
  const updated_at = asSafeNumber(value["updated_at"]);
  if (!type || !level || !detail) return null;
  return {
    type,
    level,
    level_code,
    province,
    city,
    county,
    detail,
    updated,
    updated_at
  };
}

function normalizeHourlyItem(value: unknown): HourlyForecastItem | null {
  if (!isRecord(value)) return null;
  const datetime = asNonEmptyString(value["datetime"]);
  const temperature = asSafeNumber(value["temperature"]);
  const condition = asNonEmptyString(value["condition"]);
  const condition_code = asNonEmptyString(value["condition_code"]);
  const wind_direction = asNonEmptyString(value["wind_direction"]);
  const wind_power = asNonEmptyString(value["wind_power"]);
  const weather_icon = asNonEmptyString(value["weather_icon"]);
  if (
    !datetime ||
    !condition ||
    !condition_code ||
    !wind_direction ||
    !wind_power
  ) {
    return null;
  }
  return {
    datetime,
    temperature,
    condition,
    condition_code,
    wind_direction,
    wind_power,
    weather_icon
  };
}

function normalizeDailyItem(value: unknown): DailyForecastItem | null {
  if (!isRecord(value)) return null;
  const date = asNonEmptyString(value["date"]);
  const day_condition = asNonEmptyString(value["day_condition"]);
  const day_condition_code = asNonEmptyString(value["day_condition_code"]);
  const night_condition = asNonEmptyString(value["night_condition"]);
  const night_condition_code = asNonEmptyString(value["night_condition_code"]);
  const max_temperature = asSafeNumber(value["max_temperature"]);
  const min_temperature = asSafeNumber(value["min_temperature"]);
  const day_wind_direction = asNonEmptyString(value["day_wind_direction"]);
  const day_wind_power = asNonEmptyString(value["day_wind_power"]);
  const night_wind_direction = asNonEmptyString(value["night_wind_direction"]);
  const night_wind_power = asNonEmptyString(value["night_wind_power"]);
  const aqi = asSafeNumber(value["aqi"]);
  const aqi_level = asSafeNumber(value["aqi_level"]);
  const air_quality = asNonEmptyString(value["air_quality"]);
  const day_weather_icon = asNonEmptyString(value["day_weather_icon"]);
  const night_weather_icon = asNonEmptyString(value["night_weather_icon"]);
  if (!date || !day_condition || !night_condition || !air_quality) return null;
  return {
    date,
    day_condition,
    day_condition_code,
    night_condition,
    night_condition_code,
    max_temperature,
    min_temperature,
    day_wind_direction,
    day_wind_power,
    night_wind_direction,
    night_wind_power,
    aqi,
    aqi_level,
    air_quality,
    day_weather_icon,
    night_weather_icon
  };
}

function normalizeSunriseItem(value: unknown): SunriseSunsetItem | null {
  if (!isRecord(value)) return null;
  const sunrise = asNonEmptyString(value["sunrise"]);
  const sunrise_at = asSafeNumber(value["sunrise_at"]);
  const sunrise_desc = asNonEmptyString(value["sunrise_desc"]);
  const sunset = asNonEmptyString(value["sunset"]);
  const sunset_at = asSafeNumber(value["sunset_at"]);
  const sunset_desc = asNonEmptyString(value["sunset_desc"]);
  if (!sunrise || !sunrise_desc || !sunset || !sunset_desc) return null;
  return {
    sunrise,
    sunrise_at,
    sunrise_desc,
    sunset,
    sunset_at,
    sunset_desc
  };
}

const isRealtime = computed((): boolean => activePanel.value === "realtime");
const loading = computed((): boolean =>
  isRealtime.value ? realtimeLoading.value : forecastLoading.value
);
const apiDocUrl = computed((): string =>
  isRealtime.value ? WEATHER_DOC_URL : FORECAST_DOC_URL
);
const apiUrl = computed((): string =>
  isRealtime.value
    ? buildApiUrl(WEATHER_BASE_URL)
    : buildApiUrl(FORECAST_BASE_URL)
);
const lastError = computed((): string =>
  isRealtime.value ? realtimeError.value : forecastError.value
);

const realtimeCityDisplay = computed((): string => {
  const d = realtimeData.value?.location;
  if (!d) return "-";
  return `${d.province}${d.city}${d.county}`;
});

const forecastCityDisplay = computed((): string => {
  const d = forecastData.value?.location;
  if (!d) return "-";
  return `${d.province}${d.city}${d.county}`;
});

const gradientStyle = computed<Record<string, string>>(() => {
  const list = realtimeData.value?.weather?.weather_colors ?? [];
  if (!list.length) return {};
  const valid = list.filter(v => /^#?[0-9a-fA-F]{6}$/.test(v));
  if (!valid.length) return {};
  const colors = valid.map(v => (v.startsWith("#") ? v : `#${v}`));
  return {
    background: `linear-gradient(135deg, ${colors.join(", ")})`,
    borderColor: "transparent"
  };
});

const realtimeSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  const d = realtimeData.value;
  if (!d) return "-";
  return `${realtimeCityDisplay.value} · ${d.weather.condition} · ${d.weather.temperature}℃`;
});

const forecastToday = computed((): DailyForecastItem | null => {
  const list = forecastData.value?.daily_forecast ?? [];
  return list.length ? list[0] : null;
});

const forecastSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  const today = forecastToday.value;
  if (!today) return "-";
  return `${forecastCityDisplay.value} · ${today.day_condition}/${today.night_condition} · ${today.min_temperature}~${today.max_temperature}℃`;
});

const metaSummary = computed((): string =>
  isRealtime.value ? realtimeSummary.value : forecastSummary.value
);

const aqiTagType = computed((): "success" | "warning" | "danger" | "info" => {
  const level = realtimeData.value?.air_quality.level ?? 0;
  if (level <= 1) return "success";
  if (level <= 3) return "warning";
  if (level <= 5) return "danger";
  return "info";
});

const next24Hours = computed((): HourlyForecastItem[] => {
  const list = forecastData.value?.hourly_forecast ?? [];
  return list.slice(0, 24);
});

const next7Days = computed((): DailyForecastItem[] => {
  const list = forecastData.value?.daily_forecast ?? [];
  return list.slice(0, 7);
});

const sunriseList = computed((): SunriseSunsetItem[] => {
  const list = forecastData.value?.sunrise_sunset ?? [];
  return list.slice(0, 7);
});

const loadedStatus = computed((): boolean => {
  if (isRealtime.value) {
    return encoding.value === "json"
      ? !!realtimeData.value
      : !!realtimeTextPayload.value;
  }
  return encoding.value === "json"
    ? !!forecastData.value
    : !!forecastTextPayload.value;
});

async function fetchRealtimeJson(signal: AbortSignal): Promise<WeatherData> {
  const res = await fetch(buildApiUrl(WEATHER_BASE_URL), {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(text) as WeatherPayload;
  } catch {
    throw new Error("invalid_json");
  }
  if (!isRecord(payload)) throw new Error("invalid_payload");
  const code = payload["code"];
  if (typeof code !== "number") throw new Error("invalid_code");
  if (code !== 200) throw new Error("api_failed");
  const data = payload["data"];
  if (!isRecord(data)) throw new Error("invalid_data");
  const lifeRaw = data["life_indices"];
  const alertsRaw = data["alerts"];
  if (!Array.isArray(lifeRaw) || !Array.isArray(alertsRaw)) {
    throw new Error("invalid_data_shape");
  }
  const life_indices = lifeRaw
    .map(normalizeLifeIndex)
    .filter(Boolean) as LifeIndex[];
  const alerts = alertsRaw
    .map(normalizeAlert)
    .filter(Boolean) as WeatherAlert[];
  return {
    location: normalizeLocation(data["location"]),
    weather: normalizeWeather(data["weather"]),
    air_quality: normalizeAirQuality(data["air_quality"]),
    sunrise: normalizeSunrise(data["sunrise"]),
    life_indices,
    alerts
  };
}

async function fetchRealtimeText(signal: AbortSignal): Promise<string> {
  const res = await fetch(buildApiUrl(WEATHER_BASE_URL), {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function fetchForecastJson(
  signal: AbortSignal
): Promise<WeatherForecastData> {
  const res = await fetch(buildApiUrl(FORECAST_BASE_URL), {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(text) as WeatherForecastPayload;
  } catch {
    throw new Error("invalid_json");
  }
  if (!isRecord(payload)) throw new Error("invalid_payload");
  const code = payload["code"];
  if (typeof code !== "number") throw new Error("invalid_code");
  if (code !== 200) throw new Error("api_failed");
  const data = payload["data"];
  if (!isRecord(data)) throw new Error("invalid_data");
  const hourlyRaw = data["hourly_forecast"];
  const dailyRaw = data["daily_forecast"];
  const sunriseRaw = data["sunrise_sunset"];
  if (
    !Array.isArray(hourlyRaw) ||
    !Array.isArray(dailyRaw) ||
    !Array.isArray(sunriseRaw)
  ) {
    throw new Error("invalid_data_shape");
  }
  const hourly_forecast = hourlyRaw
    .map(normalizeHourlyItem)
    .filter(Boolean) as HourlyForecastItem[];
  const daily_forecast = dailyRaw
    .map(normalizeDailyItem)
    .filter(Boolean) as DailyForecastItem[];
  const sunrise_sunset = sunriseRaw
    .map(normalizeSunriseItem)
    .filter(Boolean) as SunriseSunsetItem[];
  return {
    location: normalizeLocation(data["location"]),
    hourly_forecast,
    daily_forecast,
    sunrise_sunset
  };
}

async function fetchForecastText(signal: AbortSignal): Promise<string> {
  const res = await fetch(buildApiUrl(FORECAST_BASE_URL), {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadRealtime(): Promise<void> {
  if (realtimeLoading.value) return;
  realtimeLoading.value = true;
  realtimeError.value = "";
  realtimeData.value = null;
  realtimeTextPayload.value = "";
  if (realtimeCtrl.abort) realtimeCtrl.abort.abort();
  const abort = new AbortController();
  realtimeCtrl.abort = abort;
  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      realtimeData.value = await fetchRealtimeJson(abort.signal);
    } else {
      realtimeTextPayload.value = await fetchRealtimeText(abort.signal);
    }
  } catch (e) {
    const errMsg =
      e instanceof Error && e.message ? e.message : "unknown_error";
    realtimeError.value = errMsg;
    message("获取失败，请稍后重试", { type: "error" });
  } finally {
    window.clearTimeout(timer);
    realtimeLoading.value = false;
  }
}

async function loadForecast(): Promise<void> {
  if (forecastLoading.value) return;
  forecastLoading.value = true;
  forecastError.value = "";
  forecastData.value = null;
  forecastTextPayload.value = "";
  if (forecastCtrl.abort) forecastCtrl.abort.abort();
  const abort = new AbortController();
  forecastCtrl.abort = abort;
  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      forecastData.value = await fetchForecastJson(abort.signal);
    } else {
      forecastTextPayload.value = await fetchForecastText(abort.signal);
    }
  } catch (e) {
    const errMsg =
      e instanceof Error && e.message ? e.message : "unknown_error";
    forecastError.value = errMsg;
    message("获取失败，请稍后重试", { type: "error" });
  } finally {
    window.clearTimeout(timer);
    forecastLoading.value = false;
  }
}

async function loadActive(): Promise<void> {
  if (isRealtime.value) {
    await loadRealtime();
    return;
  }
  await loadForecast();
}

function resetFilters(): void {
  query.value = "";
  encoding.value = "json";
  void loadActive();
}

function onPanelChange(): void {
  void loadActive();
}

onMounted(() => {
  void loadActive();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">天气服务</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：腾讯天气 / 60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-radio-group v-model="activePanel" @change="onPanelChange">
            <el-radio-button label="realtime">实时天气</el-radio-button>
            <el-radio-button label="forecast">天气预报</el-radio-button>
          </el-radio-group>
          <el-input
            v-model="query"
            clearable
            placeholder="地区（例如：雨花台）"
            style="width: 220px"
            @keyup.enter="loadActive"
          />
          <el-radio-group v-model="encoding" @change="loadActive">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="text">Text</el-radio-button>
            <el-radio-button label="markdown">Markdown</el-radio-button>
          </el-radio-group>
          <el-button :loading="loading" @click="loadActive">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button :disabled="loading" @click="resetFilters">重置</el-button>
        </el-space>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div v-if="isRealtime">
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-[14px] font-semibold">天气详情</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{
                    encoding === "json"
                      ? realtimeData?.weather.updated || "-"
                      : "-"
                  }}
                </div>
              </div>
            </template>

            <div v-if="encoding !== 'json'" class="space-y-3">
              <el-input
                v-model="realtimeTextPayload"
                type="textarea"
                :rows="24"
                readonly
                resize="vertical"
              />
            </div>

            <div v-else-if="realtimeData" class="space-y-3">
              <div
                class="rounded-md border p-4"
                :style="gradientStyle"
                style="border-color: var(--el-border-color)"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div
                      class="text-[13px] text-[var(--el-text-color-secondary)]"
                    >
                      {{ realtimeCityDisplay }}
                    </div>
                    <div class="mt-1 text-[26px] font-semibold">
                      {{ realtimeData.weather.temperature }}℃
                    </div>
                    <div class="mt-1 text-[13px]">
                      {{ realtimeData.weather.condition }}
                    </div>
                  </div>
                  <el-image
                    class="h-16 w-16"
                    fit="contain"
                    :src="realtimeData.weather.weather_icon"
                  >
                    <template #error>
                      <div
                        class="flex h-16 w-16 items-center justify-center rounded-md bg-[var(--el-fill-color-light)] text-[12px] text-[var(--el-text-color-secondary)]"
                      >
                        {{ realtimeData.weather.condition }}
                      </div>
                    </template>
                  </el-image>
                </div>
              </div>

              <el-descriptions :column="2" size="small" border>
                <el-descriptions-item label="地区">
                  {{ realtimeCityDisplay }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ realtimeData.weather.updated }}
                </el-descriptions-item>
                <el-descriptions-item label="湿度">
                  {{ realtimeData.weather.humidity }}%
                </el-descriptions-item>
                <el-descriptions-item label="气压">
                  {{ realtimeData.weather.pressure }} hPa
                </el-descriptions-item>
                <el-descriptions-item label="降水">
                  {{ realtimeData.weather.precipitation }} mm
                </el-descriptions-item>
                <el-descriptions-item label="风向风力">
                  {{ realtimeData.weather.wind_direction }}
                  {{ realtimeData.weather.wind_power }}
                </el-descriptions-item>
              </el-descriptions>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="text-[13px] font-semibold">空气质量</div>
                    <el-tag :type="aqiTagType" effect="plain">
                      {{ realtimeData.air_quality.quality }}
                    </el-tag>
                  </div>
                </template>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="AQI">
                    {{ realtimeData.air_quality.aqi }}
                  </el-descriptions-item>
                  <el-descriptions-item label="污染等级">
                    {{ realtimeData.air_quality.level }}
                  </el-descriptions-item>
                  <el-descriptions-item label="PM2.5">
                    {{ realtimeData.air_quality.pm25 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="PM10">
                    {{ realtimeData.air_quality.pm10 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="CO">
                    {{ realtimeData.air_quality.co }}
                  </el-descriptions-item>
                  <el-descriptions-item label="NO2">
                    {{ realtimeData.air_quality.no2 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="O3">
                    {{ realtimeData.air_quality.o3 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="SO2">
                    {{ realtimeData.air_quality.so2 }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">日出日落</div>
                </template>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="日出">
                    {{ realtimeData.sunrise.sunrise }}
                  </el-descriptions-item>
                  <el-descriptions-item label="描述">
                    {{ realtimeData.sunrise.sunrise_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="日落">
                    {{ realtimeData.sunrise.sunset }}
                  </el-descriptions-item>
                  <el-descriptions-item label="描述">
                    {{ realtimeData.sunrise.sunset_desc }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">生活指数</div>
                </template>
                <el-table :data="realtimeData.life_indices" size="small" border>
                  <el-table-column prop="name" label="指数" min-width="110" />
                  <el-table-column prop="level" label="等级" min-width="90" />
                  <el-table-column
                    prop="description"
                    label="建议"
                    min-width="220"
                    show-overflow-tooltip
                  />
                </el-table>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">天气预警</div>
                </template>
                <div v-if="realtimeData.alerts.length" class="space-y-2">
                  <div
                    v-for="(item, idx) in realtimeData.alerts"
                    :key="`${item.type}-${item.level}-${idx}`"
                    class="rounded-md border border-[var(--el-border-color)] p-3"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <el-tag type="danger" effect="dark">{{
                        item.type
                      }}</el-tag>
                      <el-tag type="warning" effect="plain">{{
                        item.level
                      }}</el-tag>
                      <span
                        class="text-[12px] text-[var(--el-text-color-secondary)]"
                      >
                        {{ item.province }}{{ item.city }}{{ item.county }}
                      </span>
                    </div>
                    <div class="mt-2 whitespace-pre-line text-[13px] leading-6">
                      {{ item.detail }}
                    </div>
                  </div>
                </div>
                <el-empty v-else :image-size="72" description="当前暂无预警" />
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

        <div v-else>
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-[14px] font-semibold">预报详情</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ encoding === "json" ? (forecastToday?.date ?? "-") : "-" }}
                </div>
              </div>
            </template>

            <div v-if="encoding !== 'json'" class="space-y-3">
              <el-input
                v-model="forecastTextPayload"
                type="textarea"
                :rows="24"
                readonly
                resize="vertical"
              />
            </div>

            <div v-else-if="forecastData" class="space-y-3">
              <el-card shadow="never" :body-style="{ padding: '10px 12px' }">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div
                      class="text-[13px] text-[var(--el-text-color-secondary)]"
                    >
                      {{ forecastCityDisplay }}
                    </div>
                    <div class="mt-1 text-[22px] font-semibold">
                      {{ forecastToday?.min_temperature ?? "-" }} ~
                      {{ forecastToday?.max_temperature ?? "-" }}℃
                    </div>
                    <div class="mt-1 text-[13px]">
                      {{ forecastToday?.day_condition ?? "-" }} /
                      {{ forecastToday?.night_condition ?? "-" }}
                    </div>
                  </div>
                  <div class="text-right text-[13px]">
                    <div>AQI：{{ forecastToday?.aqi ?? "-" }}</div>
                    <div class="mt-1">
                      空气质量：{{ forecastToday?.air_quality ?? "-" }}
                    </div>
                  </div>
                </div>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">7日预报</div>
                </template>
                <el-table :data="next7Days" size="small" border>
                  <el-table-column prop="date" label="日期" min-width="110" />
                  <el-table-column label="白天" min-width="130">
                    <template #default="{ row }">
                      <div class="flex items-center gap-2">
                        <el-image
                          class="h-5 w-5 shrink-0"
                          fit="contain"
                          :src="row.day_weather_icon"
                        >
                          <template #error>
                            <span
                              class="text-[12px] text-[var(--el-text-color-secondary)]"
                            >
                              -
                            </span>
                          </template>
                        </el-image>
                        <span>{{ row.day_condition }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="夜间" min-width="130">
                    <template #default="{ row }">
                      <div class="flex items-center gap-2">
                        <el-image
                          class="h-5 w-5 shrink-0"
                          fit="contain"
                          :src="row.night_weather_icon"
                        >
                          <template #error>
                            <span
                              class="text-[12px] text-[var(--el-text-color-secondary)]"
                            >
                              -
                            </span>
                          </template>
                        </el-image>
                        <span>{{ row.night_condition }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="温度" min-width="120">
                    <template #default="{ row }">
                      {{ row.min_temperature }} ~ {{ row.max_temperature }}℃
                    </template>
                  </el-table-column>
                  <el-table-column label="空气质量" min-width="140">
                    <template #default="{ row }">
                      {{ row.air_quality }}（AQI {{ row.aqi }}）
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">24小时预报</div>
                </template>
                <el-table
                  :data="next24Hours"
                  size="small"
                  border
                  max-height="460"
                >
                  <el-table-column
                    prop="datetime"
                    label="时间"
                    min-width="160"
                  />
                  <el-table-column label="天气" min-width="150">
                    <template #default="{ row }">
                      <div class="flex items-center gap-2">
                        <el-image
                          class="h-5 w-5 shrink-0"
                          fit="contain"
                          :src="row.weather_icon"
                        >
                          <template #error>
                            <span
                              class="text-[12px] text-[var(--el-text-color-secondary)]"
                            >
                              -
                            </span>
                          </template>
                        </el-image>
                        <span>{{ row.condition }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="temperature"
                    label="温度(℃)"
                    min-width="90"
                  />
                  <el-table-column label="风向风力" min-width="160">
                    <template #default="{ row }">
                      {{ row.wind_direction }} {{ row.wind_power }}
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">日出日落</div>
                </template>
                <el-table :data="sunriseList" size="small" border>
                  <el-table-column
                    prop="sunrise"
                    label="日期"
                    min-width="180"
                  />
                  <el-table-column
                    prop="sunrise_desc"
                    label="日出"
                    min-width="90"
                  />
                  <el-table-column
                    prop="sunset_desc"
                    label="日落"
                    min-width="90"
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
                <span class="break-all">{{ apiDocUrl }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="请求">
                <span class="break-all">{{ apiUrl }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag v-if="loading" type="warning" effect="plain"
                  >加载中</el-tag
                >
                <el-tag v-else-if="loadedStatus" type="success" effect="plain">
                  已获取
                </el-tag>
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item
                v-if="isRealtime && encoding === 'json'"
                label="空气质量"
              >
                {{ realtimeData?.air_quality.quality || "-" }}
              </el-descriptions-item>
              <el-descriptions-item
                v-if="isRealtime && encoding === 'json'"
                label="AQI"
              >
                {{ realtimeData?.air_quality.aqi ?? "-" }}
              </el-descriptions-item>
              <el-descriptions-item
                v-if="!isRealtime && encoding === 'json'"
                label="城市"
              >
                {{ forecastCityDisplay }}
              </el-descriptions-item>
              <el-descriptions-item
                v-if="!isRealtime && encoding === 'json'"
                label="小时数据"
              >
                {{ next24Hours.length }}
              </el-descriptions-item>
              <el-descriptions-item
                v-if="!isRealtime && encoding === 'json'"
                label="日数据"
              >
                {{ next7Days.length }}
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
