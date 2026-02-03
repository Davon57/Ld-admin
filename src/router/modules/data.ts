export default {
  path: "/data",
  redirect: "/data/user-activity",
  meta: {
    icon: "ri/database-2-line",
    title: "数据管理",
    roles: ["admin", "moderator"],
    rank: 1
  },
  children: [
    {
      path: "/data/index",
      name: "DataIndexRedirect",
      redirect: "/data/user-activity",
      meta: {
        title: "数据管理",
        showLink: false,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/data/user-activity",
      name: "UserActivityStats",
      component: () => import("@/views/data/user-activity/index.vue"),
      meta: {
        title: "用户活跃统计",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    }
  ]
} satisfies RouteConfigsTable;
