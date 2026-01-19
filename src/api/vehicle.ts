import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type CarStatus = "on_sale" | "discontinued";

export type Car = {
  id: string;
  carId: string;
  userId: string;
  year: number;
  model: string;
  version: string;
  status: CarStatus;
  isEnabled: boolean;
  remark: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCarPayload = {
  year: number;
  model: string;
  version?: string;
  status?: CarStatus;
  isEnabled?: boolean;
  remark?: string;
};

export type UpdateCarPayload = { carId: string } & Partial<CreateCarPayload>;

export type OkResult = {
  ok: boolean;
};

export type GetCarListParams = {
  includeDisabled?: boolean;
  page?: number;
  pageSize?: number;
};

export type CarListResult = Car[] | PageData<Car>;

type ApiError = {
  error: string;
};

function unwrapApiResult<T>(res: T | ApiError): T {
  if (typeof (res as ApiError)?.error === "string") {
    throw new Error((res as ApiError).error);
  }
  return res as T;
}

export const getCarList = async (data: GetCarListParams = {}) => {
  const res = await http.request<CarListResult | ApiError>("post", "/cars", {
    data
  });
  return unwrapApiResult(res);
};

export const createCar = async (data: CreateCarPayload) => {
  const res = await http.request<Car | ApiError>("post", "/cars/create", {
    data
  });
  return unwrapApiResult(res);
};

export const updateCar = async (data: UpdateCarPayload) => {
  const res = await http.request<Car | ApiError>("post", "/cars/update", {
    data
  });
  return unwrapApiResult(res);
};

export const deleteCar = async (data: { carId: string }) => {
  const res = await http.request<OkResult | ApiError>("post", "/cars/delete", {
    data
  });
  return unwrapApiResult(res);
};

export const batchDeleteCars = async (data: {
  carIds: string[];
}): Promise<{ ok: boolean; failedCount: number }> => {
  const deletePayloads = data.carIds.map(carId => ({ carId }));

  if (deletePayloads.length === 0) {
    return { ok: true, failedCount: 0 };
  }

  const results = await Promise.allSettled(
    deletePayloads.map(payload => deleteCar(payload))
  );

  const failedCount = results
    .map(r => {
      if (r.status === "rejected") return 1;
      return r.value.ok ? 0 : 1;
    })
    .reduce((sum, n) => sum + n, 0);

  return { ok: failedCount === 0, failedCount };
};

export type CarFriend = {
  carFriendId: string;
  userId: string;
  username?: string;
  carId: string;
  vin?: string | null;
  carModel: string;
  carVersion: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
};

export type CarFriendListParams = {
  page?: number;
  pageSize?: number;
  userId?: string;
  carId?: string;
  vin?: string;
};

export type CarFriendListResult = {
  list: CarFriend[];
  total: number;
  page: number;
  pageSize: number;
};

export const getCarFriendList = async (data: CarFriendListParams) => {
  const res = await http.request<CarFriendListResult | ApiError>(
    "post",
    "/car-friends",
    {
      data
    }
  );
  return unwrapApiResult(res);
};

export type CreateCarFriendPayload = {
  userId: string;
  carId: string;
  vin?: string | null;
  carModel?: string | null;
  carVersion?: string | null;
  remark?: string | null;
};

export type UpdateCarFriendPayload = {
  carFriendId: string;
} & Partial<CreateCarFriendPayload>;

export const createCarFriend = async (data: CreateCarFriendPayload) => {
  const res = await http.request<CarFriend | ApiError>(
    "post",
    "/car-friends/create",
    {
      data
    }
  );
  return unwrapApiResult(res);
};

export const updateCarFriend = async (data: UpdateCarFriendPayload) => {
  const res = await http.request<CarFriend | ApiError>(
    "post",
    "/car-friends/update",
    {
      data
    }
  );
  return unwrapApiResult(res);
};

export const deleteCarFriend = async (data: { carFriendId: string }) => {
  const res = await http.request<OkResult | ApiError>(
    "post",
    "/car-friends/delete",
    {
      data
    }
  );
  return unwrapApiResult(res);
};
