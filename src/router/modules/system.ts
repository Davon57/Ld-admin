export default {
  path: "/system",
  redirect: "/system/user",
  meta: {
    icon: "ri/settings-3-line",
    title: "系统管理",
    rank: 8
  },
  children: [
    {
      path: "/system/user",
      name: "SystemUser",
      component: () => import("@/views/system/user/index.vue"),
      meta: {
        title: "用户管理"
      }
    },
    {
      path: "/system/avatar",
      name: "SystemAvatar",
      component: () => import("@/views/system/avatar/index.vue"),
      meta: {
        title: "头像管理"
      }
    }
  ]
} satisfies RouteConfigsTable;
