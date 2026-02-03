import { http } from "@/utils/http";

export type UserActivityStatsParams = {
  page?: number;
  pageSize?: number;
  dateStart?: string;
  dateEnd?: string;
  userRole?: "admin" | "moderator" | "user";
};

export type UserActivityStatsSummary = {
  rangeStart: string;
  rangeEnd: string;
  activeUsers: number;
  totalVisitCount: number;
  totalOnlineSeconds: number;
};

export type UserActivityStatsTrendItem = {
  day: string;
  dau: number;
  visitCount: number;
  onlineSeconds: number;
};

export type UserActivityStatsResult = {
  summary: UserActivityStatsSummary;
  trend: {
    list: UserActivityStatsTrendItem[];
    page: number;
    pageSize: number;
    total: number;
  };
};

export const getUserActivityStats = (data: UserActivityStatsParams) => {
  return http.request<UserActivityStatsResult>("post", "/user-activity/stats", {
    data
  });
};
