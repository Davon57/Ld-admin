export default {
  path: "/community-qa",
  redirect: "/community-qa/questions",
  meta: {
    icon: "ri/question-answer-line",
    title: "社区问答",
    rank: 6
  },
  children: [
    {
      path: "/community-qa/tags",
      name: "CommunityQaTags",
      component: () => import("@/views/community-qa/tags/index.vue"),
      meta: {
        title: "标签管理"
      }
    },
    {
      path: "/community-qa/questions",
      name: "CommunityQaQuestions",
      component: () => import("@/views/community-qa/questions/index.vue"),
      meta: {
        title: "问答列表"
      }
    },
    {
      path: "/community-qa/comments",
      name: "CommunityQaComments",
      component: () => import("@/views/community-qa/comments/index.vue"),
      meta: {
        title: "评论列表"
      }
    }
  ]
} satisfies RouteConfigsTable;
