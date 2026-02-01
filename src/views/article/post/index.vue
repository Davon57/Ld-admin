<script setup lang="tsx">
import { h, reactive, ref, computed, defineComponent } from "vue";
import type {
  FormInstance,
  FormRules,
  UploadProps,
  UploadUserFile
} from "element-plus";
import { useRouter } from "vue-router";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { compressImageToDataUrl, ensureImageDataUrl } from "@/utils/image";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  type CsvColumn
} from "@/utils/table";
import Plus from "~icons/ep/plus";
import { getUserDetail } from "@/api/user";
import {
  type CategoryItem,
  type CategoryListParams,
  type ArticleItem,
  type ArticleListParams,
  type CreateArticlePayload,
  type UpdateArticlePayload,
  type ArticleCommentItem,
  type ArticleCommentListParams,
  getCategoryList,
  getArticleList,
  getArticleDetail,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticleCommentList
} from "@/api/article";

defineOptions({
  name: "ArticlePost"
});

const router = useRouter();

type Status = 0 | 1;
type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

type EnabledOption = { label: string; value: boolean };
const enabledOptions: EnabledOption[] = [
  { label: "启用", value: true },
  { label: "禁用", value: false }
];

type CategoryOption = CategoryItem;

const queryState = reactive<
  Required<Pick<ArticleListParams, "page" | "pageSize">> & {
    keyword: string;
    articleCategoryId: "" | string;
    authorUserId: string;
    isEnabled: "" | boolean;
  }
>({
  page: 1,
  pageSize: 10,
  keyword: "",
  articleCategoryId: "",
  authorUserId: "",
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<ArticleItem[]>([]);
const total = ref(0);

const categoryOptionsLoading = ref(false);
const categoryOptions = ref<CategoryOption[]>([]);

const exporting = ref(false);

const categoryNameMap = computed((): Map<string, string> => {
  return new Map(categoryOptions.value.map(c => [c.articleCategoryId, c.name]));
});

function resolveCategoryName(id: string): string {
  return categoryNameMap.value.get(id) ?? id;
}

const authorNicknameMap = reactive(new Map<string, string>());

function resolveAuthorNickname(userId: string): string {
  const v = authorNicknameMap.get(userId);
  return v ? v : "-";
}

async function ensureAuthorNicknames(userIds: string[]): Promise<void> {
  const unique = Array.from(
    new Set(userIds.map(v => (v ?? "").trim()).filter(Boolean))
  );
  const missing = unique.filter(id => !authorNicknameMap.has(id));
  if (missing.length === 0) return;

  const results = await Promise.allSettled(
    missing.map(userId => getUserDetail({ userId }))
  );

  results.forEach((r, idx) => {
    if (r.status !== "fulfilled") return;
    const userId = missing[idx];
    const nickname = (r.value?.nickname ?? "").trim();
    authorNicknameMap.set(userId, nickname);
  });
}

const exportColumns: CsvColumn<ArticleItem>[] = [
  { label: "文章ID", key: "articleId" },
  { label: "标题", key: "title" },
  { label: "浏览量", key: "viewCount" },
  { label: "点赞数", key: "likeCount" },
  { label: "收藏数", key: "collectCount" },
  { label: "评论数", key: "commentCount" },
  {
    label: "分类",
    key: "articleCategoryId",
    format: (_value, row) => resolveCategoryName(row.articleCategoryId)
  },
  { label: "作者ID", key: "authorUserId" },
  {
    label: "作者昵称",
    key: "authorUserId",
    format: (_value, row) => resolveAuthorNickname(row.authorUserId)
  },
  {
    label: "启用",
    key: "isEnabled",
    format: (_value, row) => (row.isEnabled ? "启用" : "禁用")
  },
  { label: "发布时间", key: "publishedAt" },
  { label: "评论更新", key: "modifiedAt" },
  { label: "更新时间", key: "updatedAt" }
];

const listParams = computed((): ArticleListParams => {
  const params: ArticleListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.articleCategoryId !== "") {
    params.articleCategoryId = queryState.articleCategoryId;
  }
  const authorUserId = queryState.authorUserId.trim();
  if (authorUserId) params.authorUserId = authorUserId;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchCategoryOptions(): Promise<void> {
  categoryOptionsLoading.value = true;
  try {
    const params: CategoryListParams = {
      page: 1,
      pageSize: 200,
      isEnabled: true
    };
    const res = await getCategoryList(params);
    categoryOptions.value = res.list;
  } catch {
    categoryOptions.value = [];
  } finally {
    categoryOptionsLoading.value = false;
  }
}

async function fetchArticles(): Promise<void> {
  loading.value = true;
  try {
    const res = await getArticleList(listParams.value);
    tableData.value = res.list;
    total.value = res.total;
    void ensureAuthorNicknames(res.list.map(v => v.authorUserId));
  } catch {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchArticles();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.articleCategoryId = "";
  queryState.authorUserId = "";
  queryState.isEnabled = "";
  fetchArticles();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchArticles();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchArticles();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "文章列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type ElTableColumnScope<Row> = { row: Row };

type ArticleFormModel = {
  articleCategoryId: string;
  title: string;
  content: string;
  coverBase64: string;
  contentImages: string[];
  isEnabled: boolean;
};

const articleFormRules: FormRules<ArticleFormModel> = {
  articleCategoryId: [
    { required: true, message: "请选择分类", trigger: "change" }
  ],
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  content: [{ required: true, message: "请输入正文", trigger: "blur" }],
  coverBase64: [{ required: true, message: "请上传封面图", trigger: "change" }]
};

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test((value ?? "").trim());
}

function openCreateDialog(): void {
  const formRef = ref<FormInstance>();
  const model = reactive<ArticleFormModel>({
    articleCategoryId: "",
    title: "",
    content: "",
    coverBase64: "",
    contentImages: [],
    isEnabled: true
  });

  const coverPhotoFileList = computed((): UploadUserFile[] => {
    const url = ensureImageDataUrl(model.coverBase64);
    return url ? [{ name: "cover-photo", url }] : [];
  });

  const contentFileList = computed((): UploadUserFile[] => {
    return model.contentImages.map((url, index) => {
      return { name: `content-${index + 1}`, url: ensureImageDataUrl(url) };
    });
  });

  const onCoverPhotoChange: UploadProps["onChange"] = async uploadFile => {
    const raw = uploadFile.raw;
    if (!(raw instanceof File)) return;
    try {
      model.coverBase64 = await compressImageToDataUrl(raw, {
        maxWidth: 1600,
        maxHeight: 1600,
        maxBytes: 350 * 1024
      });
    } catch {
      message("读取封面图失败", { type: "error" });
    }
  };

  const onCoverPhotoRemove: UploadProps["onRemove"] = () => {
    model.coverBase64 = "";
  };

  const onContentChange: UploadProps["onChange"] = async uploadFile => {
    if (model.contentImages.length >= 9) {
      message("最多上传 9 张图片", { type: "warning" });
      return;
    }
    const raw = uploadFile.raw;
    if (!(raw instanceof File)) return;
    try {
      const dataUrl = await compressImageToDataUrl(raw);
      if (model.contentImages.some(img => img === dataUrl)) return;
      model.contentImages.push(dataUrl);
    } catch {
      message("读取图片失败", { type: "error" });
    }
  };

  const onContentRemove: UploadProps["onRemove"] = uploadFile => {
    const url = uploadFile.url;
    if (typeof url !== "string") return;
    const idx = model.contentImages.findIndex(img => img === url);
    if (idx >= 0) model.contentImages.splice(idx, 1);
  };

  const ArticleFormDialog = defineComponent({
    name: "ArticleCreateDialog",
    setup() {
      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={articleFormRules}
          label-width="96px"
        >
          <el-form-item label="分类" prop="articleCategoryId">
            <el-select
              v-model={model.articleCategoryId}
              placeholder="请选择"
              class="w-full"
              filterable
              clearable
              loading={categoryOptionsLoading.value}
            >
              {categoryOptions.value.map(opt => (
                <el-option
                  key={opt.articleCategoryId}
                  label={opt.name}
                  value={opt.articleCategoryId}
                />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="标题" prop="title">
            <el-input
              v-model={model.title}
              placeholder="请输入标题"
              maxlength={100}
              show-word-limit
              clearable
            />
          </el-form-item>
          <el-form-item label="正文" prop="content">
            <el-input
              v-model={model.content}
              type="textarea"
              autosize={{ minRows: 6, maxRows: 12 }}
              placeholder="请输入正文"
              maxlength={20000}
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="封面图" prop="coverBase64">
            <el-upload
              action="/"
              autoUpload={false}
              accept="image/*"
              listType="picture-card"
              limit={1}
              fileList={coverPhotoFileList.value}
              onChange={onCoverPhotoChange}
              onRemove={onCoverPhotoRemove}
            >
              <el-icon>
                <Plus />
              </el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item label="正文图片">
            <el-upload
              action="/"
              autoUpload={false}
              multiple
              accept="image/*"
              listType="picture-card"
              limit={9}
              fileList={contentFileList.value}
              onChange={onContentChange}
              onRemove={onContentRemove}
            >
              <el-icon>
                <Plus />
              </el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item label="启用">
            <el-segmented
              v-model={model.isEnabled}
              options={enabledOptions.map(s => ({
                label: s.label,
                value: s.value
              }))}
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: "新增文章",
    width: "860px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(ArticleFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const coverBase64 = model.coverBase64.trim();
        const payload: CreateArticlePayload = {
          articleCategoryId: model.articleCategoryId.trim(),
          title: model.title.trim(),
          content: model.content.trim(),
          coverScreenshotBase64: coverBase64,
          coverPhotoBase64: coverBase64,
          contentImages: model.contentImages
            .map(v => v.trim())
            .filter(Boolean)
            .slice(0, 9),
          isEnabled: model.isEnabled
        };

        const res = await createArticle(payload);
        void res;
        done();
        queryState.page = 1;
        fetchArticles();
      } catch {
        closeLoading();
      }
    }
  });
}

function openEditDialog(row: ArticleItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<ArticleFormModel>({
    articleCategoryId: row.articleCategoryId ?? "",
    title: row.title ?? "",
    content: row.content ?? "",
    coverBase64: row.coverPhotoBase64 || row.coverScreenshotBase64 || "",
    contentImages: Array.isArray(row.contentImages)
      ? [...row.contentImages]
      : [],
    isEnabled: Boolean(row.isEnabled)
  });

  const coverPhotoFileList = computed((): UploadUserFile[] => {
    const url = ensureImageDataUrl(model.coverBase64);
    return url ? [{ name: "cover-photo", url }] : [];
  });

  const contentFileList = computed((): UploadUserFile[] => {
    return model.contentImages.map((url, index) => {
      return { name: `content-${index + 1}`, url: ensureImageDataUrl(url) };
    });
  });

  const onCoverPhotoChange: UploadProps["onChange"] = async uploadFile => {
    const raw = uploadFile.raw;
    if (!(raw instanceof File)) return;
    try {
      model.coverBase64 = await compressImageToDataUrl(raw, {
        maxWidth: 1600,
        maxHeight: 1600,
        maxBytes: 350 * 1024
      });
    } catch {
      message("读取封面图失败", { type: "error" });
    }
  };

  const onCoverPhotoRemove: UploadProps["onRemove"] = () => {
    model.coverBase64 = "";
  };

  const onContentChange: UploadProps["onChange"] = async uploadFile => {
    if (model.contentImages.length >= 9) {
      message("最多上传 9 张图片", { type: "warning" });
      return;
    }
    const raw = uploadFile.raw;
    if (!(raw instanceof File)) return;
    try {
      const dataUrl = await compressImageToDataUrl(raw);
      if (model.contentImages.some(img => img === dataUrl)) return;
      model.contentImages.push(dataUrl);
    } catch {
      message("读取图片失败", { type: "error" });
    }
  };

  const onContentRemove: UploadProps["onRemove"] = uploadFile => {
    const url = uploadFile.url;
    if (typeof url !== "string") return;
    const idx = model.contentImages.findIndex(img => img === url);
    if (idx >= 0) model.contentImages.splice(idx, 1);
  };

  const ArticleFormDialog = defineComponent({
    name: "ArticleEditDialog",
    setup() {
      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={articleFormRules}
          label-width="96px"
        >
          <el-form-item label="分类" prop="articleCategoryId">
            <el-select
              v-model={model.articleCategoryId}
              placeholder="请选择"
              class="w-full"
              filterable
              clearable
              loading={categoryOptionsLoading.value}
            >
              {categoryOptions.value.map(opt => (
                <el-option
                  key={opt.articleCategoryId}
                  label={opt.name}
                  value={opt.articleCategoryId}
                />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="标题" prop="title">
            <el-input
              v-model={model.title}
              placeholder="请输入标题"
              maxlength={100}
              show-word-limit
              clearable
            />
          </el-form-item>
          <el-form-item label="正文" prop="content">
            <el-input
              v-model={model.content}
              type="textarea"
              autosize={{ minRows: 6, maxRows: 12 }}
              placeholder="请输入正文"
              maxlength={20000}
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="封面图" prop="coverBase64">
            <el-upload
              action="/"
              autoUpload={false}
              accept="image/*"
              listType="picture-card"
              limit={1}
              fileList={coverPhotoFileList.value}
              onChange={onCoverPhotoChange}
              onRemove={onCoverPhotoRemove}
            >
              <el-icon>
                <Plus />
              </el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item label="正文图片">
            <el-upload
              action="/"
              autoUpload={false}
              multiple
              accept="image/*"
              listType="picture-card"
              limit={9}
              fileList={contentFileList.value}
              onChange={onContentChange}
              onRemove={onContentRemove}
            >
              <el-icon>
                <Plus />
              </el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item label="启用">
            <el-segmented
              v-model={model.isEnabled}
              options={enabledOptions.map(s => ({
                label: s.label,
                value: s.value
              }))}
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: "编辑文章",
    width: "860px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(ArticleFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const nextCategoryId = model.articleCategoryId.trim();
        const nextTitle = model.title.trim();
        const nextContent = model.content.trim();
        const nextCover = model.coverBase64.trim();
        const nextContentImages = model.contentImages
          .map(v => v.trim())
          .filter(Boolean)
          .slice(0, 9);

        const payload: UpdateArticlePayload = { articleId: row.articleId };

        if (nextCategoryId && nextCategoryId !== row.articleCategoryId) {
          payload.articleCategoryId = nextCategoryId;
        }
        if (nextTitle !== (row.title ?? "")) payload.title = nextTitle;
        if (nextContent !== (row.content ?? "")) payload.content = nextContent;

        if (Boolean(model.isEnabled) !== Boolean(row.isEnabled)) {
          payload.isEnabled = Boolean(model.isEnabled);
        }

        const originalCover = (
          row.coverPhotoBase64 ||
          row.coverScreenshotBase64 ||
          ""
        ).trim();
        if (nextCover && nextCover !== originalCover && !isHttpUrl(nextCover)) {
          payload.coverScreenshotBase64 = nextCover;
          payload.coverPhotoBase64 = nextCover;
        }

        const originalImages = (
          Array.isArray(row.contentImages) ? row.contentImages : []
        )
          .map(v => (v ?? "").trim())
          .filter(Boolean)
          .slice(0, 9);
        const imagesChanged =
          nextContentImages.join("\n") !== originalImages.join("\n");

        if (imagesChanged) {
          if (nextContentImages.some(isHttpUrl)) {
            message("正文图片仅支持上传图片文件", { type: "warning" });
            closeLoading();
            return;
          }
          payload.contentImages = nextContentImages;
        }

        await updateArticle(payload);
        done();
        fetchArticles();
      } catch {
        closeLoading();
      }
    }
  });
}

function goToCommentList(row: ArticleItem): void {
  router.push({
    path: "/article/comment",
    query: { articleId: row.articleId }
  });
}

function openDetailDialog(row: ArticleItem): void {
  const articleId = row.articleId;
  void ensureAuthorNicknames([row.authorUserId]);

  const detailLoading = ref(false);
  const activeArticle = ref<ArticleItem | null>(null);

  const commentsLoading = ref(false);
  const commentsTableData = ref<ArticleCommentItem[]>([]);
  const commentsTotal = ref(0);
  const commentsQueryState = reactive<
    Required<Pick<ArticleCommentListParams, "page" | "pageSize">>
  >({
    page: 1,
    pageSize: 10
  });

  async function fetchDetail(): Promise<void> {
    detailLoading.value = true;
    try {
      activeArticle.value = await getArticleDetail({ articleId });
      void ensureAuthorNicknames([
        activeArticle.value?.authorUserId || row.authorUserId
      ]);
    } catch {
      activeArticle.value = null;
    } finally {
      detailLoading.value = false;
    }
  }

  async function fetchComments(): Promise<void> {
    commentsLoading.value = true;
    try {
      const res = await getArticleCommentList({
        page: commentsQueryState.page,
        pageSize: commentsQueryState.pageSize,
        articleId
      });
      commentsTableData.value = res.list;
      commentsTotal.value = res.total;
    } catch {
      commentsTableData.value = [];
      commentsTotal.value = 0;
    } finally {
      commentsLoading.value = false;
    }
  }

  function onCommentsSizeChange(size: number): void {
    commentsQueryState.pageSize = size;
    commentsQueryState.page = 1;
    fetchComments();
  }

  function onCommentsCurrentChange(page: number): void {
    commentsQueryState.page = page;
    fetchComments();
  }

  function openRepliesDialog(root: ArticleCommentItem): void {
    const rootArticleCommentId = root.articleCommentId;

    const repliesLoading = ref(false);
    const repliesTableData = ref<ArticleCommentItem[]>([]);
    const repliesTotal = ref(0);
    const repliesQueryState = reactive<
      Required<Pick<ArticleCommentListParams, "page" | "pageSize">>
    >({
      page: 1,
      pageSize: 10
    });

    async function fetchReplies(): Promise<void> {
      repliesLoading.value = true;
      try {
        const res = await getArticleCommentList({
          page: repliesQueryState.page,
          pageSize: repliesQueryState.pageSize,
          articleId,
          rootArticleCommentId
        });
        repliesTableData.value = res.list;
        repliesTotal.value = res.total;
      } catch {
        repliesTableData.value = [];
        repliesTotal.value = 0;
      } finally {
        repliesLoading.value = false;
      }
    }

    function onRepliesSizeChange(size: number): void {
      repliesQueryState.pageSize = size;
      repliesQueryState.page = 1;
      fetchReplies();
    }

    function onRepliesCurrentChange(page: number): void {
      repliesQueryState.page = page;
      fetchReplies();
    }

    const RepliesDialog = defineComponent({
      name: "ArticleCommentRepliesDialog",
      setup() {
        return () => (
          <div class="space-y-3">
            <el-card shadow="never">
              <div class="text-[14px] text-[var(--el-text-color-primary)]">
                根评论
              </div>
              <div class="mt-2 text-[13px] text-[var(--el-text-color-secondary)]">
                {root.nickname || "-"} · {root.createdAt} · 点赞{" "}
                {root.likeCount ?? 0}
              </div>
              <div class="mt-2 whitespace-pre-wrap break-words text-[14px]">
                {root.content || ""}
              </div>
            </el-card>

            <el-card shadow="never">
              <div class="flex items-center justify-between">
                <div class="text-[14px] text-[var(--el-text-color-primary)]">
                  楼外楼回复
                </div>
                <el-button link type="primary" onClick={fetchReplies}>
                  刷新
                </el-button>
              </div>

              <el-table
                data={repliesTableData.value}
                loading={repliesLoading.value}
                rowKey="articleCommentId"
                class="w-full mt-3"
              >
                <el-table-column
                  prop="articleCommentId"
                  label="评论ID"
                  minWidth={150}
                  showOverflowTooltip
                />
                <el-table-column label="作者昵称" minWidth={140}>
                  {{
                    default: ({
                      row
                    }: ElTableColumnScope<ArticleCommentItem>) =>
                      row.nickname || "-"
                  }}
                </el-table-column>
                <el-table-column
                  prop="content"
                  label="内容"
                  minWidth={320}
                  showOverflowTooltip
                />
                <el-table-column prop="likeCount" label="点赞" width={90} />
                <el-table-column
                  prop="createdAt"
                  label="创建时间"
                  minWidth={170}
                />
                <el-table-column
                  prop="updatedAt"
                  label="更新时间"
                  minWidth={170}
                />
              </el-table>

              <div class="flex justify-end pt-4">
                <el-pagination
                  background
                  layout="total, sizes, prev, pager, next, jumper"
                  total={repliesTotal.value}
                  currentPage={repliesQueryState.page}
                  pageSize={repliesQueryState.pageSize}
                  pageSizes={DEFAULT_PAGE_SIZES}
                  onSizeChange={onRepliesSizeChange}
                  onCurrentChange={onRepliesCurrentChange}
                />
              </div>
            </el-card>
          </div>
        );
      }
    });

    addDialog({
      title: "楼外楼回复",
      width: "1040px",
      fullscreenIcon: true,
      closeOnClickModal: false,
      hideFooter: true,
      contentRenderer: () => h(RepliesDialog)
    });

    fetchReplies();
  }

  const DetailDialog = defineComponent({
    name: "ArticleDetailDialog",
    setup() {
      return () => (
        <div class="space-y-3">
          <el-card shadow="never">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-[16px] font-bold text-[var(--el-text-color-primary)]">
                  {activeArticle.value?.title || row.title}
                </div>
                <div class="mt-1 text-[13px] text-[var(--el-text-color-secondary)]">
                  {activeArticle.value?.publishedAt || row.publishedAt}
                </div>
              </div>
              {(activeArticle.value?.isEnabled ?? row.isEnabled) ? (
                <el-tag type="success">启用</el-tag>
              ) : (
                <el-tag type="info">禁用</el-tag>
              )}
            </div>

            <el-descriptions class="mt-3" column={2} border>
              <el-descriptions-item label="文章ID">
                <el-tag effect="plain">{articleId}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="作者ID">
                {activeArticle.value?.authorUserId || row.authorUserId}
              </el-descriptions-item>
              <el-descriptions-item label="作者昵称">
                {resolveAuthorNickname(
                  activeArticle.value?.authorUserId || row.authorUserId
                )}
              </el-descriptions-item>
              <el-descriptions-item label="分类">
                {resolveCategoryName(
                  activeArticle.value?.articleCategoryId ||
                    row.articleCategoryId
                )}
              </el-descriptions-item>
              <el-descriptions-item label="浏览量">
                {activeArticle.value?.viewCount ?? row.viewCount ?? 0}
              </el-descriptions-item>
              <el-descriptions-item label="点赞数">
                {activeArticle.value?.likeCount ?? row.likeCount ?? 0}
              </el-descriptions-item>
              <el-descriptions-item label="收藏数">
                {activeArticle.value?.collectCount ?? row.collectCount ?? 0}
              </el-descriptions-item>
              <el-descriptions-item label="评论数">
                {activeArticle.value?.commentCount ?? row.commentCount ?? 0}
              </el-descriptions-item>
              <el-descriptions-item label="评论更新时间">
                {activeArticle.value?.modifiedAt || row.modifiedAt}
              </el-descriptions-item>
            </el-descriptions>

            <div class="mt-4 text-[13px] text-[var(--el-text-color-secondary)]">
              正文
            </div>
            <div class="mt-2 whitespace-pre-wrap break-words text-[14px]">
              {activeArticle.value?.content || ""}
            </div>
          </el-card>

          <el-card shadow="never">
            <div class="flex items-center justify-between">
              <div class="text-[14px] text-[var(--el-text-color-primary)]">
                评论列表
              </div>
              <el-button link type="primary" onClick={fetchComments}>
                刷新
              </el-button>
            </div>

            <el-table
              data={commentsTableData.value}
              loading={commentsLoading.value}
              rowKey="articleCommentId"
              class="w-full mt-3"
            >
              <el-table-column
                prop="articleCommentId"
                label="评论ID"
                minWidth={150}
                showOverflowTooltip
              />
              <el-table-column label="作者昵称" minWidth={140}>
                {{
                  default: ({ row }: ElTableColumnScope<ArticleCommentItem>) =>
                    row.nickname || "-"
                }}
              </el-table-column>
              <el-table-column
                prop="content"
                label="内容"
                minWidth={320}
                showOverflowTooltip
              />
              <el-table-column prop="likeCount" label="点赞" width={90} />
              <el-table-column prop="isLiked" label="已点赞" width={90}>
                {{
                  default: ({ row }: ElTableColumnScope<ArticleCommentItem>) =>
                    row.isLiked ? (
                      <el-tag type="success">是</el-tag>
                    ) : (
                      <el-tag type="info">否</el-tag>
                    )
                }}
              </el-table-column>
              <el-table-column prop="replyCount" label="回复" width={90} />
              <el-table-column
                prop="createdAt"
                label="创建时间"
                minWidth={170}
              />
              <el-table-column label="操作" fixed="right" width={120}>
                {{
                  default: ({
                    row
                  }: ElTableColumnScope<ArticleCommentItem>) => (
                    <el-button
                      link
                      type="primary"
                      disabled={!row.replyCount}
                      onClick={() => openRepliesDialog(row)}
                    >
                      查看回复
                    </el-button>
                  )
                }}
              </el-table-column>
            </el-table>

            <div class="flex justify-end pt-4">
              <el-pagination
                background
                layout="total, sizes, prev, pager, next, jumper"
                total={commentsTotal.value}
                currentPage={commentsQueryState.page}
                pageSize={commentsQueryState.pageSize}
                pageSizes={DEFAULT_PAGE_SIZES}
                onSizeChange={onCommentsSizeChange}
                onCurrentChange={onCommentsCurrentChange}
              />
            </div>
          </el-card>
        </div>
      );
    }
  });

  addDialog({
    title: "详情",
    width: "1160px",
    fullscreenIcon: true,
    closeOnClickModal: false,
    hideFooter: true,
    contentRenderer: () => h(DetailDialog)
  });

  fetchDetail();
  fetchComments();
}

async function onDeleteRow(row: ArticleItem): Promise<void> {
  try {
    await deleteArticle({ articleId: row.articleId });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchArticles();
  } catch {}
}

fetchCategoryOptions();
fetchArticles();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="标题关键词"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="queryState.articleCategoryId"
            clearable
            filterable
            :loading="categoryOptionsLoading"
            class="w-[180px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="c in categoryOptions"
              :key="c.articleCategoryId"
              :label="c.name"
              :value="c.articleCategoryId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="作者ID">
          <el-input
            v-model="queryState.authorUserId"
            placeholder="LD0001ABCD"
            clearable
            class="w-[180px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="启用">
          <el-select
            v-model="queryState.isEnabled"
            clearable
            class="w-[160px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in enabledOptions"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="文章列表" @refresh="fetchArticles">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openCreateDialog">
            新增文章
          </el-button>
          <el-button
            type="success"
            plain
            :loading="exporting"
            @click="onExportList"
          >
            导出列表
          </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="articleId"
        class="w-full"
      >
        <el-table-column prop="articleId" label="文章ID" min-width="150" />
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column
          prop="viewCount"
          label="浏览量"
          width="110"
          align="right"
        />
        <el-table-column
          prop="likeCount"
          label="点赞"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            {{ row.likeCount ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column
          prop="collectCount"
          label="收藏"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            {{ row.collectCount ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column
          prop="commentCount"
          label="评论"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            {{ row.commentCount ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="articleCategoryId" label="分类" min-width="140">
          <template #default="{ row }">
            {{ resolveCategoryName(row.articleCategoryId) }}
          </template>
        </el-table-column>
        <el-table-column prop="authorUserId" label="作者ID" min-width="150" />
        <el-table-column label="作者昵称" min-width="140">
          <template #default="{ row }">
            {{ resolveAuthorNickname(row.authorUserId) }}
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="启用" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishedAt" label="发布时间" min-width="170" />
        <el-table-column prop="modifiedAt" label="评论更新" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="280">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="openDetailDialog(row)">
                详情
              </el-button>
              <el-button link type="primary" @click="openEditDialog(row)">
                编辑
              </el-button>
              <el-button link type="primary" @click="goToCommentList(row)">
                评论
              </el-button>
              <el-popconfirm
                title="确认删除该文章？"
                confirm-button-text="删除"
                confirm-button-type="danger"
                cancel-button-text="取消"
                @confirm="onDeleteRow(row)"
              >
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end pt-4">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="queryState.page"
          :page-size="queryState.pageSize"
          :page-sizes="DEFAULT_PAGE_SIZES"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
