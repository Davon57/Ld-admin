export default {
  path: "/ota",
  redirect: "/ota/content",
  meta: {
    icon: "ri/rocket-2-line",
    title: "OTA 管理",
    rank: 4
  },
  children: [
    {
      path: "/ota/content",
      name: "OtaContent",
      component: () => import("@/views/ota/content/index.vue"),
      meta: {
        title: "升级内容"
      }
    },
    {
      path: "/ota/type",
      name: "OtaType",
      component: () => import("@/views/ota/type/index.vue"),
      meta: {
        title: "升级类型"
      }
    }
  ]
} satisfies RouteConfigsTable;
