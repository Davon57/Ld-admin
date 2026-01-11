export default {
  path: "/notice",
  redirect: "/notice/index",
  meta: {
    icon: "ri/notification-3-line",
    title: "公告通知",
    rank: 6
  },
  children: [
    {
      path: "/notice/index",
      name: "NoticeIndex",
      component: () => import("@/views/notice/index.vue"),
      meta: {
        title: "公告管理"
      }
    }
  ]
} satisfies RouteConfigsTable;
