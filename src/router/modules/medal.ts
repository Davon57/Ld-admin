export default {
  path: "/medal",
  redirect: "/medal/type",
  meta: {
    icon: "ri/medal-line",
    title: "勋章管理",
    rank: 3
  },
  children: [
    {
      path: "/medal/type",
      name: "MedalType",
      component: () => import("@/views/medal/type/index.vue"),
      meta: {
        title: "勋章类型"
      }
    },
    {
      path: "/medal/item",
      name: "MedalItem",
      component: () => import("@/views/medal/item/index.vue"),
      meta: {
        title: "勋章列表"
      }
    }
  ]
} satisfies RouteConfigsTable;
