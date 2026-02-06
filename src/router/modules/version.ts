export default {
  path: "/version",
  redirect: "/version/updates",
  meta: {
    icon: "ri/history-line",
    title: "版本管理",
    rank: 4.5
  },
  children: [
    {
      path: "/version/updates",
      name: "VersionUpdates",
      component: () => import("@/views/version/logs/index.vue"),
      meta: {
        title: "版本更新",
        icon: "ri/file-list-3-line"
      }
    }
  ]
} satisfies RouteConfigsTable;
