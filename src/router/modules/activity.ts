export default {
  path: "/activity",
  redirect: "/activity/index",
  meta: {
    icon: "ri/pulse-line",
    title: "活动管理",
    rank: 1
  },
  children: [
    {
      path: "/activity/index",
      name: "ActivityIndex",
      component: () => import("@/views/activity/index.vue"),
      meta: {
        title: "活动管理"
      }
    }
  ]
} satisfies RouteConfigsTable;
