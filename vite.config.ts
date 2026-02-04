import { getPluginsList } from "./build/plugins";
import { include, exclude } from "./build/optimize";
import { type UserConfigExport, type ConfigEnv, loadEnv } from "vite";
import {
  root,
  alias,
  wrapperEnv,
  pathResolve,
  __APP_INFO__
} from "./build/utils";

export default ({ mode }: ConfigEnv): UserConfigExport => {
  const {
    VITE_CDN,
    VITE_PORT,
    VITE_COMPRESSION,
    VITE_PUBLIC_PATH,
    VITE_MOCK,
    VITE_API_BASE
  } = wrapperEnv(loadEnv(mode, root));

  const proxy = VITE_API_BASE
    ? {
        "/auth": { target: VITE_API_BASE, changeOrigin: true },
        "/system": { target: VITE_API_BASE, changeOrigin: true },
        "/roles": { target: VITE_API_BASE, changeOrigin: true },
        "/permissions": { target: VITE_API_BASE, changeOrigin: true },
        "/users": { target: VITE_API_BASE, changeOrigin: true },
        "/user": { target: VITE_API_BASE, changeOrigin: true },
        "/avatars": { target: VITE_API_BASE, changeOrigin: true },
        "/cars": { target: VITE_API_BASE, changeOrigin: true },
        "/car-friends": { target: VITE_API_BASE, changeOrigin: true },
        "/community-guides": { target: VITE_API_BASE, changeOrigin: true },
        "/community-qas": { target: VITE_API_BASE, changeOrigin: true },
        "/community-qa-categories": {
          target: VITE_API_BASE,
          changeOrigin: true
        },
        "/qa-tags": { target: VITE_API_BASE, changeOrigin: true },
        "/qa-questions": { target: VITE_API_BASE, changeOrigin: true },
        "/qa-answers": { target: VITE_API_BASE, changeOrigin: true },
        "/article": { target: VITE_API_BASE, changeOrigin: true },
        "/activity": { target: VITE_API_BASE, changeOrigin: true },
        "/ota": { target: VITE_API_BASE, changeOrigin: true },
        "/vehicle": { target: VITE_API_BASE, changeOrigin: true },
        "/medal": { target: VITE_API_BASE, changeOrigin: true },
        "/notice": { target: VITE_API_BASE, changeOrigin: true },
        "/community-announcements": {
          target: VITE_API_BASE,
          changeOrigin: true
        },
        "/community-announcement-tags": {
          target: VITE_API_BASE,
          changeOrigin: true
        },
        "/good-things": { target: VITE_API_BASE, changeOrigin: true },
        "/feedbacks": { target: VITE_API_BASE, changeOrigin: true },
        "/feedback-types": { target: VITE_API_BASE, changeOrigin: true }
      }
    : {};
  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias
    },
    // 服务端渲染
    server: {
      // 端口号
      port: VITE_PORT,
      host: "0.0.0.0",
      // 本地跨域代理 https://cn.vitejs.dev/config/server-options.html#server-proxy
      proxy,
      // 预热文件以提前转换和缓存结果，降低启动期间的初始页面加载时长并防止转换瀑布
      warmup: {
        clientFiles: ["./index.html", "./src/{views,components}/*"]
      }
    },
    plugins: getPluginsList(VITE_CDN, VITE_COMPRESSION, VITE_MOCK),
    // https://cn.vitejs.dev/config/dep-optimization-options.html#dep-optimization-options
    optimizeDeps: {
      include,
      exclude
    },
    build: {
      // https://cn.vitejs.dev/guide/build.html#browser-compatibility
      target: "es2015",
      sourcemap: false,
      // 消除打包大小超过500kb警告
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        input: {
          index: pathResolve("./index.html", import.meta.url)
        },
        // 静态资源分类打包
        output: {
          chunkFileNames: "static/js/[name]-[hash].js",
          entryFileNames: "static/js/[name]-[hash].js",
          assetFileNames: "static/[ext]/[name]-[hash].[ext]"
        }
      }
    },
    define: {
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__)
    }
  };
};
