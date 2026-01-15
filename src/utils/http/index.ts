import Axios, {
  type AxiosInstance,
  AxiosHeaders,
  type AxiosRequestConfig,
  type CustomParamsSerializer,
  type InternalAxiosRequestConfig
} from "axios";
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import { stringify } from "qs";
import { getToken, formatToken, removeToken } from "@/utils/auth";
import { router } from "@/router";
import { message } from "@/utils/message";

type ApiResponse<T> = {
  code: string;
  message: string;
  data: T;
};

function isApiResponse<T = unknown>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.code === "string" &&
    typeof v.message === "string" &&
    Object.prototype.hasOwnProperty.call(v, "data")
  );
}

function getLegacyErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return typeof v.error === "string" ? v.error : null;
}

function shouldShowSuccessMessage(config: PureHttpRequestConfig): boolean {
  return config.showSuccessMessage === true;
}

function shouldShowErrorMessage(config: PureHttpRequestConfig): boolean {
  return config.showErrorMessage !== false;
}

// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  // 请求超时时间
  timeout: 10000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (
        config: InternalAxiosRequestConfig
      ): Promise<InternalAxiosRequestConfig> => {
        const $config = config as unknown as PureHttpRequestConfig;
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeRequestCallback === "function") {
          $config.beforeRequestCallback($config);
          return config;
        }
        if (PureHttp.initConfig.beforeRequestCallback) {
          PureHttp.initConfig.beforeRequestCallback($config);
          return config;
        }
        /** 请求白名单，放置一些不需要`token`的接口 */
        const whiteList = [
          "/auth/login",
          "/auth/register",
          "/system/bootstrap/status",
          "/system/bootstrap/init"
        ];

        if (whiteList.some(url => $config.url.endsWith(url))) return config;

        const data = getToken();
        if (data?.accessToken) {
          const token = formatToken(data.accessToken);
          if (config.headers instanceof AxiosHeaders) {
            config.headers.set("Authorization", token);
          } else {
            config.headers = config.headers ?? {};
            (config.headers as Record<string, unknown>)["Authorization"] =
              token;
          }
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const $config = response.config;
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          return response.data;
        }
        if (PureHttp.initConfig.beforeResponseCallback) {
          PureHttp.initConfig.beforeResponseCallback(response);
          return response.data;
        }
        const payload = response.data;

        const legacyError = getLegacyErrorMessage(payload);
        if (legacyError) {
          if (shouldShowErrorMessage($config)) {
            message(legacyError, { type: "error", grouping: true });
          }
          return Promise.reject(new Error(legacyError));
        }

        if (!isApiResponse(payload)) {
          return payload;
        }

        if (payload.code !== "0") {
          if (shouldShowErrorMessage($config)) {
            message(payload.message || "请求失败", {
              type: "error",
              grouping: true
            });
          }
          return Promise.reject(new Error(payload.message || "请求失败"));
        }

        if (shouldShowSuccessMessage($config)) {
          message(payload.message || "success", {
            type: "success",
            grouping: true
          });
        }

        return payload.data;
      },
      (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);

        if ($error.isCancelRequest) {
          return Promise.reject($error);
        }

        const cfg = ($error.config ?? {}) as PureHttpRequestConfig;
        if (!shouldShowErrorMessage(cfg)) {
          return Promise.reject($error);
        }

        const status = $error?.response?.status;
        if (status === 401) {
          removeToken();
          if (router.currentRoute.value.path !== "/login") {
            router.replace("/login");
          }
        }

        const responseData = $error?.response?.data as unknown;
        if (isApiResponse(responseData)) {
          message(responseData.message || "请求失败", {
            type: "error",
            grouping: true
          });
        } else {
          const legacyError = getLegacyErrorMessage(responseData);
          if (legacyError) {
            message(legacyError, { type: "error", grouping: true });
          } else if (typeof status === "number") {
            message(`请求失败（${status}）`, { type: "error", grouping: true });
          } else if (
            typeof $error.message === "string" &&
            $error.message.trim()
          ) {
            message($error.message, { type: "error", grouping: true });
          } else {
            message("网络异常，请稍后重试", { type: "error", grouping: true });
          }
        }

        // 所有的响应异常 区分来源为取消请求/非取消请求
        return Promise.reject($error);
      }
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    // 单独处理自定义请求/响应回调
    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /** 单独抽离的`post`工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  /** 单独抽离的`get`工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }
}

export const http = new PureHttp();
