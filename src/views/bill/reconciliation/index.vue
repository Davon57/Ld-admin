<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import {
  getCarExpenseBudgetStatus,
  setCarExpenseBudgetLimit,
  type BudgetStatus
} from "@/api/carExpense";

defineOptions({
  name: "CarExpenseBudget"
});

const month = ref<string>("");
const loading = ref(false);
const saving = ref(false);

const status = ref<BudgetStatus | null>(null);

const formModel = reactive<{ limitAmount: number | null }>({
  limitAmount: null
});

const displayLimit = computed((): string => {
  if (!status.value || status.value.limitAmount == null) return "未设置";
  return status.value.limitAmount.toFixed(2);
});

const displaySpent = computed((): string => {
  if (!status.value) return "0.00";
  return status.value.spentAmount.toFixed(2);
});

const displayRemaining = computed((): string => {
  if (!status.value || status.value.remainingAmount == null) return "--";
  return status.value.remainingAmount.toFixed(2);
});

async function fetchStatus(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCarExpenseBudgetStatus({
      month: month.value || undefined
    });
    status.value = res;
    formModel.limitAmount = res.limitAmount;
  } finally {
    loading.value = false;
  }
}

async function onSave(): Promise<void> {
  if (formModel.limitAmount == null) return;
  saving.value = true;
  try {
    await setCarExpenseBudgetLimit({
      month: month.value || undefined,
      limitAmount: Number(formModel.limitAmount)
    });
    fetchStatus();
  } finally {
    saving.value = false;
  }
}

fetchStatus();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="月份">
          <el-date-picker
            v-model="month"
            type="month"
            value-format="YYYY-MM"
            placeholder="默认当前月"
            class="w-[160px]!"
            @change="fetchStatus"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchStatus"
            >查询</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="12" class="mt-2">
      <el-col :xs="24" :sm="8">
        <el-card shadow="never">
          <div class="text-sm text-gray-500">月度限额</div>
          <div class="mt-1 text-2xl font-semibold">{{ displayLimit }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never">
          <div class="text-sm text-gray-500">当月已花费</div>
          <div class="mt-1 text-2xl font-semibold">{{ displaySpent }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never">
          <div class="text-sm text-gray-500">当月结余</div>
          <div class="mt-1 text-2xl font-semibold">{{ displayRemaining }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mt-2">
      <el-form inline>
        <el-form-item label="设置限额(元)">
          <el-input-number
            v-model="formModel.limitAmount"
            :min="0"
            :max="999999999"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="onSave"
            >保存</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
