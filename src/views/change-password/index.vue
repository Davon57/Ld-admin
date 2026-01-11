<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useRouter } from "vue-router";
import { changePassword } from "@/api/user";
import { message } from "@/utils/message";
import { storageLocal } from "@pureadmin/utils";
import { userKey, type DataInfo } from "@/utils/auth";
import { initRouter, getTopMenu } from "@/router/utils";

defineOptions({
  name: "ChangePassword"
});

const colors = {
  primary: "#3B82F6",
  secondary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827"
  }
} as const;

const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px"
} as const;

type FormModel = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const router = useRouter();
const submitting = ref(false);
const formRef = ref<FormInstance>();

const formModel = reactive<FormModel>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const rules: FormRules<FormModel> = {
  currentPassword: [
    { required: true, message: "请输入当前密码", trigger: "blur" }
  ],
  newPassword: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback(new Error("请输入新密码"));
        if (value.length < 6) return callback(new Error("新密码至少 6 位"));
        if (value.length > 18) return callback(new Error("新密码最多 18 位"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  confirmPassword: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback(new Error("请再次输入新密码"));
        if (value !== formModel.newPassword)
          return callback(new Error("两次密码不一致"));
        return callback();
      },
      trigger: "blur"
    }
  ]
};

const cardStyle = computed(() => {
  return {
    maxWidth: "520px",
    width: "100%",
    borderColor: colors.gray[200]
  };
});

function markMustChangePasswordFalse(): void {
  const userInfo = storageLocal().getItem<DataInfo<number>>(userKey);
  if (!userInfo) return;
  storageLocal().setItem(userKey, {
    ...userInfo,
    mustChangePassword: false
  });
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  try {
    submitting.value = true;
    await formRef.value.validate();
    const res = await changePassword({
      currentPassword: formModel.currentPassword,
      newPassword: formModel.newPassword
    });
    if (!res?.ok) {
      message("修改失败", { type: "error" });
      return;
    }
    markMustChangePasswordFalse();
    await initRouter();
    router.replace(getTopMenu(true).path);
    message("修改成功", { type: "success" });
  } catch {
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  const userInfo = storageLocal().getItem<DataInfo<number>>(userKey);
  if (!userInfo) router.replace("/login");
});
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center px-4"
    :style="{ background: colors.gray[50], paddingTop: spacing[8] }"
  >
    <el-card shadow="never" :style="cardStyle">
      <div class="text-center" :style="{ marginBottom: spacing[6] }">
        <div
          class="text-[22px] font-semibold"
          :style="{ color: colors.gray[900] }"
        >
          修改密码
        </div>
        <div class="text-[14px] mt-2" :style="{ color: colors.gray[500] }">
          为了账号安全，建议定期修改密码
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="formModel"
        :rules="rules"
        label-width="96px"
        size="large"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="formModel.currentPassword"
            type="password"
            show-password
            autocomplete="current-password"
            clearable
            placeholder="请输入当前密码"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="formModel.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            clearable
            placeholder="请输入新密码"
          />
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="formModel.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            clearable
            placeholder="请再次输入新密码"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            class="w-full"
            type="primary"
            :loading="submitting"
            @click="onSubmit"
          >
            确认修改
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
