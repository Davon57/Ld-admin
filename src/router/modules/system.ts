export default {
  path: "/system",
  redirect: "/system/user",
  meta: {
    icon: "ri/settings-3-line",
    title: "系统管理",
    roles: ["admin", "moderator"],
    rank: 8
  },
  children: [
    {
      path: "/system/user",
      name: "SystemUser",
      component: () => import("@/views/system/user/index.vue"),
      meta: {
        title: "用户管理",
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/system/avatar",
      name: "SystemAvatar",
      component: () => import("@/views/system/avatar/index.vue"),
      meta: {
        title: "头像管理",
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/system/role",
      name: "SystemRole",
      component: () => import("@/views/system/role/index.vue"),
      meta: {
        title: "角色管理",
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/system/access",
      name: "SystemAccess",
      component: () => import("@/views/system/access/index.vue"),
      meta: {
        title: "权限预览",
        showLink: false,
        roles: ["admin", "moderator"]
      }
    }
  ]
} satisfies RouteConfigsTable;
