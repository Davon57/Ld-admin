import { http } from "@/utils/http";

export type OtaChannel = "stable" | "beta";

export type OtaPushStatus = "scheduled" | "pushing" | "paused" | "completed";

export type OtaLogSection = {
  title: string;
  items: string[];
};

export type OtaLogFaq = {
  question: string;
  answers: string[];
};

export type OtaLog = {
  otaLogId: string;
  channel: OtaChannel;
  versionName: string;
  versionCode: number | null;
  pushStatus: OtaPushStatus;
  publishedAt: string;
  packageSizeBytes: number | null;
  packageSizeText: string;
  applicableModelsText: string;
  summary: string;
  seq: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  sections?: OtaLogSection[];
  cautions?: string[];
  faqs?: OtaLogFaq[];
};

export type OtaLogListParams = {
  page?: number;
  pageSize?: number;
  channel?: OtaChannel;
  pushStatus?: OtaPushStatus;
  isEnabled?: boolean;
  versionKeyword?: string;
  otaLogId?: string;
  includeDetail?: boolean;
};

export type OtaLogListResult = {
  list: OtaLog[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateOtaLogPayload = {
  channel: OtaChannel;
  versionName: string;
  versionCode?: number | null;
  pushStatus: OtaPushStatus;
  publishedAt: string;
  packageSizeBytes?: number | null;
  packageSizeText?: string;
  applicableModelsText: string;
  summary?: string;
  sections?: OtaLogSection[];
  cautions?: string[];
  faqs?: OtaLogFaq[];
  seq?: number;
  isEnabled?: boolean;
};

export type UpdateOtaLogPayload = {
  otaLogId: string;
} & Partial<
  Omit<CreateOtaLogPayload, "channel" | "pushStatus" | "publishedAt">
> & {
    channel?: OtaChannel;
    pushStatus?: OtaPushStatus;
    publishedAt?: string;
  };

export type DeleteResult = {
  ok: boolean;
};

export const getOtaLogList = (data: OtaLogListParams = {}) => {
  return http.request<OtaLogListResult>("post", "/ota-logs", { data });
};

export const createOtaLog = (data: CreateOtaLogPayload) => {
  return http.request<OtaLog>(
    "post",
    "/ota-logs/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateOtaLog = (data: UpdateOtaLogPayload) => {
  return http.request<OtaLog>(
    "post",
    "/ota-logs/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteOtaLog = (data: { otaLogId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/ota-logs/delete",
    { data },
    { showSuccessMessage: true }
  );
};
