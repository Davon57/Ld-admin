<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "SixtySWeatherForecast"
});

type Encoding = "json" | "text" | "markdown";

type ForecastLocation = {
  name: string;
  province: string;
  city: string;
  county: string;
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
  location: ForecastLocation;
  hourly_forecast: HourlyForecastItem[];
  daily_forecast: DailyForecastItem[];
  sunrise_sunset: SunriseSunsetItem[];
};

type WeatherForecastPayload = {
  code: number;
  message: string;
  data: WeatherForecastData;
};

const API_DOC_URL = "https://60s.viki.moe/v2/weather/forecast?encoding=json";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/weather/forecast"
  : "https://60s.viki.moe/v2/weather/forecast";

const query = ref("");
const encoding = ref<Encoding>("json");
const loading = ref(false);
const forecastData = ref<WeatherForecastData | null>(null);
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

function normalizeLocation(value: unknown): ForecastLocation {
  if (!isRecord(value)) throw new Error("invalid_location");
  const name = asNonEmptyString(value["name"]);
  const province = asNonEmptyString(value["province"]);
  const city = asNonEmptyString(value["city"]);
  const county = asNonEmptyString(value["county"]);
  if (!name || !province || !city) throw new Error("invalid_location_shape");
  return { name, province, city, county };
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
    !wind_power ||
    !weather_icon
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

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("encoding", encoding.value);
  if (query.value.trim()) params.set("query", query.value.trim());
  return `${API_BASE_URL}?${params.toString()}`;
});

const cityDisplay = computed((): string => {
  const d = forecastData.value?.location;
  if (!d) return "-";
  return `${d.province}${d.city}${d.county}`;
});

const todayForecast = computed((): DailyForecastItem | null => {
  const list = forecastData.value?.daily_forecast ?? [];
  return list.length ? list[0] : null;
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

const metaSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  const today = todayForecast.value;
  if (!today) return "-";
  return `${cityDisplay.value} · ${today.day_condition}/${today.night_condition} · ${today.min_temperature}~${today.max_temperature}℃`;
});

async function fetchForecastJson(
  signal: AbortSignal
): Promise<WeatherForecastData> {
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
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadForecast(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";
  forecastData.value = null;
  textPayload.value = "";
  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;
  const timer = window.setTimeout(() => abort.abort(), 12_000);
  try {
    if (encoding.value === "json") {
      forecastData.value = await fetchForecastJson(abort.signal);
    } else {
      textPayload.value = await fetchForecastText(abort.signal);
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
  query.value = "";
  encoding.value = "json";
  void loadForecast();
}

onMounted(() => {
  void loadForecast();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">天气预报</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：腾讯天气 / 60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-input
            v-model="query"
            clearable
            placeholder="地区（例如：雨花台）"
            style="width: 220px"
            @keyup.enter="loadForecast"
          />
          <el-radio-group v-model="encoding" @change="loadForecast">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="text">Text</el-radio-button>
            <el-radio-button label="markdown">Markdown</el-radio-button>
          </el-radio-group>
          <el-button :loading="loading" @click="loadForecast">
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
                <div class="text-[14px] font-semibold">预报详情</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{ encoding === "json" ? (todayForecast?.date ?? "-") : "-" }}
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

            <div v-else-if="forecastData" class="space-y-3">
              <el-card shadow="never" :body-style="{ padding: '10px 12px' }">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div
                      class="text-[13px] text-[var(--el-text-color-secondary)]"
                    >
                      {{ cityDisplay }}
                    </div>
                    <div class="mt-1 text-[22px] font-semibold">
                      {{ todayForecast?.min_temperature ?? "-" }} ~
                      {{ todayForecast?.max_temperature ?? "-" }}℃
                    </div>
                    <div class="mt-1 text-[13px]">
                      {{ todayForecast?.day_condition ?? "-" }} /
                      {{ todayForecast?.night_condition ?? "-" }}
                    </div>
                  </div>
                  <div class="text-right text-[13px]">
                    <div>AQI：{{ todayForecast?.aqi ?? "-" }}</div>
                    <div class="mt-1">
                      空气质量：{{ todayForecast?.air_quality ?? "-" }}
                    </div>
                  </div>
                </div>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '8px 10px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">7日预报</div>
                </template>
                <el-table :data="next7Days" size="small" border>
                  <el-table-column prop="date" label="日期" min-width="120" />
                  <el-table-column label="白天" min-width="110">
                    <template #default="{ row }">
                      <div class="flex items-center gap-2">
                        <img
                          class="h-5 w-5 object-contain"
                          :src="row.day_weather_icon"
                          alt="day weather icon"
                        />
                        <span>{{ row.day_condition }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="夜间" min-width="110">
                    <template #default="{ row }">
                      <div class="flex items-center gap-2">
                        <img
                          class="h-5 w-5 object-contain"
                          :src="row.night_weather_icon"
                          alt="night weather icon"
                        />
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
                  <el-table-column label="天气" min-width="140">
                    <template #default="{ row }">
                      <div class="flex items-center gap-2">
                        <img
                          class="h-5 w-5 object-contain"
                          :src="row.weather_icon"
                          alt="weather icon"
                        />
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
                  v-else-if="
                    encoding === 'json' ? !!forecastData : !!textPayload
                  "
                  type="success"
                  effect="plain"
                >
                  已获取
                </el-tag>
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-if="encoding === 'json'" label="城市">
                {{ cityDisplay }}
              </el-descriptions-item>
              <el-descriptions-item v-if="encoding === 'json'" label="小时数据">
                {{ next24Hours.length }}
              </el-descriptions-item>
              <el-descriptions-item v-if="encoding === 'json'" label="日数据">
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
