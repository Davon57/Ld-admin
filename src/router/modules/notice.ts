export default {
  path: "/notice",
  redirect: "/notice/list",
  meta: {
    icon: "ri/notification-3-line",
    title: "公告管理",
    roles: ["admin", "moderator"],
    rank: 6
  },
  children: [
    {
      path: "/notice/index",
      name: "NoticeIndexRedirect",
      redirect: "/notice/list",
      meta: {
        title: "公告管理",
        showLink: false,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/notice/list",
      name: "NoticeList",
      component: () => import("@/views/notice/list/index.vue"),
      meta: {
        title: "公告列表",
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/notice/tag",
      name: "NoticeTag",
      component: () => import("@/views/notice/tag/index.vue"),
      meta: {
        title: "公告标签",
        roles: ["admin", "moderator"]
      }
    }
  ]
} satisfies RouteConfigsTable;
