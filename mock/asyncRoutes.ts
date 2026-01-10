// 模拟后端动态生成路由
import { defineFakeRoute } from "vite-plugin-fake-server/client";

/**
 * roles：页面级别权限，这里模拟二种 "admin"、"common"
 * admin：管理员角色
 * common：普通角色
 */
const permissionRouter = {
  path: "/permission",
  meta: {
    title: "权限管理",
    icon: "ep:lollipop",
    rank: 10
  },
  children: [
    {
      path: "/permission/page/index",
      name: "PermissionPage",
      meta: {
        title: "页面权限",
        roles: ["admin", "common"]
      }
    },
    {
      path: "/permission/button",
      meta: {
        title: "按钮权限",
        roles: ["admin", "common"]
      },
      children: [
        {
          path: "/permission/button/router",
          component: "permission/button/index",
          name: "PermissionButtonRouter",
          meta: {
            title: "路由返回按钮权限",
            auths: [
              "permission:btn:add",
              "permission:btn:edit",
              "permission:btn:delete"
            ]
          }
        },
        {
          path: "/permission/button/login",
          component: "permission/button/perms",
          name: "PermissionButtonLogin",
          meta: {
            title: "登录接口返回按钮权限"
          }
        }
      ]
    }
  ]
};

const systemRouter = {
  path: "/system",
  meta: {
    title: "系统管理",
    icon: "ep:setting",
    rank: 11
  },
  children: [
    {
      path: "/system/user/index",
      component: "system/user/index",
      name: "SystemUser",
      meta: {
        title: "用户管理"
      }
    }
  ]
};

const articleRouter = {
  path: "/article",
  meta: {
    title: "文章管理",
    icon: "ep:document",
    rank: 12
  },
  children: [
    {
      path: "/article/category/index",
      component: "article/category/index",
      name: "ArticleCategory",
      meta: {
        title: "分类管理"
      }
    },
    {
      path: "/article/tag/index",
      component: "article/tag/index",
      name: "ArticleTag",
      meta: {
        title: "标签管理"
      }
    },
    {
      path: "/article/post/index",
      component: "article/post/index",
      name: "ArticlePost",
      meta: {
        title: "文章管理"
      }
    }
  ]
};

const noticeRouter = {
  path: "/notice",
  meta: {
    title: "公告管理",
    icon: "ep:bell",
    rank: 13
  },
  children: [
    {
      path: "/notice/index",
      component: "notice/index",
      name: "NoticeManage",
      meta: {
        title: "公告管理"
      }
    }
  ]
};

const activityRouter = {
  path: "/activity",
  meta: {
    title: "活动管理",
    icon: "ep:calendar",
    rank: 14
  },
  children: [
    {
      path: "/activity/index",
      component: "activity/index",
      name: "ActivityManage",
      meta: {
        title: "活动管理"
      }
    }
  ]
};

const otaRouter = {
  path: "/ota",
  meta: {
    title: "OTA管理",
    icon: "ep:cpu",
    rank: 15
  },
  children: [
    {
      path: "/ota/type/index",
      component: "ota/type/index",
      name: "OtaType",
      meta: {
        title: "类型管理"
      }
    },
    {
      path: "/ota/content/index",
      component: "ota/content/index",
      name: "OtaContent",
      meta: {
        title: "内容管理"
      }
    }
  ]
};

const vehicleRouter = {
  path: "/vehicle",
  meta: {
    title: "车型管理",
    icon: "ep:van",
    rank: 16
  },
  children: [
    {
      path: "/vehicle/index",
      component: "vehicle/index",
      name: "VehicleManage",
      meta: {
        title: "车型管理"
      }
    }
  ]
};

const medalRouter = {
  path: "/medal",
  meta: {
    title: "勋章管理",
    icon: "ep:trophy",
    rank: 17
  },
  children: [
    {
      path: "/medal/type/index",
      component: "medal/type/index",
      name: "MedalTypeManage",
      meta: {
        title: "类型管理"
      }
    },
    {
      path: "/medal/item/index",
      component: "medal/item/index",
      name: "MedalItemManage",
      meta: {
        title: "勋章管理"
      }
    }
  ]
};

export default defineFakeRoute([
  {
    url: "/get-async-routes",
    method: "get",
    response: () => {
      return {
        success: true,
        data: [
          permissionRouter,
          systemRouter,
          articleRouter,
          noticeRouter,
          activityRouter,
          otaRouter,
          vehicleRouter,
          medalRouter
        ]
      };
    }
  }
]);
