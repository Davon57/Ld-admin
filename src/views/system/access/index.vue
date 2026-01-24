<script setup lang="ts">
import { computed } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import { hasPerms } from "@/utils/auth";

defineOptions({
  name: "SystemAccess"
});

const userStore = useUserStoreHook();

const roleText = computed((): string => {
  const roles = userStore?.roles;
  return Array.isArray(roles) && roles.length ? roles.join(", ") : "未设置";
});

const permsText = computed((): string => {
  const permissions = userStore?.permissions;
  return Array.isArray(permissions) && permissions.length
    ? permissions.join(", ")
    : "未设置";
});

const isAllPerms = computed((): boolean => hasPerms("*:*:*"));
</script>

<template>
  <div class="space-y-2">
    <el-card shadow="never">
      <el-alert
        title="当前后台默认按‘单人管理’使用"
        type="info"
        :closable="false"
        show-icon
      >
        <div class="pt-1 text-[13px] leading-6">
          角色与权限这套能力主要为移动端项目的 RBAC
          预留。为了避免干扰日常使用，这里只保留最小化状态展示。
        </div>
      </el-alert>
    </el-card>

    <el-card shadow="never">
      <div class="text-[14px] text-[var(--el-text-color-primary)]">
        当前登录状态
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <el-tag effect="plain">user: {{ userStore.username || "-" }}</el-tag>
        <el-tag effect="plain">role: {{ roleText }}</el-tag>
        <el-tag effect="plain">perms: {{ permsText }}</el-tag>
        <el-tag v-if="isAllPerms" type="success">全量按钮权限</el-tag>
        <el-tag v-else type="info">非全量</el-tag>
      </div>
    </el-card>

    <el-card shadow="never">
      <div class="text-[14px] text-[var(--el-text-color-primary)]">
        如何接入（需要时再启用）
      </div>
      <div
        class="mt-3 text-[13px] leading-6 text-[var(--el-text-color-regular)]"
      >
        <div>1. 页面级：通过路由 meta.roles 控制菜单与访问。</div>
        <div>2. 按钮级：通过登录返回 permissions 字段（支持 *:*:* 全量）。</div>
        <div>3. 调试入口：本页与“权限管理”示例已从菜单隐藏，可按需恢复。</div>
      </div>
    </el-card>
  </div>
</template>
