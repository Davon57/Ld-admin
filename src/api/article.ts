import { http } from "@/utils/http";

export type Status = 0 | 1;

export type EmptyData = Record<string, never>;

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
  return http.request<PageResult<CategoryItem>>("post", "/category/list", {
    data
  });
};

export const createCategory = (data: CreateCategoryPayload) => {
  return http.request<CategoryItem | EmptyData>(
    "post",
    "/category/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCategory = (data: UpdateCategoryPayload) => {
  return http.request<CategoryItem | EmptyData>(
    "post",
    "/category/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCategory = (data: { id: number }) => {
  return http.request<EmptyData>(
    "post",
    "/category/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const batchDeleteCategories = (data: { ids: number[] }) => {
  return http.request<EmptyData>(
    "post",
    "/category/batchDelete",
    { data },
    { showSuccessMessage: true }
  );
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
  return http.request<PageResult<TagItem>>("post", "/tag/list", { data });
};

export const createTag = (data: CreateTagPayload) => {
  return http.request<TagItem | EmptyData>(
    "post",
    "/tag/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateTag = (data: UpdateTagPayload) => {
  return http.request<TagItem | EmptyData>(
    "post",
    "/tag/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteTag = (data: { id: number }) => {
  return http.request<EmptyData>(
    "post",
    "/tag/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const batchDeleteTags = (data: { ids: number[] }) => {
  return http.request<EmptyData>(
    "post",
    "/tag/batchDelete",
    { data },
    { showSuccessMessage: true }
  );
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
  return http.request<PageResult<PostItem>>("post", "/post/list", { data });
};

export const createPost = (data: CreatePostPayload) => {
  return http.request<PostItem | EmptyData>(
    "post",
    "/post/create",
    {
      data
    },
    { showSuccessMessage: true }
  );
};

export const updatePost = (data: UpdatePostPayload) => {
  return http.request<PostItem | EmptyData>(
    "post",
    "/post/update",
    {
      data
    },
    { showSuccessMessage: true }
  );
};

export const deletePost = (data: { id: number }) => {
  return http.request<EmptyData>(
    "post",
    "/post/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export const batchDeletePosts = (data: { ids: number[] }) => {
  return http.request<EmptyData>(
    "post",
    "/post/batchDelete",
    { data },
    { showSuccessMessage: true }
  );
};
