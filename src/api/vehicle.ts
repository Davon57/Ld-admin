import { http } from "@/utils/http";

export type Status = 0 | 1;

export type EmptyData = Record<string, never>;

export type BaseResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type PageResult<T> = {
  list: T[];
  total: number;
};

export type VehicleItem = {
  id: number;
  year: number;
  model: string;
  version: string;
  status: Status;
  remark: string;
  createdAt: string;
};

export type VehicleListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

export type CreateVehiclePayload = Omit<VehicleItem, "id" | "createdAt">;

export type UpdateVehiclePayload = Pick<VehicleItem, "id"> &
  Partial<Omit<VehicleItem, "id" | "createdAt">>;

export const getVehicleList = (data: VehicleListParams) => {
  return http.request<BaseResult<PageResult<VehicleItem>>>(
    "post",
    "/vehicle/list",
    { data }
  );
};

export const createVehicle = (data: CreateVehiclePayload) => {
  return http.request<BaseResult<VehicleItem | EmptyData>>(
    "post",
    "/vehicle/create",
    { data }
  );
};

export const updateVehicle = (data: UpdateVehiclePayload) => {
  return http.request<BaseResult<VehicleItem | EmptyData>>(
    "post",
    "/vehicle/update",
    { data }
  );
};

export const deleteVehicle = (data: { id: number }) => {
  return http.request<BaseResult<EmptyData>>("post", "/vehicle/delete", {
    data
  });
};

export const batchDeleteVehicles = (data: { ids: number[] }) => {
  return http.request<BaseResult<EmptyData>>("post", "/vehicle/batchDelete", {
    data
  });
};
