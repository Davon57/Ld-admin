export default {
  path: "/article",
  redirect: "/article/post",
  meta: {
    icon: "ri/article-line",
    title: "文章管理",
    rank: 2
  },
  children: [
    {
      path: "/article/post",
      name: "ArticlePost",
      component: () => import("@/views/article/post/index.vue"),
      meta: {
        title: "文章"
      }
    },
    {
      path: "/article/category",
      name: "ArticleCategory",
      component: () => import("@/views/article/category/index.vue"),
      meta: {
        title: "分类"
      }
    },
    {
      path: "/article/tag",
      name: "ArticleTag",
      component: () => import("@/views/article/tag/index.vue"),
      meta: {
        title: "标签"
      }
    }
  ]
} satisfies RouteConfigsTable;
