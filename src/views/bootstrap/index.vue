<script setup lang="ts">
import { reactive, ref, computed, onMounted } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import {
  bootstrapInit,
  getBootstrapStatus,
  type BootstrapInitPayload
} from "@/api/user";

defineOptions({
  name: "SystemBootstrap"
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

const router = useRouter();
const checking = ref(true);
const submitting = ref(false);

type BootstrapFormModel = {
  username: string;
  password: string;
  confirmPassword: string;
  nickname: string;
  email: string;
  phone: string;
  token: string;
};

const formRef = ref<FormInstance>();

const formModel = reactive<BootstrapFormModel>({
  username: "admin",
  password: "",
  confirmPassword: "",
  nickname: "超级管理员",
  email: "",
  phone: "",
  token: ""
});

const rules: FormRules<BootstrapFormModel> = {
  username: [{ required: true, message: "请输入账号", trigger: "blur" }],
  password: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback(new Error("请输入密码"));
        if (value.length < 6) return callback(new Error("密码至少 6 位"));
        if (value.length > 18) return callback(new Error("密码最多 18 位"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  confirmPassword: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback(new Error("请再次输入密码"));
        if (value !== formModel.password)
          return callback(new Error("两次密码不一致"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  nickname: [{ required: true, message: "请输入昵称", trigger: "blur" }],
  email: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback();
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return ok ? callback() : callback(new Error("邮箱格式不正确"));
      },
      trigger: "blur"
    }
  ],
  phone: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback();
        const ok = /^1\d{10}$/.test(value);
        return ok ? callback() : callback(new Error("手机号格式不正确"));
      },
      trigger: "blur"
    }
  ]
};

const cardStyle = computed(() => {
  return {
    maxWidth: "560px",
    width: "100%",
    borderColor: colors.gray[200]
  };
});

async function loadStatus(): Promise<void> {
  checking.value = true;
  try {
    const res = await getBootstrapStatus();
    if (res?.needsBootstrap === false) {
      router.replace("/login");
      return;
    }
  } catch {
  } finally {
    checking.value = false;
  }
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  try {
    submitting.value = true;
    await formRef.value.validate();

    const payload: BootstrapInitPayload = {
      token: formModel.token.trim() || undefined,
      username: formModel.username.trim(),
      email: formModel.email.trim() || undefined,
      password: formModel.password
    };

    const res = await bootstrapInit(payload);
    if (!res?.id) {
      message("初始化失败", { type: "error" });
      return;
    }

    message("初始化成功，请登录（首次登录需修改密码）", { type: "success" });
    router.replace({ path: "/login", query: { account: res.username } });
  } catch {
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadStatus();
});
</script>

<template>
  <div
    class="min-h-screen box-border flex items-center justify-center px-4 py-8"
    :style="{ background: colors.gray[50] }"
  >
    <el-card v-loading="checking" shadow="never" :style="cardStyle">
      <div class="text-center" :style="{ marginBottom: spacing[6] }">
        <div
          class="text-[22px] font-semibold"
          :style="{ color: colors.gray[900] }"
        >
          系统初始化
        </div>
        <div class="text-[14px] mt-2" :style="{ color: colors.gray[500] }">
          首次部署需要创建一个超级管理员账号
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="formModel"
        :rules="rules"
        label-width="96px"
        size="large"
      >
        <el-form-item label="账号" prop="username">
          <el-input
            v-model="formModel.username"
            placeholder="请输入账号"
            autocomplete="username"
            clearable
          />
        </el-form-item>

        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="formModel.nickname"
            placeholder="请输入昵称"
            autocomplete="off"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formModel.password"
            type="password"
            show-password
            placeholder="请输入密码"
            autocomplete="new-password"
            clearable
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="formModel.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入密码"
            autocomplete="new-password"
            clearable
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="formModel.email"
            placeholder="可选"
            autocomplete="email"
            clearable
          />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="formModel.phone"
            placeholder="可选"
            autocomplete="tel"
            clearable
            maxlength="11"
          />
        </el-form-item>

        <el-form-item label="初始化令牌" prop="token">
          <el-input
            v-model="formModel.token"
            placeholder="可选"
            autocomplete="off"
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button
            class="w-full"
            type="primary"
            :loading="submitting"
            @click="onSubmit"
          >
            创建超级管理员
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
