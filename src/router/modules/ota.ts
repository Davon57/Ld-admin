export default {
  path: "/ota",
  redirect: "/ota/logs",
  meta: {
    icon: "ri/rocket-2-line",
    title: "OTA 管理",
    rank: 4
  },
  children: [
    {
      path: "/ota/logs",
      name: "OtaLogs",
      component: () => import("@/views/ota/logs/index.vue"),
      meta: {
        title: "OTA 列表"
      }
    },
    {
      path: "/ota/logs/create",
      name: "OtaLogCreate",
      component: () => import("@/views/ota/logs/form.vue"),
      meta: {
        title: "新增 OTA",
        showLink: false
      }
    },
    {
      path: "/ota/logs/edit/:otaLogId",
      name: "OtaLogEdit",
      component: () => import("@/views/ota/logs/form.vue"),
      meta: {
        title: "编辑 OTA",
        showLink: false
      }
    }
  ]
} satisfies RouteConfigsTable;
