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
    },
    {
      path: "/60sapi/moyu",
      name: "SixtySMoyu",
      component: () => import("@/views/60sapi/moyu/index.vue"),
      meta: {
        title: "摸鱼日报",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/ai-news",
      name: "SixtySAiNews",
      component: () => import("@/views/60sapi/ai-news/index.vue"),
      meta: {
        title: "AI资讯快报",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/exchange-rate",
      name: "SixtySExchangeRate",
      component: () => import("@/views/60sapi/exchange-rate/index.vue"),
      meta: {
        title: "当日货币汇率",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/gold-price",
      name: "SixtySGoldPrice",
      component: () => import("@/views/60sapi/gold-price/index.vue"),
      meta: {
        title: "黄金价格",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/fuel-price",
      name: "SixtySFuelPrice",
      component: () => import("@/views/60sapi/fuel-price/index.vue"),
      meta: {
        title: "汽油价格",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/bing",
      name: "SixtySBing",
      component: () => import("@/views/60sapi/bing/index.vue"),
      meta: {
        title: "必应每日壁纸",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/today-in-history",
      name: "SixtySTodayInHistory",
      component: () => import("@/views/60sapi/today-in-history/index.vue"),
      meta: {
        title: "历史上的今天",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/weather",
      name: "SixtySWeather",
      component: () => import("@/views/60sapi/weather/index.vue"),
      meta: {
        title: "实时天气",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/health",
      name: "SixtySHealth",
      component: () => import("@/views/60sapi/health/index.vue"),
      meta: {
        title: "身体健康分析",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/lyric",
      name: "SixtySLyric",
      component: () => import("@/views/60sapi/lyric/index.vue"),
      meta: {
        title: "歌词搜索",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    },
    {
      path: "/60sapi/fanyi",
      name: "SixtySFanyi",
      component: () => import("@/views/60sapi/fanyi/index.vue"),
      meta: {
        title: "在线翻译",
        showParent: true,
        roles: ["admin", "moderator"]
      }
    }
  ]
} satisfies RouteConfigsTable;
