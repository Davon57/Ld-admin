export default {
  path: "/60sapi",
  redirect: "/60sapi/world",
  meta: {
    icon: "ri/image-2-line",
    title: "60S",
    roles: ["admin", "moderator"],
    rank: 8.6
  },
  children: [
    {
      path: "/60sapi/world",
      name: "SixtySWorld",
      component: () => import("@/views/60sapi/world/index.vue"),
      meta: {
        title: "60S看世界",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    }
  ]
} satisfies RouteConfigsTable;
