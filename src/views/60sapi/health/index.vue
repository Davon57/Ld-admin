<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "SixtySHealth"
});

type Encoding = "json" | "text" | "markdown";
type Gender = "male" | "female";

type HealthBasicInfo = {
  height: string;
  height_desc: string;
  weight: string;
  weight_desc: string;
  gender: string;
  gender_desc: string;
  age: string;
  age_desc: string;
};

type HealthBmi = {
  value: number;
  value_desc: string;
  category: string;
  category_desc: string;
  evaluation: string;
  evaluation_desc: string;
  risk: string;
  risk_desc: string;
};

type HealthWeightAssessment = {
  ideal_weight_range: string;
  ideal_weight_range_desc: string;
  standard_weight: string;
  standard_weight_desc: string;
  status: string;
  status_desc: string;
  adjustment: string;
  adjustment_desc: string;
};

type HealthMetabolism = {
  bmr: string;
  bmr_desc: string;
  tdee: string;
  tdee_desc: string;
  recommended_calories: string;
  recommended_calories_desc: string;
  weight_loss_calories: string;
  weight_loss_calories_desc: string;
  weight_gain_calories: string;
  weight_gain_calories_desc: string;
};

type HealthBodySurfaceArea = {
  value: string;
  value_desc: string;
  formula: string;
  formula_desc: string;
};

type HealthBodyFat = {
  percentage: string;
  percentage_desc: string;
  category: string;
  category_desc: string;
  fat_weight: string;
  fat_weight_desc: string;
  lean_weight: string;
  lean_weight_desc: string;
};

type HealthAdvice = {
  daily_water_intake: string;
  daily_water_intake_desc: string;
  exercise_recommendation: string;
  exercise_recommendation_desc: string;
  nutrition_advice: string;
  nutrition_advice_desc: string;
  health_tips: string[];
  health_tips_desc: string;
};

type HealthIdealMeasurements = {
  chest: string;
  chest_desc: string;
  waist: string;
  waist_desc: string;
  hip: string;
  hip_desc: string;
  note: string;
  note_desc: string;
};

type HealthData = {
  basic_info: HealthBasicInfo;
  bmi: HealthBmi;
  weight_assessment: HealthWeightAssessment;
  metabolism: HealthMetabolism;
  body_surface_area: HealthBodySurfaceArea;
  body_fat: HealthBodyFat;
  health_advice: HealthAdvice;
  ideal_measurements: HealthIdealMeasurements;
  disclaimer: string;
};

type HealthPayload = {
  code: number;
  message: string;
  data: HealthData;
};

const API_DOC_URL =
  "https://60s.viki.moe/v2/health?encoding=json&height=176&weight=60&age=24&gender=male";
const API_BASE_URL = import.meta.env.DEV
  ? "/__60sapi__/v2/health"
  : "https://60s.viki.moe/v2/health";

const height = ref(176);
const weight = ref(60);
const age = ref(24);
const gender = ref<Gender>("male");
const encoding = ref<Encoding>("json");

const loading = ref(false);
const healthData = ref<HealthData | null>(null);
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

function toPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => asNonEmptyString(item))
    .filter(Boolean)
    .slice(0, 100);
}

function expectRecord(
  value: unknown,
  errorCode: string
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(errorCode);
  return value;
}

function normalizeHealthData(value: unknown): HealthData {
  const root = expectRecord(value, "invalid_data");

  const basicInfoRaw = expectRecord(root["basic_info"], "invalid_basic_info");
  const bmiRaw = expectRecord(root["bmi"], "invalid_bmi");
  const weightAssessmentRaw = expectRecord(
    root["weight_assessment"],
    "invalid_weight_assessment"
  );
  const metabolismRaw = expectRecord(root["metabolism"], "invalid_metabolism");
  const bodySurfaceAreaRaw = expectRecord(
    root["body_surface_area"],
    "invalid_body_surface_area"
  );
  const bodyFatRaw = expectRecord(root["body_fat"], "invalid_body_fat");
  const healthAdviceRaw = expectRecord(root["health_advice"], "invalid_advice");
  const idealMeasurementsRaw = expectRecord(
    root["ideal_measurements"],
    "invalid_ideal_measurements"
  );

  const basic_info: HealthBasicInfo = {
    height: asNonEmptyString(basicInfoRaw["height"]),
    height_desc: asNonEmptyString(basicInfoRaw["height_desc"]),
    weight: asNonEmptyString(basicInfoRaw["weight"]),
    weight_desc: asNonEmptyString(basicInfoRaw["weight_desc"]),
    gender: asNonEmptyString(basicInfoRaw["gender"]),
    gender_desc: asNonEmptyString(basicInfoRaw["gender_desc"]),
    age: asNonEmptyString(basicInfoRaw["age"]),
    age_desc: asNonEmptyString(basicInfoRaw["age_desc"])
  };

  const bmi: HealthBmi = {
    value: asSafeNumber(bmiRaw["value"]),
    value_desc: asNonEmptyString(bmiRaw["value_desc"]),
    category: asNonEmptyString(bmiRaw["category"]),
    category_desc: asNonEmptyString(bmiRaw["category_desc"]),
    evaluation: asNonEmptyString(bmiRaw["evaluation"]),
    evaluation_desc: asNonEmptyString(bmiRaw["evaluation_desc"]),
    risk: asNonEmptyString(bmiRaw["risk"]),
    risk_desc: asNonEmptyString(bmiRaw["risk_desc"])
  };

  const weight_assessment: HealthWeightAssessment = {
    ideal_weight_range: asNonEmptyString(
      weightAssessmentRaw["ideal_weight_range"]
    ),
    ideal_weight_range_desc: asNonEmptyString(
      weightAssessmentRaw["ideal_weight_range_desc"]
    ),
    standard_weight: asNonEmptyString(weightAssessmentRaw["standard_weight"]),
    standard_weight_desc: asNonEmptyString(
      weightAssessmentRaw["standard_weight_desc"]
    ),
    status: asNonEmptyString(weightAssessmentRaw["status"]),
    status_desc: asNonEmptyString(weightAssessmentRaw["status_desc"]),
    adjustment: asNonEmptyString(weightAssessmentRaw["adjustment"]),
    adjustment_desc: asNonEmptyString(weightAssessmentRaw["adjustment_desc"])
  };

  const metabolism: HealthMetabolism = {
    bmr: asNonEmptyString(metabolismRaw["bmr"]),
    bmr_desc: asNonEmptyString(metabolismRaw["bmr_desc"]),
    tdee: asNonEmptyString(metabolismRaw["tdee"]),
    tdee_desc: asNonEmptyString(metabolismRaw["tdee_desc"]),
    recommended_calories: asNonEmptyString(
      metabolismRaw["recommended_calories"]
    ),
    recommended_calories_desc: asNonEmptyString(
      metabolismRaw["recommended_calories_desc"]
    ),
    weight_loss_calories: asNonEmptyString(
      metabolismRaw["weight_loss_calories"]
    ),
    weight_loss_calories_desc: asNonEmptyString(
      metabolismRaw["weight_loss_calories_desc"]
    ),
    weight_gain_calories: asNonEmptyString(
      metabolismRaw["weight_gain_calories"]
    ),
    weight_gain_calories_desc: asNonEmptyString(
      metabolismRaw["weight_gain_calories_desc"]
    )
  };

  const body_surface_area: HealthBodySurfaceArea = {
    value: asNonEmptyString(bodySurfaceAreaRaw["value"]),
    value_desc: asNonEmptyString(bodySurfaceAreaRaw["value_desc"]),
    formula: asNonEmptyString(bodySurfaceAreaRaw["formula"]),
    formula_desc: asNonEmptyString(bodySurfaceAreaRaw["formula_desc"])
  };

  const body_fat: HealthBodyFat = {
    percentage: asNonEmptyString(bodyFatRaw["percentage"]),
    percentage_desc: asNonEmptyString(bodyFatRaw["percentage_desc"]),
    category: asNonEmptyString(bodyFatRaw["category"]),
    category_desc: asNonEmptyString(bodyFatRaw["category_desc"]),
    fat_weight: asNonEmptyString(bodyFatRaw["fat_weight"]),
    fat_weight_desc: asNonEmptyString(bodyFatRaw["fat_weight_desc"]),
    lean_weight: asNonEmptyString(bodyFatRaw["lean_weight"]),
    lean_weight_desc: asNonEmptyString(bodyFatRaw["lean_weight_desc"])
  };

  const health_advice: HealthAdvice = {
    daily_water_intake: asNonEmptyString(healthAdviceRaw["daily_water_intake"]),
    daily_water_intake_desc: asNonEmptyString(
      healthAdviceRaw["daily_water_intake_desc"]
    ),
    exercise_recommendation: asNonEmptyString(
      healthAdviceRaw["exercise_recommendation"]
    ),
    exercise_recommendation_desc: asNonEmptyString(
      healthAdviceRaw["exercise_recommendation_desc"]
    ),
    nutrition_advice: asNonEmptyString(healthAdviceRaw["nutrition_advice"]),
    nutrition_advice_desc: asNonEmptyString(
      healthAdviceRaw["nutrition_advice_desc"]
    ),
    health_tips: normalizeStringArray(healthAdviceRaw["health_tips"]),
    health_tips_desc: asNonEmptyString(healthAdviceRaw["health_tips_desc"])
  };

  const ideal_measurements: HealthIdealMeasurements = {
    chest: asNonEmptyString(idealMeasurementsRaw["chest"]),
    chest_desc: asNonEmptyString(idealMeasurementsRaw["chest_desc"]),
    waist: asNonEmptyString(idealMeasurementsRaw["waist"]),
    waist_desc: asNonEmptyString(idealMeasurementsRaw["waist_desc"]),
    hip: asNonEmptyString(idealMeasurementsRaw["hip"]),
    hip_desc: asNonEmptyString(idealMeasurementsRaw["hip_desc"]),
    note: asNonEmptyString(idealMeasurementsRaw["note"]),
    note_desc: asNonEmptyString(idealMeasurementsRaw["note_desc"])
  };

  const disclaimer = asNonEmptyString(root["disclaimer"]);

  if (
    !basic_info.height ||
    !basic_info.weight ||
    !basic_info.gender ||
    !basic_info.age ||
    !bmi.value ||
    !weight_assessment.status ||
    !metabolism.bmr ||
    !body_surface_area.value ||
    !body_fat.percentage ||
    !health_advice.daily_water_intake ||
    !ideal_measurements.waist ||
    !disclaimer
  ) {
    throw new Error("invalid_data_shape");
  }

  return {
    basic_info,
    bmi,
    weight_assessment,
    metabolism,
    body_surface_area,
    body_fat,
    health_advice,
    ideal_measurements,
    disclaimer
  };
}

const apiUrl = computed((): string => {
  const params = new URLSearchParams();
  params.set("height", String(toPositiveInt(height.value, 176)));
  params.set("weight", String(toPositiveInt(weight.value, 60)));
  params.set("age", String(toPositiveInt(age.value, 24)));
  params.set("gender", gender.value);
  params.set("encoding", encoding.value);
  return `${API_BASE_URL}?${params.toString()}`;
});

const metaSummary = computed((): string => {
  if (encoding.value !== "json") return "-";
  if (!healthData.value) return "-";
  return `${healthData.value.bmi.value} · ${healthData.value.bmi.category}`;
});

async function fetchHealthJson(signal: AbortSignal): Promise<HealthData> {
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
    payload = JSON.parse(text) as HealthPayload;
  } catch {
    throw new Error("invalid_json");
  }
  if (!isRecord(payload)) throw new Error("invalid_payload");
  const code = payload["code"];
  if (typeof code !== "number") throw new Error("invalid_code");
  if (code !== 200) throw new Error("api_failed");
  return normalizeHealthData(payload["data"]);
}

async function fetchHealthText(signal: AbortSignal): Promise<string> {
  const res = await fetch(apiUrl.value, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/plain, text/markdown, */*" },
    signal
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return await res.text();
}

async function loadHealthData(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  lastError.value = "";
  healthData.value = null;
  textPayload.value = "";

  if (ctrl.abort) ctrl.abort.abort();
  const abort = new AbortController();
  ctrl.abort = abort;
  const timer = window.setTimeout(() => abort.abort(), 12_000);

  try {
    if (encoding.value === "json") {
      healthData.value = await fetchHealthJson(abort.signal);
    } else {
      textPayload.value = await fetchHealthText(abort.signal);
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

function resetForm(): void {
  height.value = 176;
  weight.value = 60;
  age.value = 24;
  gender.value = "male";
  encoding.value = "json";
  void loadHealthData();
}

onMounted(() => {
  void loadHealthData();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[16px] font-semibold">身体健康分析</div>
          <div class="mt-1 text-[12px] text-[var(--el-text-color-secondary)]">
            <span>来源：60s-api.viki.moe</span>
            <span class="mx-2 text-[var(--el-border-color)]">|</span>
            <span>摘要：{{ metaSummary }}</span>
          </div>
        </div>

        <el-space wrap>
          <el-input-number
            v-model="height"
            :min="100"
            :max="240"
            :step="1"
            controls-position="right"
            style="width: 140px"
            placeholder="身高(cm)"
          />
          <el-input-number
            v-model="weight"
            :min="20"
            :max="240"
            :step="1"
            controls-position="right"
            style="width: 140px"
            placeholder="体重(kg)"
          />
          <el-input-number
            v-model="age"
            :min="10"
            :max="120"
            :step="1"
            controls-position="right"
            style="width: 120px"
            placeholder="年龄"
          />
          <el-radio-group v-model="gender" @change="loadHealthData">
            <el-radio-button label="male">男</el-radio-button>
            <el-radio-button label="female">女</el-radio-button>
          </el-radio-group>
          <el-radio-group v-model="encoding" @change="loadHealthData">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="text">Text</el-radio-button>
            <el-radio-button label="markdown">Markdown</el-radio-button>
          </el-radio-group>
          <el-button :loading="loading" @click="loadHealthData">
            <el-icon><Refresh /></el-icon>
            分析
          </el-button>
          <el-button :disabled="loading" @click="resetForm">重置</el-button>
        </el-space>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <el-card shadow="never" :body-style="{ padding: '12px' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-[14px] font-semibold">分析结果</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  {{
                    encoding === "json" ? healthData?.bmi?.category || "-" : "-"
                  }}
                </div>
              </div>
            </template>

            <div v-if="encoding !== 'json'" class="space-y-3">
              <el-input
                v-model="textPayload"
                type="textarea"
                :rows="26"
                readonly
                resize="vertical"
              />
            </div>

            <div v-else-if="healthData" class="space-y-3">
              <el-card shadow="never" :body-style="{ padding: '10px 12px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">基础信息</div>
                </template>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="身高">
                    {{ healthData.basic_info.height }}
                  </el-descriptions-item>
                  <el-descriptions-item label="体重">
                    {{ healthData.basic_info.weight }}
                  </el-descriptions-item>
                  <el-descriptions-item label="性别">
                    {{ healthData.basic_info.gender_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="年龄">
                    {{ healthData.basic_info.age }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '10px 12px' }">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="text-[13px] font-semibold">BMI评估</div>
                    <el-tag effect="plain" type="primary">
                      {{ healthData.bmi.value }}
                    </el-tag>
                  </div>
                </template>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="分类">
                    {{ healthData.bmi.category_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="评价">
                    {{ healthData.bmi.evaluation_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="风险">
                    {{ healthData.bmi.risk_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="指标">
                    {{ healthData.bmi.value_desc }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '10px 12px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">体重评估</div>
                </template>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="理想区间">
                    {{ healthData.weight_assessment.ideal_weight_range }}
                  </el-descriptions-item>
                  <el-descriptions-item label="标准体重">
                    {{ healthData.weight_assessment.standard_weight }}
                  </el-descriptions-item>
                  <el-descriptions-item label="当前状态">
                    {{ healthData.weight_assessment.status_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="调整建议">
                    {{ healthData.weight_assessment.adjustment_desc }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '10px 12px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">代谢与热量</div>
                </template>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="基础代谢">
                    {{ healthData.metabolism.bmr }}
                  </el-descriptions-item>
                  <el-descriptions-item label="总消耗">
                    {{ healthData.metabolism.tdee }}
                  </el-descriptions-item>
                  <el-descriptions-item label="建议摄入">
                    {{ healthData.metabolism.recommended_calories }}
                  </el-descriptions-item>
                  <el-descriptions-item label="减脂摄入">
                    {{ healthData.metabolism.weight_loss_calories }}
                  </el-descriptions-item>
                  <el-descriptions-item label="增重摄入">
                    {{ healthData.metabolism.weight_gain_calories }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '10px 12px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">体脂与围度</div>
                </template>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="体脂率">
                    {{ healthData.body_fat.percentage }}
                  </el-descriptions-item>
                  <el-descriptions-item label="体脂分类">
                    {{ healthData.body_fat.category_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="脂肪重量">
                    {{ healthData.body_fat.fat_weight }}
                  </el-descriptions-item>
                  <el-descriptions-item label="去脂体重">
                    {{ healthData.body_fat.lean_weight }}
                  </el-descriptions-item>
                  <el-descriptions-item label="胸围建议">
                    {{ healthData.ideal_measurements.chest }}
                  </el-descriptions-item>
                  <el-descriptions-item label="腰围建议">
                    {{ healthData.ideal_measurements.waist }}
                  </el-descriptions-item>
                  <el-descriptions-item label="臀围建议">
                    {{ healthData.ideal_measurements.hip }}
                  </el-descriptions-item>
                  <el-descriptions-item label="体表面积">
                    {{ healthData.body_surface_area.value }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" :body-style="{ padding: '10px 12px' }">
                <template #header>
                  <div class="text-[13px] font-semibold">健康建议</div>
                </template>
                <el-descriptions :column="1" size="small" border>
                  <el-descriptions-item label="饮水建议">
                    {{ healthData.health_advice.daily_water_intake_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="运动建议">
                    {{ healthData.health_advice.exercise_recommendation_desc }}
                  </el-descriptions-item>
                  <el-descriptions-item label="营养建议">
                    {{ healthData.health_advice.nutrition_advice_desc }}
                  </el-descriptions-item>
                </el-descriptions>
                <div class="mt-3 flex flex-wrap gap-2">
                  <el-tag
                    v-for="(tip, idx) in healthData.health_advice.health_tips"
                    :key="`${idx}-${tip}`"
                    effect="plain"
                    type="success"
                  >
                    {{ tip }}
                  </el-tag>
                </div>
              </el-card>

              <el-alert
                :title="healthData.disclaimer"
                type="warning"
                :closable="false"
                show-icon
              />
            </div>

            <div
              v-else
              class="flex h-[min(720px,calc(100vh-320px))] min-h-[260px] items-center justify-center rounded-md bg-[var(--el-fill-color-light)] p-3 text-[13px] text-[var(--el-text-color-secondary)]"
            >
              暂无数据，请尝试“分析”
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
                  v-else-if="encoding === 'json' ? !!healthData : !!textPayload"
                  type="success"
                  effect="plain"
                >
                  已获取
                </el-tag>
                <el-tag v-else type="info" effect="plain">暂无</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="BMI">
                {{
                  encoding === "json" ? (healthData?.bmi?.value ?? "-") : "-"
                }}
              </el-descriptions-item>
              <el-descriptions-item label="体脂率">
                {{
                  encoding === "json"
                    ? healthData?.body_fat?.percentage || "-"
                    : "-"
                }}
              </el-descriptions-item>
              <el-descriptions-item label="建议饮水">
                {{
                  encoding === "json"
                    ? healthData?.health_advice?.daily_water_intake || "-"
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
