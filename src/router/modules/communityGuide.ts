export default {
  path: "/community-guide",
  redirect: "/community-guide/index",
  meta: {
    icon: "ri/book-open-line",
    title: "社区指南",
    rank: 6
  },
  children: [
    {
      path: "/community-guide/index",
      name: "CommunityGuideManage",
      component: () => import("@/views/community-guide/index.vue"),
      meta: {
        title: "指南管理"
      }
    }
  ]
} satisfies RouteConfigsTable;
