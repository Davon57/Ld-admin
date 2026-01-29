export default {
  path: "/community-qa-manage",
  redirect: "/community-qa-manage/list",
  meta: {
    icon: "ri/question-answer-line",
    title: "社区QA",
    roles: ["admin", "moderator"],
    rank: 6
  },
  children: [
    {
      path: "/community-qa-manage/list",
      name: "CommunityQaManageList",
      component: () => import("@/views/community-qa-manage/list/index.vue"),
      meta: {
        title: "QA列表",
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/community-qa-manage/category",
      name: "CommunityQaManageCategory",
      component: () => import("@/views/community-qa-manage/category/index.vue"),
      meta: {
        title: "QA分类",
        roles: ["admin", "moderator"]
      }
    }
  ]
} satisfies RouteConfigsTable;
