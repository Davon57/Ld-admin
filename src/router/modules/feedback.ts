export default [
  {
    path: "/feedbacks",
    redirect: "/feedbacks/index",
    meta: {
      icon: "ri/feedback-line",
      title: "反馈管理",
      rank: 7
    },
    children: [
      {
        path: "/feedbacks/index",
        name: "FeedbackIndex",
        component: () => import("@/views/feedback/index.vue"),
        meta: {
          title: "反馈列表"
        }
      },
      {
        path: "/feedbacks/category",
        name: "FeedbackCategory",
        component: () => import("@/views/feedback/category/index.vue"),
        meta: {
          title: "反馈类别"
        }
      }
    ]
  },
  {
    path: "/good-things",
    name: "GoodThings",
    redirect: "/good-things/list",
    meta: {
      icon: "ri/shopping-bag-3-line",
      title: "好物管理"
    },
    children: [
      {
        path: "/good-things/list",
        name: "FeedbackGoodThingList",
        component: () => import("@/views/feedback/good-things/list/index.vue"),
        meta: {
          title: "好物列表",
          showParent: true
        }
      }
    ]
  }
] satisfies Array<RouteConfigsTable>;
