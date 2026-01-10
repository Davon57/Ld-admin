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

export default defineFakeRoute([
  {
    url: "/get-async-routes",
    method: "get",
    response: () => {
      return {
        success: true,
        data: [permissionRouter, systemRouter, articleRouter]
      };
    }
  }
]);
