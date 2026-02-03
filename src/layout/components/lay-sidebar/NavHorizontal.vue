<script setup lang="ts">
import { emitter } from "@/utils/mitt";
import { useNav } from "@/layout/hooks/useNav";
import LaySearch from "../lay-search/index.vue";
import LayNotice from "../lay-notice/index.vue";
import { responsiveStorageNameSpace } from "@/config";
import { ref, nextTick, computed, onMounted } from "vue";
import { storageLocal, isAllEmpty } from "@pureadmin/utils";
import { usePermissionStoreHook } from "@/store/modules/permission";
import type { menuType } from "@/layout/types";
import LaySidebarItem from "../lay-sidebar/components/SidebarItem.vue";
import LaySidebarFullScreen from "../lay-sidebar/components/SidebarFullScreen.vue";

import LogoutCircleRLine from "~icons/ri/logout-circle-r-line";
import Setting from "~icons/ri/settings-3-line";

const menuRef = ref();
const showLogo = ref(
  storageLocal().getItem<StorageConfigs>(
    `${responsiveStorageNameSpace()}configure`
  )?.showLogo ?? true
);

const {
  route,
  title,
  logout,
  onPanel,
  getLogo,
  username,
  userAvatar,
  backTopMenu,
  avatarsStyle
} = useNav();

const defaultActive = computed(() =>
  !isAllEmpty(route.meta?.activePath) ? route.meta.activePath : route.path
);

function getDisplayTitle(menu: menuType): string {
  const child = menu?.children?.length === 1 ? menu.children[0] : null;
  if (child && child?.meta?.showParent !== true) {
    return child?.meta?.title ?? menu?.meta?.title ?? "";
  }
  return menu?.meta?.title ?? "";
}

function sortTopMenus(menus: menuType[]): menuType[] {
  const pinned = ["数据管理", "系统管理"];
  return (Array.isArray(menus) ? menus : [])
    .slice()
    .map((menu, index) => {
      const title = getDisplayTitle(menu);
      const pinnedIndex = pinned.indexOf(title);
      const group =
        title === "首页" || menu?.name === "Home" || menu?.path === "/"
          ? -1
          : pinnedIndex >= 0
            ? 0
            : 1;
      const order = group === 0 ? pinnedIndex : 0;
      return { menu, index, group, order };
    })
    .sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      if (a.order !== b.order) return a.order - b.order;
      return a.index - b.index;
    })
    .map(v => v.menu);
}

const topMenus = computed(() => {
  return sortTopMenus(usePermissionStoreHook().wholeMenus as menuType[]);
});

nextTick(() => {
  menuRef.value?.handleResize();
});

onMounted(() => {
  emitter.on("logoChange", key => {
    showLogo.value = key;
  });
});
</script>

<template>
  <div
    v-loading="usePermissionStoreHook().wholeMenus.length === 0"
    class="horizontal-header"
  >
    <div v-if="showLogo" class="horizontal-header-left" @click="backTopMenu">
      <img :src="getLogo()" alt="logo" />
      <span>{{ title }}</span>
    </div>
    <el-menu
      ref="menuRef"
      mode="horizontal"
      popper-class="pure-scrollbar"
      class="horizontal-header-menu"
      :default-active="defaultActive"
    >
      <LaySidebarItem
        v-for="route in topMenus"
        :key="route.path"
        :item="route"
        :base-path="route.path"
      />
    </el-menu>
    <div class="horizontal-header-right">
      <!-- 菜单搜索 -->
      <LaySearch id="header-search" />
      <!-- 全屏 -->
      <LaySidebarFullScreen id="full-screen" />
      <!-- 消息通知 -->
      <LayNotice id="header-notice" />
      <!-- 退出登录 -->
      <el-dropdown trigger="click">
        <span class="el-dropdown-link navbar-bg-hover">
          <img :src="userAvatar" :style="avatarsStyle" />
          <p v-if="username" class="dark:text-white">{{ username }}</p>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="logout">
            <el-dropdown-item @click="logout">
              <IconifyIconOffline
                :icon="LogoutCircleRLine"
                style="margin: 5px"
              />
              退出系统
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span
        class="set-icon navbar-bg-hover"
        title="打开系统配置"
        @click="onPanel"
      >
        <IconifyIconOffline :icon="Setting" />
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-loading-mask) {
  opacity: 0.45;
}

.logout {
  width: 120px;

  ::v-deep(.el-dropdown-menu__item) {
    display: inline-flex;
    flex-wrap: wrap;
    min-width: 100%;
  }
}
</style>
