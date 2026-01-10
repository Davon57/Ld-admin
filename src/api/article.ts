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

export type TagItem = {
  id: number;
  name: string;
  slug: string;
  status: Status;
  createdAt: string;
};

export type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  status: Status;
  createdAt: string;
};

export type CategoryListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

export type CreateCategoryPayload = Omit<CategoryItem, "id" | "createdAt">;

export type UpdateCategoryPayload = Pick<CategoryItem, "id"> &
  Partial<Omit<CategoryItem, "id" | "createdAt">>;

export const getCategoryList = (data: CategoryListParams) => {
  return http.request<BaseResult<PageResult<CategoryItem>>>(
    "post",
    "/category/list",
    { data }
  );
};

export const createCategory = (data: CreateCategoryPayload) => {
  return http.request<BaseResult<CategoryItem | EmptyData>>(
    "post",
    "/category/create",
    { data }
  );
};

export const updateCategory = (data: UpdateCategoryPayload) => {
  return http.request<BaseResult<CategoryItem | EmptyData>>(
    "post",
    "/category/update",
    { data }
  );
};

export const deleteCategory = (data: { id: number }) => {
  return http.request<BaseResult<EmptyData>>("post", "/category/delete", {
    data
  });
};

export const batchDeleteCategories = (data: { ids: number[] }) => {
  return http.request<BaseResult<EmptyData>>("post", "/category/batchDelete", {
    data
  });
};

export type TagListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

export type CreateTagPayload = Omit<TagItem, "id" | "createdAt">;

export type UpdateTagPayload = Pick<TagItem, "id"> &
  Partial<Omit<TagItem, "id" | "createdAt">>;

export const getTagList = (data: TagListParams) => {
  return http.request<BaseResult<PageResult<TagItem>>>("post", "/tag/list", {
    data
  });
};

export const createTag = (data: CreateTagPayload) => {
  return http.request<BaseResult<TagItem | EmptyData>>("post", "/tag/create", {
    data
  });
};

export const updateTag = (data: UpdateTagPayload) => {
  return http.request<BaseResult<TagItem | EmptyData>>("post", "/tag/update", {
    data
  });
};

export const deleteTag = (data: { id: number }) => {
  return http.request<BaseResult<EmptyData>>("post", "/tag/delete", { data });
};

export const batchDeleteTags = (data: { ids: number[] }) => {
  return http.request<BaseResult<EmptyData>>("post", "/tag/batchDelete", {
    data
  });
};

export type PostItem = {
  id: number;
  title: string;
  author: string;
  status: Status;
  tags: number[];
  content: string;
  createdAt: string;
};

export type PostListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
  tagId?: number;
};

export type CreatePostPayload = Omit<PostItem, "id" | "createdAt">;

export type UpdatePostPayload = Pick<PostItem, "id"> &
  Partial<Omit<PostItem, "id" | "createdAt">>;

export const getPostList = (data: PostListParams) => {
  return http.request<BaseResult<PageResult<PostItem>>>("post", "/post/list", {
    data
  });
};

export const createPost = (data: CreatePostPayload) => {
  return http.request<BaseResult<PostItem | EmptyData>>(
    "post",
    "/post/create",
    {
      data
    }
  );
};

export const updatePost = (data: UpdatePostPayload) => {
  return http.request<BaseResult<PostItem | EmptyData>>(
    "post",
    "/post/update",
    {
      data
    }
  );
};

export const deletePost = (data: { id: number }) => {
  return http.request<BaseResult<EmptyData>>("post", "/post/delete", { data });
};

export const batchDeletePosts = (data: { ids: number[] }) => {
  return http.request<BaseResult<EmptyData>>("post", "/post/batchDelete", {
    data
  });
};
