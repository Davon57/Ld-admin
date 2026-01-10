import { defineFakeRoute } from "vite-plugin-fake-server/client";

type Status = 0 | 1;

type EmptyData = Record<string, never>;

type BaseResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type PageResult<T> = {
  list: T[];
  total: number;
};

type TagItem = {
  id: number;
  name: string;
  slug: string;
  status: Status;
  createdAt: string;
};

type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  status: Status;
  createdAt: string;
};

type PostItem = {
  id: number;
  title: string;
  author: string;
  status: Status;
  tags: number[];
  content: string;
  createdAt: string;
};

type TagListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

type CategoryListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
};

type PostListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: Status;
  tagId?: number;
};

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const initialTags: TagItem[] = [
  {
    id: 1,
    name: "前端",
    slug: "frontend",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 2 * 864e5))
  },
  {
    id: 2,
    name: "后端",
    slug: "backend",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 3 * 864e5))
  },
  {
    id: 3,
    name: "产品",
    slug: "product",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 4 * 864e5))
  },
  {
    id: 4,
    name: "设计",
    slug: "design",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 5 * 864e5))
  },
  {
    id: 5,
    name: "随笔",
    slug: "notes",
    status: 0,
    createdAt: formatDateTime(new Date(Date.now() - 6 * 864e5))
  }
];

const initialCategories: CategoryItem[] = [
  {
    id: 1,
    name: "新手指南",
    slug: "beginner-guide",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 2 * 864e5))
  },
  {
    id: 2,
    name: "用车经验",
    slug: "car-experience",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 3 * 864e5))
  },
  {
    id: 3,
    name: "实用技巧",
    slug: "tips",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 4 * 864e5))
  },
  {
    id: 4,
    name: "故障排查",
    slug: "troubleshooting",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 5 * 864e5))
  },
  {
    id: 5,
    name: "保养维护",
    slug: "maintenance",
    status: 1,
    createdAt: formatDateTime(new Date(Date.now() - 6 * 864e5))
  },
  {
    id: 6,
    name: "出行攻略",
    slug: "travel",
    status: 0,
    createdAt: formatDateTime(new Date(Date.now() - 7 * 864e5))
  }
];

let tags: TagItem[] = [...initialTags];
let nextTagId = tags.reduce((max, t) => Math.max(max, t.id), 0) + 1;

let categories: CategoryItem[] = [...initialCategories];
let nextCategoryId = categories.reduce((max, c) => Math.max(max, c.id), 0) + 1;

const initialPosts: PostItem[] = Array.from({ length: 26 }).map((_, idx) => {
  const id = idx + 1;
  const status: Status = id % 8 === 0 ? 0 : 1;
  const tagIds = tags
    .filter(t => t.status === 1)
    .filter((_, i) => (id + i) % 3 === 0)
    .slice(0, 3)
    .map(t => t.id);
  return {
    id,
    title: `文章标题 ${id}`,
    author: id % 6 === 0 ? "admin" : "editor",
    status,
    tags: tagIds.length ? tagIds : [1],
    content: `这是一段示例正文内容：文章 ${id}\n\n可以在这里输入多行文本。`,
    createdAt: formatDateTime(new Date(Date.now() - id * 18e5))
  };
});

let posts: PostItem[] = [...initialPosts];
let nextPostId = posts.reduce((max, p) => Math.max(max, p.id), 0) + 1;

function matchKeyword(texts: string[], keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k) return true;
  return texts.some(t => t.toLowerCase().includes(k));
}

export default defineFakeRoute([
  {
    url: "/category/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<CategoryItem>> => {
      const params = body as CategoryListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;

      const filtered = categories
        .filter(c => matchKeyword([c.name, c.slug], keyword))
        .filter(c => (typeof status === "number" ? c.status === status : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return {
        success: true,
        data: { list, total }
      };
    }
  },
  {
    url: "/category/create",
    method: "post",
    response: ({ body }): BaseResult<CategoryItem | EmptyData> => {
      const payload = body as Partial<CategoryItem>;
      const name = String(payload?.name || "").trim();
      if (!name)
        return { success: false, data: {}, message: "分类名称不能为空" };

      const rawSlug = typeof payload?.slug === "string" ? payload.slug : "";
      const slug = (rawSlug ? rawSlug : toSlug(name)).trim();
      if (!slug) return { success: false, data: {}, message: "slug 不能为空" };
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return {
          success: false,
          data: {},
          message: "slug 仅支持小写字母/数字/连字符"
        };
      }

      const exists = categories.some(c => c.name === name || c.slug === slug);
      if (exists) return { success: false, data: {}, message: "分类已存在" };

      const status = (payload?.status ?? 1) as Status;
      const category: CategoryItem = {
        id: nextCategoryId++,
        name,
        slug,
        status,
        createdAt: formatDateTime(new Date())
      };
      categories = [category, ...categories];
      return { success: true, data: category };
    }
  },
  {
    url: "/category/update",
    method: "post",
    response: ({ body }): BaseResult<CategoryItem | EmptyData> => {
      const payload = body as Partial<CategoryItem> & { id: number };
      const id = Number(payload?.id);
      const index = categories.findIndex(c => c.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "分类不存在" };

      const current = categories[index];
      const name =
        typeof payload.name === "string" ? payload.name.trim() : current.name;
      const slug =
        typeof payload.slug === "string" ? payload.slug.trim() : current.slug;
      const status = (payload.status ?? current.status) as Status;

      if (!name)
        return { success: false, data: {}, message: "分类名称不能为空" };
      if (!slug) return { success: false, data: {}, message: "slug 不能为空" };
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return {
          success: false,
          data: {},
          message: "slug 仅支持小写字母/数字/连字符"
        };
      }

      const conflict = categories.some(
        c => c.id !== id && (c.name === name || c.slug === slug)
      );
      if (conflict) return { success: false, data: {}, message: "分类已存在" };

      const updated: CategoryItem = { ...current, name, slug, status };
      categories = categories.map(c => (c.id === id ? updated : c));
      return { success: true, data: updated };
    }
  },
  {
    url: "/category/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = categories.some(c => c.id === id);
      if (!exists) return { success: false, data: {}, message: "分类不存在" };

      categories = categories.filter(c => c.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/category/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };

      categories = categories.filter(c => !ids.includes(c.id));
      return { success: true, data: {} };
    }
  },
  {
    url: "/tag/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<TagItem>> => {
      const params = body as TagListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;

      const filtered = tags
        .filter(t => matchKeyword([t.name, t.slug], keyword))
        .filter(t => (typeof status === "number" ? t.status === status : true));

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return {
        success: true,
        data: { list, total }
      };
    }
  },
  {
    url: "/tag/create",
    method: "post",
    response: ({ body }): BaseResult<TagItem | EmptyData> => {
      const payload = body as Partial<TagItem>;
      const name = String(payload?.name || "").trim();
      if (!name)
        return { success: false, data: {}, message: "标签名称不能为空" };

      const rawSlug = typeof payload?.slug === "string" ? payload.slug : "";
      const slug = (rawSlug ? rawSlug : toSlug(name)).trim();
      if (!slug) return { success: false, data: {}, message: "slug 不能为空" };
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return {
          success: false,
          data: {},
          message: "slug 仅支持小写字母/数字/连字符"
        };
      }

      const exists = tags.some(t => t.name === name || t.slug === slug);
      if (exists) return { success: false, data: {}, message: "标签已存在" };

      const status = (payload?.status ?? 1) as Status;
      const tag: TagItem = {
        id: nextTagId++,
        name,
        slug,
        status,
        createdAt: formatDateTime(new Date())
      };
      tags = [tag, ...tags];
      return { success: true, data: tag };
    }
  },
  {
    url: "/tag/update",
    method: "post",
    response: ({ body }): BaseResult<TagItem | EmptyData> => {
      const payload = body as Partial<TagItem> & { id: number };
      const id = Number(payload?.id);
      const index = tags.findIndex(t => t.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "标签不存在" };

      const current = tags[index];
      const name =
        typeof payload.name === "string" ? payload.name.trim() : current.name;
      const slug =
        typeof payload.slug === "string" ? payload.slug.trim() : current.slug;
      const status = (payload.status ?? current.status) as Status;

      if (!name)
        return { success: false, data: {}, message: "标签名称不能为空" };
      if (!slug) return { success: false, data: {}, message: "slug 不能为空" };
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return {
          success: false,
          data: {},
          message: "slug 仅支持小写字母/数字/连字符"
        };
      }

      const conflict = tags.some(
        t => t.id !== id && (t.name === name || t.slug === slug)
      );
      if (conflict) return { success: false, data: {}, message: "标签已存在" };

      const updated: TagItem = { ...current, name, slug, status };
      tags = tags.map(t => (t.id === id ? updated : t));
      posts = posts.map(p => {
        const nextTags = p.tags.filter(tid =>
          tags.some(t => t.id === tid && t.status === 1)
        );
        return nextTags.length ? { ...p, tags: nextTags } : p;
      });
      return { success: true, data: updated };
    }
  },
  {
    url: "/tag/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = tags.some(t => t.id === id);
      if (!exists) return { success: false, data: {}, message: "标签不存在" };

      tags = tags.filter(t => t.id !== id);
      posts = posts.map(p => ({
        ...p,
        tags: p.tags.filter(tid => tid !== id)
      }));
      return { success: true, data: {} };
    }
  },
  {
    url: "/tag/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };

      tags = tags.filter(t => !ids.includes(t.id));
      posts = posts.map(p => ({
        ...p,
        tags: p.tags.filter(tid => !ids.includes(tid))
      }));
      return { success: true, data: {} };
    }
  },
  {
    url: "/post/list",
    method: "post",
    response: ({ body }): BaseResult<PageResult<PostItem>> => {
      const params = body as PostListParams;
      const page = Number(params?.page || 1);
      const pageSize = Number(params?.pageSize || 10);
      const keyword = typeof params?.keyword === "string" ? params.keyword : "";
      const status = params?.status;
      const tagId =
        typeof params?.tagId === "number" ? params.tagId : undefined;

      const filtered = posts
        .filter(p => matchKeyword([p.title, p.author, p.content], keyword))
        .filter(p => (typeof status === "number" ? p.status === status : true))
        .filter(p =>
          typeof tagId === "number" ? p.tags.includes(tagId) : true
        );

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const list = filtered.slice(start, start + pageSize);

      return {
        success: true,
        data: { list, total }
      };
    }
  },
  {
    url: "/post/create",
    method: "post",
    response: ({ body }): BaseResult<PostItem | EmptyData> => {
      const payload = body as Partial<PostItem>;
      const title = String(payload?.title || "").trim();
      if (!title) return { success: false, data: {}, message: "标题不能为空" };
      const author = String(payload?.author || "").trim();
      if (!author) return { success: false, data: {}, message: "作者不能为空" };
      const content = String(payload?.content || "").trim();
      if (!content)
        return { success: false, data: {}, message: "正文不能为空" };

      const status = (payload?.status ?? 1) as Status;
      const tagIds = Array.isArray(payload?.tags)
        ? payload.tags.map(v => Number(v))
        : [];
      const validTagIds = tagIds.filter(tid =>
        tags.some(t => t.id === tid && t.status === 1)
      );
      if (validTagIds.length === 0) {
        return { success: false, data: {}, message: "请选择至少一个有效标签" };
      }

      const post: PostItem = {
        id: nextPostId++,
        title,
        author,
        status,
        tags: validTagIds,
        content,
        createdAt: formatDateTime(new Date())
      };
      posts = [post, ...posts];
      return { success: true, data: post };
    }
  },
  {
    url: "/post/update",
    method: "post",
    response: ({ body }): BaseResult<PostItem | EmptyData> => {
      const payload = body as Partial<PostItem> & { id: number };
      const id = Number(payload?.id);
      const index = posts.findIndex(p => p.id === id);
      if (index === -1)
        return { success: false, data: {}, message: "文章不存在" };

      const current = posts[index];
      const title =
        typeof payload.title === "string"
          ? payload.title.trim()
          : current.title;
      const author =
        typeof payload.author === "string"
          ? payload.author.trim()
          : current.author;
      const content =
        typeof payload.content === "string"
          ? payload.content.trim()
          : current.content;
      const status = (payload.status ?? current.status) as Status;
      const incomingTags = Array.isArray(payload?.tags)
        ? payload.tags.map(v => Number(v))
        : current.tags;
      const validTagIds = incomingTags.filter(tid =>
        tags.some(t => t.id === tid && t.status === 1)
      );

      if (!title) return { success: false, data: {}, message: "标题不能为空" };
      if (!author) return { success: false, data: {}, message: "作者不能为空" };
      if (!content)
        return { success: false, data: {}, message: "正文不能为空" };
      if (validTagIds.length === 0) {
        return { success: false, data: {}, message: "请选择至少一个有效标签" };
      }

      const updated: PostItem = {
        ...current,
        title,
        author,
        content,
        status,
        tags: validTagIds
      };
      posts = posts.map(p => (p.id === id ? updated : p));
      return { success: true, data: updated };
    }
  },
  {
    url: "/post/delete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const id = Number((body as { id: number })?.id);
      const exists = posts.some(p => p.id === id);
      if (!exists) return { success: false, data: {}, message: "文章不存在" };
      posts = posts.filter(p => p.id !== id);
      return { success: true, data: {} };
    }
  },
  {
    url: "/post/batchDelete",
    method: "post",
    response: ({ body }): BaseResult<EmptyData> => {
      const ids = Array.isArray((body as { ids: number[] })?.ids)
        ? (body as { ids: number[] }).ids.map(v => Number(v))
        : [];
      if (ids.length === 0)
        return { success: false, data: {}, message: "ids 不能为空" };
      posts = posts.filter(p => !ids.includes(p.id));
      return { success: true, data: {} };
    }
  }
]);
