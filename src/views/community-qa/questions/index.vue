<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type {
  FormInstance,
  FormRules,
  UploadProps,
  UploadUserFile
} from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { compressImageToDataUrl, ensureImageDataUrl } from "@/utils/image";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  isPageData,
  type CsvColumn
} from "@/utils/table";
import Plus from "~icons/ep/plus";
import {
  type QaTagItem,
  type QaTagListParams,
  type QaQuestionListParams,
  type QaTagListResult,
  type QaQuestionItem,
  type QaQuestionListResult,
  type QaAnswerItem,
  getQaTagList,
  getQaQuestionList,
  getQaQuestionDetail,
  createQaQuestion,
  updateQaQuestion,
  deleteQaQuestion,
  getQaAnswerList,
  createQaAnswer,
  updateQaAnswer,
  deleteQaAnswer,
  adoptQaAnswer,
  unadoptQaAnswer,
  likeQaAnswer,
  unlikeQaAnswer
} from "@/api/communityQa";

defineOptions({
  name: "CommunityQaQuestions"
});

const queryState = reactive<
  Required<Pick<QaQuestionListParams, "page" | "pageSize">> & {
    keyword: string;
    isSolved: "" | boolean;
    tagId: "" | string;
  }
>({
  page: 1,
  pageSize: 10,
  keyword: "",
  isSolved: "",
  tagId: ""
});

const loading = ref(false);
const tableData = ref<QaQuestionItem[]>([]);
const total = ref(0);

const exporting = ref(false);

const tagOptionsLoading = ref(false);
const tagOptions = ref<QaTagItem[]>([]);

const tagNameMap = computed((): Map<string, string> => {
  return new Map(tagOptions.value.map(t => [t.qaTagId, t.name]));
});

const questionNicknameMap = ref<Map<string, string>>(new Map());
const fetchQuestionsSeq = ref(0);

const exportColumns: CsvColumn<QaQuestionItem>[] = [
  { label: "问题ID", key: "qaQuestionId" },
  { label: "标题", key: "title" },
  { label: "作者用户ID", key: "authorUserId" },
  {
    label: "标签",
    key: "tagIds",
    format: (_value, row) => {
      return row.tagIds
        .map(tid => tagNameMap.value.get(tid) ?? String(tid))
        .join(" | ");
    }
  },
  { label: "回答数", key: "answerCount" },
  { label: "浏览量", key: "viewCount" },
  { label: "点赞数", key: "likeCount" },
  { label: "收藏数", key: "collectCount" },
  {
    label: "已解决",
    key: "isSolved",
    format: (_value, row) => (row.isSolved ? "是" : "否")
  },
  {
    label: "启用",
    key: "isEnabled",
    format: (_value, row) => (row.isEnabled ? "启用" : "禁用")
  },
  { label: "更新时间", key: "updatedAt" }
];

const listParams = computed((): QaQuestionListParams => {
  const params: QaQuestionListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.isSolved !== "") params.isSolved = queryState.isSolved;
  if (queryState.tagId !== "") params.tagId = queryState.tagId;
  return params;
});

function normalizeTagListResult(res: QaTagListResult): QaTagItem[] {
  if (isPageData<QaTagItem>(res)) return res.list;
  return res;
}

function normalizeQuestionListResult(res: QaQuestionListResult): {
  list: QaQuestionItem[];
  total: number;
} {
  if (isPageData<QaQuestionItem>(res)) {
    return { list: res.list, total: res.total };
  }
  return { list: res, total: res.length };
}

function getDisplayName(name?: string | null): string {
  const n = (name ?? "").trim();
  return n ? n : "未设置";
}

function getQuestionNickname(row: QaQuestionItem): string {
  return getDisplayName(
    row.nickname ?? questionNicknameMap.value.get(row.qaQuestionId)
  );
}

async function fetchQuestionNicknames(
  list: QaQuestionItem[],
  seq: number
): Promise<void> {
  const missingIds: string[] = [];

  for (const q of list) {
    const id = q.qaQuestionId;
    if (!id) continue;

    const nickname = (q.nickname ?? "").trim();
    if (nickname) {
      questionNicknameMap.value.set(id, nickname);
      continue;
    }

    if (!questionNicknameMap.value.has(id)) missingIds.push(id);
  }

  if (missingIds.length === 0) return;

  const settled = await Promise.allSettled(
    missingIds.map(qaQuestionId => getQaQuestionDetail({ qaQuestionId }))
  );

  if (seq !== fetchQuestionsSeq.value) return;

  let changed = false;
  for (let i = 0; i < settled.length; i += 1) {
    const res = settled[i];
    if (res.status !== "fulfilled") continue;
    const nickname = (res.value.question.nickname ?? "").trim();
    questionNicknameMap.value.set(missingIds[i], nickname);
    changed = true;
  }

  if (!changed) return;

  tableData.value = tableData.value.map(q => {
    const nickname = questionNicknameMap.value.get(q.qaQuestionId);
    return nickname !== undefined ? { ...q, nickname } : q;
  });
}

async function fetchTagOptions(): Promise<void> {
  tagOptionsLoading.value = true;
  try {
    const params: QaTagListParams = {
      page: 1,
      pageSize: 100,
      isEnabled: true
    };
    const res = await getQaTagList(params);
    tagOptions.value = normalizeTagListResult(res);
  } catch {
    tagOptions.value = [];
  } finally {
    tagOptionsLoading.value = false;
  }
}

async function fetchQuestions(): Promise<void> {
  const seq = (fetchQuestionsSeq.value += 1);
  loading.value = true;
  try {
    const res = await getQaQuestionList(listParams.value);
    const normalized = normalizeQuestionListResult(res);
    tableData.value = normalized.list;
    total.value = normalized.total;
    void fetchQuestionNicknames(normalized.list, seq);
  } catch {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchQuestions();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.isSolved = "";
  queryState.tagId = "";
  fetchQuestions();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchQuestions();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchQuestions();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "问答列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type QuestionFormMode = "create" | "edit";

type QuestionFormModel = {
  qaQuestionId?: string;
  title: string;
  description: string;
  tagIds: string[];
  isEnabled: boolean;
  images: string[];
};

const questionFormRules: FormRules<QuestionFormModel> = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  tagIds: [
    {
      validator: (_rule, value: string[], callback) => {
        return Array.isArray(value)
          ? callback()
          : callback(new Error("请选择标签"));
      },
      trigger: "change"
    }
  ]
};

function openQuestionDialog(
  mode: QuestionFormMode,
  row?: QaQuestionItem
): void {
  const formRef = ref<FormInstance>();
  const model = reactive<QuestionFormModel>({
    qaQuestionId: mode === "edit" ? row?.qaQuestionId : undefined,
    title: mode === "edit" ? (row?.title ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    tagIds: mode === "edit" ? (row?.tagIds ?? []) : [],
    isEnabled: mode === "edit" ? (row?.isEnabled ?? true) : true,
    images:
      mode === "edit" ? (row?.images ?? []).map(v => ensureImageDataUrl(v)) : []
  });

  const fileList = computed((): UploadUserFile[] => {
    return model.images.map((url, index) => {
      return {
        name: `image-${index + 1}`,
        url
      };
    });
  });

  const onChange: UploadProps["onChange"] = async uploadFile => {
    if (model.images.length >= 9) {
      message("最多上传 9 张图片", { type: "warning" });
      return;
    }

    const raw = uploadFile.raw;
    if (!(raw instanceof File)) return;

    try {
      const dataUrl = await compressImageToDataUrl(raw);
      if (model.images.some(img => img === dataUrl)) return;
      model.images.push(dataUrl);
    } catch {
      message("读取图片失败", { type: "error" });
    }
  };

  const onRemove: UploadProps["onRemove"] = uploadFile => {
    const url = uploadFile.url;
    if (typeof url !== "string") return;
    const idx = model.images.findIndex(img => img === url);
    if (idx >= 0) model.images.splice(idx, 1);
  };

  const QuestionFormDialog = defineComponent({
    name: "QaQuestionFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={questionFormRules}
          label-width="90px"
        >
          {mode === "edit" ? (
            <el-form-item label="问题ID">
              <el-input v-model={model.qaQuestionId} disabled />
            </el-form-item>
          ) : null}
          <el-form-item label="标题" prop="title">
            <el-input
              v-model={model.title}
              placeholder="请输入标题"
              clearable
              maxlength={80}
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="标签" prop="tagIds">
            <el-select
              v-model={model.tagIds}
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip:loading={tagOptionsLoading.value}
              placeholder="请选择标签"
              class="w-full"
            >
              {tagOptions.value.map(t => (
                <el-option key={t.qaTagId} label={t.name} value={t.qaTagId} />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model={model.description}
              type="textarea"
              autosize={{ minRows: 4, maxRows: 10 }}
              placeholder="请描述问题（可粘贴日志/截图链接等）"
              maxlength={2000}
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="图片">
            <div class="w-full">
              <el-upload
                action="/"
                autoUpload={false}
                multiple
                accept="image/*"
                listType="picture-card"
                limit={9}
                fileList={fileList.value}
                onChange={onChange}
                onRemove={onRemove}
              >
                <el-icon>
                  <Plus />
                </el-icon>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="启用">
            <el-segmented
              v-model={model.isEnabled}
              options={[
                { label: "启用", value: true },
                { label: "禁用", value: false }
              ]}
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增问题" : "编辑问题",
    width: "680px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(QuestionFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const images = model.images
          .map(v => v.trim())
          .filter(Boolean)
          .slice(0, 9);

        const payloadBase = {
          title: model.title.trim(),
          description: model.description.trim() || undefined,
          images,
          tagIds: model.tagIds,
          isEnabled: model.isEnabled
        };

        if (mode === "create") {
          const res = await createQaQuestion(payloadBase);
          void res;
          done();
          queryState.page = 1;
          fetchQuestions();
          return;
        }

        if (!model.qaQuestionId) {
          message("问题信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateQaQuestion({
          qaQuestionId: model.qaQuestionId,
          ...payloadBase
        });
        void res;
        done();
        fetchQuestions();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: QaQuestionItem): Promise<void> {
  try {
    const res = await deleteQaQuestion({ qaQuestionId: row.qaQuestionId });
    void res;
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchQuestions();
  } catch {}
}

type AnswerTreeNode = QaAnswerItem & {
  children: AnswerTreeNode[];
};

const detailLoading = ref(false);
const detailQuestionId = ref("");
const detailQuestion = ref<QaQuestionItem | null>(null);
const detailAcceptedAnswer = ref<QaAnswerItem | null>(null);
const detailRootAnswers = ref<QaAnswerItem[]>([]);
const detailThreadAnswersMap = ref<Map<string, QaAnswerItem[]>>(new Map());
const detailThreadTreeMap = ref<Map<string, AnswerTreeNode[]>>(new Map());

function resetDetailState(): void {
  detailLoading.value = false;
  detailQuestionId.value = "";
  detailQuestion.value = null;
  detailAcceptedAnswer.value = null;
  detailRootAnswers.value = [];
  detailThreadAnswersMap.value = new Map();
  detailThreadTreeMap.value = new Map();
}

function normalizeImages(images?: string[] | null): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map(img => ensureImageDataUrl(String(img ?? "").trim()))
    .filter(Boolean);
}

async function fetchAllAnswers(params: {
  qaQuestionId: string;
  rootQaAnswerId?: string;
}): Promise<QaAnswerItem[]> {
  const list: QaAnswerItem[] = [];
  const pageSize = 100;
  let page = 1;

  while (true) {
    const res = await getQaAnswerList({
      qaQuestionId: params.qaQuestionId,
      rootQaAnswerId: params.rootQaAnswerId,
      page,
      pageSize
    });
    list.push(...res.list);
    if (list.length >= res.total || res.list.length === 0) break;
    page += 1;
  }

  return list;
}

function buildReplyTree(replies: QaAnswerItem[]): AnswerTreeNode[] {
  const nodeMap = new Map<string, AnswerTreeNode>();
  for (const r of replies) {
    nodeMap.set(r.qaAnswerId, { ...r, children: [] });
  }

  const roots: AnswerTreeNode[] = [];
  for (const r of replies) {
    const node = nodeMap.get(r.qaAnswerId);
    if (!node) continue;

    const parentId = r.parentQaAnswerId ?? "";
    const parent = parentId ? nodeMap.get(parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function loadQuestionDetail(qaQuestionId: string): Promise<void> {
  detailLoading.value = true;
  try {
    const res = await getQaQuestionDetail({ qaQuestionId });
    detailQuestion.value = res.question;
    detailAcceptedAnswer.value = res.acceptedAnswer;

    const roots = await fetchAllAnswers({ qaQuestionId });
    detailRootAnswers.value = roots;

    const settled = await Promise.allSettled(
      roots.map(r =>
        fetchAllAnswers({ qaQuestionId, rootQaAnswerId: r.qaAnswerId })
      )
    );

    const repliesMap = new Map<string, QaAnswerItem[]>();
    const treeMap = new Map<string, AnswerTreeNode[]>();

    for (let i = 0; i < roots.length; i += 1) {
      const root = roots[i];
      const resItem = settled[i];
      if (resItem.status !== "fulfilled") {
        repliesMap.set(root.qaAnswerId, []);
        treeMap.set(root.qaAnswerId, []);
        continue;
      }
      repliesMap.set(root.qaAnswerId, resItem.value);
      treeMap.set(root.qaAnswerId, buildReplyTree(resItem.value));
    }

    detailThreadAnswersMap.value = repliesMap;
    detailThreadTreeMap.value = treeMap;
  } catch {
    resetDetailState();
  } finally {
    detailLoading.value = false;
  }
}

function openDetailDialog(row: QaQuestionItem): void {
  resetDetailState();
  detailQuestionId.value = row.qaQuestionId;
  void loadQuestionDetail(row.qaQuestionId);

  const DetailDialog = defineComponent({
    name: "QaQuestionDetailDialog",
    setup() {
      const renderMetaLine = (answer: QaAnswerItem) => {
        const nickname = getDisplayName(answer.nickname);
        const liked = Boolean(answer.isLiked);

        return (
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[13px] font-medium">{nickname}</span>
              <span class="mx-2 text-[12px] text-[var(--el-text-color-secondary)]">
                {answer.authorUserId}
              </span>
              <span class="text-[12px] text-[var(--el-text-color-secondary)]">
                {answer.createdAt}
              </span>
            </div>
            <div class="flex items-center gap-2">
              {answer.isAccepted ? (
                <el-tag type="success" effect="plain">
                  已采纳
                </el-tag>
              ) : null}
              <el-tag type={liked ? "success" : "info"} effect="plain">
                {liked ? "已点赞" : "未点赞"}
              </el-tag>
              <span class="text-[12px] text-[var(--el-text-color-secondary)]">
                点赞 {answer.likeCount ?? 0}
              </span>
            </div>
          </div>
        );
      };

      const renderAnswerTree = (nodes: AnswerTreeNode[], depth: number) => {
        if (!nodes || nodes.length === 0) return null;
        return (
          <div class="space-y-3">
            {nodes.map(node => {
              const style =
                depth > 0
                  ? {
                      marginLeft: `${depth * 16}px`,
                      borderLeft: "1px solid var(--el-border-color-lighter)",
                      paddingLeft: "12px"
                    }
                  : undefined;

              return (
                <div key={node.qaAnswerId} style={style} class="pt-1">
                  {renderMetaLine(node)}
                  <div class="mt-2 whitespace-pre-wrap break-words text-[14px]">
                    {node.content}
                  </div>
                  {node.children && node.children.length > 0 ? (
                    <div class="mt-3">
                      {renderAnswerTree(node.children, depth + 1)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      };

      return () => {
        const q = detailQuestion.value;
        const images = normalizeImages(q?.images);
        const liked = Boolean(q?.isLiked);
        const accepted = detailAcceptedAnswer.value;

        return (
          <div class="px-4 py-3" style={{ minHeight: "360px" }}>
            <el-scrollbar maxHeight="calc(100vh - 220px)">
              {detailLoading.value ? (
                <div class="px-1 py-2">
                  {detailQuestionId.value ? (
                    <div class="mb-2 text-[12px] text-[var(--el-text-color-secondary)]">
                      问题ID：{detailQuestionId.value}
                    </div>
                  ) : null}
                  <el-skeleton rows={12} animated />
                </div>
              ) : (
                <div class="space-y-3">
                  {q ? (
                    <el-card shadow="never">
                      <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="text-[16px] font-semibold">
                              {q.title}
                            </span>
                            <el-tag
                              type={q.isSolved ? "success" : "info"}
                              effect="plain"
                            >
                              {q.isSolved ? "已解决" : "未解决"}
                            </el-tag>
                            <el-tag
                              type={q.isEnabled ? "success" : "info"}
                              effect="plain"
                            >
                              {q.isEnabled ? "启用" : "禁用"}
                            </el-tag>
                          </div>
                          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--el-text-color-secondary)]">
                            <span>问题ID：{q.qaQuestionId}</span>
                            <span>作者：{getDisplayName(q.nickname)}</span>
                            <span>作者ID：{q.authorUserId}</span>
                            <span>浏览 {q.viewCount}</span>
                            <span>回答 {q.answerCount}</span>
                            <span>点赞 {q.likeCount}</span>
                            <el-tag
                              type={liked ? "success" : "info"}
                              effect="plain"
                            >
                              {liked ? "已点赞" : "未点赞"}
                            </el-tag>
                            <span>创建 {q.createdAt}</span>
                            <span>更新 {q.updatedAt}</span>
                          </div>
                          {q.tagIds && q.tagIds.length > 0 ? (
                            <div class="mt-3">
                              <el-space wrap>
                                {q.tagIds.map(tid => (
                                  <el-tag key={tid} effect="plain" type="info">
                                    {tagNameMap.value.get(tid) ?? tid}
                                  </el-tag>
                                ))}
                              </el-space>
                            </div>
                          ) : null}
                          {q.description ? (
                            <div class="mt-3 whitespace-pre-wrap break-words text-[14px]">
                              {q.description}
                            </div>
                          ) : null}
                          {images.length > 0 ? (
                            <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                              {images.map(url => (
                                <el-image
                                  key={url}
                                  src={url}
                                  fit="cover"
                                  previewSrcList={images}
                                  previewTeleported
                                  class="h-[96px] w-full overflow-hidden rounded"
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div class="shrink-0 text-right text-[12px] text-[var(--el-text-color-secondary)]">
                          {accepted ? (
                            <div>
                              <el-tag type="success" effect="plain">
                                已采纳回答
                              </el-tag>
                              <div class="mt-2">{accepted.qaAnswerId}</div>
                            </div>
                          ) : (
                            <el-tag type="info" effect="plain">
                              暂无采纳回答
                            </el-tag>
                          )}
                        </div>
                      </div>
                    </el-card>
                  ) : null}

                  <el-card shadow="never">
                    <div class="flex items-center justify-between">
                      <div class="text-[14px] font-medium">回答与楼外楼</div>
                      <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                        根回答 {detailRootAnswers.value.length}
                      </div>
                    </div>
                    {detailRootAnswers.value.length === 0 ? (
                      <el-empty description="暂无回答" imageSize={60} />
                    ) : (
                      <div class="mt-3 space-y-4">
                        {detailRootAnswers.value.map(root => {
                          const tree =
                            detailThreadTreeMap.value.get(root.qaAnswerId) ??
                            [];
                          const repliesTotal =
                            detailThreadAnswersMap.value.get(root.qaAnswerId)
                              ?.length ?? 0;
                          return (
                            <el-card key={root.qaAnswerId} shadow="never">
                              <div class="flex items-center justify-between gap-2">
                                <div class="min-w-0">
                                  <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                                    根回答：{root.qaAnswerId}
                                    <span class="mx-2">·</span>
                                    楼外楼 {repliesTotal}
                                  </div>
                                </div>
                                {root.qaAnswerId === accepted?.qaAnswerId ||
                                root.isAccepted ? (
                                  <el-tag type="success" effect="plain">
                                    已采纳
                                  </el-tag>
                                ) : null}
                              </div>
                              <div class="mt-3">
                                {renderMetaLine(root)}
                                <div class="mt-2 whitespace-pre-wrap break-words text-[14px]">
                                  {root.content}
                                </div>
                              </div>
                              {tree.length > 0 ? (
                                <div class="mt-4">
                                  {renderAnswerTree(tree, 1)}
                                </div>
                              ) : null}
                            </el-card>
                          );
                        })}
                      </div>
                    )}
                  </el-card>
                </div>
              )}
            </el-scrollbar>
          </div>
        );
      };
    }
  });

  addDialog({
    title: "详情",
    width: "1160px",
    fullscreenIcon: true,
    alignCenter: true,
    destroyOnClose: true,
    closeOnClickModal: false,
    hideFooter: true,
    contentRenderer: () => h(DetailDialog),
    closeCallBack: () => {
      resetDetailState();
    }
  });
}

fetchTagOptions();
fetchQuestions();

const answersDialogVisible = ref(false);
const activeQuestion = ref<QaQuestionItem | null>(null);
const answersLoading = ref(false);
const answersTableData = ref<QaAnswerItem[]>([]);
const answersTotal = ref(0);

const answersQueryState = reactive({
  page: 1,
  pageSize: 10
});

async function fetchAnswers(): Promise<void> {
  const question = activeQuestion.value;
  if (!question) return;

  answersLoading.value = true;
  try {
    const res = await getQaAnswerList({
      qaQuestionId: question.qaQuestionId,
      page: answersQueryState.page,
      pageSize: answersQueryState.pageSize
    });
    answersTableData.value = res.list;
    answersTotal.value = res.total;
  } catch {
    answersTableData.value = [];
    answersTotal.value = 0;
  } finally {
    answersLoading.value = false;
  }
}

function openAnswersDialog(row: QaQuestionItem): void {
  activeQuestion.value = row;
  answersQueryState.page = 1;
  answersQueryState.pageSize = 10;
  answersDialogVisible.value = true;
  fetchAnswers();
}

function onAnswersClose(): void {
  answersDialogVisible.value = false;
  activeQuestion.value = null;
  answersTableData.value = [];
  answersTotal.value = 0;
  answersQueryState.page = 1;
  answersQueryState.pageSize = 10;
}

function onAnswersSizeChange(size: number): void {
  answersQueryState.pageSize = size;
  answersQueryState.page = 1;
  fetchAnswers();
}

function onAnswersCurrentChange(page: number): void {
  answersQueryState.page = page;
  fetchAnswers();
}

type AnswerFormMode = "create" | "edit";

type AnswerFormModel = {
  qaAnswerId?: string;
  content: string;
};

const answerFormRules: FormRules<AnswerFormModel> = {
  content: [{ required: true, message: "请输入回答内容", trigger: "blur" }]
};

function openAnswerDialog(mode: AnswerFormMode, row?: QaAnswerItem): void {
  const question = activeQuestion.value;
  if (!question) return;

  const formRef = ref<FormInstance>();
  const model = reactive<AnswerFormModel>({
    qaAnswerId: mode === "edit" ? row?.qaAnswerId : undefined,
    content: mode === "edit" ? (row?.content ?? "") : ""
  });

  const AnswerFormDialog = defineComponent({
    name: "QaAnswerFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={answerFormRules}
          label-width="90px"
        >
          {mode === "edit" ? (
            <el-form-item label="回答ID">
              <el-input v-model={model.qaAnswerId} disabled />
            </el-form-item>
          ) : null}
          <el-form-item label="内容" prop="content">
            <el-input
              v-model={model.content}
              type="textarea"
              autosize={{ minRows: 4, maxRows: 12 }}
              placeholder="请输入回答内容"
              maxlength={5000}
              show-word-limit
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增回答" : "编辑回答",
    width: "680px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(AnswerFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();
        const content = model.content.trim();

        if (mode === "create") {
          await createQaAnswer({
            qaQuestionId: question.qaQuestionId,
            content
          });
          done();
          answersQueryState.page = 1;
          fetchAnswers();
          fetchQuestions();
          return;
        }

        if (!model.qaAnswerId) {
          message("回答信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateQaAnswer({ qaAnswerId: model.qaAnswerId, content });
        done();
        fetchAnswers();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteAnswer(row: QaAnswerItem): Promise<void> {
  try {
    await deleteQaAnswer({ qaAnswerId: row.qaAnswerId });
    if (answersQueryState.page > 1 && answersTableData.value.length === 1) {
      answersQueryState.page -= 1;
    }
    fetchAnswers();
    fetchQuestions();
  } catch {}
}

async function onAdoptAnswer(row: QaAnswerItem): Promise<void> {
  const question = activeQuestion.value;
  if (!question) return;

  try {
    await adoptQaAnswer({
      qaQuestionId: question.qaQuestionId,
      qaAnswerId: row.qaAnswerId
    });
    fetchAnswers();
    fetchQuestions();
  } catch {}
}

async function onUnadoptAnswer(): Promise<void> {
  const question = activeQuestion.value;
  if (!question) return;

  try {
    await unadoptQaAnswer({ qaQuestionId: question.qaQuestionId });
    fetchAnswers();
    fetchQuestions();
  } catch {}
}

async function onLikeAnswer(row: QaAnswerItem): Promise<void> {
  try {
    const res = await likeQaAnswer({ qaAnswerId: row.qaAnswerId });
    const idx = answersTableData.value.findIndex(
      a => a.qaAnswerId === row.qaAnswerId
    );
    if (idx >= 0) {
      answersTableData.value[idx] = {
        ...answersTableData.value[idx],
        likeCount: res.likeCount
      };
    }
  } catch {}
}

async function onUnlikeAnswer(row: QaAnswerItem): Promise<void> {
  try {
    const res = await unlikeQaAnswer({ qaAnswerId: row.qaAnswerId });
    const idx = answersTableData.value.findIndex(
      a => a.qaAnswerId === row.qaAnswerId
    );
    if (idx >= 0) {
      answersTableData.value[idx] = {
        ...answersTableData.value[idx],
        likeCount: res.likeCount
      };
    }
  } catch {}
}
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="标题/作者"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="queryState.tagId"
            clearable
            filterable
            :loading="tagOptionsLoading"
            class="w-[200px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="t in tagOptions"
              :key="t.qaTagId"
              :label="t.name"
              :value="t.qaTagId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="已解决">
          <el-select v-model="queryState.isSolved" clearable class="w-[160px]!">
            <el-option label="全部" value="" />
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="问答列表" @refresh="fetchQuestions">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openQuestionDialog('create')">
            新增问题
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
        row-key="qaQuestionId"
        class="w-full"
      >
        <el-table-column prop="qaQuestionId" label="问题ID" min-width="140" />
        <el-table-column prop="title" label="标题" min-width="240" />
        <el-table-column
          prop="authorUserId"
          label="作者用户ID"
          min-width="140"
        />
        <el-table-column label="作者昵称" min-width="200">
          <template #default="{ row }">
            {{ getQuestionNickname(row) }}
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="220">
          <template #default="{ row }">
            <el-space wrap>
              <el-tag
                v-for="tid in row.tagIds"
                :key="tid"
                effect="plain"
                type="info"
              >
                {{ tagNameMap.get(tid) ?? tid }}
              </el-tag>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column prop="answerCount" label="回答" width="90" />
        <el-table-column prop="viewCount" label="浏览" width="90" />
        <el-table-column prop="likeCount" label="点赞" width="90" />
        <el-table-column prop="collectCount" label="收藏" width="90">
          <template #default="{ row }">
            {{ row.collectCount ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="isSolved" label="已解决" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isSolved" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="启用" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="280">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="openAnswersDialog(row)">
                回答
              </el-button>
              <el-button link type="primary" @click="openDetailDialog(row)">
                详情
              </el-button>
              <el-button
                link
                type="primary"
                @click="openQuestionDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该问题？"
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

    <el-dialog
      v-model="answersDialogVisible"
      width="980px"
      align-center
      destroy-on-close
      :close-on-click-modal="false"
      @closed="onAnswersClose"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="min-w-0">
            <div class="truncate text-[14px] font-medium">
              回答管理
              <span
                v-if="activeQuestion"
                class="ml-2 text-[12px] text-[var(--el-text-color-secondary)]"
              >
                {{ activeQuestion.qaQuestionId }}
              </span>
            </div>
            <div
              v-if="activeQuestion"
              class="truncate text-[12px] text-[var(--el-text-color-secondary)]"
            >
              {{ activeQuestion.title }}
            </div>
          </div>
          <el-space>
            <el-button type="primary" @click="openAnswerDialog('create')">
              新增回答
            </el-button>
          </el-space>
        </div>
      </template>

      <el-table
        :data="answersTableData"
        :loading="answersLoading"
        row-key="qaAnswerId"
        class="w-full"
      >
        <el-table-column prop="qaAnswerId" label="回答ID" min-width="140" />
        <el-table-column
          prop="authorUserId"
          label="作者用户ID"
          min-width="140"
        />
        <el-table-column
          prop="content"
          label="内容"
          min-width="280"
          show-overflow-tooltip
        />
        <el-table-column prop="likeCount" label="点赞" width="90" />
        <el-table-column prop="isAccepted" label="已采纳" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isAccepted" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="300">
          <template #default="{ row }">
            <el-space>
              <el-button
                v-if="row.isAccepted"
                link
                type="warning"
                @click="onUnadoptAnswer"
              >
                取消采纳
              </el-button>
              <el-button v-else link type="success" @click="onAdoptAnswer(row)">
                采纳
              </el-button>
              <el-button
                link
                type="primary"
                @click="openAnswerDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-button link type="info" @click="onLikeAnswer(row)">
                点赞
              </el-button>
              <el-button link type="info" @click="onUnlikeAnswer(row)">
                取消点赞
              </el-button>
              <el-popconfirm
                title="确认删除该回答？"
                confirm-button-text="删除"
                confirm-button-type="danger"
                cancel-button-text="取消"
                @confirm="onDeleteAnswer(row)"
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
          :total="answersTotal"
          :current-page="answersQueryState.page"
          :page-size="answersQueryState.pageSize"
          :page-sizes="DEFAULT_PAGE_SIZES"
          @size-change="onAnswersSizeChange"
          @current-change="onAnswersCurrentChange"
        />
      </div>
    </el-dialog>
  </div>
</template>
