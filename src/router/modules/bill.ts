export default {
  path: "/bill",
  redirect: "/bill/records",
  meta: {
    icon: "ri/bill-line",
    title: "账单管理",
    roles: ["admin", "moderator"],
    rank: 6.5
  },
  children: [
    {
      path: "/bill/index",
      name: "BillIndexRedirect",
      redirect: "/bill/records",
      meta: {
        title: "账单管理",
        showLink: false,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/bill/records",
      name: "CarExpenseRecords",
      component: () => import("@/views/bill/list/index.vue"),
      meta: {
        title: "记账列表",
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/bill/system-categories",
      name: "CarExpenseSystemCategories",
      component: () => import("@/views/bill/system-category/index.vue"),
      meta: {
        title: "系统费用分类",
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/bill/user-categories",
      name: "CarExpenseUserCategories",
      component: () => import("@/views/bill/user-category/index.vue"),
      meta: {
        title: "用户费用分类",
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/bill/logs",
      name: "BillLogs",
      component: () => import("@/views/bill/stat/index.vue"),
      meta: {
        title: "账单日志",
        roles: ["admin", "moderator"]
      }
    }
  ]
} satisfies RouteConfigsTable;
