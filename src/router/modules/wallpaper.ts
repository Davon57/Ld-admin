export default {
  path: "/wallpaper",
  redirect: "/wallpaper/category",
  meta: {
    icon: "ri/image-2-line",
    title: "壁纸管理",
    rank: 6
  },
  children: [
    {
      path: "/wallpaper/category",
      name: "WallpaperCategory",
      component: () => import("@/views/wallpaper/category/index.vue"),
      meta: {
        title: "分类列表"
      }
    },
    {
      path: "/wallpaper/list",
      name: "WallpaperList",
      component: () => import("@/views/wallpaper/list/index.vue"),
      meta: {
        title: "壁纸列表"
      }
    }
  ]
} satisfies RouteConfigsTable;
