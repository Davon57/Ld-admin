export default {
  path: "/vehicle",
  redirect: "/vehicle/index",
  meta: {
    icon: "ri/car-line",
    title: "车辆管理",
    rank: 5
  },
  children: [
    {
      path: "/vehicle/index",
      name: "VehicleIndex",
      component: () => import("@/views/vehicle/index.vue"),
      meta: {
        title: "车辆管理"
      }
    }
  ]
} satisfies RouteConfigsTable;
