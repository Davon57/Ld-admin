<script setup lang="tsx">
import {
  h,
  reactive,
  ref,
  computed,
  onMounted,
  nextTick,
  defineComponent
} from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { isPageData } from "@/utils/table";
import {
  type QaQuestionItem,
  type QaAnswerItem,
  getQaQuestionList,
  getQaQuestionDetail,
  getQaAnswerList,
  updateQaAnswer,
  deleteQaAnswer
} from "@/api/communityQa";

defineOptions({
  name: "CommunityQaComments"
});

const queryState = reactive<{
  page: number;
  pageSize: number;
  qaQuestionId: string;
}>({
  page: 1,
  pageSize: 10,
  qaQuestionId: ""
});

const loading = ref(false);
const questionLoading = ref(false);
const questionOptions = ref<QaQuestionItem[]>([]);
const tableData = ref<QaAnswerItem[]>([]);
const total = ref(0);

const threadDialogVisible = ref(false);
const threadLoading = ref(false);
const activeRootAnswer = ref<QaAnswerItem | null>(null);
const threadTableData = ref<QaAnswerItem[]>([]);
const threadTotal = ref(0);
const activeQuestionAuthor = ref<string | null>(null);

const QA_ANSWER_PAGE_SIZES = [10, 20, 50, 100];
const threadQueryState = reactive({
  page: 1,
  pageSize: 20
});

type AnswerEditFormModel = {
  qaAnswerId: string;
  content: string;
};

const answerEditFormRules: FormRules<AnswerEditFormModel> = {
  content: [{ required: true, message: "请输入内容", trigger: "blur" }]
};

const listParams = computed(() => {
  return {
    page: queryState.page,
    pageSize: queryState.pageSize,
    qaQuestionId: queryState.qaQuestionId
  };
});

const questionTitleMap = computed((): Map<string, string> => {
  return new Map(questionOptions.value.map(q => [q.qaQuestionId, q.title]));
});

function getQuestionTitle(qaQuestionId: string): string {
  return questionTitleMap.value.get(qaQuestionId) ?? "-";
}

function getDisplayName(name?: string | null): string {
  const n = (name ?? "").trim();
  return n ? n : "未设置";
}

function getReplyLogic(row: QaAnswerItem): string {
  const root = activeRootAnswer.value;
  if (!root) return "-";

  const from = getDisplayName(row.nickname);
  const rootAuthor = getDisplayName(root.nickname);
  const parentId = row.parentQaAnswerId;

  if (!parentId) return `${from} 回复 ${rootAuthor}`;
  if (parentId === root.qaAnswerId) return `${from} 回复 ${rootAuthor}`;

  const parent = threadTableData.value.find(r => r.qaAnswerId === parentId);
  const to = parent ? getDisplayName(parent.nickname) : "未知";
  return `${from} 回复 ${to}`;
}

async function fetchQuestions(): Promise<void> {
  questionLoading.value = true;
  try {
    const res = await getQaQuestionList({ page: 1, pageSize: 100 });
    questionOptions.value = isPageData(res) ? res.list : res;
    if (questionOptions.value.length > 0 && !queryState.qaQuestionId) {
      queryState.qaQuestionId = questionOptions.value[0].qaQuestionId;
    }
  } catch {
    questionOptions.value = [];
    queryState.qaQuestionId = "";
  } finally {
    questionLoading.value = false;
  }
}

async function fetchComments(): Promise<void> {
  if (!queryState.qaQuestionId) {
    tableData.value = [];
    total.value = 0;
    return;
  }

  loading.value = true;
  try {
    const res = await getQaAnswerList(listParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } catch {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function fetchThreadReplies(): Promise<void> {
  const root = activeRootAnswer.value;
  if (!root) return;

  threadLoading.value = true;
  try {
    const res = await getQaAnswerList({
      qaQuestionId: root.qaQuestionId,
      rootQaAnswerId: root.qaAnswerId,
      page: threadQueryState.page,
      pageSize: Math.min(threadQueryState.pageSize, 100)
    });
    threadTableData.value = res.list;
    threadTotal.value = res.total;
  } catch {
    threadTableData.value = [];
    threadTotal.value = 0;
  } finally {
    threadLoading.value = false;
  }
}

function openThreadDialog(row: QaAnswerItem): void {
  activeRootAnswer.value = row;
  threadQueryState.page = 1;
  threadQueryState.pageSize = 20;
  threadDialogVisible.value = true;
  activeQuestionAuthor.value = null;
  getQaQuestionDetail({ qaQuestionId: row.qaQuestionId })
    .then(res => {
      activeQuestionAuthor.value = res.question.nickname ?? "";
    })
    .catch(() => {
      activeQuestionAuthor.value = null;
    });
  fetchThreadReplies();
}

function onThreadClose(): void {
  threadDialogVisible.value = false;
  activeRootAnswer.value = null;
  threadTableData.value = [];
  threadTotal.value = 0;
  threadQueryState.page = 1;
  threadQueryState.pageSize = 20;
  activeQuestionAuthor.value = null;
}

function onThreadSizeChange(size: number): void {
  threadQueryState.pageSize = Math.min(size, 100);
  threadQueryState.page = 1;
  fetchThreadReplies();
}

function onThreadCurrentChange(page: number): void {
  threadQueryState.page = page;
  fetchThreadReplies();
}

async function onDeleteThreadReply(row: QaAnswerItem): Promise<void> {
  try {
    await deleteQaAnswer({ qaAnswerId: row.qaAnswerId });
    if (threadQueryState.page > 1 && threadTableData.value.length === 1) {
      threadQueryState.page -= 1;
    }
    fetchThreadReplies();
    fetchComments();
  } catch {}
}

function openAnswerEditDialog(row: QaAnswerItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<AnswerEditFormModel>({
    qaAnswerId: row.qaAnswerId,
    content: row.content ?? ""
  });

  const AnswerEditFormDialog = defineComponent({
    name: "CommunityQaCommentEditFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={answerEditFormRules}
          label-width="90px"
        >
          <el-form-item label="评论ID">
            <el-input v-model={model.qaAnswerId} disabled />
          </el-form-item>
          <el-form-item label="内容" prop="content">
            <el-input
              v-model={model.content}
              type="textarea"
              autosize={{ minRows: 4, maxRows: 12 }}
              placeholder="请输入评论内容"
              maxlength={5000}
              show-word-limit
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: "编辑评论",
    width: "680px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(AnswerEditFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();
        const content = model.content.trim();

        if (!model.qaAnswerId) {
          message("评论信息异常", { type: "error" });
          closeLoading();
          return;
        }

        if (!content) {
          message("请输入内容", { type: "warning" });
          closeLoading();
          return;
        }

        await updateQaAnswer({ qaAnswerId: model.qaAnswerId, content });
        done();
        fetchComments();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteAnswer(row: QaAnswerItem): Promise<void> {
  try {
    await deleteQaAnswer({ qaAnswerId: row.qaAnswerId });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchComments();
  } catch {}
}

function onSearch(): void {
  queryState.page = 1;
  fetchComments();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.qaQuestionId = questionOptions.value[0]?.qaQuestionId ?? "";
  fetchComments();
}

function onQuestionChange(): void {
  queryState.page = 1;
  fetchComments();
}

function onSizeChange(size: number): void {
  queryState.pageSize = Math.min(size, 100);
  queryState.page = 1;
  fetchComments();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchComments();
}

onMounted(() => {
  fetchQuestions().finally(() => {
    fetchComments();
  });
});
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="问题">
          <el-select
            v-model="queryState.qaQuestionId"
            filterable
            clearable
            placeholder="请选择问题"
            class="w-[360px]!"
            :loading="questionLoading"
            @change="onQuestionChange"
          >
            <el-option
              v-for="item in questionOptions"
              :key="item.qaQuestionId"
              :label="`${item.title}（${item.qaQuestionId}）`"
              :value="item.qaQuestionId"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="问答评论" @refresh="fetchComments">
      <el-table
        :data="tableData"
        :loading="loading"
        row-key="qaAnswerId"
        class="w-full"
      >
        <el-table-column prop="qaAnswerId" label="评论ID" min-width="140" />
        <el-table-column prop="qaQuestionId" label="问题ID" min-width="140" />
        <el-table-column label="作者昵称" min-width="140">
          <template #default="{ row }">
            {{ getDisplayName(row.nickname) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="content"
          label="内容"
          min-width="320"
          show-overflow-tooltip
        />
        <el-table-column prop="likeCount" label="点赞" width="90" />
        <el-table-column prop="isAccepted" label="已采纳" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isAccepted" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="acceptedAt" label="采纳时间" min-width="170" />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="220">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="openThreadDialog(row)">
                查看详情
              </el-button>
              <el-button link type="primary" @click="openAnswerEditDialog(row)">
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该评论？"
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
          :total="total"
          :current-page="queryState.page"
          :page-size="queryState.pageSize"
          :page-sizes="QA_ANSWER_PAGE_SIZES"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>

    <el-dialog
      v-model="threadDialogVisible"
      width="1160px"
      align-center
      destroy-on-close
      :close-on-click-modal="false"
      @closed="onThreadClose"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="min-w-0">
            <div class="truncate text-[14px] font-medium">回复详情</div>
            <div
              v-if="activeRootAnswer"
              class="truncate text-[12px] text-[var(--el-text-color-secondary)]"
            >
              问题：{{ getQuestionTitle(activeRootAnswer.qaQuestionId) }}
              <span class="mx-1">·</span>
              问题作者：{{ getDisplayName(activeQuestionAuthor) }}
              <span class="mx-1">·</span>
              根回复作者：{{ getDisplayName(activeRootAnswer.nickname) }}
              <span class="mx-1">·</span>
              回复数：{{ activeRootAnswer.replyCount ?? threadTotal }}
            </div>
          </div>
        </div>
      </template>

      <el-card v-if="activeRootAnswer" shadow="never" class="mb-3">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="问题">
            {{ getQuestionTitle(activeRootAnswer.qaQuestionId) }}
          </el-descriptions-item>
          <el-descriptions-item label="问题作者">
            {{ getDisplayName(activeQuestionAuthor) }}
          </el-descriptions-item>
          <el-descriptions-item label="根回复作者">
            {{ getDisplayName(activeRootAnswer.nickname) }}
          </el-descriptions-item>
          <el-descriptions-item label="点赞数">
            {{ activeRootAnswer.likeCount ?? 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="是否采纳">
            <el-tag v-if="activeRootAnswer.isAccepted" type="success"
              >是</el-tag
            >
            <el-tag v-else type="info">否</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ activeRootAnswer.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ activeRootAnswer.updatedAt }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="mt-3 text-[13px] text-[var(--el-text-color-secondary)]">
          根回复内容
        </div>
        <div class="mt-2 whitespace-pre-wrap break-words text-[14px]">
          {{ activeRootAnswer.content }}
        </div>
      </el-card>

      <PureTableBar title="楼外楼回复" @refresh="fetchThreadReplies">
        <el-table
          :data="threadTableData"
          :loading="threadLoading"
          row-key="qaAnswerId"
          class="w-full"
        >
          <el-table-column label="回复逻辑" min-width="220">
            <template #default="{ row }">
              {{ getReplyLogic(row) }}
            </template>
          </el-table-column>
          <el-table-column label="作者" min-width="140">
            <template #default="{ row }">
              {{ getDisplayName(row.nickname) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="content"
            label="内容"
            min-width="320"
            show-overflow-tooltip
          />
          <el-table-column prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" fixed="right" width="120">
            <template #default="{ row }">
              <el-popconfirm
                title="确认删除该回复？"
                confirm-button-text="删除"
                confirm-button-type="danger"
                cancel-button-text="取消"
                @confirm="onDeleteThreadReply(row)"
              >
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <div class="flex justify-end pt-4">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next, jumper"
            :total="threadTotal"
            :current-page="threadQueryState.page"
            :page-size="threadQueryState.pageSize"
            :page-sizes="QA_ANSWER_PAGE_SIZES"
            @size-change="onThreadSizeChange"
            @current-change="onThreadCurrentChange"
          />
        </div>
      </PureTableBar>
    </el-dialog>
  </div>
</template>
